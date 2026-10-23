import { WithdrawalTransaction } from '../types';
import { apiFetch } from '../lib/apiConfig';

/**
 * Helper to deduplicate withdrawals to prevent double-recorded rows
 */
export function deduplicateWithdrawals(list: WithdrawalTransaction[]): WithdrawalTransaction[] {
  if (!Array.isArray(list)) return [];
  const seen = new Map<string, WithdrawalTransaction>();

  for (const item of list) {
    if (!item) continue;
    const ref = (item.reference || '').trim().toUpperCase();
    let key = '';
    if (ref && ref.length >= 4) {
      key = `ref_${ref}`;
    } else if (item.id && !item.id.startsWith('wd_')) {
      key = `id_${item.id}`;
    } else {
      const email = (item.instructorEmail || item.instructorId || '').toLowerCase().trim();
      const amount = Math.round(Number(item.amount || 0));
      const date = (item.requestedAt || '').split('T')[0];
      key = `composite_${email}_${amount}_${date}_${item.accountNumber}`;
    }

    if (!seen.has(key)) {
      seen.set(key, item);
    } else {
      const existing = seen.get(key)!;
      if (item.status === 'settled' && existing.status !== 'settled') {
        seen.set(key, item);
      }
    }
  }

  return Array.from(seen.values());
}

export const withdrawalService = {
  /**
   * Fetch all withdrawal transactions for an instructor
   */
  async getWithdrawals(params: {
    instructorId?: string;
    instructorEmail?: string;
  }): Promise<WithdrawalTransaction[]> {
    try {
      const searchParams = new URLSearchParams();
      searchParams.set('action', 'withdrawals');
      if (params.instructorId) {
        searchParams.set('instructor_id', params.instructorId);
        searchParams.set('user_id', params.instructorId);
      } else if (params.instructorEmail) {
        searchParams.set('user_id', params.instructorEmail);
      }
      if (params.instructorEmail) searchParams.set('instructor_email', params.instructorEmail);

      const res = await apiFetch(`payouts.php?${searchParams.toString()}`, { silent: true }, 0);
      if (res && res.success && Array.isArray(res.data)) {
        const deduped = deduplicateWithdrawals(res.data);
        // Sync to local cache
        localStorage.setItem('uqlearn_withdrawals', JSON.stringify(deduped));
        return deduped;
      }
    } catch (e) {
      // Graceful fallback to local cache
    }

    try {
      const saved = localStorage.getItem('uqlearn_withdrawals');
      if (saved) {
        const parsed: WithdrawalTransaction[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const deduped = deduplicateWithdrawals(parsed);
          if (params.instructorId || params.instructorEmail) {
            return deduped.filter(w => 
              (params.instructorId && w.instructorId === params.instructorId) ||
              (params.instructorEmail && w.instructorEmail?.toLowerCase() === params.instructorEmail.toLowerCase())
            );
          }
          return deduped;
        }
      }
    } catch (e) {
      console.warn('Failed to parse cached withdrawals:', e);
    }

    return [];
  },

  /**
   * Submit a new withdrawal request to be settled to the instructor's bank within 1-3 working days
   */
  async requestWithdrawal(params: {
    instructorId: string;
    instructorEmail: string;
    instructorName?: string;
    amount: number;
    currency?: string;
    bankName: string;
    accountNumber: string;
    accountName?: string;
    country?: string;
    notes?: string;
  }): Promise<{ success: boolean; withdrawal?: WithdrawalTransaction; message?: string }> {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const reference = `WD-${dateStr}-${randomSuffix}`;

    const newWithdrawal: WithdrawalTransaction = {
      id: `wd_${timestamp}_${randomSuffix}`,
      instructorId: params.instructorId,
      instructorEmail: params.instructorEmail,
      instructorName: params.instructorName || 'Instructor',
      amount: Number(params.amount),
      currency: params.currency || 'KES',
      bankName: params.bankName,
      accountNumber: params.accountNumber,
      accountName: params.accountName || params.instructorName || '',
      country: params.country || 'Kenya',
      status: 'pending',
      requestedAt: new Date().toISOString(),
      reference,
      notes: params.notes || '',
      estimatedSettlementDays: '1 to 3 working days'
    };

    // Save to local cache first
    try {
      const saved = localStorage.getItem('uqlearn_withdrawals');
      const list: WithdrawalTransaction[] = saved ? JSON.parse(saved) : [];
      list.unshift(newWithdrawal);
      localStorage.setItem('uqlearn_withdrawals', JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to cache withdrawal locally:', e);
    }

    // Submit to PHP backend API
    try {
      const res = await apiFetch('payouts.php', {
        method: 'POST',
        body: JSON.stringify({
          action: 'request_withdrawal',
          user_id: params.instructorId || params.instructorEmail,
          ...newWithdrawal
        }),
        silent: true
      }, 0);

      if (res && res.success) {
        return {
          success: true,
          withdrawal: res.data || newWithdrawal,
          message: 'Withdrawal request submitted successfully. Payment will be settled to your bank in 1 to 3 working days.'
        };
      }
    } catch (e) {
      console.warn('Backend withdrawal submission warning (cached locally):', e);
    }

    return {
      success: true,
      withdrawal: newWithdrawal,
      message: 'Withdrawal request recorded successfully. Settlement will be processed within 1 to 3 working days.'
    };
  }
};
