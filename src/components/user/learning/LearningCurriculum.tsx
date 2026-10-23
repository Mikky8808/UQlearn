import React, { useState, useMemo } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Play, 
  Search, 
  X, 
  Folder, 
  Check, 
  Volume2, 
  VolumeX, 
  FileText, 
  ExternalLink, 
  Download 
} from 'lucide-react';
import { Module, Lesson } from '../../../types';

interface LearningCurriculumProps {
  modules: Module[];
  allLessons: Lesson[];
  currentLessonIndex: number;
  completedLessons: Record<string, boolean>;
  watchProgress: Record<string, { currentTime: number; duration: number; percentage: number }>;
  onSelectLesson: (index: number) => void;
  onToggleLessonComplete: (lessonId: string) => void;
  isMobileDrawer?: boolean;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const LearningCurriculum: React.FC<LearningCurriculumProps> = ({
  modules,
  allLessons,
  currentLessonIndex,
  completedLessons,
  watchProgress,
  onSelectLesson,
  onToggleLessonComplete,
  isMobileDrawer = false,
  isOpenMobile = false,
  onCloseMobile
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  
  // Track open/collapsed state of each module (default first expanded)
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});

  // Track expanded resources dropdown per lesson ID
  const [openResources, setOpenResources] = useState<Record<string, boolean>>({});

  const toggleModule = (modId: string) => {
    setCollapsedModules(prev => ({
      ...prev,
      [modId]: !prev[modId]
    }));
  };

  const toggleResources = (lessonId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenResources(prev => ({
      ...prev,
      [lessonId]: !prev[lessonId]
    }));
  };

  // Duration Formatter Helper
  const getDisplayDuration = (lesson: Lesson) => {
    const progress = watchProgress[lesson.id];
    if (progress && progress.duration && progress.duration > 1) {
      const totalSeconds = Math.round(progress.duration);
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return lesson.duration || '2min';
  };

  const formatSectionDuration = (lessons: Lesson[]) => {
    let totalMinutes = 0;
    lessons.forEach(l => {
      // Skip non-video lessons entirely
      if (!l.videoUrl) {
        return;
      }

      const progress = watchProgress[l.id];
      if (progress && progress.duration && progress.duration > 1) {
        totalMinutes += progress.duration / 60;
        return;
      }

      if (!l.duration) {
        totalMinutes += 10;
        return;
      }
      const dur = l.duration.toString().toLowerCase();
      if (dur.includes(':')) {
        const parts = dur.split(':');
        const mins = parseInt(parts[0], 10) || 0;
        totalMinutes += mins;
      } else if (dur.includes('hr') || dur.includes('h')) {
        const hoursMatch = dur.match(/(\d+)\s*h/);
        const minsMatch = dur.match(/(\d+)\s*m/);
        if (hoursMatch) totalMinutes += parseInt(hoursMatch[1], 10) * 60;
        if (minsMatch) totalMinutes += parseInt(minsMatch[1], 10);
        if (!hoursMatch && !minsMatch) totalMinutes += 10;
      } else {
        const digits = parseInt(dur.replace(/\D/g, ''), 10);
        totalMinutes += (digits || 10);
      }
    });

    const roundedMins = Math.round(totalMinutes);
    if (roundedMins < 60) {
      return `${roundedMins}min`;
    }
    const hours = Math.floor(roundedMins / 60);
    const mins = roundedMins % 60;
    return mins > 0 ? `${hours}hr ${mins}min` : `${hours}hr`;
  };

  // Filter lessons based on search query
  const filteredModules = useMemo(() => {
    if (!searchQuery.trim()) return modules;
    const q = searchQuery.toLowerCase();
    return modules.map(m => ({
      ...m,
      lessons: m.lessons.filter(l => 
        l.title.toLowerCase().includes(q) || 
        (l.content && l.content.toLowerCase().includes(q))
      )
    })).filter(m => m.lessons.length > 0);
  }, [modules, searchQuery]);

  const content = (
    <div className="flex flex-col h-full bg-white dark:bg-[#141517] text-slate-900 dark:text-slate-100 select-none transition-colors border-l border-slate-200 dark:border-slate-800">
      
      {/* 1. Header with Course content title */}
      <div className="px-4 pt-3 pb-3 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 bg-white dark:bg-[#1c1d1f] flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-6">
          <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
            Course content
          </span>
        </div>

        {/* Right Controls: Speaker & Close */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. CURRICULUM RENDERER */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800/80">
          
          {/* Optional Search bar if filtering */}
          {searchQuery && (
            <div className="p-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search lectures..."
                className="w-full bg-transparent text-xs text-slate-900 dark:text-white focus:outline-none"
              />
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {filteredModules.length === 0 ? (
            <div className="p-8 text-center text-slate-500 space-y-2">
              <p className="text-xs font-semibold">No lectures match "{searchQuery}"</p>
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-purple-600 dark:text-purple-400 hover:underline cursor-pointer font-bold"
              >
                Clear search filter
              </button>
            </div>
          ) : (
            filteredModules.map((module, mIdx) => {
              const isCollapsed = Boolean(collapsedModules[module.id]);
              const modCompletedCount = module.lessons.filter(l => completedLessons[l.id]).length;
              const formattedDuration = formatSectionDuration(module.lessons);

              // Standardize module title format (Section X: Name)
              let rawTitle = module.title || `Module ${mIdx + 1}`;
              if (!rawTitle.toLowerCase().startsWith('section')) {
                rawTitle = `Section ${mIdx + 1}: ${rawTitle.replace(/^module\s*\d+:?\s*/i, '')}`;
              }

              return (
                <div key={module.id} className="flex flex-col">
                  
                  {/* Section Accordion Header matching screenshot */}
                  <button
                    type="button"
                    onClick={() => toggleModule(module.id)}
                    className="w-full text-left px-4 py-3.5 bg-[#f7f8fa] hover:bg-[#eff1f5] dark:bg-[#1a1b1e] dark:hover:bg-[#222428] border-b border-slate-200 dark:border-slate-800 flex items-start justify-between transition-colors cursor-pointer group"
                  >
                    <div className="space-y-1 pr-3 min-w-0">
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight group-hover:text-slate-950 dark:group-hover:text-white">
                        {rawTitle}
                      </h4>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {modCompletedCount} / {module.lessons.length} | {formattedDuration}
                      </p>
                    </div>

                    <span className="text-slate-500 dark:text-slate-400 shrink-0 mt-1">
                      {isCollapsed ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronUp className="w-4 h-4" />
                      )}
                    </span>
                  </button>

                  {/* Section Lessons List */}
                  {!isCollapsed && (
                    <div className="bg-white dark:bg-[#141517] divide-y divide-slate-100 dark:divide-slate-900/60">
                      {module.lessons.map((lesson, lIdx) => {
                        const absIdx = allLessons.findIndex(al => al.id === lesson.id);
                        const isActive = currentLessonIndex === absIdx;
                        const isDone = Boolean(completedLessons[lesson.id]);
                        const showRes = Boolean(openResources[lesson.id]);
                        const hasResources = lesson.resources && lesson.resources.length > 0;

                        return (
                          <div key={lesson.id} className="flex flex-col">
                            <div
                              onClick={() => {
                                onSelectLesson(absIdx >= 0 ? absIdx : 0);
                                if (isMobileDrawer && onCloseMobile) onCloseMobile();
                              }}
                              className={`px-4 py-3.5 flex items-start justify-between gap-3 transition-colors cursor-pointer ${
                                isActive
                                  ? 'bg-purple-50/60 dark:bg-purple-950/20'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'
                              }`}
                            >
                              {/* Left Checkbox: Exact purple square checkmark matching screenshot */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleLessonComplete(lesson.id);
                                }}
                                className="mt-0.5 shrink-0 cursor-pointer"
                                title={isDone ? 'Mark Incomplete' : 'Mark Complete'}
                              >
                                {isDone ? (
                                  <div className="w-5 h-5 rounded bg-purple-700 text-white flex items-center justify-center shadow-xs">
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  </div>
                                ) : (
                                  <div className="w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-700 bg-transparent hover:border-purple-600 transition-colors" />
                                )}
                              </button>

                              {/* Lesson Title & Video Duration subline */}
                              <div className="flex-1 min-w-0 space-y-1">
                                <p className={`text-xs sm:text-sm font-semibold leading-snug ${
                                  isActive
                                    ? 'text-purple-700 dark:text-purple-300 font-bold'
                                    : 'text-slate-800 dark:text-slate-200'
                                }`}>
                                  {lIdx + 1}. {lesson.title.replace(/^\d+[\.\)]\s*/, '')}
                                </p>
                                
                                {lesson.videoUrl && (
                                  <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                                    <Play className="w-3 h-3 text-slate-400 shrink-0 fill-slate-400" />
                                    <span>{getDisplayDuration(lesson)}</span>
                                  </div>
                                )}
                              </div>

                              {/* Right Pill Button: [ 📁 Resources ˅ ] matching screenshot */}
                              {hasResources && (
                                <div className="shrink-0 pt-0.5">
                                  <button
                                    type="button"
                                    onClick={(e) => toggleResources(lesson.id, e)}
                                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                                      showRes
                                        ? 'border-purple-700 bg-purple-700 text-white shadow-xs'
                                        : 'border-purple-600 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 bg-transparent'
                                    }`}
                                  >
                                    <Folder className={`w-3.5 h-3.5 ${showRes ? 'text-white' : 'text-purple-600 dark:text-purple-400'}`} />
                                    <span>Resources</span>
                                    <ChevronDown className={`w-3 h-3 transition-transform ${showRes ? 'rotate-180' : ''}`} />
                                  </button>
                                </div>
                              )}

                            </div>

                            {/* Dropdown menu for Resources */}
                            {showRes && hasResources && (
                              <div className="px-10 py-3 bg-purple-50/40 dark:bg-purple-950/20 border-t border-b border-purple-100 dark:border-purple-900/30 space-y-2 animate-fadeIn text-xs">
                                <p className="font-bold text-slate-700 dark:text-slate-300">Downloadable Resources:</p>
                                <div className="space-y-1.5">
                                  {lesson.resources!.map((res, rIdx) => {
                                    const displayTitle = res.title || (res.url ? res.url.substring(res.url.lastIndexOf('/') + 1) : '') || 'Download Resource';
                                    return (
                                      <a
                                        key={rIdx}
                                        href={res.url || '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#1c1d1f] border border-slate-200 dark:border-slate-800 text-purple-700 dark:text-purple-300 hover:underline transition-colors animate-fadeIn"
                                      >
                                        <span className="flex items-center gap-2 truncate pr-2">
                                          <FileText className="w-3.5 h-3.5 text-purple-600" />
                                          <span className="truncate text-slate-700 dark:text-slate-200 font-bold">{displayTitle}</span>
                                        </span>
                                        <Download className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                      </a>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>
      </div>
    );

  if (isMobileDrawer) {
    if (!isOpenMobile) return null;
    return (
      <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
        />
        <div className="relative w-full max-w-sm h-full shadow-2xl z-10 flex flex-col animate-slideLeft">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden shadow-xl transition-colors">
      {content}
    </div>
  );
};
