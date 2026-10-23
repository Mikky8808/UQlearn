import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, 
  Users, 
  BookOpen, 
  TrendingUp, 
  ArrowRight,
  ArrowUpRight,
  RefreshCw,
  Landmark,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Download,
  CreditCard,
  Building,
  ShieldCheck,
  Calendar,
  X,
  Plus,
  HelpCircle,
  Star,
  Sparkles,
  Globe,
  Receipt,
  Scale,
  FileText,
  ExternalLink
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { Course, CourseSubscription, WithdrawalTransaction } from '../../types';
import { InstructorTabKey } from '../navigation/InstructorSidebar';
import { subscriptionService } from '../../services/subscription-service';
import { withdrawalService } from '../../services/withdrawal-service';
import { useApp } from '../../context/AppContext';
import { apiFetch } from '../../lib/apiConfig';
import { currencyService, CurrencyItem } from '../../services/currency-service';
import { ALL_CURRENCIES } from '../../lib/currencies';

interface InstructorAnalyticsTabProps {
  courses: Course[];
  currentUser?: any;
  onSelectTab?: (tab: InstructorTabKey) => void;
}

export const InstructorAnalyticsTab: React.FC<InstructorAnalyticsTabProps> = ({ 
  courses, 
  currentUser, 
  onSelectTab 
}) => {
  const { payoutCountries, payoutBanks, setSelectedCurrency } = useApp();

  // State
  const [activeTxTab, setActiveTxTab] = useState<'earned' | 'withdrawn'>('earned');
  const [searchTerm, setSearchTerm] = useState('');
  const [earnedTransactions, setEarnedTransactions] = useState<CourseSubscription[]>([]);
  const [withdrawnTransactions, setWithdrawnTransactions] = useState<WithdrawalTransaction[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [realReviews, setRealReviews] = useState<any[]>([]);
  const [payoutMsg, setPayoutMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  // Currency State
  const [systemCurrency, setSystemCurrency] = useState('KES');
  const [currenciesList, setCurrenciesList] = useState<CurrencyItem[]>(ALL_CURRENCIES.map((c, i) => ({
    ...c,
    exchange_rate: c.code === 'KES' ? 130 : c.code === 'USD' ? 1 : 1,
    is_default: i === 0 ? 1 : 0
  })));

  useEffect(() => {
    currencyService.getSystemCurrency(currentUser?.id || 'current-user').then(res => {
      if (res.preference) {
        setSystemCurrency(res.preference);
        const match = ALL_CURRENCIES.find(c => c.code === res.preference);
        if (match && setSelectedCurrency) {
          setSelectedCurrency({
            code: match.code,
            symbol: match.symbol,
            name: match.name,
            rate: (match as any).exchange_rate || (match as any).rate || 1
          });
        }
      }
      if (res.currencies && res.currencies.length > 0) setCurrenciesList(res.currencies);
    });
  }, [currentUser?.id]);

  const handleUpdateCurrency = async (code: string, name: string) => {
    setSystemCurrency(code);
    const chosen = currenciesList.find(c => c.code === code) || ALL_CURRENCIES.find(c => c.code === code);
    if (chosen && setSelectedCurrency) {
      setSelectedCurrency({
        code: chosen.code,
        symbol: chosen.symbol,
        name: chosen.name,
        rate: (chosen as any).exchange_rate || (chosen as any).rate || 1
      });
    }
    await currencyService.setSystemCurrency(currentUser?.id || 'current-user', code);
    setPayoutMsg(`System currency updated to ${name} (${code}) successfully!`);
    setTimeout(() => setPayoutMsg(null), 3000);
  };

  // Withdrawal Modal State
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawNotes, setWithdrawNotes] = useState('');
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawSuccessMsg, setWithdrawSuccessMsg] = useState('');
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);

  // In-modal quick bank config if not configured
  const [modalBankName, setModalBankName] = useState('');
  const [modalAccountNumber, setModalAccountNumber] = useState('');
  const [modalAccountName, setModalAccountName] = useState('');
  const [modalCountry, setModalCountry] = useState('Kenya');

  // Load saved bank details from storage / profile
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
    
    // Fallback to currentUser payout object if any
    if (currentUser?.payoutDetails?.bankName) {
      return currentUser.payoutDetails;
    }
    return null;
  }, [currentUser, isWithdrawModalOpen]);

  // Synchronize modal bank fields when modal opens or saved bank details load
  useEffect(() => {
    if (savedBankDetails) {
      setModalBankName(savedBankDetails.bankName || '');
      setModalAccountNumber(savedBankDetails.accountNumber || '');
      setModalAccountName(savedBankDetails.fullName || savedBankDetails.accountHolderName || currentUser?.name || '');
      setModalCountry(savedBankDetails.country || savedBankDetails.bankCountry || 'Kenya');
    } else {
      setModalAccountName(currentUser?.name || '');
      setModalCountry('Kenya');
    }
  }, [savedBankDetails, currentUser, isWithdrawModalOpen]);

  // Fetch real reviews
  useEffect(() => {
    const fetchRealReviews = async () => {
      try {
        const res = await apiFetch('course-ratings.php');
        if (res && res.success && Array.isArray(res.data)) {
          setRealReviews(res.data);
        }
      } catch (e) {
        console.warn('Failed to load real reviews:', e);
      }
    };
    fetchRealReviews();
  }, []);

  // Fetch real transactions and withdrawals from backend
  const fetchData = async (silent = false) => {
    if (!silent) setLoadingData(true);
    setIsRefreshing(true);
    try {
      const courseIds = courses.map(c => c.id);
      
      // 1. Fetch real earned transactions
      const earnedData = await subscriptionService.getInstructorTransactions({
        instructorId: currentUser?.id,
        instructorEmail: currentUser?.email,
        instructorName: currentUser?.name,
        courseIds: courseIds.length > 0 ? courseIds : undefined
      });
      if (Array.isArray(earnedData)) {
        setEarnedTransactions(earnedData);
      }

      // 2. Fetch real withdrawal transactions
      const withdrawnData = await withdrawalService.getWithdrawals({
        instructorId: currentUser?.id,
        instructorEmail: currentUser?.email
      });
      if (Array.isArray(withdrawnData)) {
        setWithdrawnTransactions(withdrawnData);
      }
    } catch (err) {
      console.warn('Failed to load instructor analytics financial data:', err);
    } finally {
      setLoadingData(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser, courses]);

  // Financial Calculations (normalized in USD base)
  const totalEarned = useMemo(() => {
    return earnedTransactions.reduce((acc, curr) => {
      const raw = Number(curr.coursePrice || curr.amount || curr.amountKes || 0);
      const amountInUsd = curr.currency === 'KES'
        ? currencyService.convertAmount(raw, 'KES', 'USD', currenciesList)
        : raw;
      return acc + (isNaN(amountInUsd) ? 0 : amountInUsd);
    }, 0);
  }, [earnedTransactions, currenciesList]);

  const totalWithdrawn = useMemo(() => {
    return withdrawnTransactions.reduce((acc, curr) => {
      if (curr.status === 'declined') return acc;
      const amount = Number(curr.amount || 0);
      const amountInUsd = curr.currency === 'KES'
        ? currencyService.convertAmount(amount, 'KES', 'USD', currenciesList)
        : amount;
      return acc + (isNaN(amountInUsd) ? 0 : amountInUsd);
    }, 0);
  }, [withdrawnTransactions, currenciesList]);

  // Currency Converter helper for display
  const getDisplayAmount = (amount: number, isCoursePrice: boolean = false) => {
    const sourceCurrency = isCoursePrice ? 'USD' : (systemCurrency || 'USD');
    const converted = currencyService.convertAmount(amount, sourceCurrency, systemCurrency, currenciesList);
    const symbol = currenciesList.find(c => c.code === systemCurrency)?.symbol || systemCurrency;
    return `${symbol} ${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const revenueBalance = useMemo(() => {
    return Math.max(0, totalEarned - totalWithdrawn);
  }, [totalEarned, totalWithdrawn]);

  const totalSettled = useMemo(() => {
    return withdrawnTransactions
      .filter(w => w.status === 'settled')
      .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  }, [withdrawnTransactions]);

  const totalPendingSettlement = useMemo(() => {
    return withdrawnTransactions
      .filter(w => w.status === 'pending' || w.status === 'processing')
      .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  }, [withdrawnTransactions]);

  const totalLearnersCount = courses.reduce((acc, c) => acc + (c.learnersEnrolled || 0), 0) + earnedTransactions.length;
  const totalReviews = realReviews.length > 0 ? realReviews.length : courses.reduce((acc, c) => acc + (c.reviewCount || 0), 0);
  const weightedRatingSum = realReviews.length > 0 
    ? realReviews.reduce((acc, r) => acc + Number(r.rating), 0) 
    : courses.reduce((acc, c) => acc + (c.rating * (c.reviewCount || 0)), 0);
  const averageRating = totalReviews > 0 ? (weightedRatingSum / totalReviews).toFixed(2) : '5.00';

  // Current Month Tax Analytics Calculations (Compliant with Tax, Pricing & Currency Terms)
  const currentMonthTaxData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentMonthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });

    // Strict filter for current calendar month
    const strictMonthTransactions = earnedTransactions.filter(tx => {
      const dateStr = tx.activatedAt || tx.enrolledAt || (tx as any).date || (tx as any).created_at;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return false;
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    // If transactions exist this month, calculate on them; otherwise, calculate on active period transactions
    const effectiveTx = strictMonthTransactions.length > 0 ? strictMonthTransactions : earnedTransactions;
    const isStrictMonth = strictMonthTransactions.length > 0;

    let grossSalesUsd = 0;
    let domesticTaxableSalesUsd = 0;
    let exportZeroRatedSalesUsd = 0;

    effectiveTx.forEach(curr => {
      const raw = Number(curr.coursePrice || curr.amount || curr.amountKes || 0);
      const amountInUsd = curr.currency === 'KES'
        ? currencyService.convertAmount(raw, 'KES', 'USD', currenciesList)
        : raw;
      const validUsd = isNaN(amountInUsd) ? 0 : amountInUsd;
      grossSalesUsd += validUsd;

      // Check if domestic vs exported (per Section 2.2 of Tax Terms)
      // Kenyan domestic indicators: M-Pesa payment, phone with +254 / 254 / 07 / 01, KES currency
      const isDomestic = 
        curr.paymentMethod === 'payhero_stk' || 
        Boolean(curr.mpesaReceipt) || 
        (curr.phoneNumber && (curr.phoneNumber.startsWith('+254') || curr.phoneNumber.startsWith('254') || curr.phoneNumber.startsWith('07') || curr.phoneNumber.startsWith('01'))) ||
        curr.currency === 'KES';

      if (isDomestic) {
        domesticTaxableSalesUsd += validUsd;
      } else {
        exportZeroRatedSalesUsd += validUsd;
      }
    });

    // Prevailing statutory VAT rate per Section 2.2 is 16% on taxable domestic sales
    const statutoryVatRate = 0.16;
    const estimatedTaxLiabilityUsd = domesticTaxableSalesUsd * statutoryVatRate;

    return {
      monthLabel: currentMonthName,
      isStrictMonth,
      txCount: effectiveTx.length,
      grossSalesUsd,
      domesticTaxableSalesUsd,
      exportZeroRatedSalesUsd,
      statutoryRatePercent: 16,
      estimatedTaxLiabilityUsd
    };
  }, [earnedTransactions, currenciesList]);

  const estimatedTaxInSystemCurrency = useMemo(() => {
    return currencyService.convertAmount(
      currentMonthTaxData.estimatedTaxLiabilityUsd,
      'USD',
      systemCurrency,
      currenciesList
    );
  }, [currentMonthTaxData.estimatedTaxLiabilityUsd, systemCurrency, currenciesList]);

  const monthGrossSalesInSystemCurrency = useMemo(() => {
    return currencyService.convertAmount(
      currentMonthTaxData.grossSalesUsd,
      'USD',
      systemCurrency,
      currenciesList
    );
  }, [currentMonthTaxData.grossSalesUsd, systemCurrency, currenciesList]);

  const domesticTaxableInSystemCurrency = useMemo(() => {
    return currencyService.convertAmount(
      currentMonthTaxData.domesticTaxableSalesUsd,
      'USD',
      systemCurrency,
      currenciesList
    );
  }, [currentMonthTaxData.domesticTaxableSalesUsd, systemCurrency, currenciesList]);

  const exportSalesInSystemCurrency = useMemo(() => {
    return currencyService.convertAmount(
      currentMonthTaxData.exportZeroRatedSalesUsd,
      'USD',
      systemCurrency,
      currenciesList
    );
  }, [currentMonthTaxData.exportZeroRatedSalesUsd, systemCurrency, currenciesList]);

  // Filtered lists for tables
  const filteredEarned = useMemo(() => {
    if (!searchTerm.trim()) return earnedTransactions;
    const term = searchTerm.toLowerCase();
    return earnedTransactions.filter(tx => 
      (tx.courseTitle || '').toLowerCase().includes(term) ||
      (tx.studentName || '').toLowerCase().includes(term) ||
      (tx.studentEmail || '').toLowerCase().includes(term) ||
      (tx.transactionCode || '').toLowerCase().includes(term) ||
      (tx.id || '').toLowerCase().includes(term)
    );
  }, [earnedTransactions, searchTerm]);

  const filteredWithdrawn = useMemo(() => {
    if (!searchTerm.trim()) return withdrawnTransactions;
    const term = searchTerm.toLowerCase();
    return withdrawnTransactions.filter(w => 
      (w.reference || '').toLowerCase().includes(term) ||
      (w.bankName || '').toLowerCase().includes(term) ||
      (w.accountNumber || '').toLowerCase().includes(term) ||
      (w.status || '').toLowerCase().includes(term) ||
      (w.id || '').toLowerCase().includes(term)
    );
  }, [withdrawnTransactions, searchTerm]);

  // Handle Withdrawal Request Submission
  const handleRequestWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError('');
    setWithdrawSuccessMsg('');

    const amountNum = parseFloat(withdrawAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setWithdrawError('Please enter a valid amount greater than 0.');
      return;
    }

    const availableBalanceInSelectedCurrency = currencyService.convertAmount(revenueBalance, 'USD', systemCurrency, currenciesList);
    const activeCurrencySymbol = currenciesList.find(c => c.code === systemCurrency)?.symbol || systemCurrency;

    if (amountNum > availableBalanceInSelectedCurrency + 0.001) {
      setWithdrawError(`Requested amount exceeds your available revenue balance of ${activeCurrencySymbol} ${availableBalanceInSelectedCurrency.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`);
      return;
    }

    const effectiveBankName = modalBankName.trim() || savedBankDetails?.bankName;
    const effectiveAccNumber = modalAccountNumber.trim() || savedBankDetails?.accountNumber;
    const effectiveAccName = modalAccountName.trim() || savedBankDetails?.fullName || currentUser?.name || 'Instructor';
    const effectiveCountry = modalCountry.trim() || savedBankDetails?.country || 'Kenya';

    if (!effectiveBankName || !effectiveAccNumber) {
      setWithdrawError('Please provide destination bank name and account number for settlement.');
      return;
    }

    // Persist bank details if newly entered
    try {
      const updatedDetails = {
        bankName: effectiveBankName,
        accountNumber: effectiveAccNumber,
        fullName: effectiveAccName,
        accountHolderName: effectiveAccName,
        country: effectiveCountry,
        bankCountry: effectiveCountry,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem('uqlearn_bank_details', JSON.stringify(updatedDetails));
    } catch (e) {}

    // Convert amount in selected currency to USD ($) in the background to save to settlement ledger
    const finalAmountInUsd = Number(currencyService.convertAmount(amountNum, systemCurrency, 'USD', currenciesList).toFixed(2));

    setIsSubmittingWithdrawal(true);
    try {
      const result = await withdrawalService.requestWithdrawal({
        instructorId: currentUser?.id || 'instructor-1',
        instructorEmail: currentUser?.email || 'instructor@uqlearn.org',
        instructorName: currentUser?.name || 'Instructor',
        amount: finalAmountInUsd,
        currency: 'USD',
        bankName: effectiveBankName,
        accountNumber: effectiveAccNumber,
        accountName: effectiveAccName,
        country: effectiveCountry,
        notes: withdrawNotes.trim()
      });

      if (result.success) {
        setWithdrawSuccessMsg(result.message || 'Withdrawal request submitted! Funds will settle to your bank in 1-3 working days.');
        setWithdrawAmount('');
        setWithdrawNotes('');
        await fetchData(true);
        setActiveTxTab('withdrawn');
        setTimeout(() => {
          setIsWithdrawModalOpen(false);
          setWithdrawSuccessMsg('');
        }, 2200);
      } else {
        setWithdrawError(result.message || 'Failed to submit withdrawal request. Please try again.');
      }
    } catch (err: any) {
      setWithdrawError(err?.message || 'An unexpected error occurred while processing withdrawal.');
    } finally {
      setIsSubmittingWithdrawal(false);
    }
  };

  const setPercentageAmount = (percentage: number) => {
    if (revenueBalance <= 0) return;
    const val = Math.floor((revenueBalance * percentage) / 100);
    setWithdrawAmount(val.toString());
  };

  const handleExportCSV = () => {
    if (activeTxTab === 'earned') {
      if (filteredEarned.length === 0) return;
      const headers = ['Transaction ID', 'Course Title', 'Learner Name', 'Learner Email', 'Payment Method', 'Amount (KES)', 'Date', 'Status'];
      const rows = filteredEarned.map(tx => [
        tx.transactionCode || tx.id,
        `"${(tx.courseTitle || '').replace(/"/g, '""')}"`,
        `"${(tx.studentName || '').replace(/"/g, '""')}"`,
        tx.studentEmail || '',
        tx.paymentMethod || 'online',
        tx.coursePrice || tx.amount || 0,
        tx.activatedAt || tx.enrolledAt || '',
        tx.status
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `uqlearn-analytics-earned-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      if (filteredWithdrawn.length === 0) return;
      const headers = ['Reference', 'Destination Bank', 'Account Number', 'Beneficiary', 'Amount (KES)', 'Requested Date', 'Settlement Timeline', 'Status'];
      const rows = filteredWithdrawn.map(w => [
        w.reference || w.id,
        `"${(w.bankName || '').replace(/"/g, '""')}"`,
        w.accountNumber || '',
        `"${(w.accountName || '').replace(/"/g, '""')}"`,
        w.amount,
        w.requestedAt || '',
        '1-3 Working Days',
        w.status
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `uqlearn-analytics-withdrawals-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      
      {/* 1. FINANCIAL EXECUTIVE ROW (Unboxed & Clean) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Gross Earned
          </span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {currenciesList.find(c => c.code === systemCurrency)?.symbol || systemCurrency}
            </span>
            <span className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              {currencyService.convertAmount(totalEarned, 'USD', systemCurrency, currenciesList).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3 self-start sm:self-auto shrink-0">
          <button
            onClick={() => fetchData(false)}
            disabled={isRefreshing}
            title="Refresh Real Balances"
            className="p-2.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
          </button>

          <button
            onClick={() => {
              if (onSelectTab) {
                onSelectTab('request-withdrawal' as InstructorTabKey);
              }
            }}
            className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs rounded-md shadow-xs hover:shadow transition-all cursor-pointer"
          >
            <Landmark className="w-4 h-4" />
            <span>Request Withdrawal</span>
            <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>
      </div>



      {/* 2. SYSTEM CURRENCY PREFERENCE (Moved from Payouts) */}
      <div className="p-5 sm:p-6 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
        <div className="flex items-center space-x-2">
          <Globe className="w-4 h-4 text-indigo-500" />
          <label className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
            System Currency Preference
          </label>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Select your preferred system currency for reporting, earnings calculation, and withdrawal requests.
        </p>
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">
              Active Currency: <strong className="text-indigo-600 dark:text-indigo-400">{systemCurrency}</strong>
            </span>
          </div>

          <select
            value={systemCurrency}
            onChange={(e) => {
              const chosen = currenciesList.find(c => c.code === e.target.value);
              if (chosen) handleUpdateCurrency(chosen.code, chosen.name);
            }}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 cursor-pointer shadow-2xs"
          >
            {currenciesList.map((curr) => (
              <option key={curr.code} value={curr.code}>
                {curr.name} ({curr.code}) {systemCurrency === curr.code ? '✓ (Active)' : ''}
              </option>
            ))}
          </select>
        </div>

        {payoutMsg && (
          <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold rounded-md flex items-center space-x-2 animate-fadeIn">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{payoutMsg}</span>
          </div>
        )}
      </div>

      {/* TAX ANALYTICS & POLICY CARD */}
      <div className="p-5 sm:p-6 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Scale className="w-4 h-4 text-amber-500" />
            <label className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Tax Analytics & Policy Compliance
            </label>
          </div>
          <button
            onClick={() => {
              if (onSelectTab) {
                onSelectTab('terms-of-service' as InstructorTabKey);
              }
            }}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-md transition-all cursor-pointer shadow-2xs"
          >
            <FileText className="w-3.5 h-3.5 text-amber-500" />
            <span>Terms of Use</span>
            <ExternalLink className="w-3 h-3 ml-0.5 text-slate-400" />
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Review instructor tax withholding policies, regulatory compliance standards, and platform terms of service.
        </p>
      </div>

      {/* 3. TRANSACTION HUB: EARNED VS WITHDRAWN */}
      <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        
        {/* Navigation & Controls Bar */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Tab Switcher */}
          <div className="flex items-center space-x-1 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-md max-w-fit">
            <button
              onClick={() => setActiveTxTab('earned')}
              className={`px-4 sm:px-5 py-2 rounded-md font-bold text-xs sm:text-sm transition-all flex items-center space-x-2 cursor-pointer ${
                activeTxTab === 'earned'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Earned</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-black ${
                activeTxTab === 'earned'
                  ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                {earnedTransactions.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTxTab('withdrawn')}
              className={`px-4 sm:px-5 py-2 rounded-md font-bold text-xs sm:text-sm transition-all flex items-center space-x-2 cursor-pointer ${
                activeTxTab === 'withdrawn'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Withdrawn</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-black ${
                activeTxTab === 'withdrawn'
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                {withdrawnTransactions.length}
              </span>
            </button>
          </div>

          {/* Search and Action Tools */}
          <div className="flex items-center space-x-3">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={activeTxTab === 'earned' ? "Search student, course, code..." : "Search reference, bank..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

        </div>

        {/* TAB 1: EARNED TRANSACTIONS TABLE */}
        {activeTxTab === 'earned' && (
          <div className="overflow-x-auto">
            <div className="px-5 pt-4 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Earned</h3>
            </div>
            {loadingData ? (
              <div className="py-16 text-center space-y-3">
                <RefreshCw className="w-8 h-8 mx-auto text-indigo-500 animate-spin" />
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Loading real earned transactions...
                </p>
              </div>
            ) : filteredEarned.length === 0 ? (
              <div className="py-16 px-6 text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 flex items-center justify-center">
                  <TrendingUp className="w-7 h-7" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base">
                    {searchTerm ? "No matching transactions found" : "No earned transactions recorded yet"}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {searchTerm 
                      ? `We couldn't find any earned orders matching "${searchTerm}". Try another search term.`
                      : "When learners enroll and pay for your courses (via M-Pesa, Card, or Online Checkout), verified revenue will automatically appear here."}
                  </p>
                </div>
                {onSelectTab && (
                  <button
                    onClick={() => onSelectTab('add-course')}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create New Course</span>
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Reference / ID</th>
                    <th className="py-3.5 px-4">Course</th>
                    <th className="py-3.5 px-4">Learner</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredEarned.map((tx, idx) => {
                    const price = Number(tx.coursePrice || tx.amount || tx.amountKes || 0);
                    const dateStr = tx.activatedAt || tx.enrolledAt || (tx as any).createdAt || 'Recent';
                    return (
                      <tr key={tx.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-4 px-4 sm:px-6 font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                          {tx.transactionCode || tx.id.slice(0, 10).toUpperCase()}
                        </td>
                        <td className="py-4 px-4 font-semibold text-slate-800 dark:text-slate-200 max-w-xs truncate">
                          {tx.courseTitle || 'Course Purchase'}
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-medium text-slate-900 dark:text-slate-200">{tx.studentName || 'Learner'}</div>
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">{tx.studentEmail || 'learner@uqlearn.org'}</div>
                        </td>
                        <td className="py-4 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                          {currenciesList.find(c => c.code === systemCurrency)?.symbol || systemCurrency} {currencyService.convertAmount(price, 'USD', systemCurrency, currenciesList).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-4 sm:px-6 text-right text-xs text-slate-500 dark:text-slate-400">
                          {dateStr.slice(0, 10)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* TAB 2: WITHDRAWN TRANSACTIONS TABLE */}
        {activeTxTab === 'withdrawn' && (
          <div className="overflow-x-auto">
            <div className="px-5 pt-4 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Withdrawn</h3>
            </div>
            {loadingData ? (
              <div className="py-16 text-center space-y-3">
                <RefreshCw className="w-8 h-8 mx-auto text-emerald-500 animate-spin" />
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Loading withdrawal history...
                </p>
              </div>
            ) : filteredWithdrawn.length === 0 ? (
              <div className="py-16 px-6 text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-500 flex items-center justify-center">
                  <Landmark className="w-7 h-7" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base">
                    {searchTerm ? "No matching withdrawals found" : "No withdrawals requested yet"}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {searchTerm 
                      ? `No withdrawal records match "${searchTerm}".`
                      : `You currently have ${currenciesList.find(c => c.code === systemCurrency)?.symbol || systemCurrency} ${currencyService.convertAmount(revenueBalance, 'USD', systemCurrency, currenciesList).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} available in your Revenue Balance ready for bank withdrawal.`}
                  </p>
                </div>
                {revenueBalance > 0 && (
                  <button
                    onClick={() => {
                      if (onSelectTab) {
                        onSelectTab('request-withdrawal' as InstructorTabKey);
                      }
                    }}
                    className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
                  >
                    <Landmark className="w-3.5 h-3.5" />
                    <span>Request Bank Withdrawal</span>
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Withdrawal Ref</th>
                    <th className="py-3.5 px-4">Destination Bank</th>
                    <th className="py-3.5 px-4">Account Number</th>
                    <th className="py-3.5 px-4">Requested Amount</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Requested Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredWithdrawn.map((w, idx) => {
                    const amount = Number(w.amount || 0);
                    return (
                      <tr key={w.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-4 px-4 sm:px-6 font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                          {w.reference || w.id}
                        </td>
                        <td className="py-4 px-4 font-semibold text-slate-800 dark:text-slate-200">
                          <div className="flex items-center space-x-1.5">
                            <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{w.bankName}</span>
                          </div>
                          {w.accountName && (
                            <div className="text-[11px] text-slate-400 pl-5">{w.accountName}</div>
                          )}
                        </td>
                        <td className="py-4 px-4 font-mono text-slate-700 dark:text-slate-300">
                          •••• {String(w.accountNumber).slice(-4)}
                        </td>
                        <td className="py-4 px-4 font-black text-slate-900 dark:text-slate-100">
                          {currenciesList.find(c => c.code === systemCurrency)?.symbol || systemCurrency} {currencyService.convertAmount(amount, w.currency || 'USD', systemCurrency, currenciesList).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-4 sm:px-6 text-right text-xs text-slate-500 dark:text-slate-400">
                          {w.requestedAt ? String(w.requestedAt).slice(0, 10) : 'Recent'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

      </div>

      {/* 4. WITHDRAWAL REQUEST MODAL */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-md max-w-lg w-full p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden space-y-5">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                    Request Bank Withdrawal
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Direct commercial bank payout
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsWithdrawModalOpen(false)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error & Success Messages */}
            {withdrawError && (
              <div className="p-3.5 rounded-md bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start space-x-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <div>
                  <p className="font-bold">Cannot process withdrawal</p>
                  <p>{withdrawError}</p>
                </div>
              </div>
            )}

            {withdrawSuccessMsg && (
              <div className="p-3.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-start space-x-3">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                <div>
                  <p className="font-bold">Request Submitted Successfully!</p>
                  <p>{withdrawSuccessMsg}</p>
                </div>
              </div>
            )}

            {/* Direct Bank Settlement Guarantee Notice in Modal */}
            <div className="p-3.5 rounded-md bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-start space-x-2.5 text-xs text-emerald-900 dark:text-emerald-200">
              <Landmark className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold flex items-center gap-1.5">
                    <span>Direct Bank Settlement Guarantee</span>
                    <span className="px-1.5 py-0.5 rounded-xs bg-emerald-200 dark:bg-emerald-900/60 text-[10px] font-bold">1-3 Working Days</span>
                  </p>
                  {onSelectTab && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsWithdrawModalOpen(false);
                        onSelectTab('payouts');
                      }}
                      className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold hover:underline cursor-pointer"
                    >
                      Configure Details &rarr;
                    </button>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-emerald-700/90 dark:text-emerald-400">
                  Withdrawal requests are processed promptly and settled directly into your nominated commercial bank account.
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleRequestWithdrawalSubmit} className="space-y-4">
              
              {/* Available Balance Preview */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-md border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Available Revenue Balance
                  </span>
                  <p className="text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5">
                    KES {revenueBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    Ready to Withdraw
                  </span>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Withdrawal Amount (KES) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                    KES
                  </span>
                  <input
                    type="number"
                    min="1"
                    max={revenueBalance}
                    step="any"
                    required
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Enter amount to withdraw"
                    className="w-full pl-12 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>

                {/* Quick Selection Shortcuts */}
                {revenueBalance > 0 && (
                  <div className="flex items-center space-x-2 pt-1">
                    <span className="text-[11px] text-slate-400">Quick set:</span>
                    <button
                      type="button"
                      onClick={() => setPercentageAmount(25)}
                      className="px-2.5 py-0.5 text-[11px] font-bold rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      25%
                    </button>
                    <button
                      type="button"
                      onClick={() => setPercentageAmount(50)}
                      className="px-2.5 py-0.5 text-[11px] font-bold rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => setPercentageAmount(100)}
                      className="px-2.5 py-0.5 text-[11px] font-bold rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      Max (100%)
                    </button>
                  </div>
                )}
              </div>

              {/* Destination Bank Details */}
              <div className="p-3.5 rounded-md bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                    <Building className="w-4 h-4 text-emerald-500" />
                    <span>Beneficiary Bank Account</span>
                  </span>
                  {savedBankDetails && (
                    <span className="text-[10px] text-slate-400">Using configured details</span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      Bank Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={modalBankName}
                      onChange={(e) => setModalBankName(e.target.value)}
                      placeholder="e.g. Equity Bank, KCB, NCBA"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      Account Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={modalAccountNumber}
                      onChange={(e) => setModalAccountNumber(e.target.value)}
                      placeholder="e.g. 011002345678"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    value={modalAccountName}
                    onChange={(e) => setModalAccountName(e.target.value)}
                    placeholder="Full legal name on bank account"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  disabled={isSubmittingWithdrawal}
                  className="px-4 py-2 rounded-md text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWithdrawal || revenueBalance <= 0 || !withdrawAmount}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-md text-xs font-bold shadow-xs hover:shadow transition-all flex items-center space-x-2 cursor-pointer"
                >
                  {isSubmittingWithdrawal ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting Request...</span>
                    </>
                  ) : (
                    <>
                      <Landmark className="w-3.5 h-3.5" />
                      <span>Confirm Withdrawal</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
