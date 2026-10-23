import React from 'react';

/**
 * KilimallCourseCardSkeleton
 * Compact shelf skeleton matching the KilimallCourseCard layout on the Landing Page.
 */
export const KilimallCourseCardSkeleton: React.FC = () => {
  return (
    <div className="flex-shrink-0 w-[195px] sm:w-[220px] select-none animate-pulse">
      <div className="h-[310px] p-2.5 sm:p-3 rounded-lg bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-950/60 shadow-xs flex flex-col justify-between relative overflow-hidden">
        <div>
          {/* Thumbnail Skeleton */}
          <div className="relative aspect-square sm:aspect-[4/3] overflow-hidden rounded-md bg-slate-200/80 dark:bg-slate-800 mb-2 border border-slate-200/50 dark:border-slate-800">
            <div className="w-full h-full bg-slate-200 dark:bg-slate-700/60 rounded-md" />
          </div>

          {/* Title Placeholder */}
          <div className="space-y-1.5 mb-2">
            <div className="w-full h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md" />
            <div className="w-3/4 h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </div>

          {/* Category / Instructor tag Skeleton */}
          <div className="flex items-center justify-between mb-2">
            <div className="w-16 h-2.5 bg-purple-100 dark:bg-purple-950/40 rounded-sm" />
            <div className="w-12 h-2.5 bg-slate-200 dark:bg-slate-800 rounded-sm" />
          </div>

          {/* Rating Row Skeleton */}
          <div className="flex items-center justify-between text-xs mb-2">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-amber-200/70 dark:bg-amber-900/40 rounded-full" />
              <div className="w-8 h-3 bg-slate-200 dark:bg-slate-800 rounded-sm" />
              <div className="w-10 h-3 bg-slate-200 dark:bg-slate-800 rounded-sm" />
            </div>
            <div className="w-8 h-3 bg-slate-200 dark:bg-slate-800 rounded-sm" />
          </div>
        </div>

        {/* Pricing Section Skeleton */}
        <div className="pt-2 mt-1 border-t border-purple-50 dark:border-slate-800/80">
          <div className="w-20 h-4 bg-slate-300 dark:bg-slate-700 rounded-sm mb-1.5" />
          <div className="flex items-center space-x-1.5">
            <div className="w-12 h-3 bg-slate-200/70 dark:bg-slate-800/70 rounded-sm" />
            <div className="w-10 h-3.5 bg-purple-200 dark:bg-purple-900/60 rounded-sm" />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * CatalogCourseCardSkeleton
 * Grid card skeleton matching the CourseCatalog and SearchResults view cards.
 */
export const CatalogCourseCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-sm border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs flex flex-col animate-pulse">
      {/* Thumbnail */}
      <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-t-xs" />

      {/* Card Body */}
      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          {/* Badges & Rating */}
          <div className="flex items-center justify-between text-xs min-h-[1.25rem]">
            <div className="w-16 h-4 bg-slate-200 dark:bg-slate-800 rounded-xs" />
            <div className="w-14 h-4 bg-slate-200 dark:bg-slate-800 rounded-xs" />
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <div className="w-full h-4 bg-slate-200 dark:bg-slate-800 rounded-xs" />
            <div className="w-4/5 h-4 bg-slate-200 dark:bg-slate-800 rounded-xs" />
          </div>

          {/* Subtitle / Description */}
          <div className="space-y-1 pt-1">
            <div className="w-full h-3 bg-slate-200/70 dark:bg-slate-800/70 rounded-xs" />
            <div className="w-3/5 h-3 bg-slate-200/70 dark:bg-slate-800/70 rounded-xs" />
          </div>
        </div>

        {/* Footer Meta & Instructor */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs">
            <div className="w-16 h-3 bg-slate-200 dark:bg-slate-800 rounded-xs" />
            <div className="w-20 h-3 bg-slate-200 dark:bg-slate-800 rounded-xs" />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
              <div className="w-20 h-3 bg-slate-200 dark:bg-slate-800 rounded-xs" />
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-16 h-5 bg-slate-200 dark:bg-slate-800 rounded-xs" />
              <div className="w-10 h-3 bg-slate-200/60 dark:bg-slate-800/60 rounded-xs" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * EnrolledCourseCardSkeleton
 * Grid card skeleton matching the enrolled learning cards in LearnerLearningTab.
 */
export const EnrolledCourseCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-none overflow-hidden shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col justify-between animate-pulse">
      <div>
        {/* Thumbnail skeleton */}
        <div className="relative aspect-[16/9] w-full bg-slate-200/90 dark:bg-slate-800 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-slate-300/60 dark:bg-slate-700/60" />
        </div>

        {/* Card Content */}
        <div className="p-4 space-y-3">
          {/* Title line 1 & 2 */}
          <div className="space-y-1.5">
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-xs w-5/6" />
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-xs w-3/5" />
          </div>

          {/* Instructor name */}
          <div className="h-3 bg-slate-200/70 dark:bg-slate-800/70 rounded-xs w-1/3" />

          {/* Progress bar & Rating footer skeleton */}
          <div className="pt-3 space-y-2">
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-none overflow-hidden">
              <div className="bg-slate-300 dark:bg-slate-700 h-full w-1/3 rounded-none" />
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-xs w-16" />
              <div className="flex items-center space-x-1">
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-xs w-14" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const LearnerLearningGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <EnrolledCourseCardSkeleton key={i} />
      ))}
    </div>
  );
};
