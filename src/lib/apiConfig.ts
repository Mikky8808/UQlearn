import { API_BASE_URL, ROOT_URL, DEFAULT_PAYOUT_COUNTRIES, DEFAULT_KENYA_COUNTRY, DEFAULT_KENYA_BANKS, getDefaultKenyaPayoutBanks, GOOGLE_CLIENT_ID, DEFAULT_VIDEO_THUMBNAIL } from './apiConstants';
export { API_BASE_URL, ROOT_URL, DEFAULT_PAYOUT_COUNTRIES, DEFAULT_KENYA_COUNTRY, DEFAULT_KENYA_BANKS, getDefaultKenyaPayoutBanks, GOOGLE_CLIENT_ID, DEFAULT_VIDEO_THUMBNAIL } from './apiConstants';
export type { PayoutCountry, PayoutBank } from '../types';

export const API_ENDPOINTS = {
  COURSES: 'courses.php',
  COURSE_DETAIL: (id: string) => `courses.php?id=${id}`,
  LOGIN: 'login.php',
  REGISTER: 'register.php',
  VERIFY_EMAIL: 'verify-email.php',
  SYNC_STATUS: 'sync-status.php',
  SYNC_TABLE: (table: string, limit: number, offset: number) => `sync-table.php?table=${table}&limit=${limit}&offset=${offset}`,
  SYNC_EXPORT: 'sync-export.php',
  SYNC: 'sync.php',
  SYNC_SQL: 'sync-sql.php',
  QUIZZES: 'quizzes.php',
  AI: 'ai.php',
  ANALYTICS: 'analytics.php',
  PURCHASES: 'purchases.php',
  MESSAGES: 'messages.php',
  COURSE_MESSAGES: 'course-messages.php',
  PROMOTIONAL_VIDEOS: 'promotional-videos.php',
  USERS: 'users.php',
  PRICE_ADJUSTMENTS: 'price-adjustments.php',
  QNA: 'qna.php',
  COURSE_MODULES: 'course-modules.php',
  PAYOUT_BANKS: 'payout-banks.php',
  CATEGORIES: 'categories.php',
  SYNC_CATEGORIES: 'sync-categories.php',
  PAYOUT_COUNTRIES: 'payout-countries.php',
  TOP_ADVERTS: 'top-adverts.php',
  ADVERTS: 'adverts.php',
  INTENDED_LEARNERS: 'intended-learners.php',
  WISHLIST: 'wishlist.php',
  RECENTLY_VIEWED: 'recently-viewed.php',
  SPONSORED_CLICKS: 'sponsored-clicks.php',
  REMINDERS: 'reminders.php',
  REQUESTS: 'requests.php',
  CURATED_LISTS: 'curated-lists.php',
  LESSONS: 'lessons.php',
  PROMOTION_TIERS: 'promotion-tiers.php',
  ENROLLMENT_PRICING: 'enrollment-pricing.php',
  SPONSORED_ADS: 'sponsored-ads.php',
  COURSE_DESCRIPTION_CHECKLIST: 'course-description-checklist.php',
  VIDEO_FOLDERS: 'video-folders.php',
  SIGNATURES: 'signatures.php',
  CUSTOM_MAIL_PRICING: 'custom-mail-pricing.php',
  CUSTOM_MAIL_SUBSCRIPTIONS: 'custom-mail-subscriptions.php',
  CUSTOM_MAIL_TEMPLATES: 'custom-mail-templates.php',
  SPONSORED_PLANS: 'sponsored-plans.php',
  FLASH_SALE_CONFIG: 'flash-sale-config.php',
  SPONSORED_COURSES: 'sponsored-courses.php',
  SPONSORED_IMPRESSIONS: 'sponsored-impressions.php',
  VIDEO_PROGRESS: 'video-progress.php',
  COURSE_PROGRESS: 'course-progress.php',
  COURSE_COMPLETE: 'mark-completed.php',
  CERTIFICATES: 'certificates.php',
  CERTIFICATE_TEMPLATES: 'certificate-templates.php',
  STUDY_PLAN: 'study-plan.php',
  SEND_LOGIN_OTP: 'send-login-otp.php',
  PAYSTACK: 'paystack.php',
  REVIEWERS: 'reviewers.php',
};

export interface PromotionTierConfig {
  id?: string;
  name?: string;
  price?: number;
  duration?: number;
  [key: string]: any;
}

export interface EnrollmentProofPricingConfig {
  enabled: boolean;
  price: number;
  [key: string]: any;
}

export interface VideoFolder {
  id: string;
  course_id?: string;
  name: string;
  created_at?: string;
  [key: string]: any;
}

export interface InstructorDetailsData {
  id?: string;
  name?: string;
  email?: string;
  bio?: string;
  avatar?: string;
  [key: string]: any;
}

export const getStudyPlanApi = async (userId: string) => await apiFetch(`${API_ENDPOINTS.STUDY_PLAN}?userId=${encodeURIComponent(userId)}`, { silent: true });
export const saveStudyPlanApi = async (data: any) => await apiFetch(API_ENDPOINTS.STUDY_PLAN, { method: 'POST', body: JSON.stringify(data), silent: true });
export const sendStudyReminderEmailApi = async (data: any) => await apiFetch('send-study-reminder.php', { method: 'POST', body: JSON.stringify(data), silent: true });

export const getRemindersApi = async (userId: string) => await apiFetch(`${API_ENDPOINTS.REMINDERS}?userId=${userId}`);
export const saveReminderApi = async (data: any) => await apiFetch(API_ENDPOINTS.REMINDERS, { method: 'POST', body: JSON.stringify(data) });
export const createRequestApi = async (data: any) => await apiFetch(API_ENDPOINTS.REQUESTS, { method: 'POST', body: JSON.stringify(data) });
export const getCuratedListsApi = async (userId: string) => await apiFetch(`${API_ENDPOINTS.CURATED_LISTS}?userId=${userId}`);
export const saveCuratedListApi = async (data: any) => await apiFetch(API_ENDPOINTS.CURATED_LISTS, { method: 'POST', body: JSON.stringify(data) });
export const deleteCuratedListApi = async (id: string) => await apiFetch(`${API_ENDPOINTS.CURATED_LISTS}?id=${id}`, { method: 'DELETE' });
export const upsertLessonApi = async (data: any) => await apiFetch(API_ENDPOINTS.LESSONS, { method: 'POST', body: JSON.stringify(data) });
export const getPromotionTiersApi = async (isAdmin?: boolean) => await apiFetch(`${API_ENDPOINTS.PROMOTION_TIERS}${isAdmin ? '?admin=true' : ''}`);
export const savePromotionTiersApi = async (data: any) => await apiFetch(API_ENDPOINTS.PROMOTION_TIERS, { method: 'POST', body: JSON.stringify(data) });
export const resetPromotionTiersApi = async () => await apiFetch(API_ENDPOINTS.PROMOTION_TIERS, { method: 'DELETE' });
export const getStoredPromotionTiers = () => {
    const stored = localStorage.getItem('promotion_tiers');
    return stored ? JSON.parse(stored) : [];
};
export const getStoredEnrollmentPricing = () => {
    const stored = localStorage.getItem('enrollment_pricing');
    return stored ? JSON.parse(stored) : { enabled: false, price: 0 };
};
export const getEnrollmentPricingApi = async () => await apiFetch(API_ENDPOINTS.ENROLLMENT_PRICING);
export const saveEnrollmentPricingApi = async (data: any) => await apiFetch(API_ENDPOINTS.ENROLLMENT_PRICING, { method: 'POST', body: JSON.stringify(data) });
export const calculateEnrollmentBoostPrice = (price: number) => price * 0.1;
export const DEFAULT_PROMOTION_TIERS = [];
export const applySponsoredAdApi = async (data: any) => await apiFetch(API_ENDPOINTS.SPONSORED_ADS, { method: 'POST', body: JSON.stringify(data) });
export const getCourseDescriptionChecklistApi = async (courseId: string) => await apiFetch(`${API_ENDPOINTS.COURSE_DESCRIPTION_CHECKLIST}?course_id=${encodeURIComponent(courseId)}`);
export const saveCourseDescriptionChecklistApi = async (data: any) => await apiFetch(API_ENDPOINTS.COURSE_DESCRIPTION_CHECKLIST, { method: 'POST', body: JSON.stringify(data) });
export const fetchVideoFoldersApi = async (courseId: string) => await apiFetch(`${API_ENDPOINTS.VIDEO_FOLDERS}?course_id=${encodeURIComponent(courseId)}`);
export const createVideoFolderApi = async (data: any) => await apiFetch(API_ENDPOINTS.VIDEO_FOLDERS, { method: 'POST', body: JSON.stringify(data) });
export const getCourseMessagesApi = async (courseId: string) => await apiFetch(`${API_ENDPOINTS.COURSE_MESSAGES}?course_id=${encodeURIComponent(courseId)}`);
export const saveCourseMessagesApi = async (data: any) => await apiFetch(API_ENDPOINTS.COURSE_MESSAGES, { method: 'POST', body: JSON.stringify(data) });
export const renameVideoFolderApi = async (id: string, name: string) => await apiFetch(API_ENDPOINTS.VIDEO_FOLDERS, { method: 'POST', body: JSON.stringify({ action: 'rename', id, name }) });
export const deleteVideoFolderApi = async (id: string) => await apiFetch(`${API_ENDPOINTS.VIDEO_FOLDERS}?id=${id}`, { method: 'DELETE' });
export const moveVideoToFolderApi = async (videoId: string, folderId: string) => await apiFetch(API_ENDPOINTS.VIDEO_FOLDERS, { method: 'POST', body: JSON.stringify({ action: 'move', videoId, folderId }) });
export const upsertModuleApi = async (data: any) => await apiFetch(API_ENDPOINTS.COURSE_MODULES, { method: 'POST', body: JSON.stringify(data) });
export const updateSectionTitleApi = async (id: string, title: string) => await apiFetch(API_ENDPOINTS.COURSE_MODULES, { method: 'POST', body: JSON.stringify({ action: 'update_title', id, title }) });
export const deleteModuleOrLessonApi = async (id: string, type: 'module' | 'lesson') => await apiFetch(`${API_ENDPOINTS.COURSE_MODULES}?id=${id}&type=${type}`, { method: 'DELETE' });
export const saveIntendedLearnersApi = async (courseId: string, learners: string[]) => await apiFetch(API_ENDPOINTS.INTENDED_LEARNERS, { method: 'POST', body: JSON.stringify({ courseId, learners }) });
export const fetchRequestsApi = async (role?: 'admin' | 'instructor') => await apiFetch(`${API_ENDPOINTS.REQUESTS}${role ? `?role=${role}` : ''}`);
export const updateRequestStatusApi = async (id: string, status: string, replyNote?: string) => await apiFetch(API_ENDPOINTS.REQUESTS, { method: 'PUT', body: JSON.stringify({ id, status, replyNote }) });
export const saveSignatureApi = async (data: any) => await apiFetch(API_ENDPOINTS.SIGNATURES, { method: 'POST', body: JSON.stringify(data) });
export const getCustomMailPricingApi = async () => await apiFetch(API_ENDPOINTS.CUSTOM_MAIL_PRICING);
export const saveCustomMailPricingApi = async (data: any) => await apiFetch(API_ENDPOINTS.CUSTOM_MAIL_PRICING, { method: 'POST', body: JSON.stringify(data) });
export const getAllCustomMailSubscriptionsApi = async () => await apiFetch(API_ENDPOINTS.CUSTOM_MAIL_SUBSCRIPTIONS);
export const subscribeCustomMailApi = async (data: any) => await apiFetch(API_ENDPOINTS.CUSTOM_MAIL_SUBSCRIPTIONS, { method: 'POST', body: JSON.stringify(data) });
export const getCustomMailTemplateApi = async (id: string) => await apiFetch(`${API_ENDPOINTS.CUSTOM_MAIL_TEMPLATES}?id=${id}`);
export const saveCustomMailTemplateApi = async (data: any) => await apiFetch(API_ENDPOINTS.CUSTOM_MAIL_TEMPLATES, { method: 'POST', body: JSON.stringify(data) });
export const localApiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const response = await fetch(endpoint, options);
  return response.json();
};
export const getSponsoredAdsApi = async () => await apiFetch(API_ENDPOINTS.SPONSORED_ADS);
export const deleteUserApi = async (id: string) => await apiFetch(`${API_ENDPOINTS.USERS}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
export const getSponsoredPlansApi = async () => await apiFetch(API_ENDPOINTS.SPONSORED_PLANS);
export const saveSponsoredPlansApi = async (data: any) => await apiFetch(API_ENDPOINTS.SPONSORED_PLANS, { method: 'POST', body: JSON.stringify(data) });
export const updateSponsoredAdStatusApi = async (id: string, status: string) => await apiFetch(API_ENDPOINTS.SPONSORED_ADS, { method: 'PUT', body: JSON.stringify({ id, status }) });
export const deleteSponsoredAdApi = async (id: string) => await apiFetch(`${API_ENDPOINTS.SPONSORED_ADS}?id=${id}`, { method: 'DELETE' });
export const saveTopAdvertApi = async (data: any) => await apiFetch(API_ENDPOINTS.TOP_ADVERTS, { method: 'POST', body: JSON.stringify(data) });
export const toggleTopAdvertActiveApi = async (id: string, isActive: boolean) => await apiFetch(`${API_ENDPOINTS.TOP_ADVERTS}?id=${id}`, { method: 'PUT', body: JSON.stringify({ action: 'toggle', isActive }) });
export const deleteTopAdvertApi = async (id: string) => await apiFetch(`${API_ENDPOINTS.TOP_ADVERTS}?id=${id}`, { method: 'DELETE' });
export const uploadTopAdvertImageApi = async (fileData: string, fileName?: string) => await uploadMediaApi(fileData, fileName, 'assets');
export const saveAdvertApi = async (data: any) => await apiFetch(API_ENDPOINTS.ADVERTS, { method: 'POST', body: JSON.stringify(data) });
export const toggleAdvertActiveApi = async (id: string, isActive: boolean) => await apiFetch(`${API_ENDPOINTS.ADVERTS}?id=${id}`, { method: 'PUT', body: JSON.stringify({ action: 'toggle', isActive }) });
export const deleteAdvertApi = async (id: string) => await apiFetch(`${API_ENDPOINTS.ADVERTS}?id=${id}`, { method: 'DELETE' });
export const uploadAdvertImageApi = async (fileData: string, fileName?: string) => await uploadMediaApi(fileData, fileName, 'assets');
export const assignCourseToReviewerApi = async (courseId: string, reviewerId: string) => await apiFetch(API_ENDPOINTS.COURSES, { method: 'POST', body: JSON.stringify({ action: 'assign_reviewer', courseId, reviewerId }) });
export const saveReviewerAssignmentsApi = async (data: any) => await apiFetch(API_ENDPOINTS.COURSES, { method: 'POST', body: JSON.stringify({ action: 'bulk_assign', ...data }) });

export interface ApiFetchOptions extends RequestInit {
  silent?: boolean;
}

export const apiFetch = async (
  endpoint?: string,
  options: ApiFetchOptions = {},
  retries: number = 0
): Promise<any> => {
  if (!endpoint || typeof endpoint !== 'string') {
    if (options?.silent) {
      return null;
    }
    throw new Error(`apiFetch called with invalid endpoint: ${endpoint}`);
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (options?.silent) {
        return null;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    if (!text || !text.trim()) {
      return null;
    }
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch (error: any) {
    if (retries > 0) {
      return apiFetch(endpoint, options, retries - 1);
    }
    if (options?.silent) {
      return null;
    }
    throw error;
  }
};

export const getTopAdvertsApi = async () => await apiFetch(API_ENDPOINTS.TOP_ADVERTS);
export const getAdvertsApi = async () => await apiFetch(API_ENDPOINTS.ADVERTS);
export const fetchCourseModulesApi = async (courseId: string) => await apiFetch(`${API_ENDPOINTS.COURSE_MODULES}?course_id=${encodeURIComponent(courseId)}`);
export const getIntendedLearnersApi = async (courseId: string) => await apiFetch(`${API_ENDPOINTS.INTENDED_LEARNERS}?course_id=${encodeURIComponent(courseId)}`);
export const getWishlistApi = async (userId: string) => await apiFetch(`${API_ENDPOINTS.WISHLIST}?userId=${userId}`);
export const addToWishlistApi = async (userId: string, courseId: string) => await apiFetch(API_ENDPOINTS.WISHLIST, { method: 'POST', body: JSON.stringify({ userId, courseId }) });
export const removeFromWishlistApi = async (userId: string, courseId: string) => await apiFetch(`${API_ENDPOINTS.WISHLIST}?userId=${userId}&courseId=${courseId}`, { method: 'DELETE' });
export const recordRecentlyViewedApi = async (userId: string, courseId: string) => await apiFetch(API_ENDPOINTS.RECENTLY_VIEWED, { method: 'POST', body: JSON.stringify({ userId, courseId }) });
export const fetchRecentlyViewedApi = async (userId: string) => await apiFetch(`${API_ENDPOINTS.RECENTLY_VIEWED}?userId=${userId}`);
export const recordSponsoredClickApi = async (adId: string) => await apiFetch(API_ENDPOINTS.SPONSORED_CLICKS, { method: 'POST', body: JSON.stringify({ adId }) });
export const fetchFlashSaleConfigApi = async () => await apiFetch(API_ENDPOINTS.FLASH_SALE_CONFIG);
export const saveFlashSaleConfigApi = async (data: any) => await apiFetch(API_ENDPOINTS.FLASH_SALE_CONFIG, { method: 'POST', body: JSON.stringify(data) });
export const getActiveSponsoredCoursesApi = async () => {
  // Primary: Fetch from sponsored_ads.php (active API on backend)
  const res = await apiFetch(API_ENDPOINTS.SPONSORED_ADS, { silent: true }).catch(() => null);
  if (res && (res.success || Array.isArray(res) || Array.isArray(res?.data))) {
    return res;
  }
  // Secondary: Fallback to sponsored-courses.php endpoint
  return await apiFetch(API_ENDPOINTS.SPONSORED_COURSES, { silent: true }).catch(() => null);
};
export const recordSponsoredImpressionApi = async (adId: string) => await apiFetch(API_ENDPOINTS.SPONSORED_IMPRESSIONS, { method: 'POST', body: JSON.stringify({ adId }) });

export const getInstructorUrl = () => `${ROOT_URL}/instructor`;

export const createPayoutBankApi = async (bank: any) => {
  return await apiFetch(API_ENDPOINTS.PAYOUT_BANKS, {
    method: 'POST',
    body: JSON.stringify(bank),
  });
};

export const fetchCoursesApi = async (creatorId?: string) => {
  const url = creatorId ? `${API_ENDPOINTS.COURSES}?creator_id=${creatorId}` : API_ENDPOINTS.COURSES;
  return await apiFetch(url);
};

export const deleteCourseApi = async (id: string) => {
  return await apiFetch(`${API_ENDPOINTS.COURSES}?id=${id}`, { method: 'DELETE' });
};

export const fetchCourseCategoriesApi = async () => await apiFetch(API_ENDPOINTS.CATEGORIES);
export const saveCourseCategoryApi = async (data: any) => await apiFetch(API_ENDPOINTS.CATEGORIES, { method: 'POST', body: JSON.stringify(data) });
export const deleteCourseCategoryApi = async (id: string) => await apiFetch(`${API_ENDPOINTS.CATEGORIES}?id=${id}`, { method: 'DELETE' });
export const syncCourseCategoriesApi = async (data: any) => await apiFetch(API_ENDPOINTS.SYNC_CATEGORIES, { method: 'POST', body: JSON.stringify(data) });

export const fetchPayoutCountriesApi = async () => await apiFetch(API_ENDPOINTS.PAYOUT_COUNTRIES);
export const createPayoutCountryApi = async (data: any) => await apiFetch(API_ENDPOINTS.PAYOUT_COUNTRIES, { method: 'POST', body: JSON.stringify(data) });
export const updatePayoutCountryApi = async (id: string, data: any) => await apiFetch(`${API_ENDPOINTS.PAYOUT_COUNTRIES}?id=${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deletePayoutCountryApi = async (id: string) => await apiFetch(`${API_ENDPOINTS.PAYOUT_COUNTRIES}?id=${id}`, { method: 'DELETE' });
export const togglePayoutCountryActiveApi = async (id: string, isActive: boolean) => await apiFetch(`${API_ENDPOINTS.PAYOUT_COUNTRIES}?id=${id}`, { method: 'PUT', body: JSON.stringify({ action: 'toggle', isActive }) });

export const fetchPayoutBanksApi = async (countryId?: string) => {
  const url = countryId ? `${API_ENDPOINTS.PAYOUT_BANKS}?countryId=${countryId}` : API_ENDPOINTS.PAYOUT_BANKS;
  return await apiFetch(url);
};
export const updatePayoutBankApi = async (id: string, data: any) => await apiFetch(`${API_ENDPOINTS.PAYOUT_BANKS}?id=${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deletePayoutBankApi = async (id: string) => await apiFetch(`${API_ENDPOINTS.PAYOUT_BANKS}?id=${id}`, { method: 'DELETE' });
export const togglePayoutBankActiveApi = async (id: string, isActive: boolean) => await apiFetch(`${API_ENDPOINTS.PAYOUT_BANKS}?id=${id}`, { method: 'PUT', body: JSON.stringify({ action: 'toggle', isActive }) });

const isTruthyValue = (val: any): boolean => {
  if (val === true || val === 1 || val === '1' || val === 'true' || val === 'yes') return true;
  return false;
};

export const normalizeCourse = (c: any): any => {
  if (!c) return c;
  const isSponsored = isTruthyValue(
    c.isSponsored ?? c.is_sponsored ?? c.sponsored ?? c.isSponsoredAd ?? c.is_sponsored_ad ?? c.is_ad ?? c.sponsored_ad ?? c.promoted ?? c.is_promoted
  );
  const isPremium = isTruthyValue(c.isPremium ?? c.is_premium ?? c.premium);
  const bestSeller = isTruthyValue(c.bestSeller ?? c.bestseller ?? c.isBestseller ?? c.is_bestseller);

  return {
    ...c,
    isSponsored,
    is_sponsored: isSponsored,
    isPremium,
    is_premium: isPremium,
    bestSeller,
    bestseller: bestSeller,
    price: typeof c.price === 'string' ? parseFloat(c.price) : (c.price || 0),
    originalPrice: typeof c.originalPrice === 'string' ? parseFloat(c.originalPrice) : (c.originalPrice || 0),
    rating: typeof c.rating === 'string' ? parseFloat(c.rating) : (c.rating || 0),
    reviewCount: typeof c.reviewCount === 'string' ? parseInt(c.reviewCount) : (c.reviewCount || 0),
    learnersEnrolled: typeof c.learnersEnrolled === 'string' ? parseInt(c.learnersEnrolled) : (c.learnersEnrolled || 0),
    modules: Array.isArray(c.modules) ? c.modules : [],
  };
};

export const extractSponsoredCourseIds = (res: any): string[] => {
  if (!res) return [];
  let list: any[] = [];
  if (Array.isArray(res)) {
    list = res;
  } else if (res.data && Array.isArray(res.data)) {
    list = res.data;
  } else if (res.courseIds && Array.isArray(res.courseIds)) {
    list = res.courseIds;
  } else if (res.sponsoredCourses && Array.isArray(res.sponsoredCourses)) {
    list = res.sponsoredCourses;
  } else if (res.courses && Array.isArray(res.courses)) {
    list = res.courses;
  } else if (res.sponsored && Array.isArray(res.sponsored)) {
    list = res.sponsored;
  }
  
  return list
    .filter((item: any) => {
      if (typeof item === 'string' || typeof item === 'number') return true;
      if (!item) return false;
      // If status property exists on ad item, ensure it's active / approved
      if (item.status && item.status !== 'active' && item.status !== 'approved' && item.status !== 1 && item.status !== '1') {
        return false;
      }
      return true;
    })
    .map((item: any) => {
      if (typeof item === 'string' || typeof item === 'number') return String(item);
      if (!item) return '';
      return String(item.courseId || item.course_id || item.course_ID || '');
    })
    .filter(Boolean);
};

export const uploadMediaApi = async (fileData: string, fileName?: string, folder: 'courses' | 'avatars' | 'assets' = 'courses') => {
  return await apiFetch('upload.php', {
    method: 'POST',
    body: JSON.stringify({ fileData, fileName, folder })
  });
};
export const uploadImageApi = uploadMediaApi;

export const getActiveSession = () => {
  const session = localStorage.getItem('uqlearn_session');
  return session ? JSON.parse(session) : null;
};

export const updateActiveSession = (data: any) => {
  localStorage.setItem('uqlearn_session', JSON.stringify(data));
};

export const fetchLogoApi = async () => {
  return await apiFetch('logo.php');
};

export const getCourseDefaultThumbnailApi = async () => {
  return await apiFetch('get-default-thumbnail.php');
};

export const updateLogoApi = async (url: string) => {
  return await apiFetch('logo.php', {
    method: 'POST',
    body: JSON.stringify({ action: 'update', url })
  });
};
