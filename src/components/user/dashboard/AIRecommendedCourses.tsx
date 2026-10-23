import React, { useEffect, useState } from 'react';
import { Sparkles, Star, ArrowRight, CheckCircle2, BookOpen, Flame, Tag } from 'lucide-react';
import { Course, User } from '../../../types';
import { useNavigate } from 'react-router-dom';
import { CatalogCourseCardSkeleton } from '../../common/CourseCardSkeleton';
import { apiFetch } from '../../../lib/apiConfig';

interface AIRecommendedCoursesProps {
  enrolledCourses: Course[];
  currentUser: User | null;
  onAddToCart?: (course: Course) => void;
  onEnrollCourse?: (course: Course) => void;
}

interface RecommendationItem {
  course: Course;
  score: number;
  match_reasons: string[];
  ai_confidence: number;
}

export const AIRecommendedCourses: React.FC<AIRecommendedCoursesProps> = ({
  enrolledCourses,
  currentUser,
  onAddToCart,
  onEnrollCourse,
}) => {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzedCategories, setAnalyzedCategories] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        setLoading(true);
        const categories = Array.from(new Set(enrolledCourses.map(c => c.category))).join(',');
        const data = await apiFetch(`recommendations.php?categories=${encodeURIComponent(categories)}&user_id=${currentUser?.id || 0}`);
        if (data && data.success) {
          setRecommendations(data.recommendations || []);
          setAnalyzedCategories(data.user_enrolled_categories || []);
        }
      } catch (e) {
        console.warn('Failed to fetch AI recommendations', e);
      } finally {
        setLoading(false);
      }
    }
    fetchRecommendations();
  }, [enrolledCourses, currentUser]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 animate-pulse">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20"></div>
          <div className="space-y-2">
            <div className="w-48 h-4 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
            <div className="w-32 h-3 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {[1, 2, 3].map(i => (
            <CatalogCourseCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-teal-950/20 via-slate-900/40 to-slate-900/60 border border-teal-500/30 rounded-3xl p-6 shadow-lg space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/30 shadow-inner">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[11px] font-bold">
              <span>AI Algorithm Matching</span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight mt-0.5">
              Smart Recommendations For You
            </h2>
            <p className="text-xs text-slate-400">
              {analyzedCategories.length > 0 
                ? `Analyzed your proficiency in ${analyzedCategories.join(', ')} and matching tags.` 
                : 'Top-tier curriculum suggestions tailored to your learning trajectory.'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {recommendations.map((item, idx) => {
          const course = item.course;
          return (
            <div 
              key={course.id || idx}
              className="group bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-teal-500/50 rounded-2xl overflow-hidden shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Thumbnail Header */}
                <div className="relative h-36 bg-slate-800 overflow-hidden">
                  <img 
                    src={course.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=60'} 
                    alt={course.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent"></div>
                  
                  {/* AI Confidence Badge */}
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-teal-500/90 text-slate-950 text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-md flex items-center space-x-1">
                    <Sparkles className="w-3 h-3" />
                    <span>{item.ai_confidence}% Match</span>
                  </div>

                  {/* Best Seller / Premium badges */}
                  <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                    {course.bestSeller && (
                      <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm uppercase tracking-wider">
                        Best Seller
                      </span>
                    )}
                    {course.isPremium && (
                      <span className="bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm uppercase tracking-wider">
                        Premium
                      </span>
                    )}
                  </div>
                </div>

                {/* Course Details */}
                <div className="p-4 space-y-3">
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

              {/* Footer Actions */}
              <div className="p-4 pt-0 flex items-center justify-between border-t border-slate-800/80 mt-2">
                <div className="flex items-center space-x-1.5 text-amber-400 text-xs font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{typeof course.rating === 'number' ? course.rating.toFixed(1) : (course.rating || 4.8)}</span>
                  <span className="text-slate-500 font-normal">{(course.reviewCount ?? 0).toLocaleString()} ratings</span>
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
    </div>
  );
};
