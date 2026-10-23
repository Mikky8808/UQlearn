import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  Plus, 
  HelpCircle, 
  Heart, 
  UserCheck, 
  X, 
  CheckCircle2
} from 'lucide-react';
import { Course, LearnerQuestion } from '../../../types';
import { apiClient } from '../../../lib/api';
import { createRequestApi } from '../../../lib/apiConfig';
import { DataNotFound } from '../../common/DataNotFound';

interface LearnerQnATabProps {
  enrolledCourses: Course[];
  currentUser: any;
}

export const LearnerQnATab: React.FC<LearnerQnATabProps> = ({ enrolledCourses, currentUser }) => {
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [filterType, setFilterType] = useState<'newest' | 'oldest' | 'unanswered' | 'my-questions'>('newest');
  const [loading, setLoading] = useState<boolean>(true);

  // Modals state
  const [showAskModal, setShowAskModal] = useState<boolean>(false);
  const [showReqModal, setShowReqModal] = useState<boolean>(false);

  // Request to Instructor state
  const [reqType, setReqType] = useState<'mentorship' | 'extension' | 'resource' | 'certificate' | 'custom'>('mentorship');
  const [reqCourseId, setReqCourseId] = useState(enrolledCourses[0]?.id || '');
  const [reqTitle, setReqTitle] = useState('');
  const [reqDetails, setReqDetails] = useState('');
  const [reqSuccessMsg, setReqSuccessMsg] = useState('');
  const [isSendingReq, setIsSendingReq] = useState(false);

  // Ask Question Form state
  const [newCourseId, setNewCourseId] = useState(enrolledCourses[0]?.id || '');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  // Active inline reply box per question
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});

  // Loaded questions list
  const [questions, setQuestions] = useState<LearnerQuestion[]>([]);

  // Format relative timestamp
  const formatTimeAgo = (isoString?: string) => {
    if (!isoString) return 'Just now';
    if (!isoString.includes('-') && !isoString.includes(':')) {
      return isoString;
    }
    const diffMs = Date.now() - new Date(isoString).getTime();
    if (isNaN(diffMs)) return isoString;
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Synchronize Q&A questions from backend / local cache
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const loadQuestions = async () => {
      try {
        let loaded: LearnerQuestion[] = [];

        if (selectedCourseId !== 'all') {
          loaded = await apiClient.qna.getForCourse(selectedCourseId);
          // If no questions exist yet for this specific course, seed realistic default discussions
          if ((!loaded || loaded.length === 0) && enrolledCourses.length > 0) {
            const currentCourse = enrolledCourses.find(c => c.id === selectedCourseId);
            if (currentCourse) {
              const defaults: LearnerQuestion[] = [
                {
                  id: `q-${currentCourse.id}-1`,
                  courseId: currentCourse.id,
                  courseTitle: currentCourse.title,
                  studentName: 'Alex Mercer',
                  studentAvatar: '',
                  title: 'Should we prioritize server components or client components?',
                  content: 'In the third lecture, we discussed client and server-side components. When dealing with real-time streaming data, is it better to push to a client state or use server actions with revalidation?',
                  timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
                  upvotes: 8,
                  hasUpvoted: false,
                  replies: [
                    {
                      id: `r-${currentCourse.id}-1`,
                      authorName: currentCourse.instructor || 'Lead Instructor',
                      authorRole: 'instructor' as any,
                      content: 'Great question Alex! For high-frequency real-time updates (e.g. >1 update/sec), client-side sockets or EventSource with local state is significantly more responsive than triggering full server roundtrips.',
                      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
                      isInstructor: true
                    }
                  ]
                },
                {
                  id: `q-${currentCourse.id}-2`,
                  courseId: currentCourse.id,
                  courseTitle: currentCourse.title,
                  studentName: 'Sara Chen',
                  studentAvatar: '',
                  title: 'Common pitfalls when configuring environment variables in production',
                  content: 'Make sure not to leak server keys into client bundle files. The best practice outlined here of keeping secrets inside server routes works flawlessly.',
                  timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
                  upvotes: 14,
                  hasUpvoted: true,
                  replies: []
                }
              ];
              loaded = defaults;
              await apiClient.qna.saveForCourse(currentCourse.id, defaults);
            }
          }
        } else {
          // Load questions globally across all courses
          loaded = await apiClient.qna.getAll();
          if ((!loaded || loaded.length === 0) && enrolledCourses.length > 0) {
            const seededAll: LearnerQuestion[] = [];
            for (const course of enrolledCourses.slice(0, 3)) {
              const defaults: LearnerQuestion[] = [
                {
                  id: `q-${course.id}-1`,
                  courseId: course.id,
                  courseTitle: course.title,
                  studentName: 'Alex Mercer',
                  studentAvatar: '',
                  title: `Best practices for structuring modules in ${course.title}?`,
                  content: 'When setting up directory architecture for large modular codebases, should domain modules manage their own data fetches or inherit centrally?',
                  timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
                  upvotes: 12,
                  hasUpvoted: false,
                  replies: [
                    {
                      id: `r-${course.id}-1`,
                      authorName: course.instructor || 'Lead Instructor',
                      authorRole: 'instructor' as any,
                      content: 'Colocate data fetching with your domain features. This maximizes readability and eliminates tight coupling across isolated views.',
                      timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
                      isInstructor: true
                    }
                  ]
                },
                {
                  id: `q-${course.id}-2`,
                  courseId: course.id,
                  courseTitle: course.title,
                  studentName: 'David Kim',
                  studentAvatar: '',
                  title: 'Edge runtime deployment tips and optimizations',
                  content: 'Really appreciate the section on edge caching headers. We saw a 70% decrease in response latency after setting stale-while-revalidate.',
                  timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
                  upvotes: 9,
                  hasUpvoted: true,
                  replies: []
                }
              ];
              await apiClient.qna.saveForCourse(course.id, defaults);
              seededAll.push(...defaults);
            }
            loaded = seededAll;
          }
        }

        if (isMounted) {
          setQuestions(loaded || []);
          setLoading(false);
        }
      } catch (err) {
        console.warn('Failed to load Q&A:', err);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadQuestions();
    return () => {
      isMounted = false;
    };
  }, [selectedCourseId, enrolledCourses]);

  // Handle heart like toggle (Instagram style)
  const handleToggleUpvote = async (qId: string) => {
    const targetQ = questions.find(q => q.id === qId);
    if (!targetQ) return;

    const hasUpvoted = !targetQ.hasUpvoted;
    const newUpvotes = hasUpvoted ? (targetQ.upvotes || 0) + 1 : Math.max(0, (targetQ.upvotes || 0) - 1);

    const updated = questions.map(q => {
      if (q.id === qId) {
        return {
          ...q,
          hasUpvoted,
          upvotes: newUpvotes
        };
      }
      return q;
    });

    setQuestions(updated);

    const courseId = targetQ.courseId;
    const courseQuestions = updated.filter(q => q.courseId === courseId);
    apiClient.qna.saveForCourse(courseId, courseQuestions).catch(err => console.warn(err));
  };

  // Handle reply like toggle
  const handleToggleReplyLike = async (questionId: string, replyId: string) => {
    const targetQ = questions.find(q => q.id === questionId);
    if (!targetQ) return;

    const updated = questions.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          replies: q.replies.map((r: any) => {
            if (r.id === replyId) {
              const hasLiked = !r.hasLiked;
              return {
                ...r,
                hasLiked,
                likes: hasLiked ? (r.likes || 0) + 1 : Math.max(0, (r.likes || 0) - 1)
              };
            }
            return r;
          })
        };
      }
      return q;
    });

    setQuestions(updated);

    const courseId = targetQ.courseId;
    const courseQuestions = updated.filter(q => q.courseId === courseId);
    apiClient.qna.saveForCourse(courseId, courseQuestions).catch(err => console.warn(err));
  };

  // Handle posting reply
  const handleSendReply = async (questionId: string) => {
    const text = (replyTextMap[questionId] || '').trim();
    if (!text) return;

    const targetQ = questions.find(q => q.id === questionId);
    if (!targetQ) return;

    const isInstructor = currentUser?.role === 'instructor' || currentUser?.role === 'admin';

    const newReply = {
      id: `r-${Date.now()}`,
      authorName: currentUser?.name || 'You',
      authorRole: (currentUser?.role || 'student') as any,
      content: text,
      timestamp: new Date().toISOString(),
      isInstructor: isInstructor
    };

    const updated = questions.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          replies: [...q.replies, newReply]
        };
      }
      return q;
    });

    setQuestions(updated);
    setReplyTextMap(prev => ({ ...prev, [questionId]: '' }));
    setActiveReplyId(null);

    const courseId = targetQ.courseId;
    const courseQuestions = updated.filter(q => q.courseId === courseId);
    apiClient.qna.saveForCourse(courseId, courseQuestions).catch(err => console.warn(err));
  };

  // Create new question
  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const matchedCourse = enrolledCourses.find(c => c.id === newCourseId) || enrolledCourses[0];
    const targetCourseId = matchedCourse?.id || 'general';
    const targetCourseTitle = matchedCourse?.title || 'General Course Discussion';

    const newQ: LearnerQuestion = {
      id: `q-${Date.now()}`,
      courseId: targetCourseId,
      courseTitle: targetCourseTitle,
      studentName: currentUser?.name || 'You',
      studentAvatar: currentUser?.avatar || '',
      title: newTitle.trim(),
      content: newContent.trim(),
      timestamp: new Date().toISOString(),
      upvotes: 1,
      hasUpvoted: true,
      replies: []
    };

    const updated = [newQ, ...questions];
    setQuestions(updated);
    setNewTitle('');
    setNewContent('');
    setShowAskModal(false);

    const courseQuestions = updated.filter(q => q.courseId === targetCourseId);
    apiClient.qna.saveForCourse(targetCourseId, courseQuestions).catch(err => console.warn(err));
  };

  // Send formal request to instructor
  const handleSendRequestToInstructor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqTitle.trim() || !reqDetails.trim()) return;

    setIsSendingReq(true);
    const targetCourse = enrolledCourses.find(c => c.id === reqCourseId) || enrolledCourses[0];

    try {
      await createRequestApi({
        senderType: 'user',
        senderId: currentUser?.id || 'learner-1',
        senderName: currentUser?.name || 'Learner',
        senderEmail: currentUser?.email || 'learner@example.com',
        recipientType: 'instructor',
        type: reqType,
        courseId: targetCourse?.id || '',
        courseTitle: targetCourse?.title || '',
        title: reqTitle.trim(),
        details: reqDetails.trim()
      });

      setReqSuccessMsg('Request sent successfully to your instructor!');
      setShowReqModal(false);
      setReqTitle('');
      setReqDetails('');
      setTimeout(() => setReqSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to dispatch learner request', err);
    } finally {
      setIsSendingReq(false);
    }
  };

  // Filter & sort questions according to course, status, and chronological order
  const filteredQuestions = questions
    .filter(q => {
      if (selectedCourseId !== 'all' && q.courseId !== selectedCourseId) return false;
      if (filterType === 'unanswered' && q.replies && q.replies.length > 0) return false;
      if (filterType === 'my-questions') {
        const author = (q.studentName || q.learnerName || '').toLowerCase();
        const current = (currentUser?.name || 'you').toLowerCase();
        if (author !== current && author !== 'you') return false;
      }
      return true;
    })
    .sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime() || 0;
      const timeB = new Date(b.timestamp || 0).getTime() || 0;
      if (filterType === 'oldest') {
        return timeA - timeB; // Oldest to newest
      }
      return timeB - timeA; // Newest first
    });

  const unansweredCount = questions.filter(q => !q.replies || q.replies.length === 0).length;
  const myPostsCount = questions.filter(q => {
    const author = (q.studentName || q.learnerName || '').toLowerCase();
    const current = (currentUser?.name || 'you').toLowerCase();
    return author === current || author === 'you';
  }).length;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header Controls */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <span>Course Q&A & Discussion Board</span>
          </h3>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowReqModal(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-2 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Request to Instructor</span>
          </button>

          <button
            onClick={() => setShowAskModal(true)}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Ask a New Question</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {reqSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex items-center space-x-3 text-emerald-800 dark:text-emerald-300 text-xs font-bold animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{reqSuccessMsg}</span>
        </div>
      )}

      {/* Filter & Sort Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Course Dropdown */}
        <div>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500 font-medium cursor-pointer"
          >
            <option value="all">All Enrolled Courses</option>
            {enrolledCourses.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>

        {/* Status & Sort Filter Dropdown */}
        <div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500 font-medium cursor-pointer"
          >
            <option value="newest">Newest First ({questions.length})</option>
            <option value="oldest">Oldest to Newest ({questions.length})</option>
            <option value="unanswered">Unanswered ({unansweredCount})</option>
            <option value="my-questions">My Posts ({myPostsCount})</option>
          </select>
        </div>
      </div>

      {/* INSTAGRAM-STYLE Q&A DISCUSSION FEED */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-mono text-xs">
            Loading discussions feed...
          </div>
        ) : filteredQuestions.length === 0 ? (
          <DataNotFound
            title="No Discussions Found"
            message="Be the first to post a question for your instructor or classmates!"
            icon={HelpCircle}
            action={{
              label: "Ask a Question",
              onClick: () => setShowAskModal(true),
              icon: Plus
            }}
          />
        ) : (
          filteredQuestions.map((q) => {
            const authorDisplayName = q.studentName || q.learnerName || 'Learner';
            const usernameTag = `@${authorDisplayName.replace(/\s+/g, '').toLowerCase()}`;
            const hasHeartLiked = q.hasUpvoted || false;
            const likesCount = q.upvotes || 0;
            const repliesList = q.replies || [];
            const isReplying = activeReplyId === q.id;

            return (
              <div
                key={q.id}
                className="p-5 sm:p-6 bg-white dark:bg-[#1c1d1f] border border-slate-200/70 dark:border-slate-800/80 rounded-3xl transition-all space-y-4 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700/80 relative overflow-hidden"
              >
                {/* Course badge at upper right */}
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-1 rounded-md border border-teal-200/50 dark:border-teal-900/30">
                    {q.courseTitle || 'Course Discussion'}
                  </span>

                  {repliesList.some(r => r.isInstructor) && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded-md border border-emerald-200/60 dark:border-emerald-800/40">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span>Instructor Answered</span>
                    </span>
                  )}
                </div>

                {/* Parent Question Header (Instagram Style) */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Circular Avatar with Instagram Gradient Ring */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] p-[2px] shrink-0 shadow-xs">
                      <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center text-xs font-black text-slate-800 dark:text-white">
                        {authorDisplayName.charAt(0).toUpperCase()}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Username inline with title */}
                      <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
                        <span className="text-xs font-black text-slate-900 dark:text-white shrink-0 hover:underline cursor-pointer">
                          {usernameTag}
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {q.title}
                        </span>
                      </div>

                      {/* Content */}
                      <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 mt-1.5 whitespace-pre-wrap leading-relaxed font-normal">
                        {q.content}
                      </p>

                      {/* Instagram Action Meta Row */}
                      <div className="flex items-center gap-4 mt-2.5 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                        <span>{formatTimeAgo(q.timestamp)}</span>

                        {likesCount > 0 && (
                          <span>{likesCount} {likesCount === 1 ? 'like' : 'likes'}</span>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setActiveReplyId(isReplying ? null : q.id);
                          }}
                          className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer text-teal-600 dark:text-teal-400 font-bold"
                        >
                          {isReplying ? 'Cancel' : 'Reply'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Instagram Heart Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleUpvote(q.id)}
                    className={`p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 cursor-pointer shrink-0 ${
                      hasHeartLiked ? 'text-red-500 scale-110' : 'text-slate-400 hover:text-slate-600'
                    }`}
                    title={hasHeartLiked ? 'Unlike' : 'Like'}
                  >
                    <Heart className={`w-4.5 h-4.5 ${hasHeartLiked ? 'fill-current' : ''}`} />
                  </button>
                </div>

                {/* Nested Threaded Replies (Instagram Style with Connector Line) */}
                {repliesList.length > 0 && (
                  <div className="pl-6 sm:pl-10 relative mt-3">
                    {/* Visual connector thread line */}
                    <div className="absolute left-[18px] top-0 bottom-4 w-[2px] bg-gradient-to-b from-teal-500/20 via-purple-500/10 to-transparent dark:from-teal-500/15 dark:via-purple-500/5 rounded-full" />

                    <div className="space-y-2.5">
                      {repliesList.map((reply: any) => {
                        const replyLikes = reply.likes || 0;
                        const hasReplyLiked = reply.hasLiked || false;

                        return (
                          <div
                            key={reply.id}
                            className="flex items-start justify-between gap-3 p-3 bg-slate-50/60 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800/40 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-950/50 transition-all animate-fadeIn"
                          >
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                              {/* Smaller Reply Avatar */}
                              <div className={`w-8 h-8 rounded-full p-[1.5px] shrink-0 ${
                                reply.isInstructor 
                                  ? 'bg-gradient-to-tr from-indigo-500 to-purple-500'
                                  : 'bg-slate-200 dark:bg-slate-800'
                              }`}>
                                <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center text-[10px] font-black text-slate-800 dark:text-white">
                                  {(reply.authorName || 'R').charAt(0).toUpperCase()}
                                </div>
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-normal text-slate-700 dark:text-slate-300 leading-relaxed">
                                  <span className="text-xs font-black text-slate-950 dark:text-white mr-1.5 hover:underline cursor-pointer">
                                    @{((reply.authorName || 'User')).replace(/\s+/g, '').toLowerCase()}
                                  </span>

                                  {reply.isInstructor && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[8px] font-black tracking-wider uppercase rounded-md border border-indigo-200/50 dark:border-indigo-900/30 mr-1.5">
                                      <UserCheck className="w-2.5 h-2.5" />
                                      Instructor
                                    </span>
                                  )}

                                  {reply.content}
                                </p>

                                <div className="flex items-center gap-3.5 mt-1.5 text-[9px] font-bold text-slate-400 dark:text-slate-500">
                                  <span>{formatTimeAgo(reply.timestamp)}</span>
                                  {replyLikes > 0 && (
                                    <span>{replyLikes} likes</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Mini Reply Heart Button */}
                            <button
                              type="button"
                              onClick={() => handleToggleReplyLike(q.id, reply.id)}
                              className={`p-1 rounded-full transition-all duration-200 shrink-0 cursor-pointer ${
                                hasReplyLiked ? 'text-red-500 scale-110' : 'text-slate-300 hover:text-slate-500'
                              }`}
                            >
                              <Heart className={`w-3.5 h-3.5 ${hasReplyLiked ? 'fill-current' : ''}`} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Inline Reply Accordion Bar with Quick Emoji Reactions */}
                {isReplying && (
                  <div className="pl-6 sm:pl-10 ml-4 animate-fadeIn space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {/* Emoji quick selects */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {['❤️', '👏', '🔥', '🙌', '💡', '💯'].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setReplyTextMap(prev => ({
                            ...prev,
                            [q.id]: (prev[q.id] || '') + emoji
                          }))}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 rounded-lg text-xs transition-transform hover:scale-110 cursor-pointer shadow-2xs"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        autoFocus
                        value={replyTextMap[q.id] || ''}
                        onChange={(e) => setReplyTextMap({ ...replyTextMap, [q.id]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSendReply(q.id);
                        }}
                        placeholder={`Reply to @${(q.studentName || 'Learner').replace(/\s+/g, '').toLowerCase()}...`}
                        className="flex-1 px-3.5 py-2 bg-slate-50 dark:bg-[#141517] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-teal-500 font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => handleSendReply(q.id)}
                        disabled={!replyTextMap[q.id]?.trim()}
                        className="p-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white transition-colors cursor-pointer shrink-0 shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveReplyId(null);
                        }}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-pointer shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Ask Question Modal */}
      {showAskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Ask a Course Question</h3>
              <button
                onClick={() => setShowAskModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateQuestion} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Select Course</label>
                <select
                  value={newCourseId}
                  onChange={(e) => setNewCourseId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                >
                  {enrolledCourses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Question Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. How to structure async thunks with TypeScript?"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Detailed Description & Context</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide context, error messages, or lecture timestamps to help instructors assist you quickly..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAskModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  Publish Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Request to Instructor Modal */}
      {showReqModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Send Direct Request to Instructor</h3>
              <button
                onClick={() => setShowReqModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendRequestToInstructor} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Request Type</label>
                <select
                  value={reqType}
                  onChange={(e) => setReqType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="mentorship">1-on-1 Code Review / Mentorship Guidance</option>
                  <option value="extension">Assignment / Project Extension Request</option>
                  <option value="resource">Supplementary Course Resources / Materials Request</option>
                  <option value="certificate">Verified Certificate Legal Name Update</option>
                  <option value="custom">General Custom Inquiry</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Course</label>
                <select
                  value={reqCourseId}
                  onChange={(e) => setReqCourseId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  {enrolledCourses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Request Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Code Review for Module 4 State Management..."
                  value={reqTitle}
                  onChange={(e) => setReqTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Detailed Explanation</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide clear details so the instructor can review and respond to your request..."
                  value={reqDetails}
                  onChange={(e) => setReqDetails(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReqModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingReq}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center space-x-2"
                >
                  <span>{isSendingReq ? 'Sending...' : 'Submit Request to Instructor'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
