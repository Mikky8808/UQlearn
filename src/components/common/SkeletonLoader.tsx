import React from 'react';

export const SkeletonBox: React.FC<{ className?: string }> = ({ className = 'h-4 w-full' }) => {
  return (
    <div className={`bg-slate-200 dark:bg-slate-800 animate-pulse rounded-xl ${className}`} />
  );
};

export const SkeletonCard: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-xl shrink-0" />
        <div className="space-y-2 flex-1">
          <SkeletonBox className="h-4 w-3/4" />
          <SkeletonBox className="h-3 w-1/2" />
        </div>
      </div>
      <SkeletonBox className="h-20 w-full" />
      <div className="flex justify-between items-center pt-2">
        <SkeletonBox className="h-6 w-20" />
        <SkeletonBox className="h-9 w-28" />
      </div>
    </div>
  );
};

export const SkeletonTableRows: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg shrink-0" />
          <div className="space-y-2 flex-1">
            <SkeletonBox className="h-4 w-1/3" />
            <SkeletonBox className="h-3 w-1/4" />
          </div>
          <SkeletonBox className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
};
