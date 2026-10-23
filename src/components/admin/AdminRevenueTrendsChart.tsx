import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Calendar, 
  ArrowUpRight, 
  RefreshCw, 
  CheckCircle2, 
  Zap,
  Sparkles
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { CourseSubscription } from '../../types';
import { subscriptionService } from '../../services/subscription-service';

interface DailyStat {
  dayIndex: number;
  dateKey: string;
  date: string;
  fullDate: string;
  revenue: number;
  enrollments: number;
  transactions: CourseSubscription[];
}

interface AdminRevenueTrendsChartProps {
  initialSubscriptions?: CourseSubscription[];
  onRefresh?: () => void;
}

// Custom Recharts Tooltip
const CustomChartTooltip = ({ active, payload, viewMetric }: any) => {
  if (active && payload && payload.length) {
    const data: DailyStat = payload[0].payload;
    return (
      <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl border border-slate-700 shadow-2xl backdrop-blur-md space-y-2 text-xs min-w-[200px]">
        <div className="flex items-center justify-between space-x-4 border-b border-slate-800 pb-1.5">
          <span className="font-bold text-slate-200">{data.fullDate}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
            Real Transactions
          </span>
        </div>
        <div className="flex items-center justify-between space-x-4 text-emerald-400 font-black text-sm">
          <span>Daily Revenue:</span>
          <span>KES {data.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex items-center justify-between space-x-4 text-indigo-300 font-semibold text-xs">
          <span>Learner Enrollments:</span>
          <span className="font-bold">{data.enrollments} {data.enrollments === 1 ? 'sale' : 'sales'}</span>
        </div>
        {data.transactions.length > 0 && (
          <div className="pt-1 border-t border-slate-800/80 text-[10px] text-slate-400">
            <span className="truncate block font-mono">
              Latest: {data.transactions[0].courseTitle || 'Course Purchase'}
            </span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const AdminRevenueTrendsChart: React.FC<AdminRevenueTrendsChartProps> = ({
  initialSubscriptions,
  onRefresh
}) => {
  const [timeRange, setTimeRange] = useState<'7' | '14' | '30'>('30');
  const [viewMetric, setViewMetric] = useState<'revenue' | 'enrollments'>('revenue');
  const [transactions, setTransactions] = useState<CourseSubscription[]>(initialSubscriptions || []);
  const [loading, setLoading] = useState(false);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const data = await subscriptionService.getSuccessfulTransactions();
      if (data && data.length > 0) {
        setTransactions(data);
      }
    } catch (e) {
      console.warn('Error fetching transactions for revenue trends:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialSubscriptions && initialSubscriptions.length > 0) {
      setTransactions(initialSubscriptions);
    } else {
      fetchTransactions();
    }
  }, [initialSubscriptions]);

  // Aggregate Real 30-Day Daily Data from Transactions
  const full30DayData = useMemo<DailyStat[]>(() => {
    const days: DailyStat[] = [];
    const now = new Date();

    // Generate past 30 days starting from 29 days ago to today
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`; // YYYY-MM-DD
      
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const shortDate = `${monthNames[d.getMonth()]} ${day}`;
      const fullDate = `${monthNames[d.getMonth()]} ${day}, ${year}`;

      days.push({
        dayIndex: 30 - i,
        dateKey,
        date: shortDate,
        fullDate,
        revenue: 0,
        enrollments: 0,
        transactions: []
      });
    }

    // Map each real transaction into its day
    transactions.forEach(tx => {
      // Only include active / successful transactions
      if (tx.status !== 'active' && tx.status !== 'QUEUED') return;

      const dateStr = tx.activatedAt || tx.enrolledAt || '';
      if (!dateStr) return;

      let txDateKey = '';
      try {
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          const y = parsed.getFullYear();
          const m = String(parsed.getMonth() + 1).padStart(2, '0');
          const day = String(parsed.getDate()).padStart(2, '0');
          txDateKey = `${y}-${m}-${day}`;
        }
      } catch (e) {
        // Ignore parsing error
      }

      if (!txDateKey && typeof dateStr === 'string' && dateStr.length >= 10) {
        txDateKey = dateStr.slice(0, 10);
      }

      const match = days.find(d => d.dateKey === txDateKey);
      if (match) {
        const amount = Number(tx.coursePrice || 0);
        match.revenue += amount;
        match.enrollments += 1;
        match.transactions.push(tx);
      }
    });

    return days;
  }, [transactions]);

  // Filter by selected time range (7D, 14D, 30D)
  const filteredData = useMemo(() => {
    const count = parseInt(timeRange, 10);
    return full30DayData.slice(-count);
  }, [full30DayData, timeRange]);

  // Calculate Real Statistical Highlights
  const totalFilteredRevenue = useMemo(() => {
    return filteredData.reduce((acc, curr) => acc + curr.revenue, 0);
  }, [filteredData]);

  const totalFilteredEnrollments = useMemo(() => {
    return filteredData.reduce((acc, curr) => acc + curr.enrollments, 0);
  }, [filteredData]);

  const avgDailyRevenue = useMemo(() => {
    if (filteredData.length === 0) return 0;
    return totalFilteredRevenue / filteredData.length;
  }, [filteredData, totalFilteredRevenue]);

  const peakDay = useMemo(() => {
    let highest = filteredData[0];
    filteredData.forEach(d => {
      if (d.revenue > (highest?.revenue || 0)) {
        highest = d;
      }
    });
    return highest;
  }, [filteredData]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
      
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  Daily Revenue Trends
                </h2>
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                  Last {timeRange} Days
                </span>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Daily earnings breakdown with sales volume, learner conversions, and trend projection based on real M-Pesa transactions.
          </p>
        </div>

        {/* Controls: Metric Toggle & Time Range Filter */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Refresh Action */}
          <button
            onClick={() => {
              fetchTransactions();
              if (onRefresh) onRefresh();
            }}
            disabled={loading}
            title="Refresh Transaction Statistics"
            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-500' : ''}`} />
          </button>

          {/* Metric Toggle */}
          <div className="bg-slate-100 dark:bg-slate-800/90 p-1 rounded-2xl flex items-center space-x-1 border border-slate-200/50 dark:border-slate-700/50">
            <button
              type="button"
              onClick={() => setViewMetric('revenue')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                viewMetric === 'revenue'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Revenue (KES)
            </button>
            <button
              type="button"
              onClick={() => setViewMetric('enrollments')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                viewMetric === 'enrollments'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Enrollments
            </button>
          </div>

          {/* Time Range Filter (7D, 14D, 30D) */}
          <div className="bg-slate-100 dark:bg-slate-800/90 p-1 rounded-2xl flex items-center space-x-1 border border-slate-200/50 dark:border-slate-700/50">
            {(['7', '14', '30'] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  timeRange === range
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {range}D
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Real Statistics Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
        <div>
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Period Revenue</span>
          <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
            KES {totalFilteredRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Daily Average</span>
          <span className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">
            KES {avgDailyRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/day
          </span>
        </div>
        <div>
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Total Enrollments</span>
          <span className="text-lg sm:text-xl font-black text-indigo-600 dark:text-indigo-400">
            {totalFilteredEnrollments} {totalFilteredEnrollments === 1 ? 'learner' : 'learners'}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Peak Day Volume</span>
          <span className="text-lg sm:text-xl font-black text-amber-500">
            {peakDay && peakDay.revenue > 0 ? `${peakDay.date} (KES ${peakDay.revenue})` : 'Stable'}
          </span>
        </div>
      </div>

      {/* Recharts Responsive Area Chart */}
      <div className="w-full h-72 sm:h-80 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="adminRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
              </linearGradient>
              <linearGradient id="adminEnrollmentGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.2} />
            
            <XAxis 
              dataKey="date" 
              tickLine={false} 
              axisLine={false} 
              tick={{ fontSize: 11, fill: '#64748b' }}
              dy={6}
            />
            
            <YAxis 
              tickLine={false} 
              axisLine={false} 
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickFormatter={(val) => viewMetric === 'revenue' ? `KES ${val}` : `${val}`}
            />
            
            <Tooltip content={<CustomChartTooltip viewMetric={viewMetric} />} />

            {viewMetric === 'revenue' ? (
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#10b981" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#adminRevenueGradient)" 
                activeDot={{ r: 6, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
              />
            ) : (
              <Area 
                type="monotone" 
                dataKey="enrollments" 
                stroke="#6366f1" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#adminEnrollmentGradient)" 
                activeDot={{ r: 6, fill: '#6366f1', stroke: '#ffffff', strokeWidth: 2 }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
};
