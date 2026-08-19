import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config } from './index';
import { authService } from '../modules/auth/auth.service';

/**
 * Configure Passport.js with Google OAuth 2.0 Strategy
 */
export function configurePassport(): void {
  if (config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: config.GOOGLE_CLIENT_ID,
          clientSecret: config.GOOGLE_CLIENT_SECRET,
          callbackURL: config.GOOGLE_CALLBACK_URL,
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error('No email found in Google OAuth profile'), undefined);
            }

            const result = await authService.handleOAuthLogin({
              googleId: profile.id,
              email,
              name: profile.displayName,
              avatarUrl: profile.photos?.[0]?.value,
            });

            return done(null, result as any);
          } catch (error) {
            return done(error as Error, undefined);
          }
        }
      )
    );
    console.log('✅ [Passport] Google OAuth 2.0 Strategy configured successfully.');
  } else {
    console.log(
      'ℹ️ [Passport] Google OAuth client credentials not set; running in development / test mode with mock provider support.'
    );
  }
}

export default passport;
