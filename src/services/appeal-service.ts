import { apiFetch } from '../lib/apiConfig';

export interface AppealTransaction {
  id: string;
  review_id: string;
  course_id?: string;
  course_title?: string;
  instructor_name?: string;
  student_name?: string;
  rating?: number;
  feedback?: string;
  clause: string;
  evidence?: string;
  fee_amount: number;
  currency: string;
  fee_status: 'CHARGED_NON_REFUNDABLE';
  review_status: 'under_appeal' | 'upheld' | 'partially_upheld' | 'removed';
  created_at: string;
}

const STORAGE_KEY = 'uqlearn_review_appeal_transactions';

export const appealService = {
  // Get cached appeal transactions
  getAppealTransactions(): AppealTransaction[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed reading appeal transactions cache:', e);
    }
    return [
      {
        id: 'APL-71.50-1002',
        review_id: 'rev_sample_01',
        course_id: 'course_web_dev',
        course_title: 'Full-Stack Web Development Mastery',
        instructor_name: 'Dr. Alex Vance',
        student_name: 'Marcus Brody',
        rating: 1,
        feedback: 'Spam promotional link to external competitor site',
        clause: 'Clause 3.1: Spam, advertising, or content unrelated to the course',
        evidence: 'Reviewer left a referral URL to commercial course site',
        fee_amount: 71.50,
        currency: 'KES',
        fee_status: 'CHARGED_NON_REFUNDABLE',
        review_status: 'under_appeal',
        created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
      }
    ];
  },

  // Fetch live appeal records directly from API endpoint https://uqlearn.org/api/v1/review-appeals.php
  async fetchLiveAppeals(): Promise<AppealTransaction[]> {
    try {
      const res = await apiFetch('review-appeals.php', {}, 0);
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        const liveAppeals: AppealTransaction[] = res.data.map((item: any) => {
          const rawAmount = Number(item.fee_amount || 71.50);
          const isUsd = item.currency === 'USD' || rawAmount < 5;
          const kshAmount = isUsd ? rawAmount * 130 : rawAmount;

          return {
            id: item.id || item.transaction_id || `APL-71.50-${item.review_id}`,
            review_id: String(item.review_id || item.id),
            course_id: item.course_id || 'general_course',
            course_title: item.course_title || item.courseName || 'Enrolled Course',
            instructor_name: item.instructor_name || item.instructor || 'Course Instructor',
            student_name: item.student_name || item.learnerName || 'Learner',
            rating: Number(item.rating || 1),
            feedback: item.feedback || item.comment || 'no feedback',
            clause: item.clause || 'Section 3 Violation',
            evidence: item.evidence || '',
            fee_amount: kshAmount,
            currency: 'KES',
            fee_status: 'CHARGED_NON_REFUNDABLE',
            review_status: (item.review_status || item.status || 'under_appeal') as any,
            created_at: item.created_at || new Date().toISOString()
          };
        });

        localStorage.setItem(STORAGE_KEY, JSON.stringify(liveAppeals));
        return liveAppeals;
      }
    } catch (e) {
      console.warn('API review-appeals.php fetch notice, using cached ledger:', e);
    }
    return this.getAppealTransactions();
  },

  // Submit appeal, deduct $0.55 USD from course earnings & register on API
  async submitAppeal(data: {
    review_id: string;
    course_id?: string;
    course_title?: string;
    instructor_name?: string;
    student_name?: string;
    rating?: number;
    feedback?: string;
    clause: string;
    evidence?: string;
    fee_amount?: number;
    currency?: string;
  }): Promise<AppealTransaction> {
    const feeAmount = data.fee_amount !== undefined ? data.fee_amount : 0.55;
    const feeCurrency = data.currency || 'USD';
    const transactionId = `APL-USD-${feeAmount}-${Math.floor(10000 + Math.random() * 90000)}`;
    
    const newTransaction: AppealTransaction = {
      id: transactionId,
      review_id: data.review_id,
      course_id: data.course_id || 'general_course',
      course_title: data.course_title || 'Enrolled Course',
      instructor_name: data.instructor_name || 'Course Instructor',
      student_name: data.student_name || 'Learner',
      rating: data.rating || 1,
      feedback: data.feedback || 'no feedback',
      clause: data.clause,
      evidence: data.evidence || '',
      fee_amount: feeAmount,
      currency: feeCurrency,
      fee_status: 'CHARGED_NON_REFUNDABLE',
      review_status: 'under_appeal',
      created_at: new Date().toISOString()
    };

    // Save transaction locally
    const current = this.getAppealTransactions();
    const updated = [newTransaction, ...current.filter(c => c.id !== transactionId && c.review_id !== data.review_id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Deduct fee from course accrued earnings balance ($ USD)
    try {
      const courseKey = `uqlearn_course_earnings_${data.course_id || 'general_course'}`;
      const existingEarnings = Number(localStorage.getItem(courseKey) || '150.00');
      const newEarnings = Math.max(0, existingEarnings - feeAmount);
      localStorage.setItem(courseKey, newEarnings.toFixed(2));
    } catch (e) {
      console.warn('Earnings deduction tracking error:', e);
    }

    // Call API endpoints
    try {
      await apiFetch('review-appeals.php', {
        method: 'POST',
        body: JSON.stringify({
          action: 'submit_appeal',
          transaction_id: transactionId,
          review_id: data.review_id,
          course_id: data.course_id,
          course_title: data.course_title,
          student_name: data.student_name,
          rating: data.rating,
          feedback: data.feedback,
          clause: data.clause,
          evidence: data.evidence,
          fee_amount: feeAmount,
          currency: feeCurrency,
          status: 'under_appeal'
        })
      });
    } catch (e) {
      console.warn('review-appeals.php POST call notice:', e);
    }

    try {
      await apiFetch('course-ratings.php', {
        method: 'POST',
        body: JSON.stringify({
          action: 'appeal_review',
          transaction_id: transactionId,
          review_id: data.review_id,
          status: 'under_appeal',
          fee_amount: feeAmount,
          currency: feeCurrency,
          clause: data.clause,
          evidence: data.evidence
        })
      });
    } catch (e) {
      console.warn('course-ratings.php appeal status sync:', e);
    }

    return newTransaction;
  },

  // Update appeal outcome decision (Upheld, Partially Upheld, Removed)
  // Note: KSh 71.50 Fee remains CHARGED_NON_REFUNDABLE regardless of decision outcome!
  async updateAppealDecision(appealId: string, decision: 'upheld' | 'partially_upheld' | 'removed'): Promise<void> {
    const list = this.getAppealTransactions();
    const updated = list.map(item => {
      if (item.id === appealId) {
        return {
          ...item,
          review_status: decision,
          fee_status: 'CHARGED_NON_REFUNDABLE' as const
        };
      }
      return item;
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    const targetItem = updated.find(i => i.id === appealId);
    if (targetItem) {
      try {
        await apiFetch('review-appeals.php', {
          method: 'POST',
          body: JSON.stringify({
            action: 'update_decision',
            appeal_id: appealId,
            review_id: targetItem.review_id,
            decision: decision,
            status: decision
          })
        });

        await apiFetch('course-ratings.php', {
          method: 'POST',
          body: JSON.stringify({
            action: 'update_appeal_status',
            review_id: targetItem.review_id,
            status: decision
          })
        });

        // If decision is 'removed', also delete the review from ratings DB
        if (decision === 'removed') {
          await apiFetch(`course-ratings.php?id=${encodeURIComponent(targetItem.review_id)}`, {
            method: 'DELETE'
          });
        }
      } catch (e) {
        console.warn('Backend decision update sync error:', e);
      }
    }
  }
};
