import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Trash2, 
  RefreshCw
} from 'lucide-react';
import { Course } from '../../../types';
import { useApp } from '../../../context/AppContext';
import { DataNotFound } from '../../common/DataNotFound';
import { currencyService, CurrencyItem } from '../../../services/currency-service';
import { ALL_CURRENCIES } from '../../../lib/currencies';

interface InstructorCoursesTabProps {
  courses: Course[];
  onDeleteCourse: (id: string) => void;
  onNavigateToCreate: () => void;
  onSelectCourseToBuild?: (courseId: string) => void;
}

export const InstructorCoursesTab: React.FC<InstructorCoursesTabProps> = ({
  courses,
  onDeleteCourse,
  onNavigateToCreate,
  onSelectCourseToBuild,
}) => {
  const navigate = useNavigate();
  const { refreshCourses, isLoadingCourses, courseDefaultThumbnail, currentUser } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Currency State
  const [systemCurrency, setSystemCurrency] = useState('KES');
  const [currenciesList, setCurrenciesList] = useState<CurrencyItem[]>(ALL_CURRENCIES.map((c, i) => ({
    ...c,
    exchange_rate: c.code === 'KES' ? 130 : c.code === 'USD' ? 1 : 1,
    is_default: i === 0 ? 1 : 0
  })));

  useEffect(() => {
    currencyService.getSystemCurrency(currentUser?.id || 'current-user').then(res => {
      if (res.preference) setSystemCurrency(res.preference);
      if (res.currencies && res.currencies.length > 0) setCurrenciesList(res.currencies);
    });

    const handleCurrencyEvent = (e: any) => {
      if (e.detail?.currency) {
        setSystemCurrency(e.detail.currency);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('uqlearn_currency_changed', handleCurrencyEvent);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('uqlearn_currency_changed', handleCurrencyEvent);
      }
    };
  }, [currentUser?.id]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshCourses(currentUser?.id);
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredCourses = useMemo(() => {
    const seen = new Set<string>();
    return courses.filter(c => {
      if (!c || !c.id || seen.has(c.id)) return false;
      seen.add(c.id);
      if (searchQuery.trim()) {
        const match = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      c.category.toLowerCase().includes(searchQuery.toLowerCase());
        if (!match) return false;
      }
      return true;
    });
  }, [courses, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Standalone Toolbar with Sharp-Edged Create New Course Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search your courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs"
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
          <span className="px-3 py-2 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-2xs">
            {filteredCourses.length} Registered Courses
          </span>

          <button
            onClick={onNavigateToCreate}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-bold shadow-xs hover:shadow transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Course</span>
          </button>
        </div>
      </div>

      {/* Courses List */}
      {(isLoadingCourses || isRefreshing) && filteredCourses.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-pulse"
            >
              <div className="flex items-start space-x-4 flex-1">
                <div className="w-20 h-20 rounded-md bg-slate-200 dark:bg-slate-800 shrink-0" />
                <div className="space-y-2 flex-1 pt-1">
                  <div className="w-28 h-4 bg-slate-200 dark:bg-slate-800 rounded-xs" />
                  <div className="w-64 h-5 bg-slate-200 dark:bg-slate-800 rounded-xs" />
                  <div className="w-48 h-3 bg-slate-200 dark:bg-slate-800 rounded-xs" />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-24 h-9 bg-slate-200 dark:bg-slate-800 rounded-md" />
                <div className="w-24 h-9 bg-slate-200 dark:bg-slate-800 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredCourses.length === 0 ? (
        <DataNotFound
          title="No Courses Found"
          message={searchQuery ? `No courses match "${searchQuery}".` : 'No courses are currently registered in your database.'}
          icon={BookOpen}
          action={{
            label: "Create New Course",
            onClick: onNavigateToCreate,
            icon: Plus
          }}
          secondaryAction={{
            label: "Refresh Catalog",
            onClick: handleRefresh
          }}
        />
      ) : (
        <div className="space-y-3">
          {filteredCourses.map((c) => {
            return (
              <div
                key={c.id}
                className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                <div className="flex items-start space-x-4 flex-1">
                  <img
                    src={(!c.isApprovedByAdmin && courseDefaultThumbnail) ? courseDefaultThumbnail : (c.image || courseDefaultThumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80')}
                    alt={c.title}
                    className="w-20 h-20 rounded-md object-cover shrink-0 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800"
                  />
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                       <span className={`px-1.5 py-0.5 rounded-xs text-[9px] font-bold uppercase border ${
                        c.isPublished !== false
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/20'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}>
                        {c.isPublished !== false ? 'Published' : 'Unpublished / Draft'}
                      </span>

                      {c.isApprovedByAdmin ? (
                        <span className="px-1.5 py-0.5 rounded-xs bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold uppercase border border-emerald-100 dark:border-emerald-800/20">
                          Approved
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded-xs bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 text-[9px] font-bold uppercase border border-amber-100 dark:border-amber-800/20 animate-pulse">
                          Pending Review
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                      {c.title}
                    </h4>
                  </div>
                </div>

                {/* Pricing and Action Buttons */}
                <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-4 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                  <div className="text-left md:text-right">
                    <span className="text-base font-black text-slate-900 dark:text-slate-100">
                      {currenciesList.find(curr => curr.code === systemCurrency)?.symbol || systemCurrency} {currencyService.convertAmount(c.price, 'USD', systemCurrency, currenciesList).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        if (onSelectCourseToBuild) {
                          onSelectCourseToBuild(c.id);
                        } else {
                          navigate(`/course/${c.id}`);
                        }
                      }}
                      className="px-5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-md text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      Manage
                    </button>
                    {(c.learnersEnrolled === 0 || !c.learnersEnrolled) && (
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete "${c.title}"?`)) {
                            onDeleteCourse(c.id);
                          }
                        }}
                        className="p-2 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-600 dark:text-rose-300 rounded-md transition-colors cursor-pointer"
                        title="Delete Course"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
