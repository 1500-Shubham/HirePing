const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/profile - Get current user's profile
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    console.log('[Profile] GET profile for:', user.email, '| skills:', (user.profile?.skills || []).length);
    res.json({
      profile: user.profile || {},
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    });
  } catch (error) {
    console.error('[Profile] Error fetching profile:', error.message);
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

// PUT /api/profile - Update profile fields
router.put('/', requireAuth, async (req, res) => {
  try {
    const allowedFields = ['phone', 'location', 'summary', 'skills', 'education', 'experience'];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[`profile.${field}`] = req.body[field];
      }
    }

    // Also allow updating name
    if (req.body.name !== undefined) {
      updates.name = req.body.name;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update.' });
    }

    console.log('[Profile] PUT update fields:', Object.keys(updates).join(', '));

    const user = await req.user.constructor.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Profile updated successfully.',
      profile: user.profile,
      name: user.name,
    });
  } catch (error) {
    console.error('[Profile] Error updating profile:', error.message);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

module.exports = router;
