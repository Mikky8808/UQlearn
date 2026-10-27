import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Star, Clock, Users, BookOpen, Filter, ArrowRight, BadgeCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CatalogCourseCardSkeleton } from '../common/CourseCardSkeleton';
import { CourseCard } from '../common/CourseCard';
import { SponsoredBadge } from '../common/SponsoredBadge';
import { SponsoredLabel } from '../common/SponsoredLabel';
import { recordSponsoredClickApi, getActiveSponsoredCoursesApi, extractSponsoredCourseIds } from '../../lib/apiConfig';
import { Course } from '../../types';

interface SearchResultsProps {
  onSelectCourse?: (course: Course) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = () => {
  const { courses, formatPrice, getDiscountPercentage, isLoadingCourses } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sponsoredCourseIds, setSponsoredCourseIds] = useState<string[]>([]);

  // Fetch active sponsored ads on mount
  useEffect(() => {
    getActiveSponsoredCoursesApi()
      .then(res => {
        const ids = extractSponsoredCourseIds(res);
        setSponsoredCourseIds(ids);
      })
      .catch(err => {
        console.warn('Sponsored courses query:', err);
      });
  }, []);

  const queryFromUrl = searchParams.get('q') || searchParams.get('search') || '';
  const levelFromUrl = searchParams.get('level') || 'All';

  const [searchQuery, setSearchQuery] = useState(queryFromUrl);
  const [filterLevel, setFilterLevel] = useState(levelFromUrl);

  useEffect(() => {
    setSearchQuery(searchParams.get('q') || searchParams.get('search') || '');
    setFilterLevel(searchParams.get('level') || 'All');
  }, [searchParams]);

  const updateSearch = (newQuery: string, newLevel: string) => {
    const params: Record<string, string> = {};
    if (newQuery.trim()) params.q = newQuery.trim();
    if (newLevel && newLevel !== 'All') params.level = newLevel;
    setSearchParams(params);
  };

  const handleLevelChange = (lvl: string) => {
    setFilterLevel(lvl);
    updateSearch(searchQuery, lvl);
  };

  const handleTermClick = (term: string) => {
    setSearchQuery(term);
    updateSearch(term, filterLevel);
  };

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      if (!c.isPublished || !c.isApprovedByAdmin) return false;
      const matchesLevel = filterLevel === 'All' || c.level.toLowerCase() === filterLevel.toLowerCase();
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery = q === '' ||
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.instructor.toLowerCase().includes(q);
      return matchesLevel && matchesQuery;
    }).map(c => ({
      ...c,
      isSponsored: Boolean(
        c.isSponsored === true ||
        (c as any).is_sponsored === true ||
        c.isSponsored === 1 ||
        (c as any).is_sponsored === 1 ||
        c.isSponsored === '1' ||
        (c as any).is_sponsored === '1' ||
        sponsoredCourseIds.includes(String(c.id)) ||
        sponsoredCourseIds.includes(String((c as any).course_id))
      )
    }));
  }, [courses, filterLevel, searchQuery, sponsoredCourseIds]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Search Header Banner */}
        <div className="relative py-6 sm:py-8 space-y-5">
          <div className="space-y-3">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 text-xs font-bold tracking-wide shadow-xs">
              <Search className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>
                <span className="text-teal-700 dark:text-teal-300 font-black">UQ</span>
                <span className="text-purple-600 dark:text-purple-400 font-black">learn</span> Intelligent Search Engine
              </span>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
                Results for <span className="text-teal-600 dark:text-teal-400">"{searchQuery || 'All Courses'}"</span>
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base font-medium">
                Discovering <span className="text-teal-600 dark:text-teal-400 font-bold">{filteredCourses.length}</span> world-class professional courses tailored to your learning goals.
              </p>
            </div>

            {/* Quick search suggestion pills */}
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">Trending:</span>
              {['Python', 'React', 'Data Science', 'UI/UX', 'Marketing', 'Business'].map((term) => (
                <button
                  key={term}
                  onClick={() => handleTermClick(term)}
                  className="px-3.5 py-1.5 bg-white dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-teal-500 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all shadow-xs cursor-pointer"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Filter Search Results</span>
          </div>

          <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Level:</span>
            {['All', 'Beginner', 'Intermediate', 'Advanced', 'All Levels'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => handleLevelChange(lvl)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  filterLevel.toLowerCase() === lvl.toLowerCase()
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Results Grid */}
        {isLoadingCourses ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <CatalogCourseCardSkeleton key={`search-skeleton-${idx}`} />
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
            <Search className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto animate-pulse" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">No matching results found</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Try searching with different keywords or clearing filters.</p>
            <button
              onClick={() => { setSearchQuery(''); setFilterLevel('All'); setSearchParams({}); }}
              className="mt-4 px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              Reset Search & Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {filteredCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                formatPrice={formatPrice}
                getDiscountPercentage={getDiscountPercentage}
                navigate={navigate}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
};
