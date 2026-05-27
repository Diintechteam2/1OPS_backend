const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

const configureGoogleOAuth = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL;

  if (!clientId || !clientSecret) {
    console.warn('WARNING: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not configured. Google OAuth redirect will fail, use developer mock login bypass for local development.');
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: clientId,
        clientSecret: clientSecret,
        callbackURL: callbackUrl,
        passReqToCallback: true,
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails[0].value;
          let user = await User.findOne({ email });

          if (!user) {
            // Count users to generate the sequential EMP-XXX ID
            const count = await User.countDocuments();
            const nextNum = count + 1;
            const employeeId = `EMP-${String(nextNum).padStart(3, '0')}`;
            
            // First registered user gets promoted to Admin automatically for development testing
            const role = count === 0 ? 'admin' : 'employee';

            user = await User.create({
              googleId: profile.id,
              name: profile.displayName || 'Employee',
              email: email,
              profileImageUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : '',
              role: role,
              employeeId: employeeId,
              isActive: true,
              joiningDate: new Date()
            });
          } else {
            // Link googleId if it wasn't linked before
            if (!user.googleId) {
              user.googleId = profile.id;
            }
            if (!user.profileImageUrl && profile.photos && profile.photos[0]) {
              user.profileImageUrl = profile.photos[0].value;
            }
            await user.save();
          }

          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );

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
};

module.exports = configureGoogleOAuth;
