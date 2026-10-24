import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useApp, supportedCurrencies } from '../../context/AppContext';
import { resolveBrandingLogoUrl, DEFAULT_LOGO_URL } from '../../lib/branding';
import { 
  X, 
  BookOpen, 
  GraduationCap, 
  Presentation, 
  ShieldCheck, 
  ChevronDown, 
  ChevronRight, 
  Compass, 
  MessageSquare, 
  Award, 
  Heart, 
  FileText, 
  FolderDown, 
  BarChart2, 
  Users, 
  Megaphone, 
  Plus, 
  LogIn, 
  LogOut, 
  Sun, 
  Moon, 
  ShoppingCart,
  Layers,
  ArrowRight,
  Bell,
  User,
  Sliders,
  Share2,
  HelpCircle,
  Sparkles,
  List,
  ShoppingBag,
  ClipboardCheck,
  Archive,
  FileCheck,
  Wrench
} from 'lucide-react';
import { Course } from '../../types';
import { isDeveloperUser } from '../../lib/developer';

interface MainMultiLevelSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onLogout: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  cartCount: number;
  onOpenCart: () => void;
  courses: Course[];
}

export const MainMultiLevelSidebar: React.FC<MainMultiLevelSidebarProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogout,
  darkMode,
  onToggleDarkMode,
  cartCount,
  onOpenCart,
  courses,
}) => {
  const { logoUrl, categories, setInviteModalOpen, selectedCurrency, setSelectedCurrency } = useApp();
  const navigate = useNavigate();

  // Multi-level collapsible sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    portal: true,
    catalog: true,
    more: true,
  });
  const [myLearningSubmenuOpen, setMyLearningSubmenuOpen] = useState(true);

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
  const isLiveUqDomain = hostname.includes('uqlearn.org');

  const handleNavigate = (path: string) => {
    onClose();
    if (isLiveUqDomain) {
      if (path === '/login/instructor' || path === '/instructor') {
        window.location.href = 'https://instructor.uqlearn.org' + (path === '/login/instructor' ? '/login' : '');
        return;
      }
      if (path === '/login/reviewer' || path === '/reviewer') {
        window.location.href = 'https://rev.uqlearn.org' + (path === '/login/reviewer' ? '/login' : '');
        return;
      }
      if (path === '/login/admin' || path === '/admin') {
        window.location.href = 'https://en.uqlearn.org' + (path === '/login/admin' ? '/login' : '');
        return;
      }
    }
    navigate(path);
  };

  const isInstructor = currentUser?.role === 'instructor';
  const isReviewer = currentUser?.role === 'reviewer' || currentUser?.role === 'course_reviewer';
  const isAdmin = currentUser?.role === 'admin';
  const isStudent = currentUser && !isInstructor && !isReviewer && !isAdmin;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Subtle Dimmed Backdrop with Blur */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Slide-out Sidebar Panel on the Left */}
          <div className="absolute inset-y-0 left-0 max-w-full flex">
            <motion.div 
              initial={{ x: '-100%', opacity: 0.95 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0.95 }}
              transition={{ type: 'spring', damping: 30, stiffness: 320, mass: 0.8 }}
              className="w-84 sm:w-96 bg-white dark:bg-slate-900 shadow-2xl flex flex-col justify-between overflow-y-auto border-r border-slate-200 dark:border-slate-800"
            >
              
              {/* Top Branding & Close Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
                <Link 
                  to="/" 
                  onClick={onClose}
                  className="flex items-center space-x-2.5 group"
                >
                  <img 
                    src={resolveBrandingLogoUrl(logoUrl)} 
                    alt="UQlearn Logo" 
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_LOGO_URL; }}
                    className="w-10 h-10 object-contain rounded-full p-0.5 drop-shadow-xs group-hover:scale-105 transition-transform"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <span className="text-lg font-black tracking-tight select-none">
                      <span className="text-teal-600 dark:text-teal-400">UQ</span>
                      <span className="text-purple-600 dark:text-purple-400">learn</span>
                    </span>
                    <span className="text-[10px] text-slate-400 block font-semibold leading-none">Global Navigation</span>
                  </div>
                </Link>

                <button
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  title="Close navigation"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Welcome Banner if Logged In / Dedicated Login Portals if Logged Out */}
              <div className="p-4 bg-gradient-to-r from-teal-900/10 via-indigo-900/10 to-transparent dark:from-teal-950/40 dark:via-indigo-950/40 border-b border-slate-100 dark:border-slate-800">
                {currentUser ? (
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-xl text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0 ${
                      isInstructor ? 'bg-indigo-600' : isAdmin ? 'bg-rose-600' : 'bg-teal-600'
                    }`}>
                      {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{currentUser.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                      <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        isDeveloperUser(currentUser)
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 ring-1 ring-amber-400/40'
                          : isInstructor 
                          ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300' 
                          : isAdmin 
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                            : 'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300'
                      }`}>
                        {isDeveloperUser(currentUser) ? 'Authorized Developer' : isInstructor ? 'Verified Instructor' : isAdmin ? 'System Administrator' : 'Enrolled Student'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleNavigate('/login')}
                      className="flex-1 py-2 px-3 bg-teal-600 text-white text-xs font-bold rounded-xl text-center hover:bg-teal-500 shadow-xs transition-colors cursor-pointer"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => handleNavigate('/signup')}
                      className="flex-1 py-2 px-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold rounded-xl text-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                    >
                      Sign Up
                    </button>
                  </div>
                )}
              </div>

              {/* Multi-Level Collapsible Navigation Tree */}
              <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                


                {/* 1. ROLE-SPECIFIC EXCLUSIVE SECTION (SHOW INSTRUCTOR ONLY OR STUDENT ONLY) */}
                {isInstructor && (
                  /* INSTRUCTOR STUDIO EXCLUSIVE SECTION */
                  <div className="space-y-1">
                    <button
                      onClick={() => toggleSection('portal')}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl cursor-pointer"
                    >
                      <span className="flex items-center space-x-2">
                        <Presentation className="w-4 h-4 text-indigo-600" />
                        <span>Instructor Studio</span>
                      </span>
                      {openSections.portal ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>

                    {openSections.portal && (
                      <div className="pl-3 py-1 space-y-1 border-l-2 border-indigo-100 dark:border-indigo-900 ml-3">
                        <button
                          onClick={() => handleNavigate('/instructor')}
                          className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-left cursor-pointer transition-colors"
                        >
                          <BarChart2 className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Revenue & Analytics</span>
                        </button>

                        <button
                          onClick={() => handleNavigate('/instructor')}
                          className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-left cursor-pointer transition-colors"
                        >
                          <Users className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Meet Your Students (Progress Tracker)</span>
                        </button>

                        <button
                          onClick={() => handleNavigate('/instructor')}
                          className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-left cursor-pointer transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Student Q&A Resolution Center</span>
                        </button>

                        <button
                          onClick={() => handleNavigate('/instructor')}
                          className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-left cursor-pointer transition-colors"
                        >
                          <Megaphone className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Broadcast Announcements & Chat</span>
                        </button>

                        <button
                          onClick={() => handleNavigate('/instructor')}
                          className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-left cursor-pointer transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Upload New Course Content</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}



                {currentUser && (
                  /* STUDENT LEARNING PORTAL EXCLUSIVE SECTION */
                  <div className="space-y-1">
                    <button
                      onClick={() => toggleSection('portal')}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-black uppercase tracking-wider text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 rounded-xl cursor-pointer"
                    >
                      <span className="flex items-center space-x-2">
                        <GraduationCap className="w-4 h-4 text-teal-600" />
                        <span>Student Learning Portal</span>
                      </span>
                      {openSections.portal ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>

                    {openSections.portal && (
                      <div className="pl-3 py-1 space-y-1 border-l-2 border-teal-100 dark:border-teal-900 ml-3">
                        
                        {/* Nested My Learning section */}
                        <div className="space-y-0.5">
                          <button
                            onClick={() => {
                              setMyLearningSubmenuOpen(!myLearningSubmenuOpen);
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-teal-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-left cursor-pointer transition-colors"
                          >
                            <span className="flex items-center space-x-2.5">
                              <BookOpen className="w-3.5 h-3.5 text-teal-500" />
                              <span>My Learning</span>
                            </span>
                            {myLearningSubmenuOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                          </button>

                          {myLearningSubmenuOpen && (
                            <div className="pl-5 space-y-0.5 border-l border-teal-100 dark:border-teal-900/60 ml-4.5 mt-0.5 mb-1.5">
                              <button
                                onClick={() => handleNavigate('/dashboard?tab=learning&sub=my-lists')}
                                className="w-full flex items-center space-x-2.5 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-md text-left transition-colors cursor-pointer"
                              >
                                <List className="w-3 h-3 text-slate-400" />
                                <span>My Lists</span>
                              </button>
                              <button
                                onClick={() => handleNavigate('/dashboard?tab=learning&sub=purchased')}
                                className="w-full flex items-center space-x-2.5 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-md text-left transition-colors cursor-pointer"
                              >
                                <ShoppingBag className="w-3 h-3 text-slate-400" />
                                <span>Purchased</span>
                              </button>
                              <button
                                onClick={() => handleNavigate('/dashboard?tab=learning&sub=certifications')}
                                className="w-full flex items-center space-x-2.5 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-md text-left transition-colors cursor-pointer"
                              >
                                <Award className="w-3 h-3 text-slate-400" />
                                <span>Accredited Certificates</span>
                              </button>
                              <button
                                onClick={() => handleNavigate('/dashboard?tab=learning&sub=assessments')}
                                className="w-full flex items-center space-x-2.5 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-md text-left transition-colors cursor-pointer"
                              >
                                <ClipboardCheck className="w-3 h-3 text-slate-400" />
                                <span>Assessments</span>
                              </button>
                              <button
                                onClick={() => handleNavigate('/dashboard?tab=learning&sub=new')}
                                className="w-full flex items-center space-x-2.5 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-md text-left transition-colors cursor-pointer"
                              >
                                <Sparkles className="w-3 h-3 text-slate-400" />
                                <span>New</span>
                              </button>
                              <button
                                onClick={() => handleNavigate('/dashboard?tab=learning&sub=archived')}
                                className="w-full flex items-center space-x-2.5 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-md text-left transition-colors cursor-pointer"
                              >
                                <Archive className="w-3 h-3 text-slate-400" />
                                <span>Archived</span>
                              </button>
                              <button
                                onClick={() => handleNavigate('/dashboard?tab=learning&sub=learning-tools')}
                                className="w-full flex items-center space-x-2.5 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-md text-left transition-colors cursor-pointer"
                              >
                                <Wrench className="w-3 h-3 text-slate-400" />
                                <span>Learning Tools</span>
                              </button>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleNavigate('/dashboard?tab=qna')}
                          className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-teal-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-left cursor-pointer transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-teal-500" />
                          <span>Q&A</span>
                        </button>

                        <button
                          onClick={() => handleNavigate('/dashboard?tab=wishlist')}
                          className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-teal-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-left cursor-pointer transition-colors"
                        >
                          <Heart className="w-3.5 h-3.5 text-rose-500" />
                          <span>Wishlist</span>
                        </button>

                        <button
                          onClick={() => handleNavigate('/dashboard?tab=notes')}
                          className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-teal-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-left cursor-pointer transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Notes</span>
                        </button>

                        <button
                          onClick={() => handleNavigate('/dashboard?tab=resources')}
                          className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-teal-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-left cursor-pointer transition-colors"
                        >
                          <FolderDown className="w-3.5 h-3.5 text-amber-500" />
                          <span>Materials</span>
                        </button>

                        <button
                          onClick={() => handleNavigate('/dashboard?tab=notifications')}
                          className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-teal-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-left cursor-pointer transition-colors"
                        >
                          <Bell className="w-3.5 h-3.5 text-cyan-500" />
                          <span>Announcements</span>
                        </button>

                        <button
                          onClick={() => handleNavigate('/dashboard?tab=account')}
                          className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-teal-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-left cursor-pointer transition-colors"
                        >
                          <User className="w-3.5 h-3.5 text-violet-500" />
                          <span>Profile</span>
                        </button>

                        <button
                          onClick={() => handleNavigate('/personalization')}
                          className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 rounded-lg text-left cursor-pointer transition-colors mt-1"
                        >
                          <Sliders className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                          <span>Customize Recommendations</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}



                {/* 2. EXPLORE CATALOG & CATEGORIES (Universal for All Users) */}
                <div className="space-y-1">
                  <button
                    onClick={() => toggleSection('catalog')}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60 rounded-xl cursor-pointer"
                  >
                    <span className="flex items-center space-x-2">
                      <Compass className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      <span>Explore Course Catalog</span>
                    </span>
                    {openSections.catalog ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>

                  {openSections.catalog && (
                    <div className="pl-3 py-1 space-y-1 border-l-2 border-slate-200 dark:border-slate-800 ml-3">
                      {(categories && categories.length > 0 ? categories.filter(c => c.isActive !== false) : [
                        { id: '1', name: 'Development' },
                        { id: '2', name: 'Data Science' },
                        { id: '3', name: 'Design' },
                        { id: '4', name: 'Business' },
                        { id: '5', name: 'Marketing' },
                        { id: '6', name: 'Personal Growth' }
                      ]).map(cat => (
                        <button
                          key={cat.id || cat.name}
                          onClick={() => handleNavigate(`/courses?category=${encodeURIComponent(cat.name)}`)}
                          className="w-full text-left px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                        >
                          {cat.name}
                        </button>
                      ))}
                      <button
                        onClick={() => handleNavigate('/courses')}
                        className="w-full text-left px-3 py-1.5 text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                      >
                        View All {courses.length || 1400}+ Courses →
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. MORE FROM UQLEARN */}
                <div className="space-y-1 mt-4">
                  <button
                    onClick={() => toggleSection('more')}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60 rounded-xl cursor-pointer"
                  >
                    <span className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      <span>More from UQlearn</span>
                    </span>
                    {openSections.more ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>

                  {openSections.more && (
                    <div className="pl-3 py-1 space-y-1 border-l-2 border-slate-200 dark:border-slate-800 ml-3">
                      <button
                        onClick={() => {
                          onClose();
                          setInviteModalOpen(true);
                        }}
                        className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5 text-teal-500" />
                        <span>Invite Friend</span>
                      </button>

                      <button
                        onClick={() => {
                          onClose();
                          alert('Support contact: support@uqlearn.org. Our team is here to help 24/7!');
                        }}
                        className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Support</span>
                      </button>
                    </div>
                  )}
                </div>

              </div>

              {/* Bottom Utility Actions (Logout) */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 space-y-3">
                {currentUser && (
                  <button
                    onClick={() => {
                      onLogout();
                      onClose();
                    }}
                    className="w-full py-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold rounded-xl text-xs flex items-center justify-center space-x-2 cursor-pointer hover:bg-rose-100 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out ({currentUser.name})</span>
                  </button>
                )}
              </div>

            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
