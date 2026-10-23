import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface LearningShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LearningShortcutsModal: React.FC<LearningShortcutsModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Space', desc: 'Play or Pause video' },
    { key: '← / →', desc: 'Seek 5 seconds backward / forward' },
    { key: 'N', desc: 'Jump to Next lesson' },
    { key: 'P', desc: 'Jump to Previous lesson' },
    { key: 'M', desc: 'Mute / Unmute video audio' },
    { key: 'F', desc: 'Toggle Fullscreen mode' },
    { key: 'C', desc: 'Toggle Curriculum Sidebar or Drawer' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none animate-fadeIn">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl z-10 overflow-hidden transition-colors">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Player Keyboard Shortcuts
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-3">
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {shortcuts.map((sc, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <span className="text-slate-700 dark:text-slate-300 font-medium">{sc.desc}</span>
                <kbd className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-teal-700 dark:text-teal-300 font-mono font-bold text-[11px] shadow-2xs">
                  {sc.key}
                </kbd>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
