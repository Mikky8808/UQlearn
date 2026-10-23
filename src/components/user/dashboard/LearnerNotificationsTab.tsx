import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bell, 
  Megaphone, 
  CheckCircle2, 
  Sparkles, 
  Clock, 
  BookOpen, 
  Trash2,
  ExternalLink,
  RefreshCw,
  Search,
  Filter,
  Award,
  ArrowRight,
  CheckCheck
} from 'lucide-react';
import { AnnouncementItem } from '../../../types';
import { useApp } from '../../../context/AppContext';
import { apiFetch } from '../../../lib/apiConfig';

const READ_STORAGE_KEY = 'uqlearn_learner_read_announcements';
const DISMISSED_STORAGE_KEY = 'uqlearn_learner_dismissed_announcements';

export const LearnerNotificationsTab: React.FC = () => {
  const { enrolledCourses, courses, currentUser } = useApp();
  
  const [liveAnnouncements, setLiveAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'milestones' | string>('all');
  
  // Persistent read IDs & dismissed IDs stored in localStorage
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(READ_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(DISMISSED_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Fetch dynamic announcements from the backend API
  const fetchAnnouncements = async (showLoadingSpinner: boolean = true) => {
    if (showLoadingSpinner) setLoading(true);
    setIsRefreshing(true);

    try {
      const res = await apiFetch('instructor-messages.php', {}, 0);
      if (res && res.success && Array.isArray(res.announcements)) {
        // Filter out any mock/dummy IDs
        const realAnnouncements = res.announcements.filter((a: any) => 
          a && a.id && !a.id.startsWith('a-') && !a.id.startsWith('milestone-')
        );
        setLiveAnnouncements(realAnnouncements);
        try {
          localStorage.setItem('uqlearn_live_announcements_cache', JSON.stringify(realAnnouncements));
        } catch {}
      } else {
        // Fallback to cache if API returns empty
        const cached = localStorage.getItem('uqlearn_live_announcements_cache');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              const realOnly = parsed.filter((a: any) => 
                a && a.id && !a.id.startsWith('a-') && !a.id.startsWith('milestone-')
              );
              setLiveAnnouncements(realOnly);
            }
          } catch {}
        }
      }
    } catch (e) {
      console.warn('Failed loading dynamic learner announcements:', e);
      const cached = localStorage.getItem('uqlearn_live_announcements_cache');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            const realOnly = parsed.filter((a: any) => 
              a && a.id && !a.id.startsWith('a-') && !a.id.startsWith('milestone-')
            );
            setLiveAnnouncements(realOnly);
          }
        } catch {}
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // Filter out dismissed items and map unread state using persistent readIds
  const allNotifications: AnnouncementItem[] = useMemo(() => {
    // Only real announcements from database / API
    const nonDismissed = liveAnnouncements.filter(item => 
      item && item.id && !dismissedIds.includes(item.id) && !item.id.startsWith('a-') && !item.id.startsWith('milestone-')
    );

    return nonDismissed.map(item => ({
      ...item,
      unread: !readIds.includes(item.id)
    }));
  }, [liveAnnouncements, readIds, dismissedIds]);

  // Filter and search
  const filteredNotifications = useMemo(() => {
    return allNotifications.filter(item => {
      // Search matching
      const matchesSearch = 
        searchQuery.trim() === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.courseTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.instructorName.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Filter matching
      if (activeFilter === 'all') return true;
      if (activeFilter === 'unread') return item.unread;
      
      // Course specific filter
      return item.courseId === activeFilter;
    });
  }, [allNotifications, searchQuery, activeFilter]);

  // Mark all notifications as read
  const markAllAsRead = () => {
    const allIds = allNotifications.map(a => a.id);
    const updated = Array.from(new Set([...readIds, ...allIds]));
    setReadIds(updated);
    try {
      localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  // Mark individual item as read
  const markAsRead = (id: string) => {
    if (readIds.includes(id)) return;
    const updated = [...readIds, id];
    setReadIds(updated);
    try {
      localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  // Dismiss / delete announcement
  const dismissNotification = (id: string) => {
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    try {
      localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  const unreadCount = allNotifications.filter(a => a.unread).length;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-start sm:items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-200 dark:border-teal-800 shrink-0">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Instructor Announcements & Notifications
              </h2>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-teal-600 text-white text-[11px] font-black uppercase tracking-wider">
                  {unreadCount} New
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Stay updated with curriculum additions, live office hours, and personal learning milestones.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center space-x-2.5 self-stretch sm:self-auto justify-end">
          <button
            onClick={() => fetchAnnouncements(false)}
            disabled={isRefreshing}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all cursor-pointer disabled:opacity-50"
            title="Refresh announcements feed"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-teal-600' : ''}`} />
          </button>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2.5 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900 text-teal-700 dark:text-teal-300 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer border border-teal-200/80 dark:border-teal-800/80 shadow-xs"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Filter Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All Updates ({allNotifications.length})
          </button>

          <button
            onClick={() => setActiveFilter('unread')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
              activeFilter === 'unread'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeFilter === 'unread' ? 'bg-white text-teal-700' : 'bg-teal-600 text-white'
              }`}>
                {unreadCount}
              </span>
            )}
          </button>

          {/* Enrolled Courses Filter Pills */}
          {enrolledCourses && enrolledCourses.slice(0, 4).map(c => (
            <button
              key={c.id}
              onClick={() => setActiveFilter(c.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap truncate max-w-[180px] cursor-pointer ${
                activeFilter === c.id
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title={c.title}
            >
              {c.title}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search announcements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Notifications Stream */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-20 text-center space-y-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-bold">Loading live announcements & notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-4 shadow-xs">
            <div className="w-16 h-16 rounded-3xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto border border-teal-100 dark:border-teal-900/50">
              <Megaphone className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                {searchQuery ? 'No matching announcements found' : 'No announcements broadcasted yet'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {searchQuery 
                  ? `No announcements matched "${searchQuery}". Try a different keyword.`
                  : 'Your course instructors haven\'t broadcasted any announcements yet. Any curriculum updates, office hours, or course notifications will appear here.'}
              </p>
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          filteredNotifications.map((item) => {
            const enrolledCourse = enrolledCourses.find(c => c.id === item.courseId);

            return (
              <div
                key={item.id}
                onClick={() => markAsRead(item.id)}
                className={`p-6 rounded-3xl border transition-all space-y-3 relative group cursor-pointer ${
                  item.unread
                    ? 'bg-teal-50/40 dark:bg-teal-950/20 border-teal-200 dark:border-teal-900/60 shadow-xs ring-1 ring-teal-500/10'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Top Meta Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                      <Megaphone className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {item.instructorName}
                        </span>
                        {item.unread && (
                          <span className="px-2 py-0.5 rounded-full bg-teal-600 text-white text-[9px] font-black uppercase tracking-wider">
                            New
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold block mt-0.5">
                        {item.courseTitle}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 self-start sm:self-auto text-xs text-slate-400">
                    <span className="flex items-center space-x-1 text-[11px]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{item.date}</span>
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissNotification(item.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors cursor-pointer"
                      title="Dismiss announcement"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Announcement Headline & Content */}
                <div className="space-y-1.5">
                  <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                    {item.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal whitespace-pre-line">
                    {item.content}
                  </p>
                </div>

                {/* Footer Action Bar */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center space-x-2 text-[11px] text-teal-700 dark:text-teal-300 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />
                    <span>Official broadcast from course instructor & faculty</span>
                  </div>

                  {item.courseId && item.courseId !== 'general' && item.courseId !== 'all' && (
                    <div className="flex items-center space-x-2">
                      <Link
                        to={enrolledCourse ? `/learn/${item.courseId}` : `/courses/${item.courseId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900 text-teal-700 dark:text-teal-300 rounded-xl text-xs font-bold transition-all border border-teal-200/60 dark:border-teal-800/60 cursor-pointer"
                      >
                        <span>{enrolledCourse ? 'Go to Course' : 'View Course'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

