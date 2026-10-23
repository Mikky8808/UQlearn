import React, { useState } from 'react';
import { Sparkles, Info, HelpCircle } from 'lucide-react';

interface SponsoredBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showInfoTooltip?: boolean;
  className?: string;
}

export const SponsoredBadge: React.FC<SponsoredBadgeProps> = ({
  size = 'sm',
  showInfoTooltip = true,
  className = '',
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const isSmall = size === 'sm';

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <div 
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`inline-flex items-center space-x-1 font-bold rounded tracking-tight select-none transition-colors border ${
          isSmall 
            ? 'px-1.5 py-0.5 text-[9px] sm:text-[10px] bg-slate-100/95 dark:bg-slate-800/95 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 shadow-xs' 
            : 'px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 shadow-xs'
        }`}
      >
        <span className="font-black tracking-normal text-slate-900 dark:text-slate-100">Sponsored</span>
        <span className="text-[8px] text-slate-400 dark:text-slate-500 font-bold">·</span>
        <Info className={`${isSmall ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-slate-400 dark:text-slate-500`} />
      </div>

      {showInfoTooltip && showTooltip && (
        <div className="absolute left-0 bottom-full mb-1.5 z-40 w-48 p-2 bg-slate-900 text-white text-[10px] leading-tight rounded-lg shadow-xl border border-slate-700 pointer-events-none animate-fadeIn">
          <div className="font-bold text-amber-400 flex items-center space-x-1 mb-0.5">
            <Sparkles className="w-2.5 h-2.5" />
            <span>Sponsored Result</span>
          </div>
          <p className="text-slate-300">
            This instructor partnered with UQlearn to promote this verified course to top marketplace positions.
          </p>
        </div>
      )}
    </div>
  );
};
