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
  Share2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Lesson, Module, Course } from '../../types';
import { fetchCourseModulesApi, normalizeCourse, fetchCoursesApi } from '../../lib/apiConfig';
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

export const LearningPlayer: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { courses, enrolledCourses, setCourses, currentUser, darkMode, toggleDarkMode } = useApp();
  const userId = currentUser?.id || 'guest_learner';
  const userName = currentUser?.name || 'Learner';

  // State: Local course object
  const [course, setLocalCourse] = useState<Course | undefined>(() => {
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

  // Fetch full modules/lessons if missing
  useEffect(() => {
    async function loadFullCourse() {
      if (!courseId) return;
      try {
        const modulesData = await fetchCourseModulesApi(courseId);
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
      } catch (err) {
        console.error("Failed to fetch modules", err);
      }
    }
    loadFullCourse();
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
  const initialTab = searchParams.get('tab') as 'overview' | 'curriculum' | 'notes' | 'qna' | 'resources';
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [completedLessons, setCompletedLessons] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'overview' | 'curriculum' | 'notes' | 'qna' | 'resources'>(
    initialTab && ['overview', 'curriculum', 'notes', 'qna', 'resources'].includes(initialTab) ? initialTab : 'overview'
  );

  useEffect(() => {
    const t = searchParams.get('tab') as 'overview' | 'curriculum' | 'notes' | 'qna' | 'resources';
    if (t && ['overview', 'curriculum', 'notes', 'qna', 'resources'].includes(t)) {
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

  // Loading state
  if (allLessons.length === 0 || !course) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col items-center justify-center p-6 text-center space-y-4 transition-colors">
        <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400">
          <RefreshCw className="w-6 h-6 animate-spin" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Loading Course Materials</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Setting up the interactive player environment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased selection:bg-teal-500 selection:text-white transition-colors">
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
        onOpenCertificate={() => {
          const hasAlreadyRated = Boolean(localStorage.getItem(`uqlearn_course_rating_${course?.id}`));
          if (!hasAlreadyRated && progressPercentage >= 100) {
            setIsRatingModalOpen(true);
          } else {
            setIsCertificateModalOpen(true);
          }
        }}
        onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Main Content Area (Video Player, Nav, & Tab Content) */}
        <div className={`flex-1 flex flex-col overflow-y-auto transition-all duration-300 ${
          isTheaterMode ? 'w-full' : ''
        }`}>
          {/* Video Section Container */}
          <div className="w-full max-w-6xl mx-auto p-0 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
            {/* Video Player */}
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

            {/* Lesson Navigation Bar (Prev / Complete / Next) */}
            <div className="px-3 sm:px-0">
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
                onClaimCertificate={() => setIsRatingModalOpen(true)}
                isAllCompleted={progressPercentage >= 100}
              />
            </div>

            {/* Segmented Tabs Bar (Overview, Curriculum for mobile, Notes, Q&A, Resources) */}
            <div className="px-3 sm:px-0">
              <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 rounded-2xl overflow-x-auto scrollbar-hide select-none shadow-xs transition-colors">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                    activeTab === 'overview'
                      ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Overview</span>
                </button>

                {/* Mobile Curriculum Tab (Shown prominently on mobile/tablet) */}
                <button
                  type="button"
                  onClick={() => setActiveTab('curriculum')}
                  className={`lg:hidden px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                    activeTab === 'curriculum'
                      ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                  <span>Curriculum</span>
                  <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] rounded-md font-mono font-bold">
                    {completedCount}/{allLessons.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('notes')}
                  className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                    activeTab === 'notes'
                      ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Notes</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('qna')}
                  className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                    activeTab === 'qna'
                      ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Q&A</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('resources')}
                  className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                    activeTab === 'resources'
                      ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <FolderDown className="w-3.5 h-3.5" />
                  <span>Resources</span>
                </button>
              </div>

              {/* Tab Contents */}
              <div className="pt-4 sm:pt-6 pb-16">
                {activeTab === 'overview' && (
                  <LearningOverviewTab
                    currentLesson={currentLesson}
                    course={course}
                    lessonIndex={currentLessonIndex}
                  />
                )}

                {activeTab === 'curriculum' && (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
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

                {activeTab === 'notes' && (
                  <LearningNotesTab
                    courseId={course.id}
                    courseTitle={course.title}
                    currentLesson={currentLesson}
                    currentVideoTime={currentVideoTime}
                    onSeekToTime={handleSeekToTime}
                  />
                )}

                {activeTab === 'qna' && (
                  <LearningQnATab
                    course={course}
                    currentLesson={currentLesson}
                    userName={userName}
                  />
                )}

                {activeTab === 'resources' && (
                  <LearningResourcesTab
                    course={course}
                    currentLesson={currentLesson}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Curriculum Sidebar (Hidden in Theater Mode or Mobile) */}
        {!isTheaterMode && (
          <aside className="hidden lg:flex w-80 xl:w-96 shrink-0 h-[calc(100vh-61px)] sticky top-[61px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 z-20 transition-colors">
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
            />
          </aside>
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
            setIsCertificateModalOpen(true);
          }}
          onSuccessNext={() => {
            setIsRatingModalOpen(false);
            setIsCertificateModalOpen(true);
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
