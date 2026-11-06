import React, { useState } from 'react';
import { Clock, Calendar, Keyboard, Zap, Bell, Check, Sparkles } from 'lucide-react';
import { Course } from '../../../types';

interface LearningToolsTabProps {
  course: Course;
  onOpenShortcuts?: () => void;
}

export const LearningToolsTab: React.FC<LearningToolsTabProps> = ({ course, onOpenShortcuts }) => {
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Wed', 'Fri']);
  const [studyTime, setStudyTime] = useState('19:00');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem(`uqlearn_study_schedule_${course.id}`, JSON.stringify({
        days: selectedDays,
        time: studyTime
      }));
    } catch {}
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. Schedule Learning Time Card */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 rounded-none space-y-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-none bg-purple-100 dark:bg-purple-950/50 text-[#a435f0] flex items-center justify-center shrink-0 border border-purple-200 dark:border-purple-800">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Schedule Learning Time
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Learning a little each day adds up. Research shows that students who make learning a habit are more likely to reach their goals. Set time aside to learn and get reminders using your learning scheduler.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveSchedule} className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Select Study Days
            </label>
            <div className="flex flex-wrap gap-2">
              {daysOfWeek.map(day => {
                const isSelected = selectedDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-none border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#a435f0] text-white border-[#a435f0]'
                        : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Target Study Time
              </label>
              <input
                type="time"
                value={studyTime}
                onChange={(e) => setStudyTime(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-none text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-[#a435f0]"
              />
            </div>

            <div className="sm:pt-5 flex items-center gap-3">
              <button
                type="submit"
                className="bg-[#a435f0] hover:bg-[#8710d8] text-white text-xs font-bold px-4 py-2 rounded-none transition-colors cursor-pointer"
              >
                Save Learning Schedule
              </button>
              {savedSuccess && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Schedule saved!</span>
                </span>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* 2. Keyboard Shortcuts Card */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 rounded-none space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Keyboard className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Player Keyboard Shortcuts
            </h3>
          </div>
          {onOpenShortcuts && (
            <button
              onClick={onOpenShortcuts}
              className="text-xs font-bold text-[#a435f0] hover:underline cursor-pointer"
            >
              Open shortcuts modal
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs pt-2">
          <div className="p-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400">Play / Pause</span>
            <kbd className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono font-bold text-slate-800 dark:text-slate-200">Space</kbd>
          </div>
          <div className="p-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400">Rewind 5s</span>
            <kbd className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono font-bold text-slate-800 dark:text-slate-200">← Left</kbd>
          </div>
          <div className="p-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400">Forward 5s</span>
            <kbd className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono font-bold text-slate-800 dark:text-slate-200">→ Right</kbd>
          </div>
          <div className="p-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400">Toggle Mute</span>
            <kbd className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono font-bold text-slate-800 dark:text-slate-200">M</kbd>
          </div>
          <div className="p-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400">Fullscreen</span>
            <kbd className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono font-bold text-slate-800 dark:text-slate-200">F</kbd>
          </div>
          <div className="p-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400">Next Lecture</span>
            <kbd className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono font-bold text-slate-800 dark:text-slate-200">N</kbd>
          </div>
        </div>
      </div>
    </div>
  );
};
