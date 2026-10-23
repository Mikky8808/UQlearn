import React, { useEffect, useState } from 'react';
import { Sparkles, Star, ArrowRight, CheckCircle2, Sliders, ChevronRight, BookOpen, Layers, Check } from 'lucide-react';
import { Course, User } from '../../../types';
import { useApp } from '../../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { CatalogCourseCardSkeleton } from '../../common/CourseCardSkeleton';
import { apiFetch } from '../../../lib/apiConfig';

interface RecommendedCoursesProps {
  enrolledCourses: Course[];
  currentUser: User | null;
}

interface RecommendationItem {
  course: Course;
  score: number;
  match_reasons: string[];
  ai_confidence: number;
}

export const RecommendedCourses: React.FC<RecommendedCoursesProps> = ({
  enrolledCourses,
  currentUser,
}) => {
  const { categories, isLoadingCourses } = useApp();
  const navigate = useNavigate();

  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzedCategories, setAnalyzedCategories] = useState<string[]>([]);
  
  // Personalization Wizard State
  const [showPersonalizeWizard, setShowPersonalizeWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string>('All');
  const [customizing, setCustomizing] = useState(false);

  const availableCategories = categories && categories.length > 0 
    ? categories.filter(c => c.isActive !== false).map(c => c.name) 
    : ['Development', 'Data Science', 'Design', 'Business', 'Marketing', 'Personal Growth'];

  const fetchRecommendations = async (catsOverride?: string[]) => {
    try {
      setLoading(true);
      const catsToUse = catsOverride || Array.from(new Set(enrolledCourses.map(c => c.category)));
      const categoriesParam = catsToUse.join(',');
      const data = await apiFetch(`recommendations.php?categories=${encodeURIComponent(categoriesParam)}&user_id=${currentUser?.id || 0}`);
      if (data && data.success) {
        setRecommendations(data.recommendations || []);
        setAnalyzedCategories(data.user_enrolled_categories || catsToUse);
      }
    } catch (e) {
      console.warn('Failed to fetch recommendations', e);
    } finally {
      setLoading(false);
      setCustomizing(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [enrolledCourses, currentUser]);

  const handleToggleCategory = (catName: string) => {
    setSelectedCategories(prev => 
      prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
    );
  };

  const handleApplyPersonalization = () => {
    setCustomizing(true);
    setShowPersonalizeWizard(false);
    fetchRecommendations(selectedCategories);
  };

  if (loading && !customizing) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 animate-pulse">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/20"></div>
          <div className="space-y-2">
            <div className="w-48 h-4 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
            <div className="w-32 h-3 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-slate-100 dark:bg-slate-800/50 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-teal-950/25 via-slate-900/50 to-indigo-950/30 border border-teal-500/30 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
      {/* Header & Personalize Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0 border border-teal-500/30 shadow-inner">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[11px] font-bold">
              <span>AI Algorithmic Matcher</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
              Recommended Courses For You
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              {analyzedCategories.length > 0 
                ? `Tailored based on your active interests in ${analyzedCategories.join(', ')}.` 
                : 'No prior enrollments detected. Personalize your topics below!'}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setShowPersonalizeWizard(true);
            setWizardStep(1);
          }}
          className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-2 cursor-pointer shrink-0"
        >
          <Sliders className="w-4 h-4" />
          <span>Personalize Recommendations</span>
        </button>
      </div>

      {/* Personalization Wizard Modal / Inline Card */}
      {showPersonalizeWizard && (
        <div className="bg-slate-900/95 border border-teal-500/50 rounded-2xl p-6 shadow-2xl space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-2">
              <span className="w-7 h-7 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center">{wizardStep}</span>
              <h3 className="text-base font-bold text-white">
                {wizardStep === 1 ? 'Step 1: Select Your Preferred Categories' : 'Step 2: Choose Experience Level'}
              </h3>
            </div>
            <button
              onClick={() => setShowPersonalizeWizard(false)}
              className="text-slate-400 hover:text-white text-xs font-bold"
            >
              Cancel
            </button>
          </div>

          {wizardStep === 1 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                Choose the categories you are most interested in exploring. Our recommendation engine will match top-tier courses instantly.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {availableCategories.map(cat => {
                  const isSelected = selectedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleToggleCategory(cat)}
                      className={`p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                        isSelected 
                          ? 'bg-teal-600/30 border-teal-500 text-white shadow-xs' 
                          : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <span>{cat}</span>
                      {isSelected && <Check className="w-4 h-4 text-teal-400" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setWizardStep(2)}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <span>Next Step</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                What is your current proficiency level in these subjects?
              </p>
              <div className="grid grid-cols-3 gap-3">
                {['Beginner', 'Intermediate', 'Advanced'].map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSelectedLevel(lvl)}
                    className={`p-3.5 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                      selectedLevel === lvl 
                        ? 'bg-teal-600/30 border-teal-500 text-white shadow-xs' 
                        : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setWizardStep(1)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={handleApplyPersonalization}
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Recommendations</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recommendations List / Empty State */}
      {(loading || isLoadingCourses) ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, idx) => (
            <CatalogCourseCardSkeleton key={`rec-skeleton-${idx}`} />
          ))}
        </div>
      ) : recommendations.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center space-y-4">
          <div className="w-14 h-14 bg-teal-500/10 text-teal-400 rounded-2xl flex items-center justify-center mx-auto border border-teal-500/20">
            <BookOpen className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-white">No recommendations found for current filters</h3>
            <p className="text-xs text-slate-400">
              Try clicking the personalize button above to select your favorite categories and generate tailored suggestions.
            </p>
          </div>
          <button
            onClick={() => {
              setShowPersonalizeWizard(true);
              setWizardStep(1);
            }}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-md transition-all inline-flex items-center space-x-2 cursor-pointer"
          >
            <Sliders className="w-4 h-4" />
            <span>Launch Personalizer Wizard</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {recommendations.map((item, idx) => {
            const course = item.course;
            return (
              <div 
                key={course.id || idx}
                className="group bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-teal-500/50 rounded-2xl overflow-hidden shadow-lg transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Thumbnail */}
                  <div className="relative h-36 bg-slate-800 overflow-hidden">
                    <img 
                      src={course.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=60'} 
                      alt={course.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent"></div>
                    
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-teal-500/90 text-slate-950 text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-md flex items-center space-x-1">
                      <Sparkles className="w-3 h-3" />
                      <span>{item.ai_confidence}% Match</span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5 min-h-[1rem]">
                        {course.bestSeller && (
                          <span className="px-1.5 py-0.5 bg-amber-500 text-white font-bold text-[8px] rounded uppercase tracking-wider">
                            Best Seller
                          </span>
                        )}
                        {course.isPremium && (
                          <span className="px-1.5 py-0.5 bg-purple-600 text-white font-bold text-[8px] rounded uppercase tracking-wider">
                            Premium
                          </span>
                        )}
                      </div>
                      <span className="flex items-center text-amber-500 font-black">
                        <Star className="w-3 h-3 fill-amber-500 mr-1" />
                        {course.rating.toFixed(1)}
                      </span>
                    </div>
                    <h3 
                      onClick={() => navigate(`/courses/${course.id}`)}
                      className="text-sm font-bold text-white hover:text-teal-300 transition-colors line-clamp-2 cursor-pointer"
                    >
                      {course.title}
                    </h3>

                    {/* Match Reasons */}
                    <div className="space-y-1 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 block mb-0.5">Why recommended:</span>
                      {item.match_reasons.map((reason, rIdx) => (
                        <div key={rIdx} className="flex items-center space-x-1.5 text-[11px] text-slate-300">
                          <CheckCircle2 className="w-3 h-3 text-teal-400 shrink-0" />
                          <span className="truncate">{reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 pt-0 flex items-center justify-between border-t border-slate-800/80 mt-2">
                  <div className="flex items-center space-x-1.5 text-amber-400 text-xs font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{(course.rating || 5.0).toFixed(1)}</span>
                    <span className="text-slate-500 font-normal">{(course.reviewCount || 0).toLocaleString()} ratings</span>
                  </div>

                  <button
                    onClick={() => navigate(`/courses/${course.id}`)}
                    className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    <span>View Course</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
