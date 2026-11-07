import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Course } from '../../types';
import { useApp } from '../../context/AppContext';
import { apiFetch } from '../../lib/apiConfig';
import { resolveBrandingLogoUrl, DEFAULT_LOGO_URL, resolveImageUrl } from '../../lib/branding';
import { 
  Inbox, 
  MessageSquare, 
  RefreshCw, 
  Send, 
  Loader2, 
  Mail, 
  StickyNote, 
  User, 
  Tag, 
  ShieldCheck,
  Search,
  ArrowLeft,
  X,
  Sparkles,
  Paperclip,
  Image as ImageIcon,
  Maximize2,
  Download,
  CheckCircle2
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

interface ReviewerInboxProps {
  initialCourseId?: string;
  onClose?: () => void;
  assignedCourses?: Course[];
}

// Client-side image compression utility
const compressImageFile = (file: File, maxWidth = 1200, quality = 0.82): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

export const ReviewerInbox: React.FC<ReviewerInboxProps> = ({
  initialCourseId,
  onClose,
  assignedCourses: propAssignedCourses
}) => {
  const { logoUrl, courses: contextCourses, currentUser } = useApp();

  const [remoteAssignedCourseIds, setRemoteAssignedCourseIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [sidebarFilter, setSidebarFilter] = useState<'all' | 'assigned' | 'unread'>('all');
  const [composerMode, setComposerMode] = useState<'reply' | 'note'>('reply');
  const [emailInstructor, setEmailInstructor] = useState<boolean>(true);
  const [inputText, setInputText] = useState<string>('');
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showQuickReplies, setShowQuickReplies] = useState<boolean>(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch remote assigned courses for current reviewer from reviewer-assignments.php
  useEffect(() => {
    if (currentUser?.email || currentUser?.id) {
      const reviewerIdentifier = currentUser.email || currentUser.id;
      apiFetch(`reviewer-assignments.php?reviewer_id=${encodeURIComponent(reviewerIdentifier)}`)
        .then(res => {
          if (res && res.success && Array.isArray(res.courses)) {
            const ids = res.courses.map((rc: any) => rc.id).filter(Boolean);
            setRemoteAssignedCourseIds(ids);
          }
        })
        .catch(e => console.warn('Failed to fetch remote reviewer assignments:', e));
    }
  }, [currentUser]);

  // Helper to check if a course is assigned to current reviewer
  const isCourseAssignedToCurrentReviewer = (c: Course) => {
    if (!currentUser) return true;
    const userEmail = (currentUser.email || '').toLowerCase().trim();
    const userId = (currentUser.id || '').toString().trim();
    
    const assignedEmail = (c.assignedReviewerEmail || c.assigned_reviewer_email || '').toLowerCase().trim();
    const assignedId = (c.assignedReviewerId || c.assigned_reviewer_id || '').toString().trim();
    const reviewedBy = (c.reviewedBy || '').toLowerCase().trim();

    if (assignedEmail && userEmail && assignedEmail === userEmail) return true;
    if (assignedId && userId && assignedId === userId) return true;
    if (reviewedBy && userEmail && reviewedBy === userEmail) return true;
    if (remoteAssignedCourseIds.includes(c.id)) return true;

    return false;
  };

  // Strictly filter to courses assigned to this reviewer
  const assignedCourses = useMemo(() => {
    if (propAssignedCourses && propAssignedCourses.length > 0) {
      return propAssignedCourses;
    }

    const assignedToMe = contextCourses.filter(c => isCourseAssignedToCurrentReviewer(c));

    const coursesWithAssignmentSystemWide = contextCourses.filter(c => 
      c.assignedReviewerEmail || c.assignedReviewerId || c.assigned_reviewer_email || c.assigned_reviewer_id || remoteAssignedCourseIds.includes(c.id)
    );

    if (coursesWithAssignmentSystemWide.length > 0) {
      return assignedToMe;
    }

    return contextCourses;
  }, [propAssignedCourses, contextCourses, currentUser, remoteAssignedCourseIds]);

  const [activeCourseId, setActiveCourseId] = useState<string>(initialCourseId || (assignedCourses[0]?.id || ''));

  // Fetch messages from backend API
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

  // Update active course if initialCourseId changes
  useEffect(() => {
    if (initialCourseId) {
      setActiveCourseId(initialCourseId);
    } else if (!activeCourseId && assignedCourses.length > 0) {
      setActiveCourseId(assignedCourses[0].id);
    }
  }, [initialCourseId, assignedCourses]);

  // Group messages by course_id for assigned courses
  const courseMap = useMemo(() => {
    const map: Record<string, ChatMessage[]> = {};

    assignedCourses.forEach(c => {
      if (c.id) {
        map[c.id] = [];
      }
    });

    messages.forEach(msg => {
      const cid = msg.course_id || msg.courseId || 'general';
      if (map[cid]) {
        map[cid].push(msg);
      }
    });

    return map;
  }, [messages, assignedCourses]);

  // List of assigned course IDs sorted by activity
  const courseIds = useMemo(() => {
    const keys = assignedCourses.map(c => c.id);
    return keys.sort((a, b) => {
      const msgsA = courseMap[a] || [];
      const msgsB = courseMap[b] || [];
      const lastA = msgsA.length > 0 ? new Date(msgsA[msgsA.length - 1].created_at).getTime() : 0;
      const lastB = msgsB.length > 0 ? new Date(msgsB[msgsB.length - 1].created_at).getTime() : 0;
      return lastB - lastA;
    });
  }, [courseMap, assignedCourses]);

  // Filtered course thread list
  const filteredCourseIds = useMemo(() => {
    let ids = courseIds;

    if (sidebarFilter === 'assigned') {
      ids = ids.filter(cid => {
        const c = assignedCourses.find(item => item.id === cid);
        return c ? isCourseAssignedToCurrentReviewer(c) : true;
      });
    } else if (sidebarFilter === 'unread') {
      ids = ids.filter(cid => (courseMap[cid] || []).length > 0);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      ids = ids.filter(cid => {
        const courseObj = assignedCourses.find(c => c.id === cid);
        const titleMatch = courseObj ? courseObj.title.toLowerCase().includes(q) : false;
        const instructorMatch = courseObj ? (courseObj.instructor || '').toLowerCase().includes(q) : false;
        const idMatch = cid.toLowerCase().includes(q);
        return titleMatch || instructorMatch || idMatch;
      });
    }
    return ids;
  }, [courseIds, searchQuery, assignedCourses, sidebarFilter, courseMap]);

  const currentCourse = assignedCourses.find(c => c.id === activeCourseId);

  // Clipboard Paste Screenshot Handler (WhatsApp Style)
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) imageFiles.push(file);
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      for (const file of imageFiles) {
        try {
          const base64 = await compressImageFile(file);
          setAttachedImages(prev => [...prev, base64]);
        } catch (err) {
          console.warn('Error compressing pasted image:', err);
        }
      }
    }
  };

  // File Selector Handler
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        try {
          const base64 = await compressImageFile(file);
          setAttachedImages(prev => [...prev, base64]);
        } catch (err) {
          console.warn('Error compressing selected image:', err);
        }
      }
    }
    e.target.value = '';
  };

  const removeAttachedImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Auto scroll to bottom of chat thread when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeCourseId]);

  const handleSendMessage = async () => {
    if ((!inputText.trim() && attachedImages.length === 0) || !activeCourseId || sending) return;

    setSending(true);

    // Format text and images
    let rawContent = inputText.trim();
    if (attachedImages.length > 0) {
      const imgTags = attachedImages.map(img => `[IMAGE: ${img}]`).join('\n');
      rawContent = rawContent ? `${rawContent}\n\n${imgTags}` : imgTags;
    }

    const msgContent = composerMode === 'note' ? `[INTERNAL NOTE] ${rawContent}` : rawContent;

    try {
      // 1. Post chat message to reviewer-chat.php
      await apiFetch('reviewer-chat.php', {
        method: 'POST',
        body: JSON.stringify({
          course_id: activeCourseId,
          courseId: activeCourseId,
          sender_role: 'reviewer',
          senderRole: 'reviewer',
          recipient: currentCourse?.instructor || 'Instructor',
          message: msgContent
        })
      });

      // 2. Dispatch email to instructor if checked and reply mode
      if (emailInstructor && composerMode === 'reply') {
        try {
          // Construct HTML preview for email including screenshot attachments
          let emailHtml = inputText.trim();
          if (attachedImages.length > 0) {
            const imgHtml = attachedImages.map(img => `<br><img src="${img}" style="max-width: 100%; border-radius: 8px; margin-top: 10px;" />`).join('');
            emailHtml = `${emailHtml}${imgHtml}`;
          }

          await apiFetch('reviewer-email-instructor.php', {
            method: 'POST',
            body: JSON.stringify({
              course_id: activeCourseId,
              courseId: activeCourseId,
              message: emailHtml,
              sender_name: currentUser?.name || 'Course Reviewer'
            })
          });
        } catch (e) {
          console.warn('Failed to send reviewer email dispatch:', e);
        }
      }

      setInputText('');
      setAttachedImages([]);
      await fetchMessages();
    } catch (err: any) {
      alert(err.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  // Helper to parse message text and render images in WhatsApp style
  const renderMessageContent = (messageText: string) => {
    const isInternalNote = messageText.startsWith('[INTERNAL NOTE]');
    const clean = isInternalNote ? messageText.replace('[INTERNAL NOTE]', '').trim() : messageText;

    // Split out [IMAGE: ...] tags
    const imageTagRegex = /\[IMAGE:\s*(data:image\/[^\]]+)\]/g;
    const imageMatches: string[] = [];
    let match;

    while ((match = imageTagRegex.exec(clean)) !== null) {
      imageMatches.push(match[1]);
    }

    // Text part without image tags
    const textOnly = clean.replace(imageTagRegex, '').trim();

    return (
      <div className="space-y-2">
        {textOnly && (
          <p className="whitespace-pre-wrap leading-relaxed">{textOnly}</p>
        )}

        {/* WhatsApp-style image grid */}
        {imageMatches.length > 0 && (
          <div className={`grid gap-2 mt-2 ${imageMatches.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {imageMatches.map((imgSrc, idx) => (
              <div 
                key={idx} 
                onClick={() => setLightboxImage(imgSrc)}
                className="relative group rounded-xl overflow-hidden border border-white/20 cursor-pointer shadow-md bg-black/40 hover:opacity-95 transition-opacity"
              >
                <img 
                  src={imgSrc} 
                  alt="Attachment preview" 
                  className="w-full max-h-64 object-cover" 
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Maximize2 className="w-5 h-5 text-white" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const activeThreadMessages = activeCourseId ? (courseMap[activeCourseId] || []) : [];

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0d14] text-slate-100 flex font-sans overflow-hidden animate-in fade-in duration-200">
      
      {/* 1. LEFT SIDEBAR */}
      <div className="w-64 bg-[#0d111a] border-r border-slate-800/80 flex flex-col shrink-0 p-4 select-none">
        
        {/* Back Button (If rendered as modal overlay) */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="mb-4 flex items-center space-x-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3 py-2 rounded-xl transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-indigo-400" />
            <span>Back to Audit Queue</span>
          </button>
        )}

        {/* Circular Logo Card */}
        <div className="flex items-center space-x-3 pb-4 mb-4 border-b border-slate-800/80">
          <div className="w-12 h-12 rounded-full bg-white border-2 border-indigo-500/30 shadow-lg p-1 flex items-center justify-center shrink-0 overflow-hidden">
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

        {/* Sidebar Navigation Options */}
        <div className="space-y-4 flex-1 overflow-y-auto no-scrollbar">
          <div>
            <button
              onClick={() => setSidebarFilter('all')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                sidebarFilter === 'all' 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Inbox className="w-4 h-4" />
                <span>All Conversations</span>
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
              className={`w-full flex items-center space-x-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                sidebarFilter === 'assigned' ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span>Assigned to me</span>
            </button>
            <button
              onClick={() => setSidebarFilter('unread')}
              className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                sidebarFilter === 'unread' ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                <span>Unread</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-blue-500" />
            </button>
          </div>
        </div>

        {/* Footer Auditor Info */}
        <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
          <span className="flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-slate-400">Auditor Session Active</span>
          </span>
          <button 
            onClick={fetchMessages} 
            className="hover:text-indigo-400 cursor-pointer p-1"
            title="Sync messages"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>

      </div>

      {/* 2. MIDDLE COLUMN (Inbox List) */}
      <div className="w-80 bg-[#0f1422] border-r border-slate-800/80 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-800/80 space-y-3 bg-[#0d111a]/40">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <span>Assigned Courses</span>
              <span className="bg-indigo-500/20 text-indigo-400 text-xs px-2 py-0.5 rounded-md font-mono">
                {filteredCourseIds.length}
              </span>
            </h2>
            <button 
              onClick={fetchMessages}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-lg text-xs cursor-pointer transition-colors"
              title="Refresh list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses or instructors..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50 no-scrollbar">
          {loading && messages.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs space-y-2">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400 mx-auto" />
              <p>Loading course conversations...</p>
            </div>
          ) : filteredCourseIds.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs space-y-1">
              <MessageSquare className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p className="font-bold text-slate-400">No courses found</p>
              <p className="text-[11px] text-slate-600">No courses match your filter.</p>
            </div>
          ) : (
            filteredCourseIds.map(cid => {
              const msgs = courseMap[cid] || [];
              const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
              const courseObj = assignedCourses.find(c => c.id === cid);
              const isSelected = cid === activeCourseId;
              const timeStr = lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
              const thumbUrl = courseObj ? resolveImageUrl(courseObj.thumbnail || courseObj.image, 'course') : '';

              return (
                <div
                  key={cid}
                  onClick={() => setActiveCourseId(cid)}
                  className={`p-3.5 cursor-pointer transition-all border-l-4 flex space-x-3 items-start ${
                    isSelected 
                      ? 'bg-indigo-950/40 border-l-indigo-500 shadow-inner' 
                      : 'hover:bg-slate-900/50 border-l-transparent'
                  }`}
                >
                  {/* Course Thumbnail */}
                  <img
                    src={thumbUrl}
                    alt={courseObj?.title || cid}
                    className="w-10 h-10 rounded-lg object-cover border border-slate-800 shrink-0 mt-0.5"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://uqlearn.org/logo/logo.png'; }}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="text-xs font-bold text-white truncate max-w-[140px]">
                        {courseObj ? courseObj.title : cid}
                      </h4>
                      <span className="text-[10px] text-slate-500 font-mono">{timeStr}</span>
                    </div>

                    <div className="text-[11px] text-slate-400 truncate flex items-center space-x-1">
                      <span className="truncate">
                        {lastMsg ? lastMsg.message.replace(/\[IMAGE:[^\]]+\]/g, '🖼️ Screenshot').replace('[INTERNAL NOTE]', '📌 Note: ') : 'No messages in thread'}
                      </span>
                    </div>

                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500">
                      <span className="font-semibold text-slate-400 truncate max-w-[120px]">
                        👤 {courseObj?.instructor || 'Instructor'}
                      </span>
                      {courseObj?.reviewStatus && (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          courseObj.reviewStatus === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                          courseObj.reviewStatus === 'needs_changes' ? 'bg-rose-500/20 text-rose-400' :
                          'bg-amber-500/20 text-amber-400'
                        }`}>
                          {courseObj.reviewStatus}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* 3. RIGHT COLUMN (Reviewer Chat Thread & WhatsApp-style Composer) */}
      <div className="flex-1 bg-[#0a0d14] flex flex-col min-w-0">
        
        {/* Thread Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-[#0d111a]/60">
          <div className="flex items-center space-x-3 min-w-0">
            {currentCourse && (
              <img
                src={resolveImageUrl(currentCourse.thumbnail || currentCourse.image, 'course')}
                alt={currentCourse.title}
                className="w-11 h-11 rounded-xl object-cover border border-slate-800 shrink-0"
              />
            )}
            <div className="min-w-0">
              <h1 className="text-base font-bold text-white truncate">
                {currentCourse ? currentCourse.title : `Course Chat: ${activeCourseId}`}
              </h1>
              <div className="text-xs text-slate-400 flex items-center space-x-2 mt-0.5">
                <span>Instructor: <strong className="text-indigo-300">{currentCourse?.instructor || 'Course Creator'}</strong></span>
                <span>&bull;</span>
                <span className="font-mono text-[11px] text-slate-400">ID: {activeCourseId}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                title="Close Inbox"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Chat Thread Messages Area */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-950/30">
          {activeThreadMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-3">
              <MessageSquare className="w-10 h-10 text-slate-700" />
              <div>
                <p className="font-bold text-slate-300 text-sm">No messages with instructor yet</p>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Type your feedback or paste a screenshot (`Ctrl+V` / `Cmd+V`) below to communicate with {currentCourse?.instructor || 'the instructor'}.
                </p>
              </div>
            </div>
          ) : (
            activeThreadMessages.map((msg, index) => {
              const isReviewer = (msg.sender_role || msg.senderRole) === 'reviewer';
              const isInternalNote = msg.message.startsWith('[INTERNAL NOTE]');
              const timeStr = msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

              if (isInternalNote) {
                return (
                  <div key={index} className="my-3 flex justify-center">
                    <div className="w-11/12 bg-purple-950/50 border border-purple-800/60 rounded-xl p-3.5 text-purple-200 text-xs shadow-md">
                      <div className="flex items-center space-x-1.5 font-bold text-[11px] text-purple-300 uppercase tracking-wider mb-1">
                        <StickyNote className="w-3.5 h-3.5 text-purple-400" />
                        <span>Internal Reviewer Note &bull; {timeStr}</span>
                      </div>
                      {renderMessageContent(msg.message)}
                    </div>
                  </div>
                );
              }

              return (
                <div key={index} className={`flex flex-col ${isReviewer ? 'items-end' : 'items-start'}`}>
                  <div className="text-[10px] text-slate-500 mb-1 font-mono flex items-center space-x-1">
                    <span>{isReviewer ? 'Reviewer' : (currentCourse?.instructor || 'Instructor')}</span>
                    <span>&bull;</span>
                    <span>{timeStr}</span>
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm font-sans ${
                    isReviewer 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-slate-800 text-slate-100 border border-slate-700/80 rounded-tl-none'
                  }`}>
                    {renderMessageContent(msg.message)}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Composer Input Area with Clipboard Paste & Image Attachments */}
        <div className="p-4 border-t border-slate-800/80 bg-[#0d111a]/80">
          
          {/* Mode Toggles & Quick Replies */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  setComposerMode('reply');
                  setEmailInstructor(true);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  composerMode === 'reply' 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
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
                    ? 'bg-purple-950 text-purple-200 border border-purple-700 shadow-md' 
                    : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                }`}
              >
                <StickyNote className="w-3.5 h-3.5 text-purple-400" />
                <span>Internal Note</span>
              </button>
            </div>

            {/* Quick Replies Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowQuickReplies(!showQuickReplies)}
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-bold border border-slate-800 transition-colors flex items-center space-x-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Quick Templates</span>
              </button>

              {showQuickReplies && (
                <div className="absolute bottom-full right-0 mb-2 w-72 bg-[#161b22] border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-20 py-1 space-y-0.5">
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
                        setInputText(tmpl);
                        setShowQuickReplies(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-indigo-600 hover:text-white transition-colors cursor-pointer truncate"
                    >
                      {tmpl}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Attached Image Previews (WhatsApp Tray Style) */}
          {attachedImages.length > 0 && (
            <div className="flex items-center gap-2 mb-2 p-2 bg-slate-950 border border-indigo-500/40 rounded-xl overflow-x-auto">
              <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider px-1">
                Screenshots ({attachedImages.length}):
              </div>
              {attachedImages.map((imgSrc, i) => (
                <div key={i} className="relative group shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
                  <img src={imgSrc} alt="Pasted screenshot" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeAttachedImage(i)}
                    className="absolute top-0.5 right-0.5 bg-rose-600 text-white rounded-full p-0.5 shadow-md hover:bg-rose-500 transition-colors cursor-pointer"
                    title="Remove image"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Text Area Box with Clipboard Paste (`onPaste`) */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden focus-within:border-indigo-500 transition-all shadow-inner">
            <textarea
              rows={3}
              value={inputText}
              onPaste={handlePaste}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                composerMode === 'note' 
                  ? "Write an internal reviewer note (paste screenshots directly with Ctrl+V / Cmd+V)..." 
                  : `Write feedback to ${currentCourse?.instructor || 'instructor'} (paste screenshots directly with Ctrl+V / Cmd+V)...`
              }
              className="w-full bg-transparent p-3 text-xs text-white placeholder-slate-500 focus:outline-none resize-none font-sans"
            />

            {/* Hidden File Input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              accept="image/*" 
              multiple 
              className="hidden" 
            />

            {/* Actions Bar */}
            <div className="p-2.5 bg-[#0d111a] border-t border-slate-800 flex items-center justify-between">
              
              <div className="flex items-center space-x-3">
                {/* Image Attach Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-indigo-300 border border-slate-800 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                  title="Attach screenshot or image"
                >
                  <ImageIcon className="w-4 h-4 text-indigo-400" />
                  <span className="hidden sm:inline">Attach Image</span>
                </button>

                {/* Email Instructor Checkbox */}
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
              </div>

              {/* Send Button with Spinner */}
              <button
                type="button"
                disabled={sending || (!inputText.trim() && attachedImages.length === 0) || !activeCourseId}
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

      {/* Full-Screen Lightbox Modal for High-Resolution Image Inspection */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-12 right-0 bg-slate-800 text-white p-2 rounded-full hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={lightboxImage} 
              alt="Full Resolution Screenshot" 
              className="max-w-full max-h-[80vh] object-contain rounded-xl border border-slate-800 shadow-2xl"
            />
            <div className="mt-3 flex items-center space-x-3">
              <a
                href={lightboxImage}
                download="screenshot.jpg"
                onClick={(e) => e.stopPropagation()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-lg transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Screenshot</span>
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
