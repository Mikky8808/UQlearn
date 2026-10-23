import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface TopLoadingBarProps {
  isLoading?: boolean;
}

export const TopLoadingBar: React.FC<TopLoadingBarProps> = ({ isLoading: externalLoading }) => {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  // Trigger loading animation on route changes
  useEffect(() => {
    setVisible(true);
    setProgress(20);

    const t1 = setTimeout(() => setProgress(55), 100);
    const t2 = setTimeout(() => setProgress(85), 250);
    const t3 = setTimeout(() => {
      setProgress(100);
      const t4 = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 250);
      return () => clearTimeout(t4);
    }, 450);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [location.pathname, location.search]);

  // Handle external loading triggers (e.g. login/API requests)
  useEffect(() => {
    if (externalLoading) {
      setVisible(true);
      setProgress(35);
      const t = setTimeout(() => setProgress(75), 300);
      return () => clearTimeout(t);
    } else if (visible && progress > 0 && progress < 100) {
      setProgress(100);
      const t = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 250);
      return () => clearTimeout(t);
    }
  }, [externalLoading]);

  if (!visible && progress === 0) return null;

  return (
    <div
      id="youtube-top-loading-bar-container"
      className="fixed top-0 left-0 right-0 z-[999999] pointer-events-none h-[3px] bg-transparent"
    >
      {/* Active progress track */}
      <div
        id="youtube-top-loading-bar"
        className="h-full bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-400 transition-all duration-200 ease-out relative"
        style={{
          width: `${progress}%`,
          boxShadow: '0 0 12px #14b8a6, 0 0 6px #0d9488, 0 0 2px #2dd4bf',
          opacity: visible ? 1 : 0,
        }}
      >
        {/* Glow tip like YouTube */}
        <div className="absolute right-0 top-[-2px] bottom-[-2px] w-24 bg-white/40 blur-xs rounded-full" />
      </div>
    </div>
  );
};
