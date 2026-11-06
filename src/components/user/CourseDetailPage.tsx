import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { 
  Star, 
  CheckCircle2, 
  Clock, 
  Users, 
  Play, 
  Award, 
  ShoppingCart, 
  Share2,
  Heart,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Globe,
  Check,
  Twitter,
  Facebook,
  Linkedin,
  Mail,
  Copy,
  Sparkles,
  BadgeCheck,
  FileText,
  HelpCircle,
  Volume2,
  FolderDown,
  Smartphone,
  Infinity,
  Folder,
  Gift
} from 'lucide-react';
import { fetchCourseModulesApi, normalizeCourse, getIntendedLearnersApi, recordRecentlyViewedApi, getCourseLearnersApi, getCourseRatingsApi, fetchCoursesApi, ROOT_URL } from '../../lib/apiConfig';
import { resolveImageUrl } from '../../lib/branding';
import { subscriptionService } from '../../services/subscription-service';
import { Course, CourseSubscription } from '../../types';
import { CourseCard } from '../common/CourseCard';
import { GiftCourseModal } from '../common/GiftCourseModal';

// Full-page Course Details Loading Skeleton matching Udemy layout
const CourseDetailPageSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-white pb-24 text-slate-800 font-sans animate-pulse">
      {/* Top Breadcrumb Bar Skeleton */}
      <div className="bg-[#1c1d1f] border-b border-slate-800 text-slate-300 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center space-x-2">
          <div className="h-3.5 w-16 bg-slate-800 rounded" />
          <div className="h-3.5 w-3 bg-slate-800 rounded" />
          <div className="h-3.5 w-20 bg-slate-800 rounded" />
          <div className="h-3.5 w-3 bg-slate-800 rounded" />
          <div className="h-3.5 w-32 bg-slate-800 rounded" />
        </div>
      </div>

      {/* Dark Hero Section Skeleton */}
      <div className="bg-[#1c1d1f] text-white py-10 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl space-y-4">
            <div className="h-4 w-36 bg-slate-800 rounded" />
            <div className="space-y-2">
              <div className="h-8 sm:h-10 w-full max-w-2xl bg-slate-800 rounded-md" />
              <div className="h-8 sm:h-10 w-3/4 max-w-lg bg-slate-800 rounded-md" />
            </div>
            <div className="space-y-1.5 pt-1">
              <div className="h-4 sm:h-5 w-5/6 bg-slate-800/80 rounded" />
              <div className="h-4 sm:h-5 w-2/3 bg-slate-800/80 rounded" />
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-3">
              <div className="h-6 w-28 bg-amber-500/20 rounded" />
              <div className="h-5 w-32 bg-slate-800 rounded" />
              <div className="h-5 w-40 bg-slate-800 rounded" />
              <div className="h-5 w-28 bg-slate-800 rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content & Floating Sidebar Grid Skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 relative">
          
          {/* Left Column: What you'll learn, Curriculum, Requirements, Description */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* What you'll learn card */}
            <div className="border border-slate-200 bg-white rounded-none p-6 space-y-4 shadow-xs">
              <div className="h-6 w-52 bg-slate-200 rounded" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-start space-x-2.5">
                    <div className="w-4 h-4 rounded-full bg-slate-200 shrink-0 mt-0.5" />
                    <div className="h-4 w-full bg-slate-200 rounded" />
                  </div>
                ))}
              </div>
            </div>

            {/* Course Content Header */}
            <div className="space-y-3">
              <div className="h-6 w-44 bg-slate-200 rounded" />
              <div className="flex items-center justify-between">
                <div className="h-4 w-52 bg-slate-200 rounded" />
                <div className="h-4 w-32 bg-slate-200 rounded" />
              </div>
            </div>

            {/* Curriculum Accordion Items */}
            <div className="border border-slate-200 divide-y divide-slate-200 bg-white">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4 flex items-center justify-between bg-slate-50/70">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="w-4 h-4 bg-slate-300 rounded" />
                    <div className="h-4 w-1/2 bg-slate-200 rounded" />
                  </div>
                  <div className="h-4 w-20 bg-slate-200 rounded" />
                </div>
              ))}
            </div>

            {/* Requirements Section */}
            <div className="space-y-3 pt-4">
              <div className="h-6 w-36 bg-slate-200 rounded" />
              <div className="space-y-2.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-2.5">
                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                    <div className="h-4 w-3/4 bg-slate-200 rounded" />
                  </div>
                ))}
              </div>
            </div>

            {/* Description Section */}
            <div className="space-y-3 pt-4">
              <div className="h-6 w-36 bg-slate-200 rounded" />
              <div className="space-y-2">
                <div className="h-4 w-full bg-slate-200 rounded" />
                <div className="h-4 w-11/12 bg-slate-200 rounded" />
                <div className="h-4 w-4/5 bg-slate-200 rounded" />
              </div>
            </div>
          </div>

          {/* Right Column: Sticky Floating Course Card Skeleton */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-slate-200 shadow-xl rounded-none overflow-hidden lg:-mt-64 sticky top-20 z-20">
              {/* Media Preview Player Thumbnail Skeleton */}
              <div className="aspect-video w-full bg-slate-800 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                  <div className="w-0 h-0 border-y-8 border-y-transparent border-l-12 border-l-white/60 ml-1" />
                </div>
              </div>

              {/* Sidebar Body Skeleton */}
              <div className="p-6 space-y-5">
                {/* Price Row */}
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-28 bg-slate-200 rounded" />
                  <div className="h-5 w-20 bg-slate-200 rounded" />
                </div>

                {/* Primary & Secondary Action Buttons */}
                <div className="space-y-2.5">
                  <div className="h-12 w-full bg-[#a435f0]/40 rounded-none" />
                  <div className="h-12 w-full border border-slate-300 rounded-none bg-slate-100" />
                </div>

                {/* Features List Header & Items */}
                <div className="space-y-3 pt-3 border-t border-slate-200">
                  <div className="h-4 w-36 bg-slate-200 rounded" />
                  <div className="space-y-2.5">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="flex items-center space-x-2.5">
                        <div className="w-4 h-4 rounded bg-slate-200 shrink-0" />
                        <div className="h-3.5 w-4/5 bg-slate-200 rounded" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export const CourseDetailPage: React.FC<{ courseProp?: Course; onClosePreview?: () => void }> = ({ courseProp, onClosePreview }) => {
  const { courseId: routeCourseId } = useParams<{ courseId: string }>();
  const courseId = courseProp?.id || routeCourseId;
  const navigate = useNavigate();
  const { courses, enrolledCourses, addToCart, enrollCourse, setCourses, formatPrice, getDiscountPercentage, currentUser, openShareCourseModal } = useApp();
  const calculateDiscount = getDiscountPercentage || ((price: number, orig: number) => orig > price ? Math.round(((orig - price) / orig) * 100) : 0);
  const [isInitialLoading, setIsInitialLoading] = useState(!courseProp);
  const [isLoadingModules, setIsLoadingModules] = useState(false);
  const [studentSub, setStudentSub] = useState<CourseSubscription | null>(null);
  const [expandedModules, setExpandedModules] = useState<Record<number, boolean>>({ 0: true });
  const [realLearnersCount, setRealLearnersCount] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [videoDurations, setVideoDurations] = useState<Record<string, string>>({});
  const [videoSeconds, setVideoSeconds] = useState<Record<string, number>>({});
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [archiveNotice, setArchiveNotice] = useState<string | null>(null);
  const [isArchived, setIsArchived] = useState(() => {
    try {
      return localStorage.getItem(`uqlearn_archived_${courseId}`) === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleArchive = () => {
    if (!courseId) return;
    const next = !isArchived;
    setIsArchived(next);
    try {
      localStorage.setItem(`uqlearn_archived_${courseId}`, String(next));
    } catch {}
    setArchiveNotice(next ? 'Course has been archived' : 'Course removed from archive');
    setTimeout(() => setArchiveNotice(null), 3000);
  };

  useEffect(() => {
    const handleScroll = () => {
      // Trigger sticky header when scrolled past hero title section (~260px)
      const isSticky = window.scrollY > 260;
      setShowStickyHeader(isSticky);
      window.dispatchEvent(new CustomEvent('uqlearn_course_sticky_header', { detail: { visible: isSticky } }));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.dispatchEvent(new CustomEvent('uqlearn_course_sticky_header', { detail: { visible: false } }));
    };
  }, []);

  const baseCourse = courseProp || courses.find(c => c.id === courseId) || (courses.length > 0 && !courseId ? courses[0] : undefined);
  const contextCourse = courses.find(c => c.id === courseId);
  const course = contextCourse ? { ...baseCourse, ...contextCourse } : baseCourse;
  const isEnrolled = course ? (enrolledCourses.some(e => e.id === course.id) || studentSub?.status === 'active') : false;

  // Unified data coordinator: waits until all relevant course APIs return before dismissing skeleton
  useEffect(() => {
    let isMounted = true;

    async function loadAllCourseData() {
      if (!courseId) {
        if (isMounted) setIsInitialLoading(false);
        return;
      }

      setIsInitialLoading(true);

      // 1. If course is not present in memory, fetch catalog
      let currentCourse = courses.find(c => c.id === courseId);
      if (!currentCourse) {
        try {
          const allCoursesRes = await fetchCoursesApi();
          const list = Array.isArray(allCoursesRes) ? allCoursesRes : [];
          if (list.length > 0 && isMounted) {
            setCourses(list.map(normalizeCourse));
            currentCourse = list.find((c: any) => c.id === courseId);
          }
        } catch (err) {
          console.warn("Could not fetch course from catalog:", err);
        }
      }

      // 2. Fetch modules, intended learners, and learners count in parallel
      try {
        await Promise.allSettled([
          fetchCourseModulesApi(courseId).then(res => {
            if (!isMounted) return;
            const modulesData = Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : null);
            if (modulesData && modulesData.length > 0) {
              setCourses(prev => prev.map(c => c.id === courseId ? normalizeCourse({ ...c, modules: modulesData }) : c));
            }
          }),
          getIntendedLearnersApi(courseId).then(res => {
            if (!isMounted) return;
            const data = (res && res.data) ? res.data : null;
            if (data) {
              const objectives = data.learning_objectives || data.learningObjectives || [];
              const reqs = data.requirements || [];
              if ((Array.isArray(objectives) && objectives.length > 0) || (Array.isArray(reqs) && reqs.length > 0)) {
                setCourses(prev => prev.map(c => c.id === courseId ? { 
                  ...c, 
                  learningObjectives: Array.isArray(objectives) && objectives.length > 0 ? objectives : c.learningObjectives, 
                  requirements: Array.isArray(reqs) && reqs.length > 0 ? reqs : c.requirements 
                } : c));
              }
            }
          }),
          getCourseLearnersApi(courseId).then(res => {
            if (!isMounted) return;
            const count = typeof res?.data?.learners === 'number' ? res.data.learners : typeof res?.learners === 'number' ? res.learners : null;
            if (count !== null) {
              setRealLearnersCount(count);
              setCourses(prev => prev.map(c => c.id === courseId ? { ...c, learnersEnrolled: count, learners_enrolled: count, students_enrolled: count } : c));
            }
          }),
          getCourseRatingsApi(courseId).then(res => {
            if (!isMounted) return;
            const ratingList = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
            if (ratingList.length > 0) {
              const sum = ratingList.reduce((acc: number, curr: any) => acc + (Number(curr.rating) || 0), 0);
              const avg = Number((sum / ratingList.length).toFixed(1));
              const count = ratingList.length;
              setCourses(prev => prev.map(c => c.id === courseId ? { ...c, rating: avg, reviewCount: count } : c));
            }
          })
        ]);
      } catch (err) {
        console.warn("Error loading course details data:", err);
      } finally {
        if (isMounted) {
          setIsInitialLoading(false);
          setIsLoadingModules(false);
        }
      }
    }

    loadAllCourseData();
    return () => { isMounted = false; };
  }, [courseId]);

  useEffect(() => {
    async function checkSubscription() {
      if (!course?.id || !currentUser?.id) return;
      try {
        const subs = await subscriptionService.getStudentSubscriptions(currentUser.id, currentUser.email);
        if (Array.isArray(subs)) {
          const match = subs.find(s => s.courseId === course.id);
          if (match && match.status === 'active') {
            setStudentSub(match);
            enrollCourse(course);
          }
        }
      } catch {}
    }
    checkSubscription();
  }, [course?.id, currentUser?.id]);

  useEffect(() => {
    if (course?.id) recordRecentlyViewedApi(currentUser?.id || 'guest', course.id);
  }, [course?.id, currentUser?.id]);

  const isFree = !course?.price || Number(course?.price) === 0;
  const handleEnrollNow = () => {
    if (!course) return;
    if (isEnrolled) {
      navigate(`/learn/${course.id}`);
    } else if (isFree) {
      enrollCourse(course);
      navigate(`/learn/${course.id}`);
    } else {
      navigate(`/enroll/${course.id}`);
    }
  };

  const handleShare = () => {
    if (course) openShareCourseModal(course);
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Robust default fallbacks for content display
  const learningObjectives = (course?.learningObjectives && course.learningObjectives.length > 0)
    ? course.learningObjectives
    : [
        `Master essential principles and practical techniques in ${course?.title || 'this subject'}`,
        `Apply core methodologies to solve real-world industry challenges`,
        `Build hands-on projects and portfolio-ready solutions`,
        `Develop best practices and workflows for efficient execution`
      ];

  const requirements = (course?.requirements && course.requirements.length > 0)
    ? course.requirements
    : [
        'No prior specialized knowledge required - open to all background levels',
        'A computer, tablet, or smartphone with an active internet connection',
        'Enthusiasm and motivation to learn and practice new skills'
      ];

  const displayModules: Array<{ id: string; title: string; lessons: Array<{ id: string; title: string; duration?: string; videoUrl?: string; videoPath?: string; type?: string; [key: string]: any }> }> = (course?.modules && course.modules.length > 0)
    ? (course.modules as any)
    : [
        {
          id: 'mod-1',
          title: 'Module 1: Introduction & Foundation',
          lessons: [
            { id: 'les-1', title: 'Course Overview & Key Objectives', duration: '08:30' },
            { id: 'les-2', title: 'Setting Up Your Environment & Workspace', duration: '12:15' }
          ]
        },
        {
          id: 'mod-2',
          title: 'Module 2: Core Concepts & Hands-on Practice',
          lessons: [
            { id: 'les-3', title: 'Step-by-Step Guided Implementation', duration: '18:40' },
            { id: 'les-4', title: 'Practical Exercises & Workflows', duration: '22:10' }
          ]
        },
        {
          id: 'mod-3',
          title: 'Module 3: Advanced Applications & Summary',
          lessons: [
            { id: 'les-5', title: 'Real-World Case Study', duration: '25:00' },
            { id: 'les-6', title: 'Course Summary & Next Steps', duration: '10:45' }
          ]
        }
      ];

  const totalLessons = displayModules.reduce((acc: number, m: any) => acc + (m.lessons ? m.lessons.length : 0), 0);

  const toggleModule = (idx: number) => {
    setExpandedModules(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Helper to determine if a lesson actually has a video attached
  const hasVideoContent = (lesson: any): boolean => {
    if (!lesson) return false;
    const type = String(lesson.type || '').toLowerCase();
    if (type === 'quiz' || type === 'article' || type === 'text' || type === 'assignment') {
      return false;
    }
    const video = (lesson.videoUrl || lesson.video_url || lesson.videoPath || lesson.video_path || '').trim();
    return Boolean(video);
  };

  // Helper to detect placeholder or fake durations that shouldn't be shown as real video time
  const isFakeOrPlaceholderDuration = (d?: string): boolean => {
    if (!d) return true;
    const s = d.trim().toLowerCase();
    return s === '' || s === '12:00' || s === '10:00' || s === '05:00' || s === '00:00' || s === 'ready' || s === '2min';
  };

  // Probe real video durations for lessons that actually have video URLs
  useEffect(() => {
    if (!displayModules || displayModules.length === 0) return;

    displayModules.forEach(mod => {
      (mod.lessons || []).forEach(lesson => {
        if (!hasVideoContent(lesson)) return;

        const vUrl = (lesson.videoUrl || (lesson as any).video_url || lesson.videoPath || (lesson as any).video_path || '').trim();
        if (!vUrl) return;

        const fullUrl = vUrl.startsWith('http') || vUrl.startsWith('data:') || vUrl.startsWith('blob:')
          ? vUrl
          : `${ROOT_URL.replace(/\/$/, '')}/${vUrl.replace(/^\//, '')}`;

        try {
          const videoEl = document.createElement('video');
          videoEl.preload = 'metadata';
          videoEl.src = fullUrl;
          videoEl.onloadedmetadata = () => {
            if (videoEl.duration && isFinite(videoEl.duration) && videoEl.duration > 0) {
              const totalSec = Math.round(videoEl.duration);
              const hours = Math.floor(totalSec / 3600);
              const remSec = totalSec % 3600;
              const mins = Math.floor(remSec / 60);
              const secs = remSec % 60;
              const formatted = hours > 0
                ? `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
                : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

              setVideoSeconds(prev => {
                if (prev[lesson.id] === totalSec) return prev;
                return { ...prev, [lesson.id]: totalSec };
              });

              setVideoDurations(prev => {
                if (prev[lesson.id] === formatted) return prev;
                return { ...prev, [lesson.id]: formatted };
              });
            }
          };
        } catch (e) {
          // Safe catch
        }
      });
    });
  }, [displayModules]);

  // Helper to parse duration strings (e.g. "12:30", "1:15:00", "45 mins", "1.5 hours") into seconds
  const parseDurationToSeconds = (dur?: string): number => {
    if (!dur) return 0;
    const s = dur.trim().toLowerCase();
    if (s === '' || s === 'ready' || s === '00:00' || s === '0:00') return 0;

    // Check if it's formatted as HH:MM:SS or MM:SS
    if (s.includes(':')) {
      const parts = s.split(':').map(p => parseInt(p, 10) || 0);
      if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
      }
    }

    // Check if it has hours / mins / seconds text
    let sec = 0;
    const hoursMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:hours|hour|hrs|hr|h)\b/);
    const minsMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:minutes|minute|mins|min|m)\b/);
    const secMatch = s.match(/(\d+)\s*(?:seconds|second|secs|sec|s)\b/);

    if (hoursMatch) sec += Math.round(parseFloat(hoursMatch[1]) * 3600);
    if (minsMatch) sec += Math.round(parseFloat(minsMatch[1]) * 60);
    if (secMatch) sec += parseInt(secMatch[1], 10);

    if (sec > 0) return sec;

    // Numeric fallback
    const digits = parseFloat(s.replace(/[^0-9.]/g, ''));
    if (!isNaN(digits) && digits > 0) {
      if (digits <= 180) {
        return Math.round(digits * 60);
      }
      return Math.round(digits);
    }

    return 0;
  };

  // Total video duration calculation across all course video lectures
  const totalVideoDurationText = useMemo(() => {
    let totalSeconds = 0;
    let hasAnyVideo = false;

    if (displayModules && displayModules.length > 0) {
      displayModules.forEach(mod => {
        (mod.lessons || []).forEach(lesson => {
          if (hasVideoContent(lesson)) {
            hasAnyVideo = true;
            if (videoSeconds[lesson.id] && videoSeconds[lesson.id] > 0) {
              totalSeconds += videoSeconds[lesson.id];
            } else if (videoDurations[lesson.id]) {
              totalSeconds += parseDurationToSeconds(videoDurations[lesson.id]);
            } else if (lesson.duration && !isFakeOrPlaceholderDuration(lesson.duration)) {
              totalSeconds += parseDurationToSeconds(lesson.duration);
            }
          }
        });
      });
    }

    // If total calculated from lessons is 0, check course.duration
    if (totalSeconds <= 0 && course?.duration) {
      const parsedCourseDuration = parseDurationToSeconds(course.duration);
      if (parsedCourseDuration > 0) {
        totalSeconds = parsedCourseDuration;
      }
    }

    if (totalSeconds <= 0) {
      if (!hasAnyVideo && !course?.duration) {
        return 'Full lifetime access to';
      }
      return '1 hour';
    }

    const totalMinutes = Math.max(1, Math.round(totalSeconds / 60));

    // Under 1 hour: show minutes (e.g. "45 mins" or "1 min")
    if (totalMinutes < 60) {
      return `${totalMinutes} ${totalMinutes === 1 ? 'min' : 'mins'}`;
    }

    // 1 hour or more: show hours and minutes (e.g. "1 hour 25 mins", "1 hour", "2 hours 10 mins")
    const hours = Math.floor(totalMinutes / 60);
    const remainingMins = totalMinutes % 60;
    const hourLabel = `${hours} ${hours === 1 ? 'hour' : 'hours'}`;

    if (remainingMins === 0) {
      return hourLabel;
    }

    const minLabel = `${remainingMins} ${remainingMins === 1 ? 'min' : 'mins'}`;
    return `${hourLabel} ${minLabel}`;
  }, [displayModules, videoSeconds, videoDurations, course?.duration]);

  // Total articles count across all lessons in the course
  const totalArticlesCount = useMemo(() => {
    let count = 0;
    if (displayModules && displayModules.length > 0) {
      displayModules.forEach(mod => {
        (mod.lessons || []).forEach(lesson => {
          const type = String(lesson.type || '').toLowerCase();
          if (type === 'article' || type === 'text' || type === 'reading' || type === 'document' || type === 'doc') {
            count++;
          } else if (!hasVideoContent(lesson) && type !== 'quiz' && type !== 'assignment') {
            // Lecture without video and not quiz/assignment is considered an article / reading lecture
            count++;
          }
        });
      });
    }

    if (count === 0 && (course as any)?.articlesCount) {
      count = Number((course as any).articlesCount) || 0;
    }
    if (count === 0 && (course as any)?.articles_count) {
      count = Number((course as any).articles_count) || 0;
    }
    if (count === 0 && typeof (course as any)?.articles === 'number') {
      count = (course as any).articles;
    }
    return count;
  }, [displayModules, course]);

  // Total downloadable resources count across all lessons in the course
  const totalResourcesCount = useMemo(() => {
    let count = 0;
    if (displayModules && displayModules.length > 0) {
      displayModules.forEach(mod => {
        (mod.lessons || []).forEach(lesson => {
          if (Array.isArray(lesson.resources)) {
            count += lesson.resources.length;
          } else if (typeof (lesson as any).resources === 'string' && (lesson as any).resources.trim().length > 0) {
            try {
              const parsed = JSON.parse((lesson as any).resources);
              if (Array.isArray(parsed)) count += parsed.length;
            } catch {}
          } else if ((lesson as any).resource_count) {
            count += Number((lesson as any).resource_count) || 0;
          }
        });
      });
    }

    if (count === 0 && (course as any)?.resourcesCount) {
      count = Number((course as any).resourcesCount) || 0;
    }
    if (count === 0 && (course as any)?.downloadable_resources) {
      count = Number((course as any).downloadable_resources) || 0;
    }
    if (count === 0 && (course as any)?.downloadableResourcesCount) {
      count = Number((course as any).downloadableResourcesCount) || 0;
    }
    if (count === 0 && Array.isArray((course as any)?.resources)) {
      count = (course as any).resources.length;
    }
    return count;
  }, [displayModules, course]);

  // Find other courses by the same instructor, or fallback to the same category
  const { relatedCourses, isInstructorSpecific } = useMemo(() => {
    if (!course) {
      return { relatedCourses: [], isInstructorSpecific: false };
    }

    const currentInstructor = (course.instructor || '').toLowerCase().trim();
    const currentCreatedBy = course.createdBy || course.created_by;
    const currentCategory = (course.category || '').toLowerCase().trim();

    // 1. First priority: other courses by the same instructor
    const byInstructor = courses.filter(c => {
      if (c.id === course.id) return false;
      if (currentCreatedBy && (c.createdBy === currentCreatedBy || c.created_by === currentCreatedBy)) {
        return true;
      }
      if (currentInstructor && (c.instructor || '').toLowerCase().trim() === currentInstructor) {
        return true;
      }
      return false;
    });

    if (byInstructor.length > 0) {
      return {
        relatedCourses: byInstructor.slice(0, 4),
        isInstructorSpecific: true
      };
    }

    // 2. Second priority: other courses from the same category
    const byCategory = courses.filter(c => {
      if (c.id === course.id) return false;
      return (c.category || '').toLowerCase().trim() === currentCategory;
    });

    if (byCategory.length > 0) {
      return {
        relatedCourses: byCategory.slice(0, 4),
        isInstructorSpecific: false
      };
    }

    // 3. Fallback: other top courses in the catalog
    const generalFallback = courses.filter(c => c.id !== course.id).slice(0, 4);
    return {
      relatedCourses: generalFallback,
      isInstructorSpecific: false
    };
  }, [courses, course]);

  // Determine display duration: ONLY returns a duration string if the lesson has a video and duration is real
  const getLessonDisplayDuration = (lesson: any): string | null => {
    // If curriculum/lecture does not have video, NEVER show time!
    if (!hasVideoContent(lesson)) {
      return null;
    }

    // 1. Probed from actual video media metadata
    if (videoDurations[lesson.id]) {
      return videoDurations[lesson.id];
    }

    // 2. Real non-fake stored duration
    if (lesson.duration && !isFakeOrPlaceholderDuration(lesson.duration)) {
      return lesson.duration;
    }

    // 3. Fake duration (like 12:00) without real probed metadata: do NOT display
    return null;
  };

  const renderLessonIcon = (lesson: any) => {
    const hasVideo = hasVideoContent(lesson);
    const type = String(lesson.type || '').toLowerCase();

    if (hasVideo) {
      return <Play className="w-4 h-4 text-slate-400 shrink-0" />;
    }

    if (type === 'quiz') {
      return <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />;
    }

    if (type === 'audio') {
      return <Volume2 className="w-4 h-4 text-slate-400 shrink-0" />;
    }

    return <FileText className="w-4 h-4 text-slate-400 shrink-0" />;
  };

  // 1. Loading Skeleton: renders while any critical API is still fetching
  if (isInitialLoading || (!course && courses.length === 0)) {
    return <CourseDetailPageSkeleton />;
  }

  // 2. Course Not Found: renders if loading completed but no course exists for this ID
  if (!course) {
    return (
      <div className="min-h-screen bg-white pb-24 text-slate-800 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4">
          <HelpCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Course Not Found</h2>
        <p className="text-sm text-slate-600 max-w-md mb-6">
          The course you are looking for might have been moved, unpublished, or is currently unavailable.
        </p>
        <button
          onClick={() => navigate('/courses')}
          className="px-6 py-2.5 bg-[#a435f0] hover:bg-[#8710d8] text-white font-bold text-sm transition-colors uppercase tracking-wider"
        >
          Explore All Courses
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24 text-slate-800 font-sans">
      {/* Sticky Top Course Bar (replaces/covers navigation when scrolled down) */}
      <div 
        className={`fixed top-0 left-0 right-0 z-50 bg-[#1c1d1f] text-white shadow-xl border-b border-slate-800 transition-all duration-300 ease-in-out transform ${
          showStickyHeader ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-4">
          
          {/* Left Side: Course Title + Rating & Students Stats matching screenshot */}
          <div className="min-w-0 flex-1">
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight truncate leading-snug">
              {course.title}
            </h2>
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-white pt-0.5 flex-wrap">
              {course.bestSeller && (
                <span className="px-1.5 py-0.5 bg-[#eceb98] text-[#3c3b00] font-bold text-[10px] uppercase rounded-none shrink-0">
                  Bestseller
                </span>
              )}
              {(course.isPremium || (course as any).is_premium) && (
                <span className="px-1.5 py-0.5 bg-purple-600 text-white font-bold text-[10px] uppercase rounded-none shrink-0">
                  Premium
                </span>
              )}
              <div className="flex items-center gap-1 shrink-0">
                <span className="font-bold text-[#f3ca8c] text-xs sm:text-sm">
                  {course.rating ? Number(course.rating).toFixed(1) : '4.8'}
                </span>
                <Star className="w-3.5 h-3.5 fill-current text-[#f3ca8c] shrink-0" />
              </div>
              <span className="text-[#c0c4fc] underline cursor-pointer truncate">
                ({(course.reviewCount || 0).toLocaleString()} {(course.reviewCount || 0) === 1 ? 'rating' : 'ratings'})
              </span>
              <span className="text-slate-300 hidden xs:inline truncate">
                {(realLearnersCount !== null ? realLearnersCount : (course.learnersEnrolled || 0)).toLocaleString()} students
              </span>
            </div>
          </div>

          {/* Right Side: Dynamic Price + CTA Action Button */}
          <div className="flex items-center space-x-3 shrink-0">
            <div className="text-right hidden sm:block">
              {isFree ? (
                <span className="text-base font-black text-white">Free</span>
              ) : (
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-base font-black text-white">
                    {formatPrice(course.price)}
                  </span>
                  {course.originalPrice && Number(course.originalPrice) > Number(course.price) && (
                    <span className="text-xs text-slate-400 line-through">
                      {formatPrice(course.originalPrice)}
                    </span>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleEnrollNow}
              className="px-3.5 sm:px-5 py-2 sm:py-2.5 bg-[#a435f0] hover:bg-[#8710d8] text-white font-bold text-xs sm:text-sm rounded-none transition-colors uppercase tracking-wide shadow-sm cursor-pointer shrink-0"
            >
              {isEnrolled ? 'Go to Course' : (isFree ? 'Enroll Free' : 'Buy now')}
            </button>
          </div>

        </div>
      </div>

      {/* Top Breadcrumb Bar */}
      <div className="bg-[#1c1d1f] border-b border-slate-800 text-slate-300 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 truncate">
            <Link to="/" className="hover:text-teal-400">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link to="/courses" className="hover:text-teal-400">Courses</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-teal-400 font-semibold">{course.category || 'General'}</span>
          </div>
        </div>
      </div>

      {/* Udemy Header Section */}
      <div className="bg-[#1c1d1f] text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl space-y-4">
            <div className="text-xs font-semibold tracking-wider text-[#c0c4fc] uppercase">
              {course.category || 'Professional Development'}
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
              {course.title}
            </h1>
            <p className="text-base sm:text-lg text-slate-200 leading-normal">
              {course.subtitle || course.description?.slice(0, 160) || 'Learn essential skills step-by-step with guided practical lessons.'}
            </p>

            {/* Badges & Stats */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-white pt-1">
              {course.bestSeller && (
                <span className="px-2.5 py-1 bg-[#eceb98] text-[#3c3b00] font-bold text-xs uppercase rounded-none">
                  Bestseller
                </span>
              )}
              {(course.isPremium || (course as any).is_premium) && (
                <span className="px-2.5 py-1 bg-purple-600 text-white font-bold text-xs uppercase rounded-none flex items-center gap-1">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  <span>Premium</span>
                </span>
              )}
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[#f3ca8c] text-base">{course.rating ? Number(course.rating).toFixed(1) : '4.8'}</span>
                <div className="flex text-[#f3ca8c]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current text-[#f3ca8c]" />
                  ))}
                </div>
              </div>
              <span className="text-[#c0c4fc] underline cursor-pointer">
                ({(course.reviewCount || 0).toLocaleString()} ratings)
              </span>
              <span className="text-slate-300">
                {(realLearnersCount !== null ? realLearnersCount : (course.learnersEnrolled || 0)).toLocaleString()} students
              </span>
            </div>

            {/* Created By & Instructor Info Inline */}
            <div className="flex items-center space-x-3 pt-2">
              <img 
                src={resolveImageUrl(course.instructorAvatar, 'avatar')} 
                alt={course.instructor} 
                className="w-10 h-10 rounded-full object-cover border border-slate-700 shrink-0" 
              />
              <div className="text-sm">
                <span className="text-slate-300">Created by </span>
                <a href="#instructor" className="text-[#c0c4fc] underline font-medium hover:text-white">
                  {course.instructor || 'Instructor'}
                </a>
                {course.instructorTitle && (
                  <span className="text-slate-400 text-xs block">{course.instructorTitle}</span>
                )}
              </div>
            </div>

            {/* Meta Row (Language, Last Updated) */}
            <div className="flex flex-wrap items-center gap-6 text-xs text-slate-300 pt-2 border-t border-slate-800">
              <div className="flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>Last updated 10/2026</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Globe className="w-4 h-4 text-slate-400" />
                <span>English</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Single-Column Downward Content & Sticky Sidebar Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 relative items-start">
          
          {/* Main Left Scrollable Area */}
          <div className="lg:col-span-8 space-y-8">

            {/* Dynamic Course Summary Banner Card */}
            {(() => {
              const isPremiumCourse = Boolean(course.isPremium || (course as any).is_premium);
              const isBestsellerCourse = Boolean(course.bestSeller || (course as any).isBestseller || (course as any).is_bestseller);
              const isSponsoredCourse = Boolean(course.isSponsored || (course as any).is_sponsored || (course as any).sponsored);

              let activeBadge: 'premium' | 'bestseller' | 'sponsored' = 'premium';
              if (isPremiumCourse) {
                activeBadge = 'premium';
              } else if (isBestsellerCourse) {
                activeBadge = 'bestseller';
              } else if (isSponsoredCourse) {
                activeBadge = 'sponsored';
              } else {
                activeBadge = 'premium';
              }

              const displayRatingVal = course.rating ? Number(course.rating).toFixed(1) : '4.7';
              const displayReviewCountVal = (course.reviewCount || 0).toLocaleString();
              const displayLearnersVal = (realLearnersCount !== null ? realLearnersCount : (course.learnersEnrolled || 0)).toLocaleString();

              return (
                <div className="border border-slate-200 rounded-xl bg-white shadow-xs overflow-hidden flex flex-col sm:flex-row items-stretch">
                  {/* Left Badge Block */}
                  <div className={`px-6 py-5 flex flex-col items-center justify-center shrink-0 min-w-[130px] font-bold ${
                    activeBadge === 'premium'
                      ? 'bg-[#5022c3] text-white'
                      : activeBadge === 'bestseller'
                      ? 'bg-[#137275] text-white'
                      : 'bg-amber-500 text-slate-950'
                  }`}>
                    {activeBadge === 'premium' && <BadgeCheck className="w-7 h-7 mb-1 stroke-[2.2]" />}
                    {activeBadge === 'bestseller' && <Award className="w-7 h-7 mb-1 stroke-[2.2]" />}
                    {activeBadge === 'sponsored' && <Sparkles className="w-7 h-7 mb-1 stroke-[2.2]" />}
                    <span className="text-sm font-extrabold tracking-wider capitalize">
                      {activeBadge === 'premium' ? 'Premium' : activeBadge === 'bestseller' ? 'Bestseller' : 'Sponsored'}
                    </span>
                  </div>

                  {/* Middle Plan Text */}
                  <div className="flex-1 px-6 py-4 flex items-center text-xs sm:text-sm text-slate-800 font-medium leading-relaxed border-t sm:border-t-0 sm:border-l border-slate-100">
                    <span>Access 28,000+ top-rated courses with <span className="text-[#5022c3] font-bold underline cursor-pointer hover:text-purple-800">UQ Learn Personal Plan</span>.</span>
                  </div>

                  {/* Rating Column */}
                  <div className="border-t sm:border-t-0 sm:border-l border-slate-200 px-6 py-4 flex flex-col items-center justify-center shrink-0 min-w-[140px] bg-white">
                    <span className="text-2xl font-black text-slate-900 leading-none">
                      {displayRatingVal}
                    </span>
                    <div className="flex text-amber-400 gap-0.5 my-1.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="text-xs text-[#5022c3] font-semibold underline cursor-pointer hover:text-purple-800">
                      {displayReviewCountVal} ratings
                    </span>
                  </div>

                  {/* Learners Column */}
                  <div className="border-t sm:border-t-0 sm:border-l border-slate-200 px-6 py-4 flex flex-col items-center justify-center shrink-0 min-w-[140px] bg-white">
                    <Users className="w-5 h-5 text-slate-700 mb-1" />
                    <span className="text-lg font-black text-slate-900 leading-tight">
                      {displayLearnersVal}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      learners
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* 1. What You'll Learn Card (SHARP corners) */}
            <div id="what-you-will-learn" className="border border-slate-300 rounded-none p-6 sm:p-8 bg-white space-y-5">
              <h2 className="text-2xl font-bold text-slate-900">What you'll learn</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {learningObjectives.map((item, idx) => (
                  <div key={idx} className="flex items-start space-x-3 text-sm text-slate-800">
                    <Check className="w-4 h-4 text-slate-900 shrink-0 mt-0.5 stroke-[3]" />
                    <span className="leading-snug">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Course Curriculum / Content Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Course content</h2>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">
                    {displayModules.length} sections • {totalLessons} lectures
                    {totalVideoDurationText && !totalVideoDurationText.includes('lifetime') ? ` • ${totalVideoDurationText} total length` : ''}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    const allExpanded = Object.keys(expandedModules).length === displayModules.length;
                    if (allExpanded) {
                      setExpandedModules({});
                    } else {
                      const newObj: Record<number, boolean> = {};
                      displayModules.forEach((_, i) => { newObj[i] = true; });
                      setExpandedModules(newObj);
                    }
                  }}
                  className="text-xs font-bold text-[#a435f0] hover:underline"
                >
                  {Object.keys(expandedModules).length === displayModules.length ? 'Collapse all sections' : 'Expand all sections'}
                </button>
              </div>

              {isLoadingModules ? (
                <div className="p-8 text-center border border-slate-300 rounded-none text-slate-500 text-sm">
                  Loading curriculum modules...
                </div>
              ) : (
                <div className="border border-slate-300 rounded-none divide-y divide-slate-300 bg-white">
                  {displayModules.map((mod, idx) => {
                    const isOpen = Boolean(expandedModules[idx]);
                    return (
                      <div key={mod.id || idx} className="bg-white">
                        <button 
                          onClick={() => toggleModule(idx)}
                          className="w-full bg-slate-50 p-4 font-bold text-slate-900 text-left flex items-center justify-between hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            {isOpen ? <ChevronUp className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
                            <span className="text-sm sm:text-base font-bold">{mod.title}</span>
                          </div>
                          <span className="text-xs font-normal text-slate-600 shrink-0 ml-2">
                            {mod.lessons?.length || 0} lectures
                          </span>
                        </button>
                        {isOpen && mod.lessons && (
                          <div className="divide-y divide-slate-100 border-t border-slate-200">
                            {mod.lessons.map((lesson, lIdx) => {
                              const duration = getLessonDisplayDuration(lesson);
                              const hasVideo = hasVideoContent(lesson);
                              const type = String(lesson.type || '').toLowerCase();

                              return (
                                <div key={lesson.id || lIdx} className="p-3.5 pl-10 flex items-center justify-between text-xs sm:text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                                  <div className="flex items-center space-x-3 truncate pr-4">
                                    {renderLessonIcon(lesson)}
                                    <span className="truncate">{lesson.title}</span>
                                  </div>
                                  <div className="flex items-center space-x-2 shrink-0">
                                    {!hasVideo && (
                                      <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                                        {type === 'quiz' ? 'Quiz' : type === 'article' || type === 'text' ? 'Reading' : ''}
                                      </span>
                                    )}
                                    {duration && (
                                      <span className="text-xs text-slate-500 font-mono">{duration}</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Requirements Section (SHARP corners) */}
            <div className="border border-slate-300 rounded-none p-6 sm:p-8 bg-white space-y-4">
              <h2 className="text-2xl font-bold text-slate-900">Requirements</h2>
              <ul className="space-y-2.5 text-sm text-slate-800 list-disc list-inside">
                {requirements.map((req, idx) => (
                  <li key={idx} className="leading-relaxed">{req}</li>
                ))}
              </ul>
            </div>

            {/* 4. Description Section (SHARP corners) */}
            <div className="border border-slate-300 rounded-none p-6 sm:p-8 bg-white space-y-4">
              <h2 className="text-2xl font-bold text-slate-900">Description</h2>
              <div className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line">
                {course.description || `${course.title} is designed to provide comprehensive, actionable knowledge. Whether you are looking to advance your career or start from scratch, this course gives you step-by-step guidance, practical examples, and clear exercises.`}
              </div>
            </div>

            {/* 5. Instructor Section (SHARP corners) */}
            <div id="instructor" className="border border-slate-300 rounded-none p-6 sm:p-8 bg-white space-y-5">
              <h2 className="text-2xl font-bold text-slate-900">Instructor</h2>
              <div className="space-y-3">
                <Link to="#" className="text-lg font-bold text-[#a435f0] hover:underline block">
                  {course.instructor || 'Lead Instructor'}
                </Link>
                <p className="text-xs text-slate-500 font-medium">
                  {course.instructorTitle || 'Experienced Educator & Industry Professional'}
                </p>
                <div className="flex items-center space-x-4 pt-1">
                  <img 
                    src={resolveImageUrl(course.instructorAvatar, 'avatar')} 
                    alt={course.instructor} 
                    className="w-20 h-20 rounded-full object-cover border border-slate-300 shrink-0" 
                  />
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center space-x-2">
                      <Star className="w-4 h-4 text-amber-500 fill-current" />
                      <span>{course.rating ? Number(course.rating).toFixed(1) : '5.0'} Instructor Rating</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Award className="w-4 h-4 text-slate-500" />
                      <span>{(course.reviewCount || 0).toLocaleString()} Reviews</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-slate-500" />
                      <span>{(realLearnersCount !== null ? realLearnersCount : (course.learnersEnrolled || 0)).toLocaleString()} Students</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Play className="w-4 h-4 text-slate-500" />
                      <span>{courses.filter(c => (c.instructor || '').toLowerCase().trim() === (course.instructor || '').toLowerCase().trim()).length || 1} Courses</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed pt-2">
                  Dedicated to delivering high-quality learning experiences focused on practical skill acquisition, modern best practices, and real-world results.
                </p>
              </div>
            </div>

            {/* 6. More Courses by Instructor / Category Card */}
            {relatedCourses && relatedCourses.length > 0 && (
              <div className="border border-slate-300 rounded-none p-6 sm:p-8 bg-white space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 pb-1 border-b border-slate-100">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                      {isInstructorSpecific 
                        ? `More Courses by ${course.instructor}` 
                        : `More Courses in ${course.category || 'this Category'}`}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      {isInstructorSpecific 
                        ? `Explore additional courses taught by ${course.instructor}` 
                        : `Popular courses recommended for learners in ${course.category || 'this field'}`}
                    </p>
                  </div>
                  {isInstructorSpecific && (
                    <span className="inline-flex items-center px-2.5 py-1 bg-[#a435f0]/10 text-[#a435f0] text-xs font-bold self-start sm:self-auto">
                      Instructor Verified
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  {relatedCourses.map((relCourse) => (
                    <CourseCard
                      key={relCourse.id}
                      course={relCourse}
                      formatPrice={formatPrice}
                      getDiscountPercentage={calculateDiscount}
                      navigate={(to) => {
                        navigate(to);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      discountDisplayMode="percentage"
                      cardTheme="white"
                      className="w-full"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 7. Share via Socials Section (ICONS ONLY - NO SURROUNDING CARD) */}
            <div className="pt-4 border-t border-slate-200">
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Share course:</span>
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={handleShare}
                    title="Share via socials"
                    className="p-2 text-slate-600 hover:text-[#a435f0] transition-colors"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={handleCopyLink}
                    title="Copy Link"
                    className="p-2 text-slate-600 hover:text-[#a435f0] transition-colors flex items-center space-x-1"
                  >
                    <Copy className="w-5 h-5" />
                    {copiedLink && <span className="text-xs font-semibold text-emerald-600">Copied!</span>}
                  </button>
                  <a 
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(course.title)}&url=${encodeURIComponent(window.location.href)}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 text-slate-600 hover:text-[#1DA1F2] transition-colors"
                    title="Share on Twitter"
                  >
                    <Twitter className="w-5 h-5" />
                  </a>
                  <a 
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 text-slate-600 hover:text-[#4267B2] transition-colors"
                    title="Share on Facebook"
                  >
                    <Facebook className="w-5 h-5" />
                  </a>
                  <a 
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 text-slate-600 hover:text-[#0077B5] transition-colors"
                    title="Share on LinkedIn"
                  >
                    <Linkedin className="w-5 h-5" />
                  </a>
                  <a 
                    href={`mailto:?subject=${encodeURIComponent(course.title)}&body=${encodeURIComponent(window.location.href)}`} 
                    className="p-2 text-slate-600 hover:text-slate-900 transition-colors"
                    title="Share via Email"
                  >
                    <Mail className="w-5 h-5" />
                  </a>
                </div>
              </div>
            </div>

          </div>

          {/* Right Sticky Sidebar (SHARP corners & STICKY desktop card) */}
          <div className="lg:col-span-4 lg:sticky lg:top-6 z-10">
            <div className="bg-white border border-slate-300 rounded-none shadow-xl overflow-hidden">
              
              {/* Media image container - hidden on desktop as requested in prompt #6, visible on mobile/tablet */}
              <div className="relative aspect-video bg-black overflow-hidden block lg:hidden">
                <img 
                  src={resolveImageUrl(course.image, 'course')} 
                  alt={course.title} 
                  className="w-full h-full object-cover opacity-85" 
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                    <Play className="w-6 h-6 text-slate-900 ml-1" />
                  </div>
                </div>
              </div>

              {/* Sticky Payment Details Box */}
              <div className="p-6 space-y-6">
                
                {/* Price Display */}
                <div className="space-y-1">
                  {isFree ? (
                    <span className="text-3xl font-black text-slate-900">Free</span>
                  ) : (
                    <div className="flex items-baseline space-x-3">
                      <span className="text-3xl font-black text-slate-900">
                        {formatPrice(course.price)}
                      </span>
                      {course.originalPrice && Number(course.originalPrice) > Number(course.price) && (
                        <span className="text-base text-slate-500 line-through">
                          {formatPrice(course.originalPrice)}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Primary CTA Buttons (SHARP rounded-none) */}
                <div className="space-y-3">
                  <button 
                    onClick={handleEnrollNow} 
                    className="w-full py-3.5 bg-[#a435f0] hover:bg-[#8710d8] text-white font-bold text-sm rounded-none transition-colors uppercase tracking-wide shadow-sm"
                  >
                    {isEnrolled ? 'Go to Course' : (isFree ? 'Enroll Now (Free)' : 'Buy now')}
                  </button>

                  {!isEnrolled && !isFree && (
                    <button 
                      onClick={() => addToCart(course)} 
                      className="w-full py-3.5 border border-slate-900 hover:bg-slate-100 text-slate-900 font-bold text-sm rounded-none transition-colors uppercase tracking-wide flex items-center justify-center space-x-2"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>Add to cart</span>
                    </button>
                  )}
                </div>

                {/* Guarantee & Features Included List */}
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    This course includes:
                  </h3>
                  <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700">
                    {/* Dynamic On-Demand Video */}
                    {totalVideoDurationText && !totalVideoDurationText.includes('lifetime') && (
                      <li className="flex items-center space-x-2.5">
                        <Play className="w-4 h-4 text-slate-500 shrink-0" />
                        <span>{totalVideoDurationText} on-demand video</span>
                      </li>
                    )}

                    {/* Dynamic Articles Count */}
                    {totalArticlesCount > 0 && (
                      <li className="flex items-center space-x-2.5">
                        <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                        <span>{totalArticlesCount} {totalArticlesCount === 1 ? 'article' : 'articles'}</span>
                      </li>
                    )}

                    {/* Dynamic Downloadable Resources Count */}
                    {totalResourcesCount > 0 && (
                      <li className="flex items-center space-x-2.5">
                        <FolderDown className="w-4 h-4 text-slate-500 shrink-0" />
                        <span>{totalResourcesCount} downloadable {totalResourcesCount === 1 ? 'resource' : 'resources'}</span>
                      </li>
                    )}

                    {/* Access on mobile and TV */}
                    <li className="flex items-center space-x-2.5">
                      <Smartphone className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>Access on mobile and TV</span>
                    </li>

                    {/* Full lifetime access */}
                    <li className="flex items-center space-x-2.5">
                      <Infinity className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>Full lifetime access</span>
                    </li>

                    {/* Certificate of completion */}
                    <li className="flex items-center space-x-2.5">
                      <Award className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>Certificate of completion</span>
                    </li>
                  </ul>
                </div>

                {/* Archive this course & Gift this course options */}
                <div className="pt-4 border-t border-slate-200 flex flex-col space-y-1">
                  <button
                    type="button"
                    onClick={handleToggleArchive}
                    className="w-full py-2 px-1 text-left text-xs sm:text-sm font-medium text-slate-700 hover:text-purple-700 transition-colors flex items-center space-x-2.5 rounded-none group cursor-pointer"
                  >
                    <Folder className="w-4 h-4 text-slate-500 group-hover:text-purple-700 shrink-0" />
                    <span>{isArchived ? 'Unarchive this course' : 'Archive this course'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsGiftModalOpen(true)}
                    className="w-full py-2 px-1 text-left text-xs sm:text-sm font-medium text-slate-700 hover:text-purple-700 transition-colors flex items-center space-x-2.5 rounded-none group cursor-pointer"
                  >
                    <Gift className="w-4 h-4 text-slate-500 group-hover:text-purple-700 shrink-0" />
                    <span>Gift this course</span>
                  </button>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Gift Course Modal */}
      {course && isGiftModalOpen && (
        <GiftCourseModal
          isOpen={isGiftModalOpen}
          onClose={() => setIsGiftModalOpen(false)}
          course={course}
        />
      )}

      {/* Toast feedback for archive/actions */}
      {archiveNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1c1d1f] text-white border border-slate-700 px-4 py-2.5 text-xs sm:text-sm font-medium shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Folder className="w-4 h-4 text-purple-400" />
          <span>{archiveNotice}</span>
        </div>
      )}
    </div>
  );
};

