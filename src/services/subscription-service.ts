import { CourseSubscription } from '../types';
import { apiFetch, updateActiveSession, getActiveSession } from '../lib/apiConfig';

/**
 * Deduplicate transaction and subscription records to ensure identical or double-recorded transactions are merged
 */
export function deduplicateTransactions(list: CourseSubscription[]): CourseSubscription[] {
  if (!Array.isArray(list)) return [];
  
  const seen = new Map<string, CourseSubscription>();
  
  for (const item of list) {
    if (!item) continue;
    
    // Ignore invalid records with no course or no student
    const courseId = (item.courseId || '').trim();
    const student = (item.studentEmail || item.studentId || '').trim().toLowerCase();
    if (!courseId && !(item as any).course_id) continue;
    
    // Normalize code / reference
    const code = (item.transactionCode || (item as any).reference || (item as any).transaction_code || '').trim().toUpperCase();
    const isGenericCode = !code || code === 'FREE-GRANT' || code === 'MANUAL-PENDING' || code === 'PENDING';
    
    // Primary key based on unique transaction code/reference if real
    let key = '';
    if (!isGenericCode && code.length >= 4) {
      key = `code_${code}`;
    } else if (item.id && !item.id.startsWith('sub_') && !item.id.startsWith('pur_')) {
      key = `id_${item.id}`;
    } else {
      // Composite key based on student email/id + courseId + amount + enrollment date
      const amount = Math.round(Number(item.coursePrice || item.amountKes || item.amountUsd || (item as any).amount || 0));
      const dateStr = (item.enrolledAt || item.activatedAt || (item as any).date || (item as any).created_at || '').split('T')[0];
      key = `composite_${student}_${courseId}_${amount}_${dateStr}`;
    }
    
    // If we've seen this key, keep the active/more complete record
    if (seen.has(key)) {
      const existing = seen.get(key)!;
      if (item.status === 'active' && existing.status !== 'active') {
        seen.set(key, item);
      } else if (item.activatedAt && !existing.activatedAt) {
        seen.set(key, item);
      }
    } else {
      seen.set(key, item);
    }
  }
  
  return Array.from(seen.values());
}

export const subscriptionService = {
  /**
   * Request a new course subscription / enrollment
   */
  async requestSubscription(params: {
    studentId: string;
    studentName: string;
    studentEmail: string;
    courseId: string;
    courseTitle: string;
    coursePrice: number;
    amountKes?: number;
    amountUsd?: number;
    currency?: string;
    paymentMethod: 'online' | 'manual' | 'free' | 'payhero_stk';
    transactionCode?: string;
    notes?: string;
  }): Promise<CourseSubscription> {
    const subId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const isFree = params.coursePrice === 0 || params.paymentMethod === 'free';

    const rawP = Number(params.coursePrice || 0);
    const isKes = params.currency === 'KES' || params.currency === 'KSh' || rawP >= 100;
    const resolvedKes = params.amountKes || (isKes ? rawP : Math.round(rawP * 130));
    const resolvedUsd = params.amountUsd || (isKes ? Number((rawP / 130).toFixed(2)) : rawP);

    const newSubscription: CourseSubscription = {
      id: subId,
      studentId: params.studentId,
      studentName: params.studentName || 'Student',
      studentEmail: params.studentEmail || 'student@uqlearn.org',
      courseId: params.courseId,
      courseTitle: params.courseTitle,
      coursePrice: params.coursePrice,
      amountKes: resolvedKes,
      amountUsd: resolvedUsd,
      currency: params.currency || (isKes ? 'KES' : 'USD'),
      paymentMethod: params.paymentMethod,
      transactionCode: params.transactionCode || (isFree ? 'FREE-GRANT' : 'MANUAL-PENDING'),
      status: isFree ? 'active' : 'pending',
      enrolledAt: new Date().toISOString(),
      ...(isFree ? {
        activatedAt: new Date().toISOString(),
        activatedBy: 'System'
      } : {}),
      notes: params.notes || ''
    };

    try {
      // 1. Cache locally
      const localSubs: CourseSubscription[] = JSON.parse(localStorage.getItem('uqlearn_subscriptions') || '[]');
      const filtered = localSubs.filter((s: CourseSubscription) => s.id !== subId);
      filtered.unshift(newSubscription);
      localStorage.setItem('uqlearn_subscriptions', JSON.stringify(deduplicateTransactions(filtered)));

      // If free, sync enrolled course locally & create purchase record in PHP
      if (isFree) {
        await this.syncStudentEnrolledCourse(params.studentId, params.courseId);
        
        apiFetch('purchases.php', {
          method: 'POST',
          body: JSON.stringify({
            action: 'create_purchase',
            id: `pur_${subId}`,
            course_id: params.courseId,
            course_title: params.courseTitle,
            amount: params.coursePrice,
            payment_method: params.paymentMethod,
            date: new Date().toISOString().split('T')[0],
            status: 'success'
          }),
          silent: true
        }).catch(() => {});
      }

      // 2. Post to PHP backend API
      apiFetch('subscriptions.php', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create_subscription',
          ...newSubscription
        }),
        silent: true
      }).catch(() => {});

      return newSubscription;
    } catch (error) {
      console.error('Error requesting subscription:', error);
      return newSubscription;
    }
  },

  /**
   * Admin or automated webhook activates a subscription
   */
  async activateSubscription(
    subscriptionId: string, 
    verifiedTransactionCode?: string, 
    activatedByAdmin: string = 'Super Admin'
  ): Promise<boolean> {
    try {
      let studentId = '';
      let courseId = '';
      let courseTitle = '';
      let coursePrice = 0;
      let paymentMethod = 'm-pesa';
      const now = new Date().toISOString();

      const localSubs: CourseSubscription[] = JSON.parse(localStorage.getItem('uqlearn_subscriptions') || '[]');
      const target = localSubs.find(s => s.id === subscriptionId);
      if (target) {
        studentId = target.studentId;
        courseId = target.courseId;
        courseTitle = target.courseTitle;
        coursePrice = target.coursePrice;
        paymentMethod = target.paymentMethod;
        target.status = 'active';
        target.activatedAt = now;
        target.activatedBy = activatedByAdmin;
        if (verifiedTransactionCode) target.transactionCode = verifiedTransactionCode;
        localStorage.setItem('uqlearn_subscriptions', JSON.stringify(deduplicateTransactions(localSubs)));
      }

      if (studentId && courseId) {
        await this.syncStudentEnrolledCourse(studentId, courseId);
      }

      // Sync with PHP backend subscriptions table
      apiFetch('subscriptions.php', {
        method: 'POST',
        body: JSON.stringify({
          action: 'activate_subscription',
          id: subscriptionId,
          transactionCode: verifiedTransactionCode,
          activatedBy: activatedByAdmin
        }),
        silent: true
      }).catch(() => {});

      // Sync with PHP backend purchases table
      if (courseId) {
        apiFetch('purchases.php', {
          method: 'POST',
          body: JSON.stringify({
            action: 'create_purchase',
            id: `pur_${subscriptionId}`,
            course_id: courseId,
            course_title: courseTitle || 'Course Purchase',
            amount: coursePrice,
            payment_method: paymentMethod,
            date: new Date().toISOString().split('T')[0],
            status: 'success'
          }),
          silent: true
        }).catch(() => {});
      }

      return true;
    } catch (error) {
      console.error('Error activating subscription:', error);
      return false;
    }
  },

  /**
   * Admin rejects a subscription request
   */
  async rejectSubscription(subscriptionId: string, notes?: string): Promise<boolean> {
    try {
      const localSubs: CourseSubscription[] = JSON.parse(localStorage.getItem('uqlearn_subscriptions') || '[]');
      const target = localSubs.find(s => s.id === subscriptionId);
      if (target) {
        target.status = 'rejected';
        target.notes = notes || 'Transaction could not be verified.';
        localStorage.setItem('uqlearn_subscriptions', JSON.stringify(localSubs));
      }

      apiFetch('subscriptions.php', {
        method: 'POST',
        body: JSON.stringify({
          action: 'reject_subscription',
          id: subscriptionId,
          notes
        }),
        silent: true
      }).catch(() => {});

      return true;
    } catch (error) {
      console.error('Error rejecting subscription:', error);
      return false;
    }
  },

  /**
   * Add courseId to student's enrolledCourseIds in localStorage
   */
  async syncStudentEnrolledCourse(studentId: string, courseId: string): Promise<void> {
    try {
      const activeUser = getActiveSession();
      if (!activeUser) return;

      const currentEnrolled = Array.isArray(activeUser.enrolledCourseIds) 
        ? activeUser.enrolledCourseIds 
        : [];
      
      if (!currentEnrolled.includes(courseId)) {
        updateActiveSession({
          enrolledCourseIds: [...currentEnrolled, courseId]
        });
      }
    } catch (e) {
      console.warn('Could not sync enrolled course ID locally:', e);
    }
  },

  /**
   * Fetch all successful transactions from PHP backend API / localStorage with deduplication
   */
  async getSuccessfulTransactions(search?: string): Promise<CourseSubscription[]> {
    try {
      let url = 'transactions.php?status=successful';
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }
      const data = await apiFetch(url, { silent: true }, 1);
      if (data && data.success && Array.isArray(data.data) && data.data.length > 0) {
        return deduplicateTransactions(data.data);
      }
    } catch (e) {
      // Non-blocking fallback
    }

    const all = JSON.parse(localStorage.getItem('uqlearn_subscriptions') || '[]');
    const active = all.filter((s: CourseSubscription) => s.status === 'active' && Boolean(s.courseId));
    return deduplicateTransactions(active);
  },

  /**
   * Fetch successful transactions specifically for an instructor from PHP backend API with deduplication
   */
  async getInstructorTransactions(params: {
    instructorId?: string;
    instructorEmail?: string;
    instructorName?: string;
    courseIds?: string[];
    courseId?: string;
    search?: string;
  }): Promise<CourseSubscription[]> {
    try {
      const searchParams = new URLSearchParams();
      searchParams.set('status', 'successful');
      if (params.instructorId) searchParams.set('instructor_id', params.instructorId);
      if (params.instructorEmail) searchParams.set('instructor_email', params.instructorEmail);
      if (params.instructorName) searchParams.set('instructor_name', params.instructorName);
      if (params.courseId) searchParams.set('course_id', params.courseId);
      if (params.courseIds && params.courseIds.length > 0) {
        searchParams.set('course_ids', params.courseIds.join(','));
      }
      if (params.search) searchParams.set('search', params.search);

      const data = await apiFetch(`instructor_transactions.php?${searchParams.toString()}`, { silent: true }, 1);
      if (data && data.success && Array.isArray(data.data)) {
        return deduplicateTransactions(data.data);
      }
    } catch (e) {
      // Non-blocking fallback
    }

    // Fallback: Filter all successful transactions by courseIds
    try {
      const allTransactions = await this.getSuccessfulTransactions(params.search);
      if (params.courseIds && params.courseIds.length > 0) {
        const idSet = new Set(params.courseIds);
        return deduplicateTransactions(allTransactions.filter(t => t.courseId && idSet.has(t.courseId)));
      }
      if (params.courseId) {
        return deduplicateTransactions(allTransactions.filter(t => t.courseId === params.courseId));
      }
      return deduplicateTransactions(allTransactions);
    } catch (e) {
      return [];
    }
  },

  /**
   * Fetch all subscriptions for Admin Dashboard with deduplication
   */
  async getAllSubscriptions(): Promise<CourseSubscription[]> {
    try {
      const data = await apiFetch('transactions.php?status=successful', { silent: true }, 1);
      if (data && data.success && Array.isArray(data.data) && data.data.length > 0) {
        return deduplicateTransactions(data.data);
      }
    } catch (e) {
      // Fallback
    }

    const all = JSON.parse(localStorage.getItem('uqlearn_subscriptions') || '[]');
    return deduplicateTransactions(all);
  },

  /**
   * Get subscriptions for a specific student with deduplication
   */
  async getStudentSubscriptions(studentId: string, studentEmail?: string): Promise<CourseSubscription[]> {
    try {
      const params = new URLSearchParams();
      if (studentId) params.set('student_id', studentId);
      if (studentEmail) params.set('student_email', studentEmail);

      const data = await apiFetch(`subscriptions.php?${params.toString()}`, { silent: true }, 1);
      if (data && data.success && Array.isArray(data.data)) {
        return deduplicateTransactions(data.data);
      }
    } catch (e) {
      // Fallback
    }

    const all = JSON.parse(localStorage.getItem('uqlearn_subscriptions') || '[]');
    const cleanEmail = (studentEmail || '').toLowerCase().trim();
    const filtered = all.filter((s: CourseSubscription) => 
      (studentId && s.studentId === studentId) || 
      (cleanEmail && s.studentEmail && s.studentEmail.toLowerCase().trim() === cleanEmail)
    );
    return deduplicateTransactions(filtered);
  },

  /**
   * Subscribe to subscription changes
   */
  subscribeToAllSubscriptions(callback: (subscriptions: CourseSubscription[]) => void): () => void {
    this.getAllSubscriptions().then(callback);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'uqlearn_subscriptions') {
        try {
          const raw = e.newValue ? JSON.parse(e.newValue) : [];
          callback(deduplicateTransactions(raw));
        } catch {
          callback([]);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }
};
