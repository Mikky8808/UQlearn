import React, { useState } from 'react';
import { X, Check, Share2, BookOpen, User, Star, Award } from 'lucide-react';
import { Course } from '../../types';
import { SocialShare } from './SocialShare';
import { useApp } from '../../context/AppContext';
import { ROOT_URL } from '../../lib/apiConfig';

export interface ShareCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  course?: Course | null;
  customUrl?: string;
  customTitle?: string;
  customText?: string;
}

export const ShareCourseModal: React.FC<ShareCourseModalProps> = ({
  isOpen,
  onClose,
  course,
  customUrl,
  customTitle,
  customText,
}) => {
  const { currentUser } = useApp();
  const [activeNotice, setActiveNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ROOT_URL;
  
  // Build URL and share text
  const referralCode = currentUser?.referralCode;
  const coursePath = course ? `/courses/${course.id}` : (typeof window !== 'undefined' ? window.location.pathname : '/');
  const rawUrl = customUrl || `${baseUrl}${coursePath}`;
  const shareUrl = referralCode ? `${rawUrl}?ref=${referralCode}` : rawUrl;

  const title = customTitle || (course ? `Share "${course.title}"` : 'Share Course on UQlearn');
  const shareText = customText || (course 
    ? `Check out "${course.title}" by ${course.instructor || 'expert instructors'} on UQlearn! Learn and master new skills today.`
    : 'Explore thousands of expert-led online courses and advance your skills today on UQlearn!');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-150">
      <div 
        className="bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden relative transition-all duration-150 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Crisp White with Sharp Edges */}
        <div className="bg-white dark:bg-slate-900 px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {title}
              </h2>
              <p className="text-[11px] text-slate-500 font-mono">
                {customUrl?.includes('/verify') || customTitle?.toLowerCase().includes('certificate') 
                  ? 'Choose how you would like to share this verified credential'
                  : 'Choose how you would like to share this course'}
              </p>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-none transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 space-y-5 bg-white dark:bg-slate-900">
          
          {/* Status Toast Notice */}
          {activeNotice && (
            <div className="p-3 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 rounded-none text-teal-800 dark:text-teal-200 text-xs font-bold flex items-center space-x-2">
              <Check className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
              <span>{activeNotice}</span>
            </div>
          )}

          {/* Course Preview Card or Certificate Preview Card */}
          {course ? (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex space-x-3 items-center">
              {course.image ? (
                <img 
                  src={course.image} 
                  alt={course.title} 
                  className="w-16 h-16 object-cover rounded-none shrink-0 border border-slate-300 dark:border-slate-600"
                />
              ) : (
                <div className="w-16 h-16 bg-teal-600 text-white flex items-center justify-center shrink-0">
                  <BookOpen className="w-6 h-6" />
                </div>
              )}
              <div className="flex-1 min-w-0 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 inline-block">
                  {course.category || 'Online Course'}
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                  {course.title}
                </h3>
                <div className="flex items-center space-x-3 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="flex items-center space-x-1">
                    <User className="w-3 h-3 text-slate-400" />
                    <span className="truncate">{course.instructor || 'Expert Instructor'}</span>
                  </span>
                  {course.rating ? (
                    <span className="flex items-center space-x-1 text-amber-500 font-bold">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{Number(course.rating).toFixed(1)}</span>
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (customUrl?.includes('/verify') || customTitle?.toLowerCase().includes('certificate')) ? (
            <div className="p-3.5 bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 flex space-x-3 items-center">
              <div className="w-12 h-12 rounded-xl bg-teal-600/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-300 dark:border-teal-700">
                <Award className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-200 inline-block">
                  Accredited Credential
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                  {customTitle || 'Earned Course Certificate'}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                  {shareUrl}
                </p>
              </div>
            </div>
          ) : null}

          {/* SocialShare Component with Facebook, Gmail, WhatsApp, Instagram */}
          <SocialShare
            shareUrl={shareUrl}
            referralCode={referralCode}
            shareTitle={title}
            shareText={shareText}
            onCopySuccess={(msg) => setActiveNotice(msg)}
          />

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            Share link includes direct referral routing
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs rounded-none hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
