import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { apiFetch } from '../../lib/apiConfig';
import { resolveBrandingLogoUrl, DEFAULT_LOGO_URL } from '../../lib/branding';
import { 
  Inbox, 
  MessageSquare, 
  RefreshCw, 
  Send, 
  Loader2, 
  Mail, 
  StickyNote, 
  CheckCircle2, 
  User, 
  Tag, 
  Sparkles,
  ShieldCheck,
  Search,
  Filter
} from 'lucide-react';

export interface ChatMessage {
  id?: number | string;
  course_id?: string;
  courseId?: string;
  sender_role?: string;
  senderRole?: string;
  recipient?: string;
  message: string;
  created_at: string;
}

export const ReviewerInbox: React.FC = () => {
  const { logoUrl, courses } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [activeCourseId, setActiveCourseId] = useState<string>('');
  const [sidebarFilter, setSidebarFilter] = useState<'all' | 'assigned' | 'unread'>('all');
  const [listTabFilter, setListTabFilter] = useState<'all' | 'unread'>('all');
  const [composerMode, setComposerMode] = useState<'reply' | 'note'>('reply');
  const [emailInstructor, setEmailInstructor] = useState<boolean>(true);
  const [inputText, setInputText] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showQuickReplies, setShowQuickReplies] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch messages from backend
  const fetchMessages = async () => {
    try {
      const res = await apiFetch('reviewer-chat.php');
      if (res && res.success && Array.isArray(res.messages)) {
        setMessages(res.messages);
      }
    } catch (err) {
      console.warn('Failed to fetch reviewer chat messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  // Group messages by course_id
  const courseMap = React.useMemo(() => {
    const map: Record<string, ChatMessage[]> = {};

    // First populate from existing course catalog
    courses.forEach(c => {
      if (c.id) {
        map[c.id] = [];
      }
    });

    // Populate messages
    messages.forEach(msg => {
      const cid = msg.course_id || msg.courseId || 'general';
      if (!map[cid]) {
        map[cid] = [];
      }
      map[cid].push(msg);
    });

    return map;
  }, [messages, courses]);

  // List of course IDs with activity
  const courseIds = React.useMemo(() => {
    const keys = Object.keys(courseMap);
    // Sort so courses with messages appear first, sorted by last message time
    return keys.sort((a, b) => {
      const msgsA = courseMap[a];
      const msgsB = courseMap[b];
      const lastA = msgsA.length > 0 ? new Date(msgsA[msgsA.length - 1].created_at).getTime() : 0;
      const lastB = msgsB.length > 0 ? new Date(msgsB[msgsB.length - 1].created_at).getTime() : 0;
      return lastB - lastA;
    });
  }, [courseMap]);

  // Set default active course ID
  useEffect(() => {
    if (!activeCourseId && courseIds.length > 0) {
      setActiveCourseId(courseIds[0]);
    }
  }, [courseIds, activeCourseId]);

  // Auto scroll to bottom of chat thread when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeCourseId]);

  // Filtered course thread list
  const filteredCourseIds = React.useMemo(() => {
    let ids = courseIds;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      ids = ids.filter(cid => {
        const courseObj = courses.find(c => c.id === cid);
        const titleMatch = courseObj ? courseObj.title.toLowerCase().includes(q) : false;
        const idMatch = cid.toLowerCase().includes(q);
        return titleMatch || idMatch;
      });
    }
    return ids;
  }, [courseIds, searchQuery, courses]);

  const currentCourse = courses.find(c => c.id === activeCourseId);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeCourseId || sending) return;

    setSending(true);
    const msgContent = composerMode === 'note' ? `[INTERNAL NOTE] ${inputText.trim()}` : inputText.trim();

    try {
      // 1. Send chat message to backend API
      await apiFetch('reviewer-chat.php', {
        method: 'POST',
        body: JSON.stringify({
          course_id: activeCourseId,
          courseId: activeCourseId,
          sender_role: 'reviewer',
          senderRole: 'reviewer',
          recipient: 'instructor',
          message: msgContent
        })
      });

      // 2. Dispatch email to instructor if checked and reply mode
      if (emailInstructor && composerMode === 'reply') {
        try {
          await apiFetch('reviewer-email-instructor.php', {
            method: 'POST',
            body: JSON.stringify({
              course_id: activeCourseId,
              courseId: activeCourseId,
              message: inputText.trim(),
              sender_name: 'Course Reviewer'
            })
          });
        } catch (e) {
          console.warn('Failed to send reviewer email dispatch:', e);
        }
      }

      setInputText('');
      await fetchMessages();
    } catch (err: any) {
      alert(err.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const activeThreadMessages = activeCourseId ? (courseMap[activeCourseId] || []) : [];

  return (
    <div className="h-[calc(100vh-5rem)] bg-slate-900 text-slate-100 flex overflow-hidden rounded-2xl border border-slate-800 shadow-2xl font-sans">
      
      {/* 1. LEFT SIDEBAR */}
      <div className="w-60 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 p-4 select-none">
        
        {/* Logo Card with Circular Logo */}
        <div className="flex items-center space-x-3 pb-4 mb-4 border-b border-slate-800">
          <div className="w-11 h-11 rounded-full bg-white border border-slate-700 shadow-md p-1 flex items-center justify-center shrink-0 overflow-hidden">
            <img 
              src={resolveBrandingLogoUrl(logoUrl)} 
              alt="UQLearn Logo" 
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_LOGO_URL; }}
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <div>
            <h3 className="text-sm font-black text-white tracking-tight">UQLearn</h3>
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">Reviewer Inbox</span>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="space-y-4 flex-1 overflow-y-auto no-scrollbar">
          <div>
            <button
              onClick={() => setSidebarFilter('all')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                sidebarFilter === 'all' 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Inbox className="w-4 h-4" />
                <span>All Inbox</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                {courseIds.length}
              </span>
            </button>
          </div>

          <div className="space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-1">Views</div>
            <button
              onClick={() => setSidebarFilter('assigned')}
              className={`w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                sidebarFilter === 'assigned' ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Assigned to me</span>
            </button>
            <button
              onClick={() => setSidebarFilter('unread')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                sidebarFilter === 'unread' ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Unread</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-blue-500" />
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
          <span className="flex items-center space-x-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Auditor Connected</span>
          </span>
          <button onClick={fetchMessages} className="hover:text-indigo-400 cursor-pointer p-1">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

      </div>

      {/* 2. MIDDLE COLUMN (Inbox Conversation List) */}
      <div className="w-80 bg-slate-950/70 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <span>Conversations</span>
              <span className="bg-indigo-500/20 text-indigo-400 text-xs px-2 py-0.5 rounded-md font-mono">
                {filteredCourseIds.length}
              </span>
            </h2>
            <button 
              onClick={fetchMessages}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-lg text-xs cursor-pointer transition-colors"
              title="Refresh messages"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-800 text-xs font-semibold text-slate-400">
            <button 
              onClick={() => setListTabFilter('all')} 
              className={`pb-2 px-3 border-b-2 cursor-pointer ${listTabFilter === 'all' ? 'border-indigo-500 text-indigo-400 font-bold' : 'border-transparent hover:text-white'}`}
            >
              All Threads
            </button>
            <button 
              onClick={() => setListTabFilter('unread')} 
              className={`pb-2 px-3 border-b-2 cursor-pointer ${listTabFilter === 'unread' ? 'border-indigo-500 text-indigo-400 font-bold' : 'border-transparent hover:text-white'}`}
            >
              Unread
            </button>
          </div>
        </div>

        {/* Conversation Cards List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 no-scrollbar">
          {loading && messages.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs space-y-2">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400 mx-auto" />
              <p>Loading reviewer threads...</p>
            </div>
          ) : filteredCourseIds.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs space-y-1">
              <MessageSquare className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p className="font-bold text-slate-400">No conversations found</p>
              <p className="text-[11px] text-slate-600">No courses match your search or filters.</p>
            </div>
          ) : (
            filteredCourseIds.map(cid => {
              const msgs = courseMap[cid] || [];
              const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
              const courseObj = courses.find(c => c.id === cid);
              const isSelected = cid === activeCourseId;
              const timeStr = lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

              return (
                <div
                  key={cid}
                  onClick={() => setActiveCourseId(cid)}
                  className={`p-4 cursor-pointer transition-all border-l-4 ${
                    isSelected 
                      ? 'bg-indigo-950/40 border-l-indigo-500' 
                      : 'hover:bg-slate-900/60 border-l-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-bold text-white truncate max-w-[170px]">
                      {courseObj ? courseObj.title : cid}
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">{timeStr}</span>
                  </div>

                  <div className="text-[11px] text-slate-400 truncate flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                    <span className="truncate">
                      {lastMsg ? lastMsg.message.replace('[INTERNAL NOTE]', '📌 Note: ') : 'No messages yet in this thread.'}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center space-x-2 text-[10px]">
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 font-mono border border-slate-800">
                      ID: {cid}
                    </span>
                    {courseObj?.instructor && (
                      <span className="text-slate-400 font-medium truncate">
                        • {courseObj.instructor}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* 3. RIGHT COLUMN (Chat Thread & Intercom Composer) */}
      <div className="flex-1 bg-slate-900 flex flex-col min-w-0">
        
        {/* Thread Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div>
            <h1 className="text-base font-bold text-white flex items-center space-x-2">
              <span>{currentCourse ? currentCourse.title : `Course Chat: ${activeCourseId}`}</span>
            </h1>
            <div className="text-xs text-slate-400 flex items-center space-x-2 mt-0.5">
              <span>Instructor: <strong className="text-slate-200">{currentCourse?.instructor || 'Course Creator'}</strong></span>
              <span>•</span>
              <span className="font-mono text-[11px] text-indigo-400">Course ID: {activeCourseId}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30 flex items-center space-x-1">
              <Tag className="w-3 h-3 text-purple-400" />
              <span>Reviewer Thread</span>
            </span>
          </div>
        </div>

        {/* Messages Thread Display */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-950/20">
          {activeThreadMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-3">
              <MessageSquare className="w-10 h-10 text-slate-700" />
              <div>
                <p className="font-bold text-slate-400 text-sm">No messages in this course thread</p>
                <p className="text-xs text-slate-600 max-w-sm mt-1">
                  Send a message or internal note to start communicating with the course instructor.
                </p>
              </div>
            </div>
          ) : (
            activeThreadMessages.map((msg, index) => {
              const isReviewer = (msg.sender_role || msg.senderRole) === 'reviewer';
              const isInternalNote = msg.message.startsWith('[INTERNAL NOTE]');
              const cleanText = isInternalNote ? msg.message.replace('[INTERNAL NOTE]', '').trim() : msg.message;
              const timeStr = msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

              if (isInternalNote) {
                return (
                  <div key={index} className="my-3 flex justify-center">
                    <div className="w-11/12 bg-purple-950/40 border border-purple-800/60 rounded-xl p-3 text-purple-200 text-xs shadow-md">
                      <div className="flex items-center space-x-1.5 font-bold text-[11px] text-purple-300 uppercase tracking-wider mb-1">
                        <StickyNote className="w-3.5 h-3.5 text-purple-400" />
                        <span>Internal Reviewer Note • {timeStr}</span>
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap">{cleanText}</p>
                    </div>
                  </div>
                );
              }

              return (
                <div key={index} className={`flex flex-col ${isReviewer ? 'items-end' : 'items-start'}`}>
                  <div className="text-[10px] text-slate-500 mb-1 font-mono flex items-center space-x-1">
                    <span>{isReviewer ? 'Reviewer' : (currentCourse?.instructor || 'Instructor')}</span>
                    <span>•</span>
                    <span>{timeStr}</span>
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm font-sans ${
                    isReviewer 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-slate-800 text-slate-100 border border-slate-700/80 rounded-tl-none'
                  }`}>
                    {cleanText}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input & Composer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60">
          
          {/* Mode Toggles */}
          <div className="flex items-center space-x-2 mb-3">
            <button
              type="button"
              onClick={() => {
                setComposerMode('reply');
                setEmailInstructor(true);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                composerMode === 'reply' 
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
              <span>Reply to Instructor</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setComposerMode('note');
                setEmailInstructor(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                composerMode === 'note' 
                  ? 'bg-purple-950/80 text-purple-200 border border-purple-700 shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <StickyNote className="w-3.5 h-3.5 text-purple-400" />
              <span>Internal Note</span>
            </button>
          </div>

          {/* Text Area Input Box */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden focus-within:border-indigo-500 transition-all shadow-inner">
            <textarea
              rows={3}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                composerMode === 'note' 
                  ? "Write an internal reviewer note (visible only to reviewers)..." 
                  : "Write your message to the instructor..."
              }
              className="w-full bg-transparent p-3 text-xs text-white placeholder-slate-500 focus:outline-none resize-none font-sans"
            />

            {/* Actions Bar */}
            <div className="p-2.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
              
              {/* Checkbox: Email Instructor */}
              <label className={`flex items-center space-x-2 text-xs font-semibold cursor-pointer select-none ${composerMode === 'note' ? 'opacity-40 cursor-not-allowed text-slate-500' : 'text-slate-300 hover:text-white'}`}>
                <input
                  type="checkbox"
                  disabled={composerMode === 'note'}
                  checked={emailInstructor}
                  onChange={(e) => setEmailInstructor(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0 cursor-pointer accent-indigo-600"
                />
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                <span>Email Instructor</span>
              </label>

              {/* Send Button with Spinner on loading */}
              <button
                type="button"
                disabled={sending || !inputText.trim() || !activeCourseId}
                onClick={handleSendMessage}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs transition-all shadow-lg flex items-center space-x-2 cursor-pointer"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <span>Send Message</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
