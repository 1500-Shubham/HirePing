const express = require('express');
const { requireAuth } = require('../middleware/auth');
const User = require('../models/User');
const Source = require('../models/Source');
const { generateEmail } = require('../services/gemini');
const { sendEmail } = require('../services/emailService');

const router = express.Router();

/**
 * Shuffle an array in place (Fisher-Yates)
 */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// GET /api/emails/preview - Preview which sources will be emailed
// Query: ?count=10 (how many to preview)
router.get('/preview', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const count = parseInt(req.query.count) || 30;

    const selectedCountries = user.selectedCountries || [];
    if (selectedCountries.length === 0) {
      return res.json({ sources: [], total: 0, message: 'No target countries selected.' });
    }

    const sources = await Source.find({
      country: { $in: selectedCountries },
      isActive: true,
      dailyEmailCount: { $lt: 5 },
    }).select('name email role company companyType country');

    const shuffled = shuffle([...sources]);
    const preview = shuffled.slice(0, Math.min(count, shuffled.length));

    console.log('[Emails] Preview for:', user.email, '| requested:', count, '| available:', sources.length, '| showing:', preview.length);

    res.json({
      sources: preview,
      total: sources.length,
      selected: preview.length,
    });
  } catch (error) {
    console.error('[Emails] Error fetching preview:', error.message);
    res.status(500).json({ error: 'Failed to fetch source preview.' });
  }
});

// POST /api/emails/send - Manually trigger sending emails
// Body (optional): { count: 10 } — how many to send (admin can send any number)
router.post('/send', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const isAdmin = user.isAdmin === true;
    const requestedCount = parseInt(req.body.count) || null;

    console.log('[Emails] Send triggered by:', user.email, isAdmin ? '(ADMIN)' : '', '| plan:', user.plan?.type, '| sent today:', user.emailsSentToday, '| requested:', requestedCount || 'default');

    // --- Plan & limit checks (skip for admin) ---
    let maxToSend;

    if (isAdmin) {
      // Admin: no plan needed, send as many as requested or all available
      maxToSend = requestedCount || 999999;
      console.log('[Emails] Admin mode — no plan check, max:', maxToSend);
    } else {
      // Regular user: must have active plan
      if (!user.plan || user.plan.type === 'none') {
        return res.status(403).json({ error: 'No active plan. Please purchase a plan first.' });
      }

      if (user.plan.expiresAt && new Date(user.plan.expiresAt) < new Date()) {
        await User.findByIdAndUpdate(user._id, {
          $set: { 'plan.type': 'none', 'plan.dailyLimit': 0 },
        });
        return res.status(403).json({ error: 'Your plan has expired. Please purchase a new plan.' });
      }

      const dailyLimit = user.plan.dailyLimit || 0;
      const sentToday = user.emailsSentToday || 0;
      const remaining = dailyLimit - sentToday;

      if (remaining <= 0) {
        return res.status(429).json({ error: 'Daily email limit reached. Try again tomorrow.' });
      }

      maxToSend = requestedCount ? Math.min(requestedCount, remaining) : remaining;
    }

    // --- Country & source selection ---
    const selectedCountries = user.selectedCountries || [];
    if (selectedCountries.length === 0) {
      return res.status(400).json({ error: 'No target countries selected. Please select countries first.' });
    }

    const sources = await Source.find({
      country: { $in: selectedCountries },
      isActive: true,
      dailyEmailCount: { $lt: 5 },
    });

    if (sources.length === 0) {
      return res.status(404).json({ error: 'No available sources found for your selected countries.' });
    }

    const shuffled = shuffle([...sources]);
    const toSend = shuffled.slice(0, Math.min(maxToSend, shuffled.length));
    console.log('[Emails] Available sources:', sources.length, '| will send to:', toSend.length);

    // --- Generate & send ---
    const lastFiveEmails = (user.lastEmails || []).slice(-5);
    const userProfile = {
      name: user.name,
      email: user.email,
      ...(user.profile || {}),
    };

    const sentEmails = [];

    for (const source of toSend) {
      const emailContent = await generateEmail(
        userProfile,
        { name: source.name, company: source.company, role: source.role },
        lastFiveEmails
      );

      if (!emailContent) {
        console.warn('[Emails] Failed to generate email for', source.email, '— skipping');
        continue;
      }

      const result = await sendEmail(user, source.email, emailContent.subject, emailContent.body);

      if (result.success) {
        console.log('[Emails] ✓ Sent to:', source.email, '| subject:', emailContent.subject);
        sentEmails.push({
          to: source.email,
          toName: source.name,
          company: source.company,
          subject: emailContent.subject,
          body: emailContent.body,
          sentAt: new Date(),
        });

        await Source.findByIdAndUpdate(source._id, { $inc: { dailyEmailCount: 1 } });
      }
    }

    if (sentEmails.length === 0) {
      return res.status(500).json({ error: 'Failed to generate and send any emails.' });
    }

    // Update user
    const updatedLastEmails = [...(user.lastEmails || []), ...sentEmails].slice(-5);

    await User.findByIdAndUpdate(user._id, {
      $inc: { emailsSentToday: sentEmails.length, totalEmailsSent: sentEmails.length },
      $set: { lastEmails: updatedLastEmails },
    });

    console.log('[Emails] Done:', sentEmails.length, 'sent |', isAdmin ? 'admin' : `remaining: ${maxToSend - sentEmails.length}`);

    res.json({
      message: `Successfully sent ${sentEmails.length} email(s).`,
      sentCount: sentEmails.length,
      emails: sentEmails,
    });
  } catch (error) {
    console.error('[Emails] Error sending emails:', error.message);
    res.status(500).json({ error: 'Failed to send emails.' });
  }
});

// GET /api/emails/history - Return user's email history
router.get('/history', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    res.json({
      emails: user.lastEmails || [],
      emailsSentToday: user.emailsSentToday || 0,
    });
  } catch (error) {
    console.error('[Emails] Error fetching history:', error.message);
    res.status(500).json({ error: 'Failed to fetch email history.' });
  }
});

// GET /api/emails/stats - Return email sending stats
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const now = new Date();
    const isAdmin = user.isAdmin === true;
    const isActive = isAdmin || (user.plan && user.plan.type !== 'none' && user.plan.expiresAt && new Date(user.plan.expiresAt) > now);
    const sentToday = user.emailsSentToday || 0;

    res.json({
      totalSent: user.totalEmailsSent || 0,
      sentToday,
      remainingToday: isAdmin ? 'unlimited' : (isActive ? Math.max(0, (user.plan?.dailyLimit || 0) - sentToday) : 0),
      planActive: isActive,
      isAdmin,
    });
  } catch (error) {
    console.error('[Emails] Error fetching stats:', error.message);
    res.status(500).json({ error: 'Failed to fetch email stats.' });
  }
});

// PUT /api/emails/countries - Update user's selectedCountries
router.put('/countries', requireAuth, async (req, res) => {
  try {
    const { countries } = req.body;

    if (!countries || !Array.isArray(countries)) {
      return res.status(400).json({ error: 'Countries must be an array of strings.' });
    }

    const normalized = countries.map((c) => String(c).trim().toUpperCase());

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { selectedCountries: normalized } },
      { new: true }
    );

    res.json({
      message: 'Target countries updated successfully.',
      selectedCountries: user.selectedCountries,
    });
  } catch (error) {
    console.error('[Emails] Error updating countries:', error.message);
    res.status(500).json({ error: 'Failed to update target countries.' });
  }
});

module.exports = router;
