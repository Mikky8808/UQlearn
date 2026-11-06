import React, { useState } from 'react';
import { Course } from '../../types';
import { CourseDetailPage } from '../user/CourseDetailPage';
import { LearningPlayer } from '../user/LearningPlayer';
import { X, PlayCircle, Globe, Shield } from 'lucide-react';

interface AdminCoursePreviewModalProps {
  course: Course;
  onClose: () => void;
}

export const AdminCoursePreviewModal: React.FC<AdminCoursePreviewModalProps> = ({
  course,
  onClose,
}) => {
  const [previewMode, setPreviewMode] = useState<'details' | 'learn'>('details');

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 backdrop-blur-md animate-fadeIn">
      {/* Admin Preview Top Navigation Bar */}
      <div className="bg-[#1c1d1f] border-b border-slate-800 text-white px-6 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 px-3 py-1 bg-purple-500/20 border border-purple-500/40 text-purple-300 rounded-lg text-xs font-bold uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5" />
            <span>Admin Learner UI Preview Mode</span>
          </div>
          <span className="text-sm font-black text-white truncate max-w-sm sm:max-w-md">
            {course.title}
          </span>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center space-x-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setPreviewMode('details')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
              previewMode === 'details'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>1. Course Detail Page View</span>
          </button>

          <button
            type="button"
            onClick={() => setPreviewMode('learn')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
              previewMode === 'learn'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PlayCircle className="w-3.5 h-3.5" />
            <span>2. Learn Player View</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer flex items-center space-x-1.5 text-xs font-bold"
        >
          <X className="w-4 h-4" />
          <span>Exit Preview</span>
        </button>
      </div>

      {/* Preview Content Area */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-950 relative">
        {previewMode === 'details' ? (
          <CourseDetailPage courseProp={course} onClosePreview={onClose} />
        ) : (
          <LearningPlayer courseProp={course} onClosePreview={onClose} />
        )}
      </div>
    </div>
  );
};
