import { logApiError, getRecentApiErrorLogs } from './errorLogger';

export { logApiError, getRecentApiErrorLogs };

export const API_BASE_URL = 'https://uqlearn.org/api/v1/';
export const ROOT_URL = 'https://uqlearn.org';
export const GOOGLE_CLIENT_ID = '';

export const API_ENDPOINTS = {
  COURSES: 'courses.php',
  COURSE_DETAIL: (id: string) => `courses.php?id=${id}`,
  LOGIN: 'login.php',
  REGISTER: 'register.php',
  VERIFY_EMAIL: 'verify-email.php',
  SYNC_STATUS: 'sync.php?action=status',
  SYNC_TABLE: (table: string, limit: number, offset: number) => `sync.php?action=table&table=${table}&limit=${limit}&offset=${offset}`,
  SYNC_EXPORT: 'sync.php?action=export',
  SYNC: 'sync.php',
  SYNC_SQL: 'sync.php?action=generate_sql',
  QUIZZES: 'quizzes.php',
  AI: 'ai.php',
  ANALYTICS: 'analytics.php',
  PURCHASES: 'purchases.php',
  MESSAGES: 'instructor-messages.php',
  COURSE_MESSAGES: 'course-messages.php',
  PROMOTIONAL_VIDEOS: 'promotional-videos.php',
  USERS: 'users.php',
  PRICE_ADJUSTMENTS: 'price-adjustments.php',
  QNA: 'qna.php',
  CATEGORIES: 'course-categories.php',
  PAYOUT_COUNTRIES: 'payout-countries.php',
  PAYOUT_BANKS: 'payout-banks.php',
  SIGNATURE: 'signatures.php',
  REVIEWER_ASSIGNMENTS: 'reviewers.php',
  TOP_ADVERTS: 'top-adverts.php',
  REVIEWERS: 'reviewers.php',
  COURSE_COMPLETE: 'course-complete.php',
  CERTIFICATES: 'certificates.php',
  CERTIFICATE_TEMPLATES: 'certificate-templates.php',
  VIDEO_PROGRESS: 'video-progress.php',
  STUDY_PLAN: 'study-planner.php',
};

export const apiFetch = async (
  endpoint: string, 
  options: any = {}, 
  ...args: any[]
) => {
  const silent = options.silent ?? (typeof args[0] === 'number' ? !!args[0] : args[0]) ?? false;
  const baseUrl = API_BASE_URL.replace(/\/+$/, '');
  const cleanEndpoint = endpoint.replace(/^\/+/, '');
  const originalUrl = endpoint.startsWith('http') ? endpoint : `${baseUrl}/${cleanEndpoint}`;
  let url = originalUrl;
  const isUqlearnApi =
    originalUrl.includes('uqlearn.org/api/v1') ||
    url.startsWith('/api/v1') ||
    url.startsWith('/api/proxy/v1');
  const method = (options?.method || 'GET').toUpperCase();

  const isLiveUqlearnHost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'uqlearn.org' || window.location.hostname.endsWith('.uqlearn.org'));

  // Only route through local Express /api/v1 proxy when running outside uqlearn.org (e.g. AI Studio preview or localhost).
  // On live uqlearn.org / *.uqlearn.org, hit https://uqlearn.org/api/v1/... directly so Apache serves the real PHP files.
  if (!isLiveUqlearnHost && url.startsWith('https://uqlearn.org/api/v1')) {
    url = url.replace('https://uqlearn.org/api/v1', '/api/v1');
  }
  
  let hasLoggedError = false;

  try {
    const response = await fetch(url, options);
    const rawText = await response.text().catch(() => '');

    if (!response.ok) {
      const errorMsg = `API error (${response.status}): ${response.statusText || 'HTTP Error'} for ${originalUrl}`;
      if (!silent) console.error(errorMsg);
      if (isUqlearnApi) {
        hasLoggedError = true;
        void logApiError({
          endpoint: cleanEndpoint,
          url,
          originalUrl,
          method,
          status: response.status,
          statusText: response.statusText || `HTTP ${response.status}`,
          errorMessage: errorMsg,
          responsePreview: rawText.slice(0, 2000),
          domain: 'uqlearn.org/api/v1/',
        });
      }
      throw new Error(`API error: ${response.statusText || response.status}`);
    }

    let parsedData: any;
    try {
      parsedData = rawText ? JSON.parse(rawText) : null;
    } catch (parseErr) {
      const parseErrorMsg = `Invalid JSON response from ${originalUrl}: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`;
      if (isUqlearnApi) {
        hasLoggedError = true;
        void logApiError({
          endpoint: cleanEndpoint,
          url,
          originalUrl,
          method,
          status: response.status,
          statusText: 'Invalid JSON Payload',
          errorMessage: parseErrorMsg,
          responsePreview: rawText.slice(0, 2000),
          domain: 'uqlearn.org/api/v1/',
        });
      }
      throw parseErr;
    }

    // Also capture application-level API errors returned with HTTP 200
    if (
      isUqlearnApi &&
      parsedData &&
      typeof parsedData === 'object' &&
      !Array.isArray(parsedData) &&
      (parsedData.status === 'error' || parsedData.success === false || typeof parsedData.error === 'string')
    ) {
      void logApiError({
        endpoint: cleanEndpoint,
        url,
        originalUrl,
        method,
        status: response.status,
        statusText: 'Application Error in Payload',
        errorMessage: String(parsedData.error || parsedData.message || 'API returned error status in JSON body'),
        responsePreview: rawText.slice(0, 2000),
        domain: 'uqlearn.org/api/v1/',
      });
    }

    return parsedData;
  } catch (err) {
    if (!silent) console.error(`Fetch failed for ${url}:`, err);
    if (isUqlearnApi && !hasLoggedError) {
      void logApiError({
        endpoint: cleanEndpoint,
        url,
        originalUrl,
        method,
        status: 0,
        statusText: 'Network or Fetch Failure',
        errorMessage: err instanceof Error ? err.message : String(err),
        domain: 'uqlearn.org/api/v1/',
      });
    }
    throw err;
  }
};

export const getInstructorUrl = () => 'https://instructor.uqlearn.org';

// Main API Export List
export const addToWishlistApi = (courseId: string) => apiFetch('wishlist.php', { method: 'POST', body: JSON.stringify({ action: 'add', courseId }) });
export const assignCourseToReviewerApi = (courseId: string, reviewerId: string) => apiFetch(API_ENDPOINTS.REVIEWER_ASSIGNMENTS, { method: 'POST', body: JSON.stringify({ action: 'assign_reviewer', courseId, course_id: courseId, reviewerId, reviewer_id: reviewerId }) });
export const checkInstructorOnboardingApi = (userId: string) => apiFetch(`instructor-onboarding.php?userId=${encodeURIComponent(userId)}`);
export const createRequestApi = (data: any) => apiFetch('requests.php', { method: 'POST', body: JSON.stringify(data) });
export const DEFAULT_VIDEO_THUMBNAIL = '';
export const deleteCourseApi = (courseId: string) => apiFetch(`courses.php?id=${courseId}`, { method: 'DELETE' });
export const deleteCuratedListApi = (id: string) => apiFetch(`curated-lists.php?id=${id}`, { method: 'DELETE' });
export const deleteModuleOrLessonApi = (id: string) => apiFetch(`course-modules.php?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
export const deleteUserApi = (id: string) => apiFetch(`users.php?id=${id}`, { method: 'DELETE' });
export const fetchCourseCategoriesApi = () => apiFetch(API_ENDPOINTS.CATEGORIES);
export const fetchCourseModulesApi = (courseId: string) => apiFetch(`course-modules.php?course_id=${encodeURIComponent(courseId)}`);
export const fetchCoursesApi = (creatorId?: string) => apiFetch(creatorId ? `courses.php?creator_id=${creatorId}` : 'courses.php');
export const fetchInstructorDetailsApi = (userId: string) => apiFetch(`profile.php?id=${encodeURIComponent(userId)}&userId=${encodeURIComponent(userId)}`);
export const fetchRequestsApi = () => apiFetch('requests.php');
export const getCourseMessagesApi = (courseId: string) => apiFetch(`course-messages.php?course_id=${courseId}`);
export const saveCourseMessagesApi = (data: any) => apiFetch('course-messages.php', { method: 'POST', body: JSON.stringify(data) });
export const fetchSignatureApi = (userId: string) => apiFetch(`signatures.php?userId=${userId}`);
export const getActiveSession = () => { try { return JSON.parse(localStorage.getItem('activeSession') || '{}'); } catch { return {}; } };
export const getActiveSponsoredCoursesApi = () => apiFetch('sponsored_ads.php?action=get_active');
export const getAdvertsApi = () => apiFetch('adverts.php');
export const getCourseDescriptionChecklistApi = (courseId: string) => apiFetch(`intended-learners.php?course_id=${encodeURIComponent(courseId)}`);
export const getCuratedListsApi = () => apiFetch('curated-lists.php');
export const getInstructorPayoutApi = (userId: string) => apiFetch(`instructor-payout.php?userId=${userId}&user_id=${userId}`);
export const getIntendedLearnersApi = (courseId: string) => apiFetch(`intended-learners.php?course_id=${courseId}`);
export const saveIntendedLearnersApi = (data: any) => apiFetch('intended-learners.php', { method: 'POST', body: JSON.stringify(data) });
export const getRemindersApi = (userId: string) => apiFetch(`reminders.php?userId=${userId}`);
export const getStudyPlanApi = (userId: string) => apiFetch(`study-planner.php?learner_id=${encodeURIComponent(userId)}&userId=${encodeURIComponent(userId)}`);
export const getTopAdvertsApi = (silent = false) => apiFetch(API_ENDPOINTS.TOP_ADVERTS, { silent });
export const getWishlistApi = (userId: string) => apiFetch(`wishlist.php?userId=${userId}`);
export const InstructorDetailsData = {};
export const localApiFetch = async (
  endpoint: string, 
  options: any = {}, 
  ...args: any[]
) => {
  const silent = options.silent ?? (typeof args[0] === 'number' ? !!args[0] : args[0]) ?? false;
  // Use endpoint directly as it is meant to be local/relative
  const url = endpoint;
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
        if (!silent) console.error(`API error: ${response.statusText} for ${url}`);
        throw new Error(`API error: ${response.statusText}`);
    }
    return await response.json();
  } catch (err) {
    if (!silent) console.error(`Fetch failed for ${url}:`, err);
    throw err;
  }
};
export const normalizeCourse = (c: any) => {
  if (!c) return c;
  
  // Clean price if it contains "JS:" or is a malformed string
  let price = 0;
  const rawPrice = c.price !== undefined ? String(c.price) : '0';
  if (rawPrice.includes('JS:')) {
    const parts = rawPrice.split('JS:');
    price = parseFloat(parts[0]) || parseFloat(parts[1]) || 0;
  } else {
    price = parseFloat(rawPrice) || 0;
  }

  // Clean original price
  let originalPrice = 0;
  const rawOrig = c.originalPrice !== undefined ? c.originalPrice : c.original_price;
  if (rawOrig !== undefined && rawOrig !== null) {
    const rawOrigStr = String(rawOrig);
    if (rawOrigStr.includes('JS:')) {
      const parts = rawOrigStr.split('JS:');
      originalPrice = parseFloat(parts[0]) || parseFloat(parts[1]) || 0;
    } else {
      originalPrice = parseFloat(rawOrigStr) || 0;
    }
  }

  return {
    ...c,
    id: String(c.id || ''),
    title: String(c.title || ''),
    subtitle: String(c.subtitle || ''),
    description: String(c.description || ''),
    instructor: String(c.instructor || c.instructorName || 'Instructor'),
    category: String(c.category || 'Development'),
    level: String(c.level || 'Beginner'),
    price,
    originalPrice,
    rating: typeof c.rating === 'number' ? c.rating : (parseFloat(c.rating) || 5.0),
    reviewCount: typeof c.reviewCount === 'number' ? c.reviewCount : (parseInt(c.reviewCount || c.review_count, 10) || 0),
    learnersEnrolled: typeof c.learnersEnrolled === 'number' ? c.learnersEnrolled : (parseInt(c.learnersEnrolled || c.learners_enrolled || c.students_enrolled, 10) || 0),
    image: String(c.image || c.thumbnail || ''),
    isPublished: c.isPublished !== undefined ? Boolean(c.isPublished) : (c.is_published ? String(c.is_published) === '1' || c.is_published === true : true),
    isApprovedByAdmin: c.isApprovedByAdmin !== undefined ? Boolean(c.isApprovedByAdmin) : (c.is_approved_by_admin ? String(c.is_approved_by_admin) === '1' || c.is_approved_by_admin === true : false),
    bestSeller: c.bestSeller !== undefined ? Boolean(c.bestSeller) : (c.best_seller ? String(c.best_seller) === '1' || c.best_seller === true : false),
    isPremium: c.isPremium !== undefined ? Boolean(c.isPremium) : (c.is_premium ? String(c.is_premium) === '1' || c.is_premium === true : false),
  };
};
export const recordSponsoredImpressionApi = (id: string) => apiFetch(`sponsored_ads.php?action=impression&id=${id}`, { method: 'POST' });
export const recordSponsoredClickApi = (id: string) => apiFetch(`sponsored_ads.php?action=click&id=${id}`, { method: 'POST' });
export const removeFromWishlistApi = (courseId: string) => apiFetch('wishlist.php', { method: 'POST', body: JSON.stringify({ action: 'remove', courseId }) });
export const saveAdvertApi = (data: any) => apiFetch('adverts.php', { method: 'POST', body: JSON.stringify(data) });
export const saveCourseDescriptionChecklistApi = (data: any) => apiFetch('intended-learners.php', { method: 'POST', body: JSON.stringify(data) });
export const saveCuratedListApi = (data: any) => apiFetch('curated-lists.php', { method: 'POST', body: JSON.stringify(data) });
export const saveInstructorOnboardingApi = (data: any) => apiFetch('instructor-onboarding.php', { method: 'POST', body: JSON.stringify(data) });
export const saveInstructorPayoutApi = (data: any) => apiFetch('instructor-payout.php', { method: 'POST', body: JSON.stringify(data) });
export const saveReminderApi = (data: any) => apiFetch('reminders.php', { method: 'POST', body: JSON.stringify(data) });
export const saveReviewerAssignmentsApi = (data: any) => apiFetch('reviewers.php', { method: 'POST', body: JSON.stringify({ action: 'save_assignments', ...data }) });
export const saveSignatureApi = (userId: string, signature: string) => apiFetch('signatures.php', { method: 'POST', body: JSON.stringify({ userId, signature }) });
export const saveStudyPlanApi = (data: any) => apiFetch('study-planner.php', { method: 'POST', body: JSON.stringify(data) });
export const sendStudyReminderEmailApi = (data: any) => apiFetch('reminders.php?action=send_email', { method: 'POST', body: JSON.stringify(data) });
export const syncCourseCategoriesApi = (data: any) => apiFetch(`${API_ENDPOINTS.CATEGORIES}?action=sync`, { method: 'POST', body: JSON.stringify(data) });
export const toggleAdvertActiveApi = (id: string | number, active: boolean) => apiFetch(`adverts.php?action=toggle&id=${id}`, { method: 'POST', body: JSON.stringify({ active }) });
export const updateActiveSession = (data: any) => { const current = getActiveSession(); localStorage.setItem('activeSession', JSON.stringify({ ...current, ...data })); };
export const updateRequestStatusApi = (id: string, status: string) => apiFetch(`requests.php?id=${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
export const uploadAdvertImageApi = (formData: FormData) => apiFetch('adverts.php?action=upload', { method: 'POST', body: formData });
export const uploadImageApi = (fileData: string, fileName?: string, folder: 'courses' | 'avatars' = 'courses') => apiFetch('upload.php', { method: 'POST', body: JSON.stringify({ fileData, fileName, folder }) });
export const uploadMediaApi = (fileData: string, fileName?: string) => apiFetch('upload.php', { method: 'POST', body: JSON.stringify({ fileData, fileName }) });
export const upsertLessonApi = (data: any) => apiFetch('course-modules.php', { method: 'POST', body: JSON.stringify(data) });
export const upsertModuleApi = (data: any) => apiFetch('course-modules.php', { method: 'POST', body: JSON.stringify(data) });
export const updateSectionTitleApi = (id: string, title: string) => apiFetch('course-modules.php?action=update_title', { method: 'POST', body: JSON.stringify({ id, title }) });
export const saveCourseCategoryApi = (data: any) => apiFetch(API_ENDPOINTS.CATEGORIES, { method: 'POST', body: JSON.stringify(data) });
export const deleteCourseCategoryApi = (id: string) => apiFetch(`${API_ENDPOINTS.CATEGORIES}?id=${id}`, { method: 'DELETE' });
export const deleteAdvertApi = (id: string | number) => apiFetch(`adverts.php?id=${id}`, { method: 'DELETE' });

// Payouts
export interface PayoutCountry { id: string; name: string; code: string; currencyCode: string; isActive: boolean; }
export interface PayoutBank { id: string; countryId: string; name: string; code: string; isActive: boolean; }
export const DEFAULT_PAYOUT_COUNTRIES: PayoutCountry[] = [];
export const DEFAULT_KENYA_COUNTRY: PayoutCountry = { id: 'pc-ke', name: 'Kenya', code: 'KE', currencyCode: 'KES', isActive: true };
export const DEFAULT_KENYA_BANKS: PayoutBank[] = [];
export const getDefaultKenyaPayoutBanks = () => DEFAULT_KENYA_BANKS;

export const fetchPayoutCountriesApi = () => apiFetch(API_ENDPOINTS.PAYOUT_COUNTRIES);
export const createPayoutCountryApi = (data: any) => apiFetch(API_ENDPOINTS.PAYOUT_COUNTRIES, { method: 'POST', body: JSON.stringify(data) });
export const updatePayoutCountryApi = (id: string, data: any) => apiFetch(`${API_ENDPOINTS.PAYOUT_COUNTRIES}?id=${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deletePayoutCountryApi = (id: string) => apiFetch(`${API_ENDPOINTS.PAYOUT_COUNTRIES}?id=${id}`, { method: 'DELETE' });
export const togglePayoutCountryActiveApi = (id: string, active: boolean) => apiFetch(`${API_ENDPOINTS.PAYOUT_COUNTRIES}?id=${id}`, { method: 'POST', body: JSON.stringify({ action: 'toggle', active }) });

export const fetchPayoutBanksApi = (countryId?: string) => apiFetch(countryId ? `${API_ENDPOINTS.PAYOUT_BANKS}?country_id=${countryId}` : API_ENDPOINTS.PAYOUT_BANKS);
export const createPayoutBankApi = (data: any) => apiFetch(API_ENDPOINTS.PAYOUT_BANKS, { method: 'POST', body: JSON.stringify(data) });
export const updatePayoutBankApi = (id: string, data: any) => apiFetch(`${API_ENDPOINTS.PAYOUT_BANKS}?id=${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deletePayoutBankApi = (id: string) => apiFetch(`${API_ENDPOINTS.PAYOUT_BANKS}?id=${id}`, { method: 'DELETE' });
export const togglePayoutBankActiveApi = (id: string, active: boolean) => apiFetch(`${API_ENDPOINTS.PAYOUT_BANKS}?id=${id}`, { method: 'POST', body: JSON.stringify({ action: 'toggle', active }) });

export const fetchLogoApi = () => apiFetch('logo.php');
export const getCourseDefaultThumbnailApi = () => apiFetch('logo.php');
export const updateLogoApi = (data: any) => apiFetch('logo.php', { method: 'POST', body: JSON.stringify(data) });
export const fetchVideoFoldersApi = () => apiFetch('video-folders.php');
export const createVideoFolderApi = (data: any) => apiFetch('video-folders.php', { method: 'POST', body: JSON.stringify(data) });
export const renameVideoFolderApi = (id: string, name: string) => apiFetch(`video-folders.php?id=${id}`, { method: 'PUT', body: JSON.stringify({ name }) });
export const deleteVideoFolderApi = (id: string) => apiFetch(`video-folders.php?id=${id}`, { method: 'DELETE' });
export const moveVideoToFolderApi = (videoId: string, folderId: string) => apiFetch('video-folders.php?action=move', { method: 'POST', body: JSON.stringify({ videoId, folderId }) });

// Top Adverts
export const saveTopAdvertApi = (data: any) => apiFetch(API_ENDPOINTS.TOP_ADVERTS, { method: 'POST', body: JSON.stringify(data) });
export const toggleTopAdvertActiveApi = (id: string | number, active: boolean) => apiFetch(`${API_ENDPOINTS.TOP_ADVERTS}?action=toggle&id=${id}`, { method: 'POST', body: JSON.stringify({ active }) });
export const deleteTopAdvertApi = (id: string | number) => apiFetch(`${API_ENDPOINTS.TOP_ADVERTS}?id=${id}`, { method: 'DELETE' });
export const uploadTopAdvertImageApi = (formData: FormData) => apiFetch(`${API_ENDPOINTS.TOP_ADVERTS}?action=upload`, { method: 'POST', body: formData });

// Sponsored Ads
export const getSponsoredAdsApi = () => apiFetch('sponsored_ads.php');
export const getSponsoredPlansApi = () => apiFetch('sponsored_ads.php?action=plans');
export const saveSponsoredPlansApi = (data: any) => apiFetch('sponsored_ads.php?action=save_plans', { method: 'POST', body: JSON.stringify(data) });
export const applySponsoredAdApi = (data: any) => apiFetch('sponsored_ads.php', { method: 'POST', body: JSON.stringify(data) });
export const updateSponsoredAdStatusApi = (id: string | number, status: string) => apiFetch(`sponsored_ads.php?action=status&id=${id}`, { method: 'POST', body: JSON.stringify({ status }) });
export const deleteSponsoredAdApi = (id: string | number) => apiFetch(`sponsored_ads.php?id=${id}`, { method: 'DELETE' });
export interface PromotionTierConfig {
  id: string;
  name: string;
  dailyRateUsd: number;
  description: string;
  ctaText: string;
  features: string[];
  isActive: boolean;
  badgeType: string;
}
export const DEFAULT_PROMOTION_TIERS: PromotionTierConfig[] = [];
export const getStoredPromotionTiers = () => [];
export const getPromotionTiersApi = (silent = false) => apiFetch('promotion-tiers.php', { silent });
export const savePromotionTiersApi = (data: any) => apiFetch('promotion-tiers.php', { method: 'POST', body: JSON.stringify(data) });
export const resetPromotionTiersApi = () => apiFetch('promotion-tiers.php?action=reset', { method: 'POST' });

export interface EnrollmentProofPricingConfig {
    id: string;
    studentStepUnit: number;
    pricePerUnitUsd: number;
    defaultRating: number;
    maxStudents: number;
}
export const getStoredEnrollmentPricing = () => ({ id: 'default', studentStepUnit: 100, pricePerUnitUsd: 0.15, defaultRating: 4.9, maxStudents: 10000 });
export const calculateEnrollmentBoostPrice = (count: number, pricing: any) => {
  return count * (pricing?.pricePerUnitUsd || 0.15);
};
export const getEnrollmentPricingApi = () => apiFetch('enrollment-pricing.php');
export const saveEnrollmentPricingApi = (data: any) => apiFetch('enrollment-pricing.php', { method: 'POST', body: JSON.stringify(data) });
export const getCustomMailPricingApi = () => apiFetch('custom-mail.php?action=pricing');
export const saveCustomMailPricingApi = (data: any) => apiFetch('custom-mail.php?action=save_pricing', { method: 'POST', body: JSON.stringify(data) });
export const getAllCustomMailSubscriptionsApi = () => apiFetch('custom-mail.php?action=subscriptions');
export const getInstructorCustomMailStatusApi = (instructorId: string) => apiFetch(`custom-mail.php?action=status&instructor_id=${instructorId}`);
export const subscribeCustomMailApi = (data: any) => apiFetch('custom-mail.php?action=subscribe', { method: 'POST', body: JSON.stringify(data) });
export const getCustomMailTemplateApi = (templateId: string) => apiFetch(`custom-mail.php?action=get_template&template_id=${templateId}`);
export const saveCustomMailTemplateApi = (data: any) => apiFetch('custom-mail.php?action=save_template', { method: 'POST', body: JSON.stringify(data) });

// ... other exports ...
