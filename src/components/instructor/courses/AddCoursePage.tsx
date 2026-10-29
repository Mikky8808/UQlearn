import React, { useState } from 'react';
import { Course } from '../../../types';
import { useApp } from '../../../context/AppContext';
import {
  ArrowLeft, ArrowRight, BookOpen, Presentation, Tags
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AddCoursePageProps {
  onSaveAndBuild: (course: Partial<Course>) => void;
  onSaveAsDraft: (course: Partial<Course>) => void;
  onCancel: () => void;
  onRequestCategory?: () => void;
}

export const AddCoursePage: React.FC<AddCoursePageProps> = ({
  onSaveAndBuild,
  onSaveAsDraft,
  onCancel,
  onRequestCategory
}) => {
  const { categories } = useApp();

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState(
    categories && categories.length > 0 ? categories[0].name : 'Development'
  );

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateStep = () => {
    const newErrors: { [key: string]: string } = {};
    if (step === 1 && !title.trim()) {
      newErrors.title = 'Course title is required';
    }
    if (step === 2) {
      const wordCount = subtitle.trim().split(/\s+/).filter(Boolean).length;
      if (!subtitle.trim()) {
        newErrors.subtitle = 'Subtitle is required';
      } else if (wordCount < 20) {
        newErrors.subtitle = `Subtitle must be at least 20 words (currently ${wordCount} ${wordCount === 1 ? 'word' : 'words'}). Summarize what learners will achieve.`;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      onCancel();
    }
  };

  const buildCourseData = (): Partial<Course> => {
    return {
      title,
      subtitle,
      description: '', // To be filled later
      category,
      level: 'Beginner', // Default
      price: 0, // Default
      originalPrice: 0, // Default
      image: '',
      learningOutcomes: [],
      modules: [],
    };
  };

  const handleCreateAndBuild = () => {
    if (validateStep()) {
      onSaveAndBuild(buildCourseData());
    }
  };

  const handleSaveAsDraft = () => {
    if (validateStep()) {
      onSaveAsDraft(buildCourseData());
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onCancel}
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">
              Create New Course
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Step {step} of 3
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-indigo-600 transition-all duration-300 ease-out"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      {/* Wizard Content */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-8 sm:p-12 min-h-[300px] flex flex-col justify-center relative">
          <AnimatePresence mode="wait">
            {/* Step 1: Title */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6 max-w-xl mx-auto w-full"
              >
                <div className="text-center space-y-2 mb-8">
                  <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100 dark:border-indigo-800">
                    <BookOpen className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">Name your course</h2>
                  <p className="text-slate-500 text-sm">You can always change this later.</p>
                </div>
                
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="e.g. Advanced TypeScript Patterns"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (errors.title) setErrors({});
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleNext(); }}
                    autoFocus
                    className="w-full px-5 py-4 text-center text-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400"
                  />
                  {errors.title && <p className="text-rose-500 text-xs font-bold text-center animate-shake">{errors.title}</p>}
                </div>
              </motion.div>
            )}

            {/* Step 2: Subtitle */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6 max-w-xl mx-auto w-full"
              >
                <div className="text-center space-y-2 mb-8">
                  <div className="w-16 h-16 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-purple-100 dark:border-purple-800">
                    <Presentation className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">Add a catchy subtitle</h2>
                  <p className="text-slate-500 text-sm">Summarize what learners will achieve.</p>
                </div>
                
                <div className="space-y-3">
                  <textarea
                    rows={3}
                    placeholder="e.g. Master generics, utility types, and strict mode to build scalable TypeScript applications with confidence and ease."
                    value={subtitle}
                    onChange={(e) => {
                      setSubtitle(e.target.value);
                      if (errors.subtitle) setErrors({});
                    }}
                    autoFocus
                    className="w-full px-5 py-4 text-center text-base bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all placeholder:text-slate-400 resize-none"
                  />
                  <div className="flex items-center justify-between text-xs px-2 font-bold">
                    <span className="text-slate-500">Requirement: at least 20 words</span>
                    <span className={subtitle.trim().split(/\s+/).filter(Boolean).length >= 20 ? "text-emerald-600 dark:text-emerald-400 font-extrabold" : "text-amber-600 dark:text-amber-400 font-bold"}>
                      {subtitle.trim().split(/\s+/).filter(Boolean).length} / 20 words {subtitle.trim().split(/\s+/).filter(Boolean).length >= 20 ? '✓' : ''}
                    </span>
                  </div>
                  {errors.subtitle && <p className="text-rose-500 text-xs font-bold text-center animate-shake">{errors.subtitle}</p>}
                </div>
              </motion.div>
            )}

            {/* Step 3: Category */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6 max-w-xl mx-auto w-full"
              >
                <div className="text-center space-y-2 mb-8">
                  <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100 dark:border-emerald-800">
                    <Tags className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">Choose a category</h2>
                  <p className="text-slate-500 text-sm">Help learners find your course easily.</p>
                </div>
                
                <div className="space-y-2">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-5 py-4 text-center text-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none cursor-pointer"
                  >
                    {(categories && categories.length > 0 ? categories.filter(c => c.isActive !== false) : [
                      { id: '1', name: 'Development' },
                      { id: '2', name: 'Business' },
                      { id: '3', name: 'Design' },
                      { id: '4', name: 'Data Science' },
                      { id: '5', name: 'Marketing' },
                      { id: '6', name: 'Personal Growth' }
                    ]).map(cat => (
                      <option key={cat.id || cat.name} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  {onRequestCategory && (
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={onRequestCategory}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 underline cursor-pointer transition-colors inline-flex items-center space-x-1"
                      >
                        <span>Don't see a category to use? Request one here</span>
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
          <button
            onClick={handleBack}
            className="px-6 py-3 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {step === 1 ? 'Cancel' : 'Previous'}
          </button>

          {step < 3 ? (
            <button
              onClick={handleNext}
              className="px-8 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white rounded-xl text-sm font-bold shadow-md transition-all flex items-center space-x-2"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center space-x-3">
              <button
                onClick={handleSaveAsDraft}
                className="px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer hidden sm:block"
              >
                Save Draft
              </button>
              <button
                onClick={handleCreateAndBuild}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/25 transition-all flex items-center space-x-2 cursor-pointer"
              >
                <span>Create Course</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
