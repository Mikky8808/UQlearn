import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { fetchReviewersFromApi, ReviewerAccount } from '../../lib/reviewerService';
import { assignCourseToReviewerApi, apiFetch, saveReviewerAssignmentsApi } from '../../lib/apiConfig';
import { 
  Users, 
  Search, 
  BookOpen, 
  Layers, 
  CheckCircle, 
  AlertCircle, 
  X, 
  CheckCircle2, 
  UserCheck, 
  ShieldCheck, 
  Filter
} from 'lucide-react';

interface AdminAssignCoursesTabProps {
  onManageCourse?: (course: any) => void;
}

export const AdminAssignCoursesTab: React.FC<AdminAssignCoursesTabProps> = () => {
  const { courses, updateCourse } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Reviewer and Assignment States
  const [reviewers, setReviewers] = useState<ReviewerAccount[]>([]);
  const [loadingReviewers, setLoadingReviewers] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Modal States
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [reviewerSearchQuery, setReviewerSearchQuery] = useState('');
  const [selectedReviewerIds, setSelectedReviewerIds] = useState<string[]>([]);

  // Load Reviewers on mount
  useEffect(() => {
    const loadReviewers = async () => {
      try {
        const list = await fetchReviewersFromApi();
        setReviewers(list || []);
      } catch (err) {
        console.error('Failed to fetch reviewers:', err);
        setErrorMsg('Failed to fetch platform reviewers list.');
      } finally {
        setLoadingReviewers(false);
      }
    };
    loadReviewers();
  }, []);

  // Filter courses based on search
  const filteredCourses = (courses || []).filter(course => {
    const query = searchQuery.toLowerCase();
    const reviewerNames = (course.assignedReviewerName || course.assigned_reviewer_name || '').toLowerCase();
    return (
      course.title.toLowerCase().includes(query) ||
      (course.instructor || '').toLowerCase().includes(query) ||
      (course.category || '').toLowerCase().includes(query) ||
      reviewerNames.includes(query)
    );
  });

  // Parse currently assigned reviewers for a course
  const getAssignedReviewerIds = (course: any): string[] => {
    const idStr = course.assignedReviewerId || course.assigned_reviewer_id || '';
    if (!idStr) return [];
    if (idStr.trim().startsWith('[')) {
      try {
        return JSON.parse(idStr);
      } catch (e) {
        // ignore
      }
    }
    return idStr.split(',').map((s: string) => s.trim()).filter(Boolean);
  };

  // Open multi-assign modal
  const handleOpenAssignModal = (course: any) => {
    setSelectedCourse(course);
    setReviewerSearchQuery('');
    const assignedIds = getAssignedReviewerIds(course);
    setSelectedReviewerIds(assignedIds);
  };

  // Toggle single reviewer checkbox in selection
  const handleToggleReviewerSelection = (reviewerId: string) => {
    setSelectedReviewerIds(prev => {
      if (prev.includes(reviewerId)) {
        return prev.filter(id => id !== reviewerId);
      } else {
        return [...prev, reviewerId];
      }
    });
  };

  // Select all or clear all reviewers
  const handleSelectAllReviewers = (visibleReviewers: ReviewerAccount[]) => {
    const visibleIds = visibleReviewers.map(r => r.id);
    setSelectedReviewerIds(prev => {
      const otherIds = prev.filter(id => !visibleIds.includes(id));
      return [...otherIds, ...visibleIds];
    });
  };

  const handleClearAllReviewers = (visibleReviewers: ReviewerAccount[]) => {
    const visibleIds = visibleReviewers.map(r => r.id);
    setSelectedReviewerIds(prev => prev.filter(id => !visibleIds.includes(id)));
  };

  // Execute assignment transfer
  const handleSaveAssignments = async () => {
    if (!selectedCourse) return;
    setIsSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    const courseId = selectedCourse.id;

    try {
      // Find all selected reviewer objects
      const selectedReviewerObjects = reviewers.filter(r => selectedReviewerIds.includes(r.id));
      
      const ids = selectedReviewerObjects.map(r => r.id);
      const names = selectedReviewerObjects.map(r => r.name);
      const emails = selectedReviewerObjects.map(r => r.email);

      // 1. Update course details in App Context / UI state & Sync with MySQL database
      const updates = {
        assignedReviewerId: ids.join(','),
        assigned_reviewer_id: ids.join(','),
        assignedReviewerName: names.join(', '),
        assigned_reviewer_name: names.join(', '),
        assignedReviewerEmail: emails.join(','),
        assigned_reviewer_email: emails.join(','),
      };

      await updateCourse(courseId, updates);

      // 2. Call the dedicated assign-reviewer.php API endpoint for real-time relational mapping
      const simplifiedReviewers = selectedReviewerObjects.map(r => ({
        id: r.id,
        name: r.name,
        email: r.email
      }));
      await saveReviewerAssignmentsApi(courseId, simplifiedReviewers);

      setSuccessMsg(`Successfully assigned ${selectedReviewerObjects.length} reviewer(s) to "${selectedCourse.title}"!`);
      setSelectedCourse(null);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      console.error('Failed to update reviewer assignments:', err);
      setErrorMsg(err.message || 'An error occurred while saving reviewer assignments.');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter reviewers in modal based on search query
  const filteredReviewersInModal = reviewers.filter(r => {
    const query = reviewerSearchQuery.toLowerCase();
    return (
      r.name.toLowerCase().includes(query) ||
      r.email.toLowerCase().includes(query) ||
      (r.specialization || '').toLowerCase().includes(query)
    );
  });

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 text-slate-800 dark:text-slate-100 transition-colors">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-900 to-teal-950 rounded-3xl p-6 sm:p-8 border border-emerald-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left z-10">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-black uppercase tracking-wider">
            <Users className="w-3.5 h-3.5" />
            <span>Review Quality Operations</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
            Assign Course to Reviewers
          </h1>
          <p className="text-xs text-emerald-200 max-w-xl font-medium leading-relaxed">
            Distribute course review assignments to qualified quality evaluators. Unlike instructors, **multiple reviewers** can be assigned to evaluate a single course simultaneously for peer moderation.
          </p>
        </div>
        <div className="shrink-0 flex items-center justify-center p-4 bg-emerald-950 border border-emerald-800 rounded-2xl shadow-inner">
          <Users className="w-12 h-12 text-emerald-400" />
        </div>
      </div>

      {/* Alert Feedbacks */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-xs font-bold flex items-center space-x-2.5 shadow-sm animate-fadeIn">
          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 rounded-2xl text-xs font-bold flex items-center space-x-2.5 shadow-sm animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Course Directory Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        
        {/* Table Search & Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center space-x-2">
              <Layers className="w-4.5 h-4.5 text-emerald-500" />
              <span>Course Assignment Directory</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Filter and assign courses to multiple peer reviewers</p>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by title, category, instructor or reviewer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-950 dark:text-slate-100 placeholder-slate-400 outline-hidden focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* Courses Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold uppercase text-[9px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-4">Course Details</th>
                <th className="py-3 px-4">Instructor Owner</th>
                <th className="py-3 px-4">Assigned Reviewers</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredCourses.length > 0 ? (
                filteredCourses.map((c) => {
                  const assignedReviewersStr = c.assignedReviewerName || c.assigned_reviewer_name;
                  const reviewerCount = getAssignedReviewerIds(c).length;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100 max-w-xs truncate" title={c.title}>
                          {c.title}
                        </div>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5 font-mono">
                          <span>ID: {c.id}</span>
                          <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded uppercase font-bold">
                            {c.category || 'General'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                        {c.instructor || 'Unknown Instructor'}
                      </td>
                      <td className="py-3.5 px-4">
                        {assignedReviewersStr ? (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-1">
                              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[10px] font-black rounded-md">
                                {reviewerCount} Assigned
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 max-w-xs truncate" title={assignedReviewersStr}>
                              {assignedReviewersStr}
                            </p>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold italic">
                            No Reviewer Assigned
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenAssignModal(c)}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[11px] rounded-lg shadow-xs transition-all cursor-pointer flex items-center space-x-1 ml-auto"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Assign</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 font-medium">
                    No courses found matching search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* MULTI-SELECT REVIEWER ASSIGNMENT MODAL */}
      {selectedCourse && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] animate-slideUp text-slate-800 dark:text-white">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="space-y-1 max-w-[85%]">
                <div className="inline-flex items-center space-x-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Peer Review Peer-to-Peer</span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug">
                  Assign Reviewers to Course
                </h3>
                <p className="text-xs text-slate-400 font-bold truncate" title={selectedCourse.title}>
                  Course: <span className="text-slate-600 dark:text-slate-300 font-normal">{selectedCourse.title}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedCourse(null)}
                className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Search & Quick Select Action Buttons */}
            <div className="py-4 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search reviewer names, emails or skills..."
                  value={reviewerSearchQuery}
                  onChange={(e) => setReviewerSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 placeholder-slate-400"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>Selected: <span className="text-emerald-600 dark:text-emerald-400 font-black">{selectedReviewerIds.length} Reviewer(s)</span></span>
                <div className="space-x-3">
                  <button
                    type="button"
                    onClick={() => handleSelectAllReviewers(filteredReviewersInModal)}
                    className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Select All Visible
                  </button>
                  <button
                    type="button"
                    onClick={() => handleClearAllReviewers(filteredReviewersInModal)}
                    className="text-rose-500 hover:underline cursor-pointer"
                  >
                    Deselect All Visible
                  </button>
                </div>
              </div>
            </div>

            {/* Reviewers Selection List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[45vh] pr-1.5 scrollbar-thin">
              {loadingReviewers ? (
                <div className="py-12 text-center text-xs text-slate-400 font-bold">
                  Querying reviewer profiles from database...
                </div>
              ) : filteredReviewersInModal.length > 0 ? (
                filteredReviewersInModal.map((rev) => {
                  const isChecked = selectedReviewerIds.includes(rev.id);
                  return (
                    <div
                      key={rev.id}
                      onClick={() => handleToggleReviewerSelection(rev.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 select-none ${
                        isChecked
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-900/60 shadow-2xs'
                          : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800/60 hover:bg-slate-100/50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <img
                          src={rev.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80'}
                          alt={rev.name}
                          className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                        />
                        <div>
                          <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center space-x-1.5">
                            <span>{rev.name}</span>
                            <span className="text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded-md font-semibold">
                              {rev.uq_affiliation || 'Staff'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono">{rev.email}</p>
                          {rev.specialization && (
                            <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5 uppercase tracking-wider">
                              Specs: {rev.specialization}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 pr-1">
                        <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${
                          isChecked
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}>
                          {isChecked && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3px]" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-slate-400 font-bold text-xs">
                  No reviewers align with search query.
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-5 mt-4 flex items-center justify-end space-x-3.5">
              <button
                type="button"
                onClick={() => setSelectedCourse(null)}
                className="px-4.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveAssignments}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{isSaving ? 'Saving Assignments...' : 'Save Assignments'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
