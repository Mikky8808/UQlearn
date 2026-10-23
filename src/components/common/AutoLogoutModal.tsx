import React, { useState, useEffect } from 'react';
import { Clock, ShieldAlert, LogOut, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';

import { getActiveSession } from '../../lib/apiConfig';

export const AutoLogoutModal: React.FC = () => {
  const { currentUser, logoutUser, extendSession } = useApp();
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 minutes in seconds

  useEffect(() => {
    if (!currentUser) {
      setShowWarning(false);
      return;
    }

    const checkSession = () => {
      const activeUser = getActiveSession();
      if (!activeUser) return;
      try {
        const expiresAt = activeUser.sessionExpiresAt || Number(localStorage.getItem('uqlearn_session_expires_at'));
        if (!expiresAt) return;

        const now = Date.now();
        const diffMs = expiresAt - now;
        const diffSec = Math.floor(diffMs / 1000);

        // If less than 5 minutes (300 seconds) remaining, show warning modal
        if (diffSec <= 300 && diffSec > 0) {
          setShowWarning(true);
          setTimeLeft(diffSec);
        } else if (diffSec <= 0) {
          // Expired
          logoutUser();
        } else {
          // More than 5 minutes left
          // If warning was open but session was extended, close it
          if (showWarning && diffSec > 300) {
            setShowWarning(false);
          }
        }
      } catch (e) {
        // ignore
      }
    };

    checkSession();
    const interval = setInterval(checkSession, 1000);
    return () => clearInterval(interval);
  }, [currentUser, showWarning, logoutUser]);

  if (!currentUser || !showWarning) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const handleStayLoggedIn = () => {
    if (extendSession) {
      extendSession();
    }
    setShowWarning(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        id="auto-logout-modal-card"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-6 text-slate-900 dark:text-slate-100"
      >
        <div className="flex items-center space-x-3 text-amber-600 dark:text-amber-400">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-xl">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Session Expiring Soon</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">For security, your session will time out due to inactivity.</p>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 flex items-center justify-between border border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-300">
            <Clock className="w-5 h-5 text-amber-500 animate-pulse" />
            <span className="text-sm font-medium">Time remaining:</span>
          </div>
          <span className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/80 px-3 py-1 rounded-lg">
            {formattedTime}
          </span>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          You will be automatically logged out when the timer reaches zero. Click <strong className="text-slate-900 dark:text-white">Stay Logged In</strong> to continue your session.
        </p>

        <div className="flex items-center space-x-3 pt-2">
          <button
            type="button"
            onClick={logoutUser}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-sm transition-colors flex items-center justify-center space-x-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
          <button
            type="button"
            onClick={handleStayLoggedIn}
            className="flex-1 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm transition-colors shadow-sm flex items-center justify-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Stay Logged In</span>
          </button>
        </div>
      </div>
    </div>
  );
};
