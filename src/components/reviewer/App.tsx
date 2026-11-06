import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Course } from '../../types';
import { useApp } from '../../context/AppContext';
import { ReviewerLoginPage } from './ReviewerLoginPage';
import { ReviewerNavbar } from './ReviewerNavbar';
import { ReviewerSidebar, ReviewerTab } from './ReviewerSidebar';
import { ReviewerDashboard } from './ReviewerDashboard';
import { isDeveloperUser } from '../../lib/developer';
import { X, Loader2 } from 'lucide-react';

function ReviewerWorkbench() {
  const { currentUser, courses, logoutUser } = useApp();
  const [activeTab, setActiveTab] = useState<ReviewerTab>('all');
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

  const pendingCount = reviewerCourses.filter(c => !c.isApprovedByAdmin && (c.reviewStatus === 'pending_review' || !c.reviewStatus)).length;
  const underReviewCount = reviewerCourses.filter(c => c.reviewStatus === 'under_review').length;
  const approvedCount = reviewerCourses.filter(c => c.isApprovedByAdmin || c.reviewStatus === 'approved').length;
  const needsChangesCount = reviewerCourses.filter(c => c.reviewStatus === 'needs_changes' || c.reviewStatus === 'rejected').length;

  const totalCount = reviewerCourses.length;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      <ReviewerNavbar
        onToggleSidebar={() => {}}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        pendingCount={pendingCount}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex">
        <main className="flex-1 min-w-0 p-6 lg:p-8 max-w-7xl mx-auto w-full">
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

export default function ReviewerApp() {
  const { currentUser } = useApp();
  const location = useLocation();

  const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
  const isReviewerHost = hostname.startsWith('rev.') || hostname.startsWith('reviewer.') || hostname.startsWith('review.') || hostname.startsWith('coursereviewer.');
  const loginPath = isReviewerHost ? '/login' : '/login/reviewer';
  const homePath = isReviewerHost ? '/' : '/reviewer';

  const isDev = isDeveloperUser(currentUser);
  const isReviewerAuthorized = Boolean(currentUser && (
    currentUser.role === 'reviewer' || 
    currentUser.role === 'course_reviewer' || 
    currentUser.role === 'admin' || 
    isDev
  ));

  return (
    <Routes>
      <Route 
        path="/login" 
        element={
          isReviewerAuthorized ? (
            <Navigate to={homePath} replace />
          ) : (
            <ReviewerLoginPage />
          )
        } 
      />
      <Route 
        path="/login/reviewer" 
        element={
          isReviewerAuthorized ? (
            <Navigate to={homePath} replace />
          ) : (
            <ReviewerLoginPage />
          )
        } 
      />
      <Route 
        path="/*" 
        element={
          !isReviewerAuthorized ? (
            <Navigate 
              to={loginPath} 
              replace 
              state={{ from: location.pathname + location.search }} 
            />
          ) : (
            <ReviewerWorkbench />
          )
        } 
      />
    </Routes>
  );
}
