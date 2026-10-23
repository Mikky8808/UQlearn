import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  X, 
  AlertTriangle, 
  BookOpen, 
  Tag, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { AdminTabKey } from './AdminNavbar';

interface AdminActionAlertsDrawerProps {
  pendingCoursesCount: number;
  pendingPriceNoticesCount: number;
  onSelectTab: (tab: AdminTabKey) => void;
}

export const AdminActionAlertsDrawer: React.FC<AdminActionAlertsDrawerProps> = ({
  pendingCoursesCount,
  pendingPriceNoticesCount,
  onSelectTab
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const totalPendingActions = pendingCoursesCount + pendingPriceNoticesCount;

  return (
    <>
      {/* Floating Right-Side Trigger Button (Visible on all Admin pages) */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center space-x-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className={`px-4 py-3 rounded-full shadow-2xl flex items-center space-x-2.5 font-sans transition-all cursor-pointer border ${
            totalPendingActions > 0
              ? 'bg-slate-900 border-amber-500/50 text-white hover:border-amber-400'
              : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
          }`}
          title="Action Alerts Hub"
        >
          <div className="relative flex items-center justify-center">
            <Bell className={`w-5 h-5 ${totalPendingActions > 0 ? 'text-amber-400 animate-bounce' : 'text-slate-400'}`} />
            {totalPendingActions > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center border border-slate-900">
                {totalPendingActions}
              </span>
            )}
          </div>
          <span className="text-xs font-black tracking-wide hidden sm:inline">
            Action Alerts
          </span>
        </motion.button>
      </div>

      {/* Floating Right-Side YouTube-Style Popover Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-20 right-4 sm:right-6 z-50 w-84 sm:w-96 bg-[#181818] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-white font-sans"
          >
            {/* Header (Matching image.png YouTube Mix popover header) */}
            <div className="p-4 bg-[#212121] border-b border-slate-800 flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-black text-white tracking-wide">
                    Action Alerts & Queue Hub
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Action items requiring admin review or response
                </p>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
                title="Close Action Hub"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body List Cards */}
            <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto no-scrollbar">
              
              {/* Card 1: Course Pending Review */}
              <div className="p-4 rounded-2xl bg-[#282828] border border-slate-800 hover:border-amber-500/40 transition-all space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white">
                        {pendingCoursesCount} Course{pendingCoursesCount !== 1 ? 's' : ''} Pending Review
                      </h4>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[9px] font-extrabold uppercase tracking-wider">
                        Action Required
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  These submitted courses are currently hidden from learners and require admin approval before going live in the catalog.
                </p>

                <button
                  onClick={() => {
                    onSelectTab('courses');
                    setIsOpen(false);
                  }}
                  className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <span>Review Courses Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Card 2: Price Adjustment Requests Pending */}
              <div className="p-4 rounded-2xl bg-[#282828] border border-slate-800 hover:border-purple-500/40 transition-all space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
                      <Tag className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white">
                        {pendingPriceNoticesCount} Price Adjustment Request{pendingPriceNoticesCount !== 1 ? 's' : ''} Pending
                      </h4>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[9px] font-extrabold uppercase tracking-wider">
                        Action Sent
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Courses flagged as overpriced have active notification requests dispatched to instructors awaiting response or price updates.
                </p>

                <button
                  onClick={() => {
                    onSelectTab('price-notices');
                    setIsOpen(false);
                  }}
                  className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <span>View Price Adjustment Requests</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Status footer inside popover */}
              {totalPendingActions === 0 && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center space-x-2 text-emerald-400 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>All action queues are clear! No pending tasks.</span>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
