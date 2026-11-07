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
  ChevronLeft,
  CheckCircle2,
  Sun,
  Moon,
  Image as ImageIcon,
  ExternalLink,
  X,
  Send,
  Loader2,
  Paperclip
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { InstructorTabKey } from '../navigation/InstructorSidebar';
import { resolveBrandingLogoUrl, DEFAULT_LOGO_URL } from '../../lib/branding';
import { NotificationContentRenderer } from './NotificationContentRenderer';
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

const checkHasAttachment = (msg?: string) => {
  if (!msg) return false;
  return /(https?:\/\/[^\s]+|\.(png|jpe?g|gif|webp|svg|pdf|docx?|zip))/i.test(msg);
};

const getCleanPreviewText = (msg?: string) => {
  if (!msg) return '';
  const cleaned = msg
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[.*?\]\(.*?\)/g, '')
    .replace(/https?:\/\/[^\s]+/g, '')
    .trim();
  return cleaned || 'Notification detail attached.';
};

interface GroupedNotifications {
  dateLabel: string;
  items: any[];
}

const getGroupedNotifications = (notifs: any[]): GroupedNotifications[] => {
  if (!notifs || notifs.length === 0) return [];

  const sorted = [...notifs].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });

  const now = new Date();
  const todayStr = now.toLocaleDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString();

  const groupsMap: { [key: string]: any[] } = {};
  const dateOrder: string[] = [];

  sorted.forEach(item => {
    let dateLabel = 'Earlier';
    if (item.createdAt) {
      const itemDate = new Date(item.createdAt);
      const itemDateStr = itemDate.toLocaleDateString();
      if (itemDateStr === todayStr) {
        dateLabel = `Today (${itemDate.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })})`;
      } else if (itemDateStr === yesterdayStr) {
        dateLabel = `Yesterday (${itemDate.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })})`;
      } else {
        dateLabel = itemDate.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
      }
    }

    if (!groupsMap[dateLabel]) {
      groupsMap[dateLabel] = [];
      dateOrder.push(dateLabel);
    }
    groupsMap[dateLabel].push(item);
  });

  return dateOrder.map(label => ({
    dateLabel: label,
    items: groupsMap[label]
  }));
};

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
  const [isDrawerClosing, setIsDrawerClosing] = useState(false);
  const [selectedNotifId, setSelectedNotifId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [replyInput, setReplyInput] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replySuccessMessage, setReplySuccessMessage] = useState('');

  const closeDrawer = () => {
    if (isDrawerClosing) return;
    setIsDrawerClosing(true);
    setTimeout(() => {
      setNotificationsOpen(false);
      setSelectedNotifId(null);
      setIsDrawerClosing(false);
    }, 240);
  };

  const handleToggleNotifications = () => {
    if (notificationsOpen) {
      closeDrawer();
    } else {
      setNotificationsOpen(true);
    }
  };

  const handleSendNotificationReply = async (notif: any) => {
    if (!replyInput.trim() || sendingReply) return;
    setSendingReply(true);

    try {
      const courseId = notif.courseId || 'general';
      await apiFetch('reviewer-chat.php', {
        method: 'POST',
        body: JSON.stringify({
          course_id: courseId,
          courseId: courseId,
          sender_role: 'instructor',
          senderRole: 'instructor',
          recipient: 'reviewer',
          message: replyInput.trim()
        })
      });

      setReplyInput('');
      setReplySuccessMessage('Response sent successfully to reviewer!');
      setTimeout(() => setReplySuccessMessage(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to send response.');
    } finally {
      setSendingReply(false);
    }
  };

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
      const targetEl = event.target as HTMLElement;

      if (dropdownRef.current && !dropdownRef.current.contains(targetEl)) {
        setProfileDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(targetEl)) {
        // Do NOT close if click occurred inside the notification portal modal
        if (targetEl && targetEl.closest && targetEl.closest('#notification-portal-modal')) {
          return;
        }
        if (notificationsOpen) {
          closeDrawer();
        }
      }
      if (searchRef.current && !searchRef.current.contains(targetEl)) {
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
                onClick={handleToggleNotifications}
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
                <div id="notification-portal-modal" className="fixed inset-0 z-[9999] flex justify-end font-sans overflow-hidden">
                  {/* Backdrop Overlay */}
                  <div 
                    className={`fixed inset-0 bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-xs transition-opacity ${
                      isDrawerClosing ? 'animate-fadeOut' : 'animate-fadeIn'
                    }`}
                    onClick={closeDrawer}
                  />

                  {/* Right Side Drawer Panel with CSS Slide In/Out Animation */}
                  <div className={`w-full sm:w-[500px] md:w-[540px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col h-full shadow-2xl relative z-10 text-slate-900 dark:text-white transition-colors ${
                    isDrawerClosing ? 'animate-drawerSlideOut' : 'animate-drawerSlideIn'
                  }`}>
                    {/* Drawer Header - Cleaned subtitle */}
                    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-5 py-4 flex items-center justify-between shrink-0">
                      <div className="flex items-center space-x-3">
                        {selectedNotifId ? (
                          <button
                            onClick={() => setSelectedNotifId(null)}
                            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-semibold text-xs border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                            title="Back to notifications list"
                          >
                            <ChevronLeft className="w-4 h-4" />
                            <span>Back</span>
                          </button>
                        ) : (
                          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800/60 rounded-md">
                            <Bell className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                          </div>
                        )}
                        <div>
                          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                            <span>{selectedNotifId ? 'Notification Details' : 'Notifications'}</span>
                            {unreadCount > 0 && !selectedNotifId && (
                              <span className="px-2 py-0.5 bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[10px] font-bold rounded-md">
                                {unreadCount} New
                              </span>
                            )}
                          </h2>
                        </div>
                      </div>

                      <button
                        onClick={closeDrawer}
                        className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                        title="Close Drawer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Drawer Scrollable Content Body */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
                      {selectedNotifId ? (
                        /* Single Notification Detail & Response View */
                        (() => {
                          const activeNotif = instructorNotifications?.find(n => n.id === selectedNotifId);
                          if (!activeNotif) return (
                            <div className="text-center py-10 text-slate-400 text-xs">Notification not found.</div>
                          );

                          return (
                            <div className="space-y-5 animate-fadeIn">
                              <div className="p-4 bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3 shadow-2xs">
                                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${
                                    activeNotif.type === 'price_adjustment'
                                      ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/80'
                                      : activeNotif.type === 'reviewer_message'
                                      ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/80'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                  }`}>
                                    {activeNotif.type === 'price_adjustment' ? 'Price Adjustment Request' : activeNotif.type === 'reviewer_message' ? 'Reviewer Message' : 'System Notice'}
                                  </span>
                                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                                    {activeNotif.createdAt ? new Date(activeNotif.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Recent'}
                                  </span>
                                </div>

                                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                                  {activeNotif.title}
                                </h3>

                                <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                  <NotificationContentRenderer message={activeNotif.message} />
                                </div>

                                {activeNotif.suggestedPrice && (
                                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-md text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between font-mono">
                                    <span>Recommended Price Adjustment:</span>
                                    <span className="text-sm font-black text-amber-600 dark:text-amber-400">${Number(activeNotif.suggestedPrice).toFixed(2)}</span>
                                  </div>
                                )}

                                {/* Actions for active notification: Mark as Read / Ready */}
                                <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                                  <button
                                    type="button"
                                    onClick={() => markInstructorNotificationAsRead(activeNotif.id)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-semibold border flex items-center space-x-1.5 cursor-pointer transition-colors ${
                                      activeNotif.read
                                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                        : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                                    }`}
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>{activeNotif.read ? 'Marked as Read / Ready' : 'Mark as Ready'}</span>
                                  </button>

                                  {activeNotif.courseId && (
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                      Course ID: #{activeNotif.courseId}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Response / Comment Composer Panel */}
                              <div className="p-4 bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3 shadow-2xs">
                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                                  <Send className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                  <span>Respond / Comment to Reviewer</span>
                                </h4>

                                {replySuccessMessage && (
                                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-md font-medium">
                                    {replySuccessMessage}
                                  </div>
                                )}

                                <div className="space-y-2">
                                  <textarea
                                    value={replyInput}
                                    onChange={(e) => setReplyInput(e.target.value)}
                                    placeholder="Type your response, comment, or update for the reviewer..."
                                    rows={3}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden transition-all resize-none"
                                  />

                                  <div className="flex justify-end">
                                    <button
                                      type="button"
                                      onClick={() => handleSendNotificationReply(activeNotif)}
                                      disabled={!replyInput.trim() || sendingReply}
                                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-md flex items-center space-x-2 transition-colors cursor-pointer"
                                    >
                                      {sendingReply ? (
                                        <>
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                          <span>Sending...</span>
                                        </>
                                      ) : (
                                        <>
                                          <Send className="w-3.5 h-3.5" />
                                          <span>Send Response</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        /* Grouped Notifications List View grouped by Date */
                        (() => {
                          const grouped = getGroupedNotifications(instructorNotifications);
                          if (!grouped || grouped.length === 0) {
                            return (
                              <div className="p-10 text-center rounded-lg bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs space-y-2">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                                <p className="font-bold text-slate-800 dark:text-white">All caught up!</p>
                                <p>You have no pending notices or reviewer messages.</p>
                              </div>
                            );
                          }

                          return (
                            <div className="space-y-5">
                              {grouped.map((group) => (
                                <div key={group.dateLabel} className="space-y-3">
                                  {/* Date Divider Pill Header */}
                                  <div className="flex items-center space-x-3 my-2">
                                    <div className="flex-1 border-t border-slate-200 dark:border-slate-800"></div>
                                    <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 bg-slate-200/80 dark:bg-slate-800/80 rounded-md border border-slate-300/60 dark:border-slate-700/60 font-mono">
                                      {group.dateLabel}
                                    </span>
                                    <div className="flex-1 border-t border-slate-200 dark:border-slate-800"></div>
                                  </div>

                                  {/* Cards within this Date group */}
                                  <div className="space-y-3">
                                    {group.items.map((notif) => {
                                      const hasAtt = checkHasAttachment(notif.message);
                                      const cleanPreview = getCleanPreviewText(notif.message);

                                      return (
                                        <div
                                          key={notif.id}
                                          className={`p-3.5 rounded-lg border transition-all space-y-2.5 relative ${
                                            !notif.read
                                              ? 'bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/80 shadow-2xs'
                                              : 'bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                          }`}
                                        >
                                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-1.5">
                                            <div className="flex items-center space-x-2">
                                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                                                notif.type === 'price_adjustment'
                                                  ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/80'
                                                  : notif.type === 'reviewer_message'
                                                  ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/80'
                                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                              }`}>
                                                {notif.type === 'price_adjustment' ? 'Price Adjustment' : notif.type === 'reviewer_message' ? 'Reviewer Message' : 'Notice'}
                                              </span>
                                              {!notif.read && (
                                                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                                              )}
                                            </div>
                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                              {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                                            </span>
                                          </div>

                                          <div className="space-y-1">
                                            <h3 className="font-bold text-slate-900 dark:text-white text-xs line-clamp-1">
                                              {notif.title}
                                            </h3>
                                            
                                            {/* Truncated clean message preview */}
                                            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1 font-normal">
                                              {cleanPreview}
                                            </p>

                                            {/* Compact Attachment Indicator Badge */}
                                            {hasAtt && (
                                              <div className="pt-1">
                                                <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold">
                                                  <Paperclip className="w-3 h-3 text-indigo-500" />
                                                  <span>Attachment included</span>
                                                </span>
                                              </div>
                                            )}
                                          </div>

                                          {/* Sharp Action Buttons Row */}
                                          <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80">
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                markInstructorNotificationAsRead(notif.id);
                                              }}
                                              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border flex items-center space-x-1 cursor-pointer transition-colors ${
                                                notif.read
                                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                                                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                                              }`}
                                            >
                                              <CheckCircle2 className="w-3 h-3" />
                                              <span>{notif.read ? 'Ready' : 'Mark Ready'}</span>
                                            </button>

                                            <button
                                              type="button"
                                              onClick={() => {
                                                markInstructorNotificationAsRead(notif.id);
                                                setSelectedNotifId(notif.id);
                                              }}
                                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold rounded-md flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                                            >
                                              <span>Inspect & Respond</span>
                                              <ArrowRight className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()
                      )}
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
