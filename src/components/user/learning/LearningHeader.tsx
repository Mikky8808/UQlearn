import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Award, 
  BookOpen, 
  Menu, 
  SidebarClose, 
  SidebarOpen,
  Share2,
  CheckCircle2,
  Keyboard,
  Sun,
  Moon
} from 'lucide-react';
import { Course } from '../../../types';
import { useApp } from '../../../context/AppContext';

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
  onOpenCertificate: () => void;
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
  onOpenCertificate,
  onOpenShortcuts,
  darkMode = false,
  onToggleDarkMode
}) => {
  const navigate = useNavigate();
  const { openShareCourseModal } = useApp();

  const handleShare = () => {
    openShareCourseModal(course);
  };

  const isCompleted = progressPercentage >= 100;

  return (
    <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 sm:px-5 py-2.5 sm:py-3 sticky top-0 z-30 flex items-center justify-between gap-2 sm:gap-4 select-none transition-colors">
      {/* Left: Back button & Course info */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={() => navigate('/dashboard')}
          title="Back to Dashboard"
          className="p-2 sm:px-3 sm:py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:active:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 shrink-0 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden md:inline">Dashboard</span>
        </button>

        {/* Brand logo & Course Title */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="hidden sm:flex w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 items-center justify-center text-white dark:text-slate-950 font-black shrink-0 shadow-sm shadow-emerald-500/20">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate max-w-[140px] sm:max-w-xs md:max-w-md lg:max-w-lg">
              {course.title}
            </h1>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium truncate max-w-[120px] sm:max-w-xs">
                {currentLessonTitle || `Lesson ${currentLessonIndex + 1}`}
              </span>
              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
              <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">{course.instructor}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Right: Progress bar & Actions */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Progress Pill */}
        <div 
          className="flex items-center gap-2 sm:gap-2.5 bg-slate-100/90 dark:bg-slate-800/90 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700"
          title={`${completedCount} of ${totalLessons} lessons completed (${progressPercentage}%)`}
        >
          <div className="w-14 sm:w-24 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                isCompleted 
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
                  : 'bg-teal-500 shadow-[0_0_6px_rgba(20,184,166,0.4)]'
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <span className={`text-[11px] font-bold ${isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200'}`}>
            {progressPercentage}%
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 hidden xl:inline">
            ({completedCount}/{totalLessons})
          </span>
        </div>

        {/* Theme Toggle (Light / Dark) */}
        {onToggleDarkMode && (
          <button
            type="button"
            onClick={onToggleDarkMode}
            title={darkMode ? "Switch to Light Theme" : "Switch to Dark Theme"}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:active:bg-slate-600 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center cursor-pointer"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        )}

        {/* Share Button */}
        <button
          onClick={handleShare}
          title="Share course"
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:active:bg-slate-600 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors hidden sm:flex items-center justify-center cursor-pointer"
        >
          <Share2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
        </button>

        {/* Keyboard Shortcuts Hint */}
        <button
          onClick={onOpenShortcuts}
          title="Keyboard shortcuts"
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:active:bg-slate-600 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors hidden md:flex items-center justify-center cursor-pointer"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* Theater Mode Toggle (Desktop) */}
        <button
          onClick={onToggleTheaterMode}
          title={isTheaterMode ? 'Exit Theater Mode (Show Curriculum)' : 'Theater Mode (Expand Video)'}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:active:bg-slate-600 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors hidden lg:flex items-center justify-center cursor-pointer"
        >
          {isTheaterMode ? <SidebarOpen className="w-4 h-4 text-teal-600 dark:text-teal-400" /> : <SidebarClose className="w-4 h-4" />}
        </button>

        {/* Mobile Curriculum Toggle Button */}
        <button
          onClick={onOpenMobileCurriculum}
          className="lg:hidden px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:active:bg-emerald-500/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          title="Open Curriculum Playlist"
        >
          <Menu className="w-4 h-4" />
          <span className="text-[11px]">Lessons</span>
          <span className="w-4 h-4 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 text-[9px] font-black flex items-center justify-center">
            {currentLessonIndex + 1}
          </span>
        </button>
      </div>
    </header>
  );
};
