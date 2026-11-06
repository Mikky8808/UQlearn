import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  HelpCircle, 
  CheckCircle2, 
  ChevronRight, 
  RotateCcw, 
  Award, 
  Clock, 
  Users, 
  Star, 
  Check, 
  Sparkles, 
  Play, 
  ChevronDown, 
  X 
} from 'lucide-react';
import { Lesson, Course, Module } from '../../../types';
import { getCourseLearnersApi, getCourseRatingsApi } from '../../../lib/apiConfig';
import { resolveImageUrl } from '../../../lib/branding';
import { useApp } from '../../../context/AppContext';

interface LearningOverviewTabProps {
  currentLesson: Lesson;
  course: Course;
  lessonIndex: number;
  realLearnersCount?: number | null;
  realRating?: number | null;
  realReviewCount?: number | null;
  modules?: Module[];
  watchProgress?: Record<string, { currentTime: number; duration: number; percentage: number }>;
}

export const LearningOverviewTab: React.FC<LearningOverviewTabProps> = ({
  currentLesson,
  course,
  lessonIndex,
  realLearnersCount,
  realRating,
  realReviewCount,
  modules,
  watchProgress
}) => {
  const { courses } = useApp();
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [isScheduleDismissed, setIsScheduleDismissed] = useState(() => {
    try {
      return localStorage.getItem(`uqlearn_dismiss_scheduler_${course?.id}`) === 'true';
    } catch {
      return false;
    }
  });
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Wed', 'Fri']);
  const [studyTime, setStudyTime] = useState('19:00');
  const [schedulerSaved, setSchedulerSaved] = useState(false);

  // Dynamic Learners Count with live API synchronization (matching CourseDetailPage)
  const initialLearners = Number(
    course?.learnersEnrolled || 
    (course as any)?.learners_enrolled || 
    (course as any)?.students_enrolled || 
    (course as any)?.learnersCount || 
    (course as any)?.students || 
    166117
  );
  const [internalLearnersCount, setInternalLearnersCount] = useState<number>(initialLearners > 0 ? initialLearners : 166117);

  useEffect(() => {
    let isMounted = true;
    if (course?.id && (realLearnersCount === undefined || realLearnersCount === null)) {
      getCourseLearnersApi(course.id).then(res => {
        if (!isMounted) return;
        const count = typeof res?.data?.learners === 'number' 
          ? res.data.learners 
          : typeof res?.learners === 'number' 
          ? res.learners 
          : typeof res?.count === 'number' 
          ? res.count 
          : null;
        if (count !== null && count > 0) {
          setInternalLearnersCount(count);
        }
      }).catch(() => {});
    }
    return () => { isMounted = false; };
  }, [course?.id, realLearnersCount]);

  const effectiveLearnersCount = useMemo(() => {
    if (realLearnersCount !== null && realLearnersCount !== undefined && realLearnersCount > 0) {
      return realLearnersCount;
    }
    return internalLearnersCount;
  }, [realLearnersCount, internalLearnersCount]);

  const resetQuiz = () => {
    setSelectedQuizAnswer(null);
    setQuizSubmitted(false);
  };

  const handleDismissScheduler = () => {
    setIsScheduleDismissed(true);
    try {
      localStorage.setItem(`uqlearn_dismiss_scheduler_${course?.id}`, 'true');
    } catch {}
  };

  const handleSaveScheduler = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem(`uqlearn_study_schedule_${course?.id}`, JSON.stringify({
        days: selectedDays,
        time: studyTime
      }));
    } catch {}
    setSchedulerSaved(true);
    setTimeout(() => {
      setSchedulerSaved(false);
      setShowScheduleForm(false);
    }, 2000);
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const learningOutcomes = course?.whatYouWillLearn || course?.learningOutcomes || course?.learningObjectives || [
    'Gain hands-on practical competence and best practices',
    'Understand production-grade architectural patterns and workflows',
    'Build and deploy portfolio-ready projects independently',
    'Master troubleshooting and performance optimization'
  ];

  // Dynamic Ratings & Review Count with live API synchronization from course-ratings.php
  const [internalRating, setInternalRating] = useState<number | null>(null);
  const [internalReviewCount, setInternalReviewCount] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (course?.id && (realRating === undefined || realRating === null)) {
      getCourseRatingsApi(course.id).then(res => {
        if (!isMounted) return;
        const ratingList = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        if (ratingList.length > 0) {
          const sum = ratingList.reduce((acc: number, curr: any) => acc + (Number(curr.rating) || 0), 0);
          const avg = Number((sum / ratingList.length).toFixed(1));
          setInternalRating(avg);
          setInternalReviewCount(ratingList.length);
        } else {
          setInternalReviewCount(0);
        }
      }).catch(() => {});
    }
    return () => { isMounted = false; };
  }, [course?.id, realRating]);

  const rating = useMemo(() => {
    if (typeof realRating === 'number' && !isNaN(realRating)) return realRating;
    if (typeof internalRating === 'number' && !isNaN(internalRating)) return internalRating;
    const fromCourse = Number(course?.rating || (course as any)?.course_rating);
    if (!isNaN(fromCourse) && fromCourse > 0) return fromCourse;
    return 0;
  }, [realRating, internalRating, course?.rating, (course as any)?.course_rating]);

  const reviewCount = useMemo(() => {
    if (typeof realReviewCount === 'number' && !isNaN(realReviewCount)) return realReviewCount;
    if (typeof internalReviewCount === 'number' && !isNaN(internalReviewCount)) return internalReviewCount;
    const fromCourse = Number(course?.reviewCount || (course as any)?.review_count || (course as any)?.reviews_count);
    if (!isNaN(fromCourse) && fromCourse >= 0) return fromCourse;
    return 0;
  }, [realReviewCount, internalReviewCount, course?.reviewCount, (course as any)?.review_count]);

  // Compute Total Duration dynamically from video lessons matching Course content
  const dynamicDuration = useMemo(() => {
    const targetModules = (modules && modules.length > 0) ? modules : (course?.modules || []);
    let totalMinutes = 0;
    let hasAnyVideo = false;

    targetModules.forEach(m => {
      (m.lessons || []).forEach(l => {
        const hasVideo = Boolean(
          l.videoUrl || 
          (l as any).video_url || 
          (l as any).videoPath || 
          (l as any).video_path || 
          String(l.type || '').toLowerCase() === 'video'
        );
        if (!hasVideo) return;
        hasAnyVideo = true;

        const progress = watchProgress?.[l.id];
        if (progress && progress.duration && progress.duration > 1) {
          totalMinutes += progress.duration / 60;
          return;
        }

        if (!l.duration) {
          totalMinutes += 10;
          return;
        }
        const dur = l.duration.toString().toLowerCase();
        if (dur.includes(':')) {
          const parts = dur.split(':');
          const mins = parseInt(parts[0], 10) || 0;
          const secs = parseInt(parts[1], 10) || 0;
          totalMinutes += mins + (secs / 60);
        } else if (dur.includes('hr') || dur.includes('h')) {
          const hoursMatch = dur.match(/(\d+(?:\.\d+)?)\s*h/);
          const minsMatch = dur.match(/(\d+(?:\.\d+)?)\s*m/);
          if (hoursMatch) totalMinutes += parseFloat(hoursMatch[1]) * 60;
          if (minsMatch) totalMinutes += parseFloat(minsMatch[1]);
          if (!hoursMatch && !minsMatch) totalMinutes += 10;
        } else {
          const digits = parseFloat(dur.replace(/[^0-9.]/g, ''));
          totalMinutes += (digits || 10);
        }
      });
    });

    if (totalMinutes > 0) {
      const roundedMins = Math.round(totalMinutes);
      if (roundedMins < 60) {
        return `${roundedMins} ${roundedMins === 1 ? 'min' : 'mins'}`;
      }
      const hours = Math.floor(roundedMins / 60);
      const mins = roundedMins % 60;
      if (hours > 0 && mins > 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${mins} mins`;
      if (hours > 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
      return `${mins} mins`;
    }

    if (course?.duration) {
      return course.duration;
    }

    return '0 mins';
  }, [modules, course?.modules, course?.duration, watchProgress]);

  // Compute dynamic last updated timestamp
  const formattedLastUpdated = useMemo(() => {
    const rawDate = course?.updatedAt || (course as any)?.updated_at || (course as any)?.created_at || (course as any)?.createdAt;
    if (rawDate) {
      try {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          const diffDays = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays < 30) return 'Recently';
          return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }
      } catch {}
    }
    return 'Recently';
  }, [course?.updatedAt, (course as any)?.updated_at, (course as any)?.created_at]);

  // Dynamic Instructor Information (matching CourseDetailPage)
  const instructorName = course?.instructor || (course as any)?.instructor_name || (course as any)?.instructorName || 'mike kenyanya';
  const instructorTitle = course?.instructorTitle || (course as any)?.instructor_title || '7-Figure Online Business Founder & Educator';
  const instructorFirstName = instructorName.split(' ')[0] || 'mike';

  // Dynamic Instructor Courses Count (matching CourseDetailPage filtering by instructor name or creator ID)
  const instructorCoursesCount = useMemo(() => {
    if (!courses || courses.length === 0) return 19;
    const currentInstructor = (course?.instructor || instructorName).toLowerCase().trim();
    const currentCreatedBy = course?.createdBy || (course as any)?.created_by;
    const count = courses.filter(c => {
      if (currentCreatedBy && (c.createdBy === currentCreatedBy || (c as any).created_by === currentCreatedBy)) return true;
      if (currentInstructor && (c.instructor || '').toLowerCase().trim() === currentInstructor) return true;
      return false;
    }).length;
    return count > 0 ? count : 19;
  }, [courses, course?.instructor, course?.createdBy, instructorName]);

  // Dynamic Instructor Biography with fallback to user-specified bio
  const defaultInstructorBio = `Hey, I'm ${instructorFirstName}!

I'm a full-stack software engineer with over eight years of experience building web and mobile applications, primarily in JavaScript, TypeScript, Python, and React. I've worked with startups and large teams, shipped production systems used by thousands of people, and mentored more than 150 junior developers along the way. My courses focus on practical, project-based learning, so every lesson ends with something you can actually build and use. I believe anyone can learn to code with the right structure, clear explanations, and enough patience. My goal is to help you move from confused to confident, one small win at a time.`;

  const rawBio = course?.instructorDescription || course?.instructorBio || (course as any)?.instructor_description || defaultInstructorBio;
  const bioParagraphs = rawBio.split(/\n\s*\n/).filter(Boolean);

  // Resolved Avatar image
  const resolvedInstructorAvatar = resolveImageUrl(
    course?.instructorAvatar || (course as any)?.instructor_avatar || (course as any)?.instructorImage, 
    'avatar'
  );

  // Headline
  const headline = course?.subtitle || course?.description?.split('\n')[0] || 
    'Quit your job, be your own boss & work from anywhere THIS YEAR — with zero online business experience required.';

  return (
    <div className="space-y-8 animate-fadeIn text-slate-900 dark:text-slate-100">
      
      {/* 1. Schedule learning time (Clean outline, no card background) */}
      {!isScheduleDismissed && (
        <div className="border border-slate-300 dark:border-slate-700 p-5 rounded-none space-y-4 bg-transparent">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-none bg-purple-50 dark:bg-purple-950/40 text-[#a435f0] flex items-center justify-center shrink-0 border border-purple-200 dark:border-purple-900">
              <Clock className="w-5 h-5 stroke-[2]" />
            </div>
            <div className="space-y-1.5 flex-1 min-w-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                Schedule learning time
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
                Learning a little each day adds up. Research shows that students who make learning a habit are more likely to reach their goals. Set time aside to learn and get reminders using your learning scheduler.
              </p>

              {/* Action Buttons: [Get started] [Dismiss] */}
              {!showScheduleForm ? (
                <div className="pt-2 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setShowScheduleForm(true)}
                    className="border-2 border-[#a435f0] text-[#a435f0] hover:bg-purple-50 dark:hover:bg-purple-950/30 text-xs sm:text-sm font-bold px-4 py-2 rounded-none transition-colors cursor-pointer"
                  >
                    Get started
                  </button>
                  <button
                    type="button"
                    onClick={handleDismissScheduler}
                    className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              ) : (
                /* Inline Schedule Planner Form */
                <form onSubmit={handleSaveScheduler} className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Select Learning Days & Time
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowScheduleForm(false)}
                      className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-3 py-1 text-xs font-bold rounded-none border transition-colors cursor-pointer ${
                          selectedDays.includes(day)
                            ? 'bg-[#a435f0] text-white border-[#a435f0]'
                            : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <input
                      type="time"
                      value={studyTime}
                      onChange={(e) => setStudyTime(e.target.value)}
                      className="px-3 py-1.5 bg-transparent border border-slate-300 dark:border-slate-700 rounded-none text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-[#a435f0]"
                    />
                    <button
                      type="submit"
                      className="bg-[#a435f0] hover:bg-[#8710d8] text-white text-xs font-bold px-4 py-2 rounded-none transition-colors cursor-pointer"
                    >
                      Save Reminder
                    </button>
                    {schedulerSaved && (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Saved!</span>
                      </span>
                    )}
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Course Headline & Inline Dynamic Metadata matching user specification */}
      <div className="space-y-3">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-snug">
          {headline}
        </h2>

        {/* Dynamic Metadata Row: Rating · Ratings Count · Students · Last updated */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
          <div className="flex items-center gap-1.5 font-bold text-amber-500">
            <span>{rating > 0 ? rating.toFixed(1) : (course?.rating ? Number(course.rating).toFixed(1) : '5.0')}</span>
            <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
            <span className="text-purple-600 dark:text-purple-400 underline font-normal">
              ({reviewCount.toLocaleString()} {reviewCount === 1 ? 'rating' : 'ratings'})
            </span>
          </div>
          <span>·</span>
          <span>{effectiveLearnersCount.toLocaleString()} students</span>
          <span>·</span>
          <span>Last updated {formattedLastUpdated}</span>
        </div>
      </div>

      {/* 3. Current Lecture Description (Clean unboxed typography) */}
      <div className="space-y-3 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
              Lecture {lessonIndex + 1}
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {currentLesson.title}
            </h3>
          </div>
        </div>

        {/* Content Body */}
        <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal pt-1">
          {currentLesson?.content ? (
            /<[a-z][\s\S]*>/i.test(currentLesson.content) ? (
              <div 
                className="space-y-3 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-slate-900 dark:[&_h1]:text-white [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-purple-600 dark:[&_h2]:text-purple-300 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-slate-900 dark:[&_h3]:text-white [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_code]:bg-slate-100 dark:[&_code]:bg-slate-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-purple-700 dark:[&_code]:text-purple-300 [&_pre]:bg-slate-100 dark:[&_pre]:bg-slate-800 [&_pre]:p-4 [&_pre]:rounded-none [&_pre]:overflow-x-auto [&_a]:text-purple-600 dark:[&_a]:text-purple-400 [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: currentLesson.content }} 
              />
            ) : (
              <div className="whitespace-pre-wrap leading-relaxed">
                {currentLesson.content}
              </div>
            )
          ) : (
            <p className="text-slate-500 dark:text-slate-400">
              In this lecture, you will master step-by-step methodologies, inspect concrete examples, analyze clean implementation patterns, and deepen your command over key topics.
            </p>
          )}
        </div>
      </div>

      {/* 4. Interactive Knowledge Check (Quiz) if attached */}
      {currentLesson?.quiz && (
        <div className="space-y-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
              <HelpCircle className="w-5 h-5" />
              <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                Interactive Knowledge Check
              </h3>
            </div>
            {quizSubmitted && (
              <button
                type="button"
                onClick={resetQuiz}
                className="text-xs font-bold text-[#a435f0] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry Question</span>
              </button>
            )}
          </div>

          <p className="text-sm sm:text-base text-slate-900 dark:text-slate-100 font-bold leading-snug">
            {currentLesson.quiz.question}
          </p>

          <div className="space-y-2">
            {currentLesson.quiz.options.map((option, idx) => {
              const isSelected = selectedQuizAnswer === idx;
              const isCorrect = idx === currentLesson.quiz?.correctAnswer;
              
              let optionClass = 'hover:bg-slate-50 dark:hover:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-transparent';
              if (quizSubmitted) {
                if (isCorrect) {
                  optionClass = 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-800 dark:text-emerald-200';
                } else if (isSelected && !isCorrect) {
                  optionClass = 'bg-rose-50 dark:bg-rose-950/50 border-rose-500 text-rose-800 dark:text-rose-200';
                }
              } else if (isSelected) {
                optionClass = 'bg-purple-50 dark:bg-purple-950/40 border-[#a435f0] text-purple-900 dark:text-white';
              }

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (!quizSubmitted) {
                      setSelectedQuizAnswer(idx);
                    }
                  }}
                  className={`w-full text-left p-3.5 rounded-none text-xs font-semibold transition-colors border flex items-center gap-3 cursor-pointer ${optionClass}`}
                >
                  <span className={`w-5 h-5 rounded-none flex items-center justify-center text-[10px] font-bold shrink-0 border ${
                    isSelected ? 'bg-[#a435f0] border-[#a435f0] text-white' : 'border-slate-400 dark:border-slate-600 text-slate-600 dark:text-slate-400'
                  }`}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="flex-1">{option}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-2 flex items-center justify-between">
            {!quizSubmitted ? (
              <button
                type="button"
                onClick={() => setQuizSubmitted(true)}
                disabled={selectedQuizAnswer === null}
                className="px-5 py-2 rounded-none bg-[#a435f0] hover:bg-[#8710d8] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Submit Answer
              </button>
            ) : (
              <div className={`p-3 rounded-none border flex items-center gap-2.5 text-xs font-bold ${
                selectedQuizAnswer === currentLesson.quiz.correctAnswer
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-500/40 text-rose-800 dark:text-rose-300'
              }`}>
                {selectedQuizAnswer === currentLesson.quiz.correctAnswer ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                    <span>
                      Correct! {currentLesson.quiz.explanation || 'Great job understanding this core concept.'}
                    </span>
                  </>
                ) : (
                  <>
                    <ChevronRight className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>
                      Not quite. {currentLesson.quiz.explanation || 'Review the video segment or re-read the notes to verify.'}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. What you'll learn in this course */}
      <div className="space-y-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
          What you'll learn
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          {learningOutcomes.slice(0, 6).map((outcome, idx) => (
            <div key={idx} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
              <Check className="w-4 h-4 text-slate-900 dark:text-white shrink-0 mt-0.5" />
              <span>{outcome}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Instructors Section: 100% Dynamic matching user specification */}
      <div className="space-y-6 pt-2">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Instructors
        </h2>

        {/* Dynamic Instructor Card */}
        <div className="space-y-3.5">
          <div>
            <h3 className="text-base font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer">
              {instructorName}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              {instructorTitle}
            </p>
          </div>

          {/* Avatar + Stats Column side by side */}
          <div className="flex items-center gap-6 pt-1">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-amber-400 shrink-0 border border-slate-200 dark:border-slate-700">
              {resolvedInstructorAvatar ? (
                <img 
                  src={resolvedInstructorAvatar} 
                  alt={instructorName} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-black text-slate-800 bg-amber-300">
                  {instructorFirstName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* 4 Dynamic Stats Stacked: Rating · Reviews · Students · Courses */}
            <div className="space-y-1.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium">
              <div className="flex items-center gap-2.5">
                <Star className="w-4 h-4 fill-amber-500 text-amber-500 shrink-0" />
                <span>{rating > 0 ? rating.toFixed(1) : (course?.rating ? Number(course.rating).toFixed(1) : '5.0')} Instructor Rating</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Award className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                <span>{reviewCount.toLocaleString()} {reviewCount === 1 ? 'Review' : 'Reviews'}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                <span>{effectiveLearnersCount.toLocaleString()} Students</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Play className="w-4 h-4 fill-slate-500 text-slate-500 shrink-0" />
                <span>{instructorCoursesCount} Courses</span>
              </div>
            </div>
          </div>

          {/* Dynamic Bio Paragraphs with Show more / Show less */}
          <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed space-y-2.5 pt-2 max-w-3xl font-normal">
            {bioParagraphs.slice(0, isBioExpanded ? undefined : 2).map((paragraph, pIdx) => (
              <p key={pIdx}>
                {paragraph}
              </p>
            ))}

            {bioParagraphs.length > 2 && (
              <button
                type="button"
                onClick={() => setIsBioExpanded(!isBioExpanded)}
                className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-800 flex items-center gap-1 pt-1 cursor-pointer"
              >
                <span>{isBioExpanded ? 'Show less' : 'Show more'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isBioExpanded ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
