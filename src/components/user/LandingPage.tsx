import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Star,
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
import { HeroContent } from './HeroContent';
import { AdvertBanner } from '../common/AdvertBanner';
import { KilimallCourseCardSkeleton } from '../common/CourseCardSkeleton';
import { CourseCard } from '../common/CourseCard';
import { SponsoredLabel } from '../common/SponsoredLabel';
import { 
  apiFetch, 
  getActiveSponsoredCoursesApi, 
  extractSponsoredCourseIds,
  recordSponsoredImpressionApi, 
  recordSponsoredClickApi,
  fetchFlashSaleConfigApi
} from '../../lib/apiConfig';
import { getStoredFlashSaleConfig, DEFAULT_FLASH_SALE_END, DEFAULT_FLASH_SALE_START } from '../admin/AdminFlashSaleManager';

// Fast Speed Stopwatch Icon with motion lines matching user's Hurry Up design
const SpeedStopwatchIcon: React.FC<{ className?: string }> = ({ className = "w-3.5 h-3.5 sm:w-4 sm:h-4" }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.9" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
    aria-hidden="true"
  >
    {/* Top crown / stem & knob */}
    <path d="M13 2v2.5" />
    <path d="M10.5 2h5" />
    
    {/* Stopwatch circular dial body */}
    <circle cx="13" cy="13.5" r="7.5" />
    
    {/* Clock hand pointing at urgency mark */}
    <path d="M13 13.5l3-3" />
    <circle cx="13" cy="13.5" r="0.75" fill="currentColor" />
    
    {/* Speed & motion wind lines rushing behind from the left */}
    <path d="M2 10.5h4" />
    <path d="M1 14h4.5" />
    <path d="M3 17.5h3.6" />
  </svg>
);

// Isolated Flash Sale Countdown component matching the Soft UI / Purple Capsule design
interface FlashSaleCountdownProps {
  endTime?: string; // ISO date string or SQL datetime set by admin
  startTime?: string;
  className?: string;
}

export const FlashSaleCountdown: React.FC<FlashSaleCountdownProps> = ({ endTime, className = '' }) => {
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
    const totalHours = Math.floor(difference / (1000 * 60 * 60));
    return {
      hours: totalHours % 10, // Show only the last digit (0-9 loop: 602 -> 2, 600 -> 0, 599 -> 9)
      rawHours: totalHours,
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
    <div className={`inline-flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-[#FFF0F3] via-[#FFE2E7] to-[#FFF0F3] dark:bg-gradient-to-r dark:from-[#270E14] dark:via-[#36131D] dark:to-[#220B10] px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl border border-[#8B2B3B]/35 dark:border-[#8B2B3B]/60 shadow-md shadow-[#8B2B3B]/10 dark:shadow-md dark:shadow-black/50 hover:shadow-lg hover:shadow-[#8B2B3B]/20 transition-all duration-300 relative group overflow-hidden ${className}`}>
      {/* Subtle Ambient Crimson Glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-[#8B2B3B]/10 via-[#8B2B3B]/5 to-transparent blur-xs pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity" />

      {/* Left Icon & Urgency Labels */}
      <div className="flex items-center space-x-2 shrink-0 relative z-10">
        {/* Softened Urgency Speed Stopwatch Badge with Gentle Ping Indicator */}
        <div className="relative">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-[#8B2B3B]/12 dark:bg-[#FFAEC0]/15 text-[#8B2B3B] dark:text-[#FFAEC0] border border-[#8B2B3B]/25 dark:border-[#FFAEC0]/30 flex items-center justify-center shrink-0 shadow-xs">
            <SpeedStopwatchIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#8B2B3B] dark:text-[#FFAEC0]" />
          </div>
          <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8B2B3B] opacity-40"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#8B2B3B]/70 border border-white dark:border-[#270E14]"></span>
          </span>
        </div>

        {/* Text Stack */}
        <div className="flex flex-col justify-center text-left">
          <span className="text-[11px] sm:text-xs font-black text-[#8B2B3B] dark:text-[#FFAEC0] uppercase tracking-wide leading-tight drop-shadow-xs">
            Hurry up!
          </span>
          <span className="text-[9px] sm:text-[10px] font-extrabold text-[#8B2B3B]/85 dark:text-[#FFAEC0]/80 uppercase tracking-widest leading-tight">
            SALE END IN:
          </span>
        </div>
      </div>

      {/* Timer Cards Container (HOURS : MINS : SECS) */}
      <div className="flex items-center space-x-1 sm:space-x-1.5 font-sans relative z-10">
        {/* Hours Card */}
        <div className="relative flex flex-col items-center justify-center px-2 sm:px-2.5 py-1 sm:py-1.5 bg-white/95 dark:bg-[#34141C] border border-[#8B2B3B]/30 dark:border-[#8B2B3B]/60 rounded-xl text-center min-w-[38px] sm:min-w-[44px] shadow-xs shadow-[#8B2B3B]/10 overflow-hidden">
          {/* Subtle Top Accent Line */}
          <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#8B2B3B] to-transparent dark:via-[#FFAEC0] opacity-70" />
          <span className="text-[#8B2B3B] dark:text-[#FFAEC0] font-black text-xs sm:text-sm md:text-base leading-none tabular-nums font-mono">
            {String(timeLeft.hours).padStart(2, '0')}
          </span>
          <span className="text-[7px] sm:text-[8px] font-black text-[#8B2B3B]/90 dark:text-[#FFAEC0]/90 uppercase tracking-widest leading-none mt-1">
            HOURS
          </span>
        </div>

        {/* Pulsing Colon Separator */}
        <div className="flex flex-col gap-1 items-center justify-center px-0.5">
          <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-[#8B2B3B] dark:bg-[#FFAEC0] animate-pulse" />
          <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-[#8B2B3B] dark:bg-[#FFAEC0] animate-pulse" />
        </div>

        {/* Mins Card */}
        <div className="relative flex flex-col items-center justify-center px-2 sm:px-2.5 py-1 sm:py-1.5 bg-white/95 dark:bg-[#34141C] border border-[#8B2B3B]/30 dark:border-[#8B2B3B]/60 rounded-xl text-center min-w-[38px] sm:min-w-[44px] shadow-xs shadow-[#8B2B3B]/10 overflow-hidden">
          {/* Subtle Top Accent Line */}
          <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#8B2B3B] to-transparent dark:via-[#FFAEC0] opacity-70" />
          <span className="text-[#8B2B3B] dark:text-[#FFAEC0] font-black text-xs sm:text-sm md:text-base leading-none tabular-nums font-mono">
            {String(timeLeft.minutes).padStart(2, '0')}
          </span>
          <span className="text-[7px] sm:text-[8px] font-black text-[#8B2B3B]/90 dark:text-[#FFAEC0]/90 uppercase tracking-widest leading-none mt-1">
            MINS
          </span>
        </div>

        {/* Pulsing Colon Separator */}
        <div className="flex flex-col gap-1 items-center justify-center px-0.5">
          <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-[#8B2B3B] dark:bg-[#FFAEC0] animate-pulse" />
          <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-[#8B2B3B] dark:bg-[#FFAEC0] animate-pulse" />
        </div>

        {/* Secs Card (Extra Dynamic Crimson Glow) */}
        <div className="relative flex flex-col items-center justify-center px-2 sm:px-2.5 py-1 sm:py-1.5 bg-gradient-to-b from-white to-[#FFF5F7] dark:from-[#3D1721] dark:to-[#311119] border border-[#8B2B3B]/45 dark:border-[#8B2B3B]/70 rounded-xl text-center min-w-[38px] sm:min-w-[44px] shadow-xs shadow-[#8B2B3B]/20 ring-1 ring-[#8B2B3B]/20 overflow-hidden">
          {/* Highlight Top Accent Line */}
          <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-[#8B2B3B] to-[#B3354B] dark:from-[#FFAEC0] dark:to-[#FF859B]" />
          <span className="text-[#8B2B3B] dark:text-[#FF8DA5] font-black text-xs sm:text-sm md:text-base leading-none tabular-nums font-mono">
            {String(timeLeft.seconds).padStart(2, '0')}
          </span>
          <span className="text-[7px] sm:text-[8px] font-black text-[#8B2B3B] dark:text-[#FF8DA5] uppercase tracking-widest leading-none mt-1">
            SECS
          </span>
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

            {!countdown && (
              <Link
                to={seeAllLink}
                className="w-9 h-9 sm:w-11 sm:h-11 bg-[#9333ea] hover:bg-[#822ad2] rounded-full flex items-center justify-center text-white shadow-lg border border-purple-300/30 hover:scale-105 active:scale-95 transition-all group shrink-0"
                title="See all items"
                aria-label={`See all ${title}`}
              >
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3] text-white group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}
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
              <KilimallCourseCardSkeleton 
                key={`skeleton-${idx}`} 
                className="w-[220px] xs:w-[250px] sm:w-[290px] flex-shrink-0"
              />
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

// Helper to alternate course card sequence dynamically on each page reload
const rotateCoursesOnReload = (list: Course[], seedOffset: number): Course[] => {
  if (!list || list.length <= 1) return list;

  // Separate sponsored courses so paid/sponsored placements remain prioritized at the front
  const sponsored = list.filter(c => c.isSponsored);
  const regular = list.filter(c => !c.isSponsored);

  if (regular.length <= 1) return list;

  const rotateAmount = Math.abs(seedOffset) % regular.length;
  const rotatedRegular = [...regular.slice(rotateAmount), ...regular.slice(0, rotateAmount)];

  let rotatedSponsored = sponsored;
  if (sponsored.length > 1) {
    const spRotateAmount = Math.abs(seedOffset) % sponsored.length;
    rotatedSponsored = [...sponsored.slice(spRotateAmount), ...sponsored.slice(0, spRotateAmount)];
  }

  return [...rotatedSponsored, ...rotatedRegular];
};

interface LandingPageProps {
  courses: Course[];
  onSignUpClick?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  courses,
}) => {
  const { currentUser, enrolledCourses, formatPrice, getDiscountPercentage, isLoadingCourses, categories } = useApp();
  const isCoursesLoading = Boolean(isLoadingCourses || courses.length === 0);
  const navigate = useNavigate();

  // Random rotation seed generated once per page load to give fresh alternating course cards on every refresh
  const [reloadSeed] = useState(() => Math.floor(Math.random() * 100) + 1);

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
        const ids = extractSponsoredCourseIds(res);
        setSponsoredCourseIds(ids);
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
    isSponsored: Boolean(
      c.isSponsored === true ||
      (c as any).is_sponsored === true ||
      (c as any).isSponsored == 1 ||
      (c as any).is_sponsored == 1 ||
      sponsoredCourseIds.includes(String(c.id)) ||
      sponsoredCourseIds.includes(String((c as any).course_id))
    )
  }));

  const activeCategories = Array.from(new Set([
    ...processedCourses.filter(c => userWishlistIds.includes(c.id) || enrolledIds.includes(c.id)).map(c => c.category),
    ...browsedCategories
  ]));

  const personalizedCourses = useMemo(() => {
    const filtered = processedCourses
      .filter(c => c.isPublished && (c.isApprovedByAdmin || (currentUser && (currentUser.role === 'admin' || currentUser.role === 'instructor'))) && !enrolledIds.includes(c.id))
      .filter(c => activeCategories.length === 0 || activeCategories.includes(c.category) || userWishlistIds.includes(c.id))
      .sort((a, b) => {
        if (a.isSponsored && !b.isSponsored) return -1;
        if (!a.isSponsored && b.isSponsored) return 1;
        return (b.rating || 0) - (a.rating || 0);
      })
      .slice(0, 12);

    return rotateCoursesOnReload(filtered, reloadSeed + 1);
  }, [processedCourses, activeCategories, userWishlistIds, enrolledIds, currentUser, reloadSeed]);

  const trendingCourses = useMemo(() => {
    const sorted = [...processedCourses]
      .filter(c => c.isPublished && (c.isApprovedByAdmin || (currentUser && (currentUser.role === 'admin' || currentUser.role === 'instructor'))))
      .sort((a, b) => {
        if (a.isSponsored && !b.isSponsored) return -1;
        if (!a.isSponsored && b.isSponsored) return 1;
        return (b.reviewCount || 0) - (a.reviewCount || 0);
      })
      .filter(c => (c.rating || 0) >= 3.5)
      .slice(0, 12);

    return rotateCoursesOnReload(sorted, reloadSeed + 2);
  }, [processedCourses, currentUser, reloadSeed]);

  const [flashSaleConfig, setFlashSaleConfig] = useState(getStoredFlashSaleConfig());
  useEffect(() => {
    const loadServerConfig = async () => {
      try {
        const remote = await fetchFlashSaleConfigApi();
        if (remote && typeof remote === 'object' && remote.success !== false) {
          const merged = {
            enabled: Boolean(remote.enabled),
            title: remote.title || 'Top selling items',
            startTime: remote.startTime || null,
            endTime: remote.endTime || null,
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
    let baseList: Course[] = [];
    if (flashSaleConfig.courseIds && flashSaleConfig.courseIds.length > 0) {
      const marked = processedCourses.filter(c => flashSaleConfig.courseIds.includes(c.id));
      if (marked.length > 0) baseList = marked;
    }
    if (baseList.length === 0) {
      baseList = [...processedCourses]
        .filter(c => c.isPublished && (c.isApprovedByAdmin || (currentUser && (currentUser.role === 'admin' || currentUser.role === 'instructor'))))
        .sort((a, b) => {
          if (a.isSponsored && !b.isSponsored) return -1;
          if (!a.isSponsored && b.isSponsored) return 1;
          const discountA = a.originalPrice && a.originalPrice > a.price ? (a.originalPrice - a.price) / a.originalPrice : 0;
          const discountB = b.originalPrice && b.originalPrice > b.price ? (b.originalPrice - b.price) / b.originalPrice : 0;
          return discountB - discountA;
        })
        .slice(0, 12);
    }
    return rotateCoursesOnReload(baseList, reloadSeed + 3);
  }, [processedCourses, flashSaleConfig, currentUser, reloadSeed]);

  const recentFindsCourses = useMemo(() => {
    const wishlisted = processedCourses.filter(c => userWishlistIds.includes(c.id));
    let baseList: Course[] = [];
    if (wishlisted.length >= 3) {
      baseList = wishlisted.slice(0, 12);
    } else {
      const others = trendingCourses.filter(c => !userWishlistIds.includes(c.id));
      baseList = [...wishlisted, ...others].slice(0, 12);
    }
    return rotateCoursesOnReload(baseList, reloadSeed + 4);
  }, [processedCourses, userWishlistIds, trendingCourses, reloadSeed]);

  const pickUpCourses = useMemo(() => {
    let baseList: Course[] = [];
    if (enrolledCourses && enrolledCourses.length > 0) {
      baseList = enrolledCourses.slice(0, 12);
    } else {
      baseList = personalizedCourses.slice(0, 12);
    }
    return rotateCoursesOnReload(baseList, reloadSeed + 5);
  }, [enrolledCourses, personalizedCourses, reloadSeed]);

  const allDisplayCategories = useMemo(() => {
    const published = processedCourses.filter(c => c.isPublished && (c.isApprovedByAdmin || (currentUser && (currentUser.role === 'admin' || currentUser.role === 'instructor'))));
    const counts = published.reduce((acc, course) => {
      if (course.category) {
        acc[course.category] = (acc[course.category] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const activeCatNames = categories && categories.length > 0
      ? categories.filter(c => c.isActive !== false).map(c => c.name)
      : Object.keys(counts);

    const uniqueNames = Array.from(new Set([...activeCatNames, ...Object.keys(counts)]));

    return uniqueNames.map(name => {
      const count = counts[name] || published.filter(c => c.category?.toLowerCase() === name.toLowerCase()).length;
      const sampleCourse = published.find(c => c.category?.toLowerCase() === name.toLowerCase() && c.image);
      return {
        name,
        count,
        image: sampleCourse?.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=300&q=80'
      };
    });
  }, [processedCourses, categories, currentUser]);

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
      {!currentUser && <HeroContent />}

      {/* Main Shelves / Showcase Containers with Jumia Stylish Cards in Purple */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-5 pb-4 space-y-4 sm:space-y-6">
        
        {/* SECTION 1: TOP SELLING ITEMS (Purple Card Container - Jumia Signature) */}
        {(isCoursesLoading || flashSaleCourses.length > 0 || trendingCourses.length > 0) && (
          <div>
            <JumiaShelfSection
              cardTheme="purple"
              title={flashSaleConfig.title || "Top selling items"}
              countdown={Boolean(flashSaleConfig.enabled && flashSaleConfig.endTime)}
              endTime={flashSaleConfig.endTime || undefined}
              startTime={flashSaleConfig.startTime || undefined}
              discountDisplayMode="save"
              items={flashSaleCourses.length > 0 ? flashSaleCourses : trendingCourses}
              isLoading={isCoursesLoading}
              seeAllLink="/courses"
              formatPrice={formatPrice}
              getDiscountPercentage={getDiscountPercentage}
              trackImpression={trackImpression}
              navigate={navigate}
            />
            <AdvertBanner slot="super_deals" />
          </div>
        )}

        {/* SECTION 4: CIRCULAR CATEGORIES (Jumia Bottom Circles Showcase) */}
        {(isCoursesLoading || allDisplayCategories.length > 0) && (
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
              {isCoursesLoading && allDisplayCategories.length === 0 ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <div key={`cat-skel-${idx}`} className="flex flex-col items-center flex-shrink-0 text-center select-none animate-pulse">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-200 dark:bg-slate-800 p-1 border-[2.5px] border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                      <div className="w-full h-full bg-slate-300/70 dark:bg-slate-700 rounded-full" />
                    </div>
                    <div className="w-14 h-3 bg-slate-200 dark:bg-slate-800 rounded-sm mt-2" />
                    <div className="w-10 h-2 bg-slate-200/70 dark:bg-slate-800/70 rounded-xs mt-1" />
                  </div>
                ))
              ) : (
                allDisplayCategories.map((cat, idx) => {
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
                })
              )}
            </div>
          </div>
        )}

        {/* SECTION 2: YOUR RECENT FINDS (Dark Card Container - Jumia Style) */}
        {(!isCoursesLoading && recentFindsCourses.length > 0) && (
          <div>
            <JumiaShelfSection
              cardTheme="dark"
              title="Your Recent Finds"
              badgeText="Recent"
              icon={<History className="w-5 h-5 text-purple-300" />}
              items={recentFindsCourses}
              isLoading={isCoursesLoading}
              seeAllLink="/courses"
              formatPrice={formatPrice}
              getDiscountPercentage={getDiscountPercentage}
              trackImpression={trackImpression}
              navigate={navigate}
            />
          </div>
        )}

        {/* SECTION 3: PICK UP FROM WHERE YOU LEFT OFF (Dark Card Container - Jumia Style) */}
        {(!isCoursesLoading && pickUpCourses.length > 0 && enrolledCourses.length > 0) && (
          <div>
            <JumiaShelfSection
              cardTheme="dark"
              title="Pick Up From Where You Left Off"
              subtitle={enrolledCourses.length > 0 ? "" : "Jumpstart your learning journey"}
              badgeText={enrolledCourses.length > 0 ? "In Progress" : "Recommended"}
              icon={<PlayCircle className="w-5 h-5 text-purple-400" />}
              items={pickUpCourses}
              isLoading={isCoursesLoading}
              seeAllLink={currentUser ? "/dashboard?tab=learning" : "/courses"}
              formatPrice={formatPrice}
              getDiscountPercentage={getDiscountPercentage}
              trackImpression={trackImpression}
              navigate={navigate}
            />
          </div>
        )}

        {/* SECTION 5: TAILORED FOR YOU (Purple Card Container) */}
        {(isCoursesLoading || personalizedCourses.length > 0) && (
          <div>
            <JumiaShelfSection
              cardTheme="purple"
              title="Tailored For You"
              subtitle="Curated courses based on your wishlist and learning interests"
              badgeText="Recommended"
              icon={<Sparkles className="w-5 h-5 text-amber-300" />}
              items={personalizedCourses}
              isLoading={isCoursesLoading}
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
        {(isCoursesLoading || trendingCourses.length > 0) && (
          <div>
            <JumiaShelfSection
              cardTheme="purple"
              title="Global Demand & Best Sellers"
              subtitle="Most engaged courses chosen by students worldwide"
              badgeText="Trending"
              icon={<TrendingUp className="w-5 h-5 text-purple-200" />}
              items={trendingCourses}
              isLoading={isCoursesLoading}
              seeAllLink="/courses"
              formatPrice={formatPrice}
              getDiscountPercentage={getDiscountPercentage}
              trackImpression={trackImpression}
              navigate={navigate}
            />
          </div>
        )}

        {/* SECTION 7+: TOP IN POPULAR CATEGORIES (Purple Card Containers) */}
        {!isCoursesLoading && allDisplayCategories.slice(0, 3).map((catObj, catIdx) => {
          const category = catObj.name;
          const rawCategoryItems = courses.filter(c => c.category === category && c.isPublished && c.isApprovedByAdmin).slice(0, 12);
          const categoryItems = rotateCoursesOnReload(rawCategoryItems, reloadSeed + catIdx + 10);
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

