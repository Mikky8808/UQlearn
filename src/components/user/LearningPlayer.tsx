import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  BookOpen, 
  FileText, 
  MessageSquare, 
  FolderDown, 
  Bookmark, 
  ListOrdered, 
  RefreshCw,
  Sparkles,
  Award,
  CheckCircle2,
  Share2,
  Search,
  SidebarOpen
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Lesson, Module, Course } from '../../types';
import { 
  fetchCourseModulesApi, 
  normalizeCourse, 
  fetchCoursesApi,
  getIntendedLearnersApi,
  getCourseLearnersApi,
  getCourseRatingsApi
} from '../../lib/apiConfig';
import { progressTrackingService } from '../../services/progress-tracking-service';
import { studentProgressService } from '../../services/student-progress-service';
import { markCourseCompletedApi } from '../../services/certificateService';

import { LearningHeader } from './learning/LearningHeader';
import { LearningVideoPlayer } from './learning/LearningVideoPlayer';
import { LearningLessonNav } from './learning/LearningLessonNav';
import { LearningCurriculum } from './learning/LearningCurriculum';
import { LearningOverviewTab } from './learning/LearningOverviewTab';
import { LearningNotesTab } from './learning/LearningNotesTab';
import { LearningQnATab } from './learning/LearningQnATab';
import { LearningResourcesTab } from './learning/LearningResourcesTab';
import { LearningAnnouncementsTab } from './learning/LearningAnnouncementsTab';
import { LearningReviewsTab } from './learning/LearningReviewsTab';
import { LearningToolsTab } from './learning/LearningToolsTab';
import { LearningCertificateModal } from './learning/LearningCertificateModal';
import { LearningShortcutsModal } from './learning/LearningShortcutsModal';
import { CourseRatingModal } from './learning/CourseRatingModal';

const getInitialModulesForCourse = (courseId: string, courseTitle?: string): Module[] => [
  {
    id: `mod-${courseId}-1`,
    title: 'Module 1: Introduction & Foundations',
    description: `Core concepts, environment setup, and foundational principles for ${courseTitle || 'this course'}.`,
    lessons: [
      {
        id: `les-${courseId}-1`,
        title: 'Welcome & Course Orientation',
        duration: '10:15',
        type: 'video',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        content: `Welcome to ${courseTitle || 'the course'}! In this opening lecture, we outline the roadmap, major learning milestones, software requirements, and set up your mindset for success.`,
        isPreview: true,
        resources: [
          { id: 'res-1', title: 'Course Syllabus & Blueprint (PDF)', type: 'pdf', url: '#' },
          { id: 'res-2', title: 'Starter Code & Assets (ZIP)', type: 'zip', url: '#' }
        ]
      },
      {
        id: `les-${courseId}-2`,
        title: 'Setting Up Your Workspace & Essential Tools',
        duration: '15:30',
        type: 'video',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        content: 'Step-by-step installation, editor extensions, key shortcuts, and preparing your environment for maximum efficiency.',
        isPreview: false,
        resources: [
          { id: 'res-3', title: 'Toolchain Configuration Guide', type: 'pdf', url: '#' }
        ]
      }
    ]
  },
  {
    id: `mod-${courseId}-2`,
    title: 'Module 2: Practical Projects & Deep Dive',
    description: 'Mastering essential industry techniques, workflows, and best practices.',
    lessons: [
      {
        id: `les-${courseId}-3`,
        title: 'Core Architecture & Implementation Patterns',
        duration: '22:45',
        type: 'video',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        content: 'A deep walkthrough of modular architectural patterns, state flow, and scalable design methodologies.',
        isPreview: false,
        resources: []
      },
      {
        id: `les-${courseId}-4`,
        title: 'Building A Complete Portfolio-Ready Project',
        duration: '28:10',
        type: 'video',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
        content: 'Constructing a production-grade portfolio project from scratch step-by-step with testing and optimization.',
        isPreview: false,
        resources: [
          { id: 'res-4', title: 'Full Project Source Code', type: 'zip', url: '#' }
        ]
      }
    ]
  }
];

const LearningPlayerSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#1c1d1f] text-white font-sans animate-pulse flex flex-col">
      {/* Top Header Skeleton */}
      <div className="h-14 border-b border-slate-800 px-5 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 rounded-full bg-slate-800" />
          <div className="h-4 w-48 bg-slate-800 rounded" />
        </div>
        <div className="flex items-center space-x-4">
          <div className="h-8 w-24 bg-slate-800 rounded" />
          <div className="h-8 w-8 rounded bg-slate-800" />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-[calc(100vh-3.5rem)]">
        {/* Left Video + Tab Content */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col bg-[#0f1012]">
          {/* Video Player Skeleton */}
          <div className="w-full aspect-video bg-slate-900 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
              <div className="w-8 h-8 rounded bg-slate-700" />
            </div>
          </div>
          {/* Lesson Nav Bar Skeleton */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-3 w-20 bg-slate-800 rounded" />
              <div className="h-5 w-64 bg-slate-800 rounded" />
            </div>
            <div className="flex space-x-3">
              <div className="h-9 w-24 bg-slate-800 rounded" />
              <div className="h-9 w-24 bg-slate-800 rounded" />
            </div>
          </div>
          {/* Tabs & Overview Skeleton */}
          <div className="p-6 space-y-6">
            <div className="flex space-x-6 border-b border-slate-800 pb-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-4 w-20 bg-slate-800 rounded" />
              ))}
            </div>
            <div className="space-y-4 pt-4">
              <div className="h-7 w-3/4 bg-slate-800 rounded" />
              <div className="h-4 w-1/2 bg-slate-800 rounded" />
              <div className="space-y-2 pt-4">
                <div className="h-4 w-full bg-slate-800 rounded" />
                <div className="h-4 w-11/12 bg-slate-800 rounded" />
                <div className="h-4 w-4/5 bg-slate-800 rounded" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar Curriculum Skeleton */}
        <div className="lg:col-span-4 xl:col-span-3 border-l border-slate-800 bg-[#1c1d1f] flex flex-col">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="h-5 w-32 bg-slate-800 rounded" />
            <div className="h-4 w-12 bg-slate-800 rounded" />
          </div>
          <div className="divide-y divide-slate-800 flex-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-3/4 bg-slate-800 rounded" />
                  <div className="h-3 w-10 bg-slate-800 rounded" />
                </div>
                <div className="space-y-2 pl-4">
                  <div className="h-3 w-5/6 bg-slate-800/80 rounded" />
                  <div className="h-3 w-4/5 bg-slate-800/80 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const LearningPlayer: React.FC<{ courseProp?: Course; onClosePreview?: () => void }> = ({ courseProp, onClosePreview }) => {
  const { courseId: routeCourseId } = useParams<{ courseId: string }>();
  const courseId = courseProp?.id || routeCourseId;
  const navigate = useNavigate();
  const { courses, enrolledCourses, setCourses, currentUser, darkMode, toggleDarkMode } = useApp();
  const userId = currentUser?.id || 'guest_learner';
  const userName = currentUser?.name || 'Learner';
  const [isLoading, setIsLoading] = useState<boolean>(!courseProp);

  // State: Local course object
  const [course, setLocalCourse] = useState<Course | undefined>(() => {
    if (courseProp) {
      const hasModules = courseProp.modules && courseProp.modules.length > 0 && courseProp.modules.some(m => m.lessons && m.lessons.length > 0);
      return {
        ...courseProp,
        modules: hasModules ? courseProp.modules : getInitialModulesForCourse(courseProp.id, courseProp.title)
      };
    }
    const found = enrolledCourses.find(c => c.id === courseId) || courses.find(c => c.id === courseId);
    if (found) {
      const hasModules = found.modules && found.modules.length > 0 && found.modules.some(m => m.lessons && m.lessons.length > 0);
      return {
        ...found,
        modules: hasModules ? found.modules : getInitialModulesForCourse(found.id, found.title)
      };
    }
    return {
      id: courseId || 'course-default',
      title: 'Course Masterclass',
      subtitle: 'Complete Curriculum & Practical Modules',
      description: 'Fully unlocked learning path and lessons for this course.',
      instructor: 'Expert Instructor',
      instructorTitle: 'Lead Educator',
      instructorAvatar: '',
      category: 'Development',
      level: 'All Levels',
      price: 0,
      originalPrice: 0,
      rating: 5.0,
      reviewCount: 120,
      learnersEnrolled: 1540,
      image: '',
      thumbnail: '',
      duration: '4 hours',
      modules: getInitialModulesForCourse(courseId || 'course-default', 'Course Masterclass'),
      updatedAt: new Date().toISOString()
    } as Course;
  });

  // Load course details
  useEffect(() => {
    async function initCourse() {
      if (!courseId) return;
      const foundCourse = enrolledCourses.find(c => c.id === courseId) || courses.find(c => c.id === courseId);
      if (foundCourse) {
        setLocalCourse(prev => {
          const hasValidLessons = foundCourse.modules && foundCourse.modules.length > 0 && foundCourse.modules.some(m => m.lessons && m.lessons.length > 0);
          const currentModules = hasValidLessons 
            ? foundCourse.modules 
            : (prev?.modules && prev.modules.length > 0 && prev.modules.some(m => m.lessons && m.lessons.length > 0)
                ? prev.modules 
                : getInitialModulesForCourse(foundCourse.id, foundCourse.title));
          return {
            ...foundCourse,
            modules: currentModules
          };
        });
      } else {
        try {
          const allCoursesRes = await fetchCoursesApi();
          const allCourses = Array.isArray(allCoursesRes) ? allCoursesRes : [];
          const match = allCourses.find((c: any) => c.id === courseId);
          if (match) {
            setLocalCourse(prev => {
              const hasValidLessons = match.modules && match.modules.length > 0 && match.modules.some(m => m.lessons && m.lessons.length > 0);
              const currentModules = hasValidLessons 
                ? match.modules 
                : (prev?.modules && prev.modules.length > 0 && prev.modules.some(m => m.lessons && m.lessons.length > 0)
                    ? prev.modules 
                    : getInitialModulesForCourse(match.id, match.title));
              return {
                ...match,
                modules: currentModules
              };
            });
          }
        } catch {
          // ignore
        }
      }
    }
    initCourse();
  }, [courseId, enrolledCourses, courses]);

  // Real learners, rating, and review count state mirroring backend API
  const [realLearnersCount, setRealLearnersCount] = useState<number | null>(null);
  const [realRating, setRealRating] = useState<number | null>(null);
  const [realReviewCount, setRealReviewCount] = useState<number | null>(null);

  // Fetch full modules/lessons, intended learners, learners count, and reviews in parallel matching CourseDetailPage
  useEffect(() => {
    let isMounted = true;
    async function loadFullCourse() {
      if (!courseId) return;
      try {
        await Promise.allSettled([
          fetchCourseModulesApi(courseId).then(res => {
            if (!isMounted) return;
            const modulesData = Array.isArray(res) ? res : (res && Array.isArray((res as any).data) ? (res as any).data : null);
            if (modulesData && modulesData.length > 0) {
              setLocalCourse(prev => {
                if (!prev) return prev;
                return normalizeCourse({ ...prev, modules: modulesData });
              });
              setCourses(prev => {
                const exists = prev.some(c => c.id === courseId);
                if (exists) {
                  return prev.map(c => c.id === courseId ? { ...c, modules: modulesData } : c);
                }
                return prev;
              });
            }
          }),
          getIntendedLearnersApi(courseId).then(res => {
            if (!isMounted) return;
            const data = (res && res.data) ? res.data : null;
            if (data) {
              const objectives = data.learning_objectives || data.learningObjectives || [];
              const reqs = data.requirements || [];
              if ((Array.isArray(objectives) && objectives.length > 0) || (Array.isArray(reqs) && reqs.length > 0)) {
                setLocalCourse(prev => {
                  if (!prev) return prev;
                  return { 
                    ...prev, 
                    learningObjectives: Array.isArray(objectives) && objectives.length > 0 ? objectives : prev.learningObjectives, 
                    requirements: Array.isArray(reqs) && reqs.length > 0 ? reqs : prev.requirements,
                    whatYouWillLearn: Array.isArray(objectives) && objectives.length > 0 ? objectives : (prev.whatYouWillLearn || objectives)
                  };
                });
                setCourses(prev => prev.map(c => c.id === courseId ? { 
                  ...c, 
                  learningObjectives: Array.isArray(objectives) && objectives.length > 0 ? objectives : c.learningObjectives, 
                  requirements: Array.isArray(reqs) && reqs.length > 0 ? reqs : c.requirements,
                  whatYouWillLearn: Array.isArray(objectives) && objectives.length > 0 ? objectives : (c.whatYouWillLearn || objectives)
                } : c));
              }
            }
          }),
          getCourseLearnersApi(courseId).then(res => {
            if (!isMounted) return;
            const count = typeof res?.data?.learners === 'number' 
              ? res.data.learners 
              : typeof res?.learners === 'number' 
              ? res.learners 
              : typeof res?.count === 'number' 
              ? res.count 
              : null;
            if (count !== null) {
              setRealLearnersCount(count);
              setLocalCourse(prev => {
                if (!prev) return prev;
                return { ...prev, learnersEnrolled: count, learners_enrolled: count, students_enrolled: count } as any;
              });
              setCourses(prev => prev.map(c => c.id === courseId ? { 
                ...c, 
                learnersEnrolled: count, 
                learners_enrolled: count, 
                students_enrolled: count 
              } : c));
            }
          }),
          getCourseRatingsApi(courseId).then(res => {
            if (!isMounted) return;
            const ratingList = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
            if (ratingList.length > 0) {
              const sum = ratingList.reduce((acc: number, curr: any) => acc + (Number(curr.rating) || 0), 0);
              const avg = Number((sum / ratingList.length).toFixed(1));
              const count = ratingList.length;
              setRealRating(avg);
              setRealReviewCount(count);
              setLocalCourse(prev => prev ? ({ ...prev, rating: avg, reviewCount: count }) : prev);
              setCourses(prev => prev.map(c => c.id === courseId ? { ...c, rating: avg, reviewCount: count } : c));
            } else {
              setRealReviewCount(0);
            }
          })
        ]);
      } catch (err) {
        console.error("Failed to load full course learning data", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadFullCourse();
    return () => { isMounted = false; };
  }, [courseId, setCourses]);

  const effectiveModules: Module[] = useMemo(() => {
    if (course?.modules && course.modules.length > 0 && course.modules.some(m => m.lessons && m.lessons.length > 0)) {
      return course.modules;
    }
    return getInitialModulesForCourse(courseId || 'course-default', course?.title || 'Course Masterclass');
  }, [course?.modules, courseId, course?.title]);

  const allLessons: Lesson[] = useMemo(() => {
    return effectiveModules.flatMap(m => m.lessons) || [];
  }, [effectiveModules]);

  // Player & UI States
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') as 'overview' | 'qna' | 'notes' | 'announcements' | 'reviews' | 'tools' | 'curriculum';
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [completedLessons, setCompletedLessons] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'overview' | 'qna' | 'notes' | 'announcements' | 'reviews' | 'tools' | 'curriculum'>(
    initialTab && ['overview', 'qna', 'notes', 'announcements', 'reviews', 'tools', 'curriculum'].includes(initialTab) ? initialTab : 'overview'
  );

  useEffect(() => {
    const t = searchParams.get('tab') as 'overview' | 'qna' | 'notes' | 'announcements' | 'reviews' | 'tools' | 'curriculum';
    if (t && ['overview', 'qna', 'notes', 'announcements', 'reviews', 'tools', 'curriculum'].includes(t)) {
      setActiveTab(t);
    }
  }, [searchParams]);
  const [isTheaterMode, setIsTheaterMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('uqlearn_theater_mode') === 'true';
    } catch {
      return false;
    }
  });
  const [isMobileCurriculumOpen, setIsMobileCurriculumOpen] = useState(false);
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  
  // Video playback
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [currentVideoTime, setCurrentVideoTime] = useState<number>(0);
  const [autoplayNext, setAutoplayNext] = useState<boolean>(() => {
    try {
      return localStorage.getItem('uqlearn_autoplay_next') !== 'false';
    } catch {
      return true;
    }
  });

  // Watch progress & resume
  const [watchProgress, setWatchProgress] = useState<Record<string, { currentTime: number; duration: number; percentage: number }>>(() => {
    try {
      const saved = localStorage.getItem(`uqlearn_watch_progress_${courseId}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [showResumeBanner, setShowResumeBanner] = useState<boolean>(false);
  const [resumeTime, setResumeTime] = useState<number>(0);

  // Load progress from backend on mount
  useEffect(() => {
    async function loadProgress() {
      if (!courseId || !userId) return;
      const prog = await studentProgressService.getStudentProgress(userId, courseId);
      if (prog && prog.completedLessonIds) {
        const completedMap: Record<string, boolean> = {};
        prog.completedLessonIds.forEach(id => {
          completedMap[id] = true;
        });
        setCompletedLessons(completedMap);
      } else if (allLessons.length > 0) {
        const completed: Record<string, boolean> = {};
        allLessons.forEach(l => {
          if (l.isCompleted) completed[l.id] = true;
        });
        setCompletedLessons(completed);
      }
    }
    loadProgress();
  }, [courseId, userId, allLessons.length]);

  // Load watch progress from MySQL database
  useEffect(() => {
    async function loadDbProgress() {
      if (!courseId) return;
      const progressMap = await progressTrackingService.getCourseProgress(userId, courseId);
      if (Object.keys(progressMap).length > 0) {
        const converted: Record<string, { currentTime: number; duration: number; percentage: number }> = {};
        for (const [lesId, rec] of Object.entries(progressMap)) {
          converted[lesId] = {
            currentTime: rec.current_time,
            duration: rec.duration,
            percentage: rec.percentage
          };
        }
        setWatchProgress(prev => ({ ...prev, ...converted }));
      }
    }
    loadDbProgress();
  }, [courseId, userId]);

  // Check for saved stop time when current lesson changes
  const currentLesson = allLessons[currentLessonIndex] || allLessons[0];

  useEffect(() => {
    if (currentLesson && watchProgress[currentLesson.id]) {
      const saved = watchProgress[currentLesson.id];
      if (saved.currentTime > 5 && saved.currentTime < saved.duration - 10) {
        setResumeTime(saved.currentTime);
        setShowResumeBanner(true);
      } else {
        setShowResumeBanner(false);
      }
    } else {
      setShowResumeBanner(false);
    }
  }, [currentLessonIndex, currentLesson?.id]);

  // Apply playback speed to video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, currentLessonIndex]);

  // Toggle theater mode
  const handleToggleTheaterMode = () => {
    setIsTheaterMode(prev => {
      const next = !prev;
      try {
        localStorage.setItem('uqlearn_theater_mode', String(next));
      } catch {}
      return next;
    });
  };

  // Toggle autoplay
  const handleToggleAutoplay = () => {
    setAutoplayNext(prev => {
      const next = !prev;
      try {
        localStorage.setItem('uqlearn_autoplay_next', String(next));
      } catch {}
      return next;
    });
  };

  // Video time update handler
  const handleTimeUpdate = () => {
    if (!videoRef.current || !currentLesson) return;
    const cur = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 1;
    setCurrentVideoTime(cur);

    const pct = Math.min(100, Math.round((cur / dur) * 100));

    const updated = {
      ...watchProgress,
      [currentLesson.id]: { currentTime: cur, duration: dur, percentage: pct }
    };
    setWatchProgress(updated);

    try {
      localStorage.setItem(`uqlearn_watch_progress_${courseId}`, JSON.stringify(updated));
    } catch {}

    // Throttled sync with MySQL database via progress-tracking-service
    if (Math.floor(cur) % 5 === 0) {
      progressTrackingService.saveProgress({
        userId,
        lessonId: currentLesson.id,
        courseId,
        currentTime: cur,
        duration: dur,
        percentage: pct
      });
    }
  };

  const handleVideoPause = () => {
    if (!videoRef.current || !currentLesson) return;
    progressTrackingService.saveProgress({
      userId,
      lessonId: currentLesson.id,
      courseId,
      currentTime: videoRef.current.currentTime,
      duration: videoRef.current.duration || 1,
      percentage: Math.min(100, Math.round((videoRef.current.currentTime / (videoRef.current.duration || 1)) * 100))
    });
  };

  const handleResumePlayback = () => {
    if (videoRef.current && resumeTime > 0) {
      videoRef.current.currentTime = resumeTime;
      videoRef.current.play();
    }
    setShowResumeBanner(false);
  };

  const handleSeekToTime = (timeSeconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timeSeconds;
      videoRef.current.play();
      // Scroll to video smoothly on mobile
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Completion calculation
  const completedCount = useMemo(() => {
    return Object.values(completedLessons).filter(Boolean).length;
  }, [completedLessons]);

  const progressPercentage = allLessons.length > 0 
    ? Math.round((completedCount / allLessons.length) * 100)
    : 0;

  useEffect(() => {
    if (progressPercentage >= 100 && allLessons.length > 0 && course && userId) {
      markCourseCompletedApi(userId, course.id, course.title, course.instructor || 'Sir Rajab Wamuu', userName);
    }
  }, [progressPercentage, allLessons.length, course?.id]);

  const toggleLessonComplete = useCallback((lessonId: string) => {
    setCompletedLessons(prev => {
      const updated = {
        ...prev,
        [lessonId]: !prev[lessonId]
      };
      
      const completedArray = Object.keys(updated).filter(k => updated[k]);
      if (courseId && userId) {
        studentProgressService.saveStudentProgress({
          studentId: userId,
          courseId,
          completedLessonIds: completedArray,
          lastLessonId: lessonId,
          totalLessonsCount: allLessons.length || 1
        });
      }

      return updated;
    });
  }, [courseId, userId, allLessons.length]);

  // Next & Previous Navigation
  const hasPrevLesson = currentLessonIndex > 0;
  const hasNextLesson = currentLessonIndex < allLessons.length - 1;
  const prevLesson = hasPrevLesson ? allLessons[currentLessonIndex - 1] : undefined;
  const nextLesson = hasNextLesson ? allLessons[currentLessonIndex + 1] : undefined;

  const handlePrevLesson = () => {
    if (hasPrevLesson) {
      setCurrentLessonIndex(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextLesson = () => {
    if (hasNextLesson) {
      // If not yet marked complete, auto-mark complete as student moves forward
      if (currentLesson && !completedLessons[currentLesson.id]) {
        toggleLessonComplete(currentLesson.id);
      }
      setCurrentLessonIndex(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Last lesson reached: complete and trigger rating stars modal
      if (currentLesson && !completedLessons[currentLesson.id]) {
        toggleLessonComplete(currentLesson.id);
      }
      setIsRatingModalOpen(true);
    }
  };

  // Auto-advance when video ends
  const handleVideoEnded = () => {
    if (currentLesson && !completedLessons[currentLesson.id]) {
      toggleLessonComplete(currentLesson.id);
    }
    if (!hasNextLesson) {
      setIsRatingModalOpen(true);
    }
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInput = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' || 
        activeElement.getAttribute('contenteditable') === 'true'
      );
      if (isInput) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (videoRef.current) {
          if (videoRef.current.paused) videoRef.current.play();
          else videoRef.current.pause();
        }
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (videoRef.current) {
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
        }
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (videoRef.current) {
          videoRef.current.currentTime = Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + 5);
        }
      } else if (e.key === 'n' || e.key === 'N') {
        if (hasNextLesson) handleNextLesson();
      } else if (e.key === 'p' || e.key === 'P') {
        if (hasPrevLesson) handlePrevLesson();
      } else if (e.key === 'm' || e.key === 'M') {
        if (videoRef.current) {
          videoRef.current.muted = !videoRef.current.muted;
        }
      } else if (e.key === 'f' || e.key === 'F') {
        if (videoRef.current) {
          if (document.fullscreenElement) document.exitFullscreen();
          else videoRef.current.requestFullscreen();
        }
      } else if (e.key === 'c' || e.key === 'C') {
        handleToggleTheaterMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasNextLesson, hasPrevLesson, currentLessonIndex]);

  // Loading state with animated skeleton
  if (isLoading || allLessons.length === 0 || !course) {
    return <LearningPlayerSkeleton />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#141517] text-slate-900 dark:text-slate-100 flex flex-col antialiased selection:bg-purple-500 selection:text-white transition-colors">
      {/* Top Header */}
      <LearningHeader
        course={course}
        currentLessonTitle={currentLesson?.title}
        currentLessonIndex={currentLessonIndex}
        totalLessons={allLessons.length}
        progressPercentage={progressPercentage}
        completedCount={completedCount}
        isTheaterMode={isTheaterMode}
        onToggleTheaterMode={handleToggleTheaterMode}
        onOpenMobileCurriculum={() => setIsMobileCurriculumOpen(true)}
        onOpenRating={() => setIsRatingModalOpen(true)}
        onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
      />

      {/* Main Container: allows natural page scroll while sticky sidebar stays pinned */}
      <div className="flex-1 flex flex-col lg:flex-row items-start w-full relative bg-white dark:bg-[#141517]">
        {/* Main Content Area (Video Player, Nav, & Tab Content) */}
        <div className={`flex-1 min-w-0 w-full transition-all duration-300 bg-white dark:bg-[#141517] ${
          isTheaterMode ? 'w-full' : ''
        }`}>
          {/* Main Video & Content Column - Flush against right sidebar with ZERO outer padding */}
          <div className="w-full flex flex-col">
            {/* Video Player on dark backdrop matching Udemy */}
            <div className="w-full bg-black flex justify-center items-center">
              <div className="w-full">
                <LearningVideoPlayer
                  currentLesson={currentLesson}
                  course={course}
                  videoRef={videoRef}
                  playbackSpeed={playbackSpeed}
                  onSpeedChange={setPlaybackSpeed}
                  showResumeBanner={showResumeBanner}
                  resumeTime={resumeTime}
                  onResumePlayback={handleResumePlayback}
                  onDismissResume={() => setShowResumeBanner(false)}
                  onTimeUpdate={handleTimeUpdate}
                  onVideoPause={handleVideoPause}
                  onVideoEnded={handleVideoEnded}
                  autoplayNext={autoplayNext}
                  onPlayNextLesson={handleNextLesson}
                  nextLessonTitle={nextLesson?.title}
                />
              </div>
            </div>

            {/* Lesson Navigation Bar (Prev / Complete / Next) */}
            <div className="px-4 sm:px-6 md:px-8 lg:px-10 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1c1d1f]">
              <LearningLessonNav
                currentLesson={currentLesson}
                currentLessonIndex={currentLessonIndex}
                totalLessons={allLessons.length}
                isCompleted={Boolean(completedLessons[currentLesson.id])}
                onToggleComplete={() => toggleLessonComplete(currentLesson.id)}
                onPrevLesson={handlePrevLesson}
                onNextLesson={handleNextLesson}
                hasPrevLesson={hasPrevLesson}
                hasNextLesson={hasNextLesson}
                prevLessonTitle={prevLesson?.title}
                nextLessonTitle={nextLesson?.title}
                autoplayNext={autoplayNext}
                onToggleAutoplay={handleToggleAutoplay}
                isAllCompleted={progressPercentage >= 100}
              />
            </div>

            {/* Tab Navigation Bar matching Udemy learning interface (Sharp UI) */}
            <div className="px-4 sm:px-6 md:px-8 lg:px-10 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1c1d1f] pt-2">
              <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide text-xs sm:text-sm select-none">
                {/* Search Icon Affordance */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('overview');
                  }}
                  className="pb-3 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer shrink-0 pt-0.5"
                  title="Search course materials"
                >
                  <Search className="w-4 h-4" />
                </button>

                {/* Tab: Overview */}
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className={`pb-3 whitespace-nowrap transition-colors cursor-pointer border-b-2 ${
                    activeTab === 'overview'
                      ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white font-bold -mb-px'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold'
                  }`}
                >
                  Overview
                </button>

                {/* Tab: Q&A */}
                <button
                  type="button"
                  onClick={() => setActiveTab('qna')}
                  className={`pb-3 whitespace-nowrap transition-colors cursor-pointer border-b-2 ${
                    activeTab === 'qna'
                      ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white font-bold -mb-px'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold'
                  }`}
                >
                  Q&A
                </button>

                {/* Tab: Notes */}
                <button
                  type="button"
                  onClick={() => setActiveTab('notes')}
                  className={`pb-3 whitespace-nowrap transition-colors cursor-pointer border-b-2 ${
                    activeTab === 'notes'
                      ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white font-bold -mb-px'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold'
                  }`}
                >
                  Notes
                </button>

                {/* Tab: Announcements */}
                <button
                  type="button"
                  onClick={() => setActiveTab('announcements')}
                  className={`pb-3 whitespace-nowrap transition-colors cursor-pointer border-b-2 ${
                    activeTab === 'announcements'
                      ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white font-bold -mb-px'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold'
                  }`}
                >
                  Announcements
                </button>

                {/* Tab: Reviews */}
                <button
                  type="button"
                  onClick={() => setActiveTab('reviews')}
                  className={`pb-3 whitespace-nowrap transition-colors cursor-pointer border-b-2 ${
                    activeTab === 'reviews'
                      ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white font-bold -mb-px'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold'
                  }`}
                >
                  Reviews
                </button>

                {/* Tab: Learning tools */}
                <button
                  type="button"
                  onClick={() => setActiveTab('tools')}
                  className={`pb-3 whitespace-nowrap transition-colors cursor-pointer border-b-2 ${
                    activeTab === 'tools'
                      ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white font-bold -mb-px'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold'
                  }`}
                >
                  Learning tools
                </button>

                {/* Mobile Course Content Tab */}
                <button
                  type="button"
                  onClick={() => setActiveTab('curriculum')}
                  className={`lg:hidden pb-3 whitespace-nowrap transition-colors cursor-pointer border-b-2 ${
                    activeTab === 'curriculum'
                      ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white font-bold -mb-px'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold'
                  }`}
                >
                  Course content ({completedCount}/{allLessons.length})
                </button>
              </div>

              {/* Tab Contents (Zero outer margin against right sidebar) */}
              <div className="px-4 sm:px-6 md:px-8 lg:px-10 py-8 max-w-5xl">
                {activeTab === 'overview' && (
                  <LearningOverviewTab
                    currentLesson={currentLesson}
                    course={course}
                    lessonIndex={currentLessonIndex}
                    realLearnersCount={realLearnersCount}
                    realRating={realRating}
                    realReviewCount={realReviewCount}
                    modules={effectiveModules}
                    watchProgress={watchProgress}
                  />
                )}

                {activeTab === 'qna' && (
                  <LearningQnATab
                    course={course}
                    currentLesson={currentLesson}
                    userName={userName}
                  />
                )}

                {activeTab === 'notes' && (
                  <LearningNotesTab
                    courseId={course.id}
                    courseTitle={course.title}
                    currentLesson={currentLesson}
                    currentVideoTime={currentVideoTime}
                    onSeekToTime={handleSeekToTime}
                  />
                )}

                {activeTab === 'announcements' && (
                  <LearningAnnouncementsTab
                    course={course}
                  />
                )}

                {activeTab === 'reviews' && (
                  <LearningReviewsTab
                    course={course}
                    onOpenRating={() => setIsRatingModalOpen(true)}
                  />
                )}

                {activeTab === 'tools' && (
                  <LearningToolsTab
                    course={course}
                    onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
                  />
                )}

                {activeTab === 'curriculum' && (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none overflow-hidden shadow-none">
                    <LearningCurriculum
                      modules={effectiveModules}
                      allLessons={allLessons}
                      currentLessonIndex={currentLessonIndex}
                      completedLessons={completedLessons}
                      watchProgress={watchProgress}
                      onSelectLesson={(idx) => {
                        setCurrentLessonIndex(idx);
                        setActiveTab('overview');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      onToggleLessonComplete={toggleLessonComplete}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Curriculum Sidebar (Flush-joined to header with top-14, zero padding, sticky and independently scrollable) */}
        {!isTheaterMode && (
          <aside className="hidden lg:flex w-80 xl:w-96 shrink-0 h-[calc(100vh-3.5rem)] sticky top-14 bg-white dark:bg-[#141517] border-l border-slate-200 dark:border-slate-800 z-20 flex-col overflow-hidden p-0 m-0">
            <LearningCurriculum
              modules={effectiveModules}
              allLessons={allLessons}
              currentLessonIndex={currentLessonIndex}
              completedLessons={completedLessons}
              watchProgress={watchProgress}
              onSelectLesson={(idx) => {
                setCurrentLessonIndex(idx);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onToggleLessonComplete={toggleLessonComplete}
              onClose={handleToggleTheaterMode}
            />
          </aside>
        )}

        {/* Quick Re-open button for Course content when Theater Mode is active */}
        {isTheaterMode && (
          <button
            type="button"
            onClick={handleToggleTheaterMode}
            className="hidden lg:flex fixed right-0 top-16 z-30 bg-[#1c1d1f] hover:bg-slate-800 text-white text-xs font-semibold px-3 py-2 border-l border-t border-b border-slate-700 shadow-xl items-center gap-1.5 cursor-pointer rounded-none transition-all"
            title="Show Course content"
          >
            <SidebarOpen className="w-4 h-4 text-[#a435f0]" />
            <span>Course content</span>
          </button>
        )}
      </div>

      {/* Mobile Slide-Over Curriculum Drawer */}
      <LearningCurriculum
        modules={effectiveModules}
        allLessons={allLessons}
        currentLessonIndex={currentLessonIndex}
        completedLessons={completedLessons}
        watchProgress={watchProgress}
        onSelectLesson={(idx) => {
          setCurrentLessonIndex(idx);
          setIsMobileCurriculumOpen(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onToggleLessonComplete={toggleLessonComplete}
        isMobileDrawer={true}
        isOpenMobile={isMobileCurriculumOpen}
        onCloseMobile={() => setIsMobileCurriculumOpen(false)}
      />

      {/* Course Rating Stars Modal on Course Completion */}
      {course && (
        <CourseRatingModal
          isOpen={isRatingModalOpen}
          onClose={() => {
            setIsRatingModalOpen(false);
          }}
          onSuccessNext={() => {
            setIsRatingModalOpen(false);
          }}
          course={course}
          studentId={userId}
          studentName={userName}
        />
      )}

      {/* Certificate Modal */}
      <LearningCertificateModal
        isOpen={isCertificateModalOpen}
        onClose={() => setIsCertificateModalOpen(false)}
        course={course}
        studentName={userName}
        progressPercentage={progressPercentage}
        completedCount={completedCount}
        totalLessons={allLessons.length}
      />

      {/* Keyboard Shortcuts Modal */}
      <LearningShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
};
