import { OAuth2Client } from 'google-auth-library';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

const client = new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_CALLBACK_URL);

export interface GoogleUserInfo {
  googleId: string;
  email: string;
  name: string;
  avatar?: string;
  emailVerified: boolean;
}

/**
 * Verify Google ID Token (from Google Sign-In button or code exchange)
 */
export async function verifyGoogleToken(idToken: string): Promise<GoogleUserInfo> {
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID || undefined
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new Error('Google token payload missing email');
    }

    return {
      googleId: payload.sub,
      email: payload.email.toLowerCase(),
      name: payload.name || payload.email.split('@')[0],
      avatar: payload.picture,
      emailVerified: Boolean(payload.email_verified)
    };
  } catch (err: any) {
    logger.error('Google token verification failed:', err.message);
    throw new Error(`Google authentication failed: ${err.message}`);
  }
}

/**
 * Get Google OAuth 2.0 Authorization URL for redirect flow
 */
export function getGoogleAuthUrl(state?: string): string {
  if (!env.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID.includes('your-google-client-id') || env.GOOGLE_CLIENT_ID.includes('placeholder')) {
    return '';
  }
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ],
    state,
    prompt: 'select_account'
  });
}

/**
 * Exchange Google authorization code for tokens
 */
export async function exchangeGoogleCode(code: string): Promise<GoogleUserInfo> {
  const { tokens } = await client.getToken(code);
  if (!tokens.id_token) {
    throw new Error('No ID token returned by Google');
  }
  return verifyGoogleToken(tokens.id_token);
}

