import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

export const HeroContent: React.FC = () => {
  const images = [
    '/public/assets/aistudio/Connected_Learning__Brighter_Futures_1b170216.png',
    '/public/assets/aistudio/Connected_Learning__Africa_to_Achievement_61efd14a.png'
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
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-bold text-sm">
            <Sparkles className="w-4 h-4" />
            <span>No. 1 Leading E-Learning In Africa</span>
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
