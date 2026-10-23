import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Check, 
  Award, 
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Clock
} from 'lucide-react';
import { Lesson } from '../../../types';

interface LearningLessonNavProps {
  currentLesson: Lesson;
  currentLessonIndex: number;
  totalLessons: number;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onPrevLesson: () => void;
  onNextLesson: () => void;
  hasPrevLesson: boolean;
  hasNextLesson: boolean;
  prevLessonTitle?: string;
  nextLessonTitle?: string;
  autoplayNext: boolean;
  onToggleAutoplay: () => void;
  onClaimCertificate?: () => void;
  isAllCompleted: boolean;
}

export const LearningLessonNav: React.FC<LearningLessonNavProps> = ({
  currentLesson,
  currentLessonIndex,
  totalLessons,
  isCompleted,
  onToggleComplete,
  onPrevLesson,
  onNextLesson,
  hasPrevLesson,
  hasNextLesson,
  prevLessonTitle,
  nextLessonTitle,
  autoplayNext,
  onToggleAutoplay,
  onClaimCertificate,
  isAllCompleted
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-sm select-none transition-colors">
      {/* Left: Previous Lesson */}
      <div className="flex items-center gap-2 order-2 sm:order-1 justify-between sm:justify-start">
        <button
          type="button"
          onClick={onPrevLesson}
          disabled={!hasPrevLesson}
          title={prevLessonTitle ? `Previous: ${prevLessonTitle}` : 'No previous lesson'}
          className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
            hasPrevLesson
              ? 'bg-slate-100 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:active:bg-slate-600 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 shadow-xs'
              : 'bg-slate-100/50 dark:bg-slate-800/30 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800/40 cursor-not-allowed opacity-50'
          }`}
        >
          <ChevronLeft className="w-4 h-4 shrink-0" />
          <span className="truncate max-w-[120px] sm:max-w-[160px]">Previous</span>
        </button>

        {/* Autoplay Toggle on Desktop */}
        <button
          type="button"
          onClick={onToggleAutoplay}
          className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-medium transition-colors cursor-pointer"
          title={autoplayNext ? 'Autoplay is ON' : 'Autoplay is OFF'}
        >
          {autoplayNext ? (
            <ToggleRight className="w-5 h-5 text-teal-500" />
          ) : (
            <ToggleLeft className="w-5 h-5 text-slate-400 dark:text-slate-500" />
          )}
          <span>Autoplay next</span>
        </button>

        {/* Mobile Next button placed next to Prev for easy thumb reach */}
        <div className="sm:hidden flex items-center gap-2">
          <button
            type="button"
            onClick={onNextLesson}
            disabled={!hasNextLesson && !isAllCompleted}
            title={nextLessonTitle ? `Next: ${nextLessonTitle}` : ''}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
              hasNextLesson
                ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white border-emerald-500 shadow-md shadow-emerald-950/40'
                : isAllCompleted
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 font-black'
                : 'bg-slate-100/50 dark:bg-slate-800/30 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800/40 cursor-not-allowed opacity-50'
            }`}
          >
            <span>{hasNextLesson ? 'Next' : 'Finish'}</span>
            <ChevronRight className="w-4 h-4 shrink-0" />
          </button>
        </div>
      </div>

      {/* Center: Lesson status & Complete button */}
      <div className="flex items-center justify-between sm:justify-center gap-3 order-1 sm:order-2">
        <div className="text-left sm:text-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span>Lesson {currentLessonIndex + 1} of {totalLessons}</span>
            {currentLesson?.duration && currentLesson?.videoUrl && (
              <>
                <span>•</span>
                <span className="flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {currentLesson.duration}
                </span>
              </>
            )}
          </div>
          <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate max-w-[200px] sm:max-w-xs md:max-w-sm">
            {currentLesson?.title}
          </p>
        </div>

        {/* Complete Toggle Button */}
        <button
          type="button"
          onClick={onToggleComplete}
          className={`px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm ${
            isCompleted
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20 border border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-slate-100 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
          }`}
        >
          {isCompleted ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-100 shrink-0" />
              <span>Completed</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="hidden sm:inline">Mark Complete</span>
              <span className="sm:hidden">Complete</span>
            </>
          )}
        </button>
      </div>

      {/* Right: Next Lesson / Claim Certificate (Desktop) */}
      <div className="hidden sm:flex items-center gap-2 order-3">
        {hasNextLesson ? (
          <button
            type="button"
            onClick={onNextLesson}
            title={nextLessonTitle ? `Next: ${nextLessonTitle}` : 'Next lesson'}
            className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white border border-emerald-500 shadow-md shadow-emerald-950/40 cursor-pointer"
          >
            <span className="truncate max-w-[120px] lg:max-w-[180px]">Next Lesson</span>
            <ChevronRight className="w-4 h-4 shrink-0" />
          </button>
        ) : isAllCompleted ? (
          <button
            type="button"
            onClick={onClaimCertificate}
            className="px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 border border-amber-400 shadow-lg shadow-amber-500/20 cursor-pointer animate-pulse"
          >
            <Award className="w-4 h-4 fill-current" />
            <span>Claim Certificate</span>
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100/50 dark:bg-slate-800/30 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-800/40 cursor-not-allowed opacity-50 flex items-center gap-1.5"
          >
            <span>Course End</span>
          </button>
        )}
      </div>
    </div>
  );
};
