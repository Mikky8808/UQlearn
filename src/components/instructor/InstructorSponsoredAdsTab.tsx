import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  Eye, 
  MousePointerClick, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  RefreshCw, 
  Zap, 
  Tag, 
  HelpCircle, 
  ArrowRight, 
  Calendar, 
  ShieldCheck, 
  Info,
  X,
  Play,
  Pause
} from 'lucide-react';
import { Course, SponsoredAd, SponsoredPricingPlan } from '../../types';
import { 
  getSponsoredAdsApi, 
  getSponsoredPlansApi, 
  applySponsoredAdApi, 
  updateSponsoredAdStatusApi 
} from '../../lib/apiConfig';

interface InstructorSponsoredAdsTabProps {
  courses: Course[];
  currentUser: any;
}

const DEFAULT_PLANS: SponsoredPricingPlan[] = [
  {
    id: 'starter_7d',
    name: 'Starter Boost (7 Days)',
    description: 'Essential visibility boost for new course launches and initial traction.',
    durationDays: 7,
    price: 9.99,
    badgeTag: 'Starter',
    features: [
      'Google-style "Sponsored" badge on course card',
      'Priority ranking in search results & categories',
      '7 Days continuous visibility boost',
      'Impressions & clicks analytics'
    ]
  },
  {
    id: 'pro_14d',
    name: 'Pro Growth (14 Days)',
    description: 'High-impact marketplace promotion with top-shelf category placement.',
    durationDays: 14,
    price: 18.99,
    badgeTag: 'Most Popular',
    features: [
      'Google-style "Sponsored" badge on course card',
      'Top-shelf marketplace placement',
      'Featured in "Tailored For You" spotlight recommendations',
      '14 Days continuous visibility boost',
      'Detailed conversion & CTR analytics'
    ]
  },
  {
    id: 'mega_30d',
    name: 'Dominance Reach (30 Days)',
    description: 'Maximum exposure across all marketplace shelves, home banner spots & search.',
    durationDays: 30,
    price: 34.99,
    badgeTag: 'Best Value',
    features: [
      'Google-style "Sponsored" badge & top ranking',
      'Premium carousel placement across home & search',
      '30 Days maximum exposure',
      'Priority delivery algorithm boost',
      'Highest learner enrollment conversion'
    ]
  }
];

export const InstructorSponsoredAdsTab: React.FC<InstructorSponsoredAdsTabProps> = ({
  courses,
  currentUser,
}) => {
  const [ads, setAds] = useState<SponsoredAd[]>([]);
  const [plans, setPlans] = useState<SponsoredPricingPlan[]>(DEFAULT_PLANS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Application Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('pro_14d');
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'card'>('wallet');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch instructor's ads & plans
  const loadData = async () => {
    try {
      setErrorMsg(null);
      const instructorId = currentUser?.id || currentUser?.email || 'inst_1';
      
      const [adsRes, plansRes] = await Promise.allSettled([
        getSponsoredAdsApi({ instructorId }),
        getSponsoredPlansApi()
      ]);

      if (adsRes.status === 'fulfilled' && adsRes.value?.success) {
        setAds(adsRes.value.data || []);
      }

      if (plansRes.status === 'fulfilled' && plansRes.value?.success && Array.isArray(plansRes.value.data) && plansRes.value.data.length > 0) {
        setPlans(plansRes.value.data);
      }
    } catch (err: any) {
      console.error('Failed to load sponsored ads data:', err);
      setErrorMsg('Could not load current campaigns from PHP backend.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Available published courses that instructor owns
  const eligibleCourses = useMemo(() => {
    return courses.filter(c => c && c.id);
  }, [courses]);

  const selectedCourse = useMemo(() => {
    return eligibleCourses.find(c => c.id === selectedCourseId) || eligibleCourses[0] || null;
  }, [eligibleCourses, selectedCourseId]);

  const selectedPlan = useMemo(() => {
    return plans.find(p => p.id === selectedPlanId) || plans[1] || plans[0];
  }, [plans, selectedPlanId]);

  // Aggregate Stats
  const activeCampaigns = ads.filter(a => a.status === 'active');
  const totalImpressions = ads.reduce((acc, a) => acc + (a.impressionsCount || 0), 0);
  const totalClicks = ads.reduce((acc, a) => acc + (a.clicksCount || 0), 0);
  const totalSpent = ads.reduce((acc, a) => acc + (a.amountPaid || 0), 0);
  const averageCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : '0.0';

  const handleOpenApplyModal = (courseId?: string) => {
    if (courseId) {
      setSelectedCourseId(courseId);
    } else if (eligibleCourses.length > 0) {
      setSelectedCourseId(eligibleCourses[0].id);
    }
    setSelectedPlanId('pro_14d');
    setIsModalOpen(true);
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) {
      setErrorMsg('Please select a course to promote.');
      return;
    }
    if (!selectedPlan) {
      setErrorMsg('Please select a promotion plan.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await applySponsoredAdApi({
        courseId: selectedCourse.id,
        instructorId: currentUser?.id || currentUser?.email || 'inst_1',
        instructorName: currentUser?.name || 'Instructor',
        instructorEmail: currentUser?.email || '',
        courseTitle: selectedCourse.title,
        courseThumbnail: selectedCourse.image || selectedCourse.thumbnail || '',
        coursePrice: selectedCourse.price || 0,
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        durationDays: selectedPlan.durationDays || selectedPlan.duration_days || 7,
        amountPaid: selectedPlan.price,
        currency: 'USD',
        paymentMethod: paymentMethod,
      });

      if (res?.success) {
        setSuccessMsg(`"${selectedCourse.title}" is now actively SPONSORED! It is boosted across the marketplace.`);
        setIsModalOpen(false);
        await loadData();
      } else {
        setErrorMsg(res?.message || 'Failed to submit sponsored ad.');
      }
    } catch (err: any) {
      console.error('Error applying for sponsored ad:', err);
      setErrorMsg(err.message || 'Failed to submit sponsored ad application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (ad: SponsoredAd, newStatus: string) => {
    try {
      const res = await updateSponsoredAdStatusApi(ad.id, newStatus);
      if (res?.success) {
        setSuccessMsg(`Campaign ${newStatus === 'active' ? 'resumed' : 'paused'} successfully.`);
        await loadData();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update campaign status.');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header & Intro */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-teal-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold border border-amber-400/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Marketplace Sponsored Ads & Course Promotion</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Boost Your Course with Sponsored Ads
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
            Promote your courses with verified Google-style <span className="text-amber-300 font-bold">"Sponsored"</span> badges. Get priority ranking on the home shelves, search results, and category spotlight to accelerate student enrollments.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0">
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              loadData();
            }}
            disabled={refreshing}
            className="p-3 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-2xl text-xs font-bold flex items-center justify-center transition-all border border-slate-700"
            title="Refresh analytics"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-teal-400' : ''}`} />
          </button>
          
          <button
            type="button"
            onClick={() => handleOpenApplyModal()}
            className="px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-lg hover:shadow-amber-500/25 flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
            <span>Promote a Course</span>
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg(null)} className="p-1 hover:text-emerald-950">
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
          <button type="button" onClick={() => setErrorMsg(null)} className="p-1 hover:text-rose-950">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Metrics Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Sponsored */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200/60 dark:border-amber-800/60">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Campaigns</div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">{activeCampaigns.length}</div>
          </div>
        </div>

        {/* Impressions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-200/60 dark:border-teal-800/60">
            <Eye className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ad Impressions</div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">{totalImpressions.toLocaleString()}</div>
          </div>
        </div>

        {/* Clicks & CTR */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200/60 dark:border-indigo-800/60">
            <MousePointerClick className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Clicks (CTR: {averageCtr}%)</div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">{totalClicks.toLocaleString()}</div>
          </div>
        </div>

        {/* Investment */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/60 dark:border-emerald-800/60">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ad Investment</div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">${totalSpent.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Available Plans Showcase */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <Tag className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>Sponsored Promotion Plans & Pricing</span>
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">Fixed rate duration tiers</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isBest = plan.badgeTag === 'Most Popular' || plan.id === 'pro_14d';
            return (
              <div 
                key={plan.id}
                className={`relative bg-white dark:bg-slate-900 rounded-3xl p-6 border transition-all flex flex-col justify-between ${
                  isBest 
                    ? 'border-amber-400 dark:border-amber-500/60 shadow-md ring-1 ring-amber-400/30' 
                    : 'border-slate-200/80 dark:border-slate-800 shadow-xs'
                }`}
              >
                {plan.badgeTag && (
                  <div className="absolute top-4 right-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      isBest 
                        ? 'bg-amber-400 text-slate-950 shadow-xs' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}>
                      {plan.badgeTag}
                    </span>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-slate-100">{plan.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{plan.description}</p>
                  </div>

                  <div className="flex items-baseline space-x-1 py-1">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">
                      ${Number(plan.price).toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                      / {plan.durationDays || plan.duration_days} Days
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                    {plan.features?.map((f, i) => (
                      <div key={i} className="flex items-start space-x-2 text-xs text-slate-600 dark:text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-5 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlanId(plan.id);
                      handleOpenApplyModal();
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                      isBest 
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-md' 
                        : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white'
                    }`}
                  >
                    <span>Choose {plan.name.split('(')[0].trim()}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
              My Sponsored Campaigns
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Track live delivery, Google-style sponsored badge visibility, and student conversion
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">
            {ads.length} Total Campaigns
          </span>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-teal-500 animate-spin" />
            <p className="text-xs text-slate-500">Loading sponsored campaigns from backend...</p>
          </div>
        ) : ads.length === 0 ? (
          <div className="py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No active sponsored campaigns</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Promote your courses to appear at the top of the UQlearn marketplace with verified Sponsored badges.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenApplyModal()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer inline-flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Launch First Sponsored Ad</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200/80 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Plan & Duration</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Schedule</th>
                  <th className="py-3 px-4 text-center">Impressions</th>
                  <th className="py-3 px-4 text-center">Clicks</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {ads.map((ad) => {
                  const isActive = ad.status === 'active';
                  const isExpired = ad.status === 'expired';
                  const isPaused = ad.status === 'paused';

                  return (
                    <tr key={ad.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                      {/* Course Thumbnail + Title */}
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
                                Course
                              </div>
                            )}
                          </div>
                          <div className="max-w-[180px] sm:max-w-[220px]">
                            <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                              {ad.courseTitle || 'Course'}
                            </div>
                            <div className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center space-x-1 font-semibold">
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>Google-style Sponsored Badge</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{ad.planName}</div>
                        <div className="text-[10px] text-slate-500">{ad.durationDays} Days Boost</div>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 font-black text-slate-900 dark:text-slate-100">
                        ${Number(ad.amountPaid).toFixed(2)}
                      </td>

                      {/* Status */}
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
                        {!isActive && !isPaused && !isExpired && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 w-fit block capitalize">
                            {ad.status}
                          </span>
                        )}
                      </td>

                      {/* Schedule */}
                      <td className="py-3 px-4 text-[10px] text-slate-500">
                        <div>From: {ad.startDate?.split(' ')[0] || ad.startDate}</div>
                        <div>To: {ad.endDate?.split(' ')[0] || ad.endDate}</div>
                      </td>

                      {/* Impressions */}
                      <td className="py-3 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                        {(ad.impressionsCount || 0).toLocaleString()}
                      </td>

                      {/* Clicks */}
                      <td className="py-3 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                        {(ad.clicksCount || 0).toLocaleString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {isActive && (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(ad, 'paused')}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-amber-600 rounded-lg transition-colors"
                              title="Pause Campaign"
                            >
                              <Pause className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isPaused && (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(ad, 'active')}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-emerald-600 rounded-lg transition-colors"
                              title="Resume Campaign"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isExpired && (
                            <button
                              type="button"
                              onClick={() => handleOpenApplyModal(ad.courseId)}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] rounded-lg shadow-xs"
                            >
                              Renew
                            </button>
                          )}
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

      {/* Application / Promote Course Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="inline-flex items-center space-x-1.5 text-xs font-black text-amber-500">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>APPLY FOR SPONSORED PROMOTION</span>
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                  Launch Sponsored Ad Campaign
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplySubmit} className="space-y-6">
              {/* 1. Select Course */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  1. Select Course to Sponsor
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  required
                >
                  {eligibleCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} (${c.price})
                    </option>
                  ))}
                </select>

                {/* Selected Course Preview Pill */}
                {selectedCourse && (
                  <div className="flex items-center space-x-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                    <img
                      src={selectedCourse.image || selectedCourse.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80'}
                      alt={selectedCourse.title}
                      className="w-12 h-9 rounded-lg object-cover shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                        {selectedCourse.title}
                      </div>
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center space-x-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Google-style "Sponsored" badge will be rendered on card</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Select Plan */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  2. Choose Sponsorship Plan & Duration
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {plans.map((p) => {
                    const isSelected = selectedPlanId === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPlanId(p.id)}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/10 text-slate-900 dark:text-slate-100 shadow-md ring-1 ring-amber-500'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black">{p.name.split('(')[0]}</span>
                            {p.badgeTag && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black">
                                {p.badgeTag}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {p.durationDays || p.duration_days} Days
                          </div>
                        </div>
                        <div className="text-lg font-black mt-2 text-slate-900 dark:text-slate-100">
                          ${Number(p.price).toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Payment Method */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  3. Payment Source
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setPaymentMethod('wallet')}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center space-x-3 ${
                      paymentMethod === 'wallet'
                        ? 'border-teal-500 bg-teal-500/10 text-teal-900 dark:text-teal-200 font-bold'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <DollarSign className="w-5 h-5 text-teal-500" />
                    <div>
                      <div className="text-xs">Instructor Balance</div>
                      <div className="text-[10px] text-slate-500">Instant deduction</div>
                    </div>
                  </div>

                  <div
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center space-x-3 ${
                      paymentMethod === 'card'
                        ? 'border-teal-500 bg-teal-500/10 text-teal-900 dark:text-teal-200 font-bold'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <ShieldCheck className="w-5 h-5 text-indigo-500" />
                    <div>
                      <div className="text-xs">Credit / Debit Card</div>
                      <div className="text-[10px] text-slate-500">Secure direct gateway</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary & Submit */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500">Total Price:</div>
                  <div className="text-xl font-black text-slate-900 dark:text-slate-100">
                    ${Number(selectedPlan?.price || 9.99).toFixed(2)} USD
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/25 flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Activating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Pay & Launch Ad</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
