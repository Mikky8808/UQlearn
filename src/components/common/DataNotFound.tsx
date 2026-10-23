import React from 'react';
import { SearchX, FolderSearch, RefreshCw, PlusCircle, LucideIcon } from 'lucide-react';

export interface DataNotFoundProps {
  title?: string;
  message?: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
    variant?: 'primary' | 'secondary' | 'outline';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  compact?: boolean;
}

export const DataNotFound: React.FC<DataNotFoundProps> = ({
  title = 'No Data Found',
  message = 'There is currently no information or records available to display.',
  icon: Icon = SearchX,
  action,
  secondaryAction,
  className = '',
  compact = false,
}) => {
  if (compact) {
    return (
      <div className={`p-6 text-center bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 ${className}`}>
        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500 mb-2">
          <Icon className="w-5 h-5" />
        </div>
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">{title}</h4>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">{message}</p>
        {action && (
          <button
            onClick={action.onClick}
            className="mt-3 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold transition-all inline-flex items-center space-x-1.5 shadow-xs cursor-pointer"
          >
            {action.icon && <action.icon className="w-3.5 h-3.5" />}
            <span>{action.label}</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`py-12 px-6 text-center bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs my-4 ${className}`}>
      <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200/60 dark:from-slate-800 dark:to-slate-800/40 border border-slate-200 dark:border-slate-700/70 flex items-center justify-center mx-auto text-slate-400 dark:text-slate-400 mb-4 shadow-inner">
        <Icon className="w-8 h-8 text-teal-600/80 dark:text-teal-400/80" />
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-black text-slate-500 dark:text-slate-400">
          !
        </div>
      </div>

      <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mb-1.5">
        {title}
      </h3>

      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed font-medium">
        {message}
      </p>

      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {action && (
            <button
              onClick={action.onClick}
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center space-x-2 shadow-md shadow-teal-600/20 active:scale-[0.98] cursor-pointer"
            >
              {action.icon ? <action.icon className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
              <span>{action.label}</span>
            </button>
          )}

          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all inline-flex items-center space-x-1.5 border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{secondaryAction.label}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default DataNotFound;
