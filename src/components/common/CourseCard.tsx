import React, { useEffect } from 'react';
import { Star, BadgeCheck, Sparkles } from 'lucide-react';
import { Course } from '../../types';
import { SponsoredLabel } from './SponsoredLabel';
import { recordSponsoredClickApi, recordRecentlyViewedApi } from '../../lib/apiConfig';
import { useApp } from '../../context/AppContext';

interface CourseCardProps {
  course: Course;
  formatPrice: (price: number) => string;
  getDiscountPercentage: (price: number, originalPrice: number) => number;
  trackImpression?: (courseId: string) => void;
  navigate: (to: string) => void;
  className?: string;
  cardTheme?: 'white' | 'purple' | 'dark';
  discountDisplayMode?: 'save' | 'percentage';
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  formatPrice,
  getDiscountPercentage,
  trackImpression,
  navigate,
  className = "",
  cardTheme = 'white',
  discountDisplayMode = 'percentage',
}) => {
  const { addToCart, setCartModalOpen, enrolledCourses, enrollCourse, currentUser } = useApp();
  const isEnrolled = enrolledCourses?.some(e => e.id === course.id);
  const isFree = !course.price || Number(course.price) === 0;
  const hasDiscount = Boolean(course.originalPrice && course.originalPrice > course.price);
  const savedAmount = hasDiscount && course.originalPrice ? Math.max(0, course.originalPrice - course.price) : 0;
  const discountPercent = hasDiscount && course.originalPrice ? getDiscountPercentage(course.price, course.originalPrice) : 0;

  const isBestseller = Boolean(
    course.bestSeller === true ||
    (course as any).bestseller === true ||
    (course as any).isBestseller === true ||
    (course as any).is_bestseller === true ||
    course.bestSeller === 1 ||
    (course as any).bestseller === 1 ||
    (course as any).bestseller === '1' ||
    course.bestSeller === '1' ||
    (course as any).is_bestseller === '1' ||
    (course as any).isBestseller === '1'
  );

  const isPremiumCourse = Boolean(
    course.isPremium === true ||
    (course as any).is_premium === true ||
    (course as any).premium === true ||
    course.isPremium === 1 ||
    (course as any).is_premium === 1 ||
    (course as any).premium === 1 ||
    course.isPremium === '1' ||
    (course as any).is_premium === '1' ||
    (course as any).premium === '1'
  );

  const isSponsoredCourse = Boolean(
    course.isSponsored === true ||
    (course as any).is_sponsored === true ||
    (course as any).sponsored === true ||
    (course as any).isSponsoredAd === true ||
    (course as any).is_sponsored_ad === true ||
    (course as any).promoted === true ||
    (course as any).is_ad === true ||
    course.isSponsored === 1 ||
    (course as any).is_sponsored === 1 ||
    (course as any).sponsored === 1 ||
    (course as any).isSponsoredAd === 1 ||
    (course as any).is_sponsored_ad === 1 ||
    (course as any).promoted === 1 ||
    (course as any).is_ad === 1 ||
    course.isSponsored === '1' ||
    (course as any).is_sponsored === '1' ||
    (course as any).sponsored === '1' ||
    (course as any).isSponsoredAd === '1' ||
    (course as any).is_sponsored_ad === '1' ||
    (course as any).promoted === '1' ||
    (course as any).is_ad === '1' ||
    course.isSponsored === 'true' ||
    (course as any).is_sponsored === 'true' ||
    (course as any).sponsored === 'true'
  );

  useEffect(() => {
    if (isSponsoredCourse && trackImpression) {
      trackImpression(course.id);
    }
  }, [course.id, isSponsoredCourse, trackImpression]);

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement)?.closest?.('[data-sponsored-label], [data-sponsored-modal], [data-action-btn]')) {
      return;
    }
    if (isSponsoredCourse) {
      recordSponsoredClickApi(course.id).catch(() => {});
    }
    recordRecentlyViewedApi(course.id, currentUser?.id).catch(() => {});
    navigate(`/course/${course.id}`);
  };

  const handleEnroll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEnrolled) {
      navigate(`/learn/${course.id}`);
      return;
    }
    if (isFree) {
      if (enrollCourse) {
        enrollCourse(course);
      }
      navigate(`/learn/${course.id}`);
      return;
    }
    if (addToCart) {
      addToCart(course);
    }
    if (setCartModalOpen) {
      setCartModalOpen(true);
    } else {
      navigate(`/checkout?course_id=${encodeURIComponent(course.id)}`);
    }
  };

  const isPurpleCard = cardTheme === 'purple';
  const isDarkCard = cardTheme === 'dark';

  return (
    <div
      onClick={handleCardClick}
      className={`cursor-pointer select-none group ${className}`}
    >
      {/* Squeezed compact height, wider width Udemy-style card */}
      <div 
        className={`h-full rounded-xl flex flex-col justify-between relative overflow-hidden border p-2 sm:p-2.5 transition-all duration-300 ${
          isPurpleCard
            ? 'bg-gradient-to-b from-purple-850 to-indigo-950 text-white border-purple-400/30 shadow-md'
            : isDarkCard
              ? 'bg-slate-950 text-white border-purple-950/50 shadow-md'
              : 'bg-transparent dark:bg-transparent text-slate-900 dark:text-white border-slate-200/80 dark:border-slate-800 shadow-none group-hover:bg-white group-hover:dark:bg-slate-900 group-hover:shadow-md group-hover:border-slate-300 dark:group-hover:border-slate-700'
        }`}
      >
        <div>
          {/* Inset Course Thumbnail using object-cover to eliminate empty space without stretching */}
          <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800 mb-1.5 border border-slate-100 dark:border-slate-800/60">
            <img
              src={course.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80'}
              alt={course.title}
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80';
              }}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center"
            />
            {hasDiscount && discountDisplayMode !== 'save' && (
              <div className="absolute top-1.5 right-1.5 z-10">
                {discountPercent > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-600 text-white font-black text-[9px] sm:text-[10px] rounded shadow-xs tracking-tight">
                    -{discountPercent}%
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Details Section (Squeezed compact vertical spacing, no instructor text) */}
          <div className="space-y-0.5 mb-1.5">
            {/* Title */}
            <h4 
              className={`font-bold text-xs sm:text-[12.5px] leading-tight line-clamp-1 transition-colors ${
                isPurpleCard 
                  ? 'text-white group-hover:text-purple-200' 
                  : 'text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
              }`}
              title={course.title}
            >
              {course.title}
            </h4>

            {/* Badges & Rating Row */}
            <div className="flex items-center flex-wrap gap-1 pt-0.5">
              {isSponsoredCourse && (
                <span className="px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 font-extrabold text-[9px] rounded tracking-tight flex items-center gap-0.5 border border-amber-300/80 dark:border-amber-700/80 shadow-xs">
                  <Sparkles className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 fill-amber-500 shrink-0" />
                  <span>Sponsored</span>
                </span>
              )}
              {isBestseller && (
                <span className="px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-extrabold text-[9px] rounded tracking-tight">
                  Bestseller
                </span>
              )}
              {isPremiumCourse && (
                <span className="px-1.5 py-0.2 bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 font-extrabold text-[9px] rounded tracking-tight flex items-center gap-0.5">
                  <BadgeCheck className="w-2.5 h-2.5" />
                  Premium
                </span>
              )}
              <div className="flex items-center space-x-0.5 px-1 py-0.2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 rounded text-[10px]">
                <span className={`font-bold ${isPurpleCard ? 'text-amber-300' : 'text-slate-800 dark:text-slate-200'}`}>
                  {typeof course.rating === 'number' ? course.rating.toFixed(1) : '4.6'}
                </span>
                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 shrink-0" />
              </div>
              <div className="px-1 py-0.2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 rounded text-[9px] text-slate-500 dark:text-slate-400">
                {(course.reviewCount ?? 0).toLocaleString()} ratings
              </div>
            </div>
          </div>
        </div>

        {/* Pricing & Enroll Button Row (Squeezed compact height) */}
        <div className={`pt-1.5 border-t flex items-center justify-between gap-1.5 ${isPurpleCard ? 'border-purple-400/20' : 'border-slate-100 dark:border-slate-800'}`}>
          <div className="flex flex-col min-w-0">
            <div className="flex items-baseline flex-wrap gap-x-1">
              <span className={`text-xs sm:text-sm font-black tracking-tight ${isPurpleCard ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                {formatPrice(course.price)}
              </span>
              {hasDiscount && course.originalPrice && (
                <span className="text-[10px] text-slate-400 dark:text-slate-500 line-through font-semibold">
                  {formatPrice(course.originalPrice)}
                </span>
              )}
            </div>
            {hasDiscount && course.originalPrice && (
              <div className="mt-0.5">
                {discountDisplayMode === 'save' ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 bg-emerald-600 text-white font-black text-[9.5px] rounded shadow-xs tracking-tight">
                    Save {formatPrice(savedAmount)}
                  </span>
                ) : (
                  discountPercent > 0 && (
                    <span className="inline-flex items-center px-1.5 py-0.5 bg-red-600 text-white font-black text-[9.5px] rounded shadow-xs tracking-tight">
                      Save {discountPercent}%
                    </span>
                  )
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {isSponsoredCourse && (
              <div data-sponsored-label="true">
                <SponsoredLabel size="xs" />
              </div>
            )}
            {/* Enroll Button */}
            <button
              data-action-btn="true"
              onClick={handleEnroll}
              className={`py-1 px-3 font-bold text-[11px] rounded-lg transition-all cursor-pointer active:scale-[0.98] ${
                isEnrolled
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500'
                  : isFree
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                    : 'bg-transparent hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-600 dark:border-indigo-500'
              }`}
            >
              {isEnrolled ? 'Start Learning' : isFree ? 'Enroll Free' : 'Enroll'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
