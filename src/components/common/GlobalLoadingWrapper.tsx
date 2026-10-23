import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { SkeletonCard, SkeletonTableRows, SkeletonBox } from './SkeletonLoader';

interface GlobalLoadingWrapperProps {
  children: React.ReactNode;
}

export const GlobalLoadingWrapper: React.FC<GlobalLoadingWrapperProps> = ({ children }) => {
  const { isLoadingCourses, loadingState } = useApp() as any;
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Fallback safety timeout so loading never gets stuck indefinitely
  useEffect(() => {
    const safety = setTimeout(() => {
      setInitialLoading(false);
    }, 1500);
    return () => clearTimeout(safety);
  }, []);

  if (initialLoading || isLoadingCourses || (loadingState && (loadingState.courses || loadingState.dashboard))) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-12 space-y-8 animate-in fade-in duration-300">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <SkeletonBox className="h-8 w-64" />
              <SkeletonBox className="h-4 w-96" />
            </div>
            <SkeletonBox className="h-10 w-32 rounded-xl" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>

          <div className="pt-6">
            <SkeletonTableRows rows={5} />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
