import React from 'react';
import { useApp } from '../../context/AppContext';
import { resolveBrandingLogoUrl, DEFAULT_LOGO_URL } from '../../lib/branding';
import { 
  Search, 
  Sun, 
  Moon, 
  LogOut, 
  ShieldCheck, 
  Clock, 
  Menu
} from 'lucide-react';

interface ReviewerNavbarProps {
  onToggleSidebar?: () => void;
  searchTerm?: string;
  onSearchChange?: (val: string) => void;
  pendingCount?: number;
  onLogout?: () => void;
}

export const ReviewerNavbar: React.FC<ReviewerNavbarProps> = ({
  onToggleSidebar,
  searchTerm = '',
  onSearchChange,
  pendingCount = 0,
  onLogout
}) => {
  const { currentUser, logoutUser, logoUrl, darkMode, toggleDarkMode } = useApp();

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white sticky top-0 z-40 shadow-xs backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left: Mobile Menu & Branding */}
        <div className="flex items-center space-x-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors md:hidden cursor-pointer"
              title="Toggle Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center space-x-3">
            <img 
              src={resolveBrandingLogoUrl(logoUrl)} 
              alt="UQlearn Reviewer Logo" 
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_LOGO_URL; }}
              className="w-9 h-9 object-contain rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-purple-500/30"
            />
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-base sm:text-lg font-black tracking-tight">
                  <span className="text-teal-500 dark:text-teal-400">UQ</span>
                  <span className="text-purple-600 dark:text-purple-400">learn</span>
                </span>
                <span className="bg-purple-100 dark:bg-purple-500/20 border border-purple-300 dark:border-purple-500/40 text-purple-700 dark:text-purple-300 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider hidden sm:inline-flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                  <span>Reviewer</span>
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block leading-none">Course Quality & Compliance Portal</span>
            </div>
          </div>
        </div>

        {/* Middle: Search Input */}
        {onSearchChange && (
          <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search courses, instructors, categories for review..."
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
              />
            </div>
          </div>
        )}

        {/* Right: Pending Indicator, Dark Mode & User Profile */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          
          {/* Pending Queue Badge */}
          {pendingCount > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-xl flex items-center space-x-1.5 text-xs text-amber-700 dark:text-amber-300 font-bold">
              <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 animate-pulse" />
              <span className="hidden sm:inline">{pendingCount} Pending</span>
              <span className="sm:hidden">{pendingCount}</span>
            </div>
          )}

          {/* Theme Switcher Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer border border-slate-200 dark:border-slate-700/60"
            title={darkMode ? "Switch to light theme" : "Switch to dark theme"}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Reviewer Profile Badge */}
          <div className="flex items-center space-x-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white font-bold flex items-center justify-center text-xs shadow-xs border border-purple-400/30 overflow-hidden">
              {currentUser?.avatar ? (
                <img src={currentUser.avatar} alt="Reviewer" className="w-full h-full object-cover" />
              ) : (
                <span>{(currentUser?.name || 'Reviewer').charAt(0).toUpperCase()}</span>
              )}
            </div>

            <div className="hidden lg:block text-left">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[120px]">
                {currentUser?.name || 'Course Reviewer'}
              </p>
              <p className="text-[10px] text-purple-600 dark:text-purple-300 font-medium truncate max-w-[120px]">
                Quality Evaluator
              </p>
            </div>

            <button
              onClick={onLogout || logoutUser}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer ml-1"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>
    </header>
  );
};
