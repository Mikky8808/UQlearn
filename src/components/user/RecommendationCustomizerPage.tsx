import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sliders, CheckCircle2, ArrowLeft, Sparkles, Compass, Award, BookOpen } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const RecommendationCustomizerPage: React.FC = () => {
  const navigate = useNavigate();
  const { courses } = useApp();

  const allCategories = Array.from(new Set(courses.map(c => c.category)));
  const defaultCategories = allCategories.length > 0 ? allCategories : ['Programming', 'Data Science', 'Design', 'Business', 'Artificial Intelligence'];

  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('uqlearn_custom_categories');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return defaultCategories.slice(0, 3);
  });

  const [skillLevel, setSkillLevel] = useState<string>(() => {
    return localStorage.getItem('uqlearn_custom_skill_level') || 'Beginner';
  });

  const [learningGoal, setLearningGoal] = useState<string>(() => {
    return localStorage.getItem('uqlearn_custom_goal') || 'Career Advancement';
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('uqlearn_custom_categories', JSON.stringify(selectedCategories));
      localStorage.setItem('uqlearn_browsed_categories', JSON.stringify(selectedCategories));
      localStorage.setItem('uqlearn_custom_skill_level', skillLevel);
      localStorage.setItem('uqlearn_custom_goal', learningGoal);
      setSavedSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 1200);
    } catch (e) {}
  };

  const levels = ['Beginner', 'Intermediate', 'Advanced', 'All Levels'];
  const goals = ['Career Advancement', 'Switch Careers', 'Skill Upskilling', 'Academic Enrichment', 'Personal Hobby'];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center space-x-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
          
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 text-xs font-bold border border-teal-200 dark:border-teal-900/40">
            <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>AI Recommendation Engine</span>
          </div>
        </div>

        {/* Title Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <Sliders className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Customize Your Recommendations
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Tailor your learning feed on the landing page by selecting your preferred course categories, experience level, and learning goals.
          </p>
        </div>

        {savedSuccess && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 p-4 rounded-2xl flex items-center space-x-3 text-emerald-800 dark:text-emerald-300 font-bold text-sm animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Preferences saved successfully! Redirecting to home feed...</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-8">
          
          {/* Categories Selection */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Preferred Categories</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Select all categories you are interested in exploring</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {allCategories.map(cat => {
                const isSelected = selectedCategories.includes(cat);
                return (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`p-3.5 rounded-2xl border text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-500'
                    }`}
                  >
                    <span className="truncate pr-2">{cat}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Skill Level Selection */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Experience Level</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">What is your current proficiency level?</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {levels.map(lvl => (
                <button
                  type="button"
                  key={lvl}
                  onClick={() => setSkillLevel(lvl)}
                  className={`p-3.5 rounded-2xl border text-xs font-bold transition-all text-center cursor-pointer ${
                    skillLevel === lvl
                      ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-500'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Learning Goal Selection */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Primary Learning Goal</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">What motivates your learning journey?</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {goals.map(g => (
                <button
                  type="button"
                  key={g}
                  onClick={() => setLearningGoal(g)}
                  className={`p-3.5 rounded-2xl border text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                    learningGoal === g
                      ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-500'
                  }`}
                >
                  <span>{g}</span>
                  {learningGoal === g && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end space-x-4 pt-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-6 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-8 py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-lg shadow-teal-600/20 transition-all cursor-pointer flex items-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save & Update Feed</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
