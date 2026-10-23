import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import UserPortal from './components/user/App';
import InstructorApp from './components/instructor/App';
import ReviewerApp from './components/reviewer/App';
import AdminApp from './components/admin/App';
import { InstructorLoginPage } from './components/instructor/InstructorLoginPage';
import { ReviewerLoginPage } from './components/reviewer/ReviewerLoginPage';
import { AdminLoginPage } from './components/admin/AdminLoginPage';
import { CourseImageStandardsPage } from './components/pages/CourseImageStandardsPage';
import { TopLoadingBar } from './components/common/TopLoadingBar';
import { DeveloperPortalSwitcher } from './components/common/DeveloperPortalSwitcher';
import { useApp } from './context/AppContext';
import { isDeveloperUser } from './lib/developer';

/**
 * Route protection wrapper that seamlessly redirects unauthorized users
 * to the portal login page, preserving the attempted location for post-login return.
 */
interface ProtectedRouteProps {
  isAuthorized: boolean;
  redirectTo: string;
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  isAuthorized,
  redirectTo,
  children
}) => {
  const location = useLocation();

  if (!isAuthorized) {
    const from = location.pathname + (location.search || '');
    return <Navigate to={redirectTo} replace state={{ from }} />;
  }

  return <>{children}</>;
};

/**
 * Route wrapper for login pages that smoothly transitions already-authorized users
 * to their respective portal dashboard, preventing redundant authentication forms.
 */
interface PublicOnlyRouteProps {
  isAuthorized: boolean;
  redirectTo: string;
  children: React.ReactNode;
}

const PublicOnlyRoute: React.FC<PublicOnlyRouteProps> = ({
  isAuthorized,
  redirectTo,
  children
}) => {
  const location = useLocation();
  const from = (location.state as any)?.from || redirectTo;

  if (isAuthorized) {
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
};

export default function App() {
  const { currentUser } = useApp();

  const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
  const isInstructorHost = hostname.startsWith('instructor.');
  const isReviewerHost = hostname.startsWith('rev.') || hostname.startsWith('reviewer.') || hostname.startsWith('review.') || hostname.startsWith('coursereviewer.');
  const isAdminHost = hostname.startsWith('en.') || hostname.startsWith('admin.');

  // Portal Authorization Rules
  const isDev = isDeveloperUser(currentUser);
  const isAdminAuthorized = Boolean(currentUser && (currentUser.role === 'admin' || isDev));
  const isReviewerAuthorized = Boolean(currentUser && (
    currentUser.role === 'reviewer' || 
    currentUser.role === 'course_reviewer' || 
    currentUser.role === 'admin' || 
    isDev
  ));
  const isInstructorAuthorized = Boolean(currentUser && (
    currentUser.role === 'instructor' || 
    currentUser.role === 'admin' || 
    isDev
  ));

  // Portal Login Paths
  const adminLoginPath = isAdminHost ? '/login' : '/login/admin';
  const adminHomePath = isAdminHost ? '/' : '/admin';

  const reviewerLoginPath = isReviewerHost ? '/login' : '/login/reviewer';
  const reviewerHomePath = isReviewerHost ? '/' : '/reviewer';

  const instructorLoginPath = isInstructorHost ? '/login' : '/login/instructor';
  const instructorHomePath = isInstructorHost ? '/' : '/instructor';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans relative">
      {/* YouTube-Style Top Loading Bar (Brand Teal Glow) */}
      <TopLoadingBar />

      {/* Developer-Only Quick Switcher (Visible to authorized developer emails) */}
      <DeveloperPortalSwitcher />

      {/* Main Routed Applications with Robust Authentication State Transitions */}
      <div className="flex-1">

        {isAdminHost ? (
          <Routes>
            <Route
              path="/login"
              element={
                <PublicOnlyRoute isAuthorized={isAdminAuthorized} redirectTo={adminHomePath}>
                  <AdminLoginPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/login/admin"
              element={
                <PublicOnlyRoute isAuthorized={isAdminAuthorized} redirectTo={adminHomePath}>
                  <AdminLoginPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute isAuthorized={isAdminAuthorized} redirectTo={adminLoginPath}>
                  <AdminApp />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute isAuthorized={isAdminAuthorized} redirectTo={adminLoginPath}>
                  <AdminApp />
                </ProtectedRoute>
              }
            />
            <Route
              path="/*"
              element={
                <ProtectedRoute isAuthorized={isAdminAuthorized} redirectTo={adminLoginPath}>
                  <AdminApp />
                </ProtectedRoute>
              }
            />
          </Routes>
        ) : isReviewerHost ? (
          <Routes>
            <Route
              path="/login"
              element={
                <PublicOnlyRoute isAuthorized={isReviewerAuthorized} redirectTo={reviewerHomePath}>
                  <ReviewerLoginPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/login/reviewer"
              element={
                <PublicOnlyRoute isAuthorized={isReviewerAuthorized} redirectTo={reviewerHomePath}>
                  <ReviewerLoginPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/reviewer/*"
              element={
                <ProtectedRoute isAuthorized={isReviewerAuthorized} redirectTo={reviewerLoginPath}>
                  <ReviewerApp />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reviewer"
              element={
                <ProtectedRoute isAuthorized={isReviewerAuthorized} redirectTo={reviewerLoginPath}>
                  <ReviewerApp />
                </ProtectedRoute>
              }
            />
            <Route
              path="/*"
              element={
                <ProtectedRoute isAuthorized={isReviewerAuthorized} redirectTo={reviewerLoginPath}>
                  <ReviewerApp />
                </ProtectedRoute>
              }
            />
          </Routes>
        ) : isInstructorHost ? (
          <Routes>
            <Route
              path="/login"
              element={
                <PublicOnlyRoute isAuthorized={isInstructorAuthorized} redirectTo={instructorHomePath}>
                  <InstructorLoginPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/login/instructor"
              element={
                <PublicOnlyRoute isAuthorized={isInstructorAuthorized} redirectTo={instructorHomePath}>
                  <InstructorLoginPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/instructor/*"
              element={
                <ProtectedRoute isAuthorized={isInstructorAuthorized} redirectTo={instructorLoginPath}>
                  <InstructorApp />
                </ProtectedRoute>
              }
            />
            <Route
              path="/course-image-quality-standards"
              element={<CourseImageStandardsPage />}
            />
            <Route
              path="/guidelines/course-image-quality-standards"
              element={<CourseImageStandardsPage />}
            />
            <Route
              path="/instructor"
              element={
                <ProtectedRoute isAuthorized={isInstructorAuthorized} redirectTo={instructorLoginPath}>
                  <InstructorApp />
                </ProtectedRoute>
              }
            />
            <Route
              path="/*"
              element={
                <ProtectedRoute isAuthorized={isInstructorAuthorized} redirectTo={instructorLoginPath}>
                  <InstructorApp />
                </ProtectedRoute>
              }
            />
          </Routes>
        ) : (
          <Routes>
            {/* Direct Portal Login Routes */}
            <Route
              path="/login/admin"
              element={
                <PublicOnlyRoute isAuthorized={isAdminAuthorized} redirectTo="/admin">
                  <AdminLoginPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/admin/login"
              element={
                <PublicOnlyRoute isAuthorized={isAdminAuthorized} redirectTo="/admin">
                  <AdminLoginPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/login/reviewer"
              element={
                <PublicOnlyRoute isAuthorized={isReviewerAuthorized} redirectTo="/reviewer">
                  <ReviewerLoginPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/reviewer/login"
              element={
                <PublicOnlyRoute isAuthorized={isReviewerAuthorized} redirectTo="/reviewer">
                  <ReviewerLoginPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/login/instructor"
              element={
                <PublicOnlyRoute isAuthorized={isInstructorAuthorized} redirectTo="/instructor">
                  <InstructorLoginPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/instructor/login"
              element={
                <PublicOnlyRoute isAuthorized={isInstructorAuthorized} redirectTo="/instructor">
                  <InstructorLoginPage />
                </PublicOnlyRoute>
              }
            />

            {/* Protected Portal Workspaces */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute isAuthorized={isAdminAuthorized} redirectTo="/login/admin">
                  <AdminApp />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute isAuthorized={isAdminAuthorized} redirectTo="/login/admin">
                  <AdminApp />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reviewer/*"
              element={
                <ProtectedRoute isAuthorized={isReviewerAuthorized} redirectTo="/login/reviewer">
                  <ReviewerApp />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reviewer"
              element={
                <ProtectedRoute isAuthorized={isReviewerAuthorized} redirectTo="/login/reviewer">
                  <ReviewerApp />
                </ProtectedRoute>
              }
            />
            <Route
              path="/instructor/*"
              element={
                <ProtectedRoute isAuthorized={isInstructorAuthorized} redirectTo="/login/instructor">
                  <InstructorApp />
                </ProtectedRoute>
              }
            />
            <Route
              path="/instructor"
              element={
                <ProtectedRoute isAuthorized={isInstructorAuthorized} redirectTo="/login/instructor">
                  <InstructorApp />
                </ProtectedRoute>
              }
            />

            {/* Public Marketplace / Learner Routes */}
            <Route path="/*" element={<UserPortal />} />
          </Routes>
        )}

      </div>
    </div>
  );
}
