import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Search, Star, Filter, BookOpen, Clock, Users, ArrowRight, X, BadgeCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CatalogCourseCardSkeleton } from '../common/CourseCardSkeleton';
import { CourseCard } from '../common/CourseCard';
import { SponsoredBadge } from '../common/SponsoredBadge';
import { SponsoredLabel } from '../common/SponsoredLabel';
import { recordSponsoredClickApi, getActiveSponsoredCoursesApi, extractSponsoredCourseIds } from '../../lib/apiConfig';
import { Course } from '../../types';

interface CourseCatalogProps {
  onSelectCourse?: (course: Course) => void;
}

export const CourseCatalog: React.FC<CourseCatalogProps> = () => {
  const { courses, categories, formatPrice, getDiscountPercentage, isLoadingCourses } = useApp();
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

  const categoryFromUrl = searchParams.get('category') || 'All';
  const levelFromUrl = searchParams.get('level') || 'All';
  const searchFromUrl = searchParams.get('search') || searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(searchFromUrl);
  const [selectedCategory, setSelectedCategory] = useState(categoryFromUrl);

  // Sync state when URL params change
  useEffect(() => {
    setSelectedCategory(searchParams.get('category') || 'All');
    setSearchQuery(searchParams.get('search') || searchParams.get('q') || '');
  }, [searchParams]);

  const updateFilters = (newCategory: string, newSearch: string) => {
    const params: Record<string, string> = {};
    if (newCategory && newCategory !== 'All') params.category = newCategory;
    if (newSearch && newSearch.trim()) params.search = newSearch.trim();
    setSearchParams(params);
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    updateFilters(cat, searchQuery);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters(selectedCategory, searchQuery);
  };

  const handleReset = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSearchParams({});
  };

  const allDisplayCategories = useMemo(() => {
    const publishedCourses = courses.filter(c => c.isPublished && c.isApprovedByAdmin);
    const counts = publishedCourses.reduce((acc, course) => {
      acc[course.category] = (acc[course.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categoryNames = categories && categories.length > 0 
      ? categories.filter(c => c.isActive !== false).map(c => c.name)
      : Object.keys(counts);

    const uniqueNames = Array.from(new Set([...categoryNames, ...Object.keys(counts)]));

    return uniqueNames.map(name => {
      const count = counts[name] || publishedCourses.filter(c => c.category.toLowerCase() === name.toLowerCase()).length;
      const sampleCourse = publishedCourses.find(c => c.category.toLowerCase() === name.toLowerCase() && c.image);
      return {
        name,
        count,
        image: sampleCourse?.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=300&q=80'
      };
    }).sort((a, b) => b.count - a.count);
  }, [courses, categories]);

  const categoryRingColors = [
    { ring: 'border-teal-500 shadow-teal-500/20', bg: 'bg-teal-50 dark:bg-teal-950/40', text: 'text-teal-700 dark:text-teal-300' },
    { ring: 'border-sky-400 shadow-sky-500/20', bg: 'bg-sky-50 dark:bg-sky-950/40', text: 'text-sky-700 dark:text-sky-300' },
    { ring: 'border-rose-400 shadow-rose-500/20', bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300' },
    { ring: 'border-amber-400 shadow-amber-500/20', bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300' },
    { ring: 'border-emerald-400 shadow-emerald-500/20', bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300' },
    { ring: 'border-indigo-500 shadow-indigo-500/20', bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-700 dark:text-indigo-300' },
  ];

  const filteredCourses = useMemo(() => {
    const seen = new Set<string>();
    return courses.filter((c) => {
      if (!c || !c.id || seen.has(c.id)) return false;
      seen.add(c.id);

      // Only show published and admin-approved courses to learners
      if (!c.isPublished || !c.isApprovedByAdmin) return false;
      
      const matchesCat = selectedCategory === 'All' || c.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchesSearch = searchQuery === '' || 
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.instructor.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
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
  }, [courses, selectedCategory, searchQuery, sponsoredCourseIds]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Redesigned Modern Category & Search Hub UI */}
        <div className="bg-gradient-to-br from-white via-slate-50 to-teal-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/20 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-6 transition-colors relative overflow-hidden">
          {/* Decorative background blur shape */}
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-teal-500/10 dark:bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Header & Search Bar row */}
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between relative z-10">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 rounded-full text-xs font-extrabold tracking-wide uppercase">
                  Catalog Hub
                </span>
                <span className="text-xs text-slate-400 font-medium">Browse Categories</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Explore Expert Courses
              </h1>
            </div>

            {/* Search Input Form */}
            <form onSubmit={handleSearchSubmit} className="relative w-full lg:w-96">
              <Search className="w-4 h-4 text-teal-600 dark:text-teal-400 absolute left-4 top-3.5" />
              <input
                type="text"
                placeholder="Search by title, topic, or instructor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-10 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 shadow-xs focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all outline-none font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    updateFilters(selectedCategory, '');
                  }}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>
          </div>

          {/* Categories Horizontal Scroll with Circular Avatars (Explore Categories Style) */}
          <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 relative z-10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                <BookOpen className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 mr-1.5" />
                <span>Explore Categories ({allDisplayCategories.length + 1})</span>
              </span>
              {selectedCategory !== 'All' && (
                <button
                  onClick={() => handleCategoryChange('All')}
                  className="text-xs text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer"
                >
                  Show All Categories
                </button>
              )}
            </div>

            <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto pb-3 pt-1 scrollbar-hide [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {/* "All" Circular Card */}
              <button
                type="button"
                onClick={() => handleCategoryChange('All')}
                className={`flex flex-col items-center flex-shrink-0 group cursor-pointer text-center select-none ${
                  selectedCategory === 'All' ? 'scale-105' : 'opacity-85 hover:opacity-100'
                }`}
              >
                <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full p-1 border-[2.5px] ${selectedCategory === 'All' ? 'border-teal-600 shadow-md shadow-teal-500/30 ring-2 ring-teal-500/20' : 'border-slate-300 dark:border-slate-700'} bg-white dark:bg-slate-800 shadow-xs transition-all duration-300 group-hover:scale-105 flex items-center justify-center overflow-hidden`}>
                  <div className="w-full h-full bg-teal-600 text-white rounded-full flex flex-col items-center justify-center font-black text-xs sm:text-sm">
                    All
                  </div>
                </div>
                <span className={`text-[11px] sm:text-xs font-bold mt-2 transition-colors line-clamp-1 max-w-[85px] sm:max-w-[100px] ${selectedCategory === 'All' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-800 dark:text-slate-200'}`}>
                  All Courses
                </span>
                <span className="text-[9px] text-slate-400 font-medium">
                  {courses.filter(c => c.isPublished && c.isApprovedByAdmin).length} courses
                </span>
              </button>

              {allDisplayCategories.map((cat, idx) => {
                const colorConfig = categoryRingColors[idx % categoryRingColors.length];
                const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => handleCategoryChange(cat.name)}
                    className={`flex flex-col items-center flex-shrink-0 group cursor-pointer text-center select-none ${
                      isSelected ? 'scale-105' : 'opacity-85 hover:opacity-100'
                    }`}
                  >
                    <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full p-1 border-[2.5px] ${isSelected ? 'border-teal-600 shadow-md shadow-teal-500/30 ring-2 ring-teal-500/20' : colorConfig.ring} bg-white dark:bg-slate-800 shadow-xs transition-all duration-300 group-hover:scale-105 flex items-center justify-center overflow-hidden`}>
                      <img 
                        src={cat.image} 
                        alt={cat.name} 
                        className="w-full h-full object-cover rounded-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=300&q=80';
                        }}
                      />
                    </div>
                    <span className={`text-[11px] sm:text-xs font-bold mt-2 transition-colors line-clamp-1 max-w-[85px] sm:max-w-[100px] ${isSelected ? 'text-teal-600 dark:text-teal-400' : 'text-slate-800 dark:text-slate-200'}`}>
                      {cat.name}
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium">
                      {cat.count} {cat.count === 1 ? 'course' : 'courses'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Results count & Active filters info */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium px-1">
          <div className="flex items-center space-x-2">
            <span>Showing <strong className="text-slate-900 dark:text-slate-100">{filteredCourses.length}</strong> courses available</span>
            {(selectedCategory !== 'All' || searchQuery) && (
              <button
                onClick={handleReset}
                className="text-teal-600 dark:text-teal-400 font-bold hover:underline ml-2 cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </div>
          <span>Sorted by relevance & popularity</span>
        </div>

        {/* Courses Grid */}
        {isLoadingCourses ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <CatalogCourseCardSkeleton key={`catalog-skeleton-${idx}`} />
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
            <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">No courses found</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              We couldn't find any courses matching your current filter settings.
            </p>
            <button
              onClick={handleReset}
              className="px-5 py-2.5 bg-teal-600 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-teal-500 transition-all cursor-pointer"
            >
              Reset All Filters
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
