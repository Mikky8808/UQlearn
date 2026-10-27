import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Course } from '../../types';
import { useApp } from '../../context/AppContext';
import { getIntendedLearnersApi, saveCourseDescriptionChecklistApi, getCourseDescriptionChecklistApi, fetchCourseModulesApi, InstructorDetailsData } from '../../lib/apiConfig';
import { instructorService } from '../../services/instructor-service';
import { ReviewerGuideModal } from './ReviewerGuideModal';
import { LearningVideoPlayer } from '../user/learning/LearningVideoPlayer';
import { LearningLessonNav } from '../user/learning/LearningLessonNav';
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Play, 
  BookOpen, 
  User, 
  Tag, 
  Globe, 
  DollarSign, 
  Clock, 
  Video, 
  HelpCircle, 
  FileText, 
  CheckSquare, 
  ShieldCheck, 
  MessageSquare, 
  Sparkles,
  Layers,
  Award,
  Search,
  ChevronDown,
  ChevronUp,
  Star,
  Download,
  Check,
  RefreshCw,
  Sliders,
  Users,
  PlayCircle,
  Folder,
  Volume2,
  VolumeX,
  Bot,
  Send,
  X
} from 'lucide-react';

export interface DescriptionChecklistItem {
  id: string;
  category: string;
  title: string;
  introText?: string;
  criteria: string[];
  status: 'met' | 'not_met' | 'pending';
  suggestion: string;
}

const DEFAULT_DESCRIPTION_CHECKLIST_ITEMS: DescriptionChecklistItem[] = [
  {
    id: 'what_learner_will_access',
    category: '1. What Learner Will Access',
    title: 'What Learner Will Access',
    introText: 'Verify that the course description highlights clear value metrics: i.e.',
    criteria: [
      'Best Seller Course Status',
      '80+ Hours Video / Material',
      'Premium Coaching Details',
      '24-Hour Support Guarantee',
      '100% Practical Content',
      'Real-Time Hands-On from Lecture 1'
    ],
    status: 'pending',
    suggestion: ''
  },
  {
    id: 'course_goals_stated',
    category: '2. Course Goals Stated',
    title: 'Course Goals Stated',
    introText: 'Ensure clear, outcome-based course goals are explicitly stated: i.e.',
    criteria: [
      'Grow Agency',
      'Build Strategy with ChatGPT',
      'Become Freelancer',
      'Get Hired as Expert'
    ],
    status: 'pending',
    suggestion: ''
  },
  {
    id: 'youll_learn_to',
    category: '3. "You\'ll Learn To"',
    title: '"You\'ll Learn To"',
    introText: 'Verify "You\'ll Learn To" section features actionable practical skills: i.e.',
    criteria: [
      'Build Agency',
      'Price Services',
      'Build Website',
      'Get & Keep Clients',
      'Hire Right People',
      'Customer Relationship',
      'Outsourcing'
    ],
    status: 'pending',
    suggestion: ''
  },
  {
    id: 'who_this_course_is_for',
    category: '4. Who This Course Is For',
    title: 'Who This Course Is For',
    introText: 'Confirm target audience personas are defined ("Who this course is for"): i.e.',
    criteria: [
      'Agency Newcomers',
      'SMMA Newcomers',
      'Freelancers',
      'Business Owners',
      'Social Media Marketers',
      'Digital Marketers',
      'Influencers',
      'Side Hustlers'
    ],
    status: 'pending',
    suggestion: ''
  },
  {
    id: 'bonuses_guarantee',
    category: '5. Bonuses & Guarantee',
    title: 'Bonuses & Guarantee',
    introText: 'Ensure these mandatory bonuses and guarantee details are included in the description:',
    criteria: [
      'Lifetime Access to Future Updates',
      'Tools / Articles / Templates',
      'Q&A Support (Direct Instructor Response)',
      'Downloadable Certificate of Completion',
      '30-Day Money Back Guarantee'
    ],
    status: 'pending',
    suggestion: ''
  }
];

const SAMPLE_VIDEOS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4'
];

const resolveLessonVideoUrl = (lesson: any, course: any, index: number = 0): string => {
  const url = lesson?.videoUrl || lesson?.video_url || lesson?.videoPath || lesson?.video_path || lesson?.video || lesson?.url;
  if (url && typeof url === 'string' && url.trim().length > 0) {
    return url.trim();
  }
  const promo = course?.promoVideo || (course as any)?.promo_video || (course as any)?.video;
  if (promo && typeof promo === 'string' && promo.trim().length > 0) {
    return promo.trim();
  }
  return SAMPLE_VIDEOS[index % SAMPLE_VIDEOS.length];
};

interface ReviewerCourseDetailPageProps {
  course: Course;
  onBack: () => void;
  onCourseReviewed?: () => void;
}

export const ReviewerCourseDetailPage: React.FC<ReviewerCourseDetailPageProps> = ({
  course,
  onBack,
  onCourseReviewed
}) => {
  const { reviewCourse, formatPrice } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'qna' | 'notes' | 'announcements' | 'reviews' | 'tools'>('overview');
  const [openResources, setOpenResources] = useState<Record<string, boolean>>({});
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const toggleResources = (lessonId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenResources(prev => ({
      ...prev,
      [lessonId]: !prev[lessonId]
    }));
  };

  const formatSectionDuration = (lessons: any[]) => {
    let totalMinutes = 0;
    lessons.forEach(l => {
      if (!l.duration) {
        totalMinutes += 10;
        return;
      }
      const dur = l.duration.toString().toLowerCase();
      if (dur.includes(':')) {
        const parts = dur.split(':');
        const mins = parseInt(parts[0], 10) || 0;
        totalMinutes += mins;
      } else if (dur.includes('hr') || dur.includes('h')) {
        const hoursMatch = dur.match(/(\d+)\s*h/);
        const minsMatch = dur.match(/(\d+)\s*m/);
        if (hoursMatch) totalMinutes += parseInt(hoursMatch[1], 10) * 60;
        if (minsMatch) totalMinutes += parseInt(minsMatch[1], 10);
        if (!hoursMatch && !minsMatch) totalMinutes += 10;
      } else {
        const digits = parseInt(dur.replace(/\D/g, ''), 10);
        totalMinutes += (digits || 10);
      }
    });

    if (totalMinutes < 60) {
      return `${totalMinutes}min`;
    }
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hours}hr ${mins}min` : `${hours}hr`;
  };

  const videoRef = useRef<any>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [autoplayNext, setAutoplayNext] = useState<boolean>(true);
  const [currentLessonIndex, setCurrentLessonIndex] = useState<number>(0);
  const [showDecisionModal, setShowDecisionModal] = useState<boolean>(false);
  const [decisionType, setDecisionType] = useState<'approved' | 'needs_changes' | 'rejected' | 'under_review'>('approved');
  const [feedbackNotes, setFeedbackNotes] = useState<string>(course.reviewerNotes || '');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Description Audit Checklist Drawer State
  const [showChecklistDrawer, setShowChecklistDrawer] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [descriptionChecklist, setDescriptionChecklist] = useState<DescriptionChecklistItem[]>(() => {
    try {
      const saved = localStorage.getItem(`course_description_checklist_audit_${course.id}`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return DEFAULT_DESCRIPTION_CHECKLIST_ITEMS;
  });
  const [auditToastMessage, setAuditToastMessage] = useState<string | null>(null);

  const handleToggleChecklistItemStatus = (id: string, newStatus: 'met' | 'not_met') => {
    setDescriptionChecklist(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          status: item.status === newStatus ? 'pending' : newStatus
        };
      }
      return item;
    }));
  };

  const handleUpdateChecklistItemSuggestion = (id: string, suggestion: string) => {
    setDescriptionChecklist(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, suggestion };
      }
      return item;
    }));
  };

  // Fetch checklist from backend database on mount
  useEffect(() => {
    let isMounted = true;
    async function loadBackendChecklist() {
      if (!course.id) return;
      try {
        const remoteChecklist = await getCourseDescriptionChecklistApi(course.id);
        if (remoteChecklist && Array.isArray(remoteChecklist) && isMounted) {
          setDescriptionChecklist(remoteChecklist);
        }
      } catch (err) {
        console.warn("Could not load backend checklist:", err);
      }
    }
    loadBackendChecklist();
    return () => { isMounted = false; };
  }, [course.id]);

  const handleSubmitChecklistAudit = async () => {
    try {
      // 1. Save to Remote Backend Database Table
      await saveCourseDescriptionChecklistApi(course.id, descriptionChecklist);

      // 2. Also keep local storage sync
      const storageKey = `course_description_checklist_audit_${course.id}`;
      localStorage.setItem(storageKey, JSON.stringify(descriptionChecklist));

      const feedbackKey = `course_audit_checklist_feedback_${course.id}`;
      const notMetItems = descriptionChecklist.filter(i => i.status === 'not_met');
      const metItems = descriptionChecklist.filter(i => i.status === 'met');

      const auditFeedbackPayload = {
        courseId: course.id,
        courseTitle: course.title,
        updatedAt: new Date().toISOString(),
        metCount: metItems.length,
        notMetCount: notMetItems.length,
        notMetItems: notMetItems.map(i => ({
          id: i.id,
          title: i.title,
          category: i.category,
          suggestion: i.suggestion || 'Reviewer noted this criterion was not met.'
        })),
        allItems: descriptionChecklist
      };

      localStorage.setItem(feedbackKey, JSON.stringify(auditFeedbackPayload));

      // Append summary to reviewer feedback notes if there are unachieved items
      if (notMetItems.length > 0) {
        const notMetSummary = notMetItems.map(i => `• ${i.title}: ${i.suggestion || 'Not met'}`).join('\n');
        setFeedbackNotes(prev => {
          if (prev && prev.includes('Description Checklist Audit Feedback:')) return prev;
          return (prev ? prev + '\n\n' : '') + `Description Checklist Audit Feedback:\n${notMetSummary}`;
        });
      }

      setAuditToastMessage(`Checklist saved to database! ${metItems.length} Met, ${notMetItems.length} Not Met. Instructor notified.`);
      setTimeout(() => setAuditToastMessage(null), 4500);
      setShowChecklistDrawer(false);
    } catch (err) {
      console.error("Failed to save audit checklist:", err);
    }
  };

  // Dynamic Learning Objectives from API
  const [learningObjectivesList, setLearningObjectivesList] = useState<string[]>([]);
  const [loadingObjectives, setLoadingObjectives] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function loadObjectives() {
      // 1. Check if course object already has learning objectives array
      const existing = (course.learningObjectives && course.learningObjectives.filter(Boolean).length > 0)
        ? course.learningObjectives.filter(Boolean)
        : (course.learningOutcomes && course.learningOutcomes.filter(Boolean).length > 0)
          ? course.learningOutcomes.filter(Boolean)
          : (course.whatYouWillLearn && course.whatYouWillLearn.filter(Boolean).length > 0)
            ? course.whatYouWillLearn.filter(Boolean)
            : [];

      if (existing.length > 0) {
        setLearningObjectivesList(existing);
        return;
      }

      // 2. Otherwise fetch dynamically from intended_learners API endpoint
      if (!course.id) return;
      setLoadingObjectives(true);
      try {
        const res = await getIntendedLearnersApi(course.id);
        const data = (res && res.data) ? res.data : null;
        if (data && isMounted) {
          let rawObjs = data.learning_objectives || data.learningObjectives || data.what_you_will_learn || [];
          if (typeof rawObjs === 'string') {
            try {
              rawObjs = JSON.parse(rawObjs);
            } catch {
              rawObjs = [rawObjs];
            }
          }
          if (Array.isArray(rawObjs)) {
            setLearningObjectivesList(rawObjs.filter((item: any) => typeof item === 'string' && item.trim().length > 0));
          }
        }
      } catch (err) {
        console.warn('Failed to load learning objectives from API:', err);
      } finally {
        if (isMounted) setLoadingObjectives(false);
      }
    }

    loadObjectives();
    return () => { isMounted = false; };
  }, [course.id, course.learningObjectives, course.learningOutcomes, course.whatYouWillLearn]);

  // Progressive Count-Up Animation for Real Database Fields (Ratings, Review counts, Learners enrolled)
  const [animatedRating, setAnimatedRating] = useState<number>(0);
  const [animatedReviews, setAnimatedReviews] = useState<number>(0);
  const [animatedLearners, setAnimatedLearners] = useState<number>(0);

  const targetRating = typeof course.rating === 'number' && course.rating > 0 ? course.rating : 4.3;
  const targetReviews = typeof course.reviewCount === 'number' ? course.reviewCount : 0;
  const targetLearners = typeof course.learnersEnrolled === 'number' ? course.learnersEnrolled : 0;

  useEffect(() => {
    setAnimatedRating(0);
    setAnimatedReviews(0);
    setAnimatedLearners(0);

    const duration = 1500; // ms
    const frameRate = 1000 / 60; // 60fps
    const totalFrames = Math.round(duration / frameRate);
    let frame = 0;

    const timer = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      setAnimatedRating(Math.min(targetRating, Number((targetRating * easeProgress).toFixed(1))));
      setAnimatedReviews(Math.min(targetReviews, Math.round(targetReviews * easeProgress)));
      setAnimatedLearners(Math.min(targetLearners, Math.round(targetLearners * easeProgress)));

      if (frame >= totalFrames) {
        clearInterval(timer);
        setAnimatedRating(targetRating);
        setAnimatedReviews(targetReviews);
        setAnimatedLearners(targetLearners);
      }
    }, frameRate);

    return () => clearInterval(timer);
  }, [course, targetRating, targetReviews, targetLearners]);

  // Format date helper (Month Then Year, e.g. 9/2026)
  const getFormattedUpdatedDate = (dateStr?: string) => {
    if (!dateStr) return '9/2026';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '9/2026';
      return `${d.getMonth() + 1}/${d.getFullYear()}`;
    } catch {
      return '9/2026';
    }
  };

  // Dynamic Instructor Information fetched via API
  const [apiInstructorData, setApiInstructorData] = useState<InstructorDetailsData | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadInstructorData() {
      if (!course.id) return;
      try {
        const data = await instructorService.getProfile(course.id);
        if (data && isMounted) {
          setApiInstructorData(data);
        }
      } catch (err) {
        console.warn('Failed to load instructor details via API:', err);
      }
    }
    loadInstructorData();
    return () => { isMounted = false; };
  }, [course.id]);

  // Instructor Details derived from API, course or fallbacks matching design standard
  const instructorName = apiInstructorData?.name
    || (typeof course.instructor === 'object' && (course.instructor as any)?.name)
    || (course.instructor || (course as any).instructorName || 'mike kenyanya');

  const instructorHeadline = apiInstructorData?.headline
    || (course as any).instructorHeadline 
    || (typeof course.instructor === 'object' && (course.instructor as any)?.headline) 
    || `${course.title || 'Course'} Instructor`;

  const instructorAvatar = apiInstructorData?.avatar
    || (typeof course.instructor === 'object' && (course.instructor as any)?.avatar) 
    || (course as any).instructorAvatar 
    || (course as any).instructorImage 
    || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';

  const instructorRating = apiInstructorData?.rating || (course as any).instructorRating || course.rating || 5.0;
  const instructorReviews = apiInstructorData?.reviews || (course as any).instructorReviews || (typeof course.reviewCount === 'number' && course.reviewCount > 0 ? course.reviewCount : ((course as any).reviews?.length || 112250));
  const instructorStudents = apiInstructorData?.students || (course as any).instructorStudents || (typeof course.learnersEnrolled === 'number' && course.learnersEnrolled > 0 ? course.learnersEnrolled : ((course as any).studentsEnrolled || 603607));
  const instructorCoursesCount = apiInstructorData?.coursesCount || (course as any).instructorCoursesCount || 17;

  const instructorBio = apiInstructorData?.bio
    || (course as any).instructorBio 
    || (typeof course.instructor === 'object' && (course.instructor as any)?.bio) 
    || "There's no greater joy than watching beautiful testimonials of people achieving their goals and dreams. That's why we STRONGLY believe in full and constant support. With ALL of our courses you can expect:";

  // Render Star icons dynamically up to 5 stars based on rating value
  const renderStars = (ratingVal: number) => {
    const stars = [];
    const fullStars = Math.floor(ratingVal);
    const hasHalfStar = ratingVal % 1 >= 0.4;
    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />);
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(<Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400 opacity-80" />);
      } else {
        stars.push(<Star key={i} className="w-4 h-4 text-slate-600" />);
      }
    }
    return stars;
  };

  const [courseModules, setCourseModules] = useState<any[]>(course.modules || []);

  useEffect(() => {
    let isMounted = true;
    async function loadModules() {
      if (course.modules && course.modules.length > 0) {
        if (isMounted) setCourseModules(course.modules);
        return;
      }
      if (!course.id) return;
      try {
        const modulesData = await fetchCourseModulesApi(course.id);
        if (modulesData && modulesData.length > 0 && isMounted) {
          setCourseModules(modulesData);
        } else if (isMounted) {
          setCourseModules([
            {
              id: 'm-1',
              title: 'Introduction & Core Concepts',
              lessons: [
                { id: 'l-1', title: 'Welcome & Course Overview', duration: '05:14', videoUrl: course.promoVideo || SAMPLE_VIDEOS[0] },
                { id: 'l-2', title: 'Setting Up Your Workspace & Tools', duration: '10:30', videoUrl: SAMPLE_VIDEOS[1] }
              ]
            },
            {
              id: 'm-2',
              title: 'Advanced Strategies & Execution',
              lessons: [
                { id: 'l-3', title: 'Mastering Professional Frameworks', duration: '15:00', videoUrl: SAMPLE_VIDEOS[2] },
                { id: 'l-4', title: 'Real-World Case Studies', duration: '12:45', videoUrl: SAMPLE_VIDEOS[3] }
              ]
            }
          ]);
        }
      } catch (err) {
        console.error("Failed to load reviewer modules:", err);
      }
    }
    loadModules();
    return () => { isMounted = false; };
  }, [course.id, course.modules, course.promoVideo]);

  // Expanded Sections State - Dynamically calculated from course modules
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    const mods = course.modules || courseModules || [];
    mods.forEach((_, idx) => {
      initial[`section-${idx + 1}`] = idx === 0; // expand first section by default
    });
    return initial;
  });

  // Keep expandedSections in sync when courseModules loads
  useEffect(() => {
    if (courseModules && courseModules.length > 0) {
      setExpandedSections(prev => {
        const next = { ...prev };
        courseModules.forEach((_, idx) => {
          const key = `section-${idx + 1}`;
          if (next[key] === undefined) {
            next[key] = idx === 0;
          }
        });
        return next;
      });
    }
  }, [courseModules]);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Quality Audit Checklist state
  const [checklist, setChecklist] = useState({
    videoResolution: true,
    audioClarity: true,
    curriculumStructure: true,
    intendedLearnersClear: true,
    pricingAccurate: true,
    noPolicyViolation: true
  });

  const allChecklistPassed = Object.values(checklist).every(Boolean);

  const handleOpenDecision = (type: 'approved' | 'needs_changes' | 'rejected' | 'under_review') => {
    setDecisionType(type);
    if (type === 'approved' && !feedbackNotes) {
      setFeedbackNotes('Course meets all UQlearn quality standards and is approved for public catalog publication.');
    } else if (type === 'needs_changes' && !feedbackNotes) {
      setFeedbackNotes('Please review the curriculum module structure and ensure high-definition video previews are uploaded before resubmission.');
    }
    setShowDecisionModal(true);
  };

  const handleConfirmDecision = async () => {
    setSubmitting(true);
    try {
      await reviewCourse(course.id, decisionType, feedbackNotes);
      setShowDecisionModal(false);
      if (onCourseReviewed) onCourseReviewed();
    } catch (err) {
      console.error("Failed to submit review decision:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Map full lessons list with reliable playable video streams
  const allLessons = useMemo(() => {
    let globalIndex = 0;
    const list: any[] = [];
    (courseModules || []).forEach((mod: any, mIdx: number) => {
      (mod.lessons || []).forEach((l: any, lIdx: number) => {
        const vid = resolveLessonVideoUrl(l, course, globalIndex);
        list.push({
          id: l.id || `l-${mIdx}-${lIdx}`,
          moduleId: mod.id || `m-${mIdx}`,
          title: l.title || `Lesson ${lIdx + 1}`,
          duration: l.duration || '05:00',
          videoUrl: vid,
          content: l.content || '',
          isCompleted: Boolean(l.isCompleted),
          resources: l.resources || [],
          globalIndex
        });
        globalIndex++;
      });
    });

    if (list.length === 0) {
      return [
        {
          id: 'l-default-1',
          moduleId: 'm-default-1',
          title: 'Welcome & Course Overview',
          duration: '05:14',
          videoUrl: resolveLessonVideoUrl({ videoUrl: course.promoVideo }, course, 0),
          content: 'Course overview and introductory lecture.',
          isCompleted: false,
          resources: [],
          globalIndex: 0
        },
        {
          id: 'l-default-2',
          moduleId: 'm-default-1',
          title: 'Setting Up Your Workspace & Tools',
          duration: '10:30',
          videoUrl: SAMPLE_VIDEOS[1],
          content: 'Workspace preparation and tools setup.',
          isCompleted: false,
          resources: [],
          globalIndex: 1
        },
        {
          id: 'l-default-3',
          moduleId: 'm-default-2',
          title: 'Mastering Professional Frameworks',
          duration: '15:00',
          videoUrl: SAMPLE_VIDEOS[2],
          content: 'Core architecture and professional practices.',
          isCompleted: false,
          resources: [],
          globalIndex: 2
        },
        {
          id: 'l-default-4',
          moduleId: 'm-default-2',
          title: 'Real-World Case Studies',
          duration: '12:45',
          videoUrl: SAMPLE_VIDEOS[3],
          content: 'Real-world case study walkthrough.',
          isCompleted: false,
          resources: [],
          globalIndex: 3
        }
      ];
    }
    return list;
  }, [courseModules, course]);

  const currentLesson = useMemo(() => {
    return allLessons[currentLessonIndex] || allLessons[0];
  }, [allLessons, currentLessonIndex]);

  const activeLessonTitle = currentLesson?.title || 'Introduction & Promo Video';

  const hasPrevLesson = currentLessonIndex > 0;
  const hasNextLesson = currentLessonIndex < allLessons.length - 1;
  const prevLesson = hasPrevLesson ? allLessons[currentLessonIndex - 1] : undefined;
  const nextLesson = hasNextLesson ? allLessons[currentLessonIndex + 1] : undefined;

  const handlePrevLesson = () => {
    if (hasPrevLesson) {
      setCurrentLessonIndex(prev => prev - 1);
    }
  };

  const handleNextLesson = () => {
    if (hasNextLesson) {
      setCurrentLessonIndex(prev => prev + 1);
    }
  };

  const handleVideoEnded = () => {
    if (autoplayNext && hasNextLesson) {
      handleNextLesson();
    }
  };

  // Real database course modules & lessons with resolved video URLs and global indexes
  const displaySections = useMemo(() => {
    let runningIdx = 0;
    return (courseModules || []).map((mod, idx) => {
      const sectionLessons = (mod.lessons || []).map((l: any, lIdx: number) => {
        const currentIdx = runningIdx++;
        const resolvedVideo = resolveLessonVideoUrl(l, course, currentIdx);
        return {
          id: l.id || `l-${idx}-${lIdx}`,
          title: l.title || `Lesson ${lIdx + 1}`,
          duration: l.duration || '5min',
          isCompleted: Boolean(l.isCompleted),
          videoUrl: resolvedVideo,
          resources: l.resources || [],
          globalIndex: currentIdx
        };
      });

      return {
        id: `section-${idx + 1}`,
        title: `Section ${idx + 1}: ${(mod.title || 'Module').toUpperCase()}`,
        progress: `${sectionLessons.length}/${sectionLessons.length} | ${sectionLessons.reduce((acc: number, curr: any) => acc + (parseInt(curr.duration || '0') || 5), 0)}min`,
        lessons: sectionLessons
      };
    });
  }, [courseModules, course]);

  return (
    <div className="flex flex-col bg-[#0b0c0e] min-h-screen text-white font-sans animate-fadeIn">
      
      {/* 1. Header Branded Bar */}
      <div className="bg-[#1c1d1f] border-b border-slate-800 px-4 py-3.5 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-4 min-w-0">
          <button
            onClick={onBack}
            className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Back to Quality Submissions"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3 min-w-0">
            {/* Branded uqlearn Logo */}
            <div className="flex items-center space-x-2 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-indigo-950/40">
                uq
              </div>
              <span className="font-black text-lg tracking-tight text-white hidden sm:inline">uqlearn</span>
            </div>

            <div className="h-6 w-px bg-slate-800 hidden sm:block"></div>

            {/* Course Title */}
            <h1 className="text-xs sm:text-sm font-bold text-slate-200 truncate max-w-md sm:max-w-xl">
              {course.title}
            </h1>
          </div>
        </div>
      </div>

      {/* 2. Main Workspace split layout */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-y-auto">
        
        {/* Left Side: Video Stream Player & Tabs Content */}
        <div className="flex-1 flex flex-col bg-[#141517] overflow-y-auto min-w-0">
          
          {/* Main Video Stream Player using LearningVideoPlayer from learners player */}
          <div className="w-full bg-black flex flex-col items-center justify-center border-b border-slate-900 group">
            <LearningVideoPlayer 
              currentLesson={currentLesson}
              course={course}
              videoRef={videoRef}
              playbackSpeed={playbackSpeed}
              onSpeedChange={setPlaybackSpeed}
              showResumeBanner={false}
              resumeTime={0}
              onTimeUpdate={() => {}}
              onVideoPause={() => {}}
              onVideoEnded={handleVideoEnded}
              autoplayNext={autoplayNext}
              onPlayNextLesson={handleNextLesson}
              nextLessonTitle={nextLesson?.title}
            />
          </div>

          {/* Under-Player Lesson Navigation matching learners player */}
          <div className="p-3 sm:p-4 bg-[#141517] border-b border-slate-800">
            <LearningLessonNav 
              currentLesson={currentLesson}
              currentLessonIndex={currentLessonIndex}
              totalLessons={allLessons.length}
              isCompleted={Boolean(currentLesson?.isCompleted)}
              onToggleComplete={() => {
                if (currentLesson) {
                  currentLesson.isCompleted = !currentLesson.isCompleted;
                }
              }}
              onPrevLesson={handlePrevLesson}
              onNextLesson={handleNextLesson}
              hasPrevLesson={hasPrevLesson}
              hasNextLesson={hasNextLesson}
              prevLessonTitle={prevLesson?.title}
              nextLessonTitle={nextLesson?.title}
              autoplayNext={autoplayNext}
              onToggleAutoplay={() => setAutoplayNext(!autoplayNext)}
              isAllCompleted={false}
            />
          </div>

          {/* Under-Player Tabs exactly mimicking screenshot */}
          <div className="bg-[#1c1d1f] border-b border-slate-800 shrink-0 flex items-center justify-between px-4 sm:px-6">
            <div className="flex items-center space-x-4 sm:space-x-6 overflow-x-auto text-xs py-1">
              {/* Search Icon */}
              <button className="p-2 text-slate-400 hover:text-white transition-colors cursor-pointer">
                <Search className="w-4 h-4" />
              </button>

              <button
                onClick={() => setActiveTab('overview')}
                className={`py-3.5 px-1 font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'overview' ? 'border-white text-white' : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('qna')}
                className={`py-3.5 px-1 font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'qna' ? 'border-white text-white' : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Q&A
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`py-3.5 px-1 font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'notes' ? 'border-white text-white' : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Notes
              </button>
              <button
                onClick={() => setActiveTab('announcements')}
                className={`py-3.5 px-1 font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'announcements' ? 'border-white text-white' : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Announcements
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`py-3.5 px-1 font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'reviews' ? 'border-white text-white' : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Reviews
              </button>
              <button
                onClick={() => setActiveTab('tools')}
                className={`py-3.5 px-1 font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'tools' ? 'border-white text-white' : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Learning tools
              </button>
            </div>
          </div>

          {/* Tab content renderer inside Overview or others */}
          <div className="p-6 space-y-8 flex-1">
            
            {activeTab === 'overview' && (
              <div className="space-y-8">
                
                {/* 1. First Card: Course Title, Ratings & Stars (Plain, Transparent, No Background, No Border, Sharp) */}
                <div className="bg-transparent border-none rounded-none p-0 shadow-none text-white space-y-4 animate-fadeIn">
                  <div className="space-y-3">
                    {/* Course Category Badge */}
                    <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-none bg-indigo-500/10 text-indigo-300 text-[10px] font-black uppercase tracking-widest border border-indigo-500/20">
                      <Tag className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{course.category || 'Design'}</span>
                    </div>

                    {/* Course Title */}
                    <h2 className="text-xl sm:text-3xl font-black tracking-tight leading-tight text-white max-w-3xl">
                      {course.title || 'Untitled Course'}
                    </h2>

                    {/* Ratings & Stars */}
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1.5 text-xs sm:text-sm font-semibold">
                      <span className="text-amber-400 font-black">{animatedRating.toFixed(1)}</span>
                      <div className="flex items-center text-amber-400 space-x-0.5">
                        {renderStars(animatedRating)}
                      </div>
                      <span className="text-slate-400">({animatedReviews.toLocaleString()} ratings)</span>
                    </div>

                    {/* Students Enrolled */}
                    <p className="text-xs sm:text-sm text-slate-300 font-medium">
                      {animatedLearners.toLocaleString()} students enrolled
                    </p>

                    {/* Last Updated At: Month Then Year */}
                    <div className="flex items-center space-x-2 text-[11px] text-slate-400 pt-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Last updated {getFormattedUpdatedDate(course.updatedAt)}</span>
                    </div>
                  </div>
                </div>

                {/* 2. "What you'll learn" Card (Sharp Border, Transparent/No Background Color, 2 Columns) */}
                <div className="bg-transparent border border-slate-800 rounded-none p-6 sm:p-8 space-y-5">
                  <h3 className="text-lg font-black text-white tracking-tight">What you'll learn</h3>
                  
                  {loadingObjectives ? (
                    <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono py-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                      <span>loading...</span>
                    </div>
                  ) : learningObjectivesList.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs sm:text-sm">
                      {learningObjectivesList.map((obj, i) => (
                        <div key={i} className="flex items-start space-x-3 text-slate-300 font-medium leading-relaxed">
                          <Check className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" strokeWidth={2.5} />
                          <span>{obj}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic font-medium">
                      No learning objectives specified for this course yet.
                    </p>
                  )}
                </div>

                {/* 3. Description Section */}
                <div className="bg-transparent border-none rounded-none p-0 shadow-none space-y-4">
                  <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-white tracking-wider">Description</h3>
                      {descriptionChecklist.some(i => i.status !== 'pending') && (
                        <div className="flex items-center space-x-2 text-xs font-mono font-medium mt-1">
                          <span className="text-slate-400">Audit Record:</span>
                          <span className="text-emerald-400 font-bold">✓ {descriptionChecklist.filter(i => i.status === 'met').length} Met</span>
                          <span className="text-slate-600">•</span>
                          <span className="text-rose-400 font-bold">✗ {descriptionChecklist.filter(i => i.status === 'not_met').length} Not Met</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowGuideModal(true)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-none text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer shadow-md shadow-indigo-950/50 shrink-0"
                    >
                      <CheckSquare className="w-4 h-4 text-white" />
                      <span>Reviewer Checklist</span>
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-[#18181b]/60 border border-slate-800 p-5 rounded-2xl">
                    {course.description || course.subtitle || 'No description provided for this course.'}
                  </p>
                </div>

                {/* 4. Instructors Section */}
                <div className="bg-transparent border-none rounded-none p-0 shadow-none space-y-4 pt-4 border-t border-slate-800/80">
                  <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Instructors</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-base sm:text-lg font-bold text-indigo-400 hover:text-indigo-300 underline underline-offset-2 cursor-pointer transition-colors">
                        {instructorName}
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-400 font-normal mt-0.5">
                        {instructorHeadline}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 pt-1">
                      <img 
                        src={instructorAvatar} 
                        alt={instructorName}
                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover shrink-0 border border-slate-700 shadow-lg"
                      />
                      
                      <div className="space-y-2 text-xs sm:text-sm font-medium text-slate-300">
                        <div className="flex items-center space-x-2.5">
                          <Star className="w-4 h-4 fill-slate-200 text-slate-200 shrink-0" />
                          <span>{instructorRating.toFixed(1)} Instructor Rating</span>
                        </div>
                        <div className="flex items-center space-x-2.5">
                          <Award className="w-4 h-4 text-slate-200 shrink-0" />
                          <span>{instructorReviews.toLocaleString()} Reviews</span>
                        </div>
                        <div className="flex items-center space-x-2.5">
                          <Users className="w-4 h-4 text-slate-200 shrink-0" />
                          <span>{instructorStudents.toLocaleString()} Students</span>
                        </div>
                        <div className="flex items-center space-x-2.5">
                          <PlayCircle className="w-4 h-4 text-slate-200 shrink-0" />
                          <span>{instructorCoursesCount} Courses</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal pt-2 whitespace-pre-line">
                      {instructorBio}
                    </p>
                  </div>
                </div>

              </div>
            )}

            {/* Inactive tab states containing quality placeholders */}
            {activeTab !== 'overview' && (
              <div className="p-8 text-center text-slate-500 text-xs bg-[#1c1d1f] rounded-2xl border border-slate-800 space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
                <h4 className="font-bold text-slate-300">Auditor Preview Panel</h4>
                <p className="max-w-md mx-auto">
                  Tab "{activeTab.toUpperCase()}" content is fully operational for students on uqlearn.org. Under review, standard dynamic database elements are locked to allow audit compliance.
                </p>
              </div>
            )}

          </div>

        </div>

        {/* Right Side: Course content accordion - Exact match to uploaded UI screenshot */}
        <div className="w-full lg:w-[360px] bg-white dark:bg-[#1c1d1f] border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 flex flex-col shrink-0 overflow-y-auto">
          
          {/* Top Header with Course Content title */}
          <div className="px-4 pt-3 pb-3 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 bg-white dark:bg-[#1c1d1f] flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-6">
              <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                Course content
              </span>
            </div>

            {/* Right Controls: Mute/Speaker & Close */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Accordion Blocks */}
          <div className="flex-1 divide-y divide-slate-200 dark:divide-slate-800 overflow-y-auto">
              {displaySections.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs space-y-2">
                  <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
                  <h4 className="font-bold text-slate-300">No content uploaded</h4>
                  <p className="text-[11px] text-slate-400">The instructor has not uploaded any modules or lessons for this course yet.</p>
                </div>
              ) : (
                displaySections.map((section, idx) => {
                  const isOpen = expandedSections[section.id] ?? false;
                  const completedCount = section.lessons.filter(l => l.isCompleted).length;
                  const formattedDuration = formatSectionDuration(section.lessons);

                  // Standardize section title format (Section X: Title)
                  let rawTitle = section.title || `Section ${idx + 1}`;
                  if (!rawTitle.toLowerCase().startsWith('section')) {
                    rawTitle = `Section ${idx + 1}: ${rawTitle.replace(/^module\s*\d+:?\s*/i, '')}`;
                  }

                  return (
                    <div key={section.id} className="flex flex-col">
                      {/* Section Title Bar */}
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="w-full px-4 py-3.5 bg-[#f7f8fa] hover:bg-[#eff1f5] dark:bg-[#1a1b1e] dark:hover:bg-[#222428] border-b border-slate-200 dark:border-slate-800 flex items-start justify-between text-left transition-colors cursor-pointer group"
                      >
                        <div className="space-y-1 pr-3 min-w-0">
                          <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight group-hover:text-slate-950 dark:group-hover:text-white">
                            {rawTitle}
                          </h4>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {completedCount} / {section.lessons.length} | {formattedDuration}
                          </p>
                        </div>
                        <span className="text-slate-500 dark:text-slate-400 shrink-0 mt-1">
                          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </span>
                      </button>

                      {/* Section lecture elements */}
                      {isOpen && (
                        <div className="bg-white dark:bg-[#141517] divide-y divide-slate-100 dark:divide-slate-900/60">
                          {section.lessons.map((lesson, lIdx) => {
                            const showRes = Boolean(openResources[`res_${section.id}_${lIdx}`]);
                            const isActive = currentLesson && (lesson.id === currentLesson.id || (typeof lesson.globalIndex === 'number' && lesson.globalIndex === currentLessonIndex));

                            return (
                              <div key={lIdx} className="flex flex-col">
                                <div
                                  onClick={() => {
                                    const targetIdx = typeof lesson.globalIndex === 'number' 
                                      ? lesson.globalIndex 
                                      : allLessons.findIndex(al => al.id === lesson.id || al.title === lesson.title);
                                    if (targetIdx !== -1) {
                                      setCurrentLessonIndex(targetIdx);
                                    }
                                  }}
                                  className={`px-4 py-3.5 flex items-start justify-between gap-3 cursor-pointer transition-colors ${
                                    isActive 
                                      ? 'bg-purple-900/30 border-l-4 border-purple-500' 
                                      : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'
                                  }`}
                                >
                                  {/* Purple Checked box matching screenshot */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Toggle completion locally
                                      lesson.isCompleted = !lesson.isCompleted;
                                    }}
                                    className="mt-0.5 shrink-0 cursor-pointer"
                                  >
                                    {lesson.isCompleted ? (
                                      <div className="w-5 h-5 rounded bg-purple-700 text-white flex items-center justify-center shadow-xs">
                                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                                      </div>
                                    ) : (
                                      <div className="w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-700 bg-transparent hover:border-purple-600 transition-colors" />
                                    )}
                                  </button>
                                  
                                  {/* Details */}
                                  <div className="flex-1 min-w-0 space-y-1">
                                    <p className={`text-xs sm:text-sm font-semibold leading-snug ${
                                      isActive ? 'text-purple-300 dark:text-purple-200 font-bold' : 'text-slate-800 dark:text-slate-200'
                                    }`}>
                                      {lIdx + 1}. {lesson.title.replace(/^\d+[\.\)]\s*/, '')}
                                    </p>
                                    <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                                      <Play className={`w-3 h-3 shrink-0 ${isActive ? 'text-purple-400 fill-purple-400 animate-pulse' : 'text-slate-400 fill-slate-400'}`} />
                                      <span>{lesson.duration || '2min'}</span>
                                      {isActive && (
                                        <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider ml-1.5 bg-purple-500/10 px-1.5 py-0.5 rounded">
                                          Playing
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Right Resources Pill Button */}
                                  {lesson.resources && lesson.resources.length > 0 && (
                                    <div className="shrink-0 pt-0.5">
                                      <button
                                        type="button"
                                        onClick={(e) => toggleResources(`res_${section.id}_${lIdx}`, e)}
                                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                                          showRes
                                            ? 'border-purple-700 bg-purple-700 text-white shadow-xs'
                                            : 'border-purple-600 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 bg-transparent'
                                        }`}
                                      >
                                        <Folder className={`w-3.5 h-3.5 ${showRes ? 'text-white' : 'text-purple-600 dark:text-purple-400'}`} />
                                        <span>Resources</span>
                                        <ChevronDown className={`w-3 h-3 transition-transform ${showRes ? 'rotate-180' : ''}`} />
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {/* Resources Dropdown */}
                                {showRes && lesson.resources && lesson.resources.length > 0 && (
                                  <div className="px-10 py-3 bg-purple-50/40 dark:bg-purple-950/20 border-t border-b border-purple-100 dark:border-purple-900/30 space-y-2 animate-fadeIn text-xs">
                                    <p className="font-bold text-slate-700 dark:text-slate-300">Downloadable Resources:</p>
                                    <div className="space-y-1.5">
                                      {lesson.resources.map((res: any, rIdx: number) => {
                                        const displayTitle = res.title || (res.url ? res.url.substring(res.url.lastIndexOf('/') + 1) : '') || 'Download Resource';
                                        return (
                                          <a
                                            key={rIdx}
                                            href={res.url || '#'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#1c1d1f] border border-slate-200 dark:border-slate-800 text-purple-700 dark:text-purple-300 hover:underline transition-colors animate-fadeIn"
                                          >
                                            <span className="flex items-center gap-2 truncate pr-2">
                                              <FileText className="w-3.5 h-3.5 text-purple-600" />
                                              <span className="truncate text-slate-700 dark:text-slate-200 font-bold">{displayTitle}</span>
                                            </span>
                                            <Download className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                          </a>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      {/* 3. Decision notes / feedback submission modal */}
      {showDecisionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1c1d1f] border border-slate-800 w-full max-w-lg rounded-2xl p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in duration-200 text-white">
            
            <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
              <div className={`p-2.5 rounded-xl ${
                decisionType === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
              }`}>
                {decisionType === 'approved' ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-base font-bold">
                  {decisionType === 'approved' ? 'Approve Course for Catalog' : 'Request Course Revisions'}
                </h3>
                <p className="text-xs text-slate-400">
                  {decisionType === 'approved' 
                    ? 'This action marks the course as approved and ready for public publication.' 
                    : 'Send structured feedback to the instructor explaining required modifications.'}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Reviewer Feedback & Notes for Instructor
              </label>
              <textarea
                rows={4}
                value={feedbackNotes}
                onChange={(e) => setFeedbackNotes(e.target.value)}
                placeholder="Write clear, constructive notes regarding curriculum quality, video resolution, or approval status..."
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDecisionModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmDecision}
                className={`px-5 py-2 text-xs font-bold rounded-xl text-white shadow-lg transition-all cursor-pointer ${
                  decisionType === 'approved'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-amber-600 hover:bg-amber-500'
                }`}
              >
                {submitting ? 'Submitting...' : 'Confirm Decision'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 4. YouTube-style Course Description Checklist Drawer */}
      {showChecklistDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" 
            onClick={() => setShowChecklistDrawer(false)} 
          />

          {/* YouTube Drawer Container (Dark Slate / Mix - Church songs style) */}
          <div className="relative z-10 w-full sm:w-[480px] bg-[#1f1f1f] border-l border-slate-800 shadow-2xl flex flex-col h-full text-white animate-in slide-in-from-right duration-300">
            
            {/* Drawer Header (YouTube Mix Playlist style) */}
            <div className="bg-[#282828] border-b border-slate-800 px-5 py-4 flex items-center justify-between shrink-0">
              <div className="space-y-0.5 pr-2">
                <h3 className="text-base font-bold text-white tracking-wide flex items-center space-x-2">
                  <CheckSquare className="w-5 h-5 text-indigo-400" />
                  <span>Course Description Checklist (Summary)</span>
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Tick green ✓ for pass, red ✗ for fail, and leave suggestions for the instructor.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowChecklistDrawer(false)}
                className="p-2 hover:bg-slate-700/60 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body - Scrollable Checklist Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 divide-y divide-slate-800/80">
              {descriptionChecklist.map((item) => (
                <div key={item.id} className="pt-4 first:pt-0 space-y-3">
                  <div className="bg-[#17181a] border border-slate-800 p-3.5 space-y-2 rounded-none">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 pr-2">
                        <h4 className="text-xs font-black text-indigo-300 uppercase tracking-wider">
                          {item.category}
                        </h4>
                        {item.introText && (
                          <p className="text-[11px] text-slate-300 font-semibold italic">
                            {item.introText}
                          </p>
                        )}
                        <div className="text-[11px] text-slate-300 space-y-1 font-medium leading-relaxed pl-1 pt-0.5">
                          {item.criteria.map((c, cIdx) => (
                            <div key={cIdx} className="text-slate-200 font-mono text-[11px]">
                              {c}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action Buttons: Green Tick (✓) & Red Cross (✗) */}
                      <div className="flex items-center space-x-1.5 shrink-0 pt-0.5">
                        {/* Green Tick */}
                        <button
                          type="button"
                          onClick={() => handleToggleChecklistItemStatus(item.id, 'met')}
                          title="Mark as Met (✓)"
                          className={`p-2 rounded-none border text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                            item.status === 'met'
                              ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/40'
                              : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-emerald-400 hover:bg-slate-800'
                          }`}
                        >
                          <Check className="w-4 h-4" strokeWidth={3} />
                          <span className="sr-only">Met</span>
                        </button>

                        {/* Red Cross */}
                        <button
                          type="button"
                          onClick={() => handleToggleChecklistItemStatus(item.id, 'not_met')}
                          title="Mark as Not Met (✗)"
                          className={`p-2 rounded-none border text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                            item.status === 'not_met'
                              ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-950/40'
                              : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-rose-400 hover:bg-slate-800'
                          }`}
                        >
                          <X className="w-4 h-4" strokeWidth={3} />
                          <span className="sr-only">Not Met</span>
                        </button>
                      </div>
                    </div>

                    {/* Suggestion / Feedback field when Not Met */}
                    {item.status === 'not_met' && (
                      <div className="bg-rose-950/40 border border-rose-900/60 rounded-none p-3 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200 mt-2">
                        <label className="text-[11px] font-bold text-rose-300 flex items-center space-x-1">
                          <XCircle className="w-3.5 h-3.5 text-rose-400" />
                          <span>Suggestion / Reason why this item was not met:</span>
                        </label>
                        <textarea
                          rows={2}
                          value={item.suggestion}
                          onChange={(e) => handleUpdateChecklistItemSuggestion(item.id, e.target.value)}
                          placeholder={`Provide suggestion for instructor to fulfill "${item.title}"...`}
                          className="w-full bg-[#121212] border border-rose-900/60 rounded-none p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500 leading-relaxed font-mono"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Drawer Footer */}
            <div className="bg-[#212121] border-t border-slate-800 p-4 space-y-3 shrink-0">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-300">
                <span className="text-emerald-400">
                  ✓ {descriptionChecklist.filter(i => i.status === 'met').length} Met
                </span>
                <span className="text-rose-400">
                  ✗ {descriptionChecklist.filter(i => i.status === 'not_met').length} Not Met
                </span>
                <span className="text-slate-400">
                  {descriptionChecklist.filter(i => i.status === 'pending').length} Pending
                </span>
              </div>

              <button
                type="button"
                onClick={handleSubmitChecklistAudit}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-indigo-950/50 flex items-center justify-center space-x-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Submit Audit &amp; Notify Instructor</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Floating Audit Toast Notification */}
      {auditToastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 text-xs font-bold animate-in slide-in-from-bottom duration-300 border border-emerald-400">
          <CheckCircle2 className="w-5 h-5" />
          <span>{auditToastMessage}</span>
        </div>
      )}

      {/* Reviewer Checklist Modal */}
      <ReviewerGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
      />

    </div>
  );
};
