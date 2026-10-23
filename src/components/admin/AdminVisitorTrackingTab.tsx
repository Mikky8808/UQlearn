import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Users, 
  Eye, 
  Clock, 
  Search, 
  RefreshCw, 
  Copy, 
  Check, 
  Laptop, 
  Smartphone, 
  Globe, 
  ShieldAlert, 
  Filter,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { apiFetch } from '../../lib/apiConfig';

interface VisitorLog {
  id: number;
  ip: string;
  userAgent: string;
  visitedAt: string;
  visitDate: string;
}

interface TopIp {
  ip: string;
  count: number;
  lastSeen: string;
}

interface DailyRecord {
  date: string;
  hits: number;
  uniques: number;
}

interface VisitorStats {
  todayHits: number;
  todayUniques: number;
  totalHits: number;
  totalUniques: number;
  logs: VisitorLog[];
  dailyHistory: DailyRecord[];
  topIps: TopIp[];
}

export const AdminVisitorTrackingTab: React.FC = () => {
  const [stats, setStats] = useState<VisitorStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'all-logs' | 'top-ips' | 'daily-chart'>('all-logs');
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const resJson = await apiFetch('visitor-count.php?action=get_logs');
      if (resJson && resJson.success && resJson.data) {
        setStats(resJson.data);
      } else {
        throw new Error(resJson.message || 'Failed to parse database statistics response.');
      }
    } catch (err: any) {
      console.error('Error fetching visitor stats:', err);
      setError(err?.message || 'Failed to retrieve visitor traffic statistics from database.');
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleCopyIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  // Humanize user-agent string for display badges
  const parseUserAgent = (ua: string) => {
    const uaLower = ua.toLowerCase();
    
    let browser = 'Other Browser';
    let browserIcon = <Globe className="w-3 h-3" />;
    
    if (uaLower.includes('googlebot')) {
      browser = 'Google Crawler';
      browserIcon = <ShieldAlert className="w-3 h-3 text-amber-500" />;
    } else if (uaLower.includes('chrome')) {
      browser = 'Chrome';
    } else if (uaLower.includes('safari') && !uaLower.includes('chrome')) {
      browser = 'Safari';
    } else if (uaLower.includes('firefox')) {
      browser = 'Firefox';
    } else if (uaLower.includes('edge')) {
      browser = 'Edge';
    } else if (uaLower.includes('opera')) {
      browser = 'Opera';
    }

    let device = 'Desktop';
    let deviceIcon = <Laptop className="w-3 h-3" />;

    if (uaLower.includes('mobi') || uaLower.includes('phone') || uaLower.includes('android')) {
      device = 'Mobile';
      deviceIcon = <Smartphone className="w-3 h-3" />;
    } else if (uaLower.includes('tablet') || uaLower.includes('ipad')) {
      device = 'Tablet';
      deviceIcon = <Smartphone className="w-3 h-3" />;
    }

    return { browser, browserIcon, device, deviceIcon };
  };

  // Filter raw logs
  const filteredLogs = stats?.logs ? stats.logs.filter(log => {
    const q = searchQuery.toLowerCase();
    return log.ip.toLowerCase().includes(q) || log.userAgent.toLowerCase().includes(q) || log.visitDate.toLowerCase().includes(q);
  }) : [];

  // Find max daily count to scale charts
  const maxHistoryHits = stats?.dailyHistory && stats.dailyHistory.length > 0 
    ? Math.max(...stats.dailyHistory.map(d => d.hits)) 
    : 100;

  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Visitor Traffic Analytics</h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Real-time IP logs and visitor statistics.
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="px-4 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-2 transition-colors cursor-pointer self-start sm:self-center disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Refreshing...' : 'Refresh Logs'}</span>
        </button>
      </div>

      {/* Main Aggregated Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Hits */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-4 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black tracking-wider uppercase text-slate-500 dark:text-slate-400">Today's Hits</span>
            <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-slate-100 leading-none">
              {stats?.todayHits.toLocaleString() || '0'}
            </h3>
            <p className="text-[10px] text-teal-600 dark:text-teal-400 font-bold flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping inline-block"></span>
              <span>Active Views today</span>
            </p>
          </div>
        </div>

        {/* Today's Uniques */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-4 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black tracking-wider uppercase text-slate-500 dark:text-slate-400">Today's Uniques</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-slate-100 leading-none">
              {stats?.todayUniques.toLocaleString() || '0'}
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              Unique device connections
            </p>
          </div>
        </div>

        {/* Total Hits */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-4 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black tracking-wider uppercase text-slate-500 dark:text-slate-400">Total Hits</span>
            <div className="w-7 h-7 rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-slate-100 leading-none">
              {stats?.totalHits.toLocaleString() || '0'}
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              Accumulated platform hits
            </p>
          </div>
        </div>

        {/* Total Uniques */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-4 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black tracking-wider uppercase text-slate-500 dark:text-slate-400">Total Uniques</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-slate-100 leading-none">
              {stats?.totalUniques.toLocaleString() || '0'}
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              All-time unique visitors
            </p>
          </div>
        </div>
      </div>

      {/* Main Tab Controls & IP Search Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-xs">
        {/* Navigation Filters */}
        <div className="px-5 py-4 border-b border-slate-150 dark:border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex space-x-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => setActiveSubTab('all-logs')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'all-logs'
                  ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Recent Raw Logs
            </button>
            <button
              onClick={() => setActiveSubTab('top-ips')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'top-ips'
                  ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Top Active IPs
            </button>
            <button
              onClick={() => setActiveSubTab('daily-chart')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'daily-chart'
                  ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              30-Day Daily Chart
            </button>
          </div>

          {activeSubTab === 'all-logs' && (
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search IP, User Agent, or Date..."
                className="w-full pl-9 pr-3.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-500 transition-colors"
              />
            </div>
          )}
        </div>

        {/* Action Content Panel */}
        <div className="p-5">
          {/* Sub-View 1: Recent Logs Table */}
          {activeSubTab === 'all-logs' && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      <th className="pb-3 pl-2">ID</th>
                      <th className="pb-3">IP Address</th>
                      <th className="pb-3">Connection Device</th>
                      <th className="pb-3">User Agent & Platform</th>
                      <th className="pb-3 pr-2">Visited Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredLogs.length > 0 ? (
                      filteredLogs.map((log) => {
                        const uaDetails = parseUserAgent(log.userAgent);
                        return (
                          <tr key={log.id} className="text-xs text-slate-800 dark:text-slate-200 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 pl-2 text-slate-400 font-mono">#{log.id}</td>
                            <td className="py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                              <div className="flex items-center space-x-2">
                                <span>{log.ip}</span>
                                <button
                                  onClick={() => handleCopyIp(log.ip)}
                                  className="text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                                  title="Copy IP to clipboard"
                                >
                                  {copiedIp === log.ip ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="py-3">
                              <span className="inline-flex items-center space-x-1.5 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                                {uaDetails.deviceIcon}
                                <span>{uaDetails.device}</span>
                              </span>
                            </td>
                            <td className="py-3 max-w-[320px] truncate text-slate-500 dark:text-slate-400" title={log.userAgent}>
                              <span className="inline-flex items-center space-x-1 mr-2 text-slate-700 dark:text-slate-300 font-bold">
                                {uaDetails.browserIcon}
                                <span>{uaDetails.browser}</span>
                              </span>
                              <span>- {log.userAgent}</span>
                            </td>
                            <td className="py-3 pr-2 text-slate-500 dark:text-slate-400 font-medium">
                              <div className="flex items-center space-x-1">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>{log.visitedAt}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                          No visitor logs found matching your filter criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="pt-2 text-right">
                <span className="text-[11px] text-slate-400 font-medium">
                  Showing {filteredLogs.length} of {stats?.logs?.length || 0} recent logging hits
                </span>
              </div>
            </div>
          )}

          {/* Sub-View 2: Top Active IP Spam Check */}
          {activeSubTab === 'top-ips' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-xl">
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                  💡 <strong>Security Audit Tip:</strong> Keep an eye on abnormally high hit counts from single IP addresses. Bots, scrapers, and spam crawlers usually register hundreds of rapid connections. You can block problematic IPs inside your cPanel's IP Blocker portal or by modifying the <code>.htaccess</code> rules.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      <th className="pb-3 pl-2">Rank</th>
                      <th className="pb-3">IP Address</th>
                      <th className="pb-3">Hit Frequency Count</th>
                      <th className="pb-3">Relative Load share</th>
                      <th className="pb-3 pr-2">Last Active Access</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {stats?.topIps && stats.topIps.length > 0 ? (
                      stats.topIps.map((top, index) => {
                        const percentShare = stats.totalHits > 0 ? Math.round((top.count / stats.totalHits) * 100) : 0;
                        return (
                          <tr key={top.ip} className="text-xs text-slate-800 dark:text-slate-200 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 pl-2 text-slate-400 font-bold font-mono">#{index + 1}</td>
                            <td className="py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                              <div className="flex items-center space-x-2">
                                <span>{top.ip}</span>
                                <button
                                  onClick={() => handleCopyIp(top.ip)}
                                  className="text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                                  title="Copy IP"
                                >
                                  {copiedIp === top.ip ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="py-3 font-bold text-slate-800 dark:text-slate-200">
                              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {top.count.toLocaleString()} hits
                              </span>
                            </td>
                            <td className="py-3 w-1/4">
                              <div className="flex items-center space-x-2">
                                <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                  <div 
                                    className="bg-rose-500 h-full rounded-full transition-all" 
                                    style={{ width: `${Math.min(100, Math.max(4, percentShare * 2))}%` }}
                                  ></div>
                                </div>
                                <span className="text-[10px] font-bold text-slate-500">{percentShare || '<1'}%</span>
                              </div>
                            </td>
                            <td className="py-3 pr-2 text-slate-500 dark:text-slate-400 font-medium">
                              {top.lastSeen}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                          No top IP records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-View 3: Visual 30-Day Daily Chart */}
          {activeSubTab === 'daily-chart' && (
            <div className="space-y-6 py-2">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center space-x-1.5 uppercase tracking-wider">
                  <BarChart3 className="w-4 h-4 text-teal-500" />
                  <span>Interactive History Chart</span>
                </h4>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 rounded bg-teal-500 inline-block"></span>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Hits (Page Views)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 rounded bg-indigo-400 inline-block"></span>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Uniques</span>
                  </div>
                </div>
              </div>

              {/* Pure SVG/Tailwind high-fidelity bar graphs */}
              {stats?.dailyHistory && stats.dailyHistory.length > 0 ? (
                <div className="flex flex-col space-y-4">
                  <div className="h-64 flex items-end justify-between gap-1 sm:gap-2.5 pt-4 border-b border-slate-150 dark:border-slate-800/80">
                    {stats.dailyHistory.map((day) => {
                      const hitsHeight = maxHistoryHits > 0 ? (day.hits / maxHistoryHits) * 100 : 0;
                      const uniquesHeight = maxHistoryHits > 0 ? (day.uniques / maxHistoryHits) * 100 : 0;
                      
                      return (
                        <div key={day.date} className="flex-1 flex flex-col items-center h-full group relative cursor-pointer">
                          {/* Tooltip on Hover */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white text-[9px] p-2 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-20 whitespace-nowrap shadow-md border border-slate-700/50">
                            <p className="font-bold text-[10px] text-teal-400 border-b border-slate-800 pb-1 mb-1">{day.date}</p>
                            <p>Page Hits: <strong className="font-bold">{day.hits.toLocaleString()}</strong></p>
                            <p>Uniques: <strong className="font-bold text-indigo-300">{day.uniques.toLocaleString()}</strong></p>
                          </div>

                          {/* Dual Columns Bars */}
                          <div className="w-full flex items-end justify-center h-[90%] gap-0.5">
                            <div 
                              className="w-1.5 sm:w-3 bg-teal-500 hover:bg-teal-400 rounded-t-sm transition-all"
                              style={{ height: `${Math.max(4, hitsHeight)}%` }}
                            ></div>
                            <div 
                              className="w-1.5 sm:w-3 bg-indigo-400 hover:bg-indigo-300 rounded-t-sm transition-all"
                              style={{ height: `${Math.max(4, uniquesHeight)}%` }}
                            ></div>
                          </div>

                          {/* Label on Date (showing only day of month to avoid overlap) */}
                          <span className="text-[9px] text-slate-400 mt-2 font-mono group-hover:text-teal-400 transition-colors font-bold">
                            {day.date.substring(5)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                      Hover over individual bars to view precise hit details for that specific calendar date.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No historical traffic data is available in the database yet.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
