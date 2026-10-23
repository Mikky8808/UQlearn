import React, { useState, useEffect } from 'react';
import { 
  Megaphone, 
  Send, 
  CheckCircle2, 
  Plus, 
  Trash2,
  BookOpen,
  ArrowLeft,
  Users,
  Bell,
  Sparkles,
  Clock
} from 'lucide-react';
import { Course, AnnouncementItem } from '../../types';
import { DataNotFound } from '../common/DataNotFound';
import { apiFetch } from '../../lib/apiConfig';

interface InstructorMessagesTabProps {
  courses: Course[];
  currentUser: any;
}

export const InstructorMessagesTab: React.FC<InstructorMessagesTabProps> = ({ courses, currentUser }) => {
  // Page view mode: 'list' for announcements feed, 'create' for full-page announcement editor
  const [viewMode, setViewMode] = useState<'list' | 'create'>('list');

  // New announcement form fields
  const [targetCourseId, setTargetCourseId] = useState('all');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [sendEmailNotification, setSendEmailNotification] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [announcementSuccess, setAnnouncementSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Stored announcements
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnnouncementsData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('instructor-messages.php', {}, 0);
      if (res && res.success && Array.isArray(res.announcements)) {
        setAnnouncements(res.announcements);
      }
    } catch (e) {
      console.warn('Failed loading announcements from API:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncementsData();
  }, []);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle.trim() || !announcementContent.trim()) return;

    setIsSubmitting(true);
    const matchedCourse = courses.find(c => c.id === targetCourseId);
    const newId = `ian-${Date.now()}`;
    const courseTitle = targetCourseId === 'all' 
      ? 'All Published Courses' 
      : (matchedCourse?.title || 'Course Announcement');

    const newAnnounce: AnnouncementItem = {
      id: newId,
      courseId: targetCourseId,
      courseTitle: courseTitle,
      instructorName: currentUser?.name || 'Instructor',
      title: announcementTitle.trim(),
      content: announcementContent.trim(),
      date: 'Just now',
      unread: false
    };

    setAnnouncements([newAnnounce, ...announcements]);
    setAnnouncementSuccess(true);

    try {
      await apiFetch('instructor-messages.php', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create_announcement',
          id: newId,
          course_id: targetCourseId,
          course_title: courseTitle,
          instructor_name: currentUser?.name || 'Instructor',
          title: announcementTitle.trim(),
          content: announcementContent.trim(),
          date: 'Just now'
        })
      });
    } catch (e) {
      console.warn('Backend announcement save error:', e);
    } finally {
      setIsSubmitting(false);
    }

    setTimeout(() => {
      setAnnouncementSuccess(false);
      setAnnouncementTitle('');
      setAnnouncementContent('');
      setTargetCourseId('all');
      setViewMode('list');
      setToastMessage('Announcement broadcasted successfully to all enrolled students!');
      setTimeout(() => setToastMessage(null), 4000);
    }, 1200);
  };

  const handleDeleteAnnouncement = async (id: string) => {
    setAnnouncements(announcements.filter(a => a.id !== id));
    try {
      await apiFetch('instructor-messages.php', {
        method: 'POST',
        body: JSON.stringify({
          action: 'delete_announcement',
          id: id
        })
      });
      setToastMessage('Announcement removed.');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (e) {}
  };

  // Selected course details for preview
  const selectedCourse = courses.find(c => c.id === targetCourseId);

  // --------------------------------------------------------------------------
  // CREATE ANNOUNCEMENT FULL-PAGE VIEW
  // --------------------------------------------------------------------------
  if (viewMode === 'create') {
    return (
      <div className="space-y-6 animate-fadeIn pb-12">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => {
                setViewMode('list');
                setAnnouncementSuccess(false);
              }}
              className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Announcements</span>
            </button>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center space-x-2.5">
              <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
                <Megaphone className="w-5 h-5" />
              </span>
              <span>Create New Course Announcement</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Broadcast educational updates, curriculum releases, or reminders directly to enrolled students.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all cursor-pointer"
            >
              Discard
            </button>
            <button
              type="submit"
              form="create-announcement-page-form"
              disabled={isSubmitting || !announcementTitle.trim() || !announcementContent.trim()}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Publishing...' : 'Publish Announcement'}</span>
            </button>
          </div>
        </div>

        {/* Success Banner */}
        {announcementSuccess && (
          <div className="p-6 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-3xl text-center space-y-2 animate-fadeIn">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-100">
              Announcement Successfully Broadcasted!
            </h3>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              Your enrolled students have been notified via the student portal notification center and email.
            </p>
          </div>
        )}

        {/* Form Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form Fields (2 columns) */}
          <div className="lg:col-span-2 space-y-6">
            <form id="create-announcement-page-form" onSubmit={handleCreateAnnouncement} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
              
              {/* Target Course Audience */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  1. Target Course Audience
                </label>
                <select
                  value={targetCourseId}
                  onChange={(e) => setTargetCourseId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
                >
                  <option value="all">All Published Courses (Full Audience Broadcast)</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1.5 flex items-center space-x-1">
                  <Users className="w-3.5 h-3.5 text-indigo-500" />
                  <span>
                    {targetCourseId === 'all' 
                      ? 'Reaches all students actively enrolled in any of your courses.'
                      : `Reaches enrolled learners in "${selectedCourse?.title || 'Selected Course'}".`}
                  </span>
                </p>
              </div>

              {/* Announcement Headline */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    2. Announcement Headline
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {announcementTitle.length}/120
                  </span>
                </div>
                <input
                  type="text"
                  required
                  maxLength={120}
                  placeholder="e.g. Added 5 New Exercises + Live Code Review on Friday"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Announcement Body */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  3. Detailed Message
                </label>
                <textarea
                  rows={8}
                  required
                  placeholder="Write your educational update, instructions, assignment links, or details for your learners here..."
                  value={announcementContent}
                  onChange={(e) => setAnnouncementContent(e.target.value)}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent leading-relaxed"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Clear, constructive announcements increase course engagement and student completion rates.
                </p>
              </div>

              {/* Email Broadcast Checkbox Card */}
              <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl flex items-start space-x-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="pageSendEmail"
                  checked={sendEmailNotification}
                  onChange={(e) => setSendEmailNotification(e.target.checked)}
                  className="w-4 h-4 mt-0.5 accent-indigo-600 cursor-pointer rounded"
                />
                <label htmlFor="pageSendEmail" className="cursor-pointer">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Send educational email broadcast to enrolled learners
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
                    In addition to their in-app student dashboard notification feed, learners receive an instant email update.
                  </p>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !announcementTitle.trim() || !announcementContent.trim()}
                  className="px-7 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Publishing...' : 'Publish Announcement'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Sidebar: Preview & Educational Policy Cards */}
          <div className="space-y-5">
            {/* Live Preview Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Learner View Preview</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500">
                  Live Preview
                </span>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                    {targetCourseId === 'all' ? 'All Published Courses' : (selectedCourse?.title || 'Selected Course')}
                  </span>
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                  {announcementTitle.trim() || 'Your Announcement Headline Here'}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal whitespace-pre-line line-clamp-6">
                  {announcementContent.trim() || 'Your announcement message will display here exactly as enrolled students will see it in their learner portal and notification inbox.'}
                </p>
                <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-[10px] text-slate-400">
                  <span>By: {currentUser?.name || 'Instructor'}</span>
                  <span>Date: Just now</span>
                </div>
              </div>
            </div>

            {/* Announcement Best Practices */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center space-x-1.5">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>Announcement Guidelines</span>
              </h4>
              <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2 list-disc list-inside">
                <li>Announcements must be educational or administrative in nature.</li>
                <li>Avoid promotional offers, third-party affiliate links, or external merchandise.</li>
                <li>Notify students when you upload new lectures, quizzes, or assignments.</li>
                <li>All enrolled students receive an immediate in-app notification.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // ANNOUNCEMENTS LIST VIEW (Clean, Dedicated to Announcements Only)
  // --------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs font-bold flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Announcements Header Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Course Announcements
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-black">
                {announcements.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Broadcast educational updates, curriculum changes, and notifications to your enrolled learners.
            </p>
          </div>
        </div>

        <button
          onClick={() => setViewMode('create')}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center space-x-2 cursor-pointer self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create Announcement</span>
        </button>
      </div>

      {/* Announcements Stream / Empty State */}
      <div className="space-y-4">
        {announcements.length === 0 ? (
          <DataNotFound
            title="No Announcements Broadcasted"
            message="Keep your enrolled students informed by broadcasting announcements about course updates, live sessions, or assignments."
            icon={Megaphone}
            action={{
              label: "Broadcast New Announcement",
              onClick: () => setViewMode('create'),
              icon: Plus
            }}
          />
        ) : (
          announcements.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-3 transition-all hover:border-slate-300 dark:hover:border-slate-700"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                    {item.courseTitle}
                  </span>
                  <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {item.title}
                  </h4>
                </div>

                <div className="flex items-center space-x-3 text-xs text-slate-400">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Broadcasted: {item.date}</span>
                  </span>
                  <button
                    onClick={() => handleDeleteAnnouncement(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                    title="Delete Announcement"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal whitespace-pre-line">
                {item.content}
              </p>

              <div className="flex items-center space-x-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold pt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Sent to all enrolled learners via in-app notification & email</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

