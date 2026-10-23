import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Clock, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  LogOut, 
  ShieldCheck
} from 'lucide-react';

export type ReviewerTab = 'pending' | 'under_review' | 'approved' | 'needs_changes';

interface ReviewerSidebarProps {
  activeTab: ReviewerTab;
  onTabChange: (tab: ReviewerTab) => void;
  pendingCount: number;
  underReviewCount: number;
  approvedCount: number;
  needsChangesCount: number;
  onCloseMobile?: () => void;
  onLogout?: () => void;
}

export const ReviewerSidebar: React.FC<ReviewerSidebarProps> = ({
  activeTab,
  onTabChange,
  pendingCount,
  underReviewCount,
  approvedCount,
  needsChangesCount,
  onCloseMobile,
  onLogout
}) => {
  const { logoutUser } = useApp();

  const handleSelectTab = (tab: ReviewerTab) => {
    onTabChange(tab);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      logoutUser();
    }
  };

  const iconColor = "text-indigo-400";

  const navItems = [
    {
      id: 'pending' as ReviewerTab,
      label: 'Pending Review',
      icon: Clock,
      count: pendingCount,
    },
    {
      id: 'under_review' as ReviewerTab,
      label: 'Under Review',
      icon: FileText,
      count: underReviewCount,
    },
    {
      id: 'approved' as ReviewerTab,
      label: 'Approved',
      icon: CheckCircle2,
      count: approvedCount,
    },
    {
      id: 'needs_changes' as ReviewerTab,
      label: 'Needs Changes',
      icon: AlertTriangle,
      count: needsChangesCount,
    },
  ];

  return (
    <aside className="bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 flex flex-col justify-between h-[calc(100vh-4rem)] sticky top-16 shrink-0 w-64 select-none z-30 shadow-sm">
      <div className="p-4 flex-1 flex flex-col min-h-0">
        
        {/* Header Section */}
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800/80 px-1">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-wide uppercase font-mono">
              Reviewer Portal
            </h3>
            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">
              Auditor Dashboard
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5 flex-1 overflow-y-auto no-scrollbar py-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#151833] text-white shadow-xs border border-indigo-900/40'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-[#151833]/80'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.count > 0 && (
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-lg font-mono font-bold border transition-colors shrink-0 ${
                    isActive 
                      ? 'bg-[#222752] text-indigo-200 border-indigo-700/50' 
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700/60'
                  }`}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Logout */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <LogOut className={`w-4 h-4 ${iconColor}`} />
              <span>Sign Out</span>
            </div>
          </button>
        </div>

      </div>
    </aside>
  );
};
