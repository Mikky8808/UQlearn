import React, { useState, useMemo, useEffect } from 'react';
import { 
  Sliders, 
  Layers, 
  BookOpen, 
  Settings, 
  Settings2,
  ShieldCheck, 
  DollarSign, 
  Video, 
  Percent, 
  CheckCircle2, 
  Save, 
  AlertCircle,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Filter,
  Edit3,
  Star,
  Award,
  X,
  Trash2,
  Lock,
  Send,
  Tag,
  Users,
  ArrowLeft,
  ChevronRight,
  Loader2,
  Scale
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Course } from '../../types';
import { AdminCourseCategoriesTab } from './AdminCourseCategoriesTab';
import { AdminCourseManagePage } from './AdminCourseManagePage';
import { AdminPriceAdjustmentNoticesTab } from './AdminPriceAdjustmentNoticesTab';
import { apiFetch, API_BASE_URL } from '../../lib/apiConfig';
import { DataNotFound } from '../common/DataNotFound';
import { SignaturePad } from '../common/SignaturePad';
import { ReviewDetailModal } from '../reviews/ReviewDetailModal';
import { ReviewAppealModal } from '../reviews/ReviewAppealModal';
import { currencyUtils } from '../../utils/currencyUtils';

interface AdminCoursesConfigTabProps {
  courses: Course[];
  initialSubTab?: 'categories' | 'catalog' | 'rules' | 'notices' | 'learner-reviews';
  onNavigateToTab?: (tab: string) => void;
  onManageCourse?: (course: Course) => void;
}

export const AdminCoursesConfigTab: React.FC<AdminCoursesConfigTabProps> = ({
  courses,
  initialSubTab = 'categories',
  onNavigateToTab,
  onManageCourse,
}) => {
  const { courseConfig, updateCourseConfig, categories, updateCourse, deleteCourse, sendInstructorNotification, instructorNotifications, courseDefaultThumbnail, currentUser, selectedCurrency } = useApp();
  const appealFeeText = currencyUtils.getAppealFeeFormatted(
    selectedCurrency?.code,
    selectedCurrency?.rate,
    selectedCurrency?.symbol
  );
  const [activeSubTab, setActiveSubTab] = useState<'categories' | 'catalog' | 'rules' | 'notices' | 'learner-reviews'>(initialSubTab as any);

  const pendingNoticesCount = (instructorNotifications || []).filter(
    n => n.type === 'price_adjustment' && (!n.status || n.status === 'pending')
  ).length;

  // Local draft of course config settings
  const [configDraft, setConfigDraft] = useState({ ...courseConfig });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [catalogSearch, setCatalogSearch] = useState<string>('');

  // Learner reviews drilldown state
  const [selectedInstructorName, setSelectedInstructorName] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [reviewsList, setReviewsList] = useState<any[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  // Fetch all reviews when learner-reviews subtab is opened
  useEffect(() => {
    if (activeSubTab === 'learner-reviews') {
      const fetchReviews = async () => {
        setIsLoadingReviews(true);
        try {
          const res = await apiFetch('course-ratings.php');
          if (res && res.success && Array.isArray(res.data)) {
            setReviewsList(res.data);
          } else if (Array.isArray(res)) {
            setReviewsList(res);
          }
        } catch (e) {
          console.warn('Failed to load reviews for admin courses tab:', e);
        } finally {
          setIsLoadingReviews(false);
        }
      };
      fetchReviews();
    }
  }, [activeSubTab]);

  // Group instructors and their courses/reviews
  const instructorGroup = useMemo(() => {
    const instructorsMap: Record<string, { name: string; courses: Course[]; reviewsCount: number }> = {};
    
    courses.forEach(c => {
      const name = c.instructor || 'Lead Instructor';
      if (!instructorsMap[name]) {
        instructorsMap[name] = { name, courses: [], reviewsCount: 0 };
      }
      instructorsMap[name].courses.push(c);
    });

    reviewsList.forEach(r => {
      const matchedCourse = courses.find(c => c.id === r.course_id);
      const name = matchedCourse ? (matchedCourse.instructor || 'Lead Instructor') : 'Lead Instructor';
      if (!instructorsMap[name]) {
        instructorsMap[name] = { name, courses: [], reviewsCount: 0 };
      }
      instructorsMap[name].reviewsCount += 1;
    });

    return Object.values(instructorsMap);
  }, [courses, reviewsList]);

  const activeInstructorObj = useMemo(() => {
    if (!selectedInstructorName) return null;
    return instructorGroup.find(i => i.name === selectedInstructorName) || {
      name: selectedInstructorName,
      courses: courses.filter(c => (c.instructor || 'Lead Instructor') === selectedInstructorName),
      reviewsCount: reviewsList.filter(r => {
        const matchedCourse = courses.find(c => c.id === r.course_id);
        return (matchedCourse?.instructor || 'Lead Instructor') === selectedInstructorName;
      }).length
    };
  }, [selectedInstructorName, instructorGroup, courses, reviewsList]);

  const activeCourseObj = useMemo(() => {
    if (!selectedCourseId) return null;
    return courses.find(c => c.id === selectedCourseId) || null;
  }, [selectedCourseId, courses]);

  const courseReviewsList = useMemo(() => {
    if (!selectedCourseId) return [];
    return reviewsList.filter(r => r.course_id === selectedCourseId);
  }, [selectedCourseId, reviewsList]);

  // Review Inspection & Appeal Modal states
  const [selectedDetailReview, setSelectedDetailReview] = useState<any | null>(null);
  const [selectedAppealReview, setSelectedAppealReview] = useState<any | null>(null);

  // Handle deleting a student review
  const handleDeleteReview = async (reviewId: string, studentName: string) => {
    if (!window.confirm(`Are you sure you want to delete the review submitted by "${studentName || 'Learner'}"?`)) {
      return;
    }

    try {
      await apiFetch('course-ratings.php', {
        method: 'POST',
        body: JSON.stringify({
          action: 'delete',
          id: reviewId,
          review_id: reviewId
        })
      });

      await apiFetch(`course-ratings.php?id=${encodeURIComponent(reviewId)}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.warn('Review delete request:', e);
    } finally {
      setReviewsList(prev => prev.filter(r => String(r.id) !== String(reviewId)));
    }
  };

  const handleAppealSubmitted = (reviewId: string, appealData: any) => {
    setReviewsList(prev => prev.map(r => {
      if (String(r.id) === String(reviewId)) {
        return {
          ...r,
          status: 'appealed_pending_review',
          appeal_clause: appealData.clause
        };
      }
      return r;
    }));
  };

  // Course editing state for standalone fallback
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const handleOpenEdit = (c: Course) => {
    if (onManageCourse) {
      onManageCourse(c);
      return;
    }
    setEditingCourse(c);
  };

  const handleDeleteCourse = async (courseId: string, courseTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete "${courseTitle}"? This will remove inappropriate content permanently.`)) {
      return;
    }
    await deleteCourse(courseId);
    if (editingCourse?.id === courseId) {
      setEditingCourse(null);
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updateCourseConfig(configDraft);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  // If managing/editing a course, display the dedicated full-page AdminCourseManagePage view
  if (editingCourse) {
    return (
      <AdminCourseManagePage
        course={editingCourse}
        onBack={() => setEditingCourse(null)}
        onCourseDeleted={() => setEditingCourse(null)}
        onCourseUpdated={(updated) => setEditingCourse(updated)}
      />
    );
  }

  // Filtered courses for catalog tab
  const filteredCourses = courses.filter(c => {
    const matchesCat = selectedCategoryFilter === 'all' || c.category === selectedCategoryFilter;
    const matchesQuery = !catalogSearch || 
      c.title.toLowerCase().includes(catalogSearch.toLowerCase()) || 
      c.instructor.toLowerCase().includes(catalogSearch.toLowerCase());
    return matchesCat && matchesQuery;
  });

  // If activeSubTab is 'learner-reviews', render ONLY the Learner Reviews view directly, fitting the page clean and full-width!
  if (activeSubTab === 'learner-reviews') {
    return (
      <div className="space-y-6 animate-fadeIn">
        {/* LEVEL 1: INSTRUCTORS LIST */}
        {!selectedInstructorName && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-xs">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-bold mb-2">
                <Users className="w-3.5 h-3.5" />
                <span>Learner Reviews Directory</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Select an Instructor</h2>
              <p className="text-xs text-slate-500 mt-1">
                Select an instructor below to explore their published courses, ratings, and student feedback reviews.
              </p>
            </div>

            {isLoadingReviews ? (
              <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-rose-600" />
                <span>Loading instructors & student reviews...</span>
              </div>
            ) : instructorGroup.length === 0 ? (
              <DataNotFound
                title="No Instructors Found"
                message="No active instructor accounts were found in the database."
                icon={Users}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {instructorGroup.map((inst, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedInstructorName(inst.name)}
                    className="p-5 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-md transition-all cursor-pointer group space-y-4 flex flex-col justify-between"
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-indigo-600 text-white font-black flex items-center justify-center text-sm shadow-sm group-hover:scale-105 transition-transform">
                        {inst.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                          {inst.name}
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium">Instructor</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-600 dark:text-slate-400">
                        {inst.courses.length} Course{inst.courses.length !== 1 ? 's' : ''}
                      </span>
                      <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold text-[10px] rounded-full border border-amber-200/60 dark:border-amber-800/40 flex items-center space-x-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{inst.reviewsCount} Review{inst.reviewsCount !== 1 ? 's' : ''}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-end text-xs font-bold text-rose-600 dark:text-rose-400 group-hover:translate-x-1 transition-transform">
                      <span>View Courses</span>
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* LEVEL 2: INSTRUCTOR'S COURSES */}
        {selectedInstructorName && !selectedCourseId && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-xs">
            {/* Breadcrumb Header */}
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-400">
                  <button 
                    onClick={() => setSelectedInstructorName(null)}
                    className="hover:text-rose-600 cursor-pointer transition-colors"
                  >
                    Instructors
                  </button>
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span className="text-rose-600 dark:text-rose-400">{selectedInstructorName}</span>
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                  Courses by {selectedInstructorName}
                </h2>
              </div>

              <button
                onClick={() => setSelectedInstructorName(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Instructors</span>
              </button>
            </div>

            {activeInstructorObj?.courses.length === 0 ? (
              <DataNotFound
                title="No Courses Found"
                message={`No published courses found for ${selectedInstructorName}.`}
                icon={BookOpen}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {activeInstructorObj?.courses.map((course) => {
                  const reviewsForThisCourse = reviewsList.filter(r => r.course_id === course.id);
                  const avgRatingNum = reviewsForThisCourse.length > 0
                    ? (reviewsForThisCourse.reduce((acc, curr) => acc + Number(curr.rating || 5), 0) / reviewsForThisCourse.length).toFixed(1)
                    : course.rating || '5.0';

                  return (
                    <div
                      key={course.id}
                      onClick={() => setSelectedCourseId(course.id)}
                      className="bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer group space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <img
                          src={course.image || courseDefaultThumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80'}
                          alt={course.title}
                          className="w-full h-32 rounded-xl object-cover bg-slate-200 dark:bg-slate-700"
                        />
                        <div>
                          <span className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400">
                            {course.category}
                          </span>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-2 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                            {course.title}
                          </h3>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-1 text-amber-500 font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{avgRatingNum}</span>
                          <span className="text-slate-400 font-normal">({reviewsForThisCourse.length})</span>
                        </div>

                        <div className="flex items-center text-xs font-bold text-rose-600 dark:text-rose-400 group-hover:translate-x-1 transition-transform">
                          <span>Open Reviews</span>
                          <ChevronRight className="w-4 h-4 ml-0.5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* LEVEL 3: SPECIFIC COURSE REVIEWS & RATINGS */}
        {selectedCourseId && activeCourseObj && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-xs">
            {/* Breadcrumb Header */}
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center space-x-2 text-xs font-bold text-slate-400">
                  <button 
                    onClick={() => {
                      setSelectedInstructorName(null);
                      setSelectedCourseId(null);
                    }}
                    className="hover:text-rose-600 cursor-pointer transition-colors"
                  >
                    Instructors
                  </button>
                  <ChevronRight className="w-3.5 h-3.5" />
                  <button 
                    onClick={() => setSelectedCourseId(null)}
                    className="hover:text-rose-600 cursor-pointer transition-colors"
                  >
                    {selectedInstructorName}
                  </button>
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span className="text-rose-600 dark:text-rose-400 line-clamp-1">{activeCourseObj.title}</span>
                </div>

                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                  Reviews & Ratings
                </h2>
              </div>

              <button
                onClick={() => setSelectedCourseId(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Courses</span>
              </button>
            </div>

            {/* Course Detail Banner Header */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-900 to-indigo-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
              <div className="flex items-center space-x-4">
                <img
                  src={activeCourseObj.image || courseDefaultThumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80'}
                  alt={activeCourseObj.title}
                  className="w-16 h-16 rounded-xl object-cover border-2 border-white/20 shrink-0"
                />
                <div>
                  <span className="text-[10px] font-black uppercase text-rose-300 tracking-wider">
                    {activeCourseObj.category}
                  </span>
                  <h3 className="text-base font-bold text-white leading-snug">
                    {activeCourseObj.title}
                  </h3>
                  <p className="text-xs text-rose-200 mt-0.5">
                    Instructor: {activeCourseObj.instructor || selectedInstructorName}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 bg-white/10 px-4 py-2.5 rounded-xl border border-white/10 shrink-0">
                <div className="text-right">
                  <span className="text-lg font-black text-amber-300 flex items-center justify-end space-x-1">
                    <span>{courseReviewsList.length > 0 ? (courseReviewsList.reduce((acc, curr) => acc + Number(curr.rating || 5), 0) / courseReviewsList.length).toFixed(1) : '5.0'}</span>
                    <Star className="w-4 h-4 fill-amber-300 text-amber-300 inline" />
                  </span>
                  <span className="text-[10px] text-rose-200 font-medium">
                    {courseReviewsList.length} Total Review{courseReviewsList.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Student Reviews List */}
            <div className="space-y-4 pt-2">
              {courseReviewsList.length === 0 ? (
                <DataNotFound
                  title="No Reviews Submitted Yet"
                  message={`No student evaluations have been recorded for "${activeCourseObj.title}" yet.`}
                  icon={Star}
                />
              ) : (
                courseReviewsList.map((review) => {
                  const ratingNum = Number(review.rating) || 5;
                  const sentimentText = ratingNum >= 4 ? 'Positive' : 'Constructive';
                  const sentimentColor = ratingNum >= 4 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40' 
                    : 'bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40';

                  const hasFeedback = Boolean(review.feedback && review.feedback.trim());
                  const feedbackText = hasFeedback ? review.feedback.trim() : 'no feedback';

                  return (
                    <div 
                      key={review.id} 
                      className="p-5 rounded-md border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div 
                          onClick={() => setSelectedDetailReview({ ...review, course_title: activeCourseObj.title })}
                          className="flex items-center space-x-3 cursor-pointer group hover:opacity-90"
                        >
                          <div className="w-10 h-10 rounded-md bg-gradient-to-br from-rose-500 to-indigo-600 text-white font-black flex items-center justify-center text-xs shadow-xs shrink-0">
                            {(review.student_name || 'L').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors flex items-center space-x-1.5">
                              <span>{review.student_name || 'Learner'}</span>
                              <span className="text-[10px] text-rose-500 font-semibold">(Click for details)</span>
                            </h4>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                              Submitted {review.created_at ? new Date(review.created_at).toLocaleDateString() : 'Recently'}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <div className="flex items-center space-x-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3.5 h-3.5 ${
                                  star <= ratingNum
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-slate-200 dark:text-slate-700 fill-transparent'
                                }`}
                              />
                            ))}
                          </div>
                          <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-md tracking-wide ${sentimentColor}`}>
                            {sentimentText}
                          </span>

                          {/* Hide / Appeal Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedAppealReview({ ...review, course_title: activeCourseObj.title })}
                            className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-300 font-bold text-[10px] rounded-md border border-amber-200 dark:border-amber-800 transition-all cursor-pointer flex items-center space-x-1"
                            title={`Hide feedback and submit official appeal (${appealFeeText} fee)`}
                          >
                            <Scale className="w-3 h-3 text-amber-600" />
                            <span>Hide Feedback / Appeal ({appealFeeText})</span>
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteReview(review.id, review.student_name)}
                            className="p-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/80 text-rose-600 dark:text-rose-300 rounded-md transition-all cursor-pointer border border-rose-200/60 dark:border-rose-800/40 flex items-center space-x-1 shrink-0 ml-1"
                            title="Delete this review"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                            <span className="text-[10px] font-bold hidden sm:inline">Delete</span>
                          </button>
                        </div>
                      </div>

                      <div 
                        onClick={() => setSelectedDetailReview({ ...review, course_title: activeCourseObj.title })}
                        className="pt-0.5 cursor-pointer"
                      >
                        <p className={`text-xs sm:text-sm leading-relaxed ${
                          hasFeedback 
                            ? 'text-slate-800 dark:text-slate-200 font-medium' 
                            : 'text-slate-400 dark:text-slate-500 italic'
                        }`}>
                          {feedbackText}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Review Detail Inspection Modal */}
        <ReviewDetailModal
          isOpen={Boolean(selectedDetailReview)}
          onClose={() => setSelectedDetailReview(null)}
          review={selectedDetailReview}
          onDeleteReview={handleDeleteReview}
          onAppealSubmitted={handleAppealSubmitted}
        />

        {/* Review Appeal & $0.55 Fee Policy Modal */}
        <ReviewAppealModal
          isOpen={Boolean(selectedAppealReview)}
          onClose={() => setSelectedAppealReview(null)}
          review={selectedAppealReview}
          onAppealSubmitted={handleAppealSubmitted}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header Card with Submenu Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-2xl border border-rose-200 dark:border-rose-800 shrink-0">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Courses Configuration
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage course taxonomy, category hierarchies, pricing thresholds, and publishing policies.
              </p>
            </div>
          </div>
        </div>

        {/* Submenu Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveSubTab('categories')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
              activeSubTab === 'categories'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Course Categories</span>
            <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md ${
              activeSubTab === 'categories' ? 'bg-rose-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {categories.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('catalog')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
              activeSubTab === 'catalog'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Course Moderation</span>
            <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md ${
              activeSubTab === 'catalog' ? 'bg-rose-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {courses.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('rules')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
              activeSubTab === 'rules'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Global Course Rules</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('notices')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
              activeSubTab === 'notices'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80'
            }`}
          >
            <Tag className="w-4 h-4 text-amber-300" />
            <span>Price Notices</span>
            {pendingNoticesCount > 0 ? (
              <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-amber-500 text-slate-950 animate-pulse">
                {pendingNoticesCount}
              </span>
            ) : (
              <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {(instructorNotifications || []).filter(n => n.type === 'price_adjustment').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* SUB-VIEW 1: COURSE CATEGORIES */}
      {activeSubTab === 'categories' && (
        <AdminCourseCategoriesTab 
          courses={courses} 
          onSelectCategoryFilter={(cat) => {
            setSelectedCategoryFilter(cat);
            setActiveSubTab('catalog');
          }}
        />
      )}

      {/* SUB-VIEW 2: COURSE CATALOG & CATEGORY MAPPING */}
      {activeSubTab === 'catalog' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                Course Catalog & Category Moderation
              </h3>
              <p className="text-xs text-slate-500">
                Inspect courses assigned under each taxonomy category.
              </p>
            </div>

            <div className="flex items-center space-x-2.5">
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-500"
              >
                <option value="all">All Categories ({courses.length})</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name} ({courses.filter(c => c.category === cat.name).length})
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Filter courses..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-rose-500 font-medium"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4 rounded-l-xl">Course Title & Media</th>
                  <th className="py-3 px-4">Assigned Category</th>
                  <th className="py-3 px-4">Instructor</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Learners Enrolled</th>
                  <th className="py-3 px-4 rounded-r-xl text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCourses.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 flex items-center space-x-3">
                      <img 
                        src={c.image} 
                        alt={c.title}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80'; }}
                        className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0" 
                        referrerPolicy="no-referrer"
                      />
                      <div className="max-w-xs">
                        <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{c.title}</p>
                        <p className="text-[10px] text-slate-400 font-mono">ID: {c.id}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {c.bestSeller && <span className="px-1.5 py-0.2 bg-amber-500 text-white text-[8px] font-black rounded uppercase">Best Seller</span>}
                          {c.isPremium && <span className="px-1.5 py-0.2 bg-purple-600 text-white text-[8px] font-black rounded uppercase">Premium</span>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg text-[10px] font-extrabold">
                        {c.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                      {c.instructor}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                      ${c.price}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-semibold">
                      {(c.learnersEnrolled || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-md text-[10px] font-bold">
                          Published
                        </span>
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded-lg text-[10px] font-extrabold transition-colors flex items-center space-x-1 cursor-pointer border border-rose-200/60 dark:border-rose-900/40"
                          title="Manage course ratings, badges, and quick actions"
                        >
                          <Settings2 className="w-3 h-3" />
                          <span>Manage</span>
                        </button>
                        <button
                          onClick={() => handleDeleteCourse(c.id, c.title)}
                          className="p-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-lg transition-colors cursor-pointer"
                          title="Delete inappropriate content"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: GLOBAL RULES & CONFIGURATION */}
      {activeSubTab === 'rules' && (
        <form onSubmit={handleSaveConfig} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
          
          {savedSuccess && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center space-x-3 text-emerald-900 dark:text-emerald-200 shadow-sm animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <span className="text-xs font-bold">Course configuration rules saved successfully to platform runtime!</span>
            </div>
          )}

          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
              Global Course Publishing & Monetization Rules
            </h3>
            <p className="text-xs text-slate-500">
              Configure baseline commission payouts, price floors, video constraints, and AI curriculum checks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Revenue Commission Settings */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-4">
              <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400">
                <Percent className="w-5 h-5" />
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Platform Commission Split
                </h4>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Default Platform Fee Percentage (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={configDraft.defaultCommissionRate}
                    onChange={(e) => setConfigDraft(prev => ({ ...prev, defaultCommissionRate: Number(e.target.value) }))}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:border-rose-500 focus:outline-none"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Instructor retains {100 - (configDraft.defaultCommissionRate || 0)}% of organic sales.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Minimum Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={configDraft.minimumPrice}
                    onChange={(e) => setConfigDraft(prev => ({ ...prev, minimumPrice: Number(e.target.value) }))}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Maximum Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={configDraft.maximumPrice}
                    onChange={(e) => setConfigDraft(prev => ({ ...prev, maximumPrice: Number(e.target.value) }))}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Publishing & Moderation */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-4">
              <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
                <ShieldCheck className="w-5 h-5" />
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Quality Audit & Publishing Workflows
                </h4>
              </div>

              <label className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                    Auto-Publish New Courses
                  </span>
                  <span className="text-[10px] text-slate-500">
                    If disabled, instructor submissions require admin approval.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={configDraft.autoPublish}
                  onChange={(e) => setConfigDraft(prev => ({ ...prev, autoPublish: e.target.checked }))}
                  className="w-4 h-4 text-rose-600 rounded-md focus:ring-rose-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                    AI Curriculum Quality Audit
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Check video length, objectives, and quiz coverage automatically.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={configDraft.requireAiAudit}
                  onChange={(e) => setConfigDraft(prev => ({ ...prev, requireAiAudit: e.target.checked }))}
                  className="w-4 h-4 text-rose-600 rounded-md focus:ring-rose-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                    Allow Free Courses ($0.00)
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Enable promotional free enrollment courses on platform.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={configDraft.allowFreeCourses}
                  onChange={(e) => setConfigDraft(prev => ({ ...prev, allowFreeCourses: e.target.checked }))}
                  className="w-4 h-4 text-rose-600 rounded-md focus:ring-rose-500"
                />
              </label>
            </div>

            {/* Video & Media Storage Limits */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-4 md:col-span-2">
              <div className="flex items-center space-x-2 text-teal-600 dark:text-teal-400">
                <Video className="w-5 h-5" />
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Lecture Video Constraints & Formats
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Max Video File Size (MB per lecture)
                  </label>
                  <input
                    type="number"
                    value={configDraft.maxVideoSizeMb}
                    onChange={(e) => setConfigDraft(prev => ({ ...prev, maxVideoSizeMb: Number(e.target.value) }))}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:border-rose-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Recommended 500MB for shared PHP host bandwidth preservation.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Allowed Formats (Comma Separated)
                  </label>
                  <input
                    type="text"
                    value={(configDraft.allowedVideoFormats || []).join(', ')}
                    onChange={(e) => setConfigDraft(prev => ({ ...prev, allowedVideoFormats: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-4 md:col-span-2">
              <div className="flex items-center space-x-2 text-teal-600 dark:text-teal-400">
                <Award className="w-5 h-5" />
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  CEO Certificate Signature
                </h4>
              </div>
              <SignaturePad 
                userId="ceo"
                initialSignature={configDraft.ceoSignature}
                title="CEO Official Certificate Signature"
                signerName={configDraft.ceoName || 'SIR, RAJAB WAMUU'}
                signerTitle={configDraft.ceoTitle || 'CEO UQLEARN'}
                onSave={(data) => setConfigDraft(prev => ({ ...prev, ceoSignature: data }))}
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center space-x-2 transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Course Configuration</span>
            </button>
          </div>

        </form>
      )}

      {/* SUB-VIEW 4: PRICE ADJUSTMENT NOTICES */}
      {activeSubTab === 'notices' && (
        <AdminPriceAdjustmentNoticesTab
          onManageCourse={handleOpenEdit}
          onNavigateToCatalog={() => setActiveSubTab('catalog')}
        />
      )}

    </div>
  );
};
