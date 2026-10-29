import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { 
  Star, 
  CheckCircle2, 
  Clock, 
  Users, 
  Play, 
  Award, 
  BookOpen, 
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
  BadgeCheck
} from 'lucide-react';
import { fetchCourseModulesApi, normalizeCourse, getIntendedLearnersApi, recordRecentlyViewedApi, getCourseLearnersApi } from '../../lib/apiConfig';
import { resolveImageUrl } from '../../lib/branding';
import { subscriptionService } from '../../services/subscription-service';
import { CourseSubscription } from '../../types';

export const CourseDetailPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { courses, enrolledCourses, addToCart, enrollCourse, setCourses, formatPrice, currentUser, openShareCourseModal } = useApp();
  const [isLoadingModules, setIsLoadingModules] = useState(false);
  const [hasAttemptedLoadModules, setHasAttemptedLoadModules] = useState(false);
  const [studentSub, setStudentSub] = useState<CourseSubscription | null>(null);
  const [expandedModules, setExpandedModules] = useState<Record<number, boolean>>({ 0: true });
  const [realLearnersCount, setRealLearnersCount] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const course = courses.find(c => c.id === courseId) || courses[0];
  const isEnrolled = enrolledCourses.some(e => e.id === course?.id) || studentSub?.status === 'active';

  useEffect(() => {
    let isMounted = true;
    async function fetchLearnersCount() {
      if (!courseId) return;
      try {
        const res = await getCourseLearnersApi(courseId);
        if (isMounted && res) {
          const count = typeof res.data?.learners === 'number' ? res.data.learners : typeof res.learners === 'number' ? res.learners : null;
          if (count !== null) {
            setRealLearnersCount(count);
            setCourses(prev => prev.map(c => c.id === courseId ? { ...c, learnersEnrolled: count, learners_enrolled: count, students_enrolled: count } : c));
          }
        }
      } catch (err) {
        console.warn("Failed to fetch course learners:", err);
      }
    }
    fetchLearnersCount();
    return () => { isMounted = false; };
  }, [courseId, setCourses]);

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

  useEffect(() => {
    async function loadIntendedLearnersData() {
      if (!courseId) return;
      try {
        const res = await getIntendedLearnersApi(courseId);
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
      } catch (err) { console.warn(err); }
    }
    loadIntendedLearnersData();
  }, [courseId, setCourses]);

  useEffect(() => {
    let isMounted = true;
    async function loadModules() {
      if (!courseId || !course || hasAttemptedLoadModules || (course.modules && course.modules.length > 0)) return;
      setIsLoadingModules(true);
      try {
        const res = await fetchCourseModulesApi(courseId);
        const modulesData = Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : null);
        if (isMounted && modulesData && modulesData.length > 0) {
          setCourses(prev => prev.map(c => c.id === courseId ? normalizeCourse({ ...course, modules: modulesData }) : c));
        }
      } catch (err) {
        console.warn("Could not load modules", err);
      } finally {
        if (isMounted) {
          setIsLoadingModules(false);
          setHasAttemptedLoadModules(true);
        }
      }
    }
    loadModules();
    return () => { isMounted = false; };
  }, [courseId, course?.id, hasAttemptedLoadModules, setCourses]);

  if (!course) return null;

  const isFree = !course.price || Number(course.price) === 0;
  const handleEnrollNow = () => {
    if (isEnrolled) {
      navigate(`/learn/${course.id}`);
    } else if (isFree) {
      enrollCourse(course);
      navigate(`/learn/${course.id}`);
    } else {
      navigate(`/enroll/${course.id}`);
    }
  };

  const handleShare = () => openShareCourseModal(course);

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Robust default fallbacks for content display
  const learningObjectives = (course.learningObjectives && course.learningObjectives.length > 0)
    ? course.learningObjectives
    : [
        `Master essential principles and practical techniques in ${course.title}`,
        `Apply core methodologies to solve real-world industry challenges`,
        `Build hands-on projects and portfolio-ready solutions`,
        `Develop best practices and workflows for efficient execution`
      ];

  const requirements = (course.requirements && course.requirements.length > 0)
    ? course.requirements
    : [
        'No prior specialized knowledge required - open to all background levels',
        'A computer, tablet, or smartphone with an active internet connection',
        'Enthusiasm and motivation to learn and practice new skills'
      ];

  const displayModules: Array<{ id: string; title: string; lessons: Array<{ id: string; title: string; duration?: string }> }> = (course.modules && course.modules.length > 0)
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

  return (
    <div className="min-h-screen bg-white pb-24 text-slate-800 font-sans">
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
                            {mod.lessons.map((lesson, lIdx) => (
                              <div key={lesson.id || lIdx} className="p-3.5 pl-10 flex items-center justify-between text-xs sm:text-sm text-slate-700 hover:bg-slate-50">
                                <div className="flex items-center space-x-3 truncate pr-4">
                                  <Play className="w-4 h-4 text-slate-400 shrink-0" />
                                  <span className="truncate">{lesson.title}</span>
                                </div>
                                <span className="text-xs text-slate-500 shrink-0">{lesson.duration || '10:00'}</span>
                              </div>
                            ))}
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

            {/* 6. Share via Socials Section (ICONS ONLY - NO SURROUNDING CARD) */}
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
                    <li className="flex items-center space-x-2.5">
                      <Play className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>{course.duration || 'Full lifetime'} on-demand video</span>
                    </li>
                    <li className="flex items-center space-x-2.5">
                      <BookOpen className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>Full lifetime access</span>
                    </li>
                    <li className="flex items-center space-x-2.5">
                      <Award className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>Certificate of completion</span>
                    </li>
                  </ul>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

