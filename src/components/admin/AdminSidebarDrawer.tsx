import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { ROOT_URL } from '../../lib/apiConfig';
import { resolveBrandingLogoUrl, DEFAULT_LOGO_URL } from '../../lib/branding';
import { 
  X, 
  ArrowLeft,
  Shield, 
  ShieldCheck, 
  BookOpen, 
  Users, 
  DollarSign, 
  Settings, 
  Activity, 
  GraduationCap, 
  Presentation, 
  LogOut, 
  Sun, 
  Moon,
  CreditCard,
  CloudUpload,
  Terminal,
  Code,
  Layers,
  Layout,
  Tag,
  Mail,
  Inbox,
  Globe,
  Sparkles,
  Megaphone,
  BarChart3,
  ChevronRight,
  Sliders,
  Star,
  Flame,
  Clock
} from 'lucide-react';
import { AdminTabKey } from './AdminNavbar';

interface AdminSidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: AdminTabKey;
  onSelectTab: (tab: AdminTabKey) => void;
  coursesCount: number;
  currentUser: any;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout: () => void;
}

export const AdminSidebarDrawer: React.FC<AdminSidebarDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  coursesCount,
  currentUser,
  darkMode,
  onToggleDarkMode,
  onLogout,
}) => {
  const { logoUrl, categories, instructorNotifications } = useApp();
  const navigate = useNavigate();

  const pendingPriceNoticesCount = (instructorNotifications || []).filter(
    n => n.type === 'price_adjustment' && (!n.status || n.status === 'pending')
  ).length;

  const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
  const isAdminHost = hostname.startsWith('en.') || hostname.startsWith('admin.');
  const isLiveUqDomain = hostname.includes('uqlearn.org');

  // Navigation mode state: 'parent' = Main Menu, 'child' = Sub-Menu
  const [drawerMode, setDrawerMode] = useState<'parent' | 'child'>('parent');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('courses-group');

  // Reset to parent mode whenever drawer opens
  useEffect(() => {
    if (isOpen) {
      setDrawerMode('parent');
    }
  }, [isOpen]);

  const handleTabClick = (tab: AdminTabKey) => {
    onSelectTab(tab);
    onClose();
  };

  const handleSwitchToStudent = () => {
    onClose();
    if (isLiveUqDomain && isAdminHost) {
      window.location.href = `${ROOT_URL}/`;
    } else {
      navigate('/');
    }
  };

  const handleSwitchToInstructor = () => {
    onClose();
    if (isLiveUqDomain) {
      window.location.href = 'https://instructor.uqlearn.org/';
    } else {
      navigate('/instructor');
    }
  };

  // Define Primary Categories (Parent Drawer) & Their Child Items
  const primaryCategories = [
    {
      id: 'overview-group',
      label: 'Overview',
      icon: BarChart3,
      badgeText: null,
      items: [
        { id: 'overview' as AdminTabKey, label: 'Overview & System Analytics', icon: Shield },
        { id: 'requests' as AdminTabKey, label: 'Communication Requests', icon: Inbox },
        { id: 'visitor-tracking' as AdminTabKey, label: 'Visitor Traffic & IP Logs', icon: Activity },
      ]
    },
    {
      id: 'courses-group',
      label: 'Courses',
      icon: BookOpen,
      badgeText: `${coursesCount} Courses`,
      items: [
        { id: 'courses' as AdminTabKey, label: 'Courses', icon: BookOpen, count: coursesCount },
        { id: 'learner-reviews' as AdminTabKey, label: 'Learner Reviews', icon: Star },
        { id: 'reviewers' as AdminTabKey, label: 'Reviewers', icon: ShieldCheck },
        { id: 'assign-courses' as AdminTabKey, label: 'Assign Course', icon: Users },
        { id: 'course-categories' as AdminTabKey, label: 'Course Categories', icon: Layers, count: categories.length },
        { id: 'courses-config' as AdminTabKey, label: 'Global Course Rules', icon: Settings },
        { 
          id: 'price-notices' as AdminTabKey, 
          label: 'Price Adjustment Notices', 
          icon: Tag, 
          badge: pendingPriceNoticesCount > 0 ? `${pendingPriceNoticesCount} Pending` : undefined 
        },
      ]
    },
    {
      id: 'marketing-group',
      label: 'Promotions & Ads',
      icon: Megaphone,
      badgeText: 'NEW',
      items: [
        { id: 'promotion-management' as AdminTabKey, label: 'Promotion Management', icon: Sliders, badgeText: 'NEW' },
        { id: 'promotion-subscribers' as AdminTabKey, label: 'Promotion Subscribers & Campaigns', icon: Users, badgeText: 'Live' },
        { id: 'banner-manager' as AdminTabKey, label: 'Hero Banner Manager', icon: Layout },
        { id: 'top-adverts' as AdminTabKey, label: 'Top Nav Advert Manager', icon: Sparkles },
        { id: 'top-banner-config' as AdminTabKey, label: 'Banner & Countdown Config', icon: Clock },
        { id: 'adverts-manager' as AdminTabKey, label: 'Section Advert Banners', icon: Megaphone },
        { id: 'sponsored-ads' as AdminTabKey, label: 'Sponsored Ads & Products', icon: Tag, badgeText: 'NEW' },
        { id: 'flash-sale' as AdminTabKey, label: 'Flash Sale & Top Selling', icon: Flame, badgeText: 'Live' },
      ]
    },
    {
      id: 'users-group',
      label: 'Users',
      icon: Users,
      badgeText: null,
      items: [
        { id: 'users' as AdminTabKey, label: 'User & Role Management', icon: Users },
        { id: 'compliance' as AdminTabKey, label: 'Instructor Compliance', icon: ShieldCheck },
      ]
    },
    {
      id: 'financial-group',
      label: 'Financials',
      icon: CreditCard,
      badgeText: null,
      items: [
        { id: 'subscriptions' as AdminTabKey, label: 'Transactions & Revenue', icon: CreditCard },
        { id: 'payment-integrations' as AdminTabKey, label: 'Payment Gateways', icon: DollarSign },
        { id: 'payout-countries' as AdminTabKey, label: 'Payout Countries', icon: Globe },
        { id: 'withdrawals' as AdminTabKey, label: 'Instructor Withdrawals', icon: DollarSign },
      ]
    },
    {
      id: 'system-group',
      label: 'System & Email',
      icon: Settings,
      badgeText: null,
      items: [
        { id: 'email-settings' as AdminTabKey, label: 'Email & SMTP Delivery', icon: Mail },
        { id: 'custom-mail-pricing' as AdminTabKey, label: 'Custom Mail Pricing & Plans', icon: Mail },
        { id: 'settings' as AdminTabKey, label: 'System & AI Settings', icon: Settings },
      ]
    },
    {
      id: 'developer-group',
      label: 'Developer',
      icon: Code,
      badgeText: null,
      items: [
        { id: 'php-sync' as AdminTabKey, label: 'PHP Deployment & Sync', icon: CloudUpload },
        { id: 'htaccess-viewer' as AdminTabKey, label: 'View .htaccess File', icon: Terminal },
      ]
    },
    {
      id: 'portals-group',
      label: 'Portal Switcher',
      icon: Globe,
      badgeText: null,
      items: [
        { id: 'switch-student', label: 'Student Marketplace', icon: GraduationCap, action: handleSwitchToStudent },
        { id: 'switch-instructor', label: 'Instructor Studio', icon: Presentation, action: handleSwitchToInstructor },
      ]
    }
  ];

  const currentChildGroup = primaryCategories.find(c => c.id === selectedGroupId) || primaryCategories[1];

  const handleSelectPrimaryCategory = (groupId: string) => {
    setSelectedGroupId(groupId);
    setDrawerMode('child');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden font-sans">
          {/* Backdrop with Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer Container Sliding from the LEFT */}
          <div className="absolute inset-y-0 left-0 max-w-full flex select-none">
            <motion.div
              initial={{ x: '-100%', opacity: 0.95 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0.95 }}
              transition={{ type: 'spring', damping: 30, stiffness: 320, mass: 0.8 }}
              className="w-full max-w-[280px] sm:w-80 bg-slate-900 shadow-2xl flex flex-col h-full border-r border-slate-800 text-white overflow-y-auto custom-scrollbar relative"
            >
              
              {/* DRAWER MODE 1: PARENT DRAWER (Clean Main Category Items) */}
              {drawerMode === 'parent' && (
                <div className="flex flex-col h-full w-full">
                  
                  {/* Top Header */}
                  <div>
                    <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/90 sticky top-0 z-20 backdrop-blur-md">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center p-0.5">
                          <img 
                            src={resolveBrandingLogoUrl(logoUrl)} 
                            alt="Logo" 
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_LOGO_URL; }}
                            className="w-full h-full object-contain drop-shadow-xs hover:scale-105 transition-transform"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={onToggleDarkMode}
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                        >
                          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
                        </button>
                        <button
                          onClick={onClose}
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                          title="Close menu"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Main Categories Navigation List (Clean without subtitles/borders) */}
                    <div className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-80px)] no-scrollbar">
                      {primaryCategories.map((cat) => {
                        const Icon = cat.icon;

                        return (
                          <button
                            key={cat.id}
                            onClick={() => handleSelectPrimaryCategory(cat.id)}
                            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all cursor-pointer group text-left"
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              <Icon className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span className="text-xs font-bold truncate">{cat.label}</span>
                            </div>

                            <div className="flex items-center space-x-2 shrink-0">
                              {cat.badgeText && (
                                <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300">
                                  {cat.badgeText}
                                </span>
                              )}
                              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                            </div>
                          </button>
                        );
                      })}

                      {/* Sign Out Item Placed Directly Below Portal Switcher */}
                      <button
                        onClick={() => {
                          onLogout();
                          onClose();
                        }}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-rose-300 hover:text-rose-200 hover:bg-rose-950/40 transition-all cursor-pointer group text-left mt-2"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <LogOut className="w-4 h-4 text-rose-400 shrink-0" />
                          <span className="text-xs font-bold truncate">Sign Out</span>
                        </div>
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {/* DRAWER MODE 2: CHILD DRAWER (Sub-Menu Items with Back Button <) */}
              {drawerMode === 'child' && (
                <div className="flex flex-col justify-between h-full w-full">
                  
                  {/* Child Drawer Top Header with Back Arrow < */}
                  <div>
                    <div className="p-4 border-b border-slate-800/80 bg-slate-950/90 flex items-center justify-between">
                      <button
                        onClick={() => setDrawerMode('parent')}
                        className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all cursor-pointer"
                        title="Return to Main Menu"
                      >
                        <ArrowLeft className="w-4 h-4 text-emerald-400" />
                        <span>Main Menu</span>
                      </button>

                      <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                        title="Close menu"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Section Active Header */}
                    <div className="p-4 border-b border-slate-800/60 bg-slate-950/40 flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        {React.createElement(currentChildGroup.icon, { className: 'w-4 h-4' })}
                      </div>
                      <h2 className="text-xs font-black text-white uppercase tracking-wider">{currentChildGroup.label}</h2>
                    </div>

                    {/* Child Menu Sub-Items List */}
                    <div className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-180px)] no-scrollbar">
                      {currentChildGroup.items.map((item: any) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;

                        const handleClick = () => {
                          if (item.action) {
                            item.action();
                          } else if (item.id) {
                            handleTabClick(item.id as AdminTabKey);
                          }
                        };

                        return (
                          <button
                            key={item.id}
                            onClick={handleClick}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                              isActive
                                ? 'bg-emerald-600 text-white shadow-md'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                            }`}
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-emerald-400'}`} />
                              <span className="truncate">{item.label}</span>
                            </div>

                            {item.count !== undefined && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                                isActive
                                  ? 'bg-emerald-700/80 text-white'
                                  : 'bg-slate-800 text-slate-300'
                              }`}>
                                {item.count}
                              </span>
                            )}

                            {item.badge && (
                              <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                {item.badge}
                              </span>
                            )}

                            {item.badgeText && (
                              <span className="text-[9px] px-2 py-0.5 rounded-full font-black bg-rose-500 text-white uppercase tracking-wider">
                                {item.badgeText}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Child Drawer Footer: Back Button */}
                  <div className="p-3 border-t border-slate-800/80 bg-slate-950/80">
                    <button
                      onClick={() => setDrawerMode('parent')}
                      className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4 text-emerald-400" />
                      <span>Back to Main Menu</span>
                    </button>
                  </div>

                </div>
              )}

            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
