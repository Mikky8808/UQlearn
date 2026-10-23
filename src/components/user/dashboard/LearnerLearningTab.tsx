import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { 
  Play, 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  Flame, 
  Award, 
  Search, 
  ArrowRight, 
  Bookmark, 
  Calendar,
  Sliders,
  List,
  ShoppingBag,
  ClipboardCheck,
  Sparkles,
  Archive,
  Wrench,
  Pause,
  RotateCcw,
  Plus,
  Minus,
  CheckCircle,
  X,
  HelpCircle,
  BadgeCheck,
  FileText,
  FolderDown,
  MessageSquare,
  MoreVertical,
  Star,
  Pencil,
  Trash2,
  Share2,
  Edit,
  RefreshCw
} from 'lucide-react';
import { Course, CourseSubscription } from '../../../types';
import { useApp } from '../../../context/AppContext';
import { subscriptionService } from '../../../services/subscription-service';
import { apiFetch, API_BASE_URL, API_ENDPOINTS, getStudyPlanApi, saveStudyPlanApi, sendStudyReminderEmailApi, getRemindersApi, saveReminderApi } from '../../../lib/apiConfig';
import { SponsoredLabel } from '../../common/SponsoredLabel';
import { DataNotFound } from '../../common/DataNotFound';
import { LearnerLearningGridSkeleton } from '../../common/CourseCardSkeleton';
import { insertEvent } from '../../../lib/calendarService';

interface LearnerLearningTabProps {
  enrolledCourses: Course[];
  allCourses: Course[];
}

export const LearnerLearningTab: React.FC<LearnerLearningTabProps> = ({ enrolledCourses, allCourses }) => {
  const navigate = useNavigate();
  const { currentUser, isLoadingCourses, isLoadingEnrolled } = useApp();
  const isLoading = isLoadingCourses || isLoadingEnrolled;
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Custom submenu: My Lists, Purchased, Assessments, New, Archived, Learning tools
  const subParam = searchParams.get('sub');
  const validSubmenus = ['my-lists', 'purchased', 'assessments', 'new', 'archived', 'learning-tools'];
  const [learningSubmenu, setLearningSubmenu] = useState<'my-lists' | 'purchased' | 'assessments' | 'new' | 'archived' | 'learning-tools'>(
    subParam && validSubmenus.includes(subParam) ? (subParam as any) : 'my-lists'
  );
  
  const [myListsFilter, setMyListsFilter] = useState<'all' | 'favorites' | 'in-progress' | 'completed'>('all');
  const [archivedCourseIds, setArchivedCourseIds] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [studentSubs, setStudentSubs] = useState<CourseSubscription[]>([]);

  // List Name & UI States matching uploaded image
  const [listName, setListName] = useState<string>('camtasia');
  const [isEditingListName, setIsEditingListName] = useState(false);
  const [listNameInput, setListNameInput] = useState('camtasia');
  const [openMenuCourseId, setOpenMenuCourseId] = useState<string | null>(null);
  
  // Rating Modal States
  const [ratingModalCourse, setRatingModalCourse] = useState<Course | null>(null);
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  const [userReviews, setUserReviews] = useState<Record<string, string>>({});
  const [ratingHover, setRatingHover] = useState<number>(0);
  const [reviewText, setReviewText] = useState('');
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  // Study Planner & Habit Builder States
  const [weeklyTarget, setWeeklyTarget] = useState('7 Hours of Video Lectures');
  const [dailyHabit, setDailyHabit] = useState('30 Minutes Daily Micro-learning');
  const [reminders, setReminders] = useState<string[]>([]);
  const [dynamicReminders, setDynamicReminders] = useState<Array<{ title: string, day: string, time: string }>>([]);

  useEffect(() => {
    const loadDynamicReminders = async () => {
      try {
        const data = await getRemindersApi();
        if (data && data.success && Array.isArray(data.reminders)) {
          setDynamicReminders(data.reminders);
        }
      } catch (e) {
        console.error('Failed to load reminders:', e);
      }
    };
    loadDynamicReminders();
  }, []);
  const [emailNotifications, setEmailNotifications] = useState(true);

  // Quiz & Assessment States
  const [activeQuizCourse, setActiveQuizCourse] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [quizFinished, setQuizFinished] = useState<boolean>(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showPlannerModal, setShowPlannerModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showAddReminderModal, setShowAddReminderModal] = useState(false);
  const [showPaymentStatusModal, setShowPaymentStatusModal] = useState<{show: boolean, success: boolean, message: string, courseId?: string} >({show: false, success: false, message: ''});
  const [step, setStep] = useState(1);
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderContent, setNewReminderContent] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('');
  const [reminderFreq, setReminderFreq] = useState('Weekly');
  const [newReminderDay, setNewReminderDay] = useState('Monday');
  const [newReminderDateTime, setNewReminderDateTime] = useState('');
  const [remindersInput, setRemindersInput] = useState('');
  const [isSavingPlanner, setIsSavingPlanner] = useState(false);
  const [plannerMsg, setPlannerMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const loadStudyPlan = async () => {
      try {
        const learnerId = currentUser?.id || 'current_learner';
        const res = await apiFetch(`${API_ENDPOINTS.STUDY_PLAN}?userId=${encodeURIComponent(learnerId)}`);
        if (res && res.success && res.data) {
          if (res.data.weeklyTarget) setWeeklyTarget(res.data.weeklyTarget);
          if (res.data.dailyHabit) setDailyHabit(res.data.dailyHabit);
          if (Array.isArray(res.data.reminders) && res.data.reminders.length > 0) {
            setReminders(res.data.reminders);
            setRemindersInput(res.data.reminders.join(', '));
          }
          if (res.data.emailNotifications !== undefined) {
            setEmailNotifications(res.data.emailNotifications);
          }
        }
      } catch (e) {
        console.warn('Could not load study plan from DB:', e);
      }
    };
    loadStudyPlan();
  }, [currentUser?.id]);

  // Helper to open rating modal with existing submitted comment
  const handleOpenRatingModal = (course: Course) => {
    setRatingModalCourse(course);
    setReviewText(userReviews[course.id] || '');
    setIsEditingReview(false);
  };

  // Load saved ratings & comments from localStorage and MySQL Database on mount/refresh
  useEffect(() => {
    // 1. Load from localStorage for instant render
    try {
      const storedRatings: Record<string, number> = {};
      const storedReviews: Record<string, string> = {};
      enrolledCourses.forEach(c => {
        const r = localStorage.getItem(`uqlearn_course_rating_${c.id}`);
        const f = localStorage.getItem(`uqlearn_course_review_${c.id}`);
        if (r) storedRatings[c.id] = parseInt(r, 10);
        if (f) storedReviews[c.id] = f;
      });
      if (Object.keys(storedRatings).length > 0) {
        setUserRatings(prev => ({ ...prev, ...storedRatings }));
      }
      if (Object.keys(storedReviews).length > 0) {
        setUserReviews(prev => ({ ...prev, ...storedReviews }));
      }
    } catch {}

    // 2. Fetch fresh ratings & reviews from MySQL DB via API
    const fetchUserRatingsFromDb = async () => {
      try {
        const studentId = currentUser?.id || 'current-user';
        const res = await apiFetch(`${API_BASE_URL}/course-ratings.php?student_id=${encodeURIComponent(studentId)}`, {}, 0);
        if (res && res.success && Array.isArray(res.data)) {
          const dbRatings: Record<string, number> = {};
          const dbReviews: Record<string, string> = {};
          res.data.forEach((item: any) => {
            if (item.course_id) {
              const rVal = Number(item.rating);
              if (!isNaN(rVal) && rVal > 0) dbRatings[item.course_id] = rVal;
              if (item.feedback) dbReviews[item.course_id] = item.feedback;
              localStorage.setItem(`uqlearn_course_rating_${item.course_id}`, String(rVal));
              if (item.feedback) {
                localStorage.setItem(`uqlearn_course_review_${item.course_id}`, item.feedback);
              }
            }
          });
          setUserRatings(prev => ({ ...prev, ...dbRatings }));
          setUserReviews(prev => ({ ...prev, ...dbReviews }));
        }
      } catch (e) {
        console.warn('Could not fetch user ratings from DB:', e);
      }
    };

    fetchUserRatingsFromDb();
  }, [enrolledCourses, currentUser]);

  const handleSubmitRating = async () => {
    if (!ratingModalCourse) return;
    const ratingValue = userRatings[ratingModalCourse.id] || 5;
    setIsSubmittingRating(true);

    try {
      // 1. Save locally for instant reactivity
      localStorage.setItem(`uqlearn_course_rating_${ratingModalCourse.id}`, String(ratingValue));
      if (reviewText) {
        localStorage.setItem(`uqlearn_course_review_${ratingModalCourse.id}`, reviewText);
      }
      setUserRatings(prev => ({ ...prev, [ratingModalCourse.id]: ratingValue }));
      setUserReviews(prev => ({ ...prev, [ratingModalCourse.id]: reviewText }));

      // 2. Submit to the database via centralized API
      await apiFetch(`${API_BASE_URL}/course-ratings.php`, {
        method: 'POST',
        body: JSON.stringify({
          studentId: currentUser?.id || 'current-user',
          studentName: currentUser?.name || 'Learner',
          courseId: ratingModalCourse.id,
          rating: ratingValue,
          feedback: reviewText
        }),
        silent: true
      }, 0);
    } catch (err) {
      console.warn('Could not submit rating via API:', err);
    } finally {
      setIsSubmittingRating(false);
      setRatingModalCourse(null);
    }
  };

  useEffect(() => {
    async function loadSubs() {
      if (currentUser?.id) {
        const subs = await subscriptionService.getStudentSubscriptions(currentUser.id, currentUser.email);
        setStudentSubs(subs);
      }
    }
    loadSubs();
  }, [currentUser]);

  // Sync state if search parameter updates
  useEffect(() => {
    const s = searchParams.get('sub');
    if (s && validSubmenus.includes(s) && s !== learningSubmenu) {
      setLearningSubmenu(s as any);
    }
  }, [searchParams, learningSubmenu]);

  // Pomodoro Study Timer state with persistent localStorage sync
  const [pomodoroMode, setPomodoroMode] = useState<'work' | 'break'>(() => {
    try {
      const saved = localStorage.getItem('uq_pomodoro_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.mode) return parsed.mode;
      }
    } catch {}
    return 'work';
  });

  const [pomodoroTargetEnd, setPomodoroTargetEnd] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('uq_pomodoro_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.targetEndTime) return parsed.targetEndTime;
      }
    } catch {}
    return Date.now() + 25 * 60 * 1000;
  });

  const [pomodoroActive, setPomodoroActive] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('uq_pomodoro_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.active) {
          const rem = Math.floor(((parsed.targetEndTime || Date.now()) - Date.now()) / 1000);
          return rem > 0;
        }
      }
    } catch {}
    return false;
  });

  const initialRemaining = (() => {
    try {
      const saved = localStorage.getItem('uq_pomodoro_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.active && parsed.targetEndTime) {
          const rem = Math.max(0, Math.floor((parsed.targetEndTime - Date.now()) / 1000));
          return { mins: Math.floor(rem / 60), secs: rem % 60 };
        }
        if (parsed && typeof parsed.remainingSec === 'number') {
          return { mins: Math.floor(parsed.remainingSec / 60), secs: parsed.remainingSec % 60 };
        }
      }
    } catch {}
    return { mins: 25, secs: 0 };
  })();

  const [pomodoroMinutes, setPomodoroMinutes] = useState(initialRemaining.mins);
  const [pomodoroSeconds, setPomodoroSeconds] = useState(initialRemaining.secs);

  // Focus Timer countdown effect with background persistence across quits/reloads
  useEffect(() => {
    let interval: any = null;
    if (pomodoroActive) {
      interval = setInterval(() => {
        const now = Date.now();
        const remainingSec = Math.max(0, Math.floor((pomodoroTargetEnd - now) / 1000));

        if (remainingSec > 0) {
          setPomodoroMinutes(Math.floor(remainingSec / 60));
          setPomodoroSeconds(remainingSec % 60);
          try {
            localStorage.setItem('uq_pomodoro_state', JSON.stringify({
              active: true,
              mode: pomodoroMode,
              targetEndTime: pomodoroTargetEnd,
              remainingSec
            }));
          } catch {}
        } else {
          // Timer finished
          if (pomodoroMode === 'work') {
            const nextTarget = Date.now() + 5 * 60 * 1000;
            setPomodoroMode('break');
            setPomodoroMinutes(5);
            setPomodoroSeconds(0);
            setPomodoroTargetEnd(nextTarget);
            try {
              localStorage.setItem('uq_pomodoro_state', JSON.stringify({
                active: true,
                mode: 'break',
                targetEndTime: nextTarget,
                remainingSec: 300
              }));
            } catch {}
            alert('Great work! Time for a 5-minute break.');
          } else {
            const nextTarget = Date.now() + 25 * 60 * 1000;
            setPomodoroMode('work');
            setPomodoroMinutes(25);
            setPomodoroSeconds(0);
            setPomodoroTargetEnd(nextTarget);
            try {
              localStorage.setItem('uq_pomodoro_state', JSON.stringify({
                active: true,
                mode: 'work',
                targetEndTime: nextTarget,
                remainingSec: 1500
              }));
            } catch {}
            alert('Break is over! Time to focus on your studies.');
          }
        }
      }, 500);
    } else {
      clearInterval(interval);
      try {
        localStorage.setItem('uq_pomodoro_state', JSON.stringify({
          active: false,
          mode: pomodoroMode,
          targetEndTime: pomodoroTargetEnd,
          remainingSec: pomodoroMinutes * 60 + pomodoroSeconds
        }));
      } catch {}
    }
    return () => clearInterval(interval);
  }, [pomodoroActive, pomodoroTargetEnd, pomodoroMode, pomodoroMinutes, pomodoroSeconds]);

  const toggleFavorite = (courseId: string) => {
    setFavorites(prev => 
      prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
    );
  };

  const getCourseProgress = (courseId: string, idx: number) => {
    let progress = 0;
    try {
      const uid = currentUser?.id || 'current-user';
      const saved = localStorage.getItem(`uqlearn_prog_${uid}_${courseId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.progressPercent === 'number') {
          progress = parsed.progressPercent;
        }
      }
    } catch {}

    if (progress === 0 && idx === 0) progress = 45;
    else if (progress === 0 && idx === 1) progress = 80;
    else if (progress === 0 && idx >= 2) progress = idx === 2 ? 100 : 25;

    const totalLectures = 32;
    const completedLectures = Math.round((progress / 100) * totalLectures);
    const lastLectureTitle = `Lecture ${completedLectures + 1}: Core Architecture & Implementation`;
    const hoursSpent = ((progress / 100) * 14.5).toFixed(1);
    const hoursLeft = (14.5 - parseFloat(hoursSpent)).toFixed(1);

    return {
      progress,
      totalLectures,
      completedLectures,
      lastLectureTitle,
      hoursSpent,
      hoursLeft,
      isCompleted: progress === 100
    };
  };

  const filteredCourses = enrolledCourses.filter((course, idx) => {
    const stats = getCourseProgress(course.id, idx);
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (course.instructor && course.instructor.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (course.category && course.category.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;

    if (learningSubmenu === 'my-lists') {
      const isArchived = archivedCourseIds.includes(course.id);
      if (isArchived) return false;
      
      if (myListsFilter === 'favorites') {
        return favorites.includes(course.id);
      }
      if (myListsFilter === 'in-progress') {
        return !stats.isCompleted;
      }
      if (myListsFilter === 'completed') {
        return stats.isCompleted;
      }
      return true;
    }
    if (learningSubmenu === 'purchased') {
      return !archivedCourseIds.includes(course.id);
    }

    if (learningSubmenu === 'new') {
      return idx < 2 && !archivedCourseIds.includes(course.id);
    }
    if (learningSubmenu === 'archived') {
      return archivedCourseIds.includes(course.id);
    }
    return !archivedCourseIds.includes(course.id);
  });

  return (
    <div className="space-y-8">
      {isLoading ? (
        /* Loading Skeleton State */
        <div className="space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-px mb-6 overflow-x-auto flex items-center space-x-6 sm:space-x-8 scrollbar-none">
            {['My Lists', 'Purchased', 'Assessments', 'New', 'Archived', 'Learning tools'].map((label, idx) => (
              <div key={idx} className="pb-3 border-b-2 border-transparent">
                <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
          <LearnerLearningGridSkeleton count={6} />
        </div>
      ) : (enrolledCourses.length === 0 && learningSubmenu !== 'learning-tools') ? (
        /* Empty State */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-sm animate-fadeIn">
          <DataNotFound
            title="No Enrolled Courses Found"
            message="You have not enrolled in or purchased any courses yet. Explore our catalog to start learning today!"
            icon={BookOpen}
            action={{
              label: "Browse Course Catalog",
              onClick: () => navigate('/courses'),
              icon: Search
            }}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Submenu selector: My Lists, Purchased, Assessments, New, Archived, Learning tools */}
          <div className="border-b border-slate-200 dark:border-slate-800 pb-px mb-6 overflow-x-auto flex items-center space-x-6 sm:space-x-8 scrollbar-none">
            {[
              { id: 'my-lists', label: 'My Lists', icon: List },
              { id: 'purchased', label: 'Purchased', icon: ShoppingBag },
              { id: 'assessments', label: 'Assessments', icon: ClipboardCheck },
              { id: 'new', label: 'New', icon: Sparkles },
              { id: 'archived', label: 'Archived', icon: Archive },
              { id: 'learning-tools', label: 'Learning tools', icon: Wrench },
            ].map((sub) => {
              const Icon = sub.icon;
              const isActive = learningSubmenu === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => {
                    setSearchParams({ tab: 'learning', sub: sub.id });
                    setLearningSubmenu(sub.id as any);
                    setActiveQuizCourse(null);
                    setQuizScore(null);
                    setQuizFinished(false);
                    setSelectedAnswers({});
                  }}
                  className={`flex items-center space-x-2 py-3 border-b-2 text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'border-teal-600 text-teal-700 dark:text-teal-400'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`} />
                  <span>{sub.label}</span>
                </button>
              );
            })}
          </div>

          {/* Render Course Lists search/filter ONLY for list submenus */}
          {['my-lists', 'purchased', 'new', 'archived'].includes(learningSubmenu) && (
            <div className="space-y-6">
              
              {/* My lists Title */}
              {learningSubmenu === 'my-lists' && (
                <div className="space-y-1 mb-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">My lists</h2>
                </div>
              )}

              {/* Courses Grid */}

              {filteredCourses.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-4">
                  <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    No courses match your filter
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Try adjusting your search keywords or explore active study programs in the catalog.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCourses.map((course, idx) => {
                    const stats = getCourseProgress(course.id, idx);
                    const isFav = favorites.includes(course.id);
                    const currentRating = userRatings[course.id] || 0;

                    return (
                      <div
                        key={course.id}
                        className="bg-white dark:bg-slate-900 rounded-none overflow-hidden shadow-xs hover:shadow-md transition-all border border-slate-200 dark:border-slate-800 flex flex-col justify-between group relative"
                      >
                        <div>
                          {/* Course Thumbnail Image Box */}
                          <div 
                            onClick={() => navigate(`/learn/${course.id}`)}
                            className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-pointer"
                          >
                            <img 
                              src={course.image || course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80'} 
                              alt={course.title} 
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80';
                              }}
                              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300" 
                            />

                            {/* Floating Top-Right 3-Dots Button */}
                            <div className="absolute top-2.5 right-2.5 z-20">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuCourseId(openMenuCourseId === course.id ? null : course.id);
                                }}
                                className="w-8 h-8 rounded-none bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-200 shadow-md flex items-center justify-center hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer"
                                title="More options"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {/* Context Dropdown Menu */}
                              {openMenuCourseId === course.id && (
                                <div 
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-none shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-30 animate-fadeIn"
                                >
                                  <button
                                    onClick={() => {
                                      setOpenMenuCourseId(null);
                                      navigate(`/learn/${course.id}`);
                                    }}
                                    className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center space-x-2 cursor-pointer"
                                  >
                                    <Play className="w-3.5 h-3.5 text-teal-600" />
                                    <span>Resume Course</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setOpenMenuCourseId(null);
                                      toggleFavorite(course.id);
                                    }}
                                    className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center space-x-2 cursor-pointer"
                                  >
                                    <Bookmark className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
                                    <span>{isFav ? 'Remove Favorite' : 'Add to Favorites'}</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setOpenMenuCourseId(null);
                                      setArchivedCourseIds(prev => 
                                        prev.includes(course.id) ? prev.filter(i => i !== course.id) : [...prev, course.id]
                                      );
                                    }}
                                    className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center space-x-2 cursor-pointer"
                                  >
                                    <Archive className="w-3.5 h-3.5 text-indigo-500" />
                                    <span>{archivedCourseIds.includes(course.id) ? 'Restore Course' : 'Archive Course'}</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setOpenMenuCourseId(null);
                                      handleOpenRatingModal(course);
                                    }}
                                    className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center space-x-2 cursor-pointer"
                                  >
                                    <Star className="w-3.5 h-3.5 text-amber-400" />
                                    <span>{currentRating > 0 ? 'Your rating' : 'Leave a rating'}</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Card Content directly matching uploaded UI */}
                          <div className="p-4 space-y-2">
                            <h3 
                              onClick={() => navigate(`/learn/${course.id}`)}
                              className="font-bold text-slate-900 dark:text-white text-base leading-snug line-clamp-2 hover:text-teal-600 dark:hover:text-teal-400 cursor-pointer transition-colors"
                            >
                              {course.title}
                            </h3>

                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                              {course.instructor || 'Jewel & Auret'}
                            </p>

                            {/* Solid Purple Progress Bar & Rating Footer */}
                            <div className="pt-3 space-y-2">
                              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-none overflow-hidden">
                                <div 
                                  className="bg-purple-600 dark:bg-purple-500 h-full rounded-none transition-all duration-500"
                                  style={{ width: `${stats.progress}%` }}
                                />
                              </div>

                              <div className="flex items-center justify-between text-xs pt-0.5">
                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                  {stats.progress}% complete
                                </span>

                                <div className="flex flex-col items-end">
                                  <div className="flex items-center space-x-0.5">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        className={`w-3.5 h-3.5 ${
                                          star <= (currentRating || 0)
                                            ? 'fill-amber-400 text-amber-400'
                                            : 'text-amber-400'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <button
                                    onClick={() => handleOpenRatingModal(course)}
                                    className="text-[11px] text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer mt-0.5"
                                  >
                                    {currentRating > 0 ? `Your rating (${currentRating}★)` : 'Leave a rating'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Assessments Tab view */}
          {learningSubmenu === 'assessments' && (
            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center space-x-3 text-teal-600 dark:text-teal-400">
                  <ClipboardCheck className="w-6 h-6" />
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Milestone Assessments & Quizzes</h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                  Test your understanding and challenge yourself with interactive assessment modules associated with your active learning courses.
                </p>
              </div>

              {activeQuizCourse ? (
                <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <span className="text-[10px] font-black uppercase text-teal-600 tracking-wider">Assessment Challenge</span>
                      <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                        {enrolledCourses.find(c => c.id === activeQuizCourse)?.title || 'Course Quiz'}
                      </h4>
                    </div>
                    <button
                      onClick={() => {
                        setActiveQuizCourse(null);
                        setQuizFinished(false);
                        setQuizScore(null);
                        setSelectedAnswers({});
                      }}
                      className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 rounded-full transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {!quizFinished ? (
                    <div className="space-y-6">
                      {[
                        {
                          id: 1,
                          question: "What is the primary benefit of using modular system architecture over monolithic design?",
                          options: [
                            "Increased compilation speed only",
                            "Improved isolation, strict boundaries, easier refactoring, and parallel developer workflows",
                            "Reduced styling footprint in the client bundles",
                            "Eliminating the need for database state storage"
                          ],
                          correct: 1
                        },
                        {
                          id: 2,
                          question: "Why should deep nested components be avoided in modern clean React setups?",
                          options: [
                            "It triggers compile-time layout crashes",
                            "It creates complex prop drilling patterns and unnecessary dependency recalculations",
                            "It forces light schemes instead of premium dark modes",
                            "React strictly prevents nesting components"
                          ],
                          correct: 1
                        }
                      ].map((q, qIdx) => (
                        <div key={q.id} className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                          <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-start space-x-2">
                            <span className="px-2 py-0.5 bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-400 text-[10px] font-black rounded-md">Q{qIdx+1}</span>
                            <span>{q.question}</span>
                          </p>
                          <div className="grid grid-cols-1 gap-2.5 pt-1">
                            {q.options.map((opt, oIdx) => {
                              const isSelected = selectedAnswers[q.id] === oIdx;
                              return (
                                <button
                                  key={oIdx}
                                  type="button"
                                  onClick={() => setSelectedAnswers(prev => ({ ...prev, [q.id]: oIdx }))}
                                  className={`w-full text-left p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                                    isSelected
                                      ? 'border-teal-500 bg-teal-50/60 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 font-bold'
                                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                                  }`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      <div className="flex justify-end pt-2">
                        <button
                          onClick={() => {
                            const correctCount = [
                              selectedAnswers[1] === 1,
                              selectedAnswers[2] === 1
                            ].filter(Boolean).length;
                            setQuizScore(Math.round((correctCount / 2) * 100));
                            setQuizFinished(true);
                          }}
                          className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                        >
                          Submit Assessment
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 space-y-5 animate-fadeIn">
                      <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                        <CheckCircle className="w-8 h-8" />
                      </div>
                      <div className="space-y-1.5">
                        <h5 className="text-base font-black text-slate-900 dark:text-white">Assessment Submitted Successfully!</h5>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Your score for this module is:</p>
                        <p className="text-3xl font-black text-teal-600 dark:text-teal-400 mt-1">{quizScore}%</p>
                      </div>
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 max-w-xs mx-auto">
                        {quizScore && quizScore >= 100 ? '⭐ Perfect score! You have completely mastered this course milestone.' : 'Good attempt! Review your notes and try again to improve.'}
                      </p>
                      <div className="flex items-center justify-center space-x-3 pt-2">
                        <button
                          onClick={() => {
                            setQuizFinished(false);
                            setSelectedAnswers({});
                            setQuizScore(null);
                          }}
                          className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                        >
                          Try Again
                        </button>
                        <button
                          onClick={() => {
                            setActiveQuizCourse(null);
                            setQuizFinished(false);
                            setQuizScore(null);
                            setSelectedAnswers({});
                          }}
                          className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                        >
                          Back to Assessments
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {enrolledCourses.map((course, idx) => (
                    <div key={course.id} className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-400 text-[9px] font-black uppercase tracking-wider">Module Quiz</span>
                          <span className="text-[10px] font-bold text-slate-400">2 Questions</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{course.title}</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Evaluate key learnings and achieve certification milestones.</p>
                      </div>
                      <button
                        onClick={() => {
                          setActiveQuizCourse(course.id);
                          setQuizFinished(false);
                          setQuizScore(null);
                          setSelectedAnswers({});
                        }}
                        className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                      >
                        Start Assessment
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Learning Tools view */}
          {learningSubmenu === 'learning-tools' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-6 sm:p-8 shadow-xs space-y-6 animate-fadeIn">
              <div>
                <div className="flex items-center space-x-1.5 text-teal-600 dark:text-teal-400 mb-1">
                  <Wrench className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Study Planner & Reminders</span>
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Learning reminders</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Learning a little each day adds up. Research shows that students who make learning a habit are more likely to reach their goals. Set time aside to learn and get reminders using your learning scheduler.</p>
              </div>

              <div className="space-y-4">
                {dynamicReminders.map((reminder, idx) => (
                  <div key={idx} className="p-4 border border-slate-200 dark:border-slate-800 rounded-sm flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Clock className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{reminder.title}</p>
                        <div className="flex items-center space-x-3 text-xs text-slate-500">
                          <span className="font-semibold">{reminder.day} {reminder.time}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-teal-600 dark:text-teal-400 mt-1">
                          <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" alt="Google Calendar" className="w-4 h-4" />
                          <span>Added to Google Calendar</span>
                        </div>
                      </div>
                    </div>
                    <div className="relative group">
                      <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                      <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg rounded-md hidden group-hover:block z-10">
                        <button className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                          <Edit className="w-4 h-4" /> Edit
                        </button>
                        <button className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-red-600">
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                        <button className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                          <RefreshCw className="w-4 h-4" /> Sync again
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setShowAddReminderModal(true)}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-sm flex items-center space-x-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add another</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Interactive Rating Modal matching "Leave a rating" UI */}
      {ratingModalCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400">Course Rating & Feedback</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1">{ratingModalCourse.title}</h3>
              </div>
              <button
                onClick={() => setRatingModalCourse(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center space-y-3 py-2">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">How would you rate your experience with this course?</p>
              <div className="flex items-center justify-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onMouseEnter={() => setRatingHover(star)}
                    onMouseLeave={() => setRatingHover(0)}
                    onClick={() => {
                      setUserRatings(prev => ({ ...prev, [ratingModalCourse.id]: star }));
                    }}
                    className="p-1 transition-transform hover:scale-125 cursor-pointer"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= (ratingHover || userRatings[ratingModalCourse.id] || 0)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300 dark:text-slate-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400 font-bold min-h-[1.25rem]">
                {(ratingHover || userRatings[ratingModalCourse.id]) ? [
                  '1 Star - Poor', '2 Stars - Fair', '3 Stars - Good', '4 Stars - Very Good', '5 Stars - Outstanding & Masterclass!'
                ][(ratingHover || userRatings[ratingModalCourse.id]) - 1] : 'Click stars to select rating'}
              </p>

              {/* Review Text Feedback Input */}
              <div className="pt-2 text-left space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    {((userRatings[ratingModalCourse.id] || 0) > 0 || Boolean(userReviews[ratingModalCourse.id])) && !isEditingReview
                      ? 'Your Submitted Review (Read-only):'
                      : 'Write your review comment (Optional):'}
                  </label>
                  {((userRatings[ratingModalCourse.id] || 0) > 0 || Boolean(userReviews[ratingModalCourse.id])) && !isEditingReview && (
                    <button
                      type="button"
                      onClick={() => setIsEditingReview(true)}
                      className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                    >
                      Edit Review
                    </button>
                  )}
                </div>
                <textarea
                  value={reviewText}
                  readOnly={((userRatings[ratingModalCourse.id] || 0) > 0 || Boolean(userReviews[ratingModalCourse.id])) && !isEditingReview}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder={
                    ((userRatings[ratingModalCourse.id] || 0) > 0 || Boolean(userReviews[ratingModalCourse.id])) && !isEditingReview
                      ? 'No written comment was provided.'
                      : 'Share details of your experience with this course...'
                  }
                  rows={3}
                  className={`w-full p-2.5 text-xs rounded-xl border transition-colors ${
                    ((userRatings[ratingModalCourse.id] || 0) > 0 || Boolean(userReviews[ratingModalCourse.id])) && !isEditingReview
                      ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-250 dark:border-slate-700 font-medium cursor-not-allowed select-none'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder-slate-400'
                  }`}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                disabled={isSubmittingRating}
                onClick={() => setRatingModalCourse(null)}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingRating}
                onClick={handleSubmitRating}
                className="px-6 py-2.5 bg-[#8a2be2] hover:bg-purple-600 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md cursor-pointer transition-all disabled:opacity-50 flex items-center space-x-2"
              >
                {isSubmittingRating ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit Rating</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Learning Reminders Section (for list views) */}
      {learningSubmenu !== 'learning-tools' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">Learning reminders</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Learning a little each day adds up. Research shows that students who make learning a habit are more likely to reach their goals. Set time aside to learn and get reminders using your learning scheduler.</p>
        </div>

        <div className="space-y-4">
          {dynamicReminders.map((reminder, idx) => (
            <div key={idx} className="p-4 border border-slate-200 dark:border-slate-800 rounded-sm flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{reminder.title}</p>
                  <div className="flex items-center space-x-3 text-xs text-slate-500">
                    <span className="font-semibold">{reminder.day} {reminder.time}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-teal-600 dark:text-teal-400 mt-1">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" alt="Google Calendar" className="w-4 h-4" />
                    <span>Added to Google Calendar</span>
                  </div>
                </div>
              </div>
              <div className="relative group">
                <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <MoreVertical className="w-5 h-5" />
                </button>
                <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg rounded-md hidden group-hover:block z-10">
                  <button className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                    <Edit className="w-4 h-4" /> Edit
                  </button>
                  <button className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-red-600">
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                  <button className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" /> Sync again
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={() => setShowAddReminderModal(true)}
          className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-sm flex items-center space-x-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add another</span>
        </button>
      </div>
      )}

      {/* Payment Status Modal */}
      {showPaymentStatusModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-sm p-6 w-full max-w-sm space-y-4 text-center">
            <h3 className={`font-bold text-lg ${showPaymentStatusModal.success ? 'text-green-600' : 'text-red-600'}`}>
              {showPaymentStatusModal.success ? 'Payment Successful' : 'Payment Failed'}
            </h3>
            <p className="text-sm text-slate-600">{showPaymentStatusModal.message}</p>
            <div className="pt-4 flex flex-col space-y-2">
              {showPaymentStatusModal.success ? (
                <button 
                  onClick={() => {
                    setShowPaymentStatusModal({show: false, success: false, message: ''});
                    navigate(`/course/${showPaymentStatusModal.courseId}`);
                  }}
                  className="w-full py-2 bg-purple-600 text-white font-bold rounded-sm"
                >
                  Go to Course
                </button>
              ) : (
                <button 
                  onClick={() => setShowPaymentStatusModal({show: false, success: false, message: ''})}
                  className="w-full py-2 bg-rose-600 text-white font-bold rounded-sm"
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Reminder Wizard Modal */}
      {showAddReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-sm p-6 w-full max-w-lg space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg">Update your event</h3>
              <button onClick={() => setShowAddReminderModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-slate-500">Step {step} of 3</p>

            {step === 1 && (
              <div className="space-y-4">
                <label className="block text-sm font-bold">Name <span className="text-slate-400 font-normal">optional</span></label>
                <input type="text" value={newReminderTitle} placeholder="Learning reminder" className="w-full p-2 border" onChange={e => setNewReminderTitle(e.target.value)} />
                <label className="block text-sm font-bold">Attach content (optional)</label>
                <div className="space-y-2">
                  {enrolledCourses.map(c => (
                    <label key={c.id} className="flex items-center space-x-2 cursor-pointer">
                      <input type="radio" name="course" value={c.id} onChange={e => setNewReminderContent(e.target.value)} />
                      <span>{c.title}</span>
                    </label>
                  ))}
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="course" value="none" defaultChecked />
                    <span>None</span>
                  </label>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <label className="block text-sm font-bold">Frequency</label>
                <select className="w-full p-2 border" value={reminderFreq} onChange={e => setReminderFreq(e.target.value)}>
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Once">Once</option>
                </select>
                
                {reminderFreq !== 'Daily' && (
                  <>
                    <label className="block text-sm font-bold">Day</label>
                    <select className="w-full p-2 border" value={newReminderDay} onChange={e => setNewReminderDay(e.target.value)}>
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </>
                )}
                
                <label className="block text-sm font-bold">Time</label>
                <input type="time" className="w-full p-2 border" value={newReminderTime} onChange={e => setNewReminderTime(e.target.value)} />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <p>To update your event, sign in with Google</p>
                <button 
                  onClick={async () => {
                    try {
                      const dayMap: any = { 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 0 };
                      const now = new Date();
                      const targetDay = dayMap[newReminderDay];
                      const daysUntil = (targetDay + 7 - now.getDay()) % 7;
                      const startTime = new Date(now.getTime() + daysUntil * 24 * 60 * 60 * 1000);
                      const [hours, minutes] = newReminderTime.split(':');
                      startTime.setHours(parseInt(hours), parseInt(minutes));
                      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
                      
                      const event = {
                        summary: newReminderTitle || 'Learning Session',
                        description: `Reminder for: ${newReminderContent}`,
                        start: { dateTime: startTime.toISOString() },
                        end: { dateTime: endTime.toISOString() },
                      };
                      
                      const result = await insertEvent(event);
                      
                      // Save to backend using centralized API_BASE_URL (https://uqlearn.org/api/v1/)
                      const response = await saveReminderApi({ 
                        title: newReminderTitle || 'Learning Session', 
                        day: reminderFreq === 'Daily' ? 'Daily' : newReminderDay, 
                        time: newReminderTime,
                        frequency: reminderFreq 
                      });
                      
                      if (response && (response.success || response.ok || !response.error)) {
                        setDynamicReminders([...dynamicReminders, { 
                          title: newReminderTitle || 'Learning Session', 
                          day: reminderFreq === 'Daily' ? 'Daily' : newReminderDay, 
                          time: newReminderTime 
                        }]);
                        alert('Reminder added to Google Calendar!');
                        setShowAddReminderModal(false);
                      }
                    } catch (e: any) {
                      console.error(e);
                      alert('Failed to add reminder: ' + e.message);
                    }
                  }}
                  className="w-full py-3 bg-purple-600 text-white font-bold"
                >
                  Update
                </button>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <button disabled={step === 1} onClick={() => setStep(step - 1)} className="px-4 py-2">Previous</button>
              {step < 3 ? (
                <button onClick={() => setStep(step + 1)} className="px-6 py-2 bg-purple-600 text-white font-bold">Next</button>
              ) : null}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
