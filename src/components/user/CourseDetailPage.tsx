import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { 
  Star, 
  CheckCircle2, 
  Clock, 
  Users, 
  ShieldCheck, 
  Play, 
  FileText,
  Award, 
  BookOpen, 
  ShoppingCart, 
  Sparkles, 
  ArrowLeft,
  Share2,
  Check,
  BadgeCheck,
  ChevronRight,
  Loader2,
  Smartphone,
  Heart
} from 'lucide-react';
import { fetchCourseModulesApi, normalizeCourse, getIntendedLearnersApi, getWishlistApi, addToWishlistApi, removeFromWishlistApi, recordRecentlyViewedApi } from '../../lib/apiConfig';
import { subscriptionService } from '../../services/subscription-service';
import { CourseSubscription } from '../../types';
import { SponsoredLabel } from '../common/SponsoredLabel';

export const CourseDetailPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { courses, enrolledCourses, addToCart, enrollCourse, setCourses, formatPrice, getDiscountPercentage, currentUser, openShareCourseModal } = useApp();
  const [activeTab, setActiveTab] = useState<'overview' | 'syllabus' | 'instructor'>('overview');
  const [isLoadingModules, setIsLoadingModules] = useState(false);
  const [studentSub, setStudentSub] = useState<CourseSubscription | null>(null);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const course = courses.find(c => c.id === courseId) || courses[0];
  const isEnrolled = enrolledCourses.some(e => e.id === course?.id) || studentSub?.status === 'active';

  useEffect(() => {
    async function checkWishlist() {
      if (!courseId) return;
      try {
        const uid = currentUser?.id || 'guest';
        const wIds = await getWishlistApi(uid);
        setIsWishlisted(Array.isArray(wIds) && wIds.includes(courseId));
      } catch {
        setIsWishlisted(false);
      }
    }
    checkWishlist();
  }, [courseId, currentUser?.id]);

  const handleToggleWishlist = async () => {
    if (!courseId) return;
    const uid = currentUser?.id || 'guest';
    if (isWishlisted) {
      setIsWishlisted(false);
      await removeFromWishlistApi(uid, courseId);
    } else {
      setIsWishlisted(true);
      await addToWishlistApi(uid, courseId);
    }
  };

  // Check subscription status
  useEffect(() => {
    async function checkSubscription() {
      if (!course || !currentUser?.id) return;
      try {
        const subs = await subscriptionService.getStudentSubscriptions(currentUser.id, currentUser.email);
        if (Array.isArray(subs)) {
          const match = subs.find(s => s.courseId === course.id);
          if (match) {
            setStudentSub(match);
            if (match.status === 'active') {
              enrollCourse(course);
            }
          }
        }
      } catch {}
    }
    checkSubscription();
  }, [course, currentUser]);

  useEffect(() => {
    if (course?.id) {
      recordRecentlyViewedApi(course.id, currentUser?.id);
    }
  }, [course?.id, currentUser?.id]);

  useEffect(() => {
    if (course?.category) {
      try {
        const browsed = JSON.parse(localStorage.getItem('uqlearn_browsed_categories') || '[]');
        if (!browsed.includes(course.category)) {
          browsed.unshift(course.category);
          localStorage.setItem('uqlearn_browsed_categories', JSON.stringify(browsed.slice(0, 5)));
        }
      } catch (e) {}
    }
  }, [course]);

  useEffect(() => {
    async function loadIntendedLearnersData() {
      if (!courseId) return;
      try {
        const res = await getIntendedLearnersApi(courseId);
        const data = (res && res.data) ? res.data : null;
        if (data) {
          const objectives = data.learning_objectives || data.learningObjectives || [];
          const reqs = data.requirements || [];
          const target = data.target_learners || data.targetLearners || [];
          if (objectives.length > 0 || reqs.length > 0 || target.length > 0) {
            setCourses(prev => prev.map(c => {
              if (c.id === courseId) {
                return {
                  ...c,
                  learningObjectives: objectives.length > 0 ? objectives : c.learningObjectives,
                  whatYouWillLearn: objectives.length > 0 ? objectives : c.whatYouWillLearn,
                  requirements: reqs.length > 0 ? reqs : c.requirements,
                  targetLearners: target.length > 0 ? target : c.targetLearners
                };
              }
              return c;
            }));
          }
        }
      } catch (err) {
        console.warn('Failed to load intended learners for course', err);
      }
    }
    loadIntendedLearnersData();
  }, [courseId, setCourses]);

  useEffect(() => {
    async function loadModules() {
      if (!courseId || !course) return;
      if (course.modules && course.modules.length > 0) {
        setIsLoadingModules(false);
        return;
      }

      setIsLoadingModules(true);
      try {
        const modulesData = await fetchCourseModulesApi(courseId);
        if (modulesData && modulesData.length > 0) {
          const normalized = normalizeCourse({ ...course, modules: modulesData });
          setCourses(prev => prev.map(c => 
            c.id === courseId ? normalized : c
          ));
        }
      } catch (err) {
        console.error("Failed to load modules", err);
      } finally {
        setIsLoadingModules(false);
      }
    }
    
    loadModules();
  }, [courseId, course?.id, setCourses]);

  if (!course) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-200">Course Not Found</h2>
        <p className="text-sm text-slate-500">The course you are looking for might have been moved or removed.</p>
        <Link
          to="/courses"
          className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl shadow-md transition-all"
        >
          Browse All Courses
        </Link>
      </div>
    );
  }

  const handleShare = () => {
    openShareCourseModal(course);
  };

  const isFree = !course.price || Number(course.price) === 0;

  const handleEnrollNow = () => {
    if (isFree) {
      enrollCourse(course);
      navigate(`/learn/${course.id}`);
    } else {
      navigate(`/enroll/${course.id}`);
    }
  };

  const totalLessons = course.modules?.reduce((acc, m) => acc + m.lessons.length, 0) || 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 transition-colors">
      
      {/* Breadcrumb Navigation */}
      <div className="bg-slate-900 border-b border-slate-800 text-slate-400 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 truncate">
            <Link to="/" className="hover:text-teal-400 transition-colors">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link to="/courses" className="hover:text-teal-400 transition-colors">Courses</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link to={`/courses?category=${encodeURIComponent(course.category)}`} className="text-teal-400 font-semibold truncate hover:underline">
              {course.category}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 hidden sm:inline" />
            <span className="text-slate-300 font-bold truncate hidden sm:inline">{course.title}</span>
          </div>

          <button
            onClick={handleShare}
            className="flex items-center space-x-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-teal-400" />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Hero Header */}
      <div className="relative bg-gradient-to-r from-teal-950 via-slate-900 to-fuchsia-950 text-white py-12 sm:py-16 overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#14b8a6_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-8 space-y-5">
            <div className="flex flex-wrap items-center gap-2.5">
              {course.bestSeller && (
                <span className="px-3 py-1 rounded-full bg-amber-500 text-slate-950 text-xs font-black uppercase tracking-wider">
                  Bestseller
                </span>
              )}
              {course.isPremium && (
                <span className="px-3 py-1 rounded-full bg-purple-600 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  Premium
                </span>
              )}
              <span className="text-xs text-slate-400">Last updated {course.updatedAt}</span>
            </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                {course.title}
              </h1>
              
              <p className="text-slate-300 text-base sm:text-lg font-normal leading-relaxed">
                {course.subtitle || course.description}
              </p>

              <div className="flex flex-wrap items-center gap-6 pt-2 text-xs sm:text-sm text-slate-300">
                <div className="flex items-center text-amber-400 font-bold">
                  <Star className="w-4 h-4 fill-amber-400 mr-1.5" />
                  <span>{course.rating}</span>
                  <span className="text-slate-400 ml-1 font-normal">({course.reviewCount.toLocaleString()} ratings)</span>
                </div>
                <div className="flex items-center">
                  <Users className="w-4 h-4 text-teal-400 mr-1.5" />
                  <span>{course.learnersEnrolled.toLocaleString()} learners</span>
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 text-teal-400 mr-1.5" />
                  <span>{course.duration} on-demand video</span>
                </div>
                <div className="flex items-center space-x-2">
                  <img src={course.instructorAvatar} alt={course.instructor} className="w-5 h-5 rounded-full object-cover border border-teal-400" />
                  <span className="text-teal-300 font-semibold">{course.instructor}</span>
                  {course.isSponsored && (
                    <SponsoredLabel size="xs" className="text-slate-300 dark:text-slate-300 ml-1" />
                  )}
                </div>
              </div>
            </div>

            <div className="hidden lg:block lg:col-span-4">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-700 aspect-video group">
                <img 
                  src={course.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80'} 
                  alt={course.title} 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80';
                  }}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                />
                <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-teal-500/90 text-white flex items-center justify-center shadow-2xl backdrop-blur-xs group-hover:scale-110 transition-transform">
                    <Play className="w-7 h-7 fill-white translate-x-0.5" />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Main Details and Sticky Sidebar Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Main Course Content */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Tabs */}
            <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === 'overview'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('syllabus')}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === 'syllabus'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Course Curriculum ({course.modules?.length || 0} Modules)
              </button>
              <button
                onClick={() => setActiveTab('instructor')}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === 'instructor'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Instructor
              </button>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-8 animate-fadeIn">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Course Description</h3>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm sm:text-base whitespace-pre-line">
                    {course.description}
                  </p>
                </div>

                <div className="bg-teal-50/60 dark:bg-teal-950/30 p-8 rounded-3xl border border-teal-200/60 dark:border-teal-800/60 space-y-5">
                  <div className="flex items-center space-x-2.5">
                    <Sparkles className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    <h4 className="font-black text-slate-900 dark:text-slate-100 text-base">What you'll master in this course</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(course.learningObjectives && course.learningObjectives.length > 0
                      ? course.learningObjectives
                      : course.whatYouWillLearn && course.whatYouWillLearn.length > 0
                      ? course.whatYouWillLearn
                      : [
                          `Mastering ${course.title} core principles and advanced techniques.`,
                          `Practical implementation and hands-on projects for ${course.category || 'professional'} workflows.`,
                          'Real-world step-by-step guidance from expert instructors.',
                          'Receiving a verified certificate of completion recognized worldwide.'
                        ]
                    ).map((item, idx) => (
                      <div key={idx} className="flex items-start space-x-3 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                        <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <h4 className="font-black text-slate-900 dark:text-slate-100 text-base">Course Requirements</h4>
                  <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                    {(course.requirements && course.requirements.length > 0 ? course.requirements : [
                      'No prior specialized knowledge required to get started.',
                      'A computer or mobile device with internet access and a modern web browser.',
                      'Eagerness to learn and build practical projects step-by-step.'
                    ]).map((req, idx) => (
                      <li key={idx} className="flex items-center space-x-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Syllabus Tab */}
            {activeTab === 'syllabus' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Course Curriculum & Modules</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Explore each section layout and its scheduled lectures below</p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 rounded-xl border border-teal-200 dark:border-teal-800">
                    {course.modules?.length || 0} Sections • {totalLessons} Lectures • {course.duration}
                  </span>
                </div>

                {isLoadingModules ? (
                  <div className="py-20 flex flex-col items-center justify-center space-y-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
                    <p className="text-xs font-bold text-slate-400">Loading course modules & curriculum...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {course.modules && course.modules.length > 0 ? (
                      course.modules.map((mod, idx) => (
                        <div key={idx} className="border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm transition-all hover:border-teal-500/30">
                          {/* Section Header / Layout */}
                          <div className="bg-slate-100/90 dark:bg-slate-800/90 p-5 sm:p-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
                            <div className="flex items-center space-x-3">
                              <span className="w-8 h-8 rounded-xl bg-teal-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                                {idx + 1}
                              </span>
                              <div>
                                <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
                                  Section {idx + 1}: {mod.title}
                                </h4>
                                {mod.description && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{mod.description}</p>
                                )}
                              </div>
                            </div>
                            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-200/70 dark:bg-slate-700/70 text-slate-700 dark:text-slate-300 shrink-0">
                              {mod.lessons.length} Lectures
                            </span>
                          </div>

                          {/* Lecture Titles Below Each Curriculum Section */}
                          <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {mod.lessons.map((lesson, lIdx) => {
                              const hasVideo = !!lesson.videoUrl || !!lesson.videoPath || lesson.type === 'video' || (!lesson.type && !lesson.content);
                              return (
                                <div key={lIdx} className="p-4 sm:p-5 flex items-center justify-between text-xs sm:text-sm hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                                  <div className="flex items-center space-x-3.5">
                                    <div className={`p-2 rounded-xl shrink-0 border ${hasVideo ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-900' : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900'}`}>
                                      {hasVideo ? <Play className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                    </div>
                                    <p className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">{lesson.title}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 text-center text-slate-500 text-sm font-medium">
                        Curriculum modules and section layouts are being scheduled. Check back shortly!
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Instructor Tab */}
            {activeTab === 'instructor' && (
              <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                  <img
                    src={course.instructorAvatar}
                    alt={course.instructor}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-teal-500 shadow-md"
                  />
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">{course.instructor}</h3>
                    <p className="text-xs sm:text-sm text-teal-600 dark:text-teal-400 font-bold">{course.instructorTitle || 'Senior Instructor & Practitioner'}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 mr-1" /> {course.rating} Instructor Rating</span>
                      <span className="flex items-center"><Users className="w-3.5 h-3.5 text-teal-500 mr-1" /> {course.learnersEnrolled.toLocaleString()} Learners</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  With years of hands-on experience and a passion for learner success, {course.instructor} specializes in breaking down high-level technical concepts into clear, actionable, and project-based lessons.
                </p>
              </div>
            )}

          </div>

          {/* Sticky Purchase/Enroll Card */}
          <div className="lg:col-span-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 sticky top-24 space-y-6 shadow-xl">
              
              {/* Media image for mobile */}
              <div className="lg:hidden rounded-xl overflow-hidden aspect-video relative">
                <img 
                  src={course.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80'} 
                  alt={course.title} 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80';
                  }}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover" 
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline space-x-3">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-slate-100">
                    {formatPrice(course.price)}
                  </span>
                  {course.originalPrice && course.originalPrice > course.price && (
                    <span className="text-base sm:text-lg text-slate-400 line-through">
                      {formatPrice(course.originalPrice)}
                    </span>
                  )}
                  {course.originalPrice && course.originalPrice > course.price && (
                    <span className="text-xs font-bold text-white bg-red-600 px-2 py-0.5 rounded-md shadow-xs">
                      Save {getDiscountPercentage(course.price, course.originalPrice)}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-amber-500 font-bold flex items-center">
                  <Clock className="w-3.5 h-3.5 mr-1" /> Limited time discount pricing
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {isEnrolled ? (
                  <button
                    onClick={() => navigate(`/learn/${course.id}`)}
                    className="w-full py-4 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-2xl shadow-lg shadow-teal-500/20 text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Go to Course Player</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleEnrollNow}
                      className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-2xl shadow-xl shadow-emerald-600/25 text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.99]"
                    >
                      {isFree ? <CheckCircle2 className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                      <span>{isFree ? 'Enroll Free Course & Start Learning' : `Buy Now (${formatPrice(course.price)})`}</span>
                    </button>

                    {!isFree && (
                      <button
                        onClick={() => addToCart(course)}
                        className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-2xl text-xs transition-all flex items-center justify-center space-x-2 border border-slate-200 dark:border-slate-700 cursor-pointer"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Add to Cart</span>
                      </button>
                    )}

                    <button
                      onClick={handleToggleWishlist}
                      className="w-full py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-2xl text-xs transition-all flex items-center justify-center space-x-2 border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
                      <span>{isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}</span>
                    </button>
                  </>
                )}
              </div>

              <p className="text-[11px] text-center text-slate-500 dark:text-slate-400">
                30-Day Money-Back Guarantee • Full Lifetime Access
              </p>

              <hr className="border-slate-100 dark:border-slate-800" />

              {/* Perks Checklist */}
              <div className="space-y-3">
                <h5 className="text-xs font-black uppercase tracking-wider text-slate-400">This Course Includes</h5>
                <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                  <li className="flex items-center space-x-2.5">
                    <Play className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    <span>{course.duration} on-demand video lessons</span>
                  </li>
                  <li className="flex items-center space-x-2.5">
                    <BookOpen className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    <span>Interactive quizzes and downloadable source code</span>
                  </li>
                  <li className="flex items-center space-x-2.5">
                    <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    <span>Full lifetime access on mobile & desktop</span>
                  </li>
                  <li className="flex items-center space-x-2.5">
                    <Award className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    <span>Verified certificate of completion</span>
                  </li>
                </ul>
              </div>

            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
