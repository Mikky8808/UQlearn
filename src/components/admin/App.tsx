import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AdminDashboard } from './AdminDashboard';
import { AdminLoginPage } from './AdminLoginPage';
import { useApp } from '../../context/AppContext';
import { isDeveloperUser } from '../../lib/developer';

export default function AdminApp() {
  const { courses, darkMode, currentUser } = useApp();
  const location = useLocation();

  const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
  const isAdminHost = hostname.startsWith('en.') || hostname.startsWith('admin.');
  const loginPath = isAdminHost ? '/login' : '/login/admin';

  const isDev = isDeveloperUser(currentUser);
  const isAdminAuthorized = Boolean(currentUser && (currentUser.role === 'admin' || isDev));

  return (
    <div className={darkMode ? 'dark' : ''}>
      <Routes>
        <Route 
          path="/login" 
          element={
            isAdminAuthorized ? (
              <Navigate to={isAdminHost ? '/' : '/admin'} replace />
            ) : (
              <AdminLoginPage />
            )
          } 
        />
        <Route 
          path="/*" 
          element={
            !isAdminAuthorized ? (
              <Navigate 
                to={loginPath} 
                replace 
                state={{ from: location.pathname + location.search }} 
              />
            ) : (
              <AdminDashboard courses={courses} />
            )
          } 
        />
      </Routes>
    </div>
  );
}
