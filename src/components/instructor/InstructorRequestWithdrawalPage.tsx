import React, { useState, useMemo, useEffect } from 'react';
import { 
  Landmark, 
  Building, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ArrowLeft, 
  Wallet,
  ShieldCheck,
  ExternalLink,
  Globe,
  DollarSign,
  ArrowRight
} from 'lucide-react';
import { InstructorTabKey } from '../navigation/InstructorSidebar';
import { subscriptionService } from '../../services/subscription-service';
import { withdrawalService } from '../../services/withdrawal-service';
import { currencyService, CurrencyItem } from '../../services/currency-service';
import { ALL_CURRENCIES } from '../../lib/currencies';
import { Course } from '../../types';

interface InstructorRequestWithdrawalPageProps {
  currentUser: any;
  courses: Course[];
  onSelectTab: (tab: InstructorTabKey) => void;
}

export const InstructorRequestWithdrawalPage: React.FC<InstructorRequestWithdrawalPageProps> = ({
  currentUser,
  courses,
  onSelectTab
}) => {
  const [earnedTransactions, setEarnedTransactions] = useState<any[]>([]);
  const [withdrawnTransactions, setWithdrawnTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Currency State
  const [systemCurrency, setSystemCurrency] = useState('KES');
  const [currenciesList, setCurrenciesList] = useState<CurrencyItem[]>(ALL_CURRENCIES.map((c, i) => ({
    ...c,
    exchange_rate: c.code === 'KES' ? 130 : c.code === 'USD' ? 1 : (c.exchange_rate || 1),
    is_default: c.code === 'KES' ? 1 : 0
  })));
  const [currencyChangeMsg, setCurrencyChangeMsg] = useState<string | null>(null);

  useEffect(() => {
    currencyService.getSystemCurrency(currentUser?.id || 'current-user').then(res => {
      if (res.preference) setSystemCurrency(res.preference);
      if (res.currencies && res.currencies.length > 0) setCurrenciesList(res.currencies);
    });
  }, [currentUser?.id]);

  const handleCurrencyChange = async (newCode: string) => {
    setSystemCurrency(newCode);
    const chosen = currenciesList.find(c => c.code === newCode);
    await currencyService.setSystemCurrency(currentUser?.id || 'current-user', newCode);
    setCurrencyChangeMsg(`Currency switched to ${chosen?.name || newCode} (${newCode})`);
    setTimeout(() => setCurrencyChangeMsg(null), 3000);
  };

  useEffect(() => {
    async function loadData() {
      try {
        const courseIds = courses.map(c => c.id);
        const earned = await subscriptionService.getInstructorTransactions({
          instructorId: currentUser?.id,
          instructorEmail: currentUser?.email,
          courseIds: courseIds.length > 0 ? courseIds : undefined
        });
        if (Array.isArray(earned)) setEarnedTransactions(earned);

        const withdrawn = await withdrawalService.getWithdrawals({
          instructorId: currentUser?.id,
          instructorEmail: currentUser?.email
        });
        if (Array.isArray(withdrawn)) setWithdrawnTransactions(withdrawn);
      } catch (e) {
        console.warn('Failed to load withdrawal balances:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentUser, courses]);

  // Financial calculations stored in USD ($) base
  const totalEarnedUsd = useMemo(() => {
    return earnedTransactions.reduce((acc, curr) => {
      const raw = Number(curr.coursePrice || curr.amount || curr.amountKes || 0);
      const inUsd = curr.currency === 'KES'
        ? currencyService.convertAmount(raw, 'KES', 'USD', currenciesList)
        : raw;
      return acc + (isNaN(inUsd) ? 0 : inUsd);
    }, 0);
  }, [earnedTransactions, currenciesList]);

  const totalWithdrawnUsd = useMemo(() => {
    return withdrawnTransactions.reduce((acc, curr) => {
      if (curr.status === 'declined') return acc;
      const raw = Number(curr.amount || 0);
      const inUsd = curr.currency === 'KES'
        ? currencyService.convertAmount(raw, 'KES', 'USD', currenciesList)
        : raw;
      return acc + (isNaN(inUsd) ? 0 : inUsd);
    }, 0);
  }, [withdrawnTransactions, currenciesList]);

  const revenueBalanceUsd = useMemo(() => {
    return Math.max(0, totalEarnedUsd - totalWithdrawnUsd);
  }, [totalEarnedUsd, totalWithdrawnUsd]);

  // Converted revenue balance in the user's selected active currency
  const availableBalanceInSelectedCurrency = useMemo(() => {
    return currencyService.convertAmount(revenueBalanceUsd, 'USD', systemCurrency, currenciesList);
  }, [revenueBalanceUsd, systemCurrency, currenciesList]);

  const activeCurrencyInfo = useMemo(() => {
    return currenciesList.find(c => c.code === systemCurrency) || {
      code: systemCurrency,
      symbol: systemCurrency,
      name: systemCurrency,
      exchange_rate: 1
    };
  }, [currenciesList, systemCurrency]);

  const currencySymbol = activeCurrencyInfo.symbol || systemCurrency;

  // Load saved bank details automatically from payout settings / storage
  const savedBankDetails = useMemo(() => {
    try {
      const saved = localStorage.getItem('uqlearn_bank_details');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.bankName || parsed.accountNumber)) {
          return parsed;
        }
      }
    } catch (e) {}

    if (currentUser?.payoutDetails?.bankName) {
      return currentUser.payoutDetails;
    }
    return null;
  }, [currentUser]);

  const hasConfiguredBank = Boolean(
    savedBankDetails && 
    (savedBankDetails.bankName || savedBankDetails.bank_name) && 
    (savedBankDetails.accountNumber || savedBankDetails.account_number)
  );

  const bankName = savedBankDetails?.bankName || savedBankDetails?.bank_name || '';
  const accountNumber = savedBankDetails?.accountNumber || savedBankDetails?.account_number || '';
  const accountHolder = savedBankDetails?.fullName || savedBankDetails?.accountHolderName || savedBankDetails?.account_holder_name || currentUser?.name || '';
  const bankCountry = savedBankDetails?.country || savedBankDetails?.bankCountry || 'Kenya';

  // Form State
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawNotes, setWithdrawNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Computed USD equivalent of whatever amount the user inputs in the selected currency
  const inputAmountNum = Number(withdrawAmount);
  const inputAmountUsd = useMemo(() => {
    if (isNaN(inputAmountNum) || inputAmountNum <= 0) return 0;
    return Number(currencyService.convertAmount(inputAmountNum, systemCurrency, 'USD', currenciesList).toFixed(2));
  }, [inputAmountNum, systemCurrency, currenciesList]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const amt = Number(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('Please enter a valid withdrawal amount.');
      return;
    }

    if (amt > availableBalanceInSelectedCurrency + 0.001) {
      setErrorMsg(`Withdrawal amount cannot exceed your available balance of ${currencySymbol} ${availableBalanceInSelectedCurrency.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`);
      return;
    }

    if (!hasConfiguredBank) {
      setErrorMsg('Please configure your bank details in Payout Settings first.');
      return;
    }

    // Convert amount in systemCurrency to USD ($) on submission in the background
    const finalAmountInUsd = Number(currencyService.convertAmount(amt, systemCurrency, 'USD', currenciesList).toFixed(2));

    setIsSubmitting(true);
    try {
      const res = await withdrawalService.requestWithdrawal({
        instructorId: currentUser?.id || 'instructor-current',
        instructorEmail: currentUser?.email || '',
        instructorName: currentUser?.name || 'Instructor',
        amount: finalAmountInUsd, // saved in dollars ($)
        currency: 'USD',
        bankName,
        accountNumber,
        accountName: accountHolder,
        country: bankCountry,
        notes: withdrawNotes.trim()
      });

      if (res.success) {
        setSuccessMsg(`Withdrawal request for ${currencySymbol} ${amt.toLocaleString(undefined, { minimumFractionDigits: 2 })} submitted successfully! Settlements are transferred to ${bankName} within 1 to 3 working days.`);
        setWithdrawAmount('');
        setWithdrawNotes('');
        setTimeout(() => {
          onSelectTab('analytics');
        }, 2500);
      } else {
        setErrorMsg('Failed to submit withdrawal request. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetPercentage = (pct: number) => {
    if (availableBalanceInSelectedCurrency <= 0) return;
    const computed = (availableBalanceInSelectedCurrency * pct) / 100;
    setWithdrawAmount(computed.toFixed(2));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn pb-16">
      
      {/* Header & Back Button */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onSelectTab('analytics')}
            className="p-2 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all cursor-pointer shadow-2xs"
            title="Back to Analytics"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
              <Landmark className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Request Funds Withdrawal</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Transfer your earned revenue securely to your verified bank account.
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Available Balance</span>
          <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
            {currencySymbol} {availableBalanceInSelectedCurrency.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Main Form Card */}
      <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6">
        
        {!hasConfiguredBank ? (
          <div className="p-5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 space-y-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold">No Bank Account Configured</h3>
                <p className="text-xs leading-relaxed opacity-90">
                  You must configure your bank account details in Payout Settings before requesting a withdrawal. Withdrawals are automatically settled into your verified bank account.
                </p>
              </div>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onSelectTab('payouts')}
                className="inline-flex items-center space-x-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-md text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <span>Configure Bank in Payout Settings</span>
                <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Automatic Bank Details Preview */}
            <div className="p-4 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                  <Building className="w-4 h-4 text-emerald-500" />
                  <span>Destination Bank (Automatically Picked from Payout Settings)</span>
                </span>
                <button
                  type="button"
                  onClick={() => onSelectTab('payouts')}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                >
                  Change in Payout Settings
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Bank Name</span>
                  <span className="text-xs font-black text-slate-900 dark:text-slate-100 mt-0.5 block">{bankName}</span>
                </div>

                <div className="p-3 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Account Number</span>
                  <span className="text-xs font-black text-slate-900 dark:text-slate-100 mt-0.5 block">•••• {String(accountNumber).slice(-4)}</span>
                </div>

                <div className="p-3 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Account Holder</span>
                  <span className="text-xs font-black text-slate-900 dark:text-slate-100 mt-0.5 block truncate">{accountHolder}</span>
                </div>
              </div>
            </div>

            {/* Withdrawal Amount Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider block">
                  Withdrawal Amount ({systemCurrency}) <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => handleSetPercentage(100)}
                  className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                >
                  Withdraw Max Balance
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                  {currencySymbol}
                </div>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  max={availableBalanceInSelectedCurrency}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 shadow-2xs"
                />
              </div>

              {/* Quick Percentage Shortcuts */}
              {availableBalanceInSelectedCurrency > 0 && (
                <div className="flex items-center space-x-2 pt-1">
                  <span className="text-[11px] text-slate-400">Quick select:</span>
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleSetPercentage(pct)}
                      className="px-2.5 py-0.5 text-[11px] font-bold rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                    >
                      {pct === 100 ? 'Max (100%)' : `${pct}%`}
                    </button>
                  ))}
                </div>
              )}

              <p className="text-[11px] text-slate-400">
                Direct bank settlement is processed within 1 to 3 working days.
              </p>
            </div>

            {/* Optional Notes */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider block">
                Reference / Notes (Optional)
              </label>
              <textarea
                rows={3}
                value={withdrawNotes}
                onChange={(e) => setWithdrawNotes(e.target.value)}
                placeholder="Add any specific payout instructions or transaction notes..."
                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 shadow-2xs resize-none"
              />
            </div>

            {/* Error / Success Alerts */}
            {errorMsg && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-md flex items-center space-x-2 animate-fadeIn">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-md flex items-center space-x-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Submit Action */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => onSelectTab('analytics')}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-md text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || revenueBalanceUsd <= 0 || !withdrawAmount}
                className="inline-flex items-center space-x-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-md shadow-xs hover:shadow transition cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <Landmark className="w-4 h-4" />
                    <span>Confirm & Submit Withdrawal Request</span>
                  </>
                )}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
