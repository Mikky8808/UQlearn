import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Star,
  Flame,
  Sparkles,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Clock,
  BookOpen,
  GraduationCap,
  BadgeCheck,
  History,
  PlayCircle
} from 'lucide-react';
import { Course } from '../../types';
import { useApp } from '../../context/AppContext';
import { Footer } from '../common/Footer';
import { HeroBanner } from './HeroBanner';
import { AdvertBanner } from '../common/AdvertBanner';
import { KilimallCourseCardSkeleton } from '../common/CourseCardSkeleton';
import { CourseCard } from '../common/CourseCard';
import { SponsoredLabel } from '../common/SponsoredLabel';
import { 
  apiFetch, 
  getActiveSponsoredCoursesApi, 
  recordSponsoredImpressionApi, 
  recordSponsoredClickApi,
  fetchFlashSaleConfigApi
} from '../../lib/apiConfig';
import { getStoredFlashSaleConfig, DEFAULT_FLASH_SALE_END, DEFAULT_FLASH_SALE_START } from '../admin/AdminFlashSaleManager';

// Isolated Flash Sale Countdown component to avoid re-rendering entire LandingPage
interface FlashSaleCountdownProps {
  endTime?: string; // ISO date string or SQL datetime set by admin
  startTime?: string;
}

const FlashSaleCountdown: React.FC<FlashSaleCountdownProps> = ({ endTime }) => {
  const getTargetTimestamp = useCallback(() => {
    if (endTime) {
      const parsed = new Date(endTime).getTime();
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return new Date(DEFAULT_FLASH_SALE_END).getTime();
  }, [endTime]);

  const getTimeRemaining = useCallback(() => {
    const target = getTargetTimestamp();
    const difference = Math.max(0, target - Date.now());
    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60)
    };
  }, [getTargetTimestamp]);

  const [timeLeft, setTimeLeft] = useState(getTimeRemaining);

  useEffect(() => {
    setTimeLeft(getTimeRemaining());
    const timer = setInterval(() => {
      setTimeLeft(getTimeRemaining());
    }, 1000);
    return () => clearInterval(timer);
  }, [getTimeRemaining]);

  return (
    <div className="flex items-center space-x-1 sm:space-x-1.5 bg-purple-950/70 dark:bg-purple-950/90 px-2 sm:px-3 py-1 rounded-lg border border-purple-400/40 shadow-xs">
      <span className="text-[9px] sm:text-[10px] font-black text-amber-300 uppercase tracking-tight flex items-center gap-1 shrink-0">
        <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-300 animate-pulse" />
        <span className="hidden xs:inline">Hurry up!</span> <span className="text-white/80 font-semibold">Sale end in:</span>
      </span>
      <div className="flex items-center space-x-1 font-mono font-black text-[10px] sm:text-xs text-white">
        <div className="flex flex-col items-center px-1 py-0.5 bg-white/15 border border-white/30 rounded text-center min-w-[26px]">
          <span className="text-amber-300">{String(timeLeft.days).padStart(3, '0')}</span>
          <span className="text-[7px] text-white/70 uppercase tracking-tighter scale-90">Days</span>
        </div>
        <span className="text-white/70 font-bold">:</span>
        <div className="flex flex-col items-center px-1 py-0.5 bg-white/15 border border-white/30 rounded text-center min-w-[22px]">
          <span className="text-white">{String(timeLeft.hours).padStart(2, '0')}</span>
          <span className="text-[7px] text-white/70 uppercase tracking-tighter scale-90">Hours</span>
        </div>
        <span className="text-white/70 font-bold">:</span>
        <div className="flex flex-col items-center px-1 py-0.5 bg-white/15 border border-white/30 rounded text-center min-w-[22px]">
          <span className="text-white">{String(timeLeft.minutes).padStart(2, '0')}</span>
          <span className="text-[7px] text-white/70 uppercase tracking-tighter scale-90">Mins</span>
        </div>
        <span className="text-white/70 font-bold">:</span>
        <div className="flex flex-col items-center px-1 py-0.5 bg-white/15 border border-white/30 rounded text-center min-w-[22px]">
          <span className="text-amber-300">{String(timeLeft.seconds).padStart(2, '0')}</span>
          <span className="text-[7px] text-white/70 uppercase tracking-tighter scale-90">Secs</span>
        </div>
      </div>
    </div>
  );
};

// Section Shadow Separator to create layered depth between sections
const SectionShadowSeparator: React.FC = () => (
  <div className="relative py-3 sm:py-4 select-none pointer-events-none" aria-hidden="true">
    <div className="w-full max-w-5xl mx-auto h-5 bg-gradient-to-b from-slate-400/20 via-slate-300/10 to-transparent dark:from-black/60 dark:via-black/20 dark:to-transparent rounded-[100%] filter blur-md" />
    <div className="w-11/12 max-w-4xl mx-auto h-px bg-gradient-to-r from-transparent via-slate-200/80 dark:via-slate-800/80 to-transparent -mt-2.5 opacity-60" />
  </div>
);

// Jumia-style Section Shelf with Purple Color & Dark Variant
interface JumiaShelfSectionProps {
  title: string;
  subtitle?: string;
  items: Course[];
  badgeText?: string;
  icon?: React.ReactNode;
  countdown?: boolean;
  seeAllLink?: string;
  isLoading?: boolean;
  formatPrice: (price: number) => string;
  getDiscountPercentage: (price: number, originalPrice: number) => number;
  trackImpression: (courseId: string) => void;
  navigate: (to: string) => void;
  cardTheme?: 'purple' | 'dark';
  discountDisplayMode?: 'save' | 'percentage';
  endTime?: string;
  startTime?: string;
}

const JumiaShelfSection: React.FC<JumiaShelfSectionProps> = ({
  title,
  subtitle,
  items,
  badgeText,
  icon,
  countdown = false,
  seeAllLink = '/courses',
  isLoading = false,
  formatPrice,
  getDiscountPercentage,
  trackImpression,
  navigate,
  cardTheme = 'purple',
  discountDisplayMode = 'percentage',
  endTime,
  startTime,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const targetScrollRef = useRef<number>(0);
  const scrollEndTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
  const [canScrollRight, setCanScrollRight] = useState<boolean>(true);

  const scheduleReset = () => {
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }
    resetTimeoutRef.current = setTimeout(() => {
      if (scrollContainerRef.current && scrollContainerRef.current.scrollLeft > 0) {
        targetScrollRef.current = 0;
        scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      }
    }, 2 * 60 * 1000);
  };

  const updateScrollBounds = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);
  };

  useEffect(() => {
    updateScrollBounds();
    const handleResize = () => updateScrollBounds();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
      if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
    };
  }, [items, isLoading]);

  if (items.length === 0 && !isLoading) return null;

  const getScrollStep = () => {
    const container = scrollContainerRef.current;
    if (!container) return 460;
    const firstCard = container.querySelector(':scope > div') as HTMLElement | null;
    if (firstCard) {
      const cardWidth = firstCard.offsetWidth;
      const gap = window.innerWidth >= 640 ? 14 : 12;
      const cardsCount = window.innerWidth < 640 ? 1 : 2;
      return (cardWidth + gap) * cardsCount;
    }
    return window.innerWidth < 640 ? 210 : 460;
  };

  const handleScroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const maxScroll = container.scrollWidth - container.clientWidth;
    if (maxScroll <= 0) return;

    const step = getScrollStep();
    const currentScroll = container.scrollLeft;

    if (Math.abs(targetScrollRef.current - currentScroll) > step * 1.5) {
      targetScrollRef.current = currentScroll;
    }

    let newTarget = targetScrollRef.current;

    if (direction === 'right') {
      if (targetScrollRef.current >= maxScroll - 6) {
        newTarget = maxScroll;
      } else {
        newTarget = Math.min(targetScrollRef.current + step, maxScroll);
      }
    } else {
      if (targetScrollRef.current <= 6) {
        newTarget = 0;
      } else {
        newTarget = Math.max(0, targetScrollRef.current - step);
      }
    }

    targetScrollRef.current = newTarget;

    container.scrollTo({
      left: newTarget,
      behavior: 'smooth'
    });

    scheduleReset();

    setTimeout(() => {
      updateScrollBounds();
    }, 100);
  };

  const handleContainerScroll = () => {
    scheduleReset();
    updateScrollBounds();

    if (scrollEndTimerRef.current) {
      clearTimeout(scrollEndTimerRef.current);
    }
    scrollEndTimerRef.current = setTimeout(() => {
      if (scrollContainerRef.current) {
        targetScrollRef.current = scrollContainerRef.current.scrollLeft;
        updateScrollBounds();
      }
    }, 150);
  };

  const isPurple = cardTheme === 'purple';

  return (
    <div className="relative transition-all duration-300">
      {/* Section Header: Title + Arrow Button */}
      <div className="pt-2 px-1 sm:px-2 pb-2">
        <div className="flex items-center justify-between gap-3">
          
          {/* Title Only */}
          <div className="flex items-center">
            <h2 className="text-base sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight drop-shadow-xs">
              {title}
            </h2>
          </div>

          {/* Right side: Pill Arrow Button */}
          <div className="flex items-center space-x-2.5 shrink-0">
            {countdown && <FlashSaleCountdown endTime={endTime} startTime={startTime} />}

            <Link
              to={seeAllLink}
              className="w-14 sm:w-16 h-7 sm:h-8 bg-purple-600 hover:bg-purple-700 rounded-full flex items-center justify-center text-white shadow-md hover:scale-105 active:scale-95 transition-all group shrink-0"
              title="See all items"
              aria-label={`See all ${title}`}
            >
              <ArrowRight className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.8] text-white group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

        </div>
      </div>

      {/* Scrollable Products / Courses Shelf */}
      <div className="relative group/shelf">
        <button
          type="button"
          onClick={() => handleScroll('left')}
          disabled={!canScrollLeft}
          className={`absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/95 text-purple-800 shadow-lg border border-purple-100 flex items-center justify-center transition-all active:scale-95 ${
            !canScrollLeft 
              ? 'opacity-0 pointer-events-none' 
              : 'opacity-90 hover:opacity-100 hover:scale-110 cursor-pointer'
          }`}
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        <div 
          ref={scrollContainerRef}
          onScroll={handleContainerScroll}
          className="pt-2 pb-4 px-1 sm:px-2 overflow-x-auto scrollbar-hide [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex space-x-3 sm:space-x-3.5"
        >
          {isLoading ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <KilimallCourseCardSkeleton key={`skeleton-${idx}`} />
            ))
          ) : (
            items.map((course) => (
              <CourseCard 
                key={course.id} 
                course={course}
                formatPrice={formatPrice}
                getDiscountPercentage={getDiscountPercentage}
                trackImpression={trackImpression}
                navigate={navigate}
                discountDisplayMode={discountDisplayMode}
                className="w-[220px] xs:w-[250px] sm:w-[290px] flex-shrink-0"
              />
            ))
          )}
        </div>

        <button
          type="button"
          onClick={() => handleScroll('right')}
          disabled={!canScrollRight}
          className={`absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/95 text-purple-800 shadow-lg border border-purple-100 flex items-center justify-center transition-all active:scale-95 ${
            !canScrollRight 
              ? 'opacity-0 pointer-events-none' 
              : 'opacity-90 hover:opacity-100 hover:scale-110 cursor-pointer'
          }`}
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

    </div>
  );
};

// Backwards compatibility alias
const KilimallSection = JumiaShelfSection;

interface LandingPageProps {
  courses: Course[];
  onSignUpClick?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  courses,
}) => {
  const { currentUser, enrolledCourses, formatPrice, getDiscountPercentage, isLoadingCourses } = useApp();
  const navigate = useNavigate();

  const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
  const isLiveUqDomain = hostname.includes('uqlearn.org');

  const [emailInput, setEmailInput] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [sponsoredCourseIds, setSponsoredCourseIds] = useState<string[]>([]);
  const trackedImpressionsRef = useRef<Set<string>>(new Set());

  // Fetch active sponsored ads on mount
  useEffect(() => {
    getActiveSponsoredCoursesApi()
      .then(res => {
        if (res && res.success) {
          const ids = (res.courseIds && res.courseIds.length > 0)
            ? res.courseIds
            : (Array.isArray(res.data) && res.data.length > 0)
              ? res.data
              : (Array.isArray(res.sponsoredCourses) ? res.sponsoredCourses.map((c: any) => c.courseId || c.course_id || c.id) : []);
          setSponsoredCourseIds(ids.filter(Boolean));
        }
      })
      .catch(err => {
        console.warn('Sponsored courses query:', err);
      });
  }, []);

  // Track impressions for visible sponsored courses once per session
  const trackImpression = (courseId: string) => {
    if (!courseId || trackedImpressionsRef.current.has(courseId)) return;
    trackedImpressionsRef.current.add(courseId);
    recordSponsoredImpressionApi(courseId).catch(() => {});
  };

  useEffect(() => {
    const isOldSession = sessionStorage.getItem('uqlearn_session_active');
    const isNewSession = !isOldSession;
    if (isNewSession) {
      sessionStorage.setItem('uqlearn_session_active', 'true');
    }

    apiFetch('visitor-count.php', {
      method: 'POST',
      body: JSON.stringify({ isNewSession }),
      silent: true
    })
      .then(() => {
        // Handled by apiFetch
      })
      .catch(() => {
        // Silently ignore visitor analytics ping failures when backend DB is unreachable
      });
  }, []);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput.trim()) {
      setSubscribed(true);
    }
  };

  const userWishlistIds = currentUser?.wishlist || [];
  const enrolledIds = enrolledCourses.map(c => c.id);

  let browsedCategories: string[] = [];
  try {
    browsedCategories = JSON.parse(localStorage.getItem('uqlearn_browsed_categories') || '[]');
  } catch (e) {}

  const processedCourses = courses.map(c => ({
    ...c,
    isSponsored: Boolean(c.isSponsored || sponsoredCourseIds.includes(c.id))
  }));

  const activeCategories = Array.from(new Set([
    ...processedCourses.filter(c => userWishlistIds.includes(c.id) || enrolledIds.includes(c.id)).map(c => c.category),
    ...browsedCategories
  ]));

  const personalizedCourses = processedCourses
    .filter(c => c.isPublished && (c.isApprovedByAdmin || (currentUser && (currentUser.role === 'admin' || currentUser.role === 'instructor'))) && !enrolledIds.includes(c.id))
    .filter(c => activeCategories.length === 0 || activeCategories.includes(c.category) || userWishlistIds.includes(c.id))
    .sort((a, b) => {
      if (a.isSponsored && !b.isSponsored) return -1;
      if (!a.isSponsored && b.isSponsored) return 1;
      return (b.rating || 0) - (a.rating || 0);
    })
    .slice(0, 10);

  const trendingCourses = [...processedCourses]
    .filter(c => c.isPublished && (c.isApprovedByAdmin || (currentUser && (currentUser.role === 'admin' || currentUser.role === 'instructor'))))
    .sort((a, b) => {
      if (a.isSponsored && !b.isSponsored) return -1;
      if (!a.isSponsored && b.isSponsored) return 1;
      return (b.reviewCount || 0) - (a.reviewCount || 0);
    })
    .filter(c => (c.rating || 0) >= 4.0)
    .slice(0, 10);

  const [flashSaleConfig, setFlashSaleConfig] = useState(getStoredFlashSaleConfig());
  useEffect(() => {
    const loadServerConfig = async () => {
      try {
        const remote = await fetchFlashSaleConfigApi();
        if (remote && typeof remote === 'object') {
          const merged = {
            enabled: remote.enabled !== false,
            title: remote.title || 'Top selling items',
            startTime: remote.startTime || DEFAULT_FLASH_SALE_START,
            endTime: remote.endTime || DEFAULT_FLASH_SALE_END,
            courseIds: Array.isArray(remote.courseIds) ? remote.courseIds : []
          };
          setFlashSaleConfig(merged);
          localStorage.setItem('uqlearn_admin_flash_sale_config', JSON.stringify(merged));
        }
      } catch {}
    };
    loadServerConfig();

    const handleStorage = () => setFlashSaleConfig(getStoredFlashSaleConfig());
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const flashSaleCourses = useMemo(() => {
    if (flashSaleConfig.courseIds && flashSaleConfig.courseIds.length > 0) {
      const marked = processedCourses.filter(c => flashSaleConfig.courseIds.includes(c.id));
      if (marked.length > 0) return marked;
    }
    return [...processedCourses]
      .filter(c => c.isPublished && (c.isApprovedByAdmin || (currentUser && (currentUser.role === 'admin' || currentUser.role === 'instructor'))))
      .sort((a, b) => {
        if (a.isSponsored && !b.isSponsored) return -1;
        if (!a.isSponsored && b.isSponsored) return 1;
        const discountA = a.originalPrice && a.originalPrice > a.price ? (a.originalPrice - a.price) / a.originalPrice : 0;
        const discountB = b.originalPrice && b.originalPrice > b.price ? (b.originalPrice - b.price) / b.originalPrice : 0;
        return discountB - discountA;
      })
      .slice(0, 10);
  }, [processedCourses, flashSaleConfig, currentUser]);

  const recentFindsCourses = useMemo(() => {
    const wishlisted = processedCourses.filter(c => userWishlistIds.includes(c.id));
    if (wishlisted.length >= 3) return wishlisted.slice(0, 10);
    const others = trendingCourses.filter(c => !userWishlistIds.includes(c.id));
    return [...wishlisted, ...others].slice(0, 10);
  }, [processedCourses, userWishlistIds, trendingCourses]);

  const pickUpCourses = useMemo(() => {
    if (enrolledCourses && enrolledCourses.length > 0) return enrolledCourses.slice(0, 10);
    return personalizedCourses.slice(0, 10);
  }, [enrolledCourses, personalizedCourses]);

  const allDisplayCategories = useMemo(() => {
    const counts = processedCourses.filter(c => c.isPublished && c.isApprovedByAdmin).reduce((acc, course) => {
      acc[course.category] = (acc[course.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => {
        const sampleCourse = processedCourses.find(c => c.category === name && c.image);
        return {
          name,
          count,
          image: sampleCourse?.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=300&q=80'
        };
      });
  }, [processedCourses]);

  const categoryRingColors = [
    { ring: 'border-purple-500 shadow-purple-500/20', bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300' },
    { ring: 'border-sky-400 shadow-sky-500/20', bg: 'bg-sky-50 dark:bg-sky-950/40', text: 'text-sky-700 dark:text-sky-300' },
    { ring: 'border-rose-400 shadow-rose-500/20', bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300' },
    { ring: 'border-amber-400 shadow-amber-500/20', bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300' },
    { ring: 'border-emerald-400 shadow-emerald-500/20', bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300' },
    { ring: 'border-indigo-500 shadow-indigo-500/20', bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-700 dark:text-indigo-300' },
  ];

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors pb-16">
      
      {/* Top Hero Banner */}
      {!currentUser && <HeroBanner />}

      {/* Main Shelves / Showcase Containers with Jumia Stylish Cards in Purple */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-5 pb-4 space-y-4 sm:space-y-6">
        
        {/* SECTION 1: TOP SELLING ITEMS (Purple Card Container - Jumia Signature) */}
        {(isLoadingCourses || flashSaleCourses.length > 0 || trendingCourses.length > 0) && (
          <div>
            <JumiaShelfSection
              cardTheme="purple"
              title={flashSaleConfig.title || "Top selling items"}
              countdown={true}
              discountDisplayMode="save"
              items={flashSaleCourses.length > 0 ? flashSaleCourses : trendingCourses}
              isLoading={isLoadingCourses}
              seeAllLink="/courses"
              formatPrice={formatPrice}
              getDiscountPercentage={getDiscountPercentage}
              trackImpression={trackImpression}
              navigate={navigate}
              endTime={flashSaleConfig.endTime}
              startTime={flashSaleConfig.startTime}
            />
            <AdvertBanner slot="super_deals" />
          </div>
        )}

        {/* SECTION 4: CIRCULAR CATEGORIES (Jumia Bottom Circles Showcase) */}
        {allDisplayCategories.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-purple-100 dark:border-purple-950/60 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Explore Categories
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Find expert-crafted courses in your field
                </p>
              </div>
              <Link
                to="/courses"
                className="w-12 sm:w-14 h-6 sm:h-7 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded-full flex items-center justify-center shadow-2xs hover:scale-105 active:scale-95 transition-all group"
                title="All categories"
              >
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto pb-2 scrollbar-hide [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {allDisplayCategories.map((cat, idx) => {
                const colorConfig = categoryRingColors[idx % categoryRingColors.length];
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => navigate(`/courses?category=${encodeURIComponent(cat.name)}`)}
                    className="flex flex-col items-center flex-shrink-0 group cursor-pointer text-center select-none"
                  >
                    {/* Ring Avatar */}
                    <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full p-1 border-[2.5px] ${colorConfig.ring} bg-white dark:bg-slate-800 shadow-sm transition-transform duration-300 group-hover:scale-110 flex items-center justify-center overflow-hidden`}>
                      <img 
                        src={cat.image} 
                        alt={cat.name} 
                        className="w-full h-full object-cover rounded-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=300&q=80';
                        }}
                      />
                    </div>
                    <span className="text-[11px] sm:text-xs font-semibold text-slate-800 dark:text-slate-200 mt-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-1 max-w-[85px] sm:max-w-[100px]">
                      {cat.name}
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {cat.count} {cat.count === 1 ? 'course' : 'courses'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 2: YOUR RECENT FINDS (Dark Card Container - Jumia Style) */}
        {(isLoadingCourses || recentFindsCourses.length > 0) && (
          <div>
            <JumiaShelfSection
              cardTheme="dark"
              title="Your Recent Finds"
              badgeText="Recent"
              icon={<History className="w-5 h-5 text-purple-300" />}
              items={recentFindsCourses}
              isLoading={isLoadingCourses}
              seeAllLink="/courses"
              formatPrice={formatPrice}
              getDiscountPercentage={getDiscountPercentage}
              trackImpression={trackImpression}
              navigate={navigate}
            />
          </div>
        )}

        {/* SECTION 3: PICK UP FROM WHERE YOU LEFT OFF (Dark Card Container - Jumia Style) */}
        {(isLoadingCourses || pickUpCourses.length > 0) && (
          <div>
            <JumiaShelfSection
              cardTheme="dark"
              title="Pick Up From Where You Left Off"
              subtitle={enrolledCourses.length > 0 ? "" : "Jumpstart your learning journey"}
              badgeText={enrolledCourses.length > 0 ? "In Progress" : "Recommended"}
              icon={<PlayCircle className="w-5 h-5 text-purple-400" />}
              items={pickUpCourses}
              isLoading={isLoadingCourses}
              seeAllLink={currentUser ? "/dashboard?tab=learning" : "/courses"}
              formatPrice={formatPrice}
              getDiscountPercentage={getDiscountPercentage}
              trackImpression={trackImpression}
              navigate={navigate}
            />
          </div>
        )}

        {/* SECTION 5: TAILORED FOR YOU (Purple Card Container) */}
        {(isLoadingCourses || personalizedCourses.length > 0) && (
          <div>
            <JumiaShelfSection
              cardTheme="purple"
              title="Tailored For You"
              subtitle="Curated courses based on your wishlist and learning interests"
              badgeText="Recommended"
              icon={<Sparkles className="w-5 h-5 text-amber-300" />}
              items={personalizedCourses}
              isLoading={isLoadingCourses}
              seeAllLink="/courses"
              formatPrice={formatPrice}
              getDiscountPercentage={getDiscountPercentage}
              trackImpression={trackImpression}
              navigate={navigate}
            />
            <AdvertBanner slot="tailored_for_you" />
          </div>
        )}

        {/* SECTION 6: GLOBAL DEMAND / TRENDING COURSES (Purple Card Container) */}
        {(isLoadingCourses || trendingCourses.length > 0) && (
          <div>
            <JumiaShelfSection
              cardTheme="purple"
              title="Global Demand & Best Sellers"
              subtitle="Most engaged courses chosen by students worldwide"
              badgeText="Trending"
              icon={<TrendingUp className="w-5 h-5 text-purple-200" />}
              items={trendingCourses}
              isLoading={isLoadingCourses}
              seeAllLink="/courses"
              formatPrice={formatPrice}
              getDiscountPercentage={getDiscountPercentage}
              trackImpression={trackImpression}
              navigate={navigate}
            />
          </div>
        )}

        {/* SECTION 7+: TOP IN POPULAR CATEGORIES (Purple Card Containers) */}
        {allDisplayCategories.slice(0, 3).map((catObj) => {
          const category = catObj.name;
          const categoryItems = courses.filter(c => c.category === category && c.isPublished && c.isApprovedByAdmin).slice(0, 10);
          if (categoryItems.length === 0) return null;

          return (
            <div key={category}>
              <JumiaShelfSection
                cardTheme="purple"
                title={`Top in ${category}`}
                subtitle={`Top rated and popular courses in ${category}`}
                badgeText={category}
                icon={<BookOpen className="w-5 h-5 text-purple-200" />}
                items={categoryItems}
                seeAllLink={`/courses?category=${encodeURIComponent(category)}`}
                formatPrice={formatPrice}
                getDiscountPercentage={getDiscountPercentage}
                trackImpression={trackImpression}
                navigate={navigate}
              />
            </div>
          );
        })}

      </div>

      {/* Footer Component */}
      <Footer />
    </div>
  );
};

