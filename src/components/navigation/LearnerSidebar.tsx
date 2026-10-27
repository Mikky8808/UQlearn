import React, { useState } from 'react';
import { 
  BookOpen, 
  MessageSquare, 
  Heart, 
  FileText, 
  FolderDown, 
  Award, 
  Bell, 
  User, 
  ChevronDown, 
  ChevronRight, 
  Flame, 
  Clock, 
  PanelLeftClose, 
  PanelLeft,
  Receipt,
  Gift
} from 'lucide-react';
import { Course } from '../../types';
import { useApp } from '../../context/AppContext';

export type LearnerTabKey = 
  | 'learning' 
  | 'qna' 
  | 'wishlist' 
  | 'notes' 
  | 'resources' 
  | 'certificates' 
  | 'notifications' 
  | 'account'
  | 'payments';

interface LearnerSidebarProps {
  activeTab: LearnerTabKey;
  onSelectTab: (tab: LearnerTabKey) => void;
  enrolledCourses: Course[];
  currentUser: any;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const LearnerSidebar: React.FC<LearnerSidebarProps> = ({
  activeTab,
  onSelectTab,
  enrolledCourses,
  currentUser,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { setInviteModalOpen } = useApp();

  // Collapsible section state for multi-level nested accordion
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    learning: true,
    communication: true,
    tools: true,
    credentials: true,
    account: true
  });

  const [isHovered, setIsHovered] = useState(false);

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const learnerName = currentUser?.name || (currentUser?.email ? currentUser.email.split('@')[0] : 'Learner');

  // Multi-level structure
  const menuGroups = [
    {
      id: 'learning',
      label: 'Learning Center',
      icon: BookOpen,
      items: [
        {
          key: 'learning' as LearnerTabKey,
          label: 'My Enrolled Courses',
          icon: BookOpen,
          badge: `${enrolledCourses.length}`,
          description: 'Progress tracker & resume'
        }
      ]
    },
    {
      id: 'communication',
      label: 'Communication & Q&A',
      icon: MessageSquare,
      items: [
        {
          key: 'qna' as LearnerTabKey,
          label: 'Course Q&A & Forums',
          icon: MessageSquare,
          description: 'Ask questions & discuss'
        },
        {
          key: 'notifications' as LearnerTabKey,
          label: 'Instructor Announcements',
          icon: Bell,
          badge: 'New',
          description: 'Updates & office hours'
        }
      ]
    },
    {
      id: 'tools',
      label: 'Study Tools & Library',
      icon: FileText,
      items: [
        {
          key: 'notes' as LearnerTabKey,
          label: 'Timestamped Notes',
          icon: FileText,
          description: 'Exportable lesson notes'
        },
        {
          key: 'resources' as LearnerTabKey,
          label: 'Downloadable Resources',
          icon: FolderDown,
          description: 'PDFs, slides, GitHub repos'
        },
        {
          key: 'wishlist' as LearnerTabKey,
          label: 'Wishlist & Curated Lists',
          icon: Heart,
          description: 'Saved courses & roadmaps'
        }
      ]
    },
    {
      id: 'credentials',
      label: 'Credentials & Rewards',
      icon: Award,
      items: [
        {
          key: 'certificates' as LearnerTabKey,
          label: 'Accredited Certificates',
          icon: Award,
          badge: 'Verified',
          description: 'Verifiable credentials & badges'
        }
      ]
    },
    {
      id: 'account',
      label: 'Profile & Settings',
      icon: User,
      items: [
        {
          key: 'account' as LearnerTabKey,
          label: 'Public Profile & Invoices',
          icon: User,
          description: 'Credits, bio & preferences'
        },
        {
          key: 'payments' as LearnerTabKey,
          label: 'Payment History',
          icon: Receipt,
          description: 'Past transactions & receipts'
        }
      ]
    }
  ];

  // The sidebar is expanded if it is NOT manually collapsed, OR if it's currently hovered on desktop
  const isExpanded = !isCollapsed || isHovered;

  return (
    <aside
      className={`sticky top-14 sm:top-20 h-auto max-h-[calc(100vh-4rem)] md:h-[calc(100vh-6rem)] transition-all duration-300 ease-in-out bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between shrink-0 rounded-2xl overflow-hidden z-30 ${
        isExpanded ? 'w-full md:w-72 shadow-lg' : 'w-16'
      }`}
      onMouseEnter={() => { if (isCollapsed) setIsHovered(true); }}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top Header of Sidebar */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between h-16 shrink-0 bg-slate-50/55 dark:bg-slate-950/20">
        {isExpanded ? (
          <div className="flex items-center space-x-2.5 min-w-0 animate-in fade-in duration-200">
            <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800 flex items-center justify-center font-black text-xs shrink-0">
              {learnerName.charAt(0).toUpperCase()}
            </div>
            <div className="truncate">
              <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">{learnerName}</h4>
              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold flex items-center space-x-1">
                <span>Active Learner</span>
              </span>
            </div>
          </div>
        ) : (
          <div className="mx-auto w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800 flex items-center justify-center font-black text-xs shrink-0">
            {learnerName.charAt(0).toUpperCase()}
          </div>
        )}

        {isExpanded && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Collapse Sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Multi-Level Scrollable Navigation Tree */}
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-3 custom-scrollbar">
        {/* If completely collapsed and not hovered, show a trigger toggle at the very top of menu items */}
        {!isExpanded && (
          <div className="flex justify-center pb-3 border-b border-slate-100 dark:border-slate-800">
            <button
              onClick={onToggleCollapse}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Expand Sidebar"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          </div>
        )}

        {menuGroups.map((group) => {
          const isOpen = openSections[group.id] ?? true;
          const GroupIcon = group.icon;
          const hasActiveChild = group.items.some(item => item.key === activeTab);

          return (
            <div key={group.id} className="space-y-1">
              {/* Parent Accordion Header */}
              {isExpanded ? (
                <button
                  onClick={() => toggleSection(group.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer ${
                    hasActiveChild
                      ? 'text-teal-700 dark:text-teal-400'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <span className="flex items-center space-x-1.5">
                    <GroupIcon className="w-3.5 h-3.5" />
                    <span>{group.label}</span>
                  </span>
                  {isOpen ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                </button>
              ) : (
                <div className="w-full border-t border-slate-100 dark:border-slate-800/80 my-2"></div>
              )}

              {/* Nested Child Items */}
              {(isOpen || !isExpanded) && (
                <div className={`space-y-1.5 ${isExpanded ? 'pl-2' : ''}`}>
                  {group.items.map((item) => {
                    const ItemIcon = item.icon;
                    const isActive = activeTab === item.key;

                    return (
                      <button
                        key={item.key}
                        onClick={() => onSelectTab(item.key)}
                        className={`w-full flex items-center transition-all cursor-pointer rounded-xl ${
                          isExpanded
                            ? 'justify-between px-3 py-2 text-left'
                            : 'justify-center p-2.5'
                        } ${
                          isActive
                            ? 'bg-teal-600 text-white font-bold shadow-sm'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-medium'
                        }`}
                        title={!isExpanded ? `${item.label} - ${item.description}` : undefined}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <ItemIcon
                            className={`w-4 h-4 shrink-0 ${
                              isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'
                            }`}
                          />
                          {isExpanded && (
                            <span className="text-xs truncate">{item.label}</span>
                          )}
                        </div>

                        {isExpanded && item.badge && (
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[9px] font-black shrink-0 ${
                              isActive
                                ? 'bg-teal-700 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-teal-600 dark:text-teal-400'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Study Streak & Quick Info Card */}
      {isExpanded && (
        <div className="p-3 m-3 space-y-2 animate-in fade-in duration-300">
          <button
            type="button"
            onClick={() => setInviteModalOpen(true)}
            className="w-full p-2.5 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-between cursor-pointer group"
          >
            <span className="flex items-center space-x-2">
              <Gift className="w-4 h-4 text-amber-300 group-hover:scale-110 transition-transform" />
              <span>Invite Friends</span>
            </span>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-black">
              Earn XP
            </span>
          </button>


        </div>
      )}
    </aside>
  );
};
