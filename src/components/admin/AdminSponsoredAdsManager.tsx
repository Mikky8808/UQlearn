import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  Eye, 
  MousePointerClick, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  RefreshCw, 
  Tag, 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  Play, 
  Pause, 
  X, 
  Save, 
  Clock, 
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Check
} from 'lucide-react';
import { Course, SponsoredAd, SponsoredPricingPlan } from '../../types';
import { 
  getSponsoredAdsApi, 
  getSponsoredPlansApi, 
  saveSponsoredPlansApi, 
  applySponsoredAdApi, 
  updateSponsoredAdStatusApi, 
  deleteSponsoredAdApi 
} from '../../lib/apiConfig';

interface AdminSponsoredAdsManagerProps {
  courses: Course[];
}

export const AdminSponsoredAdsManager: React.FC<AdminSponsoredAdsManagerProps> = ({
  courses,
}) => {
  const [ads, setAds] = useState<SponsoredAd[]>([]);
  const [plans, setPlans] = useState<SponsoredPricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'plans' | 'create'>('campaigns');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Status message state
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Admin Direct Sponsor Modal / Form
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [grantDurationDays, setGrantDurationDays] = useState<number>(14);
  const [grantPlanName, setGrantPlanName] = useState<string>('Admin Spotlight Boost (14 Days)');
  const [grantPrice, setGrantPrice] = useState<number>(0);
  const [isGranting, setIsGranting] = useState<boolean>(false);

  // Plans Editor state
  const [editingPlans, setEditingPlans] = useState<SponsoredPricingPlan[]>([]);
  const [isSavingPlans, setIsSavingPlans] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setErrorMsg(null);
      const [adsRes, plansRes] = await Promise.allSettled([
        getSponsoredAdsApi(),
        getSponsoredPlansApi()
      ]);

      if (adsRes.status === 'fulfilled' && adsRes.value?.success) {
        setAds(adsRes.value.data || []);
      }

      if (plansRes.status === 'fulfilled' && plansRes.value?.success) {
        const fetchedPlans = plansRes.value.data || [];
        setPlans(fetchedPlans);
        setEditingPlans(JSON.parse(JSON.stringify(fetchedPlans)));
      }
    } catch (err: any) {
      console.error('Failed to load sponsored ads in admin:', err);
      setErrorMsg('Failed to connect to backend sponsored ads API.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered campaigns
  const filteredAds = ads.filter((ad) => {
    if (statusFilter !== 'all' && ad.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = ad.courseTitle?.toLowerCase().includes(q);
      const instMatch = ad.instructorName?.toLowerCase().includes(q) || ad.instructorEmail?.toLowerCase().includes(q);
      const planMatch = ad.planName?.toLowerCase().includes(q);
      if (!titleMatch && !instMatch && !planMatch) return false;
    }
    return true;
  });

  // KPI Metrics
  const activeCount = ads.filter(a => a.status === 'active').length;
  const totalRevenue = ads.reduce((acc, a) => acc + (a.amountPaid || 0), 0);
  const totalImpressions = ads.reduce((acc, a) => acc + (a.impressionsCount || 0), 0);
  const totalClicks = ads.reduce((acc, a) => acc + (a.clicksCount || 0), 0);

  // Status handler
  const handleUpdateStatus = async (id: number | string, newStatus: string, durationDays?: number) => {
    try {
      setErrorMsg(null);
      const res = await updateSponsoredAdStatusApi(id, newStatus, durationDays);
      if (res?.success) {
        setSuccessMsg(`Ad status updated to ${newStatus}.`);
        await loadData();
      } else {
        setErrorMsg(res?.message || 'Update failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Status update error');
    }
  };

  // Delete handler
  const handleDeleteAd = async (id: number | string) => {
    if (!window.confirm('Are you sure you want to delete this sponsored ad campaign?')) return;
    try {
      const res = await deleteSponsoredAdApi(id);
      if (res?.success) {
        setSuccessMsg('Sponsored ad deleted.');
        await loadData();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Delete error');
    }
  };

  // Admin Direct Sponsor Grant
  const handleAdminGrantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const course = courses.find(c => c.id === selectedCourseId);
    if (!course) {
      setErrorMsg('Please select a course.');
      return;
    }

    try {
      setIsGranting(true);
      setErrorMsg(null);
      const res = await applySponsoredAdApi({
        courseId: course.id,
        instructorId: course.createdBy || 'admin',
        instructorName: course.instructor || 'Instructor',
        instructorEmail: course.creatorEmail || '',
        courseTitle: course.title,
        courseThumbnail: course.image || course.thumbnail || '',
        coursePrice: course.price || 0,
        planId: 'admin_grant',
        planName: grantPlanName,
        durationDays: grantDurationDays,
        amountPaid: grantPrice,
        currency: 'USD',
        paymentMethod: 'admin_grant',
      });

      if (res?.success) {
        setSuccessMsg(`"${course.title}" is now actively SPONSORED for ${grantDurationDays} days.`);
        setSelectedCourseId('');
        setActiveTab('campaigns');
        await loadData();
      } else {
        setErrorMsg(res?.message || 'Grant failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error granting sponsored ad');
    } finally {
      setIsGranting(false);
    }
  };

  // Save Pricing Plans
  const handleSavePlans = async () => {
    try {
      setIsSavingPlans(true);
      setErrorMsg(null);
      const res = await saveSponsoredPlansApi(editingPlans);
      if (res?.success) {
        setSuccessMsg('Pricing plans updated successfully.');
        await loadData();
      } else {
        setErrorMsg(res?.message || 'Failed to save plans');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Save plans error');
    } finally {
      setIsSavingPlans(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-teal-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold border border-amber-400/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Admin Sponsored Products & Ads Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Sponsored Ads Manager
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
            Manage paid course promotions, configure sponsorship pricing tiers, and monitor Google-style <span className="text-amber-300 font-bold">Sponsored</span> ad badge delivery across the marketplace.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              loadData();
            }}
            disabled={refreshing}
            className="p-3 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-2xl text-xs font-bold flex items-center justify-center transition-all border border-slate-700"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-teal-400' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className="px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-lg flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
            <span>Sponsor Any Course</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center justify-between text-rose-800 dark:text-rose-300 text-xs font-semibold">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200/60 dark:border-amber-800/60">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Sponsored</div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">{activeCount}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/60 dark:border-emerald-800/60">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ad Sales Revenue</div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">${totalRevenue.toFixed(2)}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-200/60 dark:border-teal-800/60">
            <Eye className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Impressions</div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">{totalImpressions.toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200/60 dark:border-indigo-800/60">
            <MousePointerClick className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Clicks</div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">{totalClicks.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('campaigns')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'campaigns'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          All Campaigns ({ads.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('plans')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'plans'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Pricing Plans & Durations
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('create')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'create'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          + Grant Sponsorship
        </button>
      </div>

      {/* TAB 1: ALL CAMPAIGNS */}
      {activeTab === 'campaigns' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by course, instructor, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-500">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                <option value="all">All Statuses ({ads.length})</option>
                <option value="active">Active Only</option>
                <option value="paused">Paused</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-teal-500 animate-spin" />
              <p className="text-xs text-slate-500">Loading sponsored ads from database...</p>
            </div>
          ) : filteredAds.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No sponsored ads matching the selected criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200/80 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Course & Thumbnail</th>
                    <th className="py-3 px-4">Instructor</th>
                    <th className="py-3 px-4">Plan & Paid</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Delivery Window</th>
                    <th className="py-3 px-4 text-center">Impressions</th>
                    <th className="py-3 px-4 text-center">Clicks</th>
                    <th className="py-3 px-4 text-right">Admin Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredAds.map((ad) => {
                    const isActive = ad.status === 'active';
                    const isPaused = ad.status === 'paused';
                    const isExpired = ad.status === 'expired';

                    return (
                      <tr key={ad.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-8 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 relative border border-slate-200 dark:border-slate-700">
                              {ad.courseThumbnail ? (
                                <img
                                  src={ad.courseThumbnail}
                                  alt={ad.courseTitle || 'Course'}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[8px] text-slate-400 font-bold">
                                  Img
                                </div>
                              )}
                            </div>
                            <div className="max-w-[180px] sm:max-w-[200px]">
                              <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                                {ad.courseTitle || 'Course'}
                              </div>
                              <div className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center space-x-1 font-semibold">
                                <Sparkles className="w-2.5 h-2.5" />
                                <span>Google "Sponsored" Tag Active</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{ad.instructorName || 'Instructor'}</div>
                          <div className="text-[10px] text-slate-500 truncate max-w-[140px]">{ad.instructorEmail}</div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800 dark:text-slate-200">{ad.planName}</div>
                          <div className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                            ${Number(ad.amountPaid).toFixed(2)} ({ad.paymentMethod})
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {isActive && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center space-x-1 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>Active</span>
                            </span>
                          )}
                          {isPaused && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 w-fit block">
                              Paused
                            </span>
                          )}
                          {isExpired && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 w-fit block">
                              Expired
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-[10px] text-slate-500">
                          <div>Start: {ad.startDate?.split(' ')[0] || ad.startDate}</div>
                          <div>End: {ad.endDate?.split(' ')[0] || ad.endDate}</div>
                        </td>

                        <td className="py-3 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                          {(ad.impressionsCount || 0).toLocaleString()}
                        </td>

                        <td className="py-3 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                          {(ad.clicksCount || 0).toLocaleString()}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {isActive ? (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(ad.id, 'paused')}
                                className="p-1.5 hover:bg-amber-50 dark:hover:bg-amber-950 text-amber-600 rounded-lg transition-colors"
                                title="Pause Ad"
                              >
                                <Pause className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(ad.id, 'active', 7)}
                                className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-emerald-600 rounded-lg transition-colors"
                                title="Activate Ad (+7 Days)"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteAd(ad.id)}
                              className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-500 hover:text-rose-700 rounded-lg transition-colors"
                              title="Delete Ad"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PRICING PLANS & DURATIONS */}
      {activeTab === 'plans' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                Configure Sponsorship Pricing Tiers
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Instructors choose from these plans when applying for sponsored placement
              </p>
            </div>
            <button
              type="button"
              onClick={handleSavePlans}
              disabled={isSavingPlans}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-2xl shadow-md flex items-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingPlans ? 'Saving Plans...' : 'Save Pricing Plans'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {editingPlans.map((plan, idx) => (
              <div key={plan.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Plan Name</label>
                  <input
                    type="text"
                    value={plan.name}
                    onChange={(e) => {
                      const next = [...editingPlans];
                      next[idx].name = e.target.value;
                      setEditingPlans(next);
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Duration (Days)</label>
                    <input
                      type="number"
                      min={1}
                      value={plan.durationDays || plan.duration_days || 7}
                      onChange={(e) => {
                        const next = [...editingPlans];
                        next[idx].durationDays = Number(e.target.value);
                        setEditingPlans(next);
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Price ($ USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={plan.price}
                      onChange={(e) => {
                        const next = [...editingPlans];
                        next[idx].price = Number(e.target.value);
                        setEditingPlans(next);
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-emerald-600 dark:text-emerald-400"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Badge Label Tag</label>
                  <input
                    type="text"
                    value={plan.badgeTag || ''}
                    onChange={(e) => {
                      const next = [...editingPlans];
                      next[idx].badgeTag = e.target.value;
                      setEditingPlans(next);
                    }}
                    placeholder="e.g. Starter, Most Popular, Best Value"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Description</label>
                  <textarea
                    rows={2}
                    value={plan.description || ''}
                    onChange={(e) => {
                      const next = [...editingPlans];
                      next[idx].description = e.target.value;
                      setEditingPlans(next);
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ADMIN GRANT SPONSORSHIP */}
      {activeTab === 'create' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs max-w-2xl mx-auto space-y-6">
          <div>
            <div className="inline-flex items-center space-x-1.5 text-xs font-black text-amber-500">
              <Sparkles className="w-3.5 h-3.5" />
              <span>ADMIN OVERRIDE PROMOTION</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
              Grant Sponsored Status to Any Course
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Select any course in the catalog to immediately award active Sponsored status without charging the instructor.
            </p>
          </div>

          <form onSubmit={handleAdminGrantSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                Select Course
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              >
                <option value="">-- Choose a course to sponsor --</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.instructor || 'Instructor'})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                  Duration (Days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={grantDurationDays}
                  onChange={(e) => setGrantDurationDays(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                  Campaign Title / Tag
                </label>
                <input
                  type="text"
                  value={grantPlanName}
                  onChange={(e) => setGrantPlanName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setActiveTab('campaigns')}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isGranting || !selectedCourseId}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isGranting ? 'Activating...' : 'Grant Sponsored Status'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
