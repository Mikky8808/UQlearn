import React, { useState, useEffect, useMemo } from 'react';
import {
  Megaphone,
  Sparkles,
  Award,
  Crown,
  CheckCircle2,
  Zap,
  BarChart3,
  Eye,
  MousePointer,
  TrendingUp,
  Calendar,
  DollarSign,
  Globe,
  Target,
  Layers,
  Info,
  X,
  ChevronRight,
  Smartphone,
  Monitor,
  Play,
  Pause,
  Trash2,
  ShieldCheck,
  Star,
  BadgeCheck,
  Clock,
  ArrowUpRight,
  Plus,
  Sliders,
  Check,
  AlertCircle,
  ArrowLeft,
  Users
} from 'lucide-react';
import { SponsoredLabel } from '../../common/SponsoredLabel';
import { 
  applySponsoredAdApi, 
  getStoredPromotionTiers, 
  getPromotionTiersApi, 
  PromotionTierConfig, 
  DEFAULT_PROMOTION_TIERS,
  EnrollmentProofPricingConfig,
  getStoredEnrollmentPricing,
  getEnrollmentPricingApi,
  calculateEnrollmentBoostPrice
} from '../../../lib/apiConfig';

export type AdBadgeType = 'sponsored' | 'bestseller' | 'premium';
export type AdCampaignStatus = 'active' | 'in_review' | 'paused' | 'completed';

export interface CourseAdCampaign {
  id: string;
  name: string;
  badgeType: AdBadgeType;
  badgeTypes?: AdBadgeType[];
  status: AdCampaignStatus;
  durationDays: number;
  startDate: string;
  endDate: string;
  dailyBudget: number; // in USD
  totalBudget: number; // in USD
  targetRegion: string;
  targetLevel: string;
  placements: string[];
  impressions: number;
  clicks: number;
  conversions: number;
  paymentMethod: string;
  createdAt: string;
}

interface CourseAdCampaignManagerProps {
  courseId: string;
  courseTitle: string;
  courseSubtitle?: string;
  courseImage?: string;
  coursePrice: number;
  courseOriginalPrice?: number;
  courseCategory?: string;
  courseLevel?: string;
  instructorName?: string;
  rating?: number;
  reviewCount?: number;
  isSponsored?: boolean;
  bestSeller?: boolean;
  isPremium?: boolean;
  selectedCurrency?: { code: string; symbol: string; rate: number };
  onUpdateCourseBadges: (badges: { isSponsored?: boolean; bestSeller?: boolean; isPremium?: boolean }) => void;
  showNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const CourseAdCampaignManager: React.FC<CourseAdCampaignManagerProps> = ({
  courseId,
  courseTitle,
  courseSubtitle = '',
  courseImage = '',
  coursePrice,
  courseOriginalPrice = 0,
  courseCategory = 'Development',
  courseLevel = 'All Levels',
  instructorName = 'Instructor',
  rating = 4.8,
  reviewCount = 24,
  isSponsored: initialIsSponsored = false,
  bestSeller: initialBestSeller = false,
  isPremium: initialIsPremium = false,
  selectedCurrency = { code: 'USD', symbol: '$', rate: 1 },
  onUpdateCourseBadges,
  showNotification,
}) => {
  const currencyRate = selectedCurrency?.rate || 1;
  const currencySymbol = selectedCurrency?.symbol || '$';
  const currencyCode = selectedCurrency?.code || 'USD';

  // Format currency helper
  const formatMoney = (usd: number) => {
    const safeUsd = typeof usd === 'number' && !isNaN(usd) ? usd : 0;
    const converted = safeUsd * currencyRate;
    if (currencyRate >= 10) {
      return `${currencySymbol}${Math.round(converted).toLocaleString()}`;
    }
    return `${currencySymbol}${converted.toFixed(2)}`;
  };

  const storageKey = `uqlearn_course_campaigns_${courseId || 'draft'}`;

  // Default initial campaigns if none saved
  const getInitialCampaigns = (): CourseAdCampaign[] => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse saved course campaigns', e);
    }

    // Default sample campaign if course already has any badge
    if (initialIsSponsored || initialBestSeller || initialIsPremium) {
      const badge: AdBadgeType = initialIsSponsored ? 'sponsored' : initialBestSeller ? 'bestseller' : 'premium';
      return [
        {
          id: `camp_${Date.now()}`,
          name: `${courseTitle ? courseTitle.slice(0, 30) : 'Course'} ${badge === 'sponsored' ? 'Sponsored Placement' : badge === 'bestseller' ? 'Bestseller Boost' : 'Premium Spotlight'}`,
          badgeType: badge,
          status: 'active',
          durationDays: 7,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          dailyBudget: badge === 'sponsored' ? 3.5 : badge === 'bestseller' ? 5.0 : 7.5,
          totalBudget: (badge === 'sponsored' ? 3.5 : badge === 'bestseller' ? 5.0 : 7.5) * 7,
          targetRegion: 'Pan-Africa',
          targetLevel: courseLevel || 'All Levels',
          placements: ['Search Results Top', 'Category Catalog Banner', 'Recommended Courses'],
          impressions: 14250,
          clicks: 580,
          conversions: 42,
          paymentMethod: 'Earnings Balance',
          createdAt: new Date().toISOString(),
        }
      ];
    }

    return [];
  };

  const [campaigns, setCampaigns] = useState<CourseAdCampaign[]>(getInitialCampaigns);
  const [viewMode, setViewMode] = useState<'list' | 'create'>('list');

  // Form states for creating a new Ad
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [campaignBadge, setCampaignBadge] = useState<AdBadgeType>('sponsored');
  const [selectedBadges, setSelectedBadges] = useState<AdBadgeType[]>(['sponsored']);
  const [campaignName, setCampaignName] = useState('');
  const [durationDays, setDurationDays] = useState<number>(7);
  const [customDays, setCustomDays] = useState<string>('');
  const [dailyBudget, setDailyBudget] = useState<number>(5.0);
  const [targetRegion, setTargetRegion] = useState<string>('Pan-Africa');
  const [targetLevel, setTargetLevel] = useState<string>(courseLevel || 'All Levels');
  const [selectedPlacements, setSelectedPlacements] = useState<string[]>([
    'Search Results Top',
    'Category Catalog Banner',
    'Recommended Courses'
  ]);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [paymentOption, setPaymentOption] = useState<'earnings' | 'mpesa' | 'card' | 'invoice'>('earnings');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Persist campaigns and synchronize course badges (supporting multi-badge campaigns)
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(campaigns));
    } catch (e) {
      console.warn('Could not save campaigns to localStorage', e);
    }

    // Determine current badges based on active campaigns (checking both badgeType and badgeTypes)
    const activeSponsored = campaigns.some(c => c.status === 'active' && (c.badgeTypes?.includes('sponsored') || c.badgeType === 'sponsored'));
    const activeBestseller = campaigns.some(c => c.status === 'active' && (c.badgeTypes?.includes('bestseller') || c.badgeType === 'bestseller'));
    const activePremium = campaigns.some(c => c.status === 'active' && (c.badgeTypes?.includes('premium') || c.badgeType === 'premium'));

    onUpdateCourseBadges({
      isSponsored: activeSponsored,
      bestSeller: activeBestseller,
      isPremium: activePremium,
    });
  }, [campaigns]);

  // Dynamic Reach & Performance Estimator with Multi-Badge Multipliers
  const estimatedReach = useMemo(() => {
    const days = durationDays;
    // Multi-badge multiplier: having multiple badges exponentially boosts CTR and conversion
    const badgeBonus = selectedBadges.length === 3 
      ? 1.8 
      : selectedBadges.length === 2 
      ? 1.45 
      : selectedBadges.includes('premium') 
      ? 1.5 
      : selectedBadges.includes('bestseller') 
      ? 1.25 
      : 1.0;

    const minDailyReach = Math.round(dailyBudget * 420 * badgeBonus);
    const maxDailyReach = Math.round(dailyBudget * 950 * badgeBonus);
    const totalMinImp = minDailyReach * days;
    const totalMaxImp = maxDailyReach * days;
    const minClicks = Math.round(totalMinImp * (0.034 * (selectedBadges.length > 1 ? 1.25 : 1.0)));
    const maxClicks = Math.round(totalMaxImp * (0.048 * (selectedBadges.length > 1 ? 1.25 : 1.0)));
    const minConv = Math.round(minClicks * 0.07);
    const maxConv = Math.round(maxClicks * 0.09);

    return {
      dailyReachRange: `${minDailyReach.toLocaleString()} – ${maxDailyReach.toLocaleString()}`,
      totalImpressionsRange: `${totalMinImp.toLocaleString()} – ${totalMaxImp.toLocaleString()}`,
      clicksRange: `${minClicks.toLocaleString()} – ${maxClicks.toLocaleString()}`,
      conversionsRange: `${minConv.toLocaleString()} – ${maxConv.toLocaleString()}`,
      ctrRange: selectedBadges.length === 3 ? '4.8% – 6.5%' : selectedBadges.length === 2 ? '4.1% – 5.4%' : '3.4% – 4.8%'
    };
  }, [dailyBudget, durationDays, selectedBadges]);

  // Dynamic promotion tiers loaded from admin config / API
  const [promotionTiers, setPromotionTiers] = useState<PromotionTierConfig[]>(getStoredPromotionTiers);

  useEffect(() => {
    getPromotionTiersApi().then(data => {
      if (data && data.length > 0) {
        setPromotionTiers(data);
      }
    }).catch(() => {});

    const handleTiersUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setPromotionTiers(e.detail);
      }
    };
    window.addEventListener('uqlearn_promotion_tiers_updated', handleTiersUpdate);
    return () => {
      window.removeEventListener('uqlearn_promotion_tiers_updated', handleTiersUpdate);
    };
  }, []);

  const [enrollmentPricing, setEnrollmentPricing] = useState<EnrollmentProofPricingConfig>(getStoredEnrollmentPricing);
  const [mockStudentsCount, setMockStudentsCount] = useState<number>(2100);
  const [includeEnrollmentBoost, setIncludeEnrollmentBoost] = useState<boolean>(true);

  // Standalone Seek Bar Card State
  const [standAloneStudentsCount, setStandAloneStudentsCount] = useState<number>(2100);
  const [isEnrollmentCheckoutOpen, setIsEnrollmentCheckoutOpen] = useState<boolean>(false);
  const [enrollmentPaymentMethod, setEnrollmentPaymentMethod] = useState<'earnings' | 'mpesa' | 'card'>('earnings');
  const [isActivatingBoost, setIsActivatingBoost] = useState<boolean>(false);
  const [activeBoostSuccess, setActiveBoostSuccess] = useState<string | null>(null);

  useEffect(() => {
    getEnrollmentPricingApi().then(data => {
      if (data && data.id) {
        setEnrollmentPricing(data);
      }
    }).catch(() => {});

    const handleEnrollmentPricingUpdate = (e: any) => {
      if (e.detail && e.detail.id) {
        setEnrollmentPricing(e.detail);
      }
    };
    window.addEventListener('uqlearn_enrollment_pricing_updated', handleEnrollmentPricingUpdate);
    return () => {
      window.removeEventListener('uqlearn_enrollment_pricing_updated', handleEnrollmentPricingUpdate);
    };
  }, []);

  const standAloneMath = calculateEnrollmentBoostPrice(standAloneStudentsCount, enrollmentPricing);
  const step3Math = calculateEnrollmentBoostPrice(mockStudentsCount, enrollmentPricing);
  const enrollmentBoostFee = includeEnrollmentBoost ? step3Math.totalUsd : 0;

  const sponsoredTier = (promotionTiers && Array.isArray(promotionTiers) ? promotionTiers.find(t => t?.id === 'sponsored') : null) || DEFAULT_PROMOTION_TIERS[0] || {
    id: 'sponsored', name: 'Sponsored Placement', badgeLabel: 'Sponsored', dailyRateUsd: 0.50, description: 'Feature your course in search results.', features: [], ctaText: 'Promote'
  };
  const bestsellerTier = (promotionTiers && Array.isArray(promotionTiers) ? promotionTiers.find(t => t?.id === 'bestseller') : null) || DEFAULT_PROMOTION_TIERS[1] || {
    id: 'bestseller', name: 'Best Seller Boost', badgeLabel: 'Bestseller', dailyRateUsd: 1.00, description: 'Display an official Bestseller badge.', features: [], ctaText: 'Get Badge'
  };
  const premiumTier = (promotionTiers && Array.isArray(promotionTiers) ? promotionTiers.find(t => t?.id === 'premium') : null) || DEFAULT_PROMOTION_TIERS[2] || {
    id: 'premium', name: 'Premium Spotlight', badgeLabel: 'Premium', dailyRateUsd: 1.50, description: 'Highlight your course in Premium header.', features: [], ctaText: 'Claim Spotlight'
  };
  const tripleBundleTier = (promotionTiers && Array.isArray(promotionTiers) ? promotionTiers.find(t => t?.id === 'triple-bundle') : null) || DEFAULT_PROMOTION_TIERS[3] || {
    id: 'triple-bundle', name: 'Triple Power Bundle', badgeLabel: 'Triple Bundle', dailyRateUsd: 2.50, description: 'All 3 badges active together.', features: [], ctaText: 'Get Bundle'
  };

  // Calculate default budget for given badges set using admin-configured rates
  const getRecommendedDailyBudget = (badges: AdBadgeType[]) => {
    const sRate = sponsoredTier?.dailyRateUsd ?? 0.50;
    const bRate = bestsellerTier?.dailyRateUsd ?? 1.00;
    const pRate = premiumTier?.dailyRateUsd ?? 1.50;

    let sum = 0;
    if (badges.includes('sponsored')) sum += sRate;
    if (badges.includes('bestseller')) sum += bRate;
    if (badges.includes('premium')) sum += pRate;
    return Number(sum.toFixed(2));
  };

  const getCampaignNameForBadges = (badges: AdBadgeType[]) => {
    const badgeLabel = badges.length === 3 
      ? 'All 3 Badges (Triple Power Bundle)' 
      : badges.length === 2 
      ? `Combo (${badges.map(b => b === 'sponsored' ? 'Sponsored' : b === 'bestseller' ? 'Best Seller' : 'Premium').join(' + ')})`
      : badges[0] === 'sponsored' ? 'Sponsored Placement' : badges[0] === 'bestseller' ? 'Best Seller Boost' : 'Premium Spotlight';
    return `${courseTitle ? courseTitle.slice(0, 20) : 'Course'} • ${badgeLabel}`;
  };

  // Open create page with fresh defaults (supports single badge, array, or 'all')
  const handleOpenCreatePage = (badgesInput: AdBadgeType[] | AdBadgeType | 'all' = 'sponsored') => {
    let badges: AdBadgeType[];
    if (badgesInput === 'all') {
      badges = ['sponsored', 'bestseller', 'premium'];
    } else if (Array.isArray(badgesInput)) {
      badges = badgesInput;
    } else {
      badges = [badgesInput];
    }
    
    setSelectedBadges(badges);
    setCampaignBadge(badges[0] || 'sponsored');
    setDurationDays(7);
    setDailyBudget(getRecommendedDailyBudget(badges));
    setCampaignName(getCampaignNameForBadges(badges));
    setWizardStep(1);
    setViewMode('create');
  };

  // Toggle individual badge in multi-select mode
  const handleToggleBadge = (badge: AdBadgeType) => {
    let nextBadges: AdBadgeType[];
    if (selectedBadges.includes(badge)) {
      if (selectedBadges.length === 1) {
        showNotification('At least one badge must be selected for your campaign.', 'info');
        return;
      }
      nextBadges = selectedBadges.filter(b => b !== badge);
    } else {
      nextBadges = [...selectedBadges, badge];
    }
    setSelectedBadges(nextBadges);
    setCampaignBadge(nextBadges[0] || 'sponsored');
    setDailyBudget(getRecommendedDailyBudget(nextBadges));
    setCampaignName(getCampaignNameForBadges(nextBadges));
  };

  // Select predefined badge combination
  const handleSelectBadgeCombo = (badges: AdBadgeType[]) => {
    setSelectedBadges(badges);
    setCampaignBadge(badges[0] || 'sponsored');
    setDailyBudget(getRecommendedDailyBudget(badges));
    setCampaignName(getCampaignNameForBadges(badges));
  };

  // Activate Standalone Enrollment Boost
  const handleActivateEnrollmentBoost = async () => {
    setIsActivatingBoost(true);
    try {
      const newBoostCamp: CourseAdCampaign = {
        id: `boost_${Date.now()}`,
        name: `Enrollment Social Proof: ${standAloneStudentsCount.toLocaleString()} Students (3 Months)`,
        badgeType: 'sponsored',
        badgeTypes: [],
        status: 'active',
        durationDays: 90,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
        dailyBudget: Number((standAloneMath.totalUsd / 90).toFixed(2)),
        totalBudget: standAloneMath.totalUsd,
        targetRegion: 'All Regions',
        targetLevel: 'All Learners',
        placements: ['marketplace_cards', 'category_pages'],
        impressions: 0,
        clicks: 0,
        conversions: standAloneStudentsCount,
        paymentMethod: enrollmentPaymentMethod === 'earnings' ? 'Earnings Balance' : enrollmentPaymentMethod === 'mpesa' ? 'M-Pesa / Mobile Money' : 'Debit/Credit Card',
        createdAt: new Date().toISOString(),
      };

      setCampaigns(prev => [newBoostCamp, ...prev]);
      setIsEnrollmentCheckoutOpen(false);
      setActiveBoostSuccess(`Successfully activated ${standAloneStudentsCount.toLocaleString()} student enrollment boost on your course for 3 months!`);
      setTimeout(() => setActiveBoostSuccess(null), 5000);
    } catch (err) {
      console.warn('Boost activation error:', err);
    } finally {
      setIsActivatingBoost(false);
    }
  };

  // Submit Ad Campaign Request
  const handleSubmitCampaign = async () => {
    setIsSubmitting(true);
    const totalAmount = Number((dailyBudget * durationDays + enrollmentBoostFee).toFixed(2));
    const startStr = new Date().toISOString().split('T')[0];
    const endStr = new Date(Date.now() + durationDays * 86400000).toISOString().split('T')[0];

    const badgesLabel = selectedBadges.length === 3
      ? 'TRIPLE POWER (SPONSORED + BESTSELLER + PREMIUM)'
      : selectedBadges.map(b => b.toUpperCase()).join(' + ');

    const newCampaign: CourseAdCampaign = {
      id: `camp_${Date.now()}`,
      name: campaignName.trim() || `${courseTitle || 'Course'} Ad`,
      badgeType: selectedBadges[0] || 'sponsored',
      badgeTypes: selectedBadges,
      status: paymentOption === 'invoice' ? 'in_review' : 'active',
      durationDays,
      startDate: startStr,
      endDate: endStr,
      dailyBudget,
      totalBudget: totalAmount,
      targetRegion,
      targetLevel,
      placements: selectedPlacements,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      paymentMethod: paymentOption === 'earnings' ? 'Earnings Balance' : paymentOption === 'mpesa' ? 'M-Pesa / Mobile Money' : paymentOption === 'card' ? 'Debit/Credit Card' : 'Invoice Review',
      createdAt: new Date().toISOString(),
    };

    try {
      // Send to centralized API endpoint (sponsored_ads.php)
      await applySponsoredAdApi({
        courseId: courseId || 'draft',
        instructorId: 'current-instructor',
        instructorName: instructorName || 'Instructor',
        courseTitle: courseTitle || 'Untitled Course',
        courseThumbnail: courseImage || '',
        coursePrice: coursePrice || 0,
        planName: `${badgesLabel} Boost`,
        durationDays,
        amountPaid: totalAmount,
        currency: currencyCode,
        paymentMethod: paymentOption,
      });
    } catch (e) {
      console.warn('API campaign apply note:', e);
    }

    setCampaigns(prev => [newCampaign, ...prev]);
    setIsSubmitting(false);
    setViewMode('list');

    const notificationBadgesText = selectedBadges.length === 3
      ? 'all 3 badges (Sponsored, Best Seller & Premium)'
      : selectedBadges.map(b => b === 'sponsored' ? 'Sponsored' : b === 'bestseller' ? 'Best Seller' : 'Premium').join(' + ');

    showNotification(
      paymentOption === 'invoice'
        ? `Ad Campaign "${newCampaign.name}" submitted for admin verification!`
        : `Ad Campaign launched! Your course is now running with ${notificationBadgesText}.`,
      'success'
    );
  };

  // =========================================================================
  // VIEW MODE: CAMPAIGNS LIST & PROMOTION OVERVIEW
  // =========================================================================
  if (viewMode === 'list') {
    return (
      <div className="space-y-6 text-left">
      {/* Choose Ad Objective & Badges Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 sm:gap-2">
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Choose Ad Objective & Badges
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              — Request instant promotion with single, 2-badge, or all 3 badges at once
            </span>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            ✓ Full combination rates
          </span>
        </div>

        {/* 👑 Triple Power All-in-One Featured Bundle Banner */}
        <div className="relative overflow-hidden rounded-xs bg-transparent text-slate-900 dark:text-slate-100 p-5 sm:p-7 border-4 border-slate-400 dark:border-slate-600">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-slate-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 -mb-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-[10px] rounded-full uppercase tracking-wider shadow-xs">
                  Triple Power • All 3 Badges at Once
                </span>
                <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-[10px] font-bold rounded-full">
                  Standard Combined Rate
                </span>
              </div>

              <div>
                <h3 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  Triple-Badge Power Pack (All-in-One)
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  Want all 3 badges at once? Launch a single campaign that awards your course the official <strong>Sponsored</strong> top rank, coveted gold <strong>Best Seller</strong> ribbon, AND <strong>Premium</strong> homepage carousel spotlight!
                </p>
              </div>

              {/* Badges preview row */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="inline-flex items-center">
                  <SponsoredLabel size="xs" />
                </span>
                <span className="text-slate-400 font-bold">+</span>
                <span className="px-2 py-0.5 bg-amber-500 text-white font-bold text-[10px] rounded-xs uppercase tracking-wider shadow-xs">
                  Best Seller
                </span>
                <span className="text-slate-400 font-bold">+</span>
                <span className="px-2 py-0.5 bg-purple-600 text-white font-bold text-[10px] rounded-xs uppercase tracking-wider flex items-center gap-1 shadow-xs">
                  <BadgeCheck className="w-3 h-3" />
                  Premium
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold ml-1">
                  = 1.8x Maximum Reach Multiplier
                </span>
              </div>

              {/* Quick 2-Badge Combo options */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-700 dark:text-slate-300 font-semibold text-[11px]">Or Pick a 2-Badge Combo in 1 Go:</span>
                <button
                  type="button"
                  onClick={() => handleOpenCreatePage(['sponsored', 'bestseller'])}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xs text-slate-800 dark:text-slate-200 font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1 border border-slate-200 dark:border-slate-700"
                >
                  <span>Sponsored + Best Seller</span>
                  <span className="text-amber-600 dark:text-amber-400 font-black">({formatMoney(getRecommendedDailyBudget(['sponsored', 'bestseller']))}/d)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenCreatePage(['sponsored', 'premium'])}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xs text-slate-800 dark:text-slate-200 font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1 border border-slate-200 dark:border-slate-700"
                >
                  <span>Sponsored + Premium</span>
                  <span className="text-purple-600 dark:text-purple-400 font-black">({formatMoney(getRecommendedDailyBudget(['sponsored', 'premium']))}/d)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenCreatePage(['bestseller', 'premium'])}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xs text-slate-800 dark:text-slate-200 font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1 border border-slate-200 dark:border-slate-700"
                >
                  <span>Best Seller + Premium</span>
                  <span className="text-amber-600 dark:text-amber-400 font-black">({formatMoney(getRecommendedDailyBudget(['bestseller', 'premium']))}/d)</span>
                </button>
              </div>
            </div>

            {/* Price & Primary CTA */}
            <div className="lg:text-right shrink-0 bg-slate-50 dark:bg-slate-800/60 p-4 sm:p-5 rounded-xs border border-slate-200 dark:border-slate-700 flex flex-col justify-between gap-3 min-w-[220px]">
              <div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Triple Bundle Daily Rate
                </span>
                <div className="flex items-baseline lg:justify-end gap-1.5 mt-0.5">
                  <p className="text-2xl font-black text-amber-500 dark:text-amber-400">
                    {formatMoney(getRecommendedDailyBudget(['sponsored', 'bestseller', 'premium']))}
                  </p>
                  <span className="text-xs text-slate-500 dark:text-slate-400">/day</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenCreatePage('all')}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm rounded-xs shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center space-x-2 active:scale-[0.99]"
              >
                <span>Get All 3 Badges at Once</span>
              </button>
            </div>
          </div>
        </div>

        {/* Individual Badge Tiers Header */}
        <div className="pt-2 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            Or Choose An Individual Objective:
          </span>
          <span className="text-[11px] text-slate-400">
            Click any badge to start or customize
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {/* 1. Sponsored Placement */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group h-full">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  <Megaphone className="w-5 h-5" />
                </div>
                <SponsoredLabel size="xs" />
              </div>

              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {sponsoredTier.name}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                  {sponsoredTier.description}
                </p>
              </div>

              <ul className="text-xs space-y-2 text-slate-600 dark:text-slate-400 pt-1">
                {(sponsoredTier?.features || []).map((feat, i) => (
                  <li key={i} className="flex items-start space-x-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4 mt-5 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Starting at
                </span>
                <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                  {formatMoney(sponsoredTier?.dailyRateUsd ?? 0.50)} <span className="text-[11px] font-normal text-slate-500">/day</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenCreatePage('sponsored')}
                className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <Zap className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{sponsoredTier?.ctaText || 'Promote'}</span>
              </button>
            </div>
          </div>

          {/* 2. Best Seller Boost */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-500 rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group h-full">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 bg-amber-500 text-white font-bold text-[9px] rounded-xs uppercase tracking-wider">
                  Best Seller
                </span>
              </div>

              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  {bestsellerTier?.name || 'Best Seller Boost'}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                  {bestsellerTier?.description}
                </p>
              </div>

              <ul className="text-xs space-y-2 text-slate-600 dark:text-slate-400 pt-1">
                {(bestsellerTier?.features || []).map((feat, i) => (
                  <li key={i} className="flex items-start space-x-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4 mt-5 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Starting at
                </span>
                <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                  {formatMoney(bestsellerTier?.dailyRateUsd ?? 1.00)} <span className="text-[11px] font-normal text-slate-500">/day</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenCreatePage('bestseller')}
                className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <Award className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{bestsellerTier?.ctaText || 'Get Badge'}</span>
              </button>
            </div>
          </div>

          {/* 3. Premium Spotlight */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-500 dark:hover:border-purple-500 rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group h-full md:col-span-2 xl:col-span-1 md:max-w-md md:mx-auto xl:max-w-none w-full">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-100 dark:border-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                  <Crown className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 bg-purple-600 text-white font-bold text-[9px] rounded-xs uppercase tracking-wider flex items-center gap-1">
                  <BadgeCheck className="w-3 h-3" />
                  Premium
                </span>
              </div>

              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  {premiumTier?.name || 'Premium Spotlight'}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                  {premiumTier?.description}
                </p>
              </div>

              <ul className="text-xs space-y-2 text-slate-600 dark:text-slate-400 pt-1">
                {(premiumTier?.features || []).map((feat, i) => (
                  <li key={i} className="flex items-start space-x-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4 mt-5 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Starting at
                </span>
                <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                  {formatMoney(premiumTier?.dailyRateUsd ?? 1.50)} <span className="text-[11px] font-normal text-slate-500">/day</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenCreatePage('premium')}
                className="w-full py-2.5 px-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <Crown className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{premiumTier?.ctaText || 'Claim Spotlight'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 🎓 Dedicated Student Enrollment Social Proof Booster Card with Seek Bar */}
      <div className="bg-white dark:bg-slate-900 border-2 border-amber-200/90 dark:border-amber-900/60 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden space-y-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Success alert if activated */}
        {activeBoostSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center space-x-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{activeBoostSuccess}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Seek Bar Area */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center space-x-1.5">
                <span>Select Desired Enrolled Students Count</span>
              </label>
              <div className="px-3.5 py-1 bg-amber-500 text-white rounded-full font-black text-sm shadow-xs flex items-center space-x-1">
                <Users className="w-3.5 h-3.5" />
                <span>{standAloneStudentsCount.toLocaleString()} Students</span>
              </div>
            </div>

            {/* Seek Bar Slider */}
            <div className="space-y-2">
              <input
                type="range"
                min={enrollmentPricing.minStudents || 100}
                max={enrollmentPricing.maxStudents || 10000}
                step={enrollmentPricing.studentStepUnit || 100}
                value={standAloneStudentsCount}
                onChange={(e) => setStandAloneStudentsCount(Number(e.target.value))}
                className="w-full h-3 bg-amber-100 dark:bg-amber-950/80 rounded-xl appearance-none cursor-pointer accent-amber-500 focus:outline-none"
              />
              <div className="flex justify-between text-[11px] text-slate-400 font-mono font-semibold">
                <span>{(enrollmentPricing.minStudents || 100).toLocaleString()}</span>
                <span>2,500</span>
                <span>5,000</span>
                <span>7,500</span>
                <span>{(enrollmentPricing.maxStudents || 10000).toLocaleString()}</span>
              </div>
            </div>

            {/* Quick preset buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-bold text-slate-500">Quick Presets:</span>
              {[500, 1000, 2100, 3500, 5000, 10000].map(cnt => {
                const p = calculateEnrollmentBoostPrice(cnt, enrollmentPricing);
                return (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setStandAloneStudentsCount(cnt)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                      standAloneStudentsCount === cnt
                        ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                    }`}
                  >
                    {cnt.toLocaleString()} (${(p?.totalUsd ?? 0).toFixed(2)})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Real-time Math Calculation Breakdown Card */}
          <div className="lg:col-span-5 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 rounded-2xl p-5 space-y-4">
            {/* Course badge visual preview */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Course Card Display Preview:</span>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-xs">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="text-amber-600 dark:text-amber-400 font-black">{(enrollmentPricing.defaultRating || 4.90).toFixed(1)} ★</span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <Users className="w-3.5 h-3.5 text-amber-500" />
                <span>{standAloneStudentsCount.toLocaleString()}+ students enrolled</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsEnrollmentCheckoutOpen(true)}
              className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center space-x-2"
            >
              <span>Boost Course ({standAloneStudentsCount.toLocaleString()} Students)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Checkout Modal for Standalone Enrollment Boost */}
      {isEnrollmentCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">Activate Enrollment Boost</h4>
                  <p className="text-[11px] text-slate-500">Fixed 3-Month Social Proof Package</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEnrollmentCheckoutOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Course:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 line-clamp-1 max-w-[200px]">{courseTitle || 'Course'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mock Enrolled Students:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{standAloneStudentsCount.toLocaleString()} Students</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Included Star Rating:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{(enrollmentPricing.defaultRating || 4.90).toFixed(1)} ★ Social Proof</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Duration:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">3 Months (90 Days)</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Total Price:</span>
                  <span className="font-black text-sm text-slate-900 dark:text-slate-100">${(standAloneMath?.totalUsd ?? 0).toFixed(2)} USD (≈ {formatMoney(standAloneMath?.totalUsd ?? 0)})</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-slate-900 dark:text-slate-100">Select Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'earnings', label: 'Wallet' },
                    { id: 'mpesa', label: 'M-Pesa' },
                    { id: 'card', label: 'Card' }
                  ].map(pm => (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setEnrollmentPaymentMethod(pm.id as any)}
                      className={`p-2 rounded-xl text-center font-bold text-xs border transition-all cursor-pointer ${
                        enrollmentPaymentMethod === pm.id
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {pm.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEnrollmentCheckoutOpen(false)}
                className="w-1/2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleActivateEnrollmentBoost}
                disabled={isActivatingBoost}
                className="w-1/2 py-2.5 px-4 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {isActivatingBoost ? 'Activating...' : 'Confirm & Pay'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Course Campaigns Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Course Campaigns & Ad History</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Review promotional campaigns and traffic performance for this course.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenCreatePage('sponsored')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Ad Campaign</span>
          </button>
        </div>

        {/* Table Content */}
        {campaigns.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <Megaphone className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No ad campaigns found</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Start promoting your course to reach thousands of learners across the marketplace.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleOpenCreatePage('sponsored')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                + Create First Ad Campaign
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Campaign & Badge</th>
                  <th className="py-3.5 px-4">Duration & Dates</th>
                  <th className="py-3.5 px-4">Budget / Spend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {campaigns.map(camp => (
                  <tr key={camp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Campaign Name & Badge */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                            {camp.name}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(() => {
                            const badges = camp.badgeTypes && camp.badgeTypes.length > 0 ? camp.badgeTypes : [camp.badgeType];
                            return (
                              <>
                                {badges.includes('sponsored') && <SponsoredLabel size="xs" />}
                                {badges.includes('bestseller') && (
                                  <span className="px-1.5 py-0.5 bg-amber-500 text-white font-bold text-[8px] rounded-xs uppercase tracking-wider">
                                    Best Seller
                                  </span>
                                )}
                                {badges.includes('premium') && (
                                  <span className="px-1.5 py-0.5 bg-purple-600 text-white font-bold text-[8px] rounded-xs uppercase tracking-wider flex items-center gap-0.5">
                                    <BadgeCheck className="w-2.5 h-2.5" /> Premium
                                  </span>
                                )}
                                {badges.length === 3 && (
                                  <span className="px-1.5 py-0.5 bg-gradient-to-r from-amber-500 to-indigo-600 text-white font-black text-[8px] rounded-xs uppercase tracking-wider">
                                    Triple Power
                                  </span>
                                )}
                              </>
                            );
                          })()}
                          <span className="text-[10px] text-slate-400">• {camp.targetRegion}</span>
                        </div>
                      </div>
                    </td>

                    {/* Duration & Dates */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {camp.durationDays} Days
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {camp.startDate} – {camp.endDate}
                      </div>
                    </td>

                    {/* Budget / Spend */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="font-black text-slate-900 dark:text-slate-100">
                        {formatMoney(camp.totalBudget)}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {formatMoney(camp.dailyBudget)} / day
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

  // =========================================================================
  // VIEW MODE: CREATE AD CAMPAIGN PAGE VIEW
  // =========================================================================
  return (
    <div className="space-y-6 text-left animate-fadeIn">
      {/* Top Breadcrumb & Step Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
        <button
          type="button"
          onClick={() => setViewMode('list')}
          className="inline-flex items-center space-x-2 text-xs font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Course Promotions & Ads</span>
        </button>
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400">
          <span>Campaign Creation Wizard</span>
          <span>•</span>
          <span className="text-indigo-600 dark:text-indigo-400 font-bold">Step {wizardStep} of 4</span>
        </div>
      </div>

      {/* Header Banner Card with Stepper Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
                Create Course Ad Campaign
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Launch a targeted promotion to boost search placement, trust ribbons, and student enrollments.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setViewMode('list')}
            className="self-start sm:self-auto px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center space-x-1.5"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel & Exit</span>
          </button>
        </div>

        {/* Stepper Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          {[
            { step: 1, label: '1. Badge Objective', desc: 'Select boost tier' },
            { step: 2, label: '2. Target Audience', desc: 'Regions & placement' },
            { step: 3, label: '3. Budget & Schedule', desc: 'Duration & forecast' },
            { step: 4, label: '4. Review & Payment', desc: 'Preview & launch' },
          ].map((s) => (
            <button
              key={s.step}
              type="button"
              onClick={() => setWizardStep(s.step as any)}
              className={`p-3 rounded-xl text-left transition-all border cursor-pointer ${
                wizardStep === s.step
                  ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/30 shadow-xs'
                  : wizardStep > s.step
                  ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20'
                  : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-black ${
                  wizardStep === s.step
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : wizardStep > s.step
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-600 dark:text-slate-400'
                }`}>
                  {s.label}
                </span>
                {wizardStep > s.step && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                )}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step Page Content Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xs">
        {/* STEP 1: OBJECTIVE & BADGE SELECTION */}
              {wizardStep === 1 && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="space-y-1">
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 sm:gap-2">
                      <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
                        Step 1: Select Your Ad Objective & Badges
                      </h4>
                      <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        Select 1, 2, or All 3 Badges at once
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Choose which verified status and placement badge(s) you want applied to your course. Click any card to toggle it ON/OFF, or click a preset bundle below.
                    </p>
                  </div>

                  {/* Quick Preset Selector Buttons */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Quick Preset Bundles:
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectBadgeCombo(['sponsored', 'bestseller', 'premium'])}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center space-x-1.5 border ${
                          selectedBadges.length === 3
                            ? 'bg-gradient-to-r from-amber-500 via-indigo-600 to-purple-600 text-white border-transparent shadow-sm ring-2 ring-indigo-500/30'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        <span>👑 All 3 Badges (Triple Power)</span>

                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectBadgeCombo(['sponsored', 'bestseller'])}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center space-x-1 border ${
                          selectedBadges.length === 2 && selectedBadges.includes('sponsored') && selectedBadges.includes('bestseller')
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <span>⚡ Sponsored + Best Seller</span>
                        <span className="text-[10px] opacity-80">({formatMoney(7.5)}/d)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectBadgeCombo(['sponsored', 'premium'])}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center space-x-1 border ${
                          selectedBadges.length === 2 && selectedBadges.includes('sponsored') && selectedBadges.includes('premium')
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <span>💎 Sponsored + Premium</span>
                        <span className="text-[10px] opacity-80">({formatMoney(9.5)}/d)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectBadgeCombo(['bestseller', 'premium'])}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center space-x-1 border ${
                          selectedBadges.length === 2 && selectedBadges.includes('bestseller') && selectedBadges.includes('premium')
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <span>🏆 Best Seller + Premium</span>
                        <span className="text-[10px] opacity-80">({formatMoney(11.0)}/d)</span>
                      </button>

                      <div className="flex items-center space-x-1 pl-1">
                        <span className="text-[10px] text-slate-400 font-semibold">Single:</span>
                        <button
                          type="button"
                          onClick={() => handleSelectBadgeCombo(['sponsored'])}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold border ${
                            selectedBadges.length === 1 && selectedBadges[0] === 'sponsored'
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                          }`}
                        >
                          Sponsored
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectBadgeCombo(['bestseller'])}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold border ${
                            selectedBadges.length === 1 && selectedBadges[0] === 'bestseller'
                              ? 'bg-amber-500 text-white border-amber-500'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                          }`}
                        >
                          Best Seller
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectBadgeCombo(['premium'])}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold border ${
                            selectedBadges.length === 1 && selectedBadges[0] === 'premium'
                              ? 'bg-purple-600 text-white border-purple-600'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                          }`}
                        >
                          Premium
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 3 Interactive Multi-Select Badge Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                    {/* 1. Sponsored Card */}
                    <div
                      onClick={() => handleToggleBadge('sponsored')}
                      className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between select-none relative group ${
                        selectedBadges.includes('sponsored')
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 shadow-sm ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <SponsoredLabel size="xs" />
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                            selectedBadges.includes('sponsored')
                              ? 'bg-indigo-600 text-white'
                              : 'border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                          }`}>
                            {selectedBadges.includes('sponsored') && (
                              <Check className="w-3.5 h-3.5" />
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between">
                            <h5 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                              {sponsoredTier.name}
                            </h5>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                            {sponsoredTier.description}
                          </p>
                        </div>

                        <ul className="text-[11px] space-y-1.5 text-slate-600 dark:text-slate-400 pt-1">
                          {(sponsoredTier?.features || []).map((feat, i) => (
                            <li key={i} className="flex items-start space-x-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-3 mt-4 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          {formatMoney(sponsoredTier?.dailyRateUsd ?? 0.50)} / day
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          selectedBadges.includes('sponsored')
                            ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {selectedBadges.includes('sponsored') ? '✓ Included in Ad' : '+ Click to Add'}
                        </span>
                      </div>
                    </div>

                    {/* 2. Best Seller Card */}
                    <div
                      onClick={() => handleToggleBadge('bestseller')}
                      className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between select-none relative group ${
                        selectedBadges.includes('bestseller')
                          ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 shadow-sm ring-2 ring-amber-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 bg-amber-500 text-white font-bold text-[9px] rounded-xs uppercase tracking-wider">
                            {bestsellerTier?.badgeLabel || 'Bestseller'}
                          </span>
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                            selectedBadges.includes('bestseller')
                              ? 'bg-amber-500 text-white'
                              : 'border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                          }`}>
                            {selectedBadges.includes('bestseller') && (
                              <Check className="w-3.5 h-3.5" />
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between">
                            <h5 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                              {bestsellerTier?.name || 'Best Seller Boost'}
                            </h5>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                            {bestsellerTier?.description}
                          </p>
                        </div>

                        <ul className="text-[11px] space-y-1.5 text-slate-600 dark:text-slate-400 pt-1">
                          {(bestsellerTier?.features || []).map((feat, i) => (
                            <li key={i} className="flex items-start space-x-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-3 mt-4 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          {formatMoney(bestsellerTier?.dailyRateUsd ?? 1.00)} / day
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          selectedBadges.includes('bestseller')
                            ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {selectedBadges.includes('bestseller') ? '✓ Included in Ad' : '+ Click to Add'}
                        </span>
                      </div>
                    </div>

                    {/* 3. Premium Card */}
                    <div
                      onClick={() => handleToggleBadge('premium')}
                      className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between select-none relative group ${
                        selectedBadges.includes('premium')
                          ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/30 shadow-sm ring-2 ring-purple-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 bg-purple-600 text-white font-bold text-[9px] rounded-xs uppercase tracking-wider flex items-center gap-1">
                            <BadgeCheck className="w-3 h-3" /> {premiumTier?.badgeLabel || 'Premium'}
                          </span>
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                            selectedBadges.includes('premium')
                              ? 'bg-purple-600 text-white'
                              : 'border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                          }`}>
                            {selectedBadges.includes('premium') && (
                              <Check className="w-3.5 h-3.5" />
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between">
                            <h5 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                              {premiumTier?.name || 'Premium Spotlight'}
                            </h5>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                            {premiumTier?.description}
                          </p>
                        </div>

                        <ul className="text-[11px] space-y-1.5 text-slate-600 dark:text-slate-400 pt-1">
                          {(premiumTier?.features || []).map((feat, i) => (
                            <li key={i} className="flex items-start space-x-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-3 mt-4 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                        <span className="font-bold text-purple-600 dark:text-purple-400">
                          {formatMoney(premiumTier?.dailyRateUsd ?? 1.50)} / day
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          selectedBadges.includes('premium')
                            ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {selectedBadges.includes('premium') ? '✓ Included in Ad' : '+ Click to Add'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Active Badges Combo Summary Bar */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                          Selected Badges ({selectedBadges.length} of 3 Active):
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {selectedBadges.includes('sponsored') && <SponsoredLabel size="xs" />}
                          {selectedBadges.includes('bestseller') && (
                            <span className="px-1.5 py-0.5 bg-amber-500 text-white font-bold text-[8px] rounded-xs uppercase tracking-wider">
                              Best Seller
                            </span>
                          )}
                          {selectedBadges.includes('premium') && (
                            <span className="px-1.5 py-0.5 bg-purple-600 text-white font-bold text-[8px] rounded-xs uppercase tracking-wider flex items-center gap-0.5">
                              <BadgeCheck className="w-2.5 h-2.5" /> Premium
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {selectedBadges.length === 3
                          ? '🎉 Triple Power Active! Your course receives top search placement, gold ribbon, and carousel spotlight with a 1.8x student reach multiplier.'
                          : selectedBadges.length === 2
                          ? '🔥 2-Badge Combo Active! Double the trust and visibility with an estimated 1.45x conversion multiplier.'
                          : 'Single Badge Active. Want more enrollments? You can check 1 or 2 more badges above to combine them in one go!'}
                      </p>
                    </div>

                    {selectedBadges.length < 3 && (
                      <button
                        type="button"
                        onClick={() => handleSelectBadgeCombo(['sponsored', 'bestseller', 'premium'])}
                        className="self-start sm:self-auto shrink-0 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-indigo-600 hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-xs transition-opacity cursor-pointer flex items-center space-x-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Select All 3 Badges ({formatMoney(13.5)}/d)</span>
                      </button>
                    )}
                  </div>

                  {/* Campaign Name Field */}
                  <div className="space-y-1.5 pt-2">
                    <label className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center justify-between">
                      <span>Campaign Name</span>
                      <span className="text-[10px] font-normal text-slate-400">Auto-configured to match selected badges</span>
                    </label>
                    <input
                      type="text"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      placeholder="e.g. Kenya Web Dev Boost Ad"
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: AUDIENCE & PLACEMENTS */}
              {wizardStep === 2 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                      Step 2: Target Audience & Placements
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Target the ideal students who are most likely to buy your course.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    {/* Region Targeting */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                        <Globe className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Target Geographic Region</span>
                      </label>
                      <select
                        value={targetRegion}
                        onChange={(e) => setTargetRegion(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="Pan-Africa">Pan-Africa (All Countries)</option>
                        <option value="East Africa">East Africa (Kenya, Uganda, Tanzania, Rwanda)</option>
                        <option value="West Africa">West Africa (Nigeria, Ghana)</option>
                        <option value="Southern Africa">Southern Africa (South Africa, Zambia)</option>
                        <option value="Global">Worldwide (Global Distribution)</option>
                      </select>
                    </div>

                    {/* Target Skill Level */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                        <Target className="w-3.5 h-3.5 text-purple-500" />
                        <span>Target Student Experience</span>
                      </label>
                      <select
                        value={targetLevel}
                        onChange={(e) => setTargetLevel(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="All Levels">All Levels (Broad Reach)</option>
                        <option value="Beginner">Beginners (Introductory)</option>
                        <option value="Intermediate">Intermediate Learners</option>
                        <option value="Advanced">Advanced Professionals</option>
                      </select>
                    </div>
                  </div>

                  {/* Ad Placements Checklist */}
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-500" />
                      <span>Ad Placements (Platform Feeds)</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[
                        { title: 'Search Results Top Rank', desc: 'Appears ahead of all organic course queries' },
                        { title: 'Category Catalog Banner', desc: 'Highlighted on the category discovery page' },
                        { title: 'Recommended Courses', desc: 'Suggested on competitor and related courses' },
                        { title: 'Homepage Hero Carousel', desc: 'Featured on the platform homepage header' },
                      ].map(place => {
                        const isChecked = selectedPlacements.includes(place.title);
                        return (
                          <div
                            key={place.title}
                            onClick={() => {
                              if (isChecked) {
                                setSelectedPlacements(prev => prev.filter(p => p !== place.title));
                              } else {
                                setSelectedPlacements(prev => [...prev, place.title]);
                              }
                            }}
                            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start space-x-2.5 ${
                              isChecked
                                ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20'
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-70'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              readOnly
                              className="mt-0.5 rounded text-indigo-600 focus:ring-0 cursor-pointer"
                            />
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{place.title}</p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{place.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: BUDGET, DURATION & FORECAST */}
              {wizardStep === 3 && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                      Step 3: Budget & Schedule
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Set how long you want to run this ad and your daily spending limit.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Controls Column */}
                    <div className="lg:col-span-7 space-y-4">
                      {/* Duration Presets */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center justify-between">
                          <span>Campaign Duration</span>
                          {customDays && (
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">Custom: {durationDays} Days</span>
                          )}
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {[3, 7, 14, 30].map(d => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => {
                                setDurationDays(d);
                                setCustomDays('');
                              }}
                              className={`py-2 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer border ${
                                durationDays === d && !customDays
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                              }`}
                            >
                              {d} Days {d === 7 && <span className="text-[9px] block opacity-80">Popular</span>}
                            </button>
                          ))}
                        </div>

                        {/* Custom Days Input */}
                        <div className="mt-2">
                          <label className="text-[11px] font-bold text-slate-500 block mb-1">Or Custom Duration (Days)</label>
                          <input
                            type="number"
                            min="1"
                            max="365"
                            placeholder="e.g. 5"
                            value={customDays}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomDays(val);
                              if (val !== '') {
                                const parsed = parseInt(val, 10);
                                if (!isNaN(parsed) && parsed > 0) {
                                  setDurationDays(parsed);
                                }
                              }
                            }}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Daily Budget Presets */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-slate-900 dark:text-slate-100">
                            Daily Budget (USD)
                          </label>
                          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                            Recommended: ${getRecommendedDailyBudget(selectedBadges).toFixed(2)}/day
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {(selectedBadges.length === 3
                            ? [13.5, 18.0, 25.0, 40.0]
                            : selectedBadges.length === 2
                            ? [getRecommendedDailyBudget(selectedBadges), 12.0, 20.0, 30.0]
                            : [3.5, 5.0, 10.0, 20.0]
                          ).map(b => (
                            <button
                              key={b}
                              type="button"
                              onClick={() => setDailyBudget(b)}
                              className={`py-2 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer border ${
                                dailyBudget === b
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                              }`}
                            >
                              ${b.toFixed(2)} / day
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom Daily Budget Input */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-900 dark:text-slate-100">Or Custom Daily Amount ($ USD)</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">$</span>
                          <input
                            type="number"
                            min="2"
                            max="100"
                            step="0.5"
                            value={dailyBudget}
                            onChange={(e) => setDailyBudget(Math.max(2, Number(e.target.value)))}
                            className="w-full pl-8 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      {/* 3-Month Student Enrollment Social Proof Growth Booster (Facebook Style Slider) */}
                      <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 space-y-3.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="p-1.5 bg-amber-500 text-white rounded-lg shadow-xs">
                              <Star className="w-4 h-4 fill-current" />
                            </span>
                            <div>
                              <h5 className="text-xs font-black text-slate-900 dark:text-slate-100">
                                3-Month Student Enrollment Social Proof Boost
                              </h5>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                Social proof on course card: {mockStudentsCount.toLocaleString()}+ students enrolled (3 Months)
                              </p>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={includeEnrollmentBoost}
                              onChange={(e) => setIncludeEnrollmentBoost(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                          </label>
                        </div>

                        {includeEnrollmentBoost && (
                          <div className="space-y-3 pt-2 border-t border-amber-200/60 dark:border-amber-900/40 animate-fadeIn">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                              <span>Target Enrolled Students (3 Months):</span>
                              <span className="px-2 py-0.5 bg-amber-500 text-white rounded-full font-black text-xs">
                                {mockStudentsCount.toLocaleString()} Students
                              </span>
                            </div>

                            {/* Seek bar slider */}
                            <div className="space-y-1">
                              <input
                                type="range"
                                min={enrollmentPricing.minStudents || 100}
                                max={enrollmentPricing.maxStudents || 10000}
                                step={enrollmentPricing.studentStepUnit || 100}
                                value={mockStudentsCount}
                                onChange={(e) => setMockStudentsCount(Number(e.target.value))}
                                className="w-full h-2 bg-amber-200 dark:bg-amber-900 rounded-lg appearance-none cursor-pointer accent-amber-500"
                              />
                              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                                <span>{(enrollmentPricing.minStudents || 100).toLocaleString()}</span>
                                <span>5,000</span>
                                <span>{(enrollmentPricing.maxStudents || 10000).toLocaleString()}</span>
                              </div>
                            </div>

                            <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-amber-200/60 dark:border-amber-900/40 text-[11px] font-mono space-y-0.5">
                              <div className="text-slate-500 font-bold">Calculation:</div>
                              <div className="text-slate-900 dark:text-slate-100 font-bold">{step3Math.formulaText}</div>
                            </div>

                            <div className="flex items-center justify-between text-xs pt-1">
                              <span className="text-slate-600 dark:text-slate-400 font-semibold">
                                3-Month Fixed Social Proof Fee:
                              </span>
                              <span className="font-black text-amber-600 dark:text-amber-400">
                                {formatMoney(step3Math?.totalUsd ?? 0)} (${(step3Math?.totalUsd ?? 0).toFixed(2)} USD)
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Total Calculation Banner */}
                      <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-300">Total Campaign Budget</span>
                            <p className="text-[10px] text-indigo-700 dark:text-indigo-400">
                              {durationDays} days ad (${(dailyBudget ?? 0).toFixed(2)}/day) {includeEnrollmentBoost ? `+ 3-Mo Enrollment Boost (${mockStudentsCount.toLocaleString()} students)` : ''}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                              ${(((dailyBudget || 0) * (durationDays || 1)) + (enrollmentBoostFee || 0)).toFixed(2)} USD
                            </p>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ≈ {formatMoney(dailyBudget * durationDays + enrollmentBoostFee)}
                            </span>
                          </div>
                        </div>

                        {/* Included Badges Chips */}
                        <div className="pt-2 border-t border-indigo-100/80 dark:border-indigo-900/50 flex flex-wrap items-center justify-between gap-1 text-[11px]">
                          <span className="text-slate-500 dark:text-slate-400 font-semibold">
                            Included Badges ({selectedBadges.length} of 3):
                          </span>
                          <div className="flex flex-wrap items-center gap-1">
                            {selectedBadges.includes('sponsored') && <SponsoredLabel size="xs" />}
                            {selectedBadges.includes('bestseller') && (
                              <span className="px-1.5 py-0.5 bg-amber-500 text-white font-bold text-[8px] rounded-xs uppercase tracking-wider">
                                Best Seller
                              </span>
                            )}
                            {selectedBadges.includes('premium') && (
                              <span className="px-1.5 py-0.5 bg-purple-600 text-white font-bold text-[8px] rounded-xs uppercase tracking-wider flex items-center gap-0.5">
                                <BadgeCheck className="w-2.5 h-2.5" /> Premium
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Performance Estimator Sidebar */}
                    <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-3.5 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-wider">
                          <TrendingUp className="w-4 h-4" />
                          <span>Estimated Performance</span>
                        </div>

                        <div className="space-y-2.5">
                          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Daily Student Reach</span>
                            <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                              {estimatedReach.dailyReachRange} learners
                            </span>
                          </div>

                          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Course Impressions</span>
                            <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                              {estimatedReach.totalImpressionsRange} views
                            </span>
                          </div>

                          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Estimated Course Clicks</span>
                            <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                              {estimatedReach.clicksRange} visits ({estimatedReach.ctrRange})
                            </span>
                          </div>

                          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Estimated Enrollments</span>
                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                              {estimatedReach.conversionsRange} new students
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-400 leading-tight">
                        *Estimates are calculated based on historical marketplace engagement for {courseCategory}.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: REVIEW & LIVE AD PREVIEW */}
              {wizardStep === 4 && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                      Step 4: Live Ad Creative Preview & Payment
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      This is exactly how your course will appear in the catalog, search results, and recommendations.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Ad Creative Preview Box */}
                    <div className="lg:col-span-6 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300">Live Ad Creative</span>
                        <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
                          <button
                            type="button"
                            onClick={() => setPreviewDevice('desktop')}
                            className={`p-1.5 rounded-md ${previewDevice === 'desktop' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs' : 'text-slate-400'}`}
                          >
                            <Monitor className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewDevice('mobile')}
                            className={`p-1.5 rounded-md ${previewDevice === 'mobile' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs' : 'text-slate-400'}`}
                          >
                            <Smartphone className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Mock Course Card Preview */}
                      <div className={`mx-auto border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-md ${previewDevice === 'mobile' ? 'max-w-[280px]' : 'max-w-sm'}`}>
                        {/* Thumbnail */}
                        <div className="relative aspect-video bg-slate-800 overflow-hidden">
                          {courseImage ? (
                            <img src={courseImage} alt={courseTitle} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900 to-slate-900 text-slate-400 font-bold text-xs p-4 text-center">
                              {courseTitle || 'Course Preview Thumbnail'}
                            </div>
                          )}

                          {/* Dynamic Badges applied on Thumbnail */}
                          <div className="absolute top-2.5 left-2.5 z-10 flex flex-wrap items-center gap-1.5">
                            {selectedBadges.includes('bestseller') && (
                              <span className="px-2 py-0.5 bg-amber-500 text-white font-black text-[9px] rounded-xs uppercase tracking-wider shadow-sm">
                                Best Seller
                              </span>
                            )}
                            {selectedBadges.includes('premium') && (
                              <span className="px-2 py-0.5 bg-purple-600 text-white font-black text-[9px] rounded-xs uppercase tracking-wider shadow-sm flex items-center gap-1">
                                <BadgeCheck className="w-3 h-3" /> Premium
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card Info */}
                        <div className="p-3.5 space-y-2">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                            <span>{courseCategory}</span>
                            <span>{courseLevel}</span>
                          </div>

                          <h5 className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm line-clamp-2 leading-snug">
                            {courseTitle || 'Untitled Masterclass Course'}
                          </h5>

                          <p className="text-[11px] text-slate-500 line-clamp-1">
                            {instructorName} • Senior Instructor
                          </p>

                          <div className="flex items-center space-x-1.5 text-xs">
                            <span className="font-black text-amber-500 flex items-center">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 mr-0.5" />
                              {rating}
                            </span>
                            <span className="text-[10px] text-slate-400">({reviewCount} reviews)</span>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                            <div className="font-black text-slate-900 dark:text-slate-100 text-sm">
                              {formatMoney(coursePrice || 19.99)}
                            </div>
                            {selectedBadges.includes('sponsored') && (
                              <SponsoredLabel size="xs" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Order & Payment Summary Column */}
                    <div className="lg:col-span-6 space-y-4">
                      <div className="bg-slate-50 dark:bg-slate-800/60 p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                        <h5 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Campaign Summary
                        </h5>
                        <div className="text-xs space-y-2 divide-y divide-slate-200/60 dark:divide-slate-800">
                          <div className="flex justify-between items-start pt-1">
                            <span className="text-slate-500">Ad Objective / Badges:</span>
                            <div className="text-right">
                              <span className="font-bold text-slate-900 dark:text-slate-100 block">
                                {selectedBadges.length === 3
                                  ? 'All 3 Badges (Triple Power)'
                                  : selectedBadges.length === 2
                                  ? `2-Badge Combo (${selectedBadges.map(b => b === 'sponsored' ? 'Sponsored' : b === 'bestseller' ? 'Best Seller' : 'Premium').join(' + ')})`
                                  : selectedBadges[0] === 'sponsored'
                                  ? 'Sponsored Placement'
                                  : selectedBadges[0] === 'bestseller'
                                  ? 'Best Seller Boost'
                                  : 'Premium Spotlight'}
                              </span>
                              <div className="flex flex-wrap items-center justify-end gap-1 mt-1">
                                {selectedBadges.includes('sponsored') && <SponsoredLabel size="xs" />}
                                {selectedBadges.includes('bestseller') && (
                                  <span className="px-1.5 py-0.5 bg-amber-500 text-white font-bold text-[8px] rounded-xs uppercase tracking-wider">
                                    Best Seller
                                  </span>
                                )}
                                {selectedBadges.includes('premium') && (
                                  <span className="px-1.5 py-0.5 bg-purple-600 text-white font-bold text-[8px] rounded-xs uppercase tracking-wider flex items-center gap-0.5">
                                    <BadgeCheck className="w-2.5 h-2.5" /> Premium
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-between pt-2">
                            <span className="text-slate-500">Duration:</span>
                            <span className="font-bold text-slate-900 dark:text-slate-100">{durationDays} Days</span>
                          </div>
                          <div className="flex justify-between pt-2">
                            <span className="text-slate-500">Target Region:</span>
                            <span className="font-bold text-slate-900 dark:text-slate-100">{targetRegion}</span>
                          </div>
                          <div className="flex justify-between pt-2">
                            <span className="text-slate-500">Daily Rate:</span>
                            <span className="font-bold text-slate-900 dark:text-slate-100">{formatMoney(dailyBudget)}/day</span>
                          </div>
                          <div className="flex justify-between pt-2 font-black text-sm text-indigo-600 dark:text-indigo-400">
                            <span>Total Charge:</span>
                            <span>{formatMoney(dailyBudget * durationDays)} ({currencyCode})</span>
                          </div>
                        </div>
                      </div>

                      {/* Payment Method Selector */}
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-900 dark:text-slate-100">
                          Billing & Request Method
                        </label>
                        <div className="space-y-2">
                          {[
                            { id: 'earnings', label: 'Deduct from Instructor Earnings Balance', hint: 'Instant launch, no fee' },
                            { id: 'mpesa', label: 'M-Pesa / Mobile Money Prompt', hint: 'Pay via STK Push on phone' },
                            { id: 'card', label: 'Credit or Debit Card', hint: 'Visa / Mastercard / Verve' },
                            { id: 'invoice', label: 'Submit for Admin Review & Approval', hint: 'Verification first, invoice later' },
                          ].map(pay => (
                            <div
                              key={pay.id}
                              onClick={() => setPaymentOption(pay.id as any)}
                              className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                                paymentOption === pay.id
                                  ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20'
                                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                              }`}
                            >
                              <div>
                                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{pay.label}</p>
                                <p className="text-[10px] text-slate-400">{pay.hint}</p>
                              </div>
                              <input
                                type="radio"
                                checked={paymentOption === pay.id}
                                readOnly
                                className="text-indigo-600 focus:ring-0 cursor-pointer"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
      </div>

      {/* Bottom Navigation Controls Bar */}
      <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          {wizardStep > 1 ? (
            <button
              type="button"
              onClick={() => setWizardStep((prev) => (prev - 1) as any)}
              className="w-full sm:w-auto px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Previous Step</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="w-full sm:w-auto px-4 py-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 font-bold text-xs transition-colors cursor-pointer text-center"
            >
              Cancel & Return
            </button>
          )}
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className="hidden sm:inline-block px-4 py-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
          >
            Save as Draft & Exit
          </button>

          {wizardStep < 4 ? (
            <button
              type="button"
              onClick={() => setWizardStep((prev) => (prev + 1) as any)}
              className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <span>Continue to Step {wizardStep + 1}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmitCampaign}
              className="w-full sm:w-auto px-7 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2"
            >
              <Megaphone className="w-4 h-4" />
              <span>{isSubmitting ? 'Launching Campaign...' : 'Launch Ad Campaign'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
