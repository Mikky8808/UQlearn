import React, { useState, useEffect } from 'react';
import { BADGE_ICON_URL } from '../../assets/badgeIcon';

export const HeroContent: React.FC = () => {
  const images = [
    'https://uqlearn.org/uploads/courses/Connected_Learning__Brighter_Futures_1b170216.png',
    'https://uqlearn.org/uploads/courses/Connected_Learning__Africa_to_Achievement_61efd14a.png'
  ];
  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full relative bg-white dark:bg-slate-950 p-4 md:p-8 lg:p-10 overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 opacity-40 dark:opacity-20 bg-cover bg-center transition-opacity duration-1000"
        style={{ backgroundImage: `url("${images[currentIdx]}")` }}
      />

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 relative z-10">
        {/* Content Side */}
        <div className="flex-1 space-y-6">
          <div className="inline-flex items-center space-x-2.5 px-4 py-2 rounded-full bg-rose-50/90 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold text-sm border border-rose-200/80 dark:border-rose-900/60 shadow-xs hover:shadow-sm transition-all">
            <div className="relative w-5.5 h-5.5 shrink-0 flex items-center justify-center">
              {/* Slow spinner glow ring behind icon */}
              <div className="absolute inset-0 rounded-full bg-rose-400/30 dark:bg-rose-500/30 blur-2xs animate-[spin_8s_linear_infinite]" />
              <img 
                src={BADGE_ICON_URL} 
                alt="Badge Icon" 
                className="w-5 h-5 rounded-full object-cover shrink-0 shadow-xs relative z-10 animate-[spin_10s_linear_infinite]" 
              />
            </div>
            <span className="tracking-tight">Africa's Fastest Growing eLearning Platform</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white leading-tight">
            Where learning meets innovation. Unleash your potential with <span className="text-rose-600">dynamic Instructors</span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            With lots of expert instructors, and flexible, engaging content. Ready to embark on a journey of growth?
          </p>
        </div>
      </div>
    </div>
  );
};
