import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Megaphone, 
  Award, 
  Crown, 
  Sparkles, 
  Check, 
  RefreshCw, 
  DollarSign,
  Calendar,
  ShieldCheck,
  Tag
} from 'lucide-react';
import { API_ENDPOINTS, apiFetch } from '../../lib/apiConfig';
import { SponsoredLabel } from '../common/SponsoredLabel';

export const AdminPromotionSubscribersTab: React.FC = () => {
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('all');

  useEffect(() => {
    loadSubscribers();
  }, []);

  const loadSubscribers = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(API_ENDPOINTS.SPONSORED_ADS, { silent: true }, 0);
      let list = [];
      if (res && Array.isArray(res.data)) {
        list = res.data;
      } else if (Array.isArray(res)) {
        list = res;
      }
      if (list.length > 0) {
        const mapped = list.map((item: any, idx: number) => ({
          id: String(item.id || `sub-${idx}`),
          instructorName: item.instructorName || item.instructor_name || 'Instructor',
          instructorEmail: item.instructorEmail || item.instructor_email || 'instructor@uqlearn.org',
          courseTitle: item.courseTitle || item.course_title || 'Course',
          badgeTypes: [
            item.planName?.toLowerCase().includes('bestseller') ? 'bestseller' : 
            item.planName?.toLowerCase().includes('premium') ? 'premium' : 
            item.planName?.toLowerCase().includes('bundle') || item.planName?.toLowerCase().includes('all') ? 'triple-bundle' : 'sponsored'
          ],
          dailyBudget: Number(item.amountPaid || item.amount_paid || 3.5) / Math.max(1, Number(item.durationDays || item.duration_days || 7)),
          totalBudget: Number(item.amountPaid || item.amount_paid || 24.5),
          startDate: String(item.startDate || item.start_date || new Date().toISOString()).split('T')[0],
          endDate: String(item.endDate || item.end_date || new Date().toISOString()).split('T')[0],
          status: (item.status || 'active') as any,
          paymentMethod: item.paymentMethod || item.payment_method || 'Earnings Balance'
        }));
        setSubscribers(mapped);
      } else {
        // Fallback default sample data if table is empty
        setSubscribers([
          {
            id: 'sub-1',
            instructorName: 'Dr. Michael Omare',
            instructorEmail: 'michael@uqlearn.org',
            courseTitle: 'Full-Stack React & Node.js Masterclass',
            badgeTypes: ['sponsored', 'bestseller', 'premium'],
            dailyBudget: 13.5,
            totalBudget: 94.5,
            startDate: '2026-09-20',
            endDate: '2026-09-27',
            status: 'active',
            paymentMethod: 'Earnings Balance'
          },
          {
            id: 'sub-2',
            instructorName: 'Sarah Wanjiru',
            instructorEmail: 'sarah.w@uqlearn.org',
            courseTitle: 'Python for Data Science & Machine Learning',
            badgeTypes: ['bestseller'],
            dailyBudget: 5.0,
            totalBudget: 35.0,
            startDate: '2026-09-22',
            endDate: '2026-09-29',
            status: 'active',
            paymentMethod: 'M-PESA Kenya'
          },
          {
            id: 'sub-3',
            instructorName: 'David Kimani',
            instructorEmail: 'david.k@uqlearn.org',
            courseTitle: 'UI/UX Mobile App Design in Figma',
            badgeTypes: ['sponsored'],
            dailyBudget: 3.5,
            totalBudget: 24.5,
            startDate: '2026-09-18',
            endDate: '2026-09-25',
            status: 'completed',
            paymentMethod: 'Visa / Mastercard'
          }
        ]);
      }
    } catch (e) {
      console.warn('Failed to fetch promotion subscribers', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubscribers = subscribers.filter(sub => {
    const matchText = `${sub.instructorName} ${sub.instructorEmail} ${sub.courseTitle}`.toLowerCase();
    const matchesSearch = matchText.includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (tierFilter === 'sponsored') return sub.badgeTypes.includes('sponsored') && sub.badgeTypes.length === 1;
    if (tierFilter === 'bestseller') return sub.badgeTypes.includes('bestseller') && sub.badgeTypes.length === 1;
    if (tierFilter === 'premium') return sub.badgeTypes.includes('premium') && sub.badgeTypes.length === 1;
    if (tierFilter === 'triple') return sub.badgeTypes.length === 3 || sub.badgeTypes.includes('triple-bundle');
    return true;
  });

  return (
    <div className="space-y-6 text-left animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                Active Promotion Subscribers & Ad Campaigns
              </h2>
              <span className="px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] rounded-full uppercase tracking-wider border border-emerald-200 dark:border-emerald-800">
                Live Subscriptions
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              List of instructors and courses currently boosted with Sponsored, Best Seller, Premium, or Triple Power Bundle campaigns.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadSubscribers}
          disabled={loading}
          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center space-x-1.5 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs space-y-4">
        <div className="p-6 sm:p-7 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Showing {filteredSubscribers.length} promotion subscriber{filteredSubscribers.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search course or instructor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Tiers & Badges</option>
              <option value="sponsored">Sponsored</option>
              <option value="bestseller">Best Seller</option>
              <option value="premium">Premium</option>
              <option value="triple">Triple Power Bundle</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-5">Instructor</th>
                <th className="py-3.5 px-5">Course Title</th>
                <th className="py-3.5 px-5">Active Badges / Tier</th>
                <th className="py-3.5 px-5">Daily / Total Budget</th>
                <th className="py-3.5 px-5">Duration & Dates</th>
                <th className="py-3.5 px-5">Payment Method</th>
                <th className="py-3.5 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    Loading promotion subscribers...
                  </td>
                </tr>
              ) : filteredSubscribers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    No active promotion subscribers found matching your search.
                  </td>
                </tr>
              ) : (
                filteredSubscribers.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-5 whitespace-nowrap">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0">
                          {sub.instructorName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100">{sub.instructorName}</div>
                          <div className="text-[10px] text-slate-400">{sub.instructorEmail}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-5 font-semibold text-slate-900 dark:text-slate-100 max-w-xs truncate">
                      {sub.courseTitle}
                    </td>

                    <td className="py-4 px-5 whitespace-nowrap">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {sub.badgeTypes.length === 3 || sub.badgeTypes.includes('triple-bundle') ? (
                          <span className="px-2.5 py-1 bg-gradient-to-r from-amber-500 via-indigo-600 to-purple-600 text-white font-bold text-[9px] rounded-xs uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Triple Power Bundle
                          </span>
                        ) : (
                          sub.badgeTypes.map((b: string, i: number) => (
                            <span key={i}>
                              {b === 'sponsored' && <SponsoredLabel size="xs" />}
                              {b === 'bestseller' && (
                                <span className="px-2 py-0.5 bg-amber-500 text-white font-bold text-[9px] rounded-xs uppercase tracking-wider">
                                  Best Seller
                                </span>
                              )}
                              {b === 'premium' && (
                                <span className="px-2 py-0.5 bg-purple-600 text-white font-bold text-[9px] rounded-xs uppercase tracking-wider">
                                  Premium
                                </span>
                              )}
                            </span>
                          ))
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-5 whitespace-nowrap">
                      <div className="font-black text-slate-900 dark:text-slate-100">
                        ${sub.dailyBudget.toFixed(2)} /d
                      </div>
                      <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                        Total: ${sub.totalBudget.toFixed(2)}
                      </div>
                    </td>

                    <td className="py-4 px-5 whitespace-nowrap text-slate-500 dark:text-slate-400">
                      <div className="font-medium">{sub.startDate} → {sub.endDate}</div>
                    </td>

                    <td className="py-4 px-5 whitespace-nowrap">
                      <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px] rounded-lg">
                        {sub.paymentMethod}
                      </span>
                    </td>

                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                        sub.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                          : 'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
