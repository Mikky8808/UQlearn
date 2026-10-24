import { logApiError, getRecentApiErrorLogs } from './errorLogger';

export { logApiError, getRecentApiErrorLogs };

import { API_BASE_URL, ROOT_URL, GOOGLE_CLIENT_ID } from './apiConstants';
export { API_BASE_URL, ROOT_URL, GOOGLE_CLIENT_ID };

export const API_ENDPOINTS = {
  COURSES: 'courses.php',
  COURSE_DETAIL: (id: string) => `courses.php?id=${id}`,
  COURSE_MODULES: 'course-modules.php',
  LOGIN: 'login.php',
  REGISTER: 'register.php',
  SEND_LOGIN_OTP: 'send-otp.php',
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
  SPONSORED_ADS: 'sponsored_ads.php',
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
  PAYSTACK: 'paystack.php',
  RECENTLY_VIEWED: 'recently-viewed.php',
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
      if (
        (cleanEndpoint.includes('intended-learners.php') || cleanEndpoint.includes('study-planner.php')) &&
        (response.status === 400 || response.status === 404)
      ) {
        return { success: false, data: null, items: [] };
      }

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
export const addToWishlistApi = async (uidOrCourseId: string, maybeCourseId?: string, ...args: any[]) => {
  const userId = maybeCourseId ? uidOrCourseId : 'guest';
  const courseId = maybeCourseId || uidOrCourseId;
  try {
    const key = `uqlearn_wishlist_${userId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const list = Array.isArray(existing) ? existing : [];
    if (courseId && !list.includes(courseId)) {
      list.push(courseId);
      localStorage.setItem(key, JSON.stringify(list));
    }
  } catch {}
  return apiFetch('wishlist.php', {
    method: 'POST',
    body: JSON.stringify({ action: 'add', userId, user_id: userId, courseId, course_id: courseId }),
    silent: true
  }).catch(() => ({ success: true }));
};
export const assignCourseToReviewerApi = (...args: any[]) => apiFetch(API_ENDPOINTS.REVIEWER_ASSIGNMENTS, { method: 'POST', body: JSON.stringify({ action: 'assign_reviewer', courseId: args[0], course_id: args[0], reviewerId: args[1], reviewer_id: args[1] }) });
export const checkInstructorOnboardingApi = (userId: string, ...args: any[]) => apiFetch(`instructor-onboarding.php?userId=${encodeURIComponent(userId)}`);
export const createRequestApi = (data: any, ...args: any[]) => apiFetch('requests.php', { method: 'POST', body: JSON.stringify(data) });
export const DEFAULT_VIDEO_THUMBNAIL = '';
export const deleteCourseApi = (courseIdOrData: string | any, ...args: any[]) => {
  const courseId = typeof courseIdOrData === 'string' ? courseIdOrData : courseIdOrData?.id;
  const body = typeof courseIdOrData === 'object' ? JSON.stringify(courseIdOrData) : undefined;
  return apiFetch(courseId ? `courses.php?id=${courseId}` : 'courses.php', body ? { method: 'DELETE', body } : { method: 'DELETE' });
};
export const deleteCuratedListApi = (uidOrId: string, maybeListId?: string, ...args: any[]) => {
  const listId = maybeListId || uidOrId;
  const userId = maybeListId ? uidOrId : 'guest';
  try {
    const key = `uqlearn_curated_lists_${userId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    if (Array.isArray(existing)) {
      localStorage.setItem(key, JSON.stringify(existing.filter((l: any) => l?.id !== listId)));
    }
  } catch {}
  return apiFetch(`curated-lists.php?id=${encodeURIComponent(listId)}&userId=${encodeURIComponent(userId)}&user_id=${encodeURIComponent(userId)}`, { method: 'DELETE', silent: true }).catch(() => ({ success: true }));
};
export const deleteModuleOrLessonApi = (id: string, ...args: any[]) => apiFetch(`course-modules.php?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
export const deleteUserApi = (id: string, ...args: any[]) => apiFetch(`users.php?id=${id}`, { method: 'DELETE' });
export const fetchCourseCategoriesApi = (...args: any[]) => apiFetch(API_ENDPOINTS.CATEGORIES);
export const fetchCourseModulesApi = async (courseId: string, ...args: any[]): Promise<any[]> => {
  try {
    const res = await apiFetch(`course-modules.php?courseId=${encodeURIComponent(courseId)}&course_id=${encodeURIComponent(courseId)}`);
    const rawList = Array.isArray(res)
      ? res
      : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.modules)
          ? res.modules
          : [];
    return rawList.map((m: any) => ({
      ...m,
      lessons: Array.isArray(m?.lessons) ? m.lessons : []
    }));
  } catch {
    return [];
  }
};
export const fetchCoursesApi = async (creatorId?: string, ...args: any[]): Promise<any[]> => {
  const res = await apiFetch(creatorId ? `courses.php?creatorId=${encodeURIComponent(creatorId)}&creator_id=${encodeURIComponent(creatorId)}` : 'courses.php');
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.data)) return res.data;
  if (res && Array.isArray(res.courses)) return res.courses;
  return [];
};
export const fetchInstructorDetailsApi = (userId: string, ...args: any[]) => apiFetch(`profile.php?id=${encodeURIComponent(userId)}&userId=${encodeURIComponent(userId)}&user_id=${encodeURIComponent(userId)}`);
export const fetchRequestsApi = (...args: any[]) => apiFetch('requests.php');
export const getCourseMessagesApi = (courseId: string, ...args: any[]) => apiFetch(`course-messages.php?courseId=${encodeURIComponent(courseId)}&course_id=${encodeURIComponent(courseId)}`);
export const saveCourseMessagesApi = (data: any, ...args: any[]) => apiFetch('course-messages.php', { method: 'POST', body: JSON.stringify(data) });
export const fetchSignatureApi = (...args: any[]) => apiFetch(args[0] ? `signatures.php?userId=${encodeURIComponent(args[0])}&user_id=${encodeURIComponent(args[0])}` : 'signatures.php');
export const getActiveSession = () => { try { return JSON.parse(localStorage.getItem('activeSession') || '{}'); } catch { return {}; } };
export const getActiveSponsoredCoursesApi = (...args: any[]) => apiFetch('sponsored_ads.php?action=get_active');
export const getAdvertsApi = (slot?: string, activeOnly?: boolean, ...args: any[]) => {
  const params = new URLSearchParams();
  if (slot) params.set('slot', slot);
  if (activeOnly !== undefined) params.set('active', activeOnly ? '1' : '0');
  const qs = params.toString();
  return apiFetch(qs ? `adverts.php?${qs}` : 'adverts.php');
};
export const getCourseDescriptionChecklistApi = (courseId: string, ...args: any[]) => apiFetch(`intended-learners.php?courseId=${encodeURIComponent(courseId)}&course_id=${encodeURIComponent(courseId)}`);
export const getCuratedListsApi = async (userId?: string, ...args: any[]): Promise<any[]> => {
  const uid = userId || 'guest';
  try {
    const res = await apiFetch(`curated-lists.php?userId=${encodeURIComponent(uid)}&user_id=${encodeURIComponent(uid)}`, { silent: true });
    const raw = Array.isArray(res)
      ? res
      : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.lists)
          ? res.lists
          : null;
    if (raw) {
      try {
        localStorage.setItem(`uqlearn_curated_lists_${uid}`, JSON.stringify(raw));
      } catch {}
      return raw;
    }
  } catch {}
  try {
    const cached = JSON.parse(localStorage.getItem(`uqlearn_curated_lists_${uid}`) || '[]');
    return Array.isArray(cached) ? cached : [];
  } catch {
    return [];
  }
};
export const getInstructorPayoutApi = (...args: any[]) => apiFetch(args[0] ? `instructor-payout.php?userId=${encodeURIComponent(args[0])}&user_id=${encodeURIComponent(args[0])}` : 'instructor-payout.php');
export const getIntendedLearnersApi = (courseId: string, ...args: any[]) => apiFetch(`intended-learners.php?courseId=${encodeURIComponent(courseId)}&course_id=${encodeURIComponent(courseId)}`);
export const saveIntendedLearnersApi = (data: any, ...args: any[]) => apiFetch('intended-learners.php', { method: 'POST', body: JSON.stringify(data) });
export const getRemindersApi = (...args: any[]) => apiFetch(args[0] ? `reminders.php?userId=${encodeURIComponent(args[0])}&user_id=${encodeURIComponent(args[0])}` : 'reminders.php');
export const getStudyPlanApi = (userId: string, ...args: any[]) => apiFetch(`study-planner.php?learnerId=${encodeURIComponent(userId)}&learner_id=${encodeURIComponent(userId)}&userId=${encodeURIComponent(userId)}&user_id=${encodeURIComponent(userId)}`);
export const getTopAdvertsApi = (silent = false, ...args: any[]) => apiFetch(API_ENDPOINTS.TOP_ADVERTS, { silent });
export const getWishlistApi = async (userId?: string, ...args: any[]): Promise<string[]> => {
  const uid = userId || 'guest';
  try {
    const res = await apiFetch(uid ? `wishlist.php?userId=${encodeURIComponent(uid)}&user_id=${encodeURIComponent(uid)}` : 'wishlist.php', { silent: true });
    const raw = Array.isArray(res)
      ? res
      : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.wishlist)
          ? res.wishlist
          : Array.isArray(res?.courseIds)
            ? res.courseIds
            : Array.isArray(res?.items)
              ? res.items
              : null;
    if (raw) {
      const normalized = raw
        .map((item: any) => (typeof item === 'string' ? item : String(item?.courseId || item?.course_id || item?.id || '')))
        .filter(Boolean);
      try {
        localStorage.setItem(`uqlearn_wishlist_${uid}`, JSON.stringify(normalized));
      } catch {}
      return normalized;
    }
  } catch {}
  try {
    const cached = JSON.parse(localStorage.getItem(`uqlearn_wishlist_${uid}`) || '[]');
    return Array.isArray(cached) ? cached.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
};
export type InstructorDetailsData = any;
export const localApiFetch = async (
  endpoint: string, 
  options: any = {}, 
  ...args: any[]
) => {
  const silent = options.silent ?? (typeof args[0] === 'number' ? !!args[0] : args[0]) ?? true;
  const url = endpoint;
  try {
    const fetchOptions: RequestInit = {
      ...options,
      headers: {
        Accept: 'application/json, text/plain, */*',
        ...(options.body && typeof options.body === 'string' && !options.headers?.['Content-Type']
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...options.headers,
      },
    };
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      if (!silent) console.warn(`Local API notice: ${response.statusText} (${response.status}) for ${url}`);
      return { success: false, status: response.status, message: response.statusText || 'Request failed' };
    }
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await response.json();
    }
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return { success: response.ok, rawText: text };
    }
  } catch (err: any) {
    if (!silent) console.warn(`Local API request notice for ${url}:`, err);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      message: err instanceof Error ? err.message : String(err)
    };
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

  let parsedModules: any[] = [];
  if (Array.isArray(c.modules)) {
    parsedModules = c.modules;
  } else if (typeof c.modules === 'string' && c.modules.trim().startsWith('[')) {
    try {
      const m = JSON.parse(c.modules);
      if (Array.isArray(m)) parsedModules = m;
    } catch {}
  }
  const normalizedModules = parsedModules.map((m: any) => ({
    ...m,
    lessons: Array.isArray(m?.lessons) ? m.lessons : []
  }));

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
    modules: normalizedModules,
  };
};
export const recordSponsoredImpressionApi = (id: string) => apiFetch(`sponsored_ads.php?action=impression&id=${id}`, { method: 'POST' });
export const recordSponsoredClickApi = (id: string) => apiFetch(`sponsored_ads.php?action=click&id=${id}`, { method: 'POST' });
export const removeFromWishlistApi = async (uidOrCourseId: string, maybeCourseId?: string, ...args: any[]) => {
  const userId = maybeCourseId ? uidOrCourseId : 'guest';
  const courseId = maybeCourseId || uidOrCourseId;
  try {
    const key = `uqlearn_wishlist_${userId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    if (Array.isArray(existing)) {
      localStorage.setItem(key, JSON.stringify(existing.filter((id: string) => id !== courseId)));
    }
  } catch {}
  return apiFetch('wishlist.php', {
    method: 'POST',
    body: JSON.stringify({ action: 'remove', userId, user_id: userId, courseId, course_id: courseId }),
    silent: true
  }).catch(() => ({ success: true }));
};
export const saveAdvertApi = (data: any) => apiFetch('adverts.php', { method: 'POST', body: JSON.stringify(data) });
export const saveCourseDescriptionChecklistApi = (...args: any[]) => apiFetch('intended-learners.php', { method: 'POST', body: JSON.stringify(args.length > 1 ? { courseId: args[0], data: args[1] } : args[0]) });
export const saveCuratedListApi = async (...args: any[]) => {
  const userId = args.length > 1 ? String(args[0] || 'guest') : 'guest';
  const listObj = args.length > 1 ? args[1] : args[0];
  try {
    const key = `uqlearn_curated_lists_${userId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const lists = Array.isArray(existing) ? existing : [];
    if (listObj && listObj.id) {
      const updated = [listObj, ...lists.filter((l: any) => l?.id !== listObj.id)];
      localStorage.setItem(key, JSON.stringify(updated));
    }
  } catch {}
  return apiFetch('curated-lists.php', {
    method: 'POST',
    body: JSON.stringify(args.length > 1 ? { userId: args[0], user_id: args[0], list: args[1] } : args[0]),
    silent: true
  }).catch(() => ({ success: true }));
};
export const saveInstructorOnboardingApi = (data: any) => apiFetch('instructor-onboarding.php', { method: 'POST', body: JSON.stringify(data) });
export const saveInstructorPayoutApi = (data: any) => apiFetch('instructor-payout.php', { method: 'POST', body: JSON.stringify(data) });
export const saveReminderApi = (data: any, ...args: any[]) => apiFetch('reminders.php', { method: 'POST', body: JSON.stringify(data) });
export const saveReviewerAssignmentsApi = (...args: any[]) => apiFetch('reviewers.php', { method: 'POST', body: JSON.stringify({ action: 'save_assignments', courseId: args[0], reviewers: args[1], data: args[0] && typeof args[0] === 'object' ? args[0] : args[1] }) });
export const saveSignatureApi = (...args: any[]) => apiFetch('signatures.php', { method: 'POST', body: JSON.stringify({ userId: args[0], signature: args[1], data: args[0] && typeof args[0] === 'object' ? args[0] : undefined }) });
export const saveStudyPlanApi = (data: any) => apiFetch('study-planner.php', { method: 'POST', body: JSON.stringify(data) });
export const sendStudyReminderEmailApi = (data: any) => apiFetch('reminders.php?action=send_email', { method: 'POST', body: JSON.stringify(data) });
export const syncCourseCategoriesApi = (...args: any[]) => apiFetch(`${API_ENDPOINTS.CATEGORIES}?action=sync`, { method: 'POST', body: JSON.stringify(args[0] || {}) });
export const toggleAdvertActiveApi = (id: string | number, active: boolean, ...args: any[]) => apiFetch('adverts.php', { method: 'POST', body: JSON.stringify({ action: 'toggle_active', id, isActive: active, is_active: active ? 1 : 0 }) });
export const updateActiveSession = (data: any) => { const current = getActiveSession(); localStorage.setItem('activeSession', JSON.stringify({ ...current, ...data })); };
export const updateRequestStatusApi = (id: string, status: string, ...args: any[]) => apiFetch(`requests.php?id=${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
export const uploadAdvertImageApi = (formData: FormData) => apiFetch('adverts.php?action=upload', { method: 'POST', body: formData });
export const uploadImageApi = (fileData: any, ...args: any[]) => apiFetch('upload.php', { method: 'POST', body: JSON.stringify({ fileData: typeof fileData === 'string' ? fileData : '', fileName: args[0], folder: args[1] || 'courses' }) });
export const uploadMediaApi = (fileData: any, ...args: any[]) => apiFetch('upload.php', { method: 'POST', body: JSON.stringify({ fileData: typeof fileData === 'string' ? fileData : '', fileName: args[0], folder: args[1] }) });
export const upsertLessonApi = (data: any) => apiFetch('course-modules.php', { method: 'POST', body: JSON.stringify(data) });
export const upsertModuleApi = (data: any) => apiFetch('course-modules.php', { method: 'POST', body: JSON.stringify(data) });
export const updateSectionTitleApi = (...args: any[]) => apiFetch('course-modules.php?action=update_title', { method: 'POST', body: JSON.stringify(typeof args[0] === 'object' ? args[0] : { id: args[0], title: args[1] }) });
export const saveCourseCategoryApi = (data: any) => apiFetch(API_ENDPOINTS.CATEGORIES, { method: 'POST', body: JSON.stringify(data) });
export const deleteCourseCategoryApi = (id: string, ...args: any[]) => apiFetch(`${API_ENDPOINTS.CATEGORIES}?id=${id}`, { method: 'DELETE' });
export const deleteAdvertApi = (id: string | number, ...args: any[]) => apiFetch(`adverts.php?id=${id}`, { method: 'DELETE' });

// Payouts
export interface PayoutCountry { 
  id: string; 
  name: string; 
  code: string; 
  currencyCode: string; 
  currencySymbol?: string;
  payoutMethods?: string[];
  minPayout?: number;
  processingTime?: string;
  notes?: string;
  isActive: boolean; 
  createdAt?: string;
  updatedAt?: string;
}
export interface PayoutBank { 
  id: string; 
  countryId: string; 
  countryName?: string;
  name: string; 
  code: string; 
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}
export const DEFAULT_PAYOUT_COUNTRIES: PayoutCountry[] = [];
export const DEFAULT_KENYA_COUNTRY: PayoutCountry = { id: 'pc-ke', name: 'Kenya', code: 'KE', currencyCode: 'KES', isActive: true };
export const DEFAULT_KENYA_BANKS: PayoutBank[] = [];
export const getDefaultKenyaPayoutBanks = () => DEFAULT_KENYA_BANKS;

export const fetchPayoutCountriesApi = () => apiFetch(API_ENDPOINTS.PAYOUT_COUNTRIES);
export const createPayoutCountryApi = (data: any) => apiFetch(API_ENDPOINTS.PAYOUT_COUNTRIES, { method: 'POST', body: JSON.stringify(data) });
export const updatePayoutCountryApi = (id: string, data: any, ...args: any[]) => apiFetch(`${API_ENDPOINTS.PAYOUT_COUNTRIES}?id=${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deletePayoutCountryApi = (id: string) => apiFetch(`${API_ENDPOINTS.PAYOUT_COUNTRIES}?id=${id}`, { method: 'DELETE' });
export const togglePayoutCountryActiveApi = (id: string, active: boolean) => apiFetch(`${API_ENDPOINTS.PAYOUT_COUNTRIES}?id=${id}`, { method: 'POST', body: JSON.stringify({ action: 'toggle', active }) });

export const fetchPayoutBanksApi = (countryId?: string, ...args: any[]) => apiFetch(countryId ? `${API_ENDPOINTS.PAYOUT_BANKS}?country_id=${countryId}` : API_ENDPOINTS.PAYOUT_BANKS);
export const createPayoutBankApi = (data: any) => apiFetch(API_ENDPOINTS.PAYOUT_BANKS, { method: 'POST', body: JSON.stringify(data) });
export const updatePayoutBankApi = (id: string, data: any) => apiFetch(`${API_ENDPOINTS.PAYOUT_BANKS}?id=${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deletePayoutBankApi = (id: string) => apiFetch(`${API_ENDPOINTS.PAYOUT_BANKS}?id=${id}`, { method: 'DELETE' });
export const togglePayoutBankActiveApi = (id: string, active: boolean, ...args: any[]) => apiFetch(`${API_ENDPOINTS.PAYOUT_BANKS}?id=${id}`, { method: 'POST', body: JSON.stringify({ action: 'toggle', active }) });

export interface VideoFolder {
  id: string;
  userId?: string;
  courseId?: string | null;
  name: string;
  color?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const fetchLogoApi = () => apiFetch('logo.php');
export const getCourseDefaultThumbnailApi = () => apiFetch('logo.php');
export const saveCourseDefaultThumbnailApi = (data: any, ...args: any[]) => updateLogoApi(data);
export const updateLogoApi = (data: any) => apiFetch('logo.php', { method: 'POST', body: JSON.stringify(data) });
export const fetchVideoFoldersApi = (userId?: string, courseId?: string, ...args: any[]) => apiFetch(userId ? `video-folders.php?user_id=${encodeURIComponent(userId)}${courseId ? `&course_id=${encodeURIComponent(courseId)}` : ''}` : 'video-folders.php');
export const createVideoFolderApi = (name: string, color?: string, userId?: string, courseId?: string, ...args: any[]) => apiFetch('video-folders.php', { method: 'POST', body: JSON.stringify({ name, color, user_id: userId, course_id: courseId }) });
export const renameVideoFolderApi = (id: string, name: string, ...args: any[]) => apiFetch(`video-folders.php?id=${id}`, { method: 'PUT', body: JSON.stringify({ name }) });
export const deleteVideoFolderApi = (id: string, ...args: any[]) => apiFetch(`video-folders.php?id=${id}`, { method: 'DELETE' });
export const moveVideoToFolderApi = (videoId: string, targetFolderName: string, targetFolderId?: string | null, ...args: any[]) => apiFetch('video-folders.php?action=move', { method: 'POST', body: JSON.stringify({ videoId, folder: targetFolderName, folderId: targetFolderId }) });

// Top Adverts
export const saveTopAdvertApi = (data: any) => apiFetch(API_ENDPOINTS.TOP_ADVERTS, { method: 'POST', body: JSON.stringify(data) });
export const toggleTopAdvertActiveApi = (id: string | number, active: boolean) => apiFetch(`${API_ENDPOINTS.TOP_ADVERTS}?action=toggle&id=${id}`, { method: 'POST', body: JSON.stringify({ active }) });
export const deleteTopAdvertApi = (id: string | number) => apiFetch(`${API_ENDPOINTS.TOP_ADVERTS}?id=${id}`, { method: 'DELETE' });
export const uploadTopAdvertImageApi = (formData: FormData) => apiFetch(`${API_ENDPOINTS.TOP_ADVERTS}?action=upload`, { method: 'POST', body: formData });

// Sponsored Ads
export const getSponsoredAdsApi = (...args: any[]) => apiFetch('sponsored_ads.php');
export const getSponsoredPlansApi = (...args: any[]) => apiFetch('sponsored_ads.php?action=plans');
export const saveSponsoredPlansApi = (data: any) => apiFetch('sponsored_ads.php?action=save_plans', { method: 'POST', body: JSON.stringify(data) });
export const applySponsoredAdApi = (data: any) => apiFetch('sponsored_ads.php', { method: 'POST', body: JSON.stringify(data) });
export const updateSponsoredAdStatusApi = (id: string | number, status: string, ...args: any[]) => apiFetch(`sponsored_ads.php?action=status&id=${id}`, { method: 'POST', body: JSON.stringify({ status }) });
export const deleteSponsoredAdApi = (id: string | number, ...args: any[]) => apiFetch(`sponsored_ads.php?id=${id}`, { method: 'DELETE' });
export interface PromotionTierConfig {
  id: string;
  name: string;
  dailyRateUsd: number;
  description: string;
  ctaText: string;
  features: string[];
  isActive: boolean;
  badgeType: string;
  badgeLabel?: string;
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
    minStudents?: number;
}
export const getStoredEnrollmentPricing = () => ({ id: 'default', studentStepUnit: 100, pricePerUnitUsd: 0.15, defaultRating: 4.9, maxStudents: 10000 });
export const calculateEnrollmentBoostPrice = (count: number, pricing: any) => {
  const totalUsd = count * (pricing?.pricePerUnitUsd || 0.15);
  return {
    totalUsd,
    formulaText: `${count} students × $${pricing?.pricePerUnitUsd || 0.15} = $${totalUsd.toFixed(2)}`
  };
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
// Flash Sale & Top Selling API Helpers
export const fetchFlashSaleConfigApi = async () => {
  try {
    const res = await apiFetch('flash-sale.php', { silent: true });
    if (res && (res.success || res.config || res.data)) {
      return res.config || res.data || res;
    }
  } catch {}
  return null;
};

export const saveFlashSaleConfigApi = (data: any) => apiFetch('flash-sale.php', { method: 'POST', body: JSON.stringify(data) });

// Recently Viewed Courses API Helpers
export const fetchRecentlyViewedApi = async (userId?: string): Promise<string[]> => {
  const uid = userId || 'guest';
  try {
    const res = await apiFetch(`${API_ENDPOINTS.RECENTLY_VIEWED}?userId=${encodeURIComponent(uid)}&user_id=${encodeURIComponent(uid)}`, { silent: true });
    const raw = Array.isArray(res)
      ? res
      : Array.isArray(res?.items)
        ? res.items
        : Array.isArray(res?.data)
          ? res.data.map((d: any) => typeof d === 'string' ? d : d?.course_id || d?.courseId || d?.id)
          : null;
    if (raw) {
      const normalized = raw
        .map((item: any) => (typeof item === 'string' ? item : String(item?.course_id || item?.courseId || item?.id || '')))
        .filter(Boolean);
      try {
        localStorage.setItem(`uqlearn_recently_viewed_${uid}`, JSON.stringify(normalized));
      } catch {}
      return normalized;
    }
  } catch {}
  try {
    const cached = JSON.parse(localStorage.getItem(`uqlearn_recently_viewed_${uid}`) || '[]');
    return Array.isArray(cached) ? cached.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
};

export const recordRecentlyViewedApi = async (courseId: string, userId?: string): Promise<any> => {
  if (!courseId) return { success: false };
  const uid = userId || 'guest';

  // Optimistically and synchronously update local storage
  try {
    const key = `uqlearn_recently_viewed_${uid}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const list = Array.isArray(existing) ? existing.map(String).filter(Boolean) : [];
    const updated = [courseId, ...list.filter((id: string) => id !== courseId)].slice(0, 20);
    localStorage.setItem(key, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('uq:recently-viewed-updated', { detail: { courseId, userId: uid } }));
    }
  } catch {}

  return apiFetch(API_ENDPOINTS.RECENTLY_VIEWED, {
    method: 'POST',
    body: JSON.stringify({ action: 'record', userId: uid, user_id: uid, courseId, course_id: courseId }),
    silent: true
  }).catch(() => ({ success: true }));
};

export const clearRecentlyViewedApi = async (userId?: string): Promise<any> => {
  const uid = userId || 'guest';
  try {
    localStorage.removeItem(`uqlearn_recently_viewed_${uid}`);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('uq:recently-viewed-updated', { detail: { userId: uid } }));
    }
  } catch {}
  return apiFetch(API_ENDPOINTS.RECENTLY_VIEWED, {
    method: 'POST',
    body: JSON.stringify({ action: 'clear', userId: uid, user_id: uid }),
    silent: true
  }).catch(() => ({ success: true }));
};

