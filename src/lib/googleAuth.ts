import firebaseConfig from '../../firebase-applet-config.json';
import { auth } from './firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { GOOGLE_CLIENT_ID } from './apiConstants';

export interface GoogleUserProfile {
  email: string;
  name: string;
  picture?: string;
  sub?: string;
}

/**
 * Safely decodes a Google Identity Services JWT credential string into user info.
 */
export function decodeGoogleJwt(credential: string): GoogleUserProfile {
  if (!credential || typeof credential !== 'string') {
    throw new Error('Invalid Google credential received.');
  }

  const parts = credential.split('.');
  if (parts.length < 2) {
    throw new Error('Malformed Google credential JWT.');
  }

  const base64Url = parts[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    window
      .atob(base64)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );

  const payload = JSON.parse(jsonPayload);
  const email = (payload.email || '').toLowerCase().trim();
  const name =
    payload.name ||
    `${payload.given_name || ''} ${payload.family_name || ''}`.trim() ||
    email.split('@')[0];
  const picture = payload.picture;
  const sub = payload.sub;

  if (!email) {
    throw new Error('No email found in Google credential.');
  }

  return { email, name, picture, sub };
}

/**
 * Direct Google OAuth 2.0 popup using Google Identity Services (GSI) OAuth2 Token Client.
 * Works on any domain listed in Google Cloud Console's Authorized JavaScript Origins
 * (e.g. uqlearn.org, en.uqlearn.org, instructor.uqlearn.org, rev.uqlearn.org)
 * without requiring Firebase Authorized Domains configuration.
 */
export async function signInWithGoogleDirectGsi(): Promise<GoogleUserProfile> {
  return new Promise((resolve, reject) => {
    try {
      if (!(window as any).google?.accounts?.oauth2) {
        throw new Error('Google Identity Services SDK is not loaded yet. Please try again in a moment.');
      }

      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'openid email profile',
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            reject(new Error(tokenResponse.error_description || tokenResponse.error || 'Google Sign-In failed.'));
            return;
          }
          try {
            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
            });
            if (!userInfoRes.ok) {
              throw new Error('Failed to retrieve user profile from Google.');
            }
            const info = await userInfoRes.json();
            const email = (info.email || '').toLowerCase().trim();
            const name = info.name || `${info.given_name || ''} ${info.family_name || ''}`.trim() || email.split('@')[0];
            const picture = info.picture;
            const sub = info.sub;

            if (!email) {
              throw new Error('No email found in Google profile.');
            }
            resolve({ email, name, picture, sub });
          } catch (err: any) {
            reject(err);
          }
        }
      });

      client.requestAccessToken({ prompt: 'select_account' });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Direct Firebase Auth Google Sign-In popup fallback.
 * Works seamlessly across web browsers and handles OAuth redirect/popup securely.
 */
export async function signInWithGoogleFirebase(): Promise<GoogleUserProfile> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  const user = result.user;
  const email = (user.email || '').toLowerCase().trim();
  const name = user.displayName || email.split('@')[0];
  const picture = user.photoURL || undefined;

  if (!email) {
    throw new Error('No email address provided by your Google Account.');
  }

  return { email, name, picture, sub: user.uid };
}

/**
 * Universal Google Sign-In helper that prioritizes direct GSI token Client
 * (which matches Google Cloud Console Authorized Origins directly)
 * and falls back to Firebase Auth popup.
 */
export async function signInWithGoogleUniversal(): Promise<GoogleUserProfile> {
  try {
    if ((window as any).google?.accounts?.oauth2) {
      return await signInWithGoogleDirectGsi();
    }
  } catch (gsiErr: any) {
    console.warn('GIS Token Sign-In failed, falling back to Firebase Auth:', gsiErr?.message || gsiErr);
  }
  return await signInWithGoogleFirebase();
}
