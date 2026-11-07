import firebaseConfig from '../../firebase-applet-config.json';
import { PayoutBank, PayoutCountry } from '../types';

export { API_BASE_URL } from './apiConfig';
export const ROOT_URL = 'https://uqlearn.org';

// Google OAuth 2.0 Client ID for Google Identity Services & SSO
export const GOOGLE_CLIENT_ID = '528811302865-ad4h3qmc7jqb6lkuth2u3ivn2ljdf77e.apps.googleusercontent.com';

export const DEFAULT_PAYOUT_COUNTRIES: PayoutCountry[] = [
  { id: 'pc-ke', name: 'Kenya', code: 'KE', currencyCode: 'KES', currencySymbol: 'KSh', payoutMethods: ['M-Pesa', 'Bank Transfer'], minPayout: 1000, processingTime: '24 hours', isActive: true },
  { id: 'pc-ng', name: 'Nigeria', code: 'NG', currencyCode: 'NGN', currencySymbol: '₦', payoutMethods: ['Bank Transfer'], minPayout: 5000, processingTime: '48 hours', isActive: true },
];
export const DEFAULT_KENYA_COUNTRY = DEFAULT_PAYOUT_COUNTRIES[0];
export const DEFAULT_KENYA_BANKS = ['Equity Bank', 'KCB', 'Co-operative Bank', 'Absa'];
export const getDefaultKenyaPayoutBanks = (): PayoutBank[] => [
  { id: 'pb-ke-1', countryId: 'pc-ke', countryName: 'Kenya', name: 'Equity Bank', code: 'EQUITY', isActive: true },
  { id: 'pb-ke-2', countryId: 'pc-ke', countryName: 'Kenya', name: 'KCB', code: 'KCB', isActive: true },
  { id: 'pb-ke-3', countryId: 'pc-ke', countryName: 'Kenya', name: 'Co-operative Bank', code: 'COOP', isActive: true },
  { id: 'pb-ke-4', countryId: 'pc-ke', countryName: 'Kenya', name: 'Absa', code: 'ABSA', isActive: true },
];
export const DEFAULT_COURSE_THUMBNAIL = 'https://uqlearn.org/uploads/courses/1793397934_bb01db00c53c0a65497165cd5958a36e.png';
export const DEFAULT_VIDEO_THUMBNAIL = DEFAULT_COURSE_THUMBNAIL;

