import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  LayoutDashboard,
  GraduationCap,
  BookOpen, 
  Layers,
  BarChart2, 
  TrendingUp,
  Award,
  Star,
  MessageSquare, 
  Megaphone, 
  MessageCircle,
  Inbox,
  Wallet,
  User,
  UserPlus,
  FileCheck,
  Plus, 
  LogOut,
  Sun,
  Moon,
  ExternalLink,
  Settings as Zap,
  PanelLeftClose,
  PanelLeft,
  ChevronDown,
  Sparkles,
  Mail,
  Gift
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ROOT_URL } from '../../lib/apiConfig';
import { resolveBrandingLogoUrl, DEFAULT_LOGO_URL } from '../../lib/branding';

export type InstructorTabKey = 
  // Top-level Dashboard Overview
  | 'dashboard'
  // 1. Course Management (Build & Edit)
  | 'courses'
  | 'sponsored-ads'
  | 'course-builder'
  | 'bulk-upload'
  | 'curriculum'
  | 'drafts-versions'
  // 2. Analytics & Performance (Track & Optimize)
  | 'analytics'
  | 'learner-progress'
  | 'quiz-stats'
  | 'reviews'
  // 3. Communication (Connect & Support)
  | 'announcements'
  | 'direct-messages'
  | 'requests'
  // 4. Settings (Manage Your Account)
  | 'payouts'
  | 'profile'
  | 'compliance'
  | 'terms-of-service'
  | 'request-withdrawal'
  // 5. Pro Features (Optional/Premium)
  | 'co-instructors'
  | 'certificates'
  | 'custom-mail'
  | 'abandoned-cart-emails'
  | 'tiktok-pixel'
  // Aliases for backwards compatibility
  | 'new-course'
  | 'add-course'
  | 'messages'
  | 'module-editor'
  | 'lesson-editor'
  | 'learners'
  | 'qna'
  | 'pricing-coupons'
  | 'dropoff-points'
  | 'live-sessions'
  | 'export-reports'
  | 'ai-suggestions'
  | 'request-withdrawal';

interface InstructorSidebarProps {
  activeTab: InstructorTabKey;
  onSelectTab: (tab: InstructorTabKey) => void;
  coursesCount: number;
  currentUser: any;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const InstructorSidebar: React.FC<InstructorSidebarProps> = ({
  activeTab,
  onSelectTab,
  coursesCount,
  currentUser,
  isCollapsed,
  onToggleCollapse,
  darkMode,
  onToggleDarkMode,
  onLogout,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const { logoUrl, setInviteModalOpen } = useApp();
  const navigate = useNavigate();

  // Hover state to expand collapsed sidebar on desktop hover
  const [isHovered, setIsHovered] = useState(false);

  // Accordion state for categories
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    courseManagement: true,
    analytics: false,
    communication: false,
    settings: false,
    integrations: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleTabClick = (tab: InstructorTabKey) => {
    onSelectTab(tab);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
  const isInstructorHost = hostname.startsWith('instructor.');
  const isLiveUqDomain = hostname.includes('uqlearn.org');

  const handleSwitchToLearner = () => {
    if (onCloseMobile) onCloseMobile();
    if (isInstructorHost && isLiveUqDomain) {
      window.location.href = `${ROOT_URL}/`;
    } else {
      navigate('/');
    }
  };

  const navigationCategories = [
    {
      id: 'courseManagement',
      label: 'Course Management',
      icon: GraduationCap,
      items: [
        { key: 'courses' as InstructorTabKey, label: 'My Courses', icon: BookOpen },
        { key: 'sponsored-ads' as InstructorTabKey, label: 'Sponsored Ads & Boost', icon: Sparkles },
      ]
    },
    {
      id: 'analytics',
      label: 'Analytics & Progress',
      icon: BarChart2,
      items: [
        { key: 'learner-progress' as InstructorTabKey, label: 'Learner Progress', icon: TrendingUp },
        { key: 'analytics' as InstructorTabKey, label: 'Revenue Dashboard', icon: Wallet },
        { key: 'quiz-stats' as InstructorTabKey, label: 'Quiz Stats', icon: Award },
        { key: 'reviews' as InstructorTabKey, label: 'Review Insights', icon: Star },
      ]
    },
    {
      id: 'communication',
      label: 'Communication',
      icon: MessageSquare,
      items: [
        { key: 'announcements' as InstructorTabKey, label: 'Announcements', icon: Megaphone },
        { key: 'direct-messages' as InstructorTabKey, label: 'Direct Messages', icon: MessageCircle },
        { key: 'requests' as InstructorTabKey, label: 'Requests', icon: Inbox },
      ]
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: User,
      items: [
        { key: 'payouts' as InstructorTabKey, label: 'Payout Settings', icon: Wallet },
        { key: 'profile' as InstructorTabKey, label: 'My Profile', icon: User },
        { key: 'compliance' as InstructorTabKey, label: 'Compliance', icon: FileCheck },
        { key: 'custom-mail' as InstructorTabKey, label: 'Custom Mail', icon: Mail },
      ]
    },
    {
      id: 'integrations',
      label: 'Integrations',
      icon: Zap,
      items: [
        { key: 'tiktok-pixel' as InstructorTabKey, label: 'TikTok Pixel', icon: Sparkles },
      ]
    }
  ];

  // The effective expand state (true if either manually expanded OR hovered on desktop)
  const isExpanded = !isCollapsed || isHovered;

  // Render the base navigation items as icons or full list
  const sidebarContent = (
    <div className="flex flex-col h-full select-none overflow-y-auto custom-scrollbar">
      <div>
        {/* Logo and Collapse Toggle Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/75 dark:bg-slate-950/80 sticky top-0 z-10 backdrop-blur-md h-16">
          <div className="flex items-center space-x-2.5 min-w-0">
            <img 
              src={resolveBrandingLogoUrl(logoUrl)} 
              alt="Logo" 
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_LOGO_URL; }}
              className="w-10 h-10 object-contain rounded-full p-0.5 shrink-0 drop-shadow-xs hover:scale-105 transition-transform"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Collapse Button - Desktop only */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse();
            }}
            className="hidden md:flex p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>

          {/* Close Button - Mobile drawer only */}
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Dashboard overview button */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800">
          <button
            onClick={() => handleTabClick('dashboard')}
            className={`w-full flex items-center px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isExpanded ? 'space-x-2.5 justify-start' : 'justify-center'
            } ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Dashboard"
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            {isExpanded && <span>Dashboard Overview</span>}
          </button>
        </div>

        {/* Categories list */}
        <div className="p-2 space-y-1.5">
          {navigationCategories.map((category) => {
            const isSectionOpen = openSections[category.id] ?? false;
            const CategoryIcon = category.icon;

            // If collapsed, we can show a nice hover tooltip or a simple list of icons directly for quick access
            if (!isExpanded) {
              return (
                <div key={category.id} className="flex flex-col items-center py-1 space-y-1.5">
                  {category.items.map((item, idx) => {
                    const ItemIcon = item.icon;
                    const isItemActive = activeTab === item.key ||
                      (item.key === 'course-builder' && activeTab === 'new-course') ||
                      (item.key === 'announcements' && activeTab === 'messages');

                    return (
                      <button
                        key={`${item.key}-${idx}`}
                        onClick={() => handleTabClick(item.key)}
                        className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                          isItemActive
                            ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                        title={item.label}
                      >
                        <ItemIcon className="w-4 h-4 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              );
            }

            return (
              <div 
                key={category.id}
                className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden"
              >
                {/* Category Header (Accordion trigger) */}
                <button
                  onClick={() => toggleSection(category.id)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <CategoryIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span className="text-[11px] font-black tracking-wider uppercase text-slate-400 dark:text-slate-500 truncate">
                      {category.label}
                    </span>
                  </div>
                  <ChevronDown 
                    className={`w-3 h-3 text-slate-400 transition-transform duration-200 shrink-0 ${
                      isSectionOpen ? 'transform rotate-180' : ''
                    }`} 
                  />
                </button>

                {/* Sub-items (visible when expanded and accordion is open) */}
                {isSectionOpen && (
                  <div className="px-1.5 pb-1.5 space-y-0.5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                    {category.items.map((item, idx) => {
                      const ItemIcon = item.icon;
                      const isItemActive = activeTab === item.key ||
                        (item.key === 'course-builder' && activeTab === 'new-course') ||
                        (item.key === 'announcements' && activeTab === 'messages');

                      return (
                        <button
                          key={`${item.key}-${idx}`}
                          onClick={() => handleTabClick(item.key)}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-all cursor-pointer ${
                            isItemActive
                              ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60 font-medium'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <ItemIcon className={`w-3.5 h-3.5 shrink-0 ${
                              isItemActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                            }`} />
                            <span className="text-xs truncate">
                              {item.label}
                            </span>
                          </div>
                          {item.key === 'courses' && coursesCount > 0 && (
                            <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {coursesCount}
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

          {/* Sign Out Row directly below categories in the scroll flow */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 mt-4">
            <button
              onClick={onLogout}
              className={`w-full flex items-center rounded-xl text-xs font-bold transition-all cursor-pointer p-2.5 bg-rose-50 hover:bg-rose-100/85 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:text-rose-700 ${
                isExpanded ? 'space-x-2.5 px-3' : 'justify-center'
              }`}
              title="Sign Out from Studio"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {isExpanded && <span>Sign Out</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Mobile Persistent Collapsible Icon strip or expanded panel */}
      <div className="md:hidden">
        {/* If fully open as mobile drawer */}
        {isOpenMobile ? (
          <div className="fixed inset-0 z-50 flex">
            {/* Overlay background */}
            <div 
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
              onClick={onCloseMobile}
            />
            {/* The expanded sidebar */}
            <div className="relative flex-1 flex flex-col w-full max-w-[280px] sm:w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-full overflow-hidden">
              {sidebarContent}
            </div>
          </div>
        ) : (
          /* Small persistent mobile icon bar at the left of the screen if desired */
          <div className="fixed top-14 sm:top-16 left-0 bottom-0 z-40 w-16 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between items-center py-3 overflow-y-auto custom-scrollbar md:hidden">
            <div className="flex flex-col items-center space-y-4 w-full">
              <button
                onClick={() => handleTabClick('dashboard')}
                className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500'
                }`}
                title="Dashboard"
              >
                <LayoutDashboard className="w-4 h-4" />
              </button>
              {navigationCategories.map((category) => (
                <div key={category.id} className="flex flex-col items-center space-y-4">
                  {category.items.map((item, idx) => {
                    const ItemIcon = item.icon;
                    const isItemActive = activeTab === item.key ||
                      (item.key === 'course-builder' && activeTab === 'new-course');
                    return (
                      <button
                        key={`${item.key}-${idx}`}
                        onClick={() => handleTabClick(item.key)}
                        className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                          isItemActive ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-850' : 'text-slate-400'
                        }`}
                        title={item.label}
                      >
                        <ItemIcon className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="flex flex-col items-center space-y-4 w-full">
              <button
                onClick={onToggleDarkMode}
                className="p-2.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={onLogout}
                className="p-2.5 text-rose-500 hover:text-rose-700 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Desktop Persistent Sidebar with smooth hover extension */}
      <aside 
        className={`hidden md:block shrink-0 h-screen sticky top-0 z-40 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out ${
          isExpanded ? 'w-72 shadow-lg' : 'w-20'
        }`}
        onMouseEnter={() => { if (isCollapsed) setIsHovered(true); }}
        onMouseLeave={() => setIsHovered(false)}
      >
        {sidebarContent}
      </aside>
    </>
  );
};
