import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  ThumbsUp, 
  Search, 
  Plus, 
  Send, 
  CornerDownRight, 
  X,
  UserCheck,
  Filter,
  Lock,
  Heart
} from 'lucide-react';
import { LearnerQuestion, Course, Lesson } from '../../../types';
import { useApp } from '../../../context/AppContext';
import { apiClient } from '../../../lib/api';

interface LearningQnATabProps {
  course: Course;
  currentLesson: Lesson;
  userName?: string;
}

export const LearningQnATab: React.FC<LearningQnATabProps> = ({
  course,
  currentLesson,
  userName = 'Learner'
}) => {
  const { currentUser, enrolledCourses } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alphabetical'>('newest');
  const [showAskForm, setShowAskForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  // Active reply box index
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const [questions, setQuestions] = useState<LearnerQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  // Check Q&A permissions
  const isEnrolled = enrolledCourses.some(c => c.id === course.id);
  const isInstructor = currentUser?.role === 'instructor' || currentUser?.name === course.instructor;
  const canParticipate = isEnrolled || isInstructor || currentUser?.role === 'admin' || currentUser?.role === 'reviewer';

  useEffect(() => {
    setLoading(true);
    apiClient.qna.getForCourse(course.id).then((data) => {
      if (data && data.length > 0) {
        setQuestions(data);
      } else {
        const defaults: LearnerQuestion[] = [
          {
            id: 'q-1',
            courseId: course.id,
            courseTitle: course.title,
            studentName: 'Alex Mercer',
            studentAvatar: '',
            title: 'Should we prioritize server components or client components?',
            content: 'In the third lecture, we discussed client and server-side components. When dealing with real-time streaming data, is it better to push to a client state or use server actions with revalidation?',
            timestamp: '2026-10-02T12:00:00Z',
            upvotes: 8,
            hasUpvoted: false,
            replies: [
              {
                id: 'r-1',
                authorName: course.instructor || 'Lead Instructor',
                authorRole: 'instructor',
                content: 'Great question Alex! For high-frequency real-time updates (e.g. >1 update/sec), client-side sockets or EventSource with local state is significantly more responsive than triggering full server roundtrips.',
                timestamp: '2026-10-02T13:00:00Z',
                isInstructor: true
              }
            ]
          },
          {
            id: 'q-2',
            courseId: course.id,
            courseTitle: course.title,
            studentName: 'Sara Chen',
            studentAvatar: '',
            title: 'Common pitfalls when configuring environment variables in production',
            content: 'Make sure not to leak server keys into client bundle files. The best practice outlined here of keeping secrets inside server routes works flawlessly.',
            timestamp: '2026-09-30T10:00:00Z',
            upvotes: 14,
            hasUpvoted: true,
            replies: []
          }
        ];
        setQuestions(defaults);
        apiClient.qna.saveForCourse(course.id, defaults);
      }
      setLoading(false);
    });
  }, [course.id, course.instructor]);

  const updateQuestions = (updated: LearnerQuestion[]) => {
    setQuestions(updated);
    apiClient.qna.saveForCourse(course.id, updated);
  };

  const handleAskQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canParticipate) return;
    if (!newTitle.trim() || !newContent.trim()) return;

    const newQ: LearnerQuestion = {
      id: `q-${Date.now()}`,
      courseId: course.id,
      courseTitle: course.title,
      studentName: currentUser?.name || userName,
      studentAvatar: '',
      title: newTitle.trim(),
      content: newContent.trim(),
      timestamp: new Date().toISOString(),
      upvotes: 1,
      hasUpvoted: true,
      replies: []
    };

    const updated = [newQ, ...questions];
    updateQuestions(updated);
    setNewTitle('');
    setNewContent('');
    setShowAskForm(false);
  };

  const handleToggleUpvote = (id: string) => {
    const updated = questions.map(q => {
      if (q.id === id) {
        const hasUpvoted = !q.hasUpvoted;
        return {
          ...q,
          hasUpvoted,
          upvotes: hasUpvoted ? q.upvotes + 1 : Math.max(0, q.upvotes - 1)
        };
      }
      return q;
    });
    updateQuestions(updated);
  };

  const handleToggleReplyLike = (questionId: string, replyId: string) => {
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
    updateQuestions(updated);
  };

  const handleSendReply = (questionId: string) => {
    if (!canParticipate) return;
    if (!replyContent.trim()) return;

    const updated = questions.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          replies: [
            ...q.replies,
            {
              id: `r-${Date.now()}`,
              authorName: currentUser?.name || userName,
              authorRole: (isInstructor ? 'instructor' : 'student') as any,
              content: replyContent.trim(),
              timestamp: new Date().toISOString(),
              isInstructor: isInstructor
            }
          ]
        };
      }
      return q;
    });

    updateQuestions(updated);
    setReplyContent('');
    setActiveReplyId(null);
  };

  // Human readable timestamp formatter
  const formatTimeAgo = (isoString: string) => {
    if (!isoString.includes('-') && !isoString.includes(':')) {
      return isoString; // return original fallback string like "2 hours ago"
    }
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Search filter
  const searchedQuestions = questions.filter(q => {
    if (!searchQuery.trim()) return true;
    const s = searchQuery.toLowerCase();
    return (
      q.title.toLowerCase().includes(s) || 
      q.content.toLowerCase().includes(s) || 
      q.studentName.toLowerCase().includes(s)
    );
  });

  // Sort filter
  const sortedQuestions = [...searchedQuestions].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    }
    if (sortBy === 'oldest') {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    }
    if (sortBy === 'alphabetical') {
      const titleA = (a.title || '').toLowerCase();
      const titleB = (b.title || '').toLowerCase();
      return titleA.localeCompare(titleB);
    }
    return 0;
  });

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 font-mono text-xs">
        Loading Q&A feed...
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Top Header Section */}
      <div className="bg-white dark:bg-[#1c1d1f] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Questions & Discussion</span>
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Discuss lecture concepts, get unstuck, and share discoveries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canParticipate ? (
            !showAskForm && (
              <button
                type="button"
                onClick={() => setShowAskForm(true)}
                className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ask Question</span>
              </button>
            )
          ) : (
            <div className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-bold flex items-center gap-1.5 cursor-not-allowed">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Enroll to Ask</span>
            </div>
          )}
        </div>
      </div>

      {/* Permission Block Banner */}
      {!canParticipate && (
        <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 flex items-start space-x-2.5">
          <Lock className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">Discussion Locked</p>
            <p className="mt-0.5 text-slate-500 dark:text-slate-400">
              Only enrolled learners of this course and the course instructor can post new questions or write answers. Explore the catalog to join!
            </p>
          </div>
        </div>
      )}

      {/* Ask Question Composer */}
      {showAskForm && canParticipate && (
        <form onSubmit={handleAskQuestion} className="bg-white dark:bg-[#1c1d1f] border border-teal-500/30 rounded-2xl p-4 sm:p-5 space-y-3 shadow-lg animate-fadeIn transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
              New Discussion Thread
            </span>
            <button
              type="button"
              onClick={() => setShowAskForm(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <input
            type="text"
            required
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Question summary (e.g., How do we handle caching with edge functions?)"
            className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-teal-500 font-semibold"
          />

          <textarea
            required
            rows={3}
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Provide context or code snippet details to help instructors and peers assist you..."
            className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-teal-500 leading-relaxed resize-y"
          />

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAskForm(false)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newTitle.trim() || !newContent.trim()}
              className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              Post Question
            </button>
          </div>
        </form>
      )}

      {/* Filter & Sort Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions or users..."
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#1c1d1f] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors shadow-2xs"
          />
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-white dark:bg-[#1c1d1f] border border-slate-200 dark:border-slate-800/80 text-[11px] font-bold text-slate-600 dark:text-slate-300 rounded-xl py-1.5 px-3 focus:outline-none cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="alphabetical">Alphabetical</option>
          </select>
        </div>
      </div>

      {/* INSTAGRAM STYLE Q&A COMMENT LIST */}
      <div className="space-y-5">
        {sortedQuestions.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-400 space-y-2">
            <MessageSquare className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
            <p className="text-xs font-semibold">No discussions match your filter</p>
            {canParticipate && (
              <button
                type="button"
                onClick={() => setShowAskForm(true)}
                className="text-xs text-teal-600 dark:text-teal-400 hover:underline cursor-pointer font-bold"
              >
                Start a thread
              </button>
            )}
          </div>
        ) : (
          sortedQuestions.map((q) => (
            <div
              key={q.id}
              className="p-5 sm:p-6 bg-white dark:bg-[#1c1d1f] border border-slate-200/60 dark:border-slate-800/80 rounded-3xl transition-all space-y-4.5 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700/80 relative overflow-hidden"
            >
              {/* Parent Comment Header (Instagram Style) */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  {/* Circular Avatar with Instagram Ring */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] p-[2px] shrink-0 shadow-xs">
                    <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center text-xs font-black text-slate-800 dark:text-white">
                      {(q.studentName || 'U').charAt(0)}
                    </div>
                  </div>

                  <div className="min-w-0">
                    {/* Username inline with title */}
                    <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
                      <span className="text-xs font-black text-slate-900 dark:text-white shrink-0 hover:underline cursor-pointer">
                        @{(q.studentName || 'Learner').replace(/\s+/g, '').toLowerCase()}
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {q.title}
                      </span>
                    </div>

                    <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 mt-1.5 whitespace-pre-wrap leading-relaxed font-normal">
                      {q.content}
                    </p>

                    {/* Instagram actions meta row */}
                    <div className="flex items-center gap-4 mt-2.5 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                      <span>{formatTimeAgo(q.timestamp)}</span>
                      
                      {q.upvotes > 0 && (
                        <span>{q.upvotes} likes</span>
                      )}

                      {canParticipate && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveReplyId(activeReplyId === q.id ? null : q.id);
                            setReplyContent('');
                          }}
                          className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer text-teal-600 dark:text-teal-400"
                        >
                          Reply
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Instagram Heart Button */}
                <button
                  type="button"
                  onClick={() => handleToggleUpvote(q.id)}
                  className={`p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 cursor-pointer shrink-0 ${
                    q.hasUpvoted ? 'text-red-500 scale-110' : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title={q.hasUpvoted ? 'Unlike question' : 'Like question'}
                >
                  <Heart className={`w-4.5 h-4.5 ${q.hasUpvoted ? 'fill-current' : ''}`} />
                </button>
              </div>

              {/* Nested Comments (Threaded replies) with visual nesting distinction */}
              {q.replies && q.replies.length > 0 && (
                <div className="pl-6 sm:pl-10 relative">
                  {/* Visual connector thread line */}
                  <div className="absolute left-[18px] top-0 bottom-4 w-[2px] bg-gradient-to-b from-teal-500/20 via-purple-500/10 to-transparent dark:from-teal-500/15 dark:via-purple-500/5 rounded-full" />
                  
                  <div className="space-y-2.5">
                    {q.replies.map((reply: any) => {
                      const replyLikes = reply.likes || 0;
                      const hasReplyLiked = reply.hasLiked || false;
                      return (
                        <div 
                          key={reply.id} 
                          className="flex items-start justify-between gap-3 p-3 bg-slate-50/50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800/40 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-950/50 transition-all animate-fadeIn"
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            {/* Smaller Reply Avatar */}
                            <div className={`w-8 h-8 rounded-full p-[1.5px] shrink-0 ${
                              reply.isInstructor 
                                ? 'bg-gradient-to-tr from-indigo-500 to-purple-500'
                                : 'bg-slate-200 dark:bg-slate-800'
                            }`}>
                              <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center text-[10px] font-black text-slate-800 dark:text-white">
                                {(reply.authorName || 'R').charAt(0)}
                              </div>
                            </div>

                            <div className="min-w-0">
                              <p className="text-xs font-normal text-slate-700 dark:text-slate-300 leading-relaxed">
                                <span className="text-xs font-black text-slate-950 dark:text-white mr-1.5 hover:underline cursor-pointer">
                                  @{(reply.authorName || 'User').replace(/\s+/g, '').toLowerCase()}
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
                            className={`p-1 rounded-full transition-all duration-200 shrink-0 ${
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

              {/* Threaded inline reply bar with Emoji reactions */}
              {activeReplyId === q.id && canParticipate && (
                <div className="pl-6 sm:pl-10 ml-4.5 animate-fadeIn space-y-2">
                  {/* Emoji quick selects */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {['❤️', '👏', '🔥', '🙌', '💡', '💯'].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setReplyContent(prev => prev + emoji)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 rounded-lg text-xs transition-transform hover:scale-110 cursor-pointer shadow-2xs"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <input
                      type="text"
                      autoFocus
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSendReply(q.id);
                      }}
                      placeholder="Add a reply..."
                      className="flex-1 px-3.5 py-2 bg-slate-50 dark:bg-[#141517] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-teal-500 font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => handleSendReply(q.id)}
                      disabled={!replyContent.trim()}
                      className="p-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white transition-colors cursor-pointer shrink-0 shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveReplyId(null);
                        setReplyContent('');
                      }}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-pointer shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
