import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

export function CategorySubNav() {
  const { categories, darkMode } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // Get active category from URL if any
  const queryParams = new URLSearchParams(location.search);
  const activeCategory = queryParams.get('category');

  const activeCategories = categories.filter(c => c.isActive);

  if (activeCategories.length === 0) return null;

  return (
    <div className={`border-b ${darkMode ? 'border-slate-800 bg-slate-900/95' : 'border-slate-200 bg-white/95'} backdrop-blur-md sticky top-[72px] z-40 shadow-xs`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center flex-nowrap overflow-x-auto space-x-6 md:space-x-8 py-3 no-scrollbar scroll-smooth">
          {activeCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                navigate(`/courses?category=${encodeURIComponent(cat.name)}`);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`whitespace-nowrap text-[13px] md:text-sm font-medium transition-colors cursor-pointer relative py-1 ${
                activeCategory === cat.name
                  ? 'text-teal-600 dark:text-teal-400 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400'
              }`}
            >
              {cat.name}
              {activeCategory === cat.name && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 dark:bg-teal-400 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
