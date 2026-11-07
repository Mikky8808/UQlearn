import React, { useState, useEffect, useRef } from 'react';
import { Course } from '../../types';
import { useApp } from '../../context/AppContext';
import { CourseDetailPage } from '../user/CourseDetailPage';
import { LearningPlayer } from '../user/LearningPlayer';
import { ReviewerGuideModal } from './ReviewerGuideModal';
import { ReviewerInbox } from './ReviewerInbox';
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  CheckSquare, 
  ShieldCheck, 
  Globe,
  PlayCircle,
  X,
  HelpCircle,
  Award,
  MessageSquare,
  Send,
  Mail,
  User,
  ChevronDown,
  ChevronUp,
  Search
} from 'lucide-react';
import { 
  getCourseDescriptionChecklistApi, 
  saveCourseDescriptionChecklistApi,
  getCourseMessagesApi,
  saveCourseMessagesApi,
  getReviewerChatHistoryApi,
  apiFetch
} from '../../lib/apiConfig';

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
    introText: 'Verify that the course description highlights clear value metrics:',
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
    introText: 'Ensure clear, outcome-based course goals are explicitly stated:',
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
    introText: 'Verify "You\'ll Learn To" section features actionable practical skills:',
    criteria: [
      'Build Agency',
      'Price Services',
      'Build Website',
      'Get & Keep Clients',
      'Hire Right People',
      'Customer Relationship'
    ],
    status: 'pending',
    suggestion: ''
  }
];

interface ReviewerCourseDetailPageProps {
  course: Course;
  onBack: () => void;
  onCourseReviewed?: () => void;
  initialMode?: 'details' | 'learn';
}

const DraggableChatWindow: React.FC<{
  course: Course;
  onClose: () => void;
  messages: any[];
  onSendMessage: (msg: string, emailInstructor?: boolean) => void;
  sending: boolean;
  checklist?: DescriptionChecklistItem[];
}> = ({ course, onClose, messages, onSendMessage, sending, checklist = [] }) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'history'>('chat');
  const [inputVal, setInputVal] = useState('');
  const [emailInstructor, setEmailInstructor] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState(() => {
    try {
      const saved = localStorage.getItem('uqlearn_reviewer_chat_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.left === 'number' && typeof parsed.top === 'number') {
          return parsed;
        }
      }
    } catch {}
    return { 
      left: typeof window !== 'undefined' && window.innerWidth > 700 ? window.innerWidth - 500 : 20, 
      top: 100 
    };
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initLeft: number; initTop: number }>({ startX: 0, startY: 0, initLeft: 0, initTop: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('textarea') || (e.target as HTMLElement).closest('input')) return;
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initLeft: position.left,
      initTop: position.top
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handlePointerMove = (e: PointerEvent) => {
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    let newLeft = dragRef.current.initLeft + dx;
    let newTop = dragRef.current.initTop + dy;

    newTop = Math.max(0, Math.min(newTop, window.innerHeight - 80));
    newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - 80));

    setPosition({ left: newLeft, top: newTop });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    try {
      localStorage.setItem('uqlearn_reviewer_chat_pos', JSON.stringify(position));
    } catch {}
  };

  return (
    <div 
      style={{ left: `${position.left}px`, top: `${position.top}px`, width: '460px', height: isMinimized ? 'auto' : '540px' }}
      className={`fixed z-50 bg-[#0d1117] border border-[#30363d] rounded-xl shadow-2xl flex flex-col font-sans select-none text-[#c9d1d9] ${isDragging ? 'opacity-90 cursor-grabbing' : ''}`}
    >
      {/* Header (Drag Handle) */}
      <div 
        onPointerDown={handlePointerDown}
        className="flex justify-between items-center px-3.5 py-2.5 bg-[#161b22] border-b border-[#30363d] rounded-t-xl cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center space-x-2 text-xs text-[#8b949e]">
          <span>⠿</span>
          <span className="font-bold text-white">Reviewer Panel - {course.instructor || 'Instructor'}</span>
        </div>
        <div className="flex items-center space-x-2.5 text-[#8b949e]">
          <button 
            type="button" 
            onClick={() => setIsMinimized(!isMinimized)} 
            className="hover:text-white cursor-pointer p-1"
            title={isMinimized ? 'Expand Panel' : 'Minimize Panel'}
          >
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button 
            type="button" 
            onClick={onClose} 
            className="hover:text-white cursor-pointer px-1 text-sm font-bold"
          >
            ✕
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="flex-1 flex flex-col bg-[#0d1117] overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-[#30363d] bg-[#161b22] shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-2 text-xs font-bold text-center border-b-2 cursor-pointer transition-colors ${
                activeTab === 'chat' ? 'border-[#388bfd] text-white bg-[#0d1117]' : 'border-transparent text-[#8b949e] hover:text-[#c9d1d9]'
              }`}
            >
              Chat
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-2 text-xs font-bold text-center border-b-2 cursor-pointer transition-colors ${
                activeTab === 'history' ? 'border-[#388bfd] text-white bg-[#0d1117]' : 'border-transparent text-[#8b949e] hover:text-[#c9d1d9]'
              }`}
            >
              Review History
            </button>
          </div>

          {activeTab === 'chat' ? (
            <div className="flex-1 flex flex-col justify-between p-4 overflow-hidden">
              {/* Messages & Profile */}
              <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                <div className="flex items-center space-x-2.5 pb-3 border-b border-[#30363d]">
                  <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold text-xs shrink-0">
                    {(course.instructor || 'I').charAt(0).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold text-white truncate">{course.instructor || 'Instructor'}</div>
                    <div className="text-[10px] text-[#8b949e] truncate">{course.title}</div>
                  </div>
                </div>

                {/* Search Input Field */}
                <div className="py-1">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#8b949e] absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search previous messages..."
                      className="w-full bg-[#161b22] border border-[#30363d] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#c9d1d9] placeholder-[#8b949e] focus:outline-none focus:border-[#388bfd]"
                    />
                  </div>
                </div>

                {/* Chat history */}
                <div className="space-y-2 py-2">
                  {(() => {
                    const filtered = searchQuery.trim()
                      ? messages.filter((m: any) => (m.message || '').toLowerCase().includes(searchQuery.toLowerCase().trim()))
                      : messages;
                    return filtered.length === 0 ? (
                      <div className="text-center text-[#8b949e] text-xs py-8 italic font-sans">
                        {searchQuery.trim() ? 'No matching messages found.' : 'No messages yet. Send a message to start chatting with the instructor.'}
                      </div>
                    ) : (
                      filtered.map((msg: any, idx: number) => (
                        <div key={idx} className="p-2.5 bg-[#161b22] border border-[#30363d] rounded-lg space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-[#8b949e] font-mono">
                            <span className="font-bold text-indigo-400">{msg.sender_role || msg.senderRole || 'Reviewer'}</span>
                            <span>{msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</span>
                          </div>
                          <p className="text-xs text-[#c9d1d9] font-sans">{msg.message}</p>
                        </div>
                      ))
                    );
                  })()}
                </div>
              </div>

              {/* Input Area */}
              <div className="space-y-3 pt-3 border-t border-[#30363d] shrink-0">
                <div className="flex items-center justify-between">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowQuickReplies(!showQuickReplies)}
                      className="px-2.5 py-1 bg-[#161b22] hover:bg-[#21262d] text-[#c9d1d9] rounded-md text-xs font-bold border border-[#30363d] transition-colors flex items-center space-x-1 cursor-pointer"
                    >
                      <span>✨ Quick Replies</span>
                      <span className="text-[10px]">▾</span>
                    </button>

                    {showQuickReplies && (
                      <div className="absolute bottom-full left-0 mb-1.5 w-64 bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl overflow-hidden z-20 py-1 space-y-0.5">
                        {[
                          'Course approved! Excellent curriculum structure.',
                          'Please update video resolution and lesson titles.',
                          'Missing learning objectives in course description.',
                          'Please attach high quality 16:9 thumbnail image.'
                        ].map((tmpl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setInputVal(tmpl);
                              setShowQuickReplies(false);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs text-[#c9d1d9] hover:bg-[#388bfd] hover:text-white transition-colors cursor-pointer truncate"
                          >
                            {tmpl}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <label className="flex items-center space-x-1.5 text-xs text-[#c9d1d9] hover:text-white cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={emailInstructor}
                      onChange={(e) => setEmailInstructor(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-[#30363d] bg-[#161b22] text-[#388bfd] focus:ring-0 cursor-pointer accent-[#388bfd]"
                    />
                    <Mail className="w-3.5 h-3.5 text-[#388bfd]" />
                    <span className="font-semibold">Email Instructor</span>
                  </label>
                </div>

                <div className="bg-[#0d1117] border border-[#388bfd] rounded-lg p-2.5 flex flex-col gap-2 shadow-[0_0_0_1px_#388bfd]">
                  <textarea
                    rows={3}
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    placeholder="Type your message..."
                    className="w-full bg-transparent border-none text-[#c9d1d9] text-xs font-sans resize-none focus:outline-none"
                  />
                  <div className="flex justify-between items-center pt-1 border-t border-[#30363d]">
                    <div className="text-[10px] text-[#8b949e]">
                      {emailInstructor ? 'Will also send email to instructor' : 'Press Send to deliver to chat'}
                    </div>
                    <button
                      type="button"
                      disabled={sending || !inputVal.trim()}
                      onClick={() => {
                        onSendMessage(inputVal, emailInstructor);
                        setInputVal('');
                      }}
                      className="px-3 py-1 bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 text-white rounded-md text-xs font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                    >
                      <span>{sending ? 'Sending...' : 'Send'}</span>
                      <span>➤</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="text-xs font-bold text-white mb-1 flex items-center justify-between">
                <span>Course Review & Audit History</span>
                <span className="text-[10px] text-[#8b949e] font-mono">ID: {course.id}</span>
              </div>

              {/* Current status card */}
              <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-lg space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#8b949e]">Review Status:</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                    (course as any).status === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    (course as any).status === 'needs_changes' ? 'bg-amber-500/20 text-amber-400 border border-emerald-500/30' :
                    'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}>
                    {(course as any).status || 'Pending Review'}
                  </span>
                </div>
                {((course as any).reviewNotes || (course as any).reviewerNotes) && (
                  <div className="text-xs text-[#c9d1d9] pt-1 border-t border-[#30363d]">
                    <span className="text-[#8b949e] block text-[10px] mb-0.5">Last Review Notes:</span>
                    {(course as any).reviewNotes || (course as any).reviewerNotes}
                  </div>
                )}
              </div>

              {/* Checklist audit summary */}
              <div className="space-y-2 pt-2">
                <div className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider">Checklist Audit Summary</div>
                {checklist && checklist.length > 0 ? (
                  checklist.map((item, idx) => (
                    <div key={idx} className="p-2.5 bg-[#161b22] border border-[#30363d] rounded-lg space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white">{item.title}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          item.status === 'met' ? 'bg-emerald-500/20 text-emerald-400' :
                          item.status === 'not_met' ? 'bg-rose-500/20 text-rose-400' :
                          'bg-slate-700 text-slate-300'
                        }`}>
                          {item.status === 'met' ? '✓ Met' : item.status === 'not_met' ? '✗ Not Met' : 'Pending'}
                        </span>
                      </div>
                      {item.suggestion && (
                        <p className="text-[11px] text-amber-300 italic pt-1 border-t border-[#30363d]">
                          Suggestion: {item.suggestion}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-[#8b949e] italic py-4 text-center">No checklist audit items recorded yet.</div>
                )}
              </div>

              {/* Past feedback threads / message history */}
              <div className="space-y-2 pt-2">
                <div className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider">Conversation & Feedback Threads</div>
                {messages.length === 0 ? (
                  <div className="text-xs text-[#8b949e] italic py-2 text-center">No previous threads found.</div>
                ) : (
                  messages.map((m: any, idx: number) => (
                    <div key={idx} className="p-2.5 bg-[#161b22] border border-[#30363d] rounded-lg space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-[#8b949e] font-mono">
                        <span className="font-bold text-indigo-400">{m.sender_role || m.senderRole || 'Reviewer'}</span>
                        <span>{m.created_at ? new Date(m.created_at).toLocaleString() : 'Recent'}</span>
                      </div>
                      <p className="text-xs text-[#c9d1d9]">{m.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const ReviewerCourseDetailPage: React.FC<ReviewerCourseDetailPageProps> = ({
  course,
  onBack,
  onCourseReviewed,
  initialMode = 'details'
}) => {
  const { reviewCourse, sendInstructorNotification } = useApp();

  const [previewMode, setPreviewMode] = useState<'details' | 'learn'>(initialMode);
  const [showChecklistDrawer, setShowChecklistDrawer] = useState(false);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionType, setDecisionType] = useState<'approved' | 'needs_changes'>('approved');
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [auditToastMessage, setAuditToastMessage] = useState('');
  const [descriptionChecklist, setDescriptionChecklist] = useState<DescriptionChecklistItem[]>(DEFAULT_DESCRIPTION_CHECKLIST_ITEMS);
  const [showInstructorPanel, setShowInstructorPanel] = useState(false);
  const [instructorMessages, setInstructorMessages] = useState<any[]>([]);
  const [instructorMessageInput, setInstructorMessageInput] = useState('');
  const [sendingInstructorMessage, setSendingInstructorMessage] = useState(false);
  const [showQuickRepliesDropdown, setShowQuickRepliesDropdown] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getCourseDescriptionChecklistApi(course.id)
      .then(res => {
        if (!isMounted || !res) return;
        if (res.success && Array.isArray(res.items) && res.items.length > 0) {
          setDescriptionChecklist(res.items);
        }
      })
      .catch(() => {});

    if (course?.id) {
      getCourseMessagesApi(course.id)
        .then(res => {
          if (!isMounted || !res) return;
          if (Array.isArray(res)) setInstructorMessages(res);
          else if (res.success && Array.isArray(res.messages)) setInstructorMessages(res.messages);
        })
        .catch(() => {});
    }

    return () => { isMounted = false; };
  }, [course.id]);

  const handleSendInstructorMessage = async (msgTextOverride?: string, shouldEmail: boolean = true) => {
    const msgText = (msgTextOverride || instructorMessageInput).trim();
    if (!msgText) return;
    setSendingInstructorMessage(true);
    try {
      const payload = {
        course_id: course.id,
        courseId: course.id,
        sender_role: 'reviewer',
        senderRole: 'reviewer',
        message: msgText,
        recipient: (course as any).instructorEmail || (course as any).instructor_email || course.instructor || 'Instructor',
        created_at: new Date().toISOString()
      };
      await saveCourseMessagesApi(payload);
      setInstructorMessages(prev => [...prev, payload]);
      setInstructorMessageInput('');
      
      // Dispatch email notification to instructor via reviewer-email-instructor.php if checked
      if (shouldEmail) {
        try {
          await apiFetch('reviewer-email-instructor.php', {
            method: 'POST',
            body: JSON.stringify({
              course_id: course.id,
              courseId: course.id,
              message: msgText,
              sender_name: 'Reviewer',
              senderName: 'Reviewer'
            })
          });
        } catch (e) {
          console.warn('Failed to send reviewer email notification:', e);
        }
      }

      // Dispatch live notification to instructor
      try {
        await sendInstructorNotification({
          courseId: course.id,
          courseTitle: course.title,
          courseThumbnail: course.thumbnail || course.image,
          instructorName: course.instructor || (course as any).created_by_name || 'Instructor',
          instructorEmail: (course as any).instructorEmail || (course as any).instructor_email || (course as any).created_by_email || '',
          type: 'reviewer_message',
          title: `💬 New Reviewer Message: ${course.title}`,
          message: msgText,
          category: course.category || 'Course Review'
        });
      } catch {}

      setAuditToastMessage(shouldEmail ? 'Review message & email sent to instructor!' : 'Review message saved to chat thread!');
      setTimeout(() => setAuditToastMessage(''), 4000);
      setSendingInstructorMessage(false);
    } catch (err: any) {
      setSendingInstructorMessage(false);
      alert(err.message || 'Failed to send message to instructor.');
    }
  };

  const handleToggleChecklistItemStatus = async (id: string, status: 'met' | 'not_met') => {
    const updated = descriptionChecklist.map(item => item.id === id ? { ...item, status } : item);
    setDescriptionChecklist(updated);
    try {
      await saveCourseDescriptionChecklistApi({ courseId: course.id, items: updated });
    } catch {}
  };

  const handleUpdateChecklistItemSuggestion = async (id: string, suggestion: string) => {
    const updated = descriptionChecklist.map(item => item.id === id ? { ...item, suggestion } : item);
    setDescriptionChecklist(updated);
    try {
      await saveCourseDescriptionChecklistApi({ courseId: course.id, items: updated });
    } catch {}
  };

  const handleSubmitChecklistAudit = async () => {
    try {
      await saveCourseDescriptionChecklistApi({ courseId: course.id, items: descriptionChecklist });
      setAuditToastMessage('Course Description Checklist audit saved successfully!');
      setTimeout(() => setAuditToastMessage(''), 4000);
      setShowChecklistDrawer(false);
    } catch {
      setAuditToastMessage('Failed to save checklist audit.');
      setTimeout(() => setAuditToastMessage(''), 4000);
    }
  };

  const handleOpenDecisionModal = (type: 'approved' | 'needs_changes') => {
    setDecisionType(type);
    setShowDecisionModal(true);
  };

  const handleConfirmDecision = async () => {
    setSubmitting(true);
    try {
      const summaryNotes = feedbackNotes.trim() || (decisionType === 'approved' ? 'Course meets all curriculum and quality standards.' : 'Revisions requested by course reviewer.');
      await reviewCourse(course.id, decisionType, summaryNotes);
      setSubmitting(false);
      setShowDecisionModal(false);
      setAuditToastMessage(decisionType === 'approved' ? 'Course approved successfully!' : 'Revision request submitted!');
      setTimeout(() => {
        setAuditToastMessage('');
        if (onCourseReviewed) onCourseReviewed();
        onBack();
      }, 1500);
    } catch (err: any) {
      setSubmitting(false);
      alert(err.message || 'Failed to submit course review decision.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans select-none">
      {/* Reviewer Top Audit Navigation & Control Bar */}
      <div className="bg-[#1c1d1f] border-b border-slate-800 text-white px-6 py-3 flex flex-wrap items-center justify-between gap-4 shadow-xl z-30">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer flex items-center space-x-1.5 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Review Queue</span>
          </button>



          <span className="text-sm font-black text-white truncate max-w-xs hidden md:inline">
            {course.title}
          </span>
        </div>

        {/* Mode Switcher Tabs (Learner UI Component Views) */}
        <div className="flex items-center space-x-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setPreviewMode('details')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
              previewMode === 'details'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>1. Course Detail Page (Learner View)</span>
          </button>

          <button
            type="button"
            onClick={() => setPreviewMode('learn')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
              previewMode === 'learn'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PlayCircle className="w-3.5 h-3.5" />
            <span>2. Learn Player (Learner View)</span>
          </button>
        </div>

        {/* Reviewer Audit Action Controls */}
        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={() => setShowInstructorPanel(true)}
            className="px-3.5 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-600/40 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm"
          >
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            <span>Chat</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenDecisionModal('approved')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-lg shadow-emerald-950/40 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Approve Course</span>
          </button>
        </div>
      </div>

      {/* Main Content Area rendering exact Learner UI Components */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-950 relative">
        {previewMode === 'details' ? (
          <CourseDetailPage courseProp={course} onClosePreview={onBack} />
        ) : (
          <LearningPlayer courseProp={course} onClosePreview={onBack} />
        )}
      </div>

      {/* Decision Modal */}
      {showDecisionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
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

      {/* Checklist Audit Drawer */}
      {showChecklistDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" 
            onClick={() => setShowChecklistDrawer(false)} 
          />

          <div className="relative z-10 w-full sm:w-[480px] bg-[#1f1f1f] border-l border-slate-800 shadow-2xl flex flex-col h-full text-white animate-in slide-in-from-right duration-300">
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

                      <div className="flex items-center space-x-1.5 shrink-0 pt-0.5">
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
                          <CheckSquare className="w-4 h-4" />
                          <span className="sr-only">Met</span>
                        </button>

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
                          <X className="w-4 h-4" />
                          <span className="sr-only">Not Met</span>
                        </button>
                      </div>
                    </div>

                    {item.status === 'not_met' && (
                      <div className="bg-rose-950/40 border border-rose-900/60 rounded-none p-3 space-y-1.5 mt-2">
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

      {/* Full Screen Reviewer Inbox View */}
      {showInstructorPanel && (
        <ReviewerInbox
          initialCourseId={course.id}
          onClose={() => setShowInstructorPanel(false)}
        />
      )}

      <ReviewerGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
      />
    </div>
  );
};
