import React, { useState, useEffect } from 'react';
import { 
  MessageCircle, 
  Send, 
  Clock, 
  CheckCircle2, 
  Inbox, 
  Search, 
  Check, 
  XCircle, 
  Loader2, 
  Plus, 
  ShieldAlert, 
  Building2, 
  User, 
  Users,
  BookOpen, 
  HelpCircle,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { Course, CommunicationRequest, CourseSubscription } from '../../types';
import { InstructorTabKey } from '../navigation/InstructorSidebar';
import { fetchRequestsApi, createRequestApi, updateRequestStatusApi, apiFetch } from '../../lib/apiConfig';
import { subscriptionService } from '../../services/subscription-service';

interface CommunicationViewsProps {
  tab: InstructorTabKey;
  courses: Course[];
  currentUser: any;
  autoOpenCategoryRequestModal?: boolean;
  onClearAutoOpenCategoryRequest?: () => void;
}

export const InstructorCommunicationViews: React.FC<CommunicationViewsProps> = ({
  tab,
  courses,
  currentUser,
  autoOpenCategoryRequestModal,
  onClearAutoOpenCategoryRequest
}) => {
  // Sub-tab for requests: User -> Instructor OR Instructor -> Admin
  const [requestRecipientSubTab, setRequestRecipientSubTab] = useState<'instructor' | 'admin'>('instructor');

  // Direct messages state & ticket center (instructor has access to all learners who have enrolled to that instructor's courses only)
  const [selectedStudent, setSelectedStudent] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMsgText, setNewMsgText] = useState('');
  const [enrolledLearners, setEnrolledLearners] = useState<CourseSubscription[]>([]);
  const [loadingEnrolledLearners, setLoadingEnrolledLearners] = useState(false);
  const [learnerSearch, setLearnerSearch] = useState('');
  const [selectedLearner, setSelectedLearner] = useState<CourseSubscription | null>(null);
  const [conversations, setConversations] = useState<Record<string, any[]>>({});

  useEffect(() => {
    const fetchEnrolled = async () => {
      setLoadingEnrolledLearners(true);
      try {
        const courseIds = courses.map(c => c.id).filter(Boolean);
        const data = await subscriptionService.getInstructorTransactions({
          instructorId: currentUser?.id,
          instructorEmail: currentUser?.email,
          instructorName: currentUser?.name,
          courseIds: courseIds.length > 0 ? courseIds : undefined
        });
        if (Array.isArray(data)) {
          const valid = data.filter(s => {
            const st = String(s.status || '').toLowerCase();
            return !st || st === 'active' || st === 'successful' || st === 'completed';
          });
          const map = new Map<string, CourseSubscription>();
          for (const item of valid) {
            const emailOrId = (item.studentEmail || item.studentId || '').toLowerCase().trim();
            if (emailOrId && !map.has(emailOrId)) {
              map.set(emailOrId, item);
            }
          }
          const uniqueList = Array.from(map.values());
          setEnrolledLearners(uniqueList);
          if (uniqueList.length > 0 && !selectedLearner) {
            setSelectedLearner(uniqueList[0]);
          }
        }
      } catch (err) {
        console.warn('Failed loading enrolled learners for direct messages:', err);
      } finally {
        setLoadingEnrolledLearners(false);
      }
    };
    fetchEnrolled();
  }, [courses, currentUser]);

  const filteredEnrolledLearners = enrolledLearners.filter(l => {
    const q = learnerSearch.toLowerCase();
    return !q || 
      (l.studentName && l.studentName.toLowerCase().includes(q)) ||
      (l.studentEmail && l.studentEmail.toLowerCase().includes(q)) ||
      (l.courseTitle && l.courseTitle.toLowerCase().includes(q));
  });

  const currentStudentKey = selectedLearner ? (selectedLearner.studentEmail || selectedLearner.studentId) : '';

  useEffect(() => {
    if (!currentStudentKey) return;
    const fetchMessages = async () => {
      try {
        const res = await apiFetch(`instructor-messages.php?student_email=${encodeURIComponent(currentStudentKey)}&instructor_id=${encodeURIComponent(currentUser?.id || '')}`, { silent: true }, 0);
        if (res && res.success && Array.isArray(res.messages)) {
          setConversations(prev => ({
            ...prev,
            [currentStudentKey]: res.messages
          }));
        }
      } catch (e) {
        // ignore
      }
    };
    fetchMessages();
  }, [currentStudentKey, currentUser]);

  const currentChatMessages = conversations[currentStudentKey] || [];

  const handleSendTicketMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsgText.trim() || !currentStudentKey) return;

    const text = newMsgText.trim();
    const newMsg = { sender: 'instructor', text, time: 'Just now' };
    const updated = [...currentChatMessages, newMsg];
    setConversations(prev => ({
      ...prev,
      [currentStudentKey]: updated
    }));
    setNewMsgText('');

    try {
      await apiFetch('instructor-messages.php', {
        method: 'POST',
        body: JSON.stringify({
          action: 'send_message',
          student_email: currentStudentKey,
          instructor_id: currentUser?.id,
          instructor_name: currentUser?.name || 'Instructor',
          text,
          sender: 'instructor'
        })
      });
    } catch (e) {
      console.warn('Failed to send message via API:', e);
    }
  };

  // Requests state
  const [requests, setRequests] = useState<CommunicationRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [requestFilter, setRequestFilter] = useState<'all' | 'pending' | 'approved' | 'declined'>('all');
  const [requestSearch, setRequestSearch] = useState('');

  // Active modal for responding to learner request
  const [respondingReq, setRespondingReq] = useState<CommunicationRequest | null>(null);
  const [responseAction, setResponseAction] = useState<'approve' | 'decline'>('approve');
  const [responseNote, setResponseNote] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Admin Request Page State (Instructor -> Admin)
  const [isCreatingAdminRequest, setIsCreatingAdminRequest] = useState(false);
  const [adminReqType, setAdminReqType] = useState<'approval' | 'payout' | 'sponsorship' | 'support' | 'custom'>('approval');
  const [adminReqCourseId, setAdminReqCourseId] = useState('');
  const [adminReqTitle, setAdminReqTitle] = useState('');
  const [adminReqDetails, setAdminReqDetails] = useState('');

  const loadRequestsData = async () => {
    setIsLoadingRequests(true);
    try {
      const data = await fetchRequestsApi();
      setRequests(data);
    } catch (err) {
      console.error('Failed to load requests data', err);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  useEffect(() => {
    loadRequestsData();
  }, []);

  useEffect(() => {
    if (autoOpenCategoryRequestModal) {
      setRequestRecipientSubTab('admin');
      setAdminReqType('custom');
      setAdminReqTitle('New Course Category Suggestion Request');
      setAdminReqDetails('Suggested Category Name:\n[Type your suggested category name here]\n\nReason/Description:\nPlease review and approve this category for my course.');
      setIsCreatingAdminRequest(true);
      if (onClearAutoOpenCategoryRequest) {
        onClearAutoOpenCategoryRequest();
      }
    }
  }, [autoOpenCategoryRequestModal]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsgText.trim()) return;
    setChatMessages([
      ...chatMessages,
      { sender: 'instructor', text: newMsgText, time: 'Just now' }
    ]);
    setNewMsgText('');
  };

  const handleProcessRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!respondingReq) return;

    setIsSubmitting(true);
    const newStatus = responseAction === 'approve' ? 'approved' : 'declined';

    try {
      await updateRequestStatusApi(respondingReq.id, newStatus, responseNote, currentUser?.name || 'Instructor');
      setRequests(prev => prev.map(r => r.id === respondingReq.id ? {
        ...r,
        status: newStatus,
        replyNote: responseNote.trim() || (newStatus === 'approved' ? 'Request approved by instructor.' : 'Request declined.'),
        repliedBy: currentUser?.name || 'Instructor'
      } : r));

      setActionSuccessMsg(`Request successfully ${newStatus}! Notification dispatched.`);
      setRespondingReq(null);
      setResponseNote('');
      setTimeout(() => setActionSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to update request', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAdminRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminReqTitle.trim() || !adminReqDetails.trim()) return;

    setIsSubmitting(true);
    const selectedCourse = courses.find(c => c.id === adminReqCourseId);

    try {
      const res = await createRequestApi({
        senderType: 'instructor',
        senderId: currentUser?.id || 'inst-1',
        senderName: currentUser?.name || 'Michael Omare',
        senderEmail: currentUser?.email || 'MICHAELOMARE045@gmail.com',
        recipientType: 'admin',
        type: adminReqType,
        courseId: adminReqCourseId,
        courseTitle: selectedCourse?.title || '',
        title: adminReqTitle.trim(),
        details: adminReqDetails.trim(),
      });

      if (res && res.request) {
        setRequests(prev => [res.request, ...prev]);
      }

      setActionSuccessMsg('Request submitted to Platform Administration!');
      setIsCreatingAdminRequest(false);
      setAdminReqTitle('');
      setAdminReqDetails('');
      setAdminReqCourseId('');
      setRequestRecipientSubTab('admin');
      setTimeout(() => setActionSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to create admin request', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter requests according to subtab:
  // 'instructor' subtab = recipientType === 'instructor' (Users to Instructor)
  // 'admin' subtab = senderType === 'instructor' & recipientType === 'admin' (Instructor to Admin)
  const currentCategoryRequests = requests.filter(req => {
    if (requestRecipientSubTab === 'instructor') {
      return req.recipientType === 'instructor';
    } else {
      return req.recipientType === 'admin';
    }
  });

  const filteredRequests = currentCategoryRequests.filter(req => {
    const matchesFilter = requestFilter === 'all' || req.status === requestFilter;
    const q = requestSearch.toLowerCase();
    const matchesSearch = !q || 
      req.senderName.toLowerCase().includes(q) ||
      req.title.toLowerCase().includes(q) ||
      req.details.toLowerCase().includes(q) ||
      (req.courseTitle && req.courseTitle.toLowerCase().includes(q));
    return matchesFilter && matchesSearch;
  });

  const pendingCount = currentCategoryRequests.filter(r => r.status === 'pending').length;
  const approvedCount = currentCategoryRequests.filter(r => r.status === 'approved').length;
  const declinedCount = currentCategoryRequests.filter(r => r.status === 'declined').length;

  return (
    <div className="space-y-6">

      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-2xl text-xs font-bold flex items-center space-x-2 animate-fadeIn shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}
      
      {/* 1. DIRECT MESSAGES TAB */}
      {tab === 'direct-messages' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-none grid grid-cols-1 md:grid-cols-3 min-h-[580px] rounded-none">
          {/* Left Enrolled Learners List (WhatsApp chat list style) */}
          <div className={`border-r border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex flex-col ${selectedLearner ? 'hidden md:flex' : 'flex'} col-span-1`}>
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Enrolled Learners ({filteredEnrolledLearners.length})</span>
              </h3>
            </div>

            {/* Search input */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search student or course..."
                  value={learnerSearch}
                  onChange={(e) => setLearnerSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800 border-0 rounded-sm text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-0 flex-1 overflow-y-auto">
              {loadingEnrolledLearners ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading enrolled learners...</div>
              ) : filteredEnrolledLearners.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">No enrolled learners found for your courses.</div>
              ) : (
                filteredEnrolledLearners.map((learner) => {
                  const lKey = learner.studentEmail || learner.studentId;
                  const isSelected = selectedLearner && (selectedLearner.studentEmail === learner.studentEmail || selectedLearner.studentId === learner.studentId);
                  const avatarUrl = (learner as any).studentAvatar || (learner as any).learnerAvatar || (learner as any).avatar || (learner as any).avatar_url || '';
                  return (
                    <button
                      key={lKey}
                      onClick={() => setSelectedLearner(learner)}
                      className={`w-full p-3 text-left transition-all cursor-pointer border-b border-slate-100 dark:border-slate-800/60 flex items-center space-x-3 ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/50 border-l-4 border-indigo-600'
                          : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-indigo-100 dark:bg-indigo-950 font-bold flex items-center justify-center text-xs shrink-0 border border-slate-200 dark:border-slate-700">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={learner.studentName || 'Student'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-indigo-600 dark:text-indigo-400">{(learner.studentName || 'S').charAt(0)}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">{learner.studentName || 'Student'}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {learner.courseTitle || 'Enrolled Course'}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Ticket Thread & Messaging (WhatsApp chat window style) */}
          <div className={`md:col-span-2 flex flex-col justify-between bg-slate-50/30 dark:bg-slate-900/40 ${selectedLearner ? 'flex' : 'hidden md:flex'}`}>
            {selectedLearner ? (
              <>
                {/* Chat Header */}
                <div className="border-b border-slate-200 dark:border-slate-800 p-3.5 flex items-center justify-between bg-white dark:bg-slate-900">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setSelectedLearner(null)}
                      className="md:hidden p-1 mr-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-sm cursor-pointer"
                      title="Back to chat list"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 border border-slate-200 dark:border-slate-700">
                      {((l: any) => l.studentAvatar || l.learnerAvatar || l.avatar || l.avatar_url || '')(selectedLearner) ? (
                        <img src={((l: any) => l.studentAvatar || l.learnerAvatar || l.avatar || l.avatar_url || '')(selectedLearner)} alt={selectedLearner.studentName || 'Student'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span>{(selectedLearner.studentName || 'S').charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">
                        {selectedLearner.studentName || 'Student'}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {selectedLearner.studentEmail || 'student@uqlearn.org'} • <span className="text-indigo-600 dark:text-indigo-400 font-bold">{selectedLearner.courseTitle}</span>
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-sm bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                    Active Ticket
                  </span>
                </div>

                {/* Message History */}
                <div className="p-4 space-y-3 flex-1 overflow-y-auto bg-slate-100/50 dark:bg-slate-950/30">
                  <div className="text-center my-2">
                    <span className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-sm text-[10px] font-bold text-slate-500">
                      Direct Ticket Session Started
                    </span>
                  </div>

                  {currentChatMessages.map((msg, idx) => (
                    <div 
                      key={idx} 
                      className={`flex ${msg.sender === 'instructor' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-md p-3 rounded-sm text-xs leading-relaxed ${
                        msg.sender === 'instructor'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700'
                      }`}>
                        <p>{msg.text}</p>
                        <span className={`text-[9px] block mt-1 text-right ${msg.sender === 'instructor' ? 'text-indigo-200' : 'text-slate-400'}`}>
                          {msg.time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input Composer */}
                <form onSubmit={handleSendTicketMessage} className="flex items-center space-x-2 p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <input
                    type="text"
                    placeholder={`Type a reply to ${selectedLearner.studentName || 'student'}...`}
                    value={newMsgText}
                    onChange={(e) => setNewMsgText(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-sm text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={!newMsgText.trim()}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-sm text-xs font-bold shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-2">
                <MessageCircle className="w-12 h-12 text-slate-300 dark:text-slate-700" />
                <p className="text-xs font-bold">Select a conversation from the list to start messaging.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. DYNAMIC REQUESTS TAB */}
      {tab === 'requests' && (
        <div className="space-y-6">
          {isCreatingAdminRequest ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 space-y-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setIsCreatingAdminRequest(false)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer flex items-center space-x-1"
                    title="Back to Requests"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-xs font-bold">Back to Requests</span>
                  </button>
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
                      Submit Official Request to Platform Admin
                    </h2>
                  </div>
                </div>
              </div>

              <form onSubmit={handleCreateAdminRequest} className="space-y-6 max-w-3xl">
                {/* Message Callout for Category Suggestion */}
                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-2xl text-xs space-y-1 text-indigo-950 dark:text-indigo-200">
                  <div className="flex items-center space-x-2 font-bold text-indigo-900 dark:text-indigo-300">
                    <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>Suggest a Category Name for Admin Review & Approval</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-indigo-800/90 dark:text-indigo-300/90 pl-6">
                    Submit your suggested category name to platform administration. <strong>You can proceed with creating your course selecting any available temporary category for now.</strong> After admin review and approval, you can easily change your course category later in your course settings!
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Request Category
                    </label>
                    <select
                      value={adminReqType}
                      onChange={(e) => setAdminReqType(e.target.value as any)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 font-medium"
                    >
                      <option value="approval">Course Content & Publication Review Approval</option>
                      <option value="payout">Payout Wire & Bank Swift Code Verification</option>
                      <option value="sponsorship">Course Ad Sponsorship & Top Spotlight Request</option>
                      <option value="support">Technical & Educator Support Inquiry</option>
                      <option value="custom">General Custom Administrative Request</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Target Course (Optional)
                    </label>
                    <select
                      value={adminReqCourseId}
                      onChange={(e) => setAdminReqCourseId(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 font-medium"
                    >
                      <option value="">-- No Specific Course --</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Request Subject Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Request for Module 3 Video Re-review..."
                    value={adminReqTitle}
                    onChange={(e) => setAdminReqTitle(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Detailed Request Explanation
                  </label>
                  <textarea
                    rows={6}
                    placeholder="Provide full context for the administrator team..."
                    value={adminReqDetails}
                    onChange={(e) => setAdminReqDetails(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsCreatingAdminRequest(false)}
                    className="px-5 py-2.5 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-2xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition-all cursor-pointer flex items-center space-x-2"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Submit Request to Admin</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <>
              <div className="flex justify-end">
                <button
                  onClick={() => setIsCreatingAdminRequest(true)}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-none text-xs font-bold shadow-md transition-all flex items-center space-x-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Request to Admin</span>
                </button>
              </div>

              {/* Subtab Switcher: User -> Instructor vs Instructor -> Admin */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6">
                <button
                  onClick={() => setRequestRecipientSubTab('instructor')}
                  className={`pb-3 text-xs font-black uppercase tracking-wider transition-all flex items-center space-x-2 cursor-pointer border-b-2 -mb-px ${
                    requestRecipientSubTab === 'instructor'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Learner Requests (User → Instructor)</span>
                </button>

                <button
                  onClick={() => setRequestRecipientSubTab('admin')}
                  className={`pb-3 text-xs font-black uppercase tracking-wider transition-all flex items-center space-x-2 cursor-pointer border-b-2 -mb-px ${
                    requestRecipientSubTab === 'admin'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Admin Requests (Instructor → Admin)</span>
                </button>
              </div>

              {/* Search & Status Filter */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                  {(['all', 'pending', 'approved', 'declined'] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => setRequestFilter(status)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer whitespace-nowrap ${
                        requestFilter === status
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {status === 'all' ? 'All Requests' : status}
                    </button>
                  ))}
                </div>

                <div className="relative w-full md:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search name, course, title..."
                    value={requestSearch}
                    onChange={(e) => setRequestSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Distinct UI Layouts for the 2 Request Sub-Tabs */}
              {isLoadingRequests ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-16 text-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-600" />
                  <span className="text-xs font-bold">Fetching requests from backend...</span>
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-16 text-center text-slate-400 space-y-2">
                  <Inbox className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
                  <p className="text-xs font-bold">No requests found in this view.</p>
                </div>
              ) : requestRecipientSubTab === 'instructor' ? (
                /* UI STYLE 1: Learner Requests (Card Grid Layout tailored for Student Interaction) */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredRequests.map(req => (
                    <div 
                      key={req.id} 
                      className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        {/* Header: Student Info & Status Badge */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black flex items-center justify-center text-xs shrink-0 border border-indigo-200/60 dark:border-indigo-800">
                              {req.senderName.charAt(0)}
                            </div>
                            <div>
                              <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">{req.senderName}</h4>
                              <p className="text-[10px] text-slate-400">{req.senderEmail}</p>
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            req.status === 'pending'
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/60'
                              : req.status === 'approved'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/60'
                          }`}>
                            {req.status}
                          </span>
                        </div>

                        {/* Course & Inquiry Type */}
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-mono text-[10px] font-bold uppercase">
                            {req.type}
                          </span>
                          {req.courseTitle && (
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                              • {req.courseTitle}
                            </span>
                          )}
                        </div>

                        {/* Title & Details */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5">
                          <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">{req.title}</h5>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{req.details}</p>
                          {req.replyNote && (
                            <div className="pt-2 mt-2 border-t border-slate-200/60 dark:border-slate-700 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                              Instructor Note: {req.replyNote}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 font-medium">{req.date}</span>
                        <div className="flex items-center space-x-2">
                          {req.status === 'pending' ? (
                            <>
                              <button
                                onClick={() => {
                                  setRespondingReq(req);
                                  setResponseAction('approve');
                                }}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-[11px] transition-all flex items-center space-x-1 cursor-pointer shadow-xs"
                              >
                                <Check className="w-3 h-3" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => {
                                  setRespondingReq(req);
                                  setResponseAction('decline');
                                }}
                                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-[11px] transition-all flex items-center space-x-1 cursor-pointer shadow-xs"
                              >
                                <XCircle className="w-3 h-3" />
                                <span>Decline</span>
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setSelectedStudent(req.senderName)}
                              className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                            >
                              Open Chat
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* UI STYLE 2: Admin Requests (Executive Ticket Timeline & Status Board Layout) */
                <div className="space-y-4">
                  {filteredRequests.map(req => (
                    <div 
                      key={req.id} 
                      className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                          <span className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800">
                            <Building2 className="w-4 h-4" />
                          </span>
                          <span className="px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-mono text-[10px] font-bold uppercase">
                            {req.type} Request
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            req.status === 'pending'
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/60'
                              : req.status === 'approved'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/60'
                          }`}>
                            {req.status}
                          </span>
                          <span className="text-slate-400 text-[11px]">• Submitted on {req.date}</span>
                        </div>

                        <div className="space-y-1">
                          <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">{req.title}</h4>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                            {req.details}
                          </p>
                        </div>

                        {req.courseTitle && (
                          <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center space-x-1">
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Target Course: {req.courseTitle}</span>
                          </div>
                        )}

                        {req.replyNote && (
                          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                            <strong>Platform Admin Response:</strong> {req.replyNote} {req.repliedBy ? `(by ${req.repliedBy})` : ''}
                          </div>
                        )}
                      </div>

                      {/* Status Stepper / Indicator */}
                      <div className="flex flex-col items-end justify-center shrink-0 w-full md:w-48 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-4 md:pt-0 md:pl-6 space-y-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Workflow Status</div>
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${req.status === 'pending' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                          <span className="text-xs font-black capitalize text-slate-900 dark:text-slate-100">
                            {req.status === 'pending' ? 'Awaiting Review' : req.status === 'approved' ? 'Approved by Admin' : 'Declined'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 text-right">UQlearn Enterprise Board</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Modal for Responding to Learner Request */}
          {respondingReq && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
              <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {responseAction === 'approve' ? 'Approve Learner Request' : 'Decline Learner Request'}
                  </h3>
                  <button
                    onClick={() => setRespondingReq(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs space-y-1">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{respondingReq.senderName}</span>
                    <p className="text-slate-500 line-clamp-2">"{respondingReq.details}"</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Response Note
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Note to learner..."
                      value={responseNote}
                      onChange={(e) => setResponseNote(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setRespondingReq(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleProcessRequest}
                    disabled={isSubmitting}
                    className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all cursor-pointer flex items-center space-x-1.5 ${
                      responseAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                    }`}
                  >
                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Confirm {responseAction === 'approve' ? 'Approval' : 'Decline'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
