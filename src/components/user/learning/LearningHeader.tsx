import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Star,
  Trophy,
  Share2, 
  MoreVertical, 
  ChevronDown, 
  Menu,
  Keyboard, 
  Sun, 
  Moon,
  SidebarClose, 
  SidebarOpen,
  ExternalLink,
  Folder,
  Gift
} from 'lucide-react';
import { Course } from '../../../types';
import { useApp } from '../../../context/AppContext';
import { resolveBrandingLogoUrl } from '../../../lib/branding';
import { GiftCourseModal } from '../../common/GiftCourseModal';

interface LearningHeaderProps {
  course: Course;
  currentLessonTitle?: string;
  currentLessonIndex: number;
  totalLessons: number;
  progressPercentage: number;
  completedCount: number;
  isTheaterMode: boolean;
  onToggleTheaterMode: () => void;
  onOpenMobileCurriculum: () => void;
  onOpenRating?: () => void;
  onOpenCertificate?: () => void;
  onOpenShortcuts: () => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const LearningHeader: React.FC<LearningHeaderProps> = ({
  course,
  currentLessonTitle,
  currentLessonIndex,
  totalLessons,
  progressPercentage,
  completedCount,
  isTheaterMode,
  onToggleTheaterMode,
  onOpenMobileCurriculum,
  onOpenRating,
  onOpenShortcuts,
  darkMode = false,
  onToggleDarkMode
}) => {
  const navigate = useNavigate();
  const { logoUrl, openShareCourseModal } = useApp();
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [logoUrl]);

  const resolvedLogoSrc = imgError ? '/logo/logo.png' : resolveBrandingLogoUrl(logoUrl);

  const [progressDropdownOpen, setProgressDropdownOpen] = useState(false);
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [archiveNotice, setArchiveNotice] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(() => {
    try {
      return localStorage.getItem(`uqlearn_saved_${course?.id}`) === 'true';
    } catch {
      return false;
    }
  });
  const [isArchived, setIsArchived] = useState(() => {
    try {
      return localStorage.getItem(`uqlearn_archived_${course?.id}`) === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleArchive = () => {
    const next = !isArchived;
    setIsArchived(next);
    try {
      localStorage.setItem(`uqlearn_archived_${course?.id}`, String(next));
    } catch {}
    setArchiveNotice(next ? 'Course has been archived' : 'Course removed from archive');
    setTimeout(() => setArchiveNotice(null), 3000);
  };

  const progressRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (progressRef.current && !progressRef.current.contains(e.target as Node)) {
        setProgressDropdownOpen(false);
      }
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) {
        setOptionsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleSave = () => {
    const next = !isSaved;
    setIsSaved(next);
    try {
      localStorage.setItem(`uqlearn_saved_${course?.id}`, String(next));
    } catch {}
  };

  const handleShare = () => {
    openShareCourseModal(course);
  };

  return (
    <header className="bg-[#1c1d1f] text-white border-b border-[#2d2f31] px-3 sm:px-5 h-14 flex items-center justify-between sticky top-0 z-30 select-none shadow-md font-sans">
      
      {/* Left: Brand Logo + Vertical Divider + Course Title */}
      <div className="flex items-center min-w-0 flex-1 mr-2 sm:mr-4">
        
        {/* Site Brand Logo */}
        <Link 
          to="/" 
          title="UQlearn Home"
          className="flex items-center group shrink-0 focus:outline-none"
        >
          <img 
            src={resolvedLogoSrc} 
            alt="UQlearn Logo" 
            onError={() => setImgError(true)}
            referrerPolicy="no-referrer"
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-full object-contain group-hover:scale-105 transition-transform drop-shadow-sm" 
          />
        </Link>

        {/* Vertical Divider */}
        <div className="h-6 w-px bg-slate-700/80 mx-2.5 sm:mx-4 shrink-0" />

        {/* Course Title */}
        <Link 
          to={`/course/${course.id}`}
          title={course.title}
          className="text-xs sm:text-sm font-semibold text-white hover:text-purple-300 transition-colors truncate max-w-[140px] xs:max-w-[200px] sm:max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl"
        >
          {course.title}
        </Link>
      </div>

      {/* Right Side Controls matching reference image */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        
        {/* 1. Leave a rating button */}
        {onOpenRating && (
          <button
            type="button"
            onClick={onOpenRating}
            className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white px-2.5 py-1.5 rounded-none hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Rate this course"
          >
            <Star className="w-3.5 h-3.5 fill-current text-slate-300 -mt-0.5" />
            <span>Leave a rating</span>
          </button>
        )}

        {/* 2. Your progress ⌵ with Dropdown */}
        <div className="relative" ref={progressRef}>
          <button
            type="button"
            onClick={() => setProgressDropdownOpen(!progressDropdownOpen)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white px-2 sm:px-2.5 py-1.5 rounded-none hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Course progress"
          >
            {/* Circular Trophy Progress Icon */}
            <div className="relative w-5 h-5 rounded-full border border-slate-600 flex items-center justify-center bg-slate-900 shrink-0">
              <Trophy className="w-3 h-3 text-[#a435f0]" />
            </div>
            <span className="hidden sm:inline">Your progress</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Progress Popover Dropdown */}
          {progressDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-[#1c1d1f] border border-slate-700 rounded-none shadow-2xl p-4 text-white z-50 animate-fadeIn">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>Course Progress</span>
                  <span className="text-[#a435f0] font-black">{progressPercentage}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-none overflow-hidden">
                  <div 
                    className="bg-[#a435f0] h-full transition-all duration-300 rounded-none" 
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  {completedCount} of {totalLessons} lessons completed.
                </p>
                <div className="pt-2 border-t border-slate-800">
                  <Link
                    to={`/course/${course.id}`}
                    onClick={() => setProgressDropdownOpen(false)}
                    className="text-xs text-[#c0c4fc] hover:underline flex items-center gap-1"
                  >
                    <span>View course overview</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. Save + Button (Purple Sharp Button) */}
        <button
          type="button"
          onClick={handleToggleSave}
          className="bg-[#a435f0] hover:bg-[#8710d8] text-white text-xs font-bold px-3 sm:px-3.5 py-1.5 rounded-none transition-colors cursor-pointer flex items-center gap-1 shrink-0"
          title={isSaved ? "Saved to your list" : "Save this course"}
        >
          <span>{isSaved ? 'Saved' : 'Save'}</span>
          <span className="text-[13px] leading-none">{isSaved ? '✓' : '+'}</span>
        </button>

        {/* 4. Share Button (Sharp outline button) */}
        <button
          type="button"
          onClick={handleShare}
          className="hidden sm:flex items-center gap-1.5 border border-slate-600 hover:border-slate-400 bg-transparent hover:bg-slate-800 text-white text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-none transition-colors cursor-pointer shrink-0"
          title="Share this course"
        >
          <Share2 className="w-3.5 h-3.5 text-slate-300" />
          <span>Share</span>
        </button>

        {/* 5. More Options Button (Three vertical dots) */}
        <div className="relative" ref={optionsRef}>
          <button
            type="button"
            onClick={() => setOptionsMenuOpen(!optionsMenuOpen)}
            className="border border-slate-600 hover:border-slate-400 p-1.5 rounded-none bg-transparent hover:bg-slate-800 text-white transition-colors cursor-pointer flex items-center justify-center shrink-0"
            title="More options"
          >
            <MoreVertical className="w-4 h-4 text-slate-300" />
          </button>

          {/* Options Dropdown Menu */}
          {optionsMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-[#1c1d1f] border border-slate-700 rounded-none shadow-2xl py-1 text-white z-50 text-xs animate-fadeIn">
              <button
                type="button"
                onClick={() => {
                  setOptionsMenuOpen(false);
                  onOpenShortcuts();
                }}
                className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2 text-slate-300 hover:text-white"
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>Keyboard shortcuts</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOptionsMenuOpen(false);
                  onToggleTheaterMode();
                }}
                className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2 text-slate-300 hover:text-white hidden lg:flex"
              >
                {isTheaterMode ? <SidebarOpen className="w-3.5 h-3.5" /> : <SidebarClose className="w-3.5 h-3.5" />}
                <span>{isTheaterMode ? 'Show curriculum sidebar' : 'Expand video player'}</span>
              </button>

              {onToggleDarkMode && (
                <button
                  type="button"
                  onClick={() => {
                    setOptionsMenuOpen(false);
                    onToggleDarkMode();
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2 text-slate-300 hover:text-white"
                >
                  {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
                  <span>{darkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}</span>
                </button>
              )}

              <div className="border-t border-slate-800 my-1" />

              <Link
                to={`/course/${course.id}`}
                onClick={() => setOptionsMenuOpen(false)}
                className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2 text-slate-300 hover:text-white block"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Course details page</span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  setOptionsMenuOpen(false);
                  handleToggleArchive();
                }}
                className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2 text-slate-300 hover:text-white cursor-pointer"
              >
                <Folder className="w-3.5 h-3.5" />
                <span>{isArchived ? 'Unarchive this course' : 'Archive this course'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOptionsMenuOpen(false);
                  setIsGiftModalOpen(true);
                }}
                className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2 text-slate-300 hover:text-white cursor-pointer"
              >
                <Gift className="w-3.5 h-3.5" />
                <span>Gift this course</span>
              </button>
            </div>
          )}
        </div>

        {/* Mobile Curriculum Playlist Drawer Toggle */}
        <button
          type="button"
          onClick={onOpenMobileCurriculum}
          className="lg:hidden p-1.5 rounded-sm border border-slate-600 bg-transparent text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
          title="Open lessons playlist"
        >
          <Menu className="w-4 h-4" />
          <span className="text-[10px] font-bold sm:hidden">{currentLessonIndex + 1}/{totalLessons}</span>
        </button>

      </div>

      {/* Gift Course Modal */}
      {isGiftModalOpen && (
        <GiftCourseModal
          isOpen={isGiftModalOpen}
          onClose={() => setIsGiftModalOpen(false)}
          course={course}
        />
      )}

      {/* Toast feedback for archive/actions */}
      {archiveNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1c1d1f] text-white border border-slate-700 px-4 py-2.5 text-xs sm:text-sm font-medium shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Folder className="w-4 h-4 text-purple-400" />
          <span>{archiveNotice}</span>
        </div>
      )}
    </header>
  );
};
