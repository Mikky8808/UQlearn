import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { isDeveloperUser } from '../../lib/developer';
import { ROOT_URL } from '../../lib/apiConfig';
import { GraduationCap, Presentation, ShieldCheck, FileCheck, Wrench } from 'lucide-react';

export const DeveloperPortalSwitcher: React.FC = () => {
  const { currentUser } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // STRICT ACCESS CHECK: Only show if logged in as authorized developer
  if (!isDeveloperUser(currentUser)) {
    return null;
  }

  const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
  const isInstructorHost = hostname.startsWith('instructor.');
  const isReviewerHost = hostname.startsWith('rev.') || hostname.startsWith('reviewer.') || hostname.startsWith('review.') || hostname.startsWith('coursereviewer.');
  const isAdminHost = hostname.startsWith('en.') || hostname.startsWith('admin.');
  const isLiveUqDomain = hostname.includes(ROOT_URL.replace('https://', ''));

  const isInstructorRoute = isInstructorHost || location.pathname.startsWith('/instructor') || location.pathname.startsWith('/login/instructor');
  const isReviewerRoute = isReviewerHost || location.pathname.startsWith('/reviewer') || location.pathname.startsWith('/login/reviewer');
  const isAdminRoute = isAdminHost || location.pathname.startsWith('/admin') || location.pathname.startsWith('/login/admin');
  const isStudentRoute = !isInstructorRoute && !isReviewerRoute && !isAdminRoute;

  const handleGoStudent = () => {
    if (isLiveUqDomain && (isInstructorHost || isReviewerHost || isAdminHost)) {
      window.location.href = `${ROOT_URL}/`;
    } else {
      navigate('/');
    }
  };

  const handleGoInstructor = () => {
    if (isLiveUqDomain && !isInstructorHost) {
      window.location.href = `https://instructor.${ROOT_URL.replace('https://', '')}/`;
    } else {
      navigate(isInstructorHost ? '/' : '/instructor');
    }
  };

  const handleGoReviewer = () => {
    if (isLiveUqDomain && !isReviewerHost) {
      window.location.href = `https://rev.${ROOT_URL.replace('https://', '')}/`;
    } else {
      navigate(isReviewerHost ? '/' : '/reviewer');
    }
  };

  const handleGoAdmin = () => {
    if (isLiveUqDomain && !isAdminHost) {
      window.location.href = `https://en.${ROOT_URL.replace('https://', '')}/`;
    } else {
      navigate(isAdminHost ? '/' : '/admin');
    }
  };

  return (
    <aside aria-label="Developer Portals Switcher" className="bg-slate-950 border-b border-amber-500/30 text-white px-3 sm:px-4 py-1.5 flex flex-wrap items-center justify-between text-xs shadow-md z-50 transition-all">
      {/* Developer Identification Badge */}
      <div className="flex items-center space-x-2 py-0.5">
        <div className="flex items-center space-x-1.5 bg-amber-500/15 border border-amber-500/30 text-amber-300 px-2 py-0.5 rounded-md font-mono text-[11px] font-bold">
          <Wrench className="w-3 h-3 text-amber-400 animate-pulse" />
          <span>Dev Switcher</span>
        </div>
        <span className="text-slate-400 text-[11px] hidden md:inline font-mono truncate max-w-xs">
          {currentUser?.email}
        </span>
      </div>

      {/* 4 Portal Quick Switch Buttons: Student -> Instructor -> Reviewer -> Admin */}
      <div className="flex items-center space-x-1 sm:space-x-1.5 py-0.5">
        {/* 1. Student Portal */}
        <button
          onClick={handleGoStudent}
          className={`px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold flex items-center space-x-1 sm:space-x-1.5 transition-all cursor-pointer ${
            isStudentRoute
              ? 'bg-teal-600 text-white shadow-sm ring-1 ring-teal-400 scale-[1.02]'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
          }`}
          title="Switch to Student Portal (uqlearn.org)"
        >
          <GraduationCap className="w-3.5 h-3.5 text-teal-400" />
          <span>Student</span>
          {isStudentRoute && <span className="w-1.5 h-1.5 rounded-full bg-teal-200 ml-0.5 animate-ping" />}
        </button>

        {/* 2. Instructor Studio */}
        <button
          onClick={handleGoInstructor}
          className={`px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold flex items-center space-x-1 sm:space-x-1.5 transition-all cursor-pointer ${
            isInstructorRoute
              ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400 scale-[1.02]'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
          }`}
          title="Switch to Instructor Studio (instructor.uqlearn.org)"
        >
          <Presentation className="w-3.5 h-3.5 text-indigo-400" />
          <span>Instructor</span>
          {isInstructorRoute && <span className="w-1.5 h-1.5 rounded-full bg-indigo-200 ml-0.5 animate-ping" />}
        </button>

        {/* 3. Course Reviewer Portal (Positioned between Instructor and Admin) */}
        <button
          onClick={handleGoReviewer}
          className={`px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold flex items-center space-x-1 sm:space-x-1.5 transition-all cursor-pointer ${
            isReviewerRoute
              ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-400 scale-[1.02]'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
          }`}
          title="Switch to Course Reviewer Portal (reviewer.uqlearn.org)"
        >
          <FileCheck className="w-3.5 h-3.5 text-purple-400" />
          <span>Reviewer</span>
          {isReviewerRoute && <span className="w-1.5 h-1.5 rounded-full bg-purple-200 ml-0.5 animate-ping" />}
        </button>

        {/* 4. Admin Console */}
        <button
          onClick={handleGoAdmin}
          className={`px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold flex items-center space-x-1 sm:space-x-1.5 transition-all cursor-pointer ${
            isAdminRoute
              ? 'bg-rose-600 text-white shadow-sm ring-1 ring-rose-400 scale-[1.02]'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
          }`}
          title="Switch to Admin Console (en.uqlearn.org)"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
          <span>Admin</span>
          {isAdminRoute && <span className="w-1.5 h-1.5 rounded-full bg-rose-200 ml-0.5 animate-ping" />}
        </button>
      </div>
    </aside>
  );
};
