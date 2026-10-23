import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  CreditCard, 
  Smartphone, 
  TrendingUp, 
  RefreshCw, 
  Globe, 
  ArrowUpRight, 
  ShieldCheck, 
  BarChart3,
  Search,
  Filter
} from 'lucide-react';
import { subscriptionService } from '../../services/subscription-service';
import { currencyUtils, NormalizedTransaction } from '../../utils/currencyUtils';

export const RevenueDashboard: React.FC = () => {
  const [transactions, setTransactions] = useState<NormalizedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterChannel, setFilterChannel] = useState<'all' | 'KES' | 'USD'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const live = await subscriptionService.getSuccessfulTransactions();
      const rawList = live && live.length > 0 ? live : JSON.parse(localStorage.getItem('uqlearn_subscriptions') || '[]');
      const normalized = rawList.map((item: any) => currencyUtils.normalize(item));
      setTransactions(normalized);
    } catch (e) {
      console.warn('Failed loading revenue data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered transactions
  const filtered = transactions.filter(tx => {
    const matchesSearch = 
      tx.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.courseTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterChannel === 'all') return matchesSearch;
    return matchesSearch && tx.currency === filterChannel;
  });

  // Analytics breakdown
  const mpesaTxs = transactions.filter(tx => tx.currency === 'KES' || tx.paymentMethod === 'payhero_stk' || tx.paymentMethod === 'm-pesa');
  const usdKeyTxs = transactions.filter(tx => tx.currency === 'USD' && tx.paymentMethod !== 'payhero_stk' && tx.paymentMethod !== 'm-pesa');

  const totalKesEarnings = transactions.reduce((sum, tx) => sum + tx.amountInKes, 0);
  const totalUsdEarnings = transactions.reduce((sum, tx) => sum + tx.amountInUsd, 0);

  const mpesaTotalKes = mpesaTxs.reduce((sum, tx) => sum + tx.amountInKes, 0);
  const usdTotalUsd = usdKeyTxs.reduce((sum, tx) => sum + tx.amountInUsd, 0);

  const mpesaPercentage = totalKesEarnings > 0 ? Math.round((mpesaTotalKes / totalKesEarnings) * 100) : 0;
  const usdPercentage = 100 - mpesaPercentage;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 text-[10px] font-black uppercase mb-1">
              <span>Uniform Multi-Currency Reporting (1 USD = 130 KES)</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Unified Revenue & Currency Dashboard
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Seamlessly monitor total earnings with segregated M-Pesa (KSH) and USD course transactions.
            </p>
          </div>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 text-teal-600 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* KPI Total Earnings Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Total Earnings (KSh)</span>
            <span className="p-2 bg-teal-100 dark:bg-teal-950/60 text-teal-600 rounded-xl"><Globe className="w-4 h-4" /></span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {currencyUtils.formatKes(totalKesEarnings)}
          </p>
          <p className="text-[10px] font-bold text-slate-500">
            Uniform reporting rate (1 USD = 130 KES)
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Total Earnings (USD)</span>
            <span className="p-2 bg-purple-100 dark:bg-purple-950/60 text-purple-600 rounded-xl"><DollarSign className="w-4 h-4" /></span>
          </div>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400">
            {currencyUtils.formatUsd(totalUsdEarnings)}
          </p>
          <p className="text-[10px] font-bold text-slate-500">
            Converted from all active enrollments
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">M-Pesa Share (KES)</span>
            <span className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-xl"><Smartphone className="w-4 h-4" /></span>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {currencyUtils.formatKes(mpesaTotalKes)}
            </p>
            <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-black text-[10px] rounded-lg">
              {mpesaPercentage}%
            </span>
          </div>
          <p className="text-[10px] font-bold text-slate-500">
            {mpesaTxs.length} M-Pesa transactions
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">USD Card Share</span>
            <span className="p-2 bg-blue-100 dark:bg-blue-950/60 text-blue-600 rounded-xl"><CreditCard className="w-4 h-4" /></span>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {currencyUtils.formatUsd(usdTotalUsd)}
            </p>
            <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-black text-[10px] rounded-lg">
              {usdPercentage}%
            </span>
          </div>
          <p className="text-[10px] font-bold text-slate-500">
            {usdKeyTxs.length} USD transactions
          </p>
        </div>
      </div>

      {/* Segregated Channel Comparison Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 sm:p-8 rounded-3xl shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-white/10 rounded-2xl">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">M-Pesa / PayHero Channel</h3>
                <p className="text-xs text-emerald-100 font-medium">Local East African Mobile Money Revenue</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-white/20 text-white font-black text-xs rounded-full">
              {mpesaPercentage}% of Total
            </span>
          </div>
          <div className="pt-2 flex items-baseline justify-between border-t border-white/10">
            <div>
              <p className="text-[10px] uppercase font-bold text-emerald-200">Total KES Volume</p>
              <p className="text-2xl font-black">{currencyUtils.formatKes(mpesaTotalKes)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-emerald-200">Equivalent USD</p>
              <p className="text-lg font-bold">${currencyUtils.toUsd(mpesaTotalKes, 'KES').toFixed(2)} USD</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 sm:p-8 rounded-3xl shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-white/10 rounded-2xl">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">International USD Channel</h3>
                <p className="text-xs text-blue-100 font-medium">Stripe, PayPal & Card Course Purchases</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-white/20 text-white font-black text-xs rounded-full">
              {usdPercentage}% of Total
            </span>
          </div>
          <div className="pt-2 flex items-baseline justify-between border-t border-white/10">
            <div>
              <p className="text-[10px] uppercase font-bold text-blue-200">Total USD Volume</p>
              <p className="text-2xl font-black">{currencyUtils.formatUsd(usdTotalUsd)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-blue-200">Equivalent KES</p>
              <p className="text-lg font-bold">{currencyUtils.formatKes(currencyUtils.toKes(usdTotalUsd, 'USD'))}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search student, course or transaction..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 ml-1 mr-1" />
          {(['all', 'KES', 'USD'] as const).map((ch) => (
            <button
              key={ch}
              onClick={() => setFilterChannel(ch)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterChannel === ch
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {ch === 'all' ? 'All Channels' : ch === 'KES' ? 'M-Pesa (KES)' : 'USD Cards'}
            </button>
          ))}
        </div>
      </div>

      {/* Normalized Transactions Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-[11px] font-black uppercase tracking-wider text-slate-500">
              <th className="py-3.5 px-4">Transaction ID & Date</th>
              <th className="py-3.5 px-4">Student & Course</th>
              <th className="py-3.5 px-4">Payment Channel</th>
              <th className="py-3.5 px-4 text-right">Original Amount</th>
              <th className="py-3.5 px-4 text-right">Uniform KES Value</th>
              <th className="py-3.5 px-4 text-right">Uniform USD Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-xs text-slate-500">
                  No transactions match your search filter.
                </td>
              </tr>
            ) : (
              filtered.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 text-xs">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                    {tx.id.substring(0, 16)}...
                    <div className="text-[10px] text-slate-400 font-normal font-sans">
                      {new Date(tx.date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                    <div>{tx.studentName}</div>
                    <div className="text-[11px] text-slate-500 font-medium line-clamp-1">{tx.courseTitle}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full font-black text-[10px] uppercase ${
                      tx.currency === 'KES' 
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' 
                        : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                    }`}>
                      {tx.currency === 'KES' ? <Smartphone className="w-3 h-3 mr-1" /> : <CreditCard className="w-3 h-3 mr-1" />}
                      <span>{tx.currency === 'KES' ? 'M-Pesa / KES' : 'USD Card'}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                    {tx.currency === 'KES' ? `KSh ${tx.rawAmount.toLocaleString()}` : `$${tx.rawAmount.toFixed(2)}`}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    {currencyUtils.formatKes(tx.amountInKes)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-blue-600 dark:text-blue-400">
                    {currencyUtils.formatUsd(tx.amountInUsd)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
