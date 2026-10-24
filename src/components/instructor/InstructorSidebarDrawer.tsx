import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { ROOT_URL } from '../../lib/apiConfig';
import { resolveBrandingLogoUrl, DEFAULT_LOGO_URL } from '../../lib/branding';
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
  FileCheck,
  Plus, 
  LogOut,
  Sun,
  Moon,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  CheckCircle2,
  Mail,
  Image as ImageIcon,
  Settings as Zap,
  Sparkles
} from 'lucide-react';
import { InstructorTabKey } from '../navigation/InstructorSidebar';

interface InstructorSidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: InstructorTabKey;
  onSelectTab: (tab: InstructorTabKey) => void;
  coursesCount: number;
  currentUser: any;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout: () => void;
  complianceStatus?: 'none' | 'pending' | 'approved' | 'rejected';
}

export const InstructorSidebarDrawer: React.FC<InstructorSidebarDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  coursesCount,
  currentUser,
  darkMode,
  onToggleDarkMode,
  onLogout,
  complianceStatus = 'none',
}) => {
  const { logoUrl } = useApp();
  const navigate = useNavigate();

  // Accordion open/close state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    courseManagement: true,
    analytics: true,
    communication: true,
    settings: true,
  });

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleTabClick = (tab: InstructorTabKey) => {
    onClose();
    onSelectTab(tab);
  };

  const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
  const isInstructorHost = hostname.startsWith('instructor.');
  const isLiveUqDomain = hostname.includes('uqlearn.org');

  const handleSwitchToLearner = () => {
    onClose();
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
      id: 'guidelines',
      label: 'Publishing Guidelines',
      icon: BookOpen,
      items: [
        { key: 'image-standards' as any, label: 'Image Quality Standards', icon: ImageIcon, onClick: () => { onClose(); navigate('/course-image-quality-standards'); } }
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={onClose}
          />

          {/* Drawer Panel */}
          <div className="absolute inset-y-0 left-0 max-w-full flex">
            <motion.div
              initial={{ x: '-100%', opacity: 0.95 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0.95 }}
              transition={{ type: 'spring', damping: 30, stiffness: 320, mass: 0.8 }}
              className="w-80 sm:w-90 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between overflow-y-auto"
            >
              <div>
                {/* Top Header */}
                <div className="p-4 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/80">
                  <div className="flex items-center space-x-2.5">
                    <img 
                      src={resolveBrandingLogoUrl(logoUrl)} 
                      alt="UQlearn Logo" 
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_LOGO_URL; }}
                      className="w-9 h-9 object-contain rounded-full p-0.5 drop-shadow-xs"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <span className="text-lg font-black tracking-tight leading-none block">
                        <span className="text-teal-600 dark:text-teal-400">UQ</span>
                        <span className="text-purple-600 dark:text-purple-400">learn</span>
                      </span>
                      <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 block tracking-wider uppercase mt-0.5">
                        Instructor Studio
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={onClose}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Profile Card */}
                <div className="p-4 bg-gradient-to-r from-indigo-50/50 to-purple-50/30 dark:from-indigo-950/20 dark:to-purple-950/10 border-b border-slate-150 dark:border-slate-800">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-black flex items-center justify-center text-sm shadow-md">
                      {(currentUser?.name || 'I').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                        {currentUser?.name || 'Instructor'}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{currentUser?.email || ''}</p>
                      <div className="flex items-center space-x-1.5 mt-1">
                        <span className={`px-1.5 py-0.5 rounded border text-[9px] font-black uppercase tracking-wider ${
                          complianceStatus === 'approved'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900'
                            : complianceStatus === 'pending'
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900'
                            : 'bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-500 border-slate-150 dark:border-slate-800'
                        }`}>
                          {complianceStatus === 'approved' ? 'Verified' : 
                           complianceStatus === 'pending' ? 'Pending' : 
                           'Unverified'}
                        </span>
                        {complianceStatus === 'approved' && (
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Navigation Items */}
                <div className="p-3 space-y-3">
                  {/* Dashboard Overview button */}
                  <button
                    onClick={() => handleTabClick('dashboard')}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                      activeTab === 'dashboard'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Dashboard Overview</span>
                  </button>

                  {/* Navigation categories */}
                  {navigationCategories.map((category) => {
                    const isOpenSection = openSections[category.id] ?? true;
                    const CategoryIcon = category.icon;

                    return (
                      <div 
                        key={category.id}
                        className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden"
                      >
                        <button
                          onClick={() => toggleSection(category.id)}
                          className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <CategoryIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            <span className="text-[10px] font-black tracking-wider uppercase text-slate-400 dark:text-slate-500 truncate">
                              {category.label}
                            </span>
                          </div>
                          {isOpenSection ? (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 transform rotate-180 transition-transform duration-200" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 transition-transform duration-200" />
                          )}
                        </button>

                        {isOpenSection && (
                          <div className="px-1.5 pb-1.5 space-y-0.5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                            {category.items.map((item) => {
                              const ItemIcon = item.icon;
                              const isExternal = (item as any).isExternal;
                              const isItemActive = activeTab === item.key ||
                                (item.key === 'course-builder' && activeTab === 'new-course') ||
                                (item.key === 'announcements' && activeTab === 'messages');

                              if ((item as any).onClick) {
                                return (
                                  <button
                                    key={item.key}
                                    onClick={(item as any).onClick}
                                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-all cursor-pointer text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-850 font-medium"
                                  >
                                    <div className="flex items-center space-x-2.5">
                                      <ItemIcon className="w-3.5 h-3.5 text-indigo-500" />
                                      <span className="text-xs">{item.label}</span>
                                    </div>
                                    <ChevronRight className="w-3 h-3 text-slate-400" />
                                  </button>
                                );
                              }

                              if (isExternal) {
                                return (
                                  <a
                                    key={item.key}
                                    href={(item as any).url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={onClose}
                                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-all cursor-pointer text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-850 font-medium"
                                  >
                                    <div className="flex items-center space-x-2.5">
                                      <ItemIcon className="w-3.5 h-3.5 text-indigo-500" />
                                      <span className="text-xs">{item.label}</span>
                                    </div>
                                    <ExternalLink className="w-3 h-3 text-slate-400" />
                                  </a>
                                );
                              }

                              return (
                                <button
                                  key={item.key}
                                  onClick={() => handleTabClick(item.key)}
                                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-all cursor-pointer ${
                                    isItemActive
                                      ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold'
                                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-850 font-medium'
                                  }`}
                                >
                                  <div className="flex items-center space-x-2.5">
                                    <ItemIcon className={`w-3.5 h-3.5 ${isItemActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                                    <span className="text-xs">{item.label}</span>
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

                  {/* Sign Out Action below categories inside normal scroll flow */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-850 mt-4">
                    <button
                      onClick={() => {
                        onLogout();
                        onClose();
                      }}
                      className="w-full flex items-center justify-center space-x-2.5 p-2.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100/80 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:text-rose-700 cursor-pointer transition-all border border-rose-105/10"
                      title="Sign Out from Studio"
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </div>

            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
