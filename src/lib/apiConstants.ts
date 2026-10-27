import firebaseConfig from '../../firebase-applet-config.json';

export const API_BASE_URL = 'https://uqlearn.org/api/v1/';
export const ROOT_URL = 'https://uqlearn.org';

// Google OAuth 2.0 Client ID for Google Identity Services & SSO
export const GOOGLE_CLIENT_ID: string =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID) ||
  (firebaseConfig as any)?.oAuthClientId ||
  '528811302865-ad4h3qmc7jqb6lkuth2u3ivn2ljdf77e.apps.googleusercontent.com';

export const DEFAULT_PAYOUT_COUNTRIES = [
  { id: '1', name: 'Kenya', code: 'KE', currencyCode: 'KES', currencySymbol: 'KSh', payoutMethods: ['M-Pesa', 'Bank Transfer'], minPayout: 1000, processingTime: '24 hours', isActive: true },
  { id: '2', name: 'Nigeria', code: 'NG', currencyCode: 'NGN', currencySymbol: '₦', payoutMethods: ['Bank Transfer'], minPayout: 5000, processingTime: '48 hours', isActive: true },
];
export const DEFAULT_KENYA_COUNTRY = DEFAULT_PAYOUT_COUNTRIES[0];
export const DEFAULT_KENYA_BANKS = ['Equity Bank', 'KCB', 'Co-operative Bank', 'Absa'];
export const getDefaultKenyaPayoutBanks = () => DEFAULT_KENYA_BANKS;
export const DEFAULT_VIDEO_THUMBNAIL = 'https://uqlearn.org/assets/default-lesson-thumbnail.png';
