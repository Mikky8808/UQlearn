import React, { useState } from 'react';
import { 
  Award, 
  X, 
  Download, 
  Printer, 
  Share2, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck,
  Lock
} from 'lucide-react';
import { Course } from '../../../types';
import { useApp } from '../../../context/AppContext';
import { ROOT_URL } from '../../../lib/apiConfig';

interface LearningCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course;
  studentName: string;
  progressPercentage: number;
  completedCount: number;
  totalLessons: number;
}

export const LearningCertificateModal: React.FC<LearningCertificateModalProps> = ({
  isOpen,
  onClose,
  course,
  studentName,
  progressPercentage,
  completedCount,
  totalLessons
}) => {
  const { openShareCourseModal } = useApp();
  if (!isOpen) return null;

  const isEligible = progressPercentage >= 100;
  const credentialId = `UQL-CERT-${course.id.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const completionDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const handleShare = () => {
    openShareCourseModal(course, {
      customUrl: `${ROOT_URL}/verify-certificate/${credentialId}`,
      customTitle: `Share Certificate: "${course.title}"`,
      customText: `I successfully earned a Certificate of Completion for "${course.title}" on UQlearn!`
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 select-none animate-fadeIn">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl z-10 overflow-hidden flex flex-col max-h-[95vh] transition-colors">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Course Certificate of Completion
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

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {!isEligible ? (
            /* Locked State */
            <div className="text-center py-8 px-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                  Certificate Locked
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Complete all lectures and quizzes to generate your official verified Certificate of Completion.
                </p>
              </div>

              {/* Progress pill */}
              <div className="max-w-xs mx-auto bg-slate-50 dark:bg-slate-950/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-500 dark:text-slate-400">Current Progress</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{progressPercentage}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-500" 
                    style={{ width: `${progressPercentage}%` }} 
                  />
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 text-left">
                  {completedCount} of {totalLessons} lessons completed ({totalLessons - completedCount} remaining).
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-950/20 cursor-pointer"
              >
                Continue Learning
              </button>
            </div>
          ) : (
            /* Eligible State: Certificate Preview Frame */
            <div className="space-y-5">
              <div className="relative bg-gradient-to-b from-amber-500/10 via-white dark:via-slate-900/60 to-slate-50 dark:to-slate-950 p-6 sm:p-8 rounded-2xl border-2 border-amber-500/30 text-center space-y-4 shadow-xl overflow-hidden">
                {/* Decorative border corners */}
                <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-amber-500/60" />
                <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-amber-500/60" />
                <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-amber-500/60" />
                <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-amber-500/60" />

                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[10px] font-black tracking-widest uppercase">
                    <Sparkles className="w-3 h-3" />
                    <span>Official Verified Certificate</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-serif font-black tracking-wider text-amber-900 dark:text-amber-200 mt-2">
                    CERTIFICATE OF COMPLETION
                  </h2>
                  <p className="text-[11px] uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    This is proudly presented to
                  </p>
                </div>

                <div className="py-2">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white underline decoration-amber-500/50 decoration-2 underline-offset-8">
                    {studentName || 'Student'}
                  </h3>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                  for successfully mastering the curriculum and demonstrably passing all requirements for the professional course:
                </p>

                <h4 className="text-sm sm:text-base font-extrabold text-amber-700 dark:text-amber-300 max-w-lg mx-auto">
                  {course.title}
                </h4>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Instructor</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{course.instructor}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Date Issued</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{completionDate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Credential ID</span>
                    <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">{credentialId}</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleShare}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>Share Certificate</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white dark:text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / Save PDF</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
