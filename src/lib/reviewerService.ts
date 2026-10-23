import { apiFetch, API_ENDPOINTS } from './apiConfig';

export interface ReviewerAccount {
  id: string;
  name: string;
  email: string;
  title?: string;
  specialization?: string;
  categories?: string[];
  phone?: string;
  status: 'approved' | 'suspended' | 'pending';
  addedAt: string;
  addedBy?: string;
  avatar?: string;
  lastLoginAt?: string;

  // Advanced fields based on the checklist
  role: 'reviewer' | 'senior_reviewer' | 'category_lead' | 'admin';
  permissions?: string[];
  scope?: { categories?: string[]; course_ids?: string[] };
  email_verified: boolean;
  uq_affiliation: 'staff' | 'hdr' | 'alumni' | 'external' | 'unknown';
  credential_url?: string;
  bio?: string;
  timezone?: string;
  access_expires_at?: string;
  status_reason?: string;
  status_changed_by?: string;
  status_changed_at?: string;
  consent_accepted_at?: string;
  guidelines_version?: string;
  reviews_submitted?: number;
  reviews_published?: number;
  last_review_at?: string;
  login_count?: number;
  updatedAt?: string;
  updatedBy?: string;
  deletedAt?: string;
  source?: 'invite' | 'application' | 'import';
  notes?: string;
}

const DEFAULT_REVIEWERS: ReviewerAccount[] = [];

const STORAGE_KEY = 'uqlearn_reviewers';

/**
 * Helper to ensure a reviewer object has all properties loaded correctly
 */
function normalizeReviewer(r: any): ReviewerAccount {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    title: r.title || 'Course Quality Evaluator',
    specialization: r.specialization || 'All Categories',
    categories: Array.isArray(r.categories) 
      ? r.categories 
      : (r.categories ? (typeof r.categories === 'string' ? JSON.parse(r.categories) : r.categories) : ['All Categories']),
    phone: r.phone || '',
    status: r.status || 'approved',
    addedAt: r.added_at || r.addedAt || new Date().toISOString(),
    addedBy: r.added_by || r.addedBy || 'Admin Console',
    avatar: r.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    lastLoginAt: r.last_login_at || r.lastLoginAt,
    
    role: r.role || 'reviewer',
    permissions: Array.isArray(r.permissions)
      ? r.permissions
      : (r.permissions ? (typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions) : ['publish', 'approve']),
    scope: typeof r.scope === 'object' && r.scope !== null
      ? r.scope
      : (r.scope ? (typeof r.scope === 'string' ? JSON.parse(r.scope) : r.scope) : { categories: [] }),
    email_verified: r.email_verified === true || r.email_verified === 1 || r.emailVerified === true,
    uq_affiliation: r.uq_affiliation || r.uqAffiliation || 'unknown',
    credential_url: r.credential_url || r.credentialUrl || '',
    bio: r.bio || '',
    timezone: r.timezone || 'Africa/Nairobi',
    access_expires_at: r.access_expires_at || r.accessExpiresAt,
    status_reason: r.status_reason || r.statusReason || '',
    status_changed_by: r.status_changed_by || r.statusChangedBy || '',
    status_changed_at: r.status_changed_at || r.statusChangedAt || '',
    consent_accepted_at: r.consent_accepted_at || r.consentAcceptedAt || '',
    guidelines_version: r.guidelines_version || r.guidelinesVersion || '',
    reviews_submitted: typeof r.reviews_submitted === 'number' ? r.reviews_submitted : (r.reviewsSubmitted || 0),
    reviews_published: typeof r.reviews_published === 'number' ? r.reviews_published : (r.reviewsPublished || 0),
    last_review_at: r.last_review_at || r.lastReviewAt,
    login_count: typeof r.login_count === 'number' ? r.login_count : (r.loginCount || 0),
    updatedAt: r.updated_at || r.updatedAt,
    updatedBy: r.updated_by || r.updatedBy || '',
    deletedAt: r.deleted_at || r.deletedAt,
    source: r.source || 'invite',
    notes: r.notes || ''
  };
}

/**
 * Get all reviewer accounts from localStorage / memory
 */
export function getReviewers(): ReviewerAccount[] {
  if (typeof localStorage === 'undefined') return DEFAULT_REVIEWERS;
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // Cleanse old pre-seeded reviewers so the user starts with an empty slate immediately
        const cleansed = parsed
          .filter(r => r.id !== 'rev-002' && r.id !== 'rev-003')
          .map(normalizeReviewer);
        return cleansed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse cached reviewers:', e);
  }

  return DEFAULT_REVIEWERS;
}

/**
 * Async fetch reviewers from remote reviewers.php table with local cache fallback
 */
export async function fetchReviewersFromApi(): Promise<ReviewerAccount[]> {
  try {
    const res = await apiFetch(`${API_ENDPOINTS.REVIEWERS}`, { silent: true }, 1);
    if (res && res.success && Array.isArray(res.data)) {
      const formatted = res.data.map(normalizeReviewer);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formatted));
      return formatted;
    }
  } catch (e) {
    console.warn('Remote reviewers fetch fallback note:', e);
  }
  return getReviewers();
}

/**
 * Save updated reviewers list to local cache
 */
export function saveReviewers(reviewers: ReviewerAccount[]): void {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reviewers));
    } catch (e) {}
  }
}

/**
 * Add a new course reviewer from Admin to PHP API & local cache
 */
export async function addReviewer(data: Omit<ReviewerAccount, 'id' | 'addedAt'>): Promise<ReviewerAccount> {
  const current = getReviewers();
  const cleanEmail = data.email.trim().toLowerCase();

  const newReviewer: ReviewerAccount = {
    ...data,
    id: `rev-${Date.now()}`,
    email: cleanEmail,
    addedAt: new Date().toISOString(),
    status: data.status || 'approved'
  };

  const updated = [newReviewer, ...current.filter(r => r.email.toLowerCase() !== cleanEmail)];
  saveReviewers(updated);

  // Sync with remote PHP reviewers table
  try {
    const res = await apiFetch(`${API_ENDPOINTS.REVIEWERS}`, {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        email: cleanEmail,
        title: data.title,
        specialization: data.specialization,
        categories: data.categories,
        phone: data.phone,
        status: data.status,
        addedBy: data.addedBy || 'Admin Console',
        avatar: data.avatar,
        
        role: data.role,
        permissions: data.permissions,
        uq_affiliation: data.uq_affiliation,
        credential_url: data.credential_url,
        bio: data.bio,
        timezone: data.timezone,
        access_expires_at: data.access_expires_at,
        status_reason: data.status_reason,
        status_changed_by: data.status_changed_by,
        consent_accepted_at: data.consent_accepted_at,
        guidelines_version: data.guidelines_version,
        reviews_submitted: data.reviews_submitted,
        reviews_published: data.reviews_published,
        last_review_at: data.last_review_at,
        login_count: data.login_count,
        notes: data.notes,
        source: data.source || 'invite'
      }),
      silent: true
    });
    if (res && res.success && res.id) {
      newReviewer.id = res.id;
    }
  } catch (e) {
    console.warn('Failed to sync new reviewer to remote DB:', e);
  }

  return newReviewer;
}

/**
 * Update a reviewer's approval / suspension status
 */
export async function updateReviewerStatus(
  id: string, 
  status: 'approved' | 'suspended' | 'pending',
  statusReason?: string,
  statusChangedBy?: string
): Promise<ReviewerAccount | null> {
  const current = getReviewers();
  let updatedRecord: ReviewerAccount | null = null;
  const nowStr = new Date().toISOString();

  const updated = current.map(r => {
    if (r.id === id) {
      updatedRecord = { 
        ...r, 
        status,
        status_reason: statusReason || r.status_reason,
        status_changed_by: statusChangedBy || 'Admin Console',
        status_changed_at: nowStr
      };
      return updatedRecord;
    }
    return r;
  });

  if (updatedRecord) {
    saveReviewers(updated);
  }

  // Sync status to remote PHP API
  try {
    await apiFetch(`${API_ENDPOINTS.REVIEWERS}?action=status`, {
      method: 'POST',
      body: JSON.stringify({ 
        id, 
        status,
        status_reason: statusReason,
        status_changed_by: statusChangedBy || 'Admin Console'
      }),
      silent: true
    });
  } catch (e) {
    console.warn('Failed to sync reviewer status to remote DB:', e);
  }

  return updatedRecord;
}

/**
 * Update full reviewer record
 */
export async function updateReviewer(id: string, updates: Partial<ReviewerAccount>): Promise<ReviewerAccount | null> {
  const current = getReviewers();
  let updatedRecord: ReviewerAccount | null = null;

  const updated = current.map(r => {
    if (r.id === id) {
      updatedRecord = { ...r, ...updates };
      return updatedRecord;
    }
    return r;
  });

  if (updatedRecord) {
    saveReviewers(updated);
  }

  // Remote PHP update via POST (more robust for shared hosting)
  try {
    const res = await apiFetch(`${API_ENDPOINTS.REVIEWERS}?action=update`, {
      method: 'POST',
      body: JSON.stringify({ id, ...updates }),
      silent: true
    });
    if (res && !res.success) {
      throw new Error(res.message || 'Remote update rejected by server.');
    }
  } catch (e: any) {
    console.warn('Failed to sync reviewer updates to remote DB:', e);
    throw e;
  }

  return updatedRecord;
}

/**
 * Delete a reviewer account
 */
export async function deleteReviewer(id: string): Promise<boolean> {
  const current = getReviewers();
  const filtered = current.filter(r => r.id !== id);
  if (filtered.length !== current.length) {
    saveReviewers(filtered);

    // Delete from remote PHP API
    try {
      await apiFetch(`${API_ENDPOINTS.REVIEWERS}?action=delete`, {
        method: 'POST',
        body: JSON.stringify({ id }),
        silent: true
      });
    } catch (e) {
      console.warn('Failed to delete remote reviewer:', e);
    }

    return true;
  }
  return false;
}

/**
 * Verify if an email address is authorized for Course Reviewer sign-in
 */
export function verifyReviewerAuthorization(email: string): { 
  authorized: boolean; 
  reviewer?: ReviewerAccount; 
  reason?: string; 
  message?: string;
} {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) {
    return { authorized: false, reason: 'Email address is required.', message: 'Email address is required.' };
  }

  const reviewers = getReviewers();
  const matched = reviewers.find(r => r.email.trim().toLowerCase() === cleanEmail);

  if (!matched) {
    return { 
      authorized: false, 
      reason: `Access Denied: The email "${email}" has not been added as an authorized Course Reviewer by Admin.`,
      message: `Access Denied: The email "${email}" has not been added as an authorized Course Reviewer by Admin.`
    };
  }

  if (matched.status === 'suspended') {
    const errorStr = matched.status_reason 
      ? `Account Suspended: ${matched.status_reason}`
      : `Account Suspended: Your reviewer account has been suspended by Admin.`;
    return { 
      authorized: false, 
      reason: errorStr,
      message: errorStr
    };
  }

  if (matched.status === 'pending') {
    return { 
      authorized: false, 
      reason: `Account Pending: Your reviewer account is currently awaiting Admin approval.`,
      message: `Account Pending: Your reviewer account is currently awaiting Admin approval.`
    };
  }

  return { authorized: true, reviewer: matched };
}

/**
 * Authenticate reviewer via PHP API
 */
export async function authenticateReviewerApi(email: string): Promise<{
  authorized: boolean;
  reviewer?: ReviewerAccount;
  reason?: string;
  message?: string;
}> {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const res = await apiFetch(`${API_ENDPOINTS.REVIEWERS}?action=login`, {
      method: 'POST',
      body: JSON.stringify({ login_email: cleanEmail }),
      silent: true
    }, 1);

    if (res && res.success && res.reviewer) {
      const normalized = normalizeReviewer(res.reviewer);
      // Cache this reviewer in localStorage
      const current = getReviewers();
      const updated = [normalized, ...current.filter(r => r.id !== normalized.id)];
      saveReviewers(updated);

      return { authorized: true, reviewer: normalized };
    } else {
      const failMsg = res?.message || `The email "${email}" is not authorized as a Course Reviewer.`;
      return { 
        authorized: false, 
        reason: failMsg,
        message: failMsg
      };
    }
  } catch (e: any) {
    console.warn('authenticateReviewerApi remote failed, fallback to local lookup:', e);
    // Fallback to local check
    return verifyReviewerAuthorization(cleanEmail);
  }
}

