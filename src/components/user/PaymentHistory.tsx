import React, { useEffect, useState, useMemo } from 'react';
import { subscriptionService } from '../../services/subscription-service';
import { CourseSubscription } from '../../types';
import { useApp } from '../../context/AppContext';
import { 
  Receipt, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Search, 
  RefreshCw, 
  FileText, 
  Printer, 
  X, 
  CreditCard,
  ShieldCheck,
  Calendar,
  DollarSign
} from 'lucide-react';
import { DataNotFound } from '../common/DataNotFound';

export const PaymentHistory: React.FC = () => {
  const { currentUser, formatPrice } = useApp();
  const [subscriptions, setSubscriptions] = useState<CourseSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');

  // Selected subscription for receipt modal
  const [selectedSub, setSelectedSub] = useState<CourseSubscription | null>(null);

  const fetchHistory = async (showRefreshSpinner = false) => {
    if (!currentUser) return;
    try {
      if (showRefreshSpinner) setRefreshing(true);
      else setLoading(true);
      
      setError(null);
      const data = await subscriptionService.getStudentSubscriptions(currentUser.id, currentUser.email);
      // Sort by enrolledAt descending
      const sorted = data.sort((a, b) => new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime());
      setSubscriptions(sorted);
    } catch (err: any) {
      console.error('Error fetching payment history:', err);
      setError(err.message || 'Failed to load payment history.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [currentUser]);

  // Filtered subscriptions list (showing active payments only)
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter(sub => {
      // Exclude non-active transactions
      if (sub.status !== 'active') return false;

      const q = searchQuery.toLowerCase().trim();
      return !q || 
        sub.courseTitle.toLowerCase().includes(q) ||
        (sub.transactionCode && sub.transactionCode.toLowerCase().includes(q)) ||
        (sub.id && sub.id.toLowerCase().includes(q)) ||
        (sub.paymentMethod && sub.paymentMethod.toLowerCase().includes(q));
    });
  }, [subscriptions, searchQuery]);

  // Financial Stats
  const totalSpent = useMemo(() => {
    return subscriptions
      .filter(s => s.status === 'active')
      .reduce((sum, s) => sum + (s.coursePrice || 0), 0);
  }, [subscriptions]);

  const activeCount = useMemo(() => {
    return subscriptions.filter(s => s.status === 'active').length;
  }, [subscriptions]);

  const handlePrintReceipt = () => {
    window.print();
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Refresh Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            Payment History
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review your past transactions, receipts, and course subscriptions.
          </p>
        </div>

        <button
          onClick={() => fetchHistory(true)}
          disabled={loading || refreshing}
          className="inline-flex items-center space-x-2 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer self-start sm:self-auto disabled:opacity-50"
          title="Refresh subscriptions"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-teal-600' : ''}`} />
          <span>{refreshing ? 'Syncing...' : 'Refresh Records'}</span>
        </button>
      </div>

      {/* Search Bar */}
      {subscriptions.filter(s => s.status === 'active').length > 0 && (
        <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transaction code or course title..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-500 transition-colors"
            />
          </div>
        </div>
      )}

      {/* Main Table / Loader / Empty State */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 font-medium">Fetching payment records from subscriptions table...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-500" />
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Unable to load history</h3>
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{error}</p>
          </div>
        </div>
      ) : subscriptions.length === 0 ? (
        <DataNotFound
          title="No Payment History Found"
          message="You haven't made any course purchases or payment transactions yet."
          icon={Receipt}
        />
      ) : filteredSubscriptions.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-3">
          <Search className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            No transactions match "{searchQuery}"
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
          >
            Clear Search Filters
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="px-5 py-4 font-semibold">Enrollment Date</th>
                  <th className="px-5 py-4 font-semibold">Item / Course</th>
                  <th className="px-5 py-4 font-semibold">Price</th>
                  <th className="px-5 py-4 font-semibold">Payment Method</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Transaction Code / Ref</th>
                  <th className="px-5 py-4 font-semibold text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {filteredSubscriptions.map((sub) => {
                  const dateStr = sub.enrolledAt 
                    ? new Date(sub.enrolledAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'N/A';

                  return (
                    <tr 
                      key={sub.id} 
                      onClick={() => setSelectedSub(sub)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-4 text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors line-clamp-1">
                          {sub.courseTitle}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-black text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {formatPrice(sub.coursePrice)}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-[11px] font-bold uppercase tracking-wider">
                          {sub.paymentMethod || 'payhero_stk'}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {sub.status === 'active' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : sub.status === 'rejected' ? (
                            <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                          )}
                          <span className={`text-xs font-bold ${
                            sub.status === 'active' ? 'text-emerald-600 dark:text-emerald-400' :
                            sub.status === 'rejected' ? 'text-rose-600 dark:text-rose-400' :
                            'text-amber-600 dark:text-amber-400'
                          }`}>
                            {sub.status ? sub.status.charAt(0).toUpperCase() + sub.status.slice(1) : 'Pending'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {sub.transactionCode || 'N/A'}
                      </td>
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSub(sub);
                          }}
                          className="px-3 py-1.5 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detailed Receipt Modal */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-[#FFFDF9] dark:bg-[#1a1a1a] text-slate-900 dark:text-slate-100 border border-amber-200/60 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative space-y-5 overflow-hidden font-mono">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-300 dark:border-slate-700 pb-3 print:hidden">
              <div className="flex items-center space-x-2">
                <Receipt className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <h3 className="text-xs font-bold tracking-wider uppercase">Transaction Receipt</h3>
              </div>
              <button
                onClick={() => setSelectedSub(null)}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thermal Receipt Content */}
            <div className="space-y-4 text-center font-mono text-[11px] leading-relaxed">
              <div className="space-y-0.5">
                <h2 className="text-sm font-black tracking-widest uppercase">UQLEARN MARKETPLACE</h2>
                <p className="text-[10px] text-slate-600 dark:text-slate-400">ONLINE EDUCATION PORTAL</p>
                <p className="text-[10px] text-slate-600 dark:text-slate-400">NAIROBI, KENYA • SUPPORT@UQLEARN.ORG</p>
              </div>

              <div className="border-b border-dashed border-slate-400 dark:border-slate-600 pb-2">
                <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                  {selectedSub.enrolledAt ? new Date(selectedSub.enrolledAt).toLocaleString('en-US', {
                    month: '2-digit',
                    day: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : new Date().toLocaleString('en-US', {
                    month: '2-digit',
                    day: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              <div className="grid grid-cols-2 text-left gap-y-1 text-[10px] border-b border-dashed border-slate-400 dark:border-slate-600 pb-3">
                <div><span className="text-slate-500">CASHIER:</span> WEB</div>
                <div className="text-right"><span className="text-slate-500">RECEIPT #:</span> {selectedSub.id.replace(/[^0-9]/g, '').slice(-6) || '131005'}</div>
                <div><span className="text-slate-500">STORE ID:</span> UQL-001</div>
                <div className="text-right"><span className="text-slate-500">REGISTER:</span> R-12</div>
              </div>

              {/* Items / Course Breakdown */}
              <div className="space-y-2 text-left border-b border-dashed border-slate-400 dark:border-slate-600 pb-3">
                <div className="flex justify-between font-bold text-[11px]">
                  <span className="truncate pr-2 uppercase">{selectedSub.courseTitle || 'Professional Course Enrollment'}</span>
                  <span>{formatPrice(selectedSub.coursePrice)}</span>
                </div>
                <div className="text-[10px] text-slate-500">1X PROFESSIONAL E-LEARNING ACCESS</div>
              </div>

              {/* Totals */}
              <div className="space-y-1 text-right text-[11px] border-b border-dashed border-slate-400 dark:border-slate-600 pb-3 font-bold">
                <div className="flex justify-between text-slate-600 dark:text-slate-400 text-[10px]">
                  <span>SUBTOTAL:</span>
                  <span>{formatPrice(selectedSub.coursePrice)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400 text-[10px]">
                  <span>TAX (0%):</span>
                  <span>$0</span>
                </div>
                <div className="flex justify-between text-sm font-black text-slate-900 dark:text-white pt-1">
                  <span>TOTAL:</span>
                  <span>{formatPrice(selectedSub.coursePrice)}</span>
                </div>
              </div>

              {/* Payment Meta */}
              <div className="space-y-1 text-left text-[10px] border-b border-dashed border-slate-400 dark:border-slate-600 pb-3 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">CARD / REF:</span>
                  <span>•••• {selectedSub.transactionCode ? selectedSub.transactionCode.slice(-4) : '4411'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">TYPE:</span>
                  <span className="uppercase">{selectedSub.paymentMethod || 'M-PESA / VISA'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ENTRY:</span>
                  <span>CONTACTLESS / STK</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">STATUS:</span>
                  <span className="font-bold uppercase text-emerald-600 dark:text-emerald-400">{selectedSub.status || 'APPROVED'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">REF CODE:</span>
                  <span className="font-bold">{selectedSub.transactionCode || 'AUTH-553210'}</span>
                </div>
              </div>

              <div className="space-y-2 pt-1 text-center">
                <p className="text-[10px] font-bold tracking-wider">THANK YOU FOR LEARNING WITH US!</p>
                <div className="py-1 flex flex-col items-center justify-center space-y-1">
                  {/* Simulated Barcode */}
                  <div className="flex items-center justify-center space-x-0.5 h-10 w-full bg-white dark:bg-slate-900 py-1 px-2 border border-slate-200 dark:border-slate-800">
                    <div className="w-1 h-full bg-black dark:bg-white"></div>
                    <div className="w-0.5 h-full bg-black dark:bg-white"></div>
                    <div className="w-2 h-full bg-black dark:bg-white"></div>
                    <div className="w-1 h-full bg-black dark:bg-white"></div>
                    <div className="w-0.5 h-full bg-black dark:bg-white"></div>
                    <div className="w-3 h-full bg-black dark:bg-white"></div>
                    <div className="w-1 h-full bg-black dark:bg-white"></div>
                    <div className="w-2 h-full bg-black dark:bg-white"></div>
                    <div className="w-0.5 h-full bg-black dark:bg-white"></div>
                    <div className="w-1 h-full bg-black dark:bg-white"></div>
                    <div className="w-2 h-full bg-black dark:bg-white"></div>
                    <div className="w-1 h-full bg-black dark:bg-white"></div>
                    <div className="w-0.5 h-full bg-black dark:bg-white"></div>
                    <div className="w-3 h-full bg-black dark:bg-white"></div>
                    <div className="w-1 h-full bg-black dark:bg-white"></div>
                    <div className="w-0.5 h-full bg-black dark:bg-white"></div>
                    <div className="w-2 h-full bg-black dark:bg-white"></div>
                    <div className="w-1 h-full bg-black dark:bg-white"></div>
                  </div>
                  <span className="font-mono text-[9px] tracking-widest text-slate-600 dark:text-slate-400">
                    RT{selectedSub.id.replace(/[^0-9]/g, '').slice(-8) || '131005324'}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-3 pt-2 print:hidden">
              <button
                onClick={handlePrintReceipt}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer font-mono"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt</span>
              </button>

              <button
                onClick={() => setSelectedSub(null)}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer font-mono"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

