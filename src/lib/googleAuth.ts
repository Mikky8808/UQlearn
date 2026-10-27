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
