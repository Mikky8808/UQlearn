import React, { useState, useMemo } from 'react';
import { Course } from '../../types';
import { useApp } from '../../context/AppContext';
import { ReviewerTab } from './ReviewerSidebar';
import { ReviewerCourseDetailPage } from './ReviewerCourseDetailPage';
import { ReviewerInbox } from './ReviewerInbox';
import { resolveImageUrl } from '../../lib/branding';
import { 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Filter, 
  Eye, 
  ShieldCheck,
  Globe,
  PlayCircle
} from 'lucide-react';

interface ReviewerDashboardProps {
  activeTab: ReviewerTab;
  onTabChange: (tab: ReviewerTab) => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
}

export const ReviewerDashboard: React.FC<ReviewerDashboardProps> = ({
  activeTab,
  searchTerm,
}) => {
  const { currentUser, courses, formatPrice } = useApp();
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedMode, setSelectedMode] = useState<'details' | 'learn'>('details');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Helper to check if a course is assigned to current reviewer
  const isCourseAssignedToCurrentReviewer = (c: Course) => {
    if (!currentUser) return true;
    const userEmail = (currentUser.email || '').toLowerCase().trim();
    const userId = (currentUser.id || '').toString().trim();
    
    const assignedEmail = (c.assignedReviewerEmail || c.assigned_reviewer_email || '').toLowerCase().trim();
    const assignedId = (c.assignedReviewerId || c.assigned_reviewer_id || '').toString().trim();
    const reviewedBy = (c.reviewedBy || '').toLowerCase().trim();

    if (assignedEmail && userEmail && assignedEmail === userEmail) return true;
    if (assignedId && userId && assignedId === userId) return true;
    if (reviewedBy && userEmail && reviewedBy === userEmail) return true;

    return false;
  };

  // Filter courses that are assigned to this reviewer
  const reviewerCourses = useMemo(() => {
    if (!courses || courses.length === 0) return [];

    const coursesWithAssignment = courses.filter(c => 
      c.assignedReviewerEmail || c.assignedReviewerId || c.assigned_reviewer_email || c.assigned_reviewer_id
    );

    // If no course has an explicit assignment yet across the whole system, show all
    if (coursesWithAssignment.length === 0) {
      return courses;
    }

    // Filter to show only courses assigned to this reviewer
    const assignedToMe = courses.filter(c => isCourseAssignedToCurrentReviewer(c));
    return assignedToMe;
  }, [courses, currentUser]);

  // Categorize reviewer-assigned courses by review status
  const pendingQueue = useMemo(() => {
    return reviewerCourses.filter(c => !c.isApprovedByAdmin && (c.reviewStatus === 'pending_review' || !c.reviewStatus));
  }, [reviewerCourses]);

  const underReviewQueue = useMemo(() => {
    return reviewerCourses.filter(c => c.reviewStatus === 'under_review');
  }, [reviewerCourses]);

  const approvedCatalog = useMemo(() => {
    return reviewerCourses.filter(c => c.isApprovedByAdmin || c.reviewStatus === 'approved');
  }, [reviewerCourses]);

  const needsChangesQueue = useMemo(() => {
    return reviewerCourses.filter(c => c.reviewStatus === 'needs_changes' || c.reviewStatus === 'rejected');
  }, [reviewerCourses]);

  // Categories list from assigned courses
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    reviewerCourses.forEach(c => { if (c.category) set.add(c.category); });
    return Array.from(set);
  }, [reviewerCourses]);

  // Filtered courses depending on current activeTab and search/category filters
  const displayedCourses = useMemo(() => {
    let list: Course[] = [];

    if (activeTab === 'pending') {
      list = pendingQueue;
    } else if (activeTab === 'under_review') {
      list = underReviewQueue;
    } else if (activeTab === 'approved') {
      list = approvedCatalog;
    } else if (activeTab === 'needs_changes') {
      list = needsChangesQueue;
    } else {
      list = reviewerCourses;
    }

    if (categoryFilter !== 'all') {
      list = list.filter(c => c.category === categoryFilter);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(c => 
        (c.title || '').toLowerCase().includes(q) ||
        (c.instructor || '').toLowerCase().includes(q) ||
        (c.category || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [reviewerCourses, activeTab, pendingQueue, underReviewQueue, approvedCatalog, needsChangesQueue, categoryFilter, searchTerm]);

  if (activeTab === 'inbox') {
    return <ReviewerInbox />;
  }

  // If a course is selected for deep audit, show ReviewerCourseDetailPage in full-screen (hiding reviewer nav)
  if (selectedCourse) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden animate-in fade-in duration-200">
        <ReviewerCourseDetailPage
          course={selectedCourse}
          initialMode={selectedMode}
          onBack={() => setSelectedCourse(null)}
          onCourseReviewed={() => setSelectedCourse(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">

      {/* MAIN COURSE QUEUE TABLE & LIST */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl transition-colors">
        
        {/* Table Control Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-50 dark:bg-slate-950/60">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <span>Course Review Submissions Queue</span>
              <span className="bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs px-2.5 py-0.5 rounded-lg font-mono">
                {isLoading ? '...' : `${displayedCourses.length} Courses`}
              </span>
            </h2>
          </div>

          {/* Category Filter Dropdown */}
          {categoriesList.length > 0 && (
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer font-mono"
              >
                <option value="all">All Categories</option>
                {categoriesList.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Table Content */}
        {isLoading ? (
          <div className="p-10 space-y-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center space-x-4 py-3.5 border-b border-slate-200 dark:border-slate-800/60">
                <div className="w-12 h-10 bg-slate-200 dark:bg-slate-800 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                </div>
                <div className="w-24 h-6 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        ) : displayedCourses.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <p className="text-sm font-bold text-slate-900 dark:text-white">No courses match this filter.</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              All submitted courses in this queue have been audited or no search matches were found.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Course & Media</th>
                  <th className="py-3.5 px-4">Instructor</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Price</th>
                  <th className="py-3.5 px-4">Review Status</th>
                  <th className="py-3.5 px-4 text-right">Review Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                {displayedCourses.map((course) => {
                  const isApproved = course.isApprovedByAdmin || course.reviewStatus === 'approved';
                  const isNeedsChanges = course.reviewStatus === 'needs_changes' || course.reviewStatus === 'rejected';

                  return (
                    <tr 
                      key={course.id}
                      onClick={() => setSelectedCourse(course)}
                      className={`transition-all duration-150 cursor-pointer group border-l-4 ${
                        isApproved 
                          ? 'border-l-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50' 
                          : isNeedsChanges 
                            ? 'border-l-rose-500 bg-rose-50/50 dark:bg-rose-950/10 hover:bg-rose-100 dark:hover:bg-rose-950/20' 
                            : 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/10 hover:bg-amber-100 dark:hover:bg-amber-950/20'
                      }`}
                    >
                      {/* Course & Thumbnail */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3 min-w-0 font-mono">
                          <img 
                            src={resolveImageUrl(course.image || course.thumbnail, 'course')}
                            alt={course.title} 
                            className="w-12 h-10 object-cover rounded-lg border border-slate-300 dark:border-slate-800 shrink-0 group-hover:border-indigo-500/50 transition-colors"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors truncate max-w-xs sm:max-w-md font-sans">
                                {course.title}
                              </p>
                              {!isApproved && !isNeedsChanges && (
                                <span className="bg-amber-400 text-black text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest font-mono shrink-0 border border-amber-500">
                                  Needs Audit
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate font-mono">
                              {course.modules?.length || 0} Modules • {course.level || 'All Levels'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Instructor */}
                      <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {course.instructor || 'Unknown'}
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase border border-slate-300 dark:border-slate-700 font-mono">
                          {course.category}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-3.5 px-4 font-black text-teal-600 dark:text-teal-400 whitespace-nowrap font-mono">
                        {course.price === 0 ? 'FREE' : formatPrice(course.price)}
                      </td>

                      {/* Review Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isApproved ? (
                          <span className="inline-flex items-center space-x-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                            <span>Approved</span>
                          </span>
                        ) : isNeedsChanges ? (
                          <span className="inline-flex items-center space-x-1.5 bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider">
                            <AlertTriangle className="w-3 h-3 text-rose-500 dark:text-rose-400" />
                            <span>Needs Changes</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider font-mono">
                            <Clock className="w-3 h-3 text-amber-500 dark:text-amber-400 animate-pulse" />
                            <span>Pending Review</span>
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMode('details');
                              setSelectedCourse(course);
                            }}
                            className="px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-600 dark:text-indigo-300 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all flex items-center space-x-1 cursor-pointer"
                            title="View Course Details"
                          >
                            <Globe className="w-3.5 h-3.5" />
                            <span>Course Details</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMode('learn');
                              setSelectedCourse(course);
                            }}
                            className="px-2.5 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-600 dark:text-purple-300 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all flex items-center space-x-1 cursor-pointer"
                            title="View Learn Player"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            <span>Course Learn</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
};
