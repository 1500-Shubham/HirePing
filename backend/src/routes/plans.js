const express = require('express');
const crypto = require('crypto');
const { requireAuth } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

const PLANS = {
  daily: {
    name: 'Daily',
    price: 29,
    currency: 'INR',
    duration: 1,
    dailyLimit: 30,
    description: '30 emails for 1 day',
  },
  weekly: {
    name: 'Weekly',
    price: 149,
    currency: 'INR',
    duration: 7,
    dailyLimit: 30,
    description: '30 emails per day for 7 days',
  },
  monthly: {
    name: 'Monthly',
    price: 299,
    currency: 'INR',
    duration: 30,
    dailyLimit: 30,
    description: '30 emails per day for 30 days',
  },
};

// Initialize Razorpay only if keys are configured
let razorpay = null;
const rzpKeyId = process.env.RAZORPAY_KEY_ID || '';
const rzpKeySecret = process.env.RAZORPAY_KEY_SECRET || '';

if (rzpKeyId && !rzpKeyId.startsWith('rzp_test_xxx')) {
  const Razorpay = require('razorpay');
  razorpay = new Razorpay({ key_id: rzpKeyId, key_secret: rzpKeySecret });
  console.log('[Plans] Razorpay initialized (key:', rzpKeyId.substring(0, 12) + '...)');
} else {
  console.log('[Plans] Razorpay not configured — manual UPI fallback active');
}

// GET /api/plans - Return available plans + payment config
router.get('/', requireAuth, async (req, res) => {
  try {
    res.json({
      plans: PLANS,
      razorpayEnabled: !!razorpay,
      razorpayKeyId: razorpay ? rzpKeyId : null,
      upiId: process.env.UPI_ID || '',
    });
  } catch (error) {
    console.error('[Plans] Error fetching plans:', error.message);
    res.status(500).json({ error: 'Failed to fetch plans.' });
  }
});

// POST /api/plans/create-order - Create Razorpay order
router.post('/create-order', requireAuth, async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(400).json({ error: 'Razorpay not configured. Use manual UPI.' });
    }

    const { planType } = req.body;
    if (!planType || !PLANS[planType]) {
      return res.status(400).json({ error: 'Invalid plan type.' });
    }

    const plan = PLANS[planType];

    const order = await razorpay.orders.create({
      amount: plan.price * 100, // Razorpay uses paise
      currency: 'INR',
      receipt: `hireping_${req.user._id}_${Date.now()}`,
      notes: {
        userId: req.user._id.toString(),
        planType,
        userEmail: req.user.email,
      },
    });

    console.log('[Plans] Razorpay order created:', order.id, '| plan:', planType, '| ₹' + plan.price, '| user:', req.user.email);

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      planType,
    });
  } catch (error) {
    console.error('[Plans] Error creating Razorpay order:', error.message);
    res.status(500).json({ error: 'Failed to create payment order.' });
  }
});

// POST /api/plans/verify - Verify Razorpay payment and activate plan
router.post('/verify', requireAuth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planType } = req.body;

    if (!razorpay) {
      return res.status(400).json({ error: 'Razorpay not configured.' });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !planType) {
      return res.status(400).json({ error: 'Missing payment verification fields.' });
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', rzpKeySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.error('[Plans] Razorpay signature mismatch for user:', req.user.email);
      return res.status(400).json({ error: 'Payment verification failed. Signature mismatch.' });
    }

    // Payment verified — activate plan
    const plan = PLANS[planType];
    if (!plan) {
      return res.status(400).json({ error: 'Invalid plan type.' });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + plan.duration * 24 * 60 * 60 * 1000);

    console.log('[Plans] Razorpay payment verified:', razorpay_payment_id, '| plan:', planType, '| user:', req.user.email);

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          'plan.type': planType,
          'plan.purchasedAt': now,
          'plan.expiresAt': expiresAt,
          'plan.dailyLimit': plan.dailyLimit,
          'plan.razorpayPaymentId': razorpay_payment_id,
          'plan.razorpayOrderId': razorpay_order_id,
          'plan.amount': plan.price,
          emailsSentToday: 0,
          lastResetDate: now,
        },
        $push: {
          payments: {
            planType,
            amount: plan.price,
            razorpayPaymentId: razorpay_payment_id,
            razorpayOrderId: razorpay_order_id,
            purchasedAt: now,
            expiresAt,
          },
        },
      },
      { new: true }
    );

    console.log('[Plans] Plan activated:', planType, '| expires:', expiresAt.toISOString());
    res.json({
      message: `${plan.name} plan activated! You're all set to send emails.`,
      plan: user.plan,
    });
  } catch (error) {
    console.error('[Plans] Error verifying payment:', error.message);
    res.status(500).json({ error: 'Failed to verify payment.' });
  }
});

// POST /api/plans/purchase - Manual UPI fallback (when Razorpay not configured)
router.post('/purchase', requireAuth, async (req, res) => {
  try {
    const { planType, upiTransactionId } = req.body;

    if (!planType || !PLANS[planType]) {
      return res.status(400).json({ error: 'Invalid plan type. Choose "daily", "weekly", or "monthly".' });
    }

    if (!upiTransactionId || upiTransactionId.trim().length < 4) {
      return res.status(400).json({ error: 'Please enter a valid UPI transaction ID / UTR number.' });
    }

    const plan = PLANS[planType];
    const now = new Date();
    const expiresAt = new Date(now.getTime() + plan.duration * 24 * 60 * 60 * 1000);

    console.log('[Plans] Manual UPI purchase by:', req.user.email, '| plan:', planType, '| ₹' + plan.price, '| UTR:', upiTransactionId);

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          'plan.type': planType,
          'plan.purchasedAt': now,
          'plan.expiresAt': expiresAt,
          'plan.dailyLimit': plan.dailyLimit,
          'plan.upiTransactionId': upiTransactionId.trim(),
          'plan.amount': plan.price,
          emailsSentToday: 0,
          lastResetDate: now,
        },
        $push: {
          payments: {
            planType,
            amount: plan.price,
            upiTransactionId: upiTransactionId.trim(),
            purchasedAt: now,
            expiresAt,
          },
        },
      },
      { new: true }
    );

    console.log('[Plans] Plan activated:', planType, '| expires:', expiresAt.toISOString());
    res.json({
      message: `${plan.name} plan activated! You're all set to start sending emails.`,
      plan: user.plan,
    });
  } catch (error) {
    console.error('[Plans] Error purchasing plan:', error.message);
    res.status(500).json({ error: 'Failed to purchase plan.' });
  }
});

// GET /api/plans/status - Return current plan status
router.get('/status', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const now = new Date();
    const isAdmin = user.isAdmin === true;

    let status = isAdmin ? 'admin' : 'none';
    let daysRemaining = 0;
    let emailsRemaining = 0;

    if (!isAdmin && user.plan && user.plan.type !== 'none') {
      if (user.plan.expiresAt && new Date(user.plan.expiresAt) > now) {
        status = 'active';
        daysRemaining = Math.ceil(
          (new Date(user.plan.expiresAt) - now) / (1000 * 60 * 60 * 24)
        );
        emailsRemaining = Math.max(0, (user.plan.dailyLimit || 0) - (user.emailsSentToday || 0));
      } else {
        status = 'expired';
        await User.findByIdAndUpdate(user._id, {
          $set: { 'plan.type': 'none', 'plan.dailyLimit': 0 },
        });
      }
    }

    console.log('[Plans] Status for', user.email, ':', status, '| days left:', daysRemaining);
    res.json({
      status,
      plan: user.plan,
      daysRemaining,
      emailsRemaining,
      emailsSentToday: user.emailsSentToday || 0,
      isAdmin,
    });
  } catch (error) {
    console.error('[Plans] Error fetching plan status:', error.message);
    res.status(500).json({ error: 'Failed to fetch plan status.' });
  }
});

module.exports = router;
