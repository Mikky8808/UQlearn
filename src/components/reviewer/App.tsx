import React, { useState } from 'react';
import { Course } from '../../types';
import { useApp } from '../../context/AppContext';
import { ReviewerLoginPage } from './ReviewerLoginPage';
import { ReviewerNavbar } from './ReviewerNavbar';
import { ReviewerSidebar, ReviewerTab } from './ReviewerSidebar';
import { ReviewerDashboard } from './ReviewerDashboard';
import { isDeveloperUser } from '../../lib/developer';
import { X, Loader2 } from 'lucide-react';

export default function ReviewerApp() {
  const { currentUser, courses, logoutUser } = useApp();
  const [activeTab, setActiveTab] = useState<ReviewerTab>('pending');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  const handleLogout = () => {
    setIsLoggingOut(true);
    setMobileSidebarOpen(false);

    setTimeout(() => {
      try {
        localStorage.removeItem('uqlearn_reviewer');
        localStorage.removeItem('uqlearn_user');
        localStorage.removeItem('uqlearn_admin');
        localStorage.removeItem('uqlearn_instructor');
        localStorage.removeItem('uqlearn_session_expires_at');
        localStorage.removeItem('uqlearn_courses');
        localStorage.removeItem('active_reviewer');
        localStorage.removeItem('reviewer_session');

        document.cookie.split(';').forEach(c => { 
          document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/'); 
        });

        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.warn('Error clearing session:', e);
      }

      logoutUser();
      setIsLoggingOut(false);
    }, 1000);
  };

  // If logging out, display the spinner modal
  if (isLoggingOut) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-4 font-sans">
        <div className="bg-slate-900 border border-purple-500/30 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center space-y-5 animate-in fade-in zoom-in duration-200">
          <div className="w-16 h-16 bg-purple-500/10 border border-purple-500/30 rounded-2xl flex items-center justify-center mx-auto text-purple-400 shadow-inner">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-white tracking-tight">Logging Out</h3>
            <p className="text-xs text-slate-400 font-medium">Clearing session storage and returning to login portal...</p>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 via-teal-400 to-purple-500 h-full w-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Check if current user is authorized to access the Reviewer Portal
  const isReviewer = currentUser && !!currentUser.email && (
    currentUser.role === 'reviewer' || 
    currentUser.role === 'course_reviewer' || 
    currentUser.role === 'admin' || 
    isDeveloperUser(currentUser)
  );

  if (!currentUser || !currentUser.email || !isReviewer) {
    return <ReviewerLoginPage />;
  }

  // Calculate courses assigned to current reviewer
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

  const coursesWithAssignment = courses.filter(c => 
    c.assignedReviewerEmail || c.assignedReviewerId || c.assigned_reviewer_email || c.assigned_reviewer_id
  );

  const reviewerCourses = coursesWithAssignment.length > 0 
    ? courses.filter(c => isCourseAssignedToCurrentReviewer(c)) 
    : courses;

  // Calculate review counts for sidebar indicators based on assigned courses
  const pendingCount = reviewerCourses.filter(c => !c.isApprovedByAdmin && (c.reviewStatus === 'pending_review' || !c.reviewStatus)).length;
  const underReviewCount = reviewerCourses.filter(c => c.reviewStatus === 'under_review').length;
  const approvedCount = reviewerCourses.filter(c => c.isApprovedByAdmin || c.reviewStatus === 'approved').length;
  const needsChangesCount = reviewerCourses.filter(c => c.reviewStatus === 'needs_changes' || c.reviewStatus === 'rejected').length;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* Top Reviewer Navbar */}
      <ReviewerNavbar
        onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        pendingCount={pendingCount}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* Desktop Sidebar Navigation */}
        <div className="hidden md:block">
          <ReviewerSidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            pendingCount={pendingCount}
            underReviewCount={underReviewCount}
            approvedCount={approvedCount}
            needsChangesCount={needsChangesCount}
            onLogout={handleLogout}
          />
        </div>

        {/* Mobile Slide-Over Navigation Drawer */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div 
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="relative bg-slate-900 w-72 max-w-full flex flex-col h-full z-10 shadow-2xl border-r border-slate-800">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                  Reviewer Navigation
                </span>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <ReviewerSidebar
                activeTab={activeTab}
                onTabChange={setActiveTab}
                pendingCount={pendingCount}
                underReviewCount={underReviewCount}
                approvedCount={approvedCount}
                needsChangesCount={needsChangesCount}
                onCloseMobile={() => setMobileSidebarOpen(false)}
                onLogout={handleLogout}
              />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 md:pl-8 min-w-0">
          <ReviewerDashboard
            activeTab={activeTab}
            onTabChange={setActiveTab}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        </main>

      </div>
    </div>
  );
}
