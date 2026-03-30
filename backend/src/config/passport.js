const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

const clientID = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (clientID && clientSecret && !clientID.startsWith('dummy') && !clientID.startsWith('your-')) {
  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails[0].value;
          const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
          const isAdmin = adminEmails.includes(email.toLowerCase());

          let user = await User.findOne({ googleId: profile.id });

          if (user) {
            // Update admin status and Gmail tokens on every login
            user.isAdmin = isAdmin;
            if (accessToken) user.gmailAccessToken = accessToken;
            if (refreshToken) user.gmailRefreshToken = refreshToken;
            await user.save();
            console.log('[Passport] Existing user login:', email, isAdmin ? '(ADMIN)' : '', '| gmail tokens:', !!accessToken);
            return done(null, user);
          }

          user = await User.create({
            googleId: profile.id,
            email,
            name: profile.displayName,
            avatar: profile.photos[0] ? profile.photos[0].value : '',
            isAdmin,
            gmailAccessToken: accessToken || '',
            gmailRefreshToken: refreshToken || '',
          });

          console.log('[Passport] New user created:', email, isAdmin ? '(ADMIN)' : '');

          done(null, user);
        } catch (error) {
          done(error, null);
        }
      }
    )
  );
} else {
  console.warn('[Passport] Google OAuth not configured - using dummy credentials. Set real GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
}

module.exports = passport;
