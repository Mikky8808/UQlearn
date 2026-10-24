import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Menu, 
  Search, 
  Bell, 
  ChevronDown, 
  LogOut, 
  BarChart2, 
  BookOpen, 
  Users, 
  MessageSquare, 
  Megaphone,
  GraduationCap,
  Plus,
  ShieldCheck,
  AlertCircle,
  Gift,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Sun,
  Moon,
  Image as ImageIcon,
  ExternalLink
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { InstructorTabKey } from '../navigation/InstructorSidebar';
import { resolveBrandingLogoUrl, DEFAULT_LOGO_URL } from '../../lib/branding';
import { isDeveloperUser } from '../../lib/developer';
import { API_BASE_URL, ROOT_URL, apiFetch, getActiveSession, updateActiveSession } from '../../lib/apiConfig';

interface InstructorNavbarProps {
  activeTab: InstructorTabKey;
  onSelectTab: (tab: InstructorTabKey) => void;
  onOpenSidebar: () => void;
  coursesCount: number;
  onOpenQuickAddModal?: () => void;
  currentUser?: any;
  complianceStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const InstructorNavbar: React.FC<InstructorNavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenSidebar,
  coursesCount,
  onOpenQuickAddModal,
  currentUser: propUser,
  complianceStatus = 'none',
  darkMode = false,
  onToggleDarkMode,
}) => {
  const { setCurrentUser, logoUrl, instructorNotifications, markInstructorNotificationAsRead, setInviteModalOpen } = useApp();
  const currentUser = propUser;
  const navigate = useNavigate();
  
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const unreadCount = instructorNotifications?.filter(n => !n.read).length || 0;

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
  const isInstructorHost = hostname.startsWith('instructor.');
  const isLiveUqDomain = hostname.includes('uqlearn.org');
  const loginPath = isInstructorHost ? '/login' : '/login/instructor';
  const homePath = isInstructorHost ? '/' : '/instructor';

  // Close dropdowns on outside click
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

  // Fetch latest avatar on mount to keep synced across multiple tabs or page transitions
  useEffect(() => {
    if (!currentUser?.id) return;

    const fetchLatestProfileAvatar = async () => {
      try {
        const result = await apiFetch(`profile.php?id=${currentUser.id}`);
        if (result && result.success && result.data) {
          const latestAvatar = result.data.avatar_url;
          const latestName = result.data.name;
          
          if (latestAvatar && latestAvatar !== currentUser.avatar) {
            setCurrentUser({
              ...currentUser,
              avatar: latestAvatar,
              name: latestName || currentUser.name
            });

            // Also update the active session storage to persist the refreshed session
            updateActiveSession({
              avatar: latestAvatar,
              name: latestName || currentUser.name
            });
          }
        }
      } catch (err) {
        console.warn('Failed to sync avatar with profile API (offline/fallback):', err);
      }
    };

    fetchLatestProfileAvatar();
  }, [currentUser?.id]);

  const handleLogout = () => {
    setCurrentUser(null);
    navigate(loginPath);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSelectTab('courses');
    }
  };

  const handleSwitchToLearner = () => {
    setProfileDropdownOpen(false);
    if (isInstructorHost && isLiveUqDomain) {
      window.location.href = `${ROOT_URL}/`;
    } else {
      navigate('/');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Left: Left-Drawer Trigger + Instructor Brand */}
          <div className="flex items-center space-x-3 sm:space-x-4 shrink-0">
            <button
              onClick={onOpenSidebar}
              className="p-2 -ml-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors cursor-pointer"
              title="Open Navigation Menu"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link to={homePath} className="flex items-center space-x-2.5 group">
              <img 
                src={resolveBrandingLogoUrl(logoUrl)} 
                alt="UQlearn Logo" 
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_LOGO_URL; }}
                className="w-9 h-9 object-contain rounded-full p-0.5 group-hover:scale-105 transition-transform drop-shadow-xs"
                referrerPolicy="no-referrer"
              />
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight select-none leading-none">
                  <span className="text-teal-600 dark:text-teal-400 group-hover:text-teal-500 transition-colors">UQ</span>
                  <span className="text-purple-600 dark:text-purple-400 group-hover:text-purple-500 transition-colors">learn</span>
                </span>
                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 tracking-wider uppercase leading-tight">
                  Instructor Studio
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Search Bar */}
          <div ref={searchRef} className="flex-1 max-w-lg mx-auto relative">
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search studio courses, learners, Q&A threads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/70 focus:bg-white dark:focus:bg-slate-800 border border-transparent focus:border-indigo-500 rounded-full text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all outline-hidden shadow-2xs"
              />
            </form>

            {/* Quick Search Autocomplete Suggestions */}
            {isSearchFocused && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-fadeIn">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Quick Filter
                </div>
                <button
                  onClick={() => {
                    onSelectTab('courses');
                    setIsSearchFocused(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 flex items-center space-x-2 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Search in My Courses: "{searchQuery}"</span>
                </button>
                <button
                  onClick={() => {
                    onSelectTab('learners');
                    setIsSearchFocused(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 flex items-center space-x-2 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Search in Learners: "{searchQuery}"</span>
                </button>
                <button
                  onClick={() => {
                    onSelectTab('qna');
                    setIsSearchFocused(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 flex items-center space-x-2 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Search in Q&A: "{searchQuery}"</span>
                </button>
              </div>
            )}
          </div>

          {/* Right: Quick Course Button, Notification Icon & Profile Icon */}
          <div className="flex items-center space-x-2 shrink-0">
            
            {/* Quick Add Course Button */}
            {onOpenQuickAddModal && (
              <button
                onClick={onOpenQuickAddModal}
                className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="Add Course with Basic Information"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Course</span>
              </button>
            )}

            {/* Switch to Learner Marketplace Icon Button */}
            <button
              onClick={handleSwitchToLearner}
              className="p-2 rounded-xl text-teal-650 hover:bg-teal-50 dark:hover:bg-teal-950/20 transition-colors cursor-pointer"
              title="Switch to Learner Marketplace"
              aria-label="Switch to Learner Marketplace"
            >
              <GraduationCap className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </button>

            {/* Theme Toggle Button */}
            {onToggleDarkMode && (
              <button
                onClick={onToggleDarkMode}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                aria-label="Toggle Dark Mode"
              >
                {darkMode ? <Sun className="w-5 h-5 text-amber-500 fill-amber-500/20" /> : <Moon className="w-5 h-5 text-slate-500 dark:text-slate-400" />}
              </button>
            )}

            {/* Notification Icon */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative cursor-pointer"
                title="Notifications"
                aria-label="Studio Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse"></span>
                )}
              </button>

              {notificationsOpen && createPortal(
                <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 z-[9999] overflow-y-auto animate-fadeIn flex flex-col text-slate-900 dark:text-white font-sans transition-colors">
                  {/* Top Header Row with Back Button */}
                  <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-4 px-4 sm:px-6 lg:px-8 flex items-center justify-between shadow-xs">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => setNotificationsOpen(false)}
                        className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
                        title="Back to Studio Dashboard"
                      >
                        <ArrowLeft className="w-4 h-4 text-indigo-500" />
                        <span>Back</span>
                      </button>
                      <div>
                        <h1 className="text-base sm:text-lg font-black tracking-tight uppercase flex items-center space-x-2">
                          <Bell className="w-5 h-5 text-indigo-500 animate-bounce" />
                          <span>Studio Activity & Alerts Hub</span>
                        </h1>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono hidden sm:block">
                          Track course review state demands, pricing updates, and policy actions
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 text-xs font-black rounded-lg uppercase tracking-wider">
                        {unreadCount} New Update{unreadCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Main Content Area */}
                  <div className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
                      <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex justify-between items-center">
                        <div>
                          <h2 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center space-x-2">
                            <Plus className="w-4 h-4 text-indigo-500" />
                            <span>My Instructor Notifications</span>
                          </h2>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Click any pending notification to mark it as read and process recommendations.
                          </p>
                        </div>
                      </div>

                      {/* Fullscreen List */}
                      <div className="space-y-4">
                        {instructorNotifications && instructorNotifications.length > 0 ? (
                          instructorNotifications.map((notif) => (
                            <div 
                              key={notif.id}
                              onClick={() => markInstructorNotificationAsRead(notif.id)}
                              className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-3 relative group ${
                                !notif.read 
                                  ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/60 shadow-xs' 
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-950/80 shadow-2xs'
                              }`}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                                <div className="flex items-center space-x-2.5">
                                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                    notif.type === 'price_adjustment'
                                      ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                  }`}>
                                    {notif.type === 'price_adjustment' ? 'Price Adjustment Request' : 'System Notice'}
                                  </span>
                                  {!notif.read && (
                                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  Action Required
                                </span>
                              </div>

                              <div className="space-y-1">
                                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                                  {notif.title}
                                </h3>
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                                  {notif.message}
                                </p>
                              </div>

                              {notif.suggestedPrice && (
                                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between font-mono">
                                  <span>System Recommended Pricing Adjustment:</span>
                                  <span className="text-sm font-black text-amber-600 dark:text-amber-400">${Number(notif.suggestedPrice).toFixed(2)}</span>
                                </div>
                              )}

                              {!notif.read && (
                                <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1.5 justify-end">
                                  <span>Click to acknowledge & mark as read</span>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-sm space-y-2">
                            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                            <p className="font-bold text-slate-800 dark:text-white">All caught up!</p>
                            <p className="text-xs">You have no pending notices or recommendations.</p>
                          </div>
                        )}
                      </div>
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
                className="flex items-center space-x-1.5 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none"
                aria-label="Instructor Profile Menu"
              >
                {currentUser?.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-lg object-cover ring-2 ring-indigo-500"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                    {(currentUser?.name || 'I').charAt(0).toUpperCase()}
                  </div>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 space-y-1 z-50 animate-fadeIn">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                    <p className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                      {currentUser?.name || 'Instructor'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{currentUser?.email}</p>
                    <div className="flex items-center space-x-1.5 mt-1.5">
                      <span className={`px-2 py-0.5 text-[10px] font-black rounded-md border ${
                        complianceStatus === 'approved' 
                          ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' 
                          : complianceStatus === 'pending'
                          ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}>
                        {complianceStatus === 'approved' ? 'Verified Educator' : 
                         complianceStatus === 'pending' ? 'Verification Pending' : 
                         'Unverified Profile'}
                      </span>
                      {complianceStatus === 'approved' && (
                        <ShieldCheck className="w-3 h-3 text-emerald-500" />
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onSelectTab('analytics');
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <BarChart2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Payout & Analytics Dashboard</span>
                  </button>

                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      setInviteModalOpen(true);
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 cursor-pointer"
                  >
                    <Gift className="w-4 h-4 text-teal-500" />
                    <span>Invite Friend / Share Studio</span>
                  </button>

                  <button
                    onClick={handleSwitchToLearner}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <GraduationCap className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>Switch to Learner Marketplace</span>
                  </button>

                  <a
                    href="/course-image-quality-standards"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer"
                  >
                    <div className="flex items-center space-x-2">
                      <ImageIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Image Quality Standards</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>

                  <div className="border-t border-slate-100 dark:border-slate-800 my-1"></div>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out from Studio</span>
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
