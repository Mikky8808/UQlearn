import React, { useEffect, useState } from 'react';
import { 
  X, 
  Tv, 
  Bot, 
  FlaskConical, 
  HelpCircle, 
  ListChecks, 
  ClipboardCheck, 
  Sparkles, 
  Plus,
  BookOpen
} from 'lucide-react';

export interface CurriculumDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectItem: (type: string, title: string) => void;
  moduleTitle?: string;
}

export const CurriculumDrawer: React.FC<CurriculumDrawerProps> = ({
  isOpen,
  onClose,
  onSelectItem,
  moduleTitle
}) => {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      const timer = setTimeout(() => setVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted) return null;

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
    <div className="fixed inset-0 z-[100] overflow-hidden">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className={`absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs transition-opacity duration-300 ease-in-out ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Slide-in Drawer Container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div 
          className={`w-screen max-w-md bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col transform transition-transform duration-300 ease-out ${
            visible ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Drawer Header */}
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
            <div>
              <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-0.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Curriculum Builder</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Add Curriculum Item
              </h2>
              {moduleTitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                  Adding to: <span className="font-semibold text-slate-700 dark:text-slate-300">{moduleTitle}</span>
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              aria-label="Close panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-7 bg-white dark:bg-slate-900">
            {categories.map((cat) => (
              <div key={cat.name} className="space-y-3">
                {/* Category Section Header */}
                <h3 className="text-sm font-semibold text-[#5B6B7C] dark:text-slate-400 tracking-tight">
                  {cat.name}
                </h3>

                {/* Items Grid */}
                <div className="space-y-2">
                  {cat.items.map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onSelectItem(item.type, item.title);
                          onClose();
                        }}
                        className="w-full text-left p-3.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/70 border border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700 transition-all duration-150 group flex items-start space-x-3.5 cursor-pointer shadow-2xs hover:shadow-sm"
                      >
                        {/* Icon Tile */}
                        <div className={`w-11 h-11 rounded-xl ${item.tileBg} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200`}>
                          <IconComponent className="w-5 h-5" />
                        </div>

                        {/* Text Block */}
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {item.title}
                            </span>

                            {/* ✨ AI Badge */}
                            {item.hasAiBadge && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 shadow-2xs">
                                <Sparkles className="w-3 h-3 text-indigo-500" />
                                <span>AI</span>
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed font-normal">
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

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Select any item above to insert into curriculum</span>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
