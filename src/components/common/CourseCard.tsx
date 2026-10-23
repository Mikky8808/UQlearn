import React, { useEffect } from 'react';
import { Star, BadgeCheck } from 'lucide-react';
import { Course } from '../../types';
import { SponsoredLabel } from './SponsoredLabel';
import { recordSponsoredClickApi } from '../../lib/apiConfig';
import { useApp } from '../../context/AppContext';

interface CourseCardProps {
  course: Course;
  formatPrice: (price: number) => string;
  getDiscountPercentage: (price: number, originalPrice: number) => number;
  trackImpression?: (courseId: string) => void;
  navigate: (to: string) => void;
  className?: string;
  cardTheme?: 'white' | 'purple' | 'dark';
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  formatPrice,
  getDiscountPercentage,
  trackImpression,
  navigate,
  className = "",
  cardTheme = 'white',
}) => {
  const { addToCart, setCartModalOpen } = useApp();
  const hasDiscount = Boolean(course.originalPrice && course.originalPrice > course.price);

  const isBestseller = Boolean(
    course.bestSeller || 
    (course as any).bestseller || 
    (course as any).isBestseller
  );

  const isPremiumCourse = Boolean(course.isPremium || (course as any).is_premium);

  useEffect(() => {
    if (course.isSponsored && trackImpression) {
      trackImpression(course.id);
    }
  }, [course.id, course.isSponsored, trackImpression]);

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement)?.closest?.('[data-sponsored-label], [data-sponsored-modal], [data-action-btn]')) {
      return;
    }
    if (course.isSponsored) {
      recordSponsoredClickApi(course.id).catch(() => {});
    }
    navigate(`/course/${course.id}`);
  };

  const handleEnroll = (e: React.MouseEvent) => {
    e.stopPropagation();
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
        <div className={`pt-1.5 border-t flex items-center justify-between ${isPurpleCard ? 'border-purple-400/20' : 'border-slate-100 dark:border-slate-800'}`}>
          <div className="flex items-baseline space-x-1">
            <span className={`text-xs sm:text-sm font-black tracking-tight ${isPurpleCard ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
              {formatPrice(course.price)}
            </span>
            {hasDiscount && course.originalPrice && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500 line-through font-semibold">
                {formatPrice(course.originalPrice)}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {course.isSponsored && (
              <div data-sponsored-label="true">
                <SponsoredLabel size="xs" />
              </div>
            )}
            {/* Enroll Button */}
            <button
              data-action-btn="true"
              onClick={handleEnroll}
              className="py-1 px-3 bg-transparent hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-600 dark:border-indigo-500 font-bold text-[11px] rounded-lg transition-all cursor-pointer active:scale-[0.98]"
            >
              Enroll
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
