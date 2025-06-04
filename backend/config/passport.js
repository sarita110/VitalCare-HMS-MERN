import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import User from "../models/User.js";

const configurePassport = () => {
  // JWT Strategy for token auth
  passport.use(
    new JwtStrategy(
      {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: process.env.JWT_SECRET,
      },
      async (payload, done) => {
        try {
          const user = await User.findById(payload.id);
          if (!user) return done(null, false);
          return done(null, user);
        } catch (error) {
          return done(error, false);
        }
      }
    )
  );

  // Google Strategy for OAuth
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Find existing user by email
          let user = await User.findOne({ email: profile.emails[0].value });

          // If user doesn't exist, create a new one
          if (!user) {
            user = await User.create({
              name: profile.displayName,
              email: profile.emails[0].value,
              googleId: profile.id,
              image: profile.photos[0].value,
              isVerified: true, // Already verified through Google
            });
          } else if (!user.googleId) {
            // If user exists but hasn't Google auth before
            user.googleId = profile.id;
            user.isVerified = true;
            await user.save();
          }

          return done(null, user);
        } catch (error) {
          return done(error, false);
        }
      }
    )
  );

  // Session serialization
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

export default configurePassport;
