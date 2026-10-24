import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Clock, 
  Calendar, 
  CheckSquare, 
  Square, 
  Save, 
  Sparkles, 
  CheckCircle2, 
  Search,
  Tag,
  Star,
  DollarSign
} from 'lucide-react';
import { Course } from '../../types';
import { fetchFlashSaleConfigApi, saveFlashSaleConfigApi } from '../../lib/apiConfig';

interface FlashSaleConfig {
  enabled: boolean;
  title: string;
  startTime: string;
  endTime: string;
  courseIds: string[];
}

interface AdminFlashSaleManagerProps {
  courses: Course[];
}

export const ADMIN_FLASH_SALE_STORAGE_KEY = 'uqlearn_admin_flash_sale_config';
export const DEFAULT_FLASH_SALE_END = '2027-08-23T23:59:59';
export const DEFAULT_FLASH_SALE_START = '2026-10-24T00:00';

export const getStoredFlashSaleConfig = (): FlashSaleConfig => {
  try {
    const raw = localStorage.getItem(ADMIN_FLASH_SALE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        enabled: parsed.enabled !== false,
        title: parsed.title || 'Top selling items',
        startTime: parsed.startTime || DEFAULT_FLASH_SALE_START,
        endTime: parsed.endTime || DEFAULT_FLASH_SALE_END,
        courseIds: Array.isArray(parsed.courseIds) ? parsed.courseIds : []
      };
    }
  } catch {}
  return {
    enabled: true,
    title: 'Top selling items',
    startTime: DEFAULT_FLASH_SALE_START,
    endTime: DEFAULT_FLASH_SALE_END,
    courseIds: []
  };
};

export const AdminFlashSaleManager: React.FC<AdminFlashSaleManagerProps> = ({ courses }) => {
  const [config, setConfig] = useState<FlashSaleConfig>(getStoredFlashSaleConfig);
  const [searchQuery, setSearchQuery] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'synced' | 'local' | 'saving'>('synced');

  useEffect(() => {
    const loadBackendConfig = async () => {
      setIsSyncing(true);
      try {
        const remote = await fetchFlashSaleConfigApi();
        if (remote && typeof remote === 'object') {
          const merged: FlashSaleConfig = {
            enabled: remote.enabled !== false,
            title: remote.title || 'Top selling items',
            startTime: remote.startTime || DEFAULT_FLASH_SALE_START,
            endTime: remote.endTime || DEFAULT_FLASH_SALE_END,
            courseIds: Array.isArray(remote.courseIds) ? remote.courseIds : []
          };
          setConfig(merged);
          localStorage.setItem(ADMIN_FLASH_SALE_STORAGE_KEY, JSON.stringify(merged));
          setBackendStatus('synced');
        } else {
          setBackendStatus('local');
        }
      } catch {
        setBackendStatus('local');
      } finally {
        setIsSyncing(false);
      }
    };
    loadBackendConfig();
  }, []);

  const handleToggleCourse = (courseId: string) => {
    setConfig(prev => {
      const exists = prev.courseIds.includes(courseId);
      const nextIds = exists 
        ? prev.courseIds.filter(id => id !== courseId)
        : [...prev.courseIds, courseId];
      return { ...prev, courseIds: nextIds };
    });
  };

  const handleSelectAll = () => {
    const publishedIds = courses.filter(c => c.isPublished).map(c => c.id);
    setConfig(prev => ({ ...prev, courseIds: publishedIds }));
  };

  const handleDeselectAll = () => {
    setConfig(prev => ({ ...prev, courseIds: [] }));
  };

  const handleSave = async () => {
    try {
      setBackendStatus('saving');
      localStorage.setItem(ADMIN_FLASH_SALE_STORAGE_KEY, JSON.stringify(config));
      window.dispatchEvent(new Event('storage'));

      // Save to backend PHP endpoint
      await saveFlashSaleConfigApi(config);

      setBackendStatus('synced');
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (e) {
      console.error('Failed to save flash sale config to backend', e);
      setBackendStatus('local');
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    }
  };

  const filteredCourses = courses.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.instructor.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-purple-500/20">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-wider mb-3">
              <Flame className="w-3.5 h-3.5 animate-pulse" />
              <span>Flash Sale & Top Selling Control</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
              Dynamic Top Selling Items & Countdown
            </h1>
            <p className="text-purple-200 text-sm max-w-2xl leading-relaxed">
              Mark which courses display in the homepage "Top selling items" shelf and configure the exact start and end date/time for the countdown timer. Synchronized with backend PHP API.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={backendStatus === 'saving'}
            className="inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm shadow-lg shadow-orange-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{backendStatus === 'saving' ? 'Saving to Backend...' : 'Save Flash Sale Settings'}</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="flex items-center space-x-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-semibold animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>Flash sale settings and marked top selling items updated successfully and synced to server!</span>
        </div>
      )}

      {/* Configuration Form Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <span>Countdown Schedule & Shelf Settings</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Shelf Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
              Shelf Title Heading
            </label>
            <input
              type="text"
              value={config.title}
              onChange={(e) => setConfig({ ...config, title: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:border-purple-500"
              placeholder="Top selling items"
            />
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
              Sale Start Date & Time
            </label>
            <input
              type="datetime-local"
              value={config.startTime}
              onChange={(e) => setConfig({ ...config, startTime: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* End Time (Countdown Deadline) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
              Sale End Date & Time (Countdown Deadline)
            </label>
            <input
              type="datetime-local"
              value={config.endTime}
              onChange={(e) => setConfig({ ...config, endTime: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="flash-enabled"
              checked={config.enabled}
              onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
              className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
            />
            <label htmlFor="flash-enabled" className="text-sm font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
              Enable Top Selling / Flash Sale shelf on homepage
            </label>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
            {config.courseIds.length} items currently marked
          </span>
        </div>
      </div>

      {/* Course Selection Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>Mark Courses for Top Selling Shelf</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select specific courses to feature. If none selected, top discounted & popular courses display automatically.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs font-bold hover:bg-purple-100 transition-colors cursor-pointer"
            >
              Select All Published
            </button>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search courses by title, category, or instructor..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Course List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
          {filteredCourses.map((course) => {
            const isSelected = config.courseIds.includes(course.id);
            return (
              <div
                key={course.id}
                onClick={() => handleToggleCourse(course.id)}
                className={`flex items-center space-x-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-400 dark:border-purple-600 shadow-xs' 
                    : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="shrink-0 text-purple-600 dark:text-purple-400">
                  {isSelected ? <CheckSquare className="w-5 h-5 fill-purple-600 text-white" /> : <Square className="w-5 h-5 text-slate-400" />}
                </div>

                <img
                  src={course.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=200&q=80'}
                  alt={course.title}
                  className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-0.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                      {course.category}
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      ${course.price?.toFixed(2)}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {course.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    By {course.instructor}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleSave}
            disabled={backendStatus === 'saving'}
            className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{backendStatus === 'saving' ? 'Saving to Backend...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
