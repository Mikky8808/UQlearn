import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  Activity, 
  Award, 
  Star, 
  BarChart2, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  MessageSquare,
  ThumbsUp,
  Flame,
  Search,
  Filter,
  Loader2,
  CornerDownRight,
  Scale,
  Trash2,
  ChevronRight,
  EyeOff
} from 'lucide-react';
import { Course } from '../../types';
import { InstructorTabKey } from '../navigation/InstructorSidebar';
import { DataNotFound } from '../common/DataNotFound';
import { apiFetch } from '../../lib/apiConfig';
import { useApp } from '../../context/AppContext';
import { apiClient } from '../../lib/api';
import { ReviewDetailModal } from '../reviews/ReviewDetailModal';
import { ReviewAppealModal } from '../reviews/ReviewAppealModal';
import { currencyUtils } from '../../utils/currencyUtils';
import { currencyService } from '../../services/currency-service';
import { ALL_CURRENCIES } from '../../lib/currencies';

interface AnalyticsViewsProps {
  tab: InstructorTabKey;
  courses: Course[];
}

export const InstructorAnalyticsViews: React.FC<AnalyticsViewsProps> = ({
  tab,
  courses,
}) => {
  const { currentUser, selectedCurrency, setSelectedCurrency } = useApp();
  const [activeCurrencyCode, setActiveCurrencyCode] = useState<string>(() => {
    return selectedCurrency?.code || (typeof localStorage !== 'undefined' ? (localStorage.getItem('uqlearn_system_currency') || 'KES') : 'KES');
  });
  const [activeCurrencyRate, setActiveCurrencyRate] = useState<number | undefined>(selectedCurrency?.rate);
  const [activeCurrencySymbol, setActiveCurrencySymbol] = useState<string | undefined>(selectedCurrency?.symbol);

  // Sync active currency with server preference & cross-component change events
  useEffect(() => {
    let isMounted = true;
    currencyService.getSystemCurrency(currentUser?.id || 'current-user').then(res => {
      if (!isMounted) return;
      if (res.preference) {
        setActiveCurrencyCode(res.preference);
        const match = ALL_CURRENCIES.find(c => c.code === res.preference);
        if (match) {
          setActiveCurrencyRate(match.exchange_rate);
          setActiveCurrencySymbol(match.symbol);
          if (setSelectedCurrency && (!selectedCurrency || selectedCurrency.code !== match.code)) {
            setSelectedCurrency({
              code: match.code,
              symbol: match.symbol,
              name: match.name,
              rate: match.exchange_rate || 1
            });
          }
        }
      }
    }).catch(() => {});

    const handleCurEvent = (e: any) => {
      const code = e?.detail?.currency;
      if (code) {
        setActiveCurrencyCode(code);
        const match = ALL_CURRENCIES.find(c => c.code === code);
        if (match) {
          setActiveCurrencyRate(match.exchange_rate);
          setActiveCurrencySymbol(match.symbol);
        }
      }
    };
    window.addEventListener('uqlearn_currency_changed', handleCurEvent);
    return () => {
      isMounted = false;
      window.removeEventListener('uqlearn_currency_changed', handleCurEvent);
    };
  }, [currentUser?.id]);

  useEffect(() => {
    if (selectedCurrency?.code) {
      setActiveCurrencyCode(selectedCurrency.code);
      setActiveCurrencyRate(selectedCurrency.rate);
      setActiveCurrencySymbol(selectedCurrency.symbol);
    }
  }, [selectedCurrency?.code, selectedCurrency?.rate, selectedCurrency?.symbol]);

  const appealFeeText = currencyUtils.getAppealFeeFormatted(
    activeCurrencyCode,
    activeCurrencyRate,
    activeCurrencySymbol
  );
  const [selectedCourse, setSelectedCourse] = useState('All');
  const [reviewFilter, setReviewFilter] = useState<'All' | '5' | '4' | '3' | '2' | '1'>('All');

  // Filters for Q&A questions inside Quiz Performance
  const [courseFilter, setCourseFilter] = useState('All');
  const [sortFilter, setSortFilter] = useState('newest');
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [submittingReplyId, setSubmittingReplyId] = useState<string | null>(null);

  // Real learner progress state loaded dynamically from backend MySQL database via PHP API
  const [realProgressList, setRealProgressList] = useState<any[]>([]);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);

  // Dynamic learner ratings/reviews loaded from backend course-ratings.php database table
  const [realReviews, setRealReviews] = useState<any[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  // Review Inspection & Appeal Modal states
  const [selectedDetailReview, setSelectedDetailReview] = useState<any | null>(null);
  const [selectedAppealReview, setSelectedAppealReview] = useState<any | null>(null);

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
      setRealReviews(prev => prev.filter(r => String(r.id) !== String(reviewId)));
    }
  };

  const handleAppealSubmitted = (reviewId: string, appealData: any) => {
    setRealReviews(prev => prev.map(r => {
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

  useEffect(() => {
    if (tab === 'reviews') {
      const fetchRealReviews = async () => {
        setIsLoadingReviews(true);
        try {
          const res = await apiFetch('course-ratings.php');
          if (res && res.success && Array.isArray(res.data)) {
            setRealReviews(res.data);
          }
        } catch (e) {
          console.warn('[InstructorAnalytics] Failed to fetch learner reviews:', e);
        } finally {
          setIsLoadingReviews(false);
        }
      };
      fetchRealReviews();
    }
  }, [tab]);

  const filteredReviews = useMemo(() => {
    let result = [...realReviews];
    if (reviewFilter !== 'All') {
      const targetRating = Number(reviewFilter);
      result = result.filter(r => Number(r.rating) === targetRating);
    }
    return result;
  }, [realReviews, reviewFilter]);

  // Dynamic Q&A questions loaded from backend qna.php database table
  const [qnaQuestions, setQnaQuestions] = useState<any[]>([]);
  const [isLoadingQna, setIsLoadingQna] = useState(false);

  // Function to reply direct to a student question and reflect instantly on Q&A
  const handleAddReply = async (questionId: string, courseId: string) => {
    const text = replyInputs[questionId]?.trim();
    if (!text) return;

    setSubmittingReplyId(questionId);
    try {
      // 1. Fetch current questions for this course to construct updated tree
      const questionsForCourse = await apiClient.qna.getForCourse(courseId);
      
      // 2. Find target question and append reply
      const updatedQuestions = questionsForCourse.map((q: any) => {
        if (q.id === questionId) {
          const replies = Array.isArray(q.replies) ? [...q.replies] : [];
          replies.push({
            id: `reply-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            authorName: currentUser?.name || 'Lead Instructor',
            authorRole: 'instructor',
            content: text,
            timestamp: new Date().toISOString(),
            isInstructor: true
          });
          return { ...q, replies };
        }
        return q;
      });

      // 3. Save the updated tree
      await apiClient.qna.saveForCourse(courseId, updatedQuestions);

      // 4. Clear input
      setReplyInputs(prev => ({ ...prev, [questionId]: '' }));

      // 5. Reload the global Q&A list to reflect changes immediately
      const res = await apiFetch('qna.php');
      if (Array.isArray(res)) {
        setQnaQuestions(res);
      } else if (res && res.success && Array.isArray(res.data)) {
        setQnaQuestions(res.data);
      }
    } catch (e) {
      console.warn('[InstructorAnalytics] Failed to save direct response:', e);
    } finally {
      setSubmittingReplyId(null);
    }
  };

  const filteredAndSortedQna = useMemo(() => {
    let result = [...qnaQuestions];

    // 1. Filter by Course
    if (courseFilter !== 'All') {
      result = result.filter(q => q.courseId === courseFilter);
    }

    // 2. Sort/Filter by Order
    if (sortFilter === 'newest') {
      result.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
    } else if (sortFilter === 'oldest') {
      result.sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());
    } else if (sortFilter === 'popular') {
      result.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
    } else if (sortFilter === 'unanswered') {
      result.sort((a, b) => {
        const aUnanswered = (a.replies?.length || 0) === 0 ? 1 : 0;
        const bUnanswered = (b.replies?.length || 0) === 0 ? 1 : 0;
        if (aUnanswered !== bUnanswered) {
          return bUnanswered - aUnanswered;
        }
        return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
      });
    }

    return result;
  }, [qnaQuestions, courseFilter, sortFilter]);

  useEffect(() => {
    if (tab === 'quiz-stats') {
      const fetchQnaQuestions = async () => {
        setIsLoadingQna(true);
        try {
          const res = await apiFetch('qna.php');
          if (Array.isArray(res)) {
            setQnaQuestions(res);
          } else if (res && res.success && Array.isArray(res.data)) {
            setQnaQuestions(res.data);
          }
        } catch (e) {
          console.warn('[InstructorAnalytics] Failed to fetch Q&A questions:', e);
        } finally {
          setIsLoadingQna(false);
        }
      };
      fetchQnaQuestions();
    }
  }, [tab]);

  useEffect(() => {
    if (tab === 'learner-progress') {
      const fetchEnrolledLearnerProgress = async () => {
        setIsLoadingProgress(true);
        try {
          // Query the newly enhanced course-progress list API
          const res = await apiFetch('course-progress.php');
          if (res && res.success && Array.isArray(res.data)) {
            const mapped = res.data.map((row: any) => {
              const matchedCourse = courses.find(c => c.id === row.courseId);
              const courseTitle = matchedCourse ? matchedCourse.title : (row.courseTitle || 'Selected Course');
              
              let statusLabel = 'In Progress';
              if (row.progressPercent >= 100) {
                statusLabel = 'Completed ✓';
              } else if (row.progressPercent === 0) {
                statusLabel = 'Just Started';
              }

              return {
                name: row.studentName || 'Enrolled Student',
                email: row.studentEmail || 'student@example.com',
                course: courseTitle,
                courseId: row.courseId,
                progress: row.progressPercent || 0,
                status: statusLabel,
                lastWatched: row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : 'Recently'
              };
            });
            setRealProgressList(mapped);
          }
        } catch (e) {
          console.warn('[InstructorAnalytics] Failed to fetch student progress records:', e);
        } finally {
          setIsLoadingProgress(false);
        }
      };

      fetchEnrolledLearnerProgress();
    }
  }, [tab, courses]);

  const filteredProgress = useMemo(() => {
    if (selectedCourse === 'All') return realProgressList;
    return realProgressList.filter(item => item.courseId === selectedCourse);
  }, [realProgressList, selectedCourse]);

  // Sample drop-off bottleneck points
  const dropoffPoints: any[] = [];

  // Sample quiz stats
  const quizStats: any[] = [];

  // Sample learner reviews
  const learnerReviews: any[] = [];

  return (
    <div className="space-y-6">
      
      {/* 1. LEARNER PROGRESS */}
      {tab === 'learner-progress' && (
        <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-xs">
          {/* Learner Syllabus Completion Table */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              {/* Course Selector Dropdown */}
              <div className="flex items-center space-x-2 shrink-0">
                <span className="text-xs font-bold text-slate-400">Filter Course:</span>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                >
                  <option value="All">All Courses ({courses.length})</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <span className="text-xs font-semibold text-slate-400">
                {filteredProgress.length} Student{filteredProgress.length === 1 ? '' : 's'} Tracked
              </span>
            </div>

            {isLoadingProgress ? (
              <div className="py-12 text-center space-y-2">
                <Loader2 className="w-6 h-6 text-indigo-650 animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-500">Syncing learner progress records...</p>
              </div>
            ) : filteredProgress.length === 0 ? (
              <DataNotFound
                title="No Active Learner Progress Found"
                message="Detailed learner video retention and syllabus progress records will appear here as students watch your course modules."
                icon={TrendingUp}
              />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredProgress.map((item, idx) => {
                  const isCompleted = item.progress >= 100 || (item.status && item.status.toLowerCase().includes('completed'));
                  return (
                    <div key={idx} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{item.name}</span>
                          <span className="text-[11px] text-slate-400">({item.email})</span>
                        </div>
                        <p className="text-xs text-slate-500">{item.course} • Active {item.lastWatched}</p>
                      </div>

                      <div className="flex items-center space-x-4 min-w-[200px]">
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between text-[11px] font-bold">
                            <span className={isCompleted ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-600 dark:text-slate-400"}>
                              {item.status}
                            </span>
                            <span className={isCompleted ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-indigo-600 dark:text-indigo-400"}>
                              {item.progress}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                isCompleted 
                                  ? 'bg-emerald-500 dark:bg-emerald-400' 
                                  : item.progress > 0 
                                    ? 'bg-indigo-600 dark:bg-indigo-500' 
                                    : 'bg-slate-300 dark:bg-slate-700'
                              }`} 
                              style={{ width: `${Math.min(100, Math.max(0, item.progress))}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. QUIZ STATS */}
      {tab === 'quiz-stats' && (
        <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-xs font-bold mb-2">
                <Award className="w-3.5 h-3.5" />
                <span>Q&A Discussion Hub</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Learner Q&A Forum</h2>
              <p className="text-xs text-slate-500 mt-1">
                View dynamic learner questions across your courses, sort by popularity or date, and reply directly.
              </p>
            </div>

            {/* Filters row: Course & Sort Order */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-bold text-slate-400">Course:</span>
                <select
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  className="px-3.5 py-1.5 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none"
                >
                  <option value="All">All Courses</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-bold text-slate-400">Sort:</span>
                <select
                  value={sortFilter}
                  onChange={(e) => setSortFilter(e.target.value)}
                  className="px-3.5 py-1.5 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="popular">Most Popular</option>
                  <option value="unanswered">Unanswered First</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {isLoadingQna ? (
              <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                <span>Loading Q&A discussion board...</span>
              </div>
            ) : filteredAndSortedQna.length === 0 ? (
              <DataNotFound
                title="No Q&A Questions Recorded"
                message="Q&A discussions and student questions will be displayed here once students submit queries in your course lectures."
                icon={MessageSquare}
              />
            ) : (
              filteredAndSortedQna.map((qna, idx) => {
                const upvoteCount = qna.upvotes || 0;
                const replies = Array.isArray(qna.replies) ? qna.replies : [];
                const isHighlyUnresolved = replies.length === 0;
                
                return (
                  <div key={qna.id || idx} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3 shadow-2xs hover:shadow-xs transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        {qna.courseTitle && (
                          <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                            {qna.courseTitle}
                          </span>
                        )}
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{qna.title}</h4>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <span className={`px-2 py-0.5 text-[10px] rounded-md font-bold ${
                          isHighlyUnresolved 
                            ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400' 
                            : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400'
                        }`}>
                          {isHighlyUnresolved ? 'Awaiting Answer' : `${replies.length} Response${replies.length !== 1 ? 's' : ''}`}
                        </span>
                      </div>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-650 dark:text-slate-400 leading-relaxed">
                      <p className="whitespace-pre-wrap">{qna.content}</p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-450 font-mono">
                      <span>Asked by: <strong className="text-slate-700 dark:text-slate-300">{qna.studentName || 'Learner'}</strong></span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{upvoteCount} upvote{upvoteCount !== 1 ? 's' : ''}</span>
                    </div>

                    {/* Replies Thread */}
                    {replies.length > 0 && (
                      <div className="pl-4 border-l-2 border-indigo-100 dark:border-slate-800 space-y-3 mt-3">
                        {replies.map((reply: any) => (
                          <div key={reply.id} className="p-3 bg-white dark:bg-slate-900/60 rounded-xl space-y-1 text-xs border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                              <span className="flex items-center space-x-1.5">
                                <span className="text-[11px] text-slate-700 dark:text-slate-300">{reply.authorName}</span>
                                {reply.isInstructor && (
                                  <span className="text-[8px] font-black uppercase text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.2 rounded-md">
                                    Instructor
                                  </span>
                                )}
                              </span>
                              <span className="text-[9px] text-slate-400 font-normal">
                                {reply.timestamp ? new Date(reply.timestamp).toLocaleDateString() : 'Just now'}
                              </span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{reply.content}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Direct Response Input Field */}
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center space-x-2">
                      <div className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 shrink-0">
                        <CornerDownRight className="w-3.5 h-3.5 text-indigo-600" />
                      </div>
                      <input
                        type="text"
                        value={replyInputs[qna.id] || ''}
                        onChange={(e) => setReplyInputs(prev => ({ ...prev, [qna.id]: e.target.value }))}
                        placeholder="Write a direct answer to student..."
                        className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddReply(qna.id, qna.courseId);
                          }
                        }}
                      />
                      <button
                        onClick={() => handleAddReply(qna.id, qna.courseId)}
                        disabled={submittingReplyId === qna.id || !replyInputs[qna.id]?.trim()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <span>{submittingReplyId === qna.id ? 'Sending...' : 'Reply'}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 4. REVIEWS & FEEDBACK */}
      {tab === 'reviews' && (
        <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-bold mb-2">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <span>Learner Review Insights & Sentiment</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Review Insights & Direct Feedback</h2>
              <p className="text-xs text-slate-500 mt-1">
                Learner course evaluations and rating sentiment across all your published courses.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {(['All', '5', '4', '3', '2', '1'] as const).map((star) => (
                <button
                  key={star}
                  onClick={() => setReviewFilter(star)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    reviewFilter === star
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {star === 'All' ? 'All Reviews' : `${star} ★`}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {isLoadingReviews ? (
              <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                <span>Loading real learner evaluations...</span>
              </div>
            ) : filteredReviews.length === 0 ? (
              <DataNotFound
                title="No Reviews Found"
                message="Course ratings and written feedback submitted by enrolled students will be featured here."
                icon={Star}
              />
            ) : (
              filteredReviews.map((review) => {
                const matchedCourse = courses.find(c => c.id === review.course_id);
                const courseTitle = matchedCourse ? matchedCourse.title : 'Course Review';
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
                    className="p-5 rounded-md border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-md transition-all space-y-3.5 group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div 
                        onClick={() => setSelectedDetailReview({ ...review, course_title: courseTitle })}
                        className="flex items-center space-x-3 cursor-pointer group-hover:opacity-90"
                      >
                        <div className="w-10 h-10 rounded-md bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-black flex items-center justify-center text-xs shadow-xs shrink-0">
                          {(review.student_name || 'L').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors flex items-center space-x-1.5">
                            <span>{review.student_name || 'Learner'}</span>
                            <span className="text-[10px] text-indigo-500 font-semibold">(Click for details)</span>
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                            {courseTitle} <span className="text-slate-300 dark:text-slate-700 mx-1">•</span> {review.created_at ? new Date(review.created_at).toLocaleDateString() : 'Recently'}
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
                          onClick={() => setSelectedAppealReview({ ...review, course_title: courseTitle })}
                          className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-300 font-bold text-[10px] rounded-md border border-amber-200 dark:border-amber-800 transition-all cursor-pointer flex items-center space-x-1"
                          title={`Hide feedback and submit official appeal (${appealFeeText} fee)`}
                        >
                          <Scale className="w-3 h-3 text-amber-600" />
                          <span>Hide Feedback / Appeal ({appealFeeText})</span>
                        </button>
                      </div>
                    </div>

                    <div 
                      onClick={() => setSelectedDetailReview({ ...review, course_title: courseTitle })}
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
};
