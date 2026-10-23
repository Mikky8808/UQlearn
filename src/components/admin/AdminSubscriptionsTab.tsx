import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  Search, 
  Filter, 
  CreditCard, 
  Copy, 
  Check, 
  RefreshCw, 
  ShieldCheck, 
  BookOpen, 
  DollarSign, 
  FileText,
  ChevronLeft,
  ChevronRight,
  Scale,
  Star,
  Trash2,
  AlertCircle,
  Award,
  BarChart3
} from 'lucide-react';
import { CourseSubscription } from '../../types';
import { subscriptionService } from '../../services/subscription-service';
import { useApp } from '../../context/AppContext';
import { AdminRevenueTrendsChart } from './AdminRevenueTrendsChart';
import { appealService, AppealTransaction } from '../../services/appeal-service';
import { RevenueDashboard } from './RevenueDashboard';
import { currencyUtils } from '../../utils/currencyUtils';

export const AdminSubscriptionsTab: React.FC = () => {
  const { formatPrice, selectedCurrency } = useApp();
  const appealFeeText = currencyUtils.getAppealFeeFormatted(
    selectedCurrency?.code,
    selectedCurrency?.rate,
    selectedCurrency?.symbol
  );
  const appealFeeAmount = currencyUtils.getAppealFeeAmount(
    selectedCurrency?.code,
    selectedCurrency?.rate
  );
  const appealFeeSymbol = selectedCurrency?.symbol || 'KSh';
  const [financialTab, setFinancialTab] = useState<'sales' | 'appeals' | 'revenue_dashboard'>('sales');
  const [subscriptions, setSubscriptions] = useState<CourseSubscription[]>([]);
  const [appealList, setAppealList] = useState<AppealTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'rejected'>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [refreshing, setRefreshing] = useState(false);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const liveTransactions = await subscriptionService.getSuccessfulTransactions();
      if (liveTransactions && liveTransactions.length > 0) {
        setSubscriptions(liveTransactions);
      }
    } catch (e) {
      console.warn('Failed loading from transactions API:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadAppeals = async () => {
    setAppealList(appealService.getAppealTransactions());
    try {
      const liveList = await appealService.fetchLiveAppeals();
      if (liveList && liveList.length > 0) {
        setAppealList(liveList);
      }
    } catch (e) {
      console.warn('Live appeal fetch:', e);
    }
  };

  useEffect(() => {
    loadTransactions();
    loadAppeals();

    const unsubscribe = subscriptionService.subscribeToAllSubscriptions((list) => {
      const sorted = list.sort((a, b) => new Date(b.enrolledAt || 0).getTime() - new Date(a.enrolledAt || 0).getTime());
      setSubscriptions(prev => {
        if (sorted.length > 0) return sorted;
        return prev;
      });
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateAppealDecision = async (appealId: string, decision: 'upheld' | 'partially_upheld' | 'removed') => {
    if (!window.confirm(`Are you sure you want to issue decision "${decision.toUpperCase()}" for appeal #${appealId}? The $0.55 fee payment remains charged & non-refundable.`)) {
      return;
    }
    await appealService.updateAppealDecision(appealId, decision);
    loadAppeals();
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  const formatSubscriptionPrice = (sub: CourseSubscription) => {
    const rawPrice = Number(sub.coursePrice || sub.amount || 0);
    if (rawPrice === 0) return <span className="text-emerald-500 font-black">FREE</span>;

    const kesVal = sub.amountKes || (sub.currency === 'KES' || sub.currency === 'KSh' || rawPrice >= 100 ? rawPrice : Math.round(rawPrice * 130));
    const usdVal = sub.amountUsd || (sub.currency === 'KES' || sub.currency === 'KSh' || rawPrice >= 100 ? Number((rawPrice / 130).toFixed(2)) : rawPrice);

    return (
      <div>
        <span className="font-bold text-slate-900 dark:text-slate-100">
          KSh {kesVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span className="block text-[10px] text-slate-400 font-medium">
          (≈ ${usdVal.toFixed(2)} USD)
        </span>
      </div>
    );
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesQuery = 
      sub.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.studentEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.courseTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sub.status !== 'rejected' && sub.transactionCode?.toLowerCase().includes(searchQuery.toLowerCase()));
      
    if (statusFilter === 'all') return matchesQuery;
    return matchesQuery && sub.status === statusFilter;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredSubscriptions.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSubscriptions = filteredSubscriptions.slice(startIndex, startIndex + itemsPerPage);

  const pendingCount = subscriptions.filter(s => s.status === 'pending').length;
  const activeCount = subscriptions.filter(s => s.status === 'active').length;
  const totalVerifiedRevenue = subscriptions
    .filter(s => s.status === 'active')
    .reduce((acc, curr) => acc + (curr.coursePrice || 0), 0);

  return (
    <div className="space-y-6">
      {/* Subtab Selector Bar */}
      <div className="flex flex-wrap items-center space-x-2 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shrink-0">
        <button
          onClick={() => setFinancialTab('sales')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
            financialTab === 'sales'
              ? 'bg-teal-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Course Sales & Subscriptions</span>
        </button>

        <button
          onClick={() => setFinancialTab('appeals')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
            financialTab === 'appeals'
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Review Appeal Fees ({appealFeeText} Flat Payment)</span>
          <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-amber-700 text-amber-100">
            {appealList.length}
          </span>
        </button>

        <button
          onClick={() => setFinancialTab('revenue_dashboard')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
            financialTab === 'revenue_dashboard'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Revenue Dashboard (M-Pesa vs USD)</span>
        </button>
      </div>

      {/* VIEW 1: COURSE SALES & SUBSCRIPTIONS */}
      {financialTab === 'sales' && (
        <div className="space-y-6">
          {/* Simple Header */}
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Transactions</h2>
                <p className="text-xs text-slate-500 font-medium">View all successful payment transactions synced from M-Pesa & PayHero.</p>
              </div>
            </div>
            <button
              onClick={handleManualRefresh}
              disabled={refreshing || loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 text-teal-600 ${refreshing || loading ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Syncing...' : 'Sync Transactions'}</span>
            </button>
          </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Total Transactions</p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{subscriptions.length}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl relative">
            <Clock className="w-6 h-6" />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full animate-ping" />
            )}
          </div>
          <div>
            <p className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Pending</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{pendingCount}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Successful</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{activeCount}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Total Revenue</p>
            <p className="text-2xl font-black text-purple-600 dark:text-purple-400">
              KES {Number(totalVerifiedRevenue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Real Daily Revenue Trends Chart with 7D/14D/30D & Metric Toggles */}
      <AdminRevenueTrendsChart initialSubscriptions={subscriptions} onRefresh={handleManualRefresh} />

      {/* Filters & Search */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search learner, email or course..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        
        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
          <Filter className="w-4 h-4 text-slate-400 shrink-0 ml-1 mr-1" />
          {(['all', 'active', 'pending', 'rejected'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setStatusFilter(tab);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === tab
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab === 'active' ? 'Successful' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Table View */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Learner Name & Email</th>
                <th className="py-3 px-4">Course Enrolled</th>
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4">Transaction Code</th>
                <th className="py-3 px-4">Enrolled Date</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
                    Loading transactions...
                  </td>
                </tr>
              ) : paginatedSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    No transactions match your search or filter.
                  </td>
                </tr>
              ) : (
                paginatedSubscriptions.map((sub) => {
                  const shouldHideCode = sub.status === 'rejected' || sub.status === 'pending' || sub.status === 'FAILED' || sub.status === 'QUEUED';
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      {/* Learner Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{sub.studentName || 'Unknown Learner'}</div>
                        <div className="text-[11px] text-slate-400">{sub.studentEmail || 'No email provided'}</div>
                      </td>
                      {/* Course Enrolled */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-bold text-slate-900 dark:text-slate-100 line-clamp-1">{sub.courseTitle || 'Untitled Course'}</div>
                      </td>
                      {/* Price */}
                      <td className="py-3.5 px-4 font-black text-slate-900 dark:text-slate-100">
                        {formatSubscriptionPrice(sub)}
                      </td>
                      {/* Transaction Code - Hide/Mask if FAILED, QUEUED, pending, or rejected */}
                      <td className="py-3.5 px-4 font-mono">
                        {shouldHideCode ? (
                          <span className="text-slate-400 italic bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-[10px]">
                            •••••••• ({sub.status.toUpperCase()})
                          </span>
                        ) : (
                          <div className="flex items-center space-x-1.5">
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-teal-600 dark:text-teal-400 font-bold border border-slate-200 dark:border-slate-700">
                              {sub.transactionCode || 'N/A'}
                            </span>
                            {sub.transactionCode && (
                              <button
                                onClick={() => handleCopyCode(sub.transactionCode)}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                                title="Copy Transaction Code"
                              >
                                {copiedCode === sub.transactionCode ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      {/* Enrolled Date */}
                      <td className="py-3.5 px-4 text-[11px] text-slate-500 whitespace-nowrap">
                        {sub.enrolledAt ? new Date(sub.enrolledAt).toLocaleString() : 'N/A'}
                      </td>
                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        {sub.status === 'pending' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-black rounded-full border border-amber-300 dark:border-amber-800 text-[10px]">
                            <Clock className="w-3 h-3 text-amber-500" />
                            <span>Pending</span>
                          </span>
                        )}
                        {sub.status === 'active' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-black rounded-full border border-emerald-300 dark:border-emerald-800 text-[10px]">
                            <CheckCircle className="w-3 h-3 text-emerald-500" />
                            <span>Successful</span>
                          </span>
                        )}
                        {sub.status === 'rejected' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 font-black rounded-full border border-rose-300 dark:border-rose-800 text-[10px]">
                            <XCircle className="w-3 h-3 text-rose-500" />
                            <span>Failed / Rejected</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

          {/* Pagination Footer */}
          {filteredSubscriptions.length > 0 && (
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Showing <span className="font-bold">{startIndex + 1}</span> to <span className="font-bold">{Math.min(startIndex + itemsPerPage, filteredSubscriptions.length)}</span> of <span className="font-bold">{filteredSubscriptions.length}</span> transactions
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 font-bold text-slate-700 dark:text-slate-300">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* VIEW 2: REVIEW APPEAL FEES ({appealFeeText} FLAT PAYMENT) */}
      {financialTab === 'appeals' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800">
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[10px] font-black uppercase mb-1">
                  <span>Non-Refundable {appealFeeText} Administrative Revenue</span>
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Review Appeal Fees Ledger
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Track {appealFeeText} ({selectedCurrency?.code === 'USD' ? '$0.55' : '$0.55 USD'}) flat administrative appeal fees deducted from course earnings upon appeal submission.
                </p>
              </div>
            </div>
            <button
              onClick={loadAppeals}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-amber-600" />
              <span>Refresh Ledger</span>
            </button>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Appeal Fees Collected</p>
                <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                  {appealFeeSymbol} {(appealList.length * appealFeeAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Under Investigation</p>
                <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                  {appealList.filter(a => a.review_status === 'under_appeal').length}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Upheld Appeals</p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {appealList.filter(a => a.review_status === 'upheld').length}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Reviews Removed</p>
                <p className="text-2xl font-black text-rose-600 dark:text-rose-400">
                  {appealList.filter(a => a.review_status === 'removed').length}
                </p>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">Transaction Ref</th>
                  <th className="py-3.5 px-4">Instructor & Course</th>
                  <th className="py-3.5 px-4">Learner & Feedback</th>
                  <th className="py-3.5 px-4">Cited Section 3 Clause</th>
                  <th className="py-3.5 px-4">Fee Charged</th>
                  <th className="py-3.5 px-4">Review Status</th>
                  <th className="py-3.5 px-4 text-right">Reviewer Decision Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {appealList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-slate-500">
                      No review appeal transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  appealList.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 text-xs">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {app.id}
                        <div className="text-[10px] text-slate-400 font-normal font-sans">
                          {new Date(app.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                        <div>{app.instructor_name}</div>
                        <div className="text-[11px] text-slate-500 font-medium">{app.course_title}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{app.student_name} ({app.rating} ★)</div>
                        <p className="text-[11px] text-slate-500 italic line-clamp-1 max-w-xs">{app.feedback}</p>
                      </td>
                      <td className="py-3.5 px-4 text-[11px] text-amber-700 dark:text-amber-300 font-semibold max-w-xs">
                        {app.clause}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                        {currencyUtils.getAppealFeeFormatted(selectedCurrency?.code, selectedCurrency?.rate, selectedCurrency?.symbol)}
                        <div className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase">
                          {app.fee_status}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {app.review_status === 'under_appeal' && (
                          <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-black text-[10px] uppercase">
                            Under Appeal
                          </span>
                        )}
                        {app.review_status === 'upheld' && (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-black text-[10px] uppercase">
                            Upheld (Published)
                          </span>
                        )}
                        {app.review_status === 'partially_upheld' && (
                          <span className="px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 font-black text-[10px] uppercase">
                            Partially Upheld
                          </span>
                        )}
                        {app.review_status === 'removed' && (
                          <span className="px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 font-black text-[10px] uppercase">
                            Removed (Deleted)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {app.review_status === 'under_appeal' ? (
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => handleUpdateAppealDecision(app.id, 'upheld')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer"
                              title="Keep review live"
                            >
                              Uphold
                            </button>
                            <button
                              onClick={() => handleUpdateAppealDecision(app.id, 'partially_upheld')}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer"
                              title="Modify feedback text"
                            >
                              Partial
                            </button>
                            <button
                              onClick={() => handleUpdateAppealDecision(app.id, 'removed')}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer"
                              title="Delete violating review"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-400">Decision Issued</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: REVENUE DASHBOARD (M-PESA VS USD) */}
      {financialTab === 'revenue_dashboard' && (
        <RevenueDashboard />
      )}
    </div>
  );
};
