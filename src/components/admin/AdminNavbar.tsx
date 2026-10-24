import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Menu, 
  Search, 
  Bell, 
  ChevronDown, 
  LogOut, 
  ShieldCheck, 
  BookOpen, 
  Users, 
  Settings, 
  Shield,
  GraduationCap,
  Presentation,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Tag,
  Clock
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { resolveBrandingLogoUrl, DEFAULT_LOGO_URL } from '../../lib/branding';
import { API_ENDPOINTS, apiFetch, ROOT_URL, getInstructorUrl } from '../../lib/apiConfig';

export type AdminTabKey = 
  | 'overview' 
  | 'requests'
  | 'courses' 
  | 'learner-reviews'
  | 'reviewers'
  | 'assign-courses'
  | 'subscriptions'
  | 'courses-config' 
  | 'course-categories' 
  | 'price-notices'
  | 'compliance'
  | 'users' 
  | 'payment-integrations'
  | 'payout-countries'
  | 'email-settings'
  | 'custom-mail-pricing'
  | 'settings' 
  | 'banner-manager'
  | 'top-adverts'
  | 'adverts-manager'
  | 'sponsored-ads'
  | 'promotion-management'
  | 'promotion-subscribers'
  | 'flash-sale'
  | 'php-sync'
  | 'htaccess-viewer'
  | 'visitor-tracking';

interface AdminNavbarProps {
  activeTab: AdminTabKey;
  onSelectTab: (tab: AdminTabKey) => void;
  onOpenSidebar: () => void;
  coursesCount: number;
}

export const AdminNavbar: React.FC<AdminNavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenSidebar,
  coursesCount,
}) => {
  const { currentUser, setCurrentUser, logoUrl, logoutUser, instructorNotifications } = useApp();
  const navigate = useNavigate();

  // Price adjustment notifications
  const priceNotices = (instructorNotifications || []).filter(n => n.type === 'price_adjustment');
  const pendingPriceNotices = priceNotices.filter(n => !n.status || n.status === 'pending');
  const pendingCount = pendingPriceNotices.length;

  const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
  const isAdminHost = hostname.startsWith('en.') || hostname.startsWith('admin.');
  const isLiveUqDomain = hostname.includes('uqlearn.org');
  const homePath = isAdminHost ? '/' : '/admin';
  const loginPath = isAdminHost ? '/login' : '/login/admin';
  
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setProfileDropdownOpen(false);
    try {
      setCurrentUser(null);
      localStorage.removeItem('uqlearn_user');
      sessionStorage.clear();
      await apiFetch('logout.php', { method: 'POST' }).catch(() => {});
    } catch (e) {
      console.warn('Logout error', e);
    }
    if (isAdminHost && isLiveUqDomain) {
      window.location.href = `https://en.${ROOT_URL.replace('https://', '')}/login`;
    } else {
      navigate(loginPath);
    }
  };

  const handleSwitchToStudent = () => {
    setProfileDropdownOpen(false);
    if (isLiveUqDomain && isAdminHost) {
      window.location.href = `${ROOT_URL}/`;
    } else {
      navigate('/');
    }
  };

  const handleSwitchToInstructor = () => {
    setProfileDropdownOpen(false);
    window.location.href = getInstructorUrl();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSelectTab('courses');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white transition-colors shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Left: Left-Drawer Trigger + Admin Brand */}
          <div className="flex items-center space-x-3 sm:space-x-4 shrink-0">
            <button
              onClick={onOpenSidebar}
              className="p-2 -ml-2 rounded-xl text-slate-300 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-colors cursor-pointer"
              title="Open Admin Navigation Menu"
              aria-label="Open Admin Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link to={homePath} className="flex items-center space-x-2.5 group">
              <img 
                src={resolveBrandingLogoUrl(logoUrl)} 
                alt="UQlearn Logo" 
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_LOGO_URL; }}
                className="w-10 h-10 object-contain rounded-full p-0.5 group-hover:scale-105 transition-transform drop-shadow-xs"
                referrerPolicy="no-referrer"
              />
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight select-none leading-none">
                  <span className="text-teal-400 group-hover:text-teal-300 transition-colors">UQ</span>
                  <span className="text-purple-400 group-hover:text-purple-300 transition-colors">learn</span>
                </span>
                <span className="text-[10px] font-bold text-rose-400 tracking-wider uppercase leading-tight flex items-center space-x-1">
                  <ShieldCheck className="w-2.5 h-2.5 inline" />
                  <span>Admin Console</span>
                </span>
              </div>
            </Link>

            {/* Direct 1-Click Navigation Shortcuts for Core Marketing & Advert Modules */}
            <nav className="hidden lg:flex items-center space-x-1 pl-2">
              <button
                type="button"
                onClick={() => onSelectTab('overview')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === 'overview'
                    ? 'bg-rose-600 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => onSelectTab('top-adverts')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1 ${
                  activeTab === 'top-adverts'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-rose-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Manage Top Nav Advert Banner"
              >
                <span>Top Nav Advert</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectTab('adverts-manager')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1 ${
                  activeTab === 'adverts-manager'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-teal-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Manage Section Advert Banners"
              >
                <span>Section Adverts</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectTab('sponsored-ads')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1 ${
                  activeTab === 'sponsored-ads'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-amber-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Manage Sponsored Ads"
              >
                <span>Sponsored Ads</span>
              </button>
            </nav>
          </div>

          {/* Center: Admin Search Bar */}
          <div ref={searchRef} className="flex-1 max-w-lg mx-auto relative">
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search courses, registered users, transactions & logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800/90 hover:bg-slate-800 focus:bg-slate-950 border border-slate-700 focus:border-rose-500 rounded-full text-xs text-white placeholder-slate-400 focus:ring-2 focus:ring-rose-950 transition-all outline-hidden shadow-inner"
              />
            </form>

            {/* Quick Search Autocomplete Suggestions */}
            {isSearchFocused && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 py-2 z-50 animate-fadeIn text-slate-200">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Quick Actions
                </div>
                <button
                  onClick={() => {
                    onSelectTab('course-categories');
                    setIsSearchFocused(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-rose-400 flex items-center space-x-2 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-rose-500" />
                  <span>Course Categories & Configuration: "{searchQuery}"</span>
                </button>
                <button
                  onClick={() => {
                    onSelectTab('courses');
                    setIsSearchFocused(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-rose-400 flex items-center space-x-2 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-rose-500" />
                  <span>Search Courses: "{searchQuery}"</span>
                </button>
                <button
                  onClick={() => {
                    onSelectTab('users');
                    setIsSearchFocused(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-rose-400 flex items-center space-x-2 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-rose-500" />
                  <span>Search Users Directory: "{searchQuery}"</span>
                </button>
                <button
                  onClick={() => {
                    onSelectTab('settings');
                    setIsSearchFocused(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-rose-400 flex items-center space-x-2 cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-rose-500" />
                  <span>Configure Settings for: "{searchQuery}"</span>
                </button>
              </div>
            )}
          </div>

          {/* Right: Notifications Icon & Profile Icon */}
          <div className="flex items-center space-x-2 shrink-0">
            
            {/* Notification Icon */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors relative cursor-pointer"
                title="System & Price Audit Notifications"
                aria-label="System & Price Audit Notifications"
              >
                <Bell className="w-5 h-5" />
                {pendingCount > 0 ? (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-amber-500 text-slate-950 font-black text-[10px] rounded-full ring-2 ring-slate-900 shadow-sm animate-pulse">
                    {pendingCount}
                  </span>
                ) : (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-slate-900"></span>
                )}
              </button>

              {notificationsOpen && createPortal(
                <div className="fixed inset-0 bg-slate-950 z-[9999] overflow-y-auto animate-fadeIn flex flex-col text-white font-sans">
                  {/* Top Header Row with Back Button */}
                  <div className="bg-slate-900 border-b border-slate-800 py-4 px-4 sm:px-6 lg:px-8 flex items-center justify-between shadow-md">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => setNotificationsOpen(false)}
                        className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all border border-slate-700 cursor-pointer"
                        title="Back to Admin Dashboard"
                      >
                        <ArrowLeft className="w-4 h-4 text-rose-500" />
                        <span>Back</span>
                      </button>
                      <div>
                        <h1 className="text-base sm:text-lg font-black tracking-tight uppercase flex items-center space-x-2">
                          <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse" />
                          <span>Admin Control Center Notifications</span>
                        </h1>
                        <p className="text-[11px] text-slate-400 font-mono hidden sm:block">
                          Flagged pricing deviations, course audits & system notifications
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black rounded-lg uppercase tracking-wider">
                        {pendingCount} Pending Action{pendingCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Main Content Area */}
                  <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
                    <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 space-y-4 shadow-xl">
                      <div className="border-b border-slate-800 pb-3">
                        <h2 className="text-sm font-black text-slate-200 uppercase tracking-widest flex items-center space-x-2">
                          <Tag className="w-4 h-4 text-rose-500" />
                          <span>Pending Price Adjustment Demands</span>
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
                          The system flags courses that deviate from competitive pricing limits. Instructors are notified to review or apply changes.
                        </p>
                      </div>

                      {/* Fullscreen List */}
                      <div className="space-y-4">
                        {pendingPriceNotices.length > 0 ? (
                          pendingPriceNotices.map((notice) => (
                            <div 
                              key={notice.id}
                              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/30 transition-all space-y-3 shadow-md"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-800/60 pb-2">
                                <div>
                                  <h3 className="font-bold text-slate-100 text-sm">
                                    {notice.courseTitle}
                                  </h3>
                                  <p className="text-[11px] text-slate-400 mt-0.5">
                                    Instructor: <strong className="text-slate-200">{notice.instructorName || 'Instructor'}</strong>
                                  </p>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2.5 py-1 rounded-full shrink-0">
                                  Benchmark Overpriced
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center justify-between text-xs gap-3">
                                <div className="space-y-1">
                                  <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Pricing Breakdown</span>
                                  <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                                    <span className="line-through text-rose-400 font-semibold">${notice.currentPrice?.toFixed(2)}</span>
                                    <ArrowRight className="w-3 h-3 text-slate-500" />
                                    <span className="text-emerald-400 font-black">${notice.suggestedPrice?.toFixed(2)}</span>
                                  </div>
                                </div>

                                <button
                                  onClick={() => {
                                    setNotificationsOpen(false);
                                    onSelectTab('price-notices');
                                  }}
                                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all border border-slate-700 flex items-center space-x-2 text-xs cursor-pointer"
                                >
                                  <span>Manage Request</span>
                                  <ArrowRight className="w-4 h-4 text-emerald-400" />
                                </button>
                              </div>

                              {notice.flagReason && (
                                <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs text-amber-400/90 font-mono">
                                  <strong className="text-slate-300">Flag Reason:</strong> {notice.flagReason}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800/60 text-slate-400 text-sm space-y-2">
                            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto animate-bounce" />
                            <p className="font-bold text-white">All Clear!</p>
                            <p className="text-xs">No pending price adjustments or alert requests are active.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick navigation card */}
                    <div className="p-6 bg-gradient-to-r from-rose-950/20 to-slate-900 border border-slate-800 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-center sm:text-left">
                        <h3 className="text-sm font-black text-white uppercase tracking-wider">Need comprehensive audit tools?</h3>
                        <p className="text-xs text-slate-400 mt-1">Open the complete interactive price adjustment directory for all courses.</p>
                      </div>
                      <button
                        onClick={() => {
                          setNotificationsOpen(false);
                          onSelectTab('price-notices');
                        }}
                        className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white rounded-xl text-xs font-black flex items-center space-x-2 transition-all shadow-md cursor-pointer shrink-0"
                      >
                        <Tag className="w-4 h-4" />
                        <span>Open Price Adjustments Catalog ({priceNotices.length})</span>
                      </button>
                    </div>
                  </div>
                </div>,
                document.body
              )}
            </div>

            {/* Profile Icon */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center space-x-1.5 p-1 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none"
                aria-label="Super Admin Profile Menu"
              >
                <div className="w-8 h-8 rounded-lg bg-rose-600 text-white font-black flex items-center justify-center text-xs shadow-md ring-2 ring-rose-500/50">
                  {(currentUser?.name || 'A').charAt(0).toUpperCase()}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 p-2 space-y-1 z-50 animate-fadeIn text-white">
                  <div className="px-3 py-2 border-b border-slate-800 mb-1">
                    <p className="text-xs font-black truncate">
                      {currentUser?.name || 'Administrator'}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{currentUser?.email || ''}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-black rounded-md">
                      Root Administrator
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      onSelectTab('overview');
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
                  >
                    <Shield className="w-4 h-4 text-rose-400" />
                    <span>Platform Overview</span>
                  </button>

                  <button
                    onClick={handleSwitchToStudent}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
                  >
                    <GraduationCap className="w-4 h-4 text-teal-400" />
                    <span>Student Marketplace</span>
                  </button>

                  <button
                    onClick={handleSwitchToInstructor}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
                  >
                    <Presentation className="w-4 h-4 text-indigo-400" />
                    <span>Instructor Studio</span>
                  </button>

                  <div className="border-t border-slate-800 my-1"></div>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-950/60 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out from Console</span>
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};
