const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/auth/google - Redirect to Google OAuth consent screen
router.get(
  '/google',
  passport.authenticate('google', {
    scope: [
      'profile',
      'email',
      'https://www.googleapis.com/auth/gmail.send',
    ],
    accessType: 'offline',
    prompt: 'consent',
  })
);

// GET /api/auth/google/callback - Handle OAuth callback
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed`,
  }),
  (req, res) => {
    try {
      console.log('[Auth] OAuth callback - user:', req.user.email, 'id:', req.user._id);

      // Create JWT token
      const token = jwt.sign(
        { userId: req.user._id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      console.log('[Auth] JWT created, redirecting to frontend');
      // Redirect to frontend with token
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
    } catch (error) {
      console.error('[Auth] Error creating token:', error.message);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=token_failed`);
    }
  }
);

// GET /api/auth/me - Get current user data (protected)
router.get('/me', requireAuth, async (req, res) => {
  try {
    console.log('[Auth] /me called for user:', req.user.email);
    res.json({ user: req.user });
  } catch (error) {
    console.error('[Auth] Error fetching user:', error.message);
    res.status(500).json({ error: 'Failed to fetch user data.' });
  }
});

// POST /api/auth/logout - Clear session
router.post('/logout', (req, res) => {
  try {
    // With JWT, logout is handled client-side by removing the token
    // This endpoint exists for any server-side cleanup if needed
    res.json({ message: 'Logged out successfully.' });
  } catch (error) {
    console.error('[Auth] Error during logout:', error.message);
    res.status(500).json({ error: 'Failed to logout.' });
  }
});

module.exports = router;
