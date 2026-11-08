import React, { useEffect, useRef, useState } from 'react';
import { 
  X, 
  Tv, 
  Bot, 
  FlaskConical, 
  HelpCircle, 
  ListChecks, 
  ClipboardCheck, 
  Sparkles,
  BookOpen
} from 'lucide-react';

export interface CurriculumDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectItem: (type: string, title: string) => void;
  moduleTitle?: string;
  align?: 'left' | 'right';
  dropDirection?: 'auto' | 'down' | 'up';
}

export const CurriculumDropdown: React.FC<CurriculumDropdownProps> = ({
  isOpen,
  onClose,
  onSelectItem,
  moduleTitle,
  align = 'left',
  dropDirection = 'auto'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [actualDropUp, setActualDropUp] = useState(false);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      if (dropDirection === 'up') {
        setActualDropUp(true);
      } else if (dropDirection === 'down') {
        setActualDropUp(false);
      } else {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setActualDropUp(spaceBelow < 450 && rect.top > 450);
      }
    }
  }, [isOpen, dropDirection]);

  if (!isOpen) return null;

  const categories = [
    {
      name: 'Watch or read',
      items: [
        {
          id: 'lecture',
          type: 'video',
          title: 'Lecture',
          subtitle: 'Video or text lesson',
          hasAiBadge: false,
          tileBg: 'bg-[#EEEDFC] dark:bg-purple-950/70 text-[#5542F6] dark:text-purple-300',
          icon: Tv
        }
      ]
    },
    {
      name: 'Role Play',
      items: [
        {
          id: 'practice_role_play',
          type: 'roleplay',
          title: 'Practice Role Play',
          subtitle: 'Unscored conversation for free-form skill rehearsal',
          hasAiBadge: true,
          tileBg: 'bg-[#EEEDFC] dark:bg-purple-950/70 text-[#5542F6] dark:text-purple-300',
          icon: Bot
        }
      ]
    },
    {
      name: 'labs',
      items: [
        {
          id: 'practice_lab',
          type: 'practice_lab',
          title: 'Practice lab',
          subtitle: 'Hands-on task in a real environment, unscored',
          hasAiBadge: true,
          tileBg: 'bg-[#E6F9F3] dark:bg-emerald-950/70 text-[#059669] dark:text-emerald-300',
          icon: FlaskConical
        },
        {
          id: 'graded_lab',
          type: 'graded_lab',
          title: 'Graded lab',
          subtitle: 'Real-environment task, scored and reported',
          hasAiBadge: true,
          tileBg: 'bg-[#E6F9F3] dark:bg-emerald-950/70 text-[#059669] dark:text-emerald-300',
          icon: FlaskConical
        }
      ]
    },
    {
      name: 'Knowledge checks',
      items: [
        {
          id: 'quiz',
          type: 'quiz',
          title: 'Quiz',
          subtitle: 'Quick comprehension check after a lesson',
          hasAiBadge: false,
          tileBg: 'bg-[#FEF6E6] dark:bg-amber-950/70 text-[#D97706] dark:text-amber-300',
          icon: HelpCircle
        },
        {
          id: 'practice_test',
          type: 'practice_test',
          title: 'Practice test',
          subtitle: 'Timed exam to prep for certification',
          hasAiBadge: false,
          tileBg: 'bg-[#FEF6E6] dark:bg-amber-950/70 text-[#D97706] dark:text-amber-300',
          icon: ListChecks
        },
        {
          id: 'assignment',
          type: 'assignment',
          title: 'Assignment',
          subtitle: 'Task for learners to complete and submit',
          hasAiBadge: false,
          tileBg: 'bg-[#FEF6E6] dark:bg-amber-950/70 text-[#D97706] dark:text-amber-300',
          icon: ClipboardCheck
        }
      ]
    }
  ];

  return (
    <>
      {/* Click-away backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-slate-900/10 dark:bg-black/30 backdrop-blur-2xs" 
        onClick={onClose}
      />

      {/* Dropdown / Drop-up menu panel */}
      <div 
        ref={containerRef}
        className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} ${
          actualDropUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
        } z-50 w-[290px] sm:w-[320px] max-h-[420px] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xl p-2.5 space-y-2.5 animate-in fade-in zoom-in-95 duration-150 origin-top scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800`}
      >
        {/* Header bar */}
        <div className="pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Add Curriculum Item
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Categories */}
        <div className="space-y-2.5">
          {categories.map((cat) => (
            <div key={cat.name} className="space-y-1">
              <h4 className="text-[11px] font-bold text-[#5B6B7C] dark:text-slate-400 tracking-tight px-1">
                {cat.name}
              </h4>
              <div className="space-y-1">
                {cat.items.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelectItem(item.type, item.title);
                        onClose();
                      }}
                      className="w-full text-left p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all duration-150 group flex items-start space-x-2.5 cursor-pointer"
                    >
                      {/* Icon Tile */}
                      <div className={`w-7 h-7 rounded-md ${item.tileBg} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200`}>
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>

                      {/* Text details */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-xs group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {item.title}
                          </span>

                          {/* ✨ AI Badge */}
                          {item.hasAiBadge && (
                            <span className="inline-flex items-center gap-0.5 px-1 py-0 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[9px] font-semibold text-slate-600 dark:text-slate-300 shadow-2xs">
                              <Sparkles className="w-2.5 h-2.5 text-indigo-500" />
                              <span>AI</span>
                            </span>
                          )}
                        </div>

                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                          {item.subtitle}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
