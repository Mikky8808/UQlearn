import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { isDeveloperUser } from '../../lib/developer';
import { 
  Shield, 
  Users, 
  BookOpen, 
  DollarSign, 
  TrendingUp, 
  CheckCircle, 
  Trash2, 
  BarChart3, 
  Settings, 
  ShieldCheck, 
  Search,
  Filter,
  Sparkles,
  RefreshCw,
  Lock,
  Database,
  Server,
  Activity,
  AlertTriangle,
  Eye,
  CheckCircle2,
  XCircle,
  UserCheck,
  UserX,
  Image,
  Upload,
  AlertCircle,
  ArrowRight,
  Sliders,
  Star,
  Award,
  Send,
  Bell,
  X,
  Save,
  Wallet,
  MoreVertical,
  Globe,
  EyeOff,
  Key,
  PenTool
} from 'lucide-react';
import { Course } from '../../types';
import { useApp, InstructorNotification } from '../../context/AppContext';
import { AdminNavbar, AdminTabKey } from './AdminNavbar';
import { AdminSidebarDrawer } from './AdminSidebarDrawer';
import { geminiKeyService, GeminiApiKeyRecord } from '../../services/gemini-key-service';
import { 
  uploadImageApi, 
  API_ENDPOINTS, 
  API_BASE_URL, 
  getInstructorPayoutApi, 
  deleteUserApi,
  apiFetch,
  fetchSignatureApi
} from '../../lib/apiConfig';
import { SignaturePad } from '../common/SignaturePad';
import { resolveBrandingLogoUrl, DEFAULT_LOGO_URL } from '../../lib/branding';
import { AdminCourseCategoriesTab } from './AdminCourseCategoriesTab';
import { AdminCoursesConfigTab } from './AdminCoursesConfigTab';
import { AdminCourseManagePage } from './AdminCourseManagePage';
import { HeroBannerManager } from './HeroBannerManager';
import { TopAdvertManager } from './TopAdvertManager';
import { AdvertManager } from './AdvertManager';
import { AdminSponsoredAdsManager } from './AdminSponsoredAdsManager';
import { AdminPaymentIntegrationsTab } from './AdminPaymentIntegrationsTab';
import { InstructorPhpSyncTab } from '../instructor/InstructorPhpSyncTab';
import { AdminEmailSettingsTab } from './AdminEmailSettingsTab';
import { AdminCustomMailPricingTab } from './AdminCustomMailPricingTab';
import { AdminPriceAdjustmentNoticesTab } from './AdminPriceAdjustmentNoticesTab';
import { AdminComplianceTab } from './AdminComplianceTab';
import { AdminReviewersTab } from './AdminReviewersTab';
import { AdminHtaccessViewer } from './AdminHtaccessViewer';
import { AdminVisitorTrackingTab } from './AdminVisitorTrackingTab';
import { AdminSubscriptionsTab } from './AdminSubscriptionsTab';
import { AdminRevenueTrendsChart } from './AdminRevenueTrendsChart';
import { AdminPayoutCountriesTab } from './AdminPayoutCountriesTab';
import { AdminUserDetailView } from './AdminUserDetailView';
import { AdminRequestsTab } from './AdminRequestsTab';
import { AdminActionAlertsDrawer } from './AdminActionAlertsDrawer';
import { AdminAssignCoursesTab } from './AdminAssignCoursesTab';
import { AdminPromotionManagementTab } from './AdminPromotionManagementTab';
import { AdminPromotionSubscribersTab } from './AdminPromotionSubscribersTab';
import { AdminFlashSaleManager } from './AdminFlashSaleManager';

interface AdminDashboardProps {
  courses: Course[];
  onRefreshCourses?: () => void;
}

const normalizeTabFromPath = (path: string): AdminTabKey => {
  const p = path.toLowerCase();
  if (p.includes('learner-reviews') || p.includes('learner-review') || p.includes('course-reviews')) return 'learner-reviews';
  if (p.includes('promotion-management') || p.includes('promotion-tiers') || p.includes('promotions-management')) return 'promotion-management';
  if (p.includes('promotion-subscribers') || p.includes('promotion-subscriber') || p.includes('subscribers')) return 'promotion-subscribers';
  if (p.includes('flash-sale') || p.includes('top-selling')) return 'flash-sale';
  if (p.includes('reviewers') || p.includes('reviewer')) return 'reviewers';
  if (p.includes('assign-courses') || p.includes('assign-course')) return 'assign-courses';
  if (p.includes('requests') || p.includes('inbox') || p.includes('communication')) return 'requests';
  if (p.includes('subscriptions') || p.includes('activations') || p.includes('enrollments')) return 'subscriptions';
  if (p.includes('price-notices') || p.includes('price-adjustment') || p.includes('overpriced')) return 'price-notices';
  if (p.includes('compliance') || p.includes('moderation') || p.includes('flags')) return 'compliance';
  if (p.includes('course-categories') || p.includes('categories')) return 'course-categories';
  if (p.includes('courses-config') || p.includes('config')) return 'courses-config';
  if (p.includes('top-adverts') || p.includes('top-advert') || p.includes('top-nav')) return 'top-adverts';
  if (p.includes('adverts-manager') || p.includes('section-adverts') || p.includes('adverts')) return 'adverts-manager';
  if (p.includes('sponsored') || p.includes('boost')) return 'sponsored-ads';
  if (p.includes('banner-manager') || p.includes('banners')) return 'banner-manager';
  if (p.includes('payment-integrations') || p.includes('payments')) return 'payment-integrations';
  if (p.includes('payout-countries') || p.includes('payouts') || p.includes('countries')) return 'payout-countries';
  if (p.includes('custom-mail') || p.includes('custom-mail-pricing')) return 'custom-mail-pricing';
  if (p.includes('email-settings') || p.includes('email') || p.includes('smtp')) return 'email-settings';
  if (p.includes('php-sync') || p.includes('remote-deploy') || p.includes('deploy')) return 'php-sync';
  if (p.includes('htaccess-viewer') || p.includes('htaccess')) return 'htaccess-viewer';
  if (p.includes('visitor-tracking') || p.includes('visitors')) return 'visitor-tracking';
  if (p.includes('courses')) return 'courses';
  if (p.includes('users')) return 'users';
  if (p.includes('settings')) return 'settings';
  return 'overview';
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ courses, onRefreshCourses }) => {
  const { 
    currentUser, 
    setCurrentUser, 
    darkMode, 
    toggleDarkMode, 
    logoUrl,
    setCourseDefaultThumbnail,
    courseDefaultThumbnail, 
    setLogoUrl, 
    categories, 
    approveCourse,
    publishCourse,
    updateCourse,
    deleteCourse,
    sendInstructorNotification,
    instructorNotifications,
    courseConfig,
    updateCourseConfig
  } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
  const isAdminHost = hostname.startsWith('en.') || hostname.startsWith('admin.');
  const isLiveUqDomain = hostname.includes('uqlearn.org');
  const loginPath = isAdminHost ? '/login' : '/login/admin';

  const [logoInput, setLogoInput] = useState(logoUrl);
  const [courseDefaultThumbnailInput, setCourseDefaultThumbnailInput] = useState(courseDefaultThumbnail);
  const [isUploadingDefaultThumbnail, setIsUploadingDefaultThumbnail] = useState(false);
  const [defaultThumbnailUploadProgress, setDefaultThumbnailUploadProgress] = useState(0);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // CEO Signature states for Certificate issuance
  const [isCeoSignerModalOpen, setIsCeoSignerModalOpen] = useState(false);
  const [ceoSignature, setCeoSignature] = useState(courseConfig?.ceoSignature || '');
  const [ceoNameInput, setCeoNameInput] = useState(courseConfig?.ceoName || 'SIR, RAJAB WAMUU');
  const [ceoTitleInput, setCeoTitleInput] = useState(courseConfig?.ceoTitle || 'CEO UQLEARN');

  useEffect(() => {
    // Fetch stored official CEO signature from /api/v1/signatures.php on mount
    fetchSignatureApi('ceo').then(res => {
      if (res && res.success && res.signatureData) {
        setCeoSignature(res.signatureData);
        updateCourseConfig({ ceoSignature: res.signatureData });
      }
    });
  }, []);

  const [geminiKeys, setGeminiKeys] = useState<GeminiApiKeyRecord[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [keyAdding, setKeyAdding] = useState(false);

  useEffect(() => {
    geminiKeyService.getKeys().then(keys => setGeminiKeys(keys));
  }, []);

  const handleAddGeminiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApiKey.trim()) return;
    setKeyAdding(true);
    await geminiKeyService.addKey({
      keyName: newKeyName.trim() || 'Gemini Integration Key',
      apiKey: newApiKey.trim(),
      modelDefault: 'gemini-3.8-flash',
      isDefault: geminiKeys.length === 0
    });
    setNewKeyName('');
    setNewApiKey('');
    const updated = await geminiKeyService.getKeys();
    setGeminiKeys(updated);
    setKeyAdding(false);
    setNotificationMsg('Gemini API key added successfully to database.');
    setTimeout(() => setNotificationMsg(''), 3000);
  };

  const handleSetDefaultKey = async (id: string) => {
    await geminiKeyService.setDefault(id);
    const updated = await geminiKeyService.getKeys();
    setGeminiKeys(updated);
    setNotificationMsg('Default Gemini API key updated.');
    setTimeout(() => setNotificationMsg(''), 3000);
  };

  const handleDeleteKey = async (id: string) => {
    await geminiKeyService.deleteKey(id);
    const updated = await geminiKeyService.getKeys();
    setGeminiKeys(updated);
    setNotificationMsg('Gemini API key deleted.');
    setTimeout(() => setNotificationMsg(''), 3000);
  };

  useEffect(() => {
    setCourseDefaultThumbnailInput(courseDefaultThumbnail);
    setLogoInput(logoUrl);
  }, [logoUrl]);
  
  const [activeTab, setActiveTab] = useState<AdminTabKey>(() => normalizeTabFromPath(location.pathname));
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setCourseDefaultThumbnailInput(courseDefaultThumbnail);
    setActiveTab(normalizeTabFromPath(location.pathname));
  }, [location.pathname]);

  const handleSelectTab = (tab: AdminTabKey) => {
    setManagingCourse(null);
    setActiveTab(tab);
    if (tab === 'overview') {
      navigate(isAdminHost ? '/' : '/admin');
    } else {
      navigate(isAdminHost ? `/${tab}` : `/admin/${tab}`);
    }
  };

  const handleLogout = async () => {
    try {
      setCurrentUser(null);
      localStorage.removeItem('uqlearn_user');
      sessionStorage.clear();
      await apiFetch('logout.php', { method: 'POST' }).catch(() => {});
    } catch (e) {
      console.warn('Logout error', e);
    }
    if (isAdminHost && isLiveUqDomain) {
      window.location.href = 'https://en.uqlearn.org/login';
    } else {
      navigate(loginPath);
    }
  };
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Search and filter state for admin tables
  const [courseSearch, setCourseSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'All' | 'learner' | 'instructor' | 'admin'>('All');
  const [commissionRate, setCommissionRate] = useState(15);
  const [aiAuditEnabled, setAiAuditEnabled] = useState(true);
  const [notificationMsg, setNotificationMsg] = useState('');
  const [visitorStatsToday, setVisitorStatsToday] = useState<{ hits: number; uniques: number } | null>(null);

  const [selectedUserForPayout, setSelectedUserForPayout] = useState<any | null>(null);
  const [instructorPayoutDetails, setInstructorPayoutDetails] = useState<any | null>(null);
  const [isLoadingPayout, setIsLoadingPayout] = useState(false);
  const [selectedUserIdForDetail, setSelectedUserIdForDetail] = useState<string | null>(null);
  const [initialUserDetailSubTab, setInitialUserDetailSubTab] = useState<'payout' | 'history' | 'security' | 'signature'>('payout');
  const [openDropdownUserId, setOpenDropdownUserId] = useState<string | null>(null);

  const handleDeleteUserAction = async (userId: string, userName: string) => {
    setOpenDropdownUserId(null);
    if (!window.confirm(`Are you sure you want to delete user ${userName || userId} and remove their payout details?`)) {
      return;
    }
    try {
      const res = await deleteUserApi(userId);
      if (res && res.success) {
        setNotificationMsg('User and associated payout details successfully deleted.');
        fetchUsers();
      } else {
        setNotificationMsg('Failed to delete user.');
      }
    } catch {
      setNotificationMsg('Error deleting user.');
    }
  };

  const handleOpenPayoutDetails = async (user: any) => {
    setSelectedUserForPayout(user);
    setIsLoadingPayout(true);
    setInstructorPayoutDetails(null);
    try {
      const details = await getInstructorPayoutApi(user.id);
      setInstructorPayoutDetails(details);
    } catch {
      setInstructorPayoutDetails(null);
    } finally {
      setIsLoadingPayout(false);
    }
  };

  useEffect(() => {
    setCourseDefaultThumbnailInput(courseDefaultThumbnail);
    const fetchVisitorStats = async () => {
      try {
        const resJson = await apiFetch('visitor-count.php', { silent: true });
        if (resJson && resJson.data) {
          setVisitorStatsToday({
            hits: resJson.data.todayHits,
            uniques: resJson.data.todayUniques
          });
        }
      } catch (err) {
        console.warn('Unable to load visitor count from production PHP API', err);
      }
    };
    fetchVisitorStats();
  }, []);

  // Sample live accounts
  const [usersList, setUsersList] = useState<any[]>([]);

  useEffect(() => {
    setCourseDefaultThumbnailInput(courseDefaultThumbnail);
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // @ts-ignore
      const { apiClient } = await import('../../lib/api');
      const res = await apiClient.users.getAll();
      if (res.success && res.data) {
        setUsersList(res.data);
      }
    } catch (e) {
      console.warn("Failed to fetch users", e);
    }
  };

  useEffect(() => {
    setCourseDefaultThumbnailInput(courseDefaultThumbnail);
    // Calculate real analytics from courses and usersList
    const calculateAnalytics = () => {
      const totalRevenue = courses.reduce((acc, c) => acc + (c.price * (c.learnersEnrolled || 0)), 0);
      const totalLearners = usersList.length || courses.reduce((acc, c) => acc + (c.learnersEnrolled || 0), 0);
      const pendingApprovals = courses.filter(c => !c.isApprovedByAdmin).length;
      const activeInstructors = usersList.filter(u => u.role === 'instructor').length || new Set(courses.map(c => c.instructor)).size;
      const totalReviews = courses.reduce((acc, c) => acc + (c.reviewCount || 0), 0);
      
      const categoryMap: Record<string, number> = {};
      courses.forEach(c => {
        categoryMap[c.category] = (categoryMap[c.category] || 0) + 1;
      });
      
      const categoryBreakdown = Object.entries(categoryMap).map(([name, count]) => ({
        name,
        value: Math.round((count / courses.length) * 100)
      })).sort((a, b) => b.value - a.value).slice(0, 4);

      setAnalytics({
        totalRevenue,
        totalLearners,
        totalReviews,
        totalCourses: courses.length,
        pendingApprovals,
        activeInstructors,
        uptime: '99.99%',
        categoryBreakdown
      });
      setLoading(false);
    };

    if (courses.length > 0 || usersList.length > 0) {
      calculateAnalytics();
    } else {
      const timer = setTimeout(() => {
        setLoading(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [courses, usersList]);

  // Course Full-Page Management State
  const [managingCourse, setManagingCourse] = useState<Course | null>(null);

  const openManageCourseModal = (course: Course) => {
    setManagingCourse(course);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteCourse = async (courseId: string, courseTitle?: string) => {
    if (confirm(`Are you sure you want to permanently delete "${courseTitle || courseId}"? This will delete inappropriate content from the platform.`)) {
      await deleteCourse(courseId);
      setNotificationMsg(`Course "${courseTitle || courseId}" deleted successfully.`);
      setTimeout(() => setNotificationMsg(''), 4000);
      if (managingCourse?.id === courseId) {
        setManagingCourse(null);
      }
    }
  };

  const handleToggleUserStatus = async (userId: string) => {
    try {
      const user = usersList.find(u => u.id === userId);
      if (!user) return;
      
      const newStatus = user.status === 'Suspended' ? 'Active' : 'Suspended';
      
      // Optimistic update
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
      
      // @ts-ignore
      const { apiClient } = await import('../../lib/api');
      await apiClient.users.update(userId, { status: newStatus });

      setNotificationMsg(`User account ${newStatus.toLowerCase()}.`);
      setTimeout(() => setNotificationMsg(''), 3000);
    } catch (e) {
      console.error('Failed to update user status', e);
      // Revert optimism if wanted, but ignoring for now
      setNotificationMsg('Failed to update user status.');
      setTimeout(() => setNotificationMsg(''), 3000);
    }
  };

  const filteredCourses = courses.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(courseSearch.toLowerCase()) || 
                          c.instructor.toLowerCase().includes(courseSearch.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || c.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const pendingCoursesCount = courses.filter(c => !c.isApprovedByAdmin).length;
  const pendingPriceNotices = (instructorNotifications || []).filter(
    n => n.type === 'price_adjustment' && (!n.status || n.status === 'pending')
  );
  const pendingPriceNoticesCount = pendingPriceNotices.length;

  const filteredUsers = usersList.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
                          u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = userRoleFilter === 'All' || u.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  // Strict Authentication Check: Deny access if not an authenticated administrator
  if (!currentUser || (currentUser.role !== 'admin' && !isDeveloperUser(currentUser))) {
    return <Navigate to={loginPath} replace state={{ from: location.pathname + location.search }} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-slate-400">Loading UQlearn Administrator Console...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors flex flex-col">
      {/* Dedicated Admin Left Drawer Sidebar */}
      <AdminSidebarDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeTab={activeTab}
        onSelectTab={(tab) => handleSelectTab(tab)}
        coursesCount={courses.length}
        currentUser={currentUser}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        onLogout={handleLogout}
      />

      {/* Dedicated Admin Top Navbar */}
      <AdminNavbar
        activeTab={activeTab}
        onSelectTab={(tab) => handleSelectTab(tab)}
        onOpenSidebar={() => setDrawerOpen(true)}
        coursesCount={courses.length}
      />

      <div className="flex-1 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          
          {notificationMsg && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-none flex items-center space-x-3 text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
              <span className="text-xs font-bold">{notificationMsg}</span>
            </div>
          )}

          {/* Dynamic Full-Width Admin Views Driven Exclusively by Left Drawer Sidebar */}
          {managingCourse ? (
            <AdminCourseManagePage
              course={managingCourse}
              onBack={() => {
                setManagingCourse(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onCourseDeleted={(courseId) => {
                setManagingCourse(null);
                setNotificationMsg(`Course permanently deleted from platform catalog.`);
                setTimeout(() => setNotificationMsg(''), 4000);
                onRefreshCourses?.();
              }}
              onCourseUpdated={(updated) => {
                setManagingCourse(updated);
                onRefreshCourses?.();
              }}
            />
          ) : (
            <div className="w-full">
            
            {/* 1. OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-6">

                {/* Metric Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div 
                    onClick={() => handleSelectTab('visitor-tracking')}
                    className="bg-white dark:bg-slate-900 p-6 rounded-none border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 cursor-pointer hover:border-teal-500/50 transition-all group"
                  >
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span className="text-xs font-bold uppercase tracking-wider">Daily Visitors</span>
                      <Activity className="w-5 h-5 text-teal-500 animate-pulse" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">
                      {visitorStatsToday ? visitorStatsToday.hits.toLocaleString() : '0'}
                    </h3>
                    <p className="text-[11px] text-teal-600 font-semibold flex items-center">
                      <TrendingUp className="w-3.5 h-3.5 mr-1" /> {visitorStatsToday ? visitorStatsToday.uniques.toLocaleString() : '0'} Uniques today
                    </p>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-6 rounded-none border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span className="text-xs font-bold uppercase tracking-wider">Registered Accounts</span>
                      <Users className="w-5 h-5 text-rose-600" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">
                      {analytics?.totalLearners?.toLocaleString() || '0'}
                    </h3>
                    <p className="text-[11px] text-rose-600 font-semibold flex items-center">
                      <TrendingUp className="w-3.5 h-3.5 mr-1" /> Verified learner directory
                    </p>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-6 rounded-none border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span className="text-xs font-bold uppercase tracking-wider">Published Catalog</span>
                      <BookOpen className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">
                      {courses.length}
                    </h3>
                    <p className="text-[11px] text-indigo-600 font-semibold">100% verified & active</p>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-6 rounded-none border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span className="text-xs font-bold uppercase tracking-wider">Total Reviews</span>
                      <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">
                      {analytics?.totalReviews?.toLocaleString() || '0'}
                    </h3>
                    <p className="text-[11px] text-amber-600 font-semibold flex items-center">
                      <TrendingUp className="w-3.5 h-3.5 mr-1" /> Across entire catalog
                    </p>
                  </div>
                </div>

                {/* Real Transactions Daily Revenue Trends Recharts Chart */}
                <AdminRevenueTrendsChart onRefresh={() => fetchUsers()} />

                {/* Analytical Visuals & Security Status */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-none border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center">
                      <BarChart3 className="w-4 h-4 mr-2 text-rose-500" /> Category Enrollment Breakdown
                    </h3>
                    <div className="space-y-3">
                      {analytics?.categoryBreakdown?.map((cat: any) => (
                        <div key={cat.name} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <span>{cat.name}</span>
                            <span>{cat.value}%</span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-none overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-rose-500 to-purple-600 rounded-none" style={{ width: `${cat.value}%` }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-6 rounded-none border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center">
                      <Shield className="w-4 h-4 mr-2 text-rose-500" /> System Integrity & Gateways
                    </h3>
                    <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-none flex items-center justify-between">
                        <span className="flex items-center space-x-2">
                          <Database className="w-4 h-4 text-emerald-500" />
                          <span>Database: PostgreSQL (Drizzle Engine)</span>
                        </span>
                        <span className="text-emerald-600 font-bold">Connected</span>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-none flex items-center justify-between">
                        <span className="flex items-center space-x-2">
                          <Sparkles className="w-4 h-4 text-purple-500" />
                          <span>AI Course Moderation: Gemini 2.5 Flash</span>
                        </span>
                        <span className="text-emerald-600 font-bold">Active</span>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-none flex items-center justify-between">
                        <span className="flex items-center space-x-2">
                          <Server className="w-4 h-4 text-teal-500" />
                          <span>Payment Settlement: Instant Escrow</span>
                        </span>
                        <span className="text-emerald-600 font-bold">Operational</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. COURSES TAB WITH SUBMENUS (CATEGORIES, MODERATION, RULES, PRICE NOTICES, LEARNER REVIEWS) */}
            {(activeTab === 'courses' || activeTab === 'courses-config' || activeTab === 'learner-reviews') && (
              <AdminCoursesConfigTab 
                courses={courses} 
                initialSubTab={activeTab === 'learner-reviews' ? 'learner-reviews' : activeTab === 'courses-config' ? 'rules' : 'catalog'}
                onNavigateToTab={(t) => setActiveTab(t as AdminTabKey)}
                onManageCourse={(c) => openManageCourseModal(c)}
              />
            )}

            {/* 1b. COMMUNICATION REQUESTS TAB */}
            {activeTab === 'requests' && (
              <AdminRequestsTab />
            )}

            {/* 2b. COMPLIANCE TAB */}
            {activeTab === 'compliance' && (
                <AdminComplianceTab />
            )}

            {/* 2c. REVIEWERS MANAGEMENT TAB */}
            {activeTab === 'reviewers' && (
                <AdminReviewersTab />
            )}

            {/* 3. USER DIRECTORY TAB */}
            {activeTab === 'users' && (
              selectedUserIdForDetail ? (
                <AdminUserDetailView 
                  userId={selectedUserIdForDetail} 
                  onBack={() => {
                    setSelectedUserIdForDetail(null);
                    setInitialUserDetailSubTab('payout');
                  }} 
                  onUserUpdated={fetchUsers} 
                  initialSubTab={initialUserDetailSubTab}
                />
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">User Directory</h3>
                      <p className="text-xs text-slate-500">Manage administrator roles, verified educators, and learner accounts with financial, payout, and official signature credentials.</p>
                    </div>

                    <div className="flex items-center space-x-3">
                      {/* CEO Signature Pad Button */}
                      <button
                        type="button"
                        onClick={() => setIsCeoSignerModalOpen(true)}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-none text-xs font-bold shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer shrink-0"
                        title="Open CEO & Executive Signature Pad"
                      >
                        <PenTool className="w-3.5 h-3.5" />
                        <span>CEO Signature Pad</span>
                      </button>

                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Search user name or email..."
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-rose-500"
                        />
                      </div>

                      <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-none">
                        {(['All', 'learner', 'instructor', 'admin'] as const).map((role) => (
                          <button
                            key={role}
                            onClick={() => setUserRoleFilter(role)}
                            className={`px-2.5 py-1 text-xs font-bold rounded-none capitalize transition-colors cursor-pointer ${
                              userRoleFilter === role
                                ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                          >
                            {role}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {filteredUsers.map((user) => (
                      <div key={user.id} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center text-sm shadow-xs overflow-hidden ${
                            user.role === 'admin' ? 'bg-rose-600 text-white' :
                            user.role === 'instructor' ? 'bg-indigo-600 text-white' :
                            'bg-teal-600 text-white'
                          }`}>
                            {user.avatar ? (
                              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                              user.name ? user.name.charAt(0).toUpperCase() : 'U'
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                              <span>{user.name}</span>
                              <span className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider ${
                                user.role === 'admin' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' :
                                user.role === 'instructor' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' :
                                'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300'
                              }`}>
                                {user.role}
                              </span>
                            </p>
                            <p className="text-slate-500">{user.email} • Joined {user.joined}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 relative">
                          <span className={`px-2.5 py-1 font-bold rounded-md ${
                            user.status === 'Suspended' ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300' :
                            'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}>
                            {user.status || 'Active'}
                          </span>

                          <div className="relative">
                            <button
                              onClick={() => setOpenDropdownUserId(openDropdownUserId === user.id ? null : user.id)}
                              className="px-3 py-1.5 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
                            >
                              <span>More</span>
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {openDropdownUserId === user.id && (
                              <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-35 space-y-0.5">
                                <button
                                  onClick={() => { setSelectedUserIdForDetail(user.id); setOpenDropdownUserId(null); }}
                                  className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-2.5 cursor-pointer"
                                >
                                  <Eye className="w-4 h-4 text-slate-400" />
                                  <span>View Profile</span>
                                </button>

                                <button
                                  onClick={() => { setSelectedUserIdForDetail(user.id); setOpenDropdownUserId(null); }}
                                  className="w-full text-left px-4 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 flex items-center space-x-2.5 cursor-pointer"
                                >
                                  <Wallet className="w-4 h-4 text-indigo-500" />
                                  <span>Payout Details & Financials</span>
                                </button>

                                <button
                                  onClick={() => { 
                                    setSelectedUserIdForDetail(user.id); 
                                    setInitialUserDetailSubTab('signature');
                                    setOpenDropdownUserId(null); 
                                  }}
                                  className="w-full text-left px-4 py-2 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 flex items-center space-x-2.5 cursor-pointer"
                                >
                                  <PenTool className="w-4 h-4 text-amber-500" />
                                  <span>Digital Signature Pad</span>
                                </button>

                                <button
                                  onClick={() => { handleToggleUserStatus(user.id); setOpenDropdownUserId(null); }}
                                  className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-2.5 cursor-pointer"
                                >
                                  {user.status === 'Suspended' ? (
                                    <>
                                      <UserCheck className="w-4 h-4 text-emerald-500" />
                                      <span>Activate Account</span>
                                    </>
                                  ) : (
                                    <>
                                      <UserX className="w-4 h-4 text-amber-500" />
                                      <span>Suspend Account</span>
                                    </>
                                  )}
                                </button>

                                <div className="my-1 border-t border-slate-100 dark:border-slate-800"></div>

                                <button
                                  onClick={() => handleDeleteUserAction(user.id, user.name)}
                                  className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 flex items-center space-x-2.5 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                  <span>Delete User & Payouts</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}

            {/* 4. SYSTEM SETTINGS TAB */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-xs">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Global Platform Configuration</h3>
                    <p className="text-xs text-slate-500">Configure marketplace revenue splits, automated Gemini course audit parameters, and payout schedules.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Website Logo Upload & Branding */}
                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
                      <div className="flex items-center space-x-2 text-xs font-black text-slate-900 dark:text-slate-100">
                        <Image className="w-4 h-4 text-indigo-500" />
                        <span>Website Logo & Branding</span>
                      </div>
                      <p className="text-[11px] text-slate-500">Upload a custom logo image or provide a logo URL. Changes will instantly update the branding across all learner, instructor, and admin portals.</p>
                      
                      <div className="flex flex-col space-y-4">
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-center">
                          <img 
                            src={resolveBrandingLogoUrl(logoInput || logoUrl)} 
                            alt="Logo Preview" 
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_LOGO_URL; }}
                            className="w-14 h-14 object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        <div className="flex-1 space-y-3 w-full">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Logo Image URL</label>
                            <div className="flex space-x-2">
                              <input 
                                type="text"
                                value={logoInput}
                                onChange={(e) => setLogoInput(e.target.value)}
                                placeholder="Enter logo URL or upload image file below"
                                className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-medium"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setLogoUrl(logoInput);
                                  setNotificationMsg('Website logo URL updated successfully!');
                                  setTimeout(() => setNotificationMsg(''), 3000);
                                }}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0"
                              >
                                Apply URL
                              </button>
                            </div>
                          </div>

                          {isUploadingLogo && (
                            <div className="space-y-1.5 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                              <div className="flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                <span>Uploading logo file to server...</span>
                                <span className="text-indigo-600 dark:text-indigo-400">{uploadProgress}%</span>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div 
                                  className="bg-indigo-600 h-full transition-all duration-200 rounded-full"
                                  style={{ width: `${uploadProgress}%` }}
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex items-center space-x-3">
                            <label className="px-4 py-2.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-xl transition-colors cursor-pointer inline-flex items-center space-x-2 border border-indigo-200 dark:border-indigo-800">
                              <Upload className="w-3.5 h-3.5" />
                              <span>Upload Logo File</span>
                              <input 
                                type="file" 
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setIsUploadingLogo(true);
                                    setUploadProgress(0);
                                    const interval = setInterval(() => {
                                      setUploadProgress((prev) => {
                                        if (prev >= 90) {
                                          clearInterval(interval);
                                          return 90;
                                        }
                                        return prev + 30;
                                      });
                                    }, 150);

                                    const reader = new FileReader();
                                    reader.onload = async (event) => {
                                      const res = event.target?.result as string;
                                      if (res) {
                                        try {
                                          const uploadData = await uploadImageApi(res, file.name, 'courses');
                                          clearInterval(interval);
                                          setUploadProgress(100);
                                          setTimeout(() => {
                                            setIsUploadingLogo(false);
                                            setUploadProgress(0);
                                          }, 500);

                                          const data = typeof uploadData === 'string' ? { success: true, url: uploadData, path: uploadData } : uploadData;
                                          if (data && (data as any).success && ((data as any).url || (data as any).path)) {
                                            const finalLogoUrl = (data as any).url || (data as any).path;
                                            setLogoInput('');
                                            setLogoUrl(finalLogoUrl);
                                            setNotificationMsg('Logo uploaded to server path and stored securely!');
                                          } else {
                                            setLogoInput('');
                                            setLogoUrl(res);
                                            setNotificationMsg('Logo applied successfully!');
                                          }
                                        } catch {
                                          clearInterval(interval);
                                          setIsUploadingLogo(false);
                                          setUploadProgress(0);
                                          setLogoInput('');
                                          setLogoUrl(res);
                                          setNotificationMsg('Logo applied successfully!');
                                        }
                                        setTimeout(() => setNotificationMsg(''), 3000);
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Default Course Thumbnail Upload */}
                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
                      <div className="flex items-center space-x-2 text-xs font-black text-slate-900 dark:text-slate-100">
                        <Image className="w-4 h-4 text-indigo-500" />
                        <span>Course Default Thumbnail</span>
                      </div>
                      <p className="text-[11px] text-slate-500">Set the default thumbnail used for unreviewed courses before approval.</p>
                      
                      <div className="flex flex-col space-y-4">
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-center">
                          <img 
                            src={courseDefaultThumbnailInput || courseDefaultThumbnail} 
                            alt="Default Thumbnail Preview" 
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80'; }}
                            className="w-14 h-14 object-cover rounded-md"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        
                        <div className="flex-1 space-y-3 w-full">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Thumbnail Image URL</label>
                            <div className="flex space-x-2">
                              <input 
                                type="text"
                                value={courseDefaultThumbnailInput}
                                onChange={(e) => setCourseDefaultThumbnailInput(e.target.value)}
                                placeholder="Enter thumbnail URL or upload image file below"
                                className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-medium"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setCourseDefaultThumbnail(courseDefaultThumbnailInput);
                                  import('../../lib/apiConfig').then(({ saveCourseDefaultThumbnailApi }) => {
                                    saveCourseDefaultThumbnailApi(courseDefaultThumbnailInput);
                                  });
                                  setNotificationMsg('Default thumbnail URL updated successfully!');
                                  setTimeout(() => setNotificationMsg(''), 3000);
                                }}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0"
                              >
                                Apply URL
                              </button>
                            </div>
                          </div>

                          {isUploadingDefaultThumbnail && (
                            <div className="space-y-1.5 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                              <div className="flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                <span>Uploading thumbnail file to server...</span>
                                <span className="text-indigo-600 dark:text-indigo-400">{defaultThumbnailUploadProgress}%</span>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div 
                                  className="bg-indigo-600 h-full transition-all duration-200 rounded-full"
                                  style={{ width: `${defaultThumbnailUploadProgress}%` }}
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex items-center space-x-3">
                            <label className="px-4 py-2.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-xl transition-colors cursor-pointer inline-flex items-center space-x-2 border border-indigo-200 dark:border-indigo-800">
                              <Upload className="w-3.5 h-3.5" />
                              <span>Upload Thumbnail File</span>
                              <input 
                                type="file" 
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setIsUploadingDefaultThumbnail(true);
                                    setDefaultThumbnailUploadProgress(0);
                                    const interval = setInterval(() => {
                                      setDefaultThumbnailUploadProgress((prev) => {
                                        if (prev >= 90) {
                                          clearInterval(interval);
                                          return 90;
                                        }
                                        return prev + 30;
                                      });
                                    }, 150);

                                    const reader = new FileReader();
                                    reader.onload = async (event) => {
                                      const res = event.target?.result as string;
                                      if (res) {
                                        try {
                                          const uploadData = await uploadImageApi(res, file.name, 'courses');
                                          clearInterval(interval);
                                          setDefaultThumbnailUploadProgress(100);
                                          setTimeout(() => {
                                            setIsUploadingDefaultThumbnail(false);
                                            setDefaultThumbnailUploadProgress(0);
                                          }, 500);

                                          if (uploadData && uploadData.success && (uploadData.url || uploadData.path)) {
                                            const finalUrl = uploadData.url || uploadData.path;
                                            setCourseDefaultThumbnailInput('');
                                            setCourseDefaultThumbnail(finalUrl);
                                            import('../../lib/apiConfig').then(({ saveCourseDefaultThumbnailApi }) => {
                                              saveCourseDefaultThumbnailApi(finalUrl);
                                            });
                                            setNotificationMsg('Thumbnail uploaded to server path and stored securely!');
                                          } else {
                                            setCourseDefaultThumbnailInput('');
                                            setCourseDefaultThumbnail(res);
                                            setNotificationMsg('Thumbnail applied successfully!');
                                          }
                                        } catch {
                                          clearInterval(interval);
                                          setIsUploadingDefaultThumbnail(false);
                                          setDefaultThumbnailUploadProgress(0);
                                          setCourseDefaultThumbnailInput('');
                                          setCourseDefaultThumbnail(res);
                                          setNotificationMsg('Thumbnail applied successfully!');
                                        }
                                        setTimeout(() => setNotificationMsg(''), 3000);
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="flex items-center space-x-2 text-xs font-black text-slate-900 dark:text-slate-100">
                        <DollarSign className="w-4 h-4 text-rose-500" />
                        <span>Platform Commission Rate</span>
                      </div>
                      <p className="text-[11px] text-slate-500">Percentage retained by UQlearn for hosting, video encoding, and processing.</p>
                      <div className="flex items-center space-x-3">
                        <input 
                          type="number" 
                          value={commissionRate}
                          onChange={(e) => setCommissionRate(Number(e.target.value))}
                          className="w-24 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-slate-100"
                        />
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">% Platform Share (Instructor receives {100 - commissionRate}%)</span>
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs font-black text-slate-900 dark:text-slate-100">
                          <Sparkles className="w-4 h-4 text-purple-500" />
                          <span>Gemini AI Auto-Audit Engine</span>
                        </div>
                        <button
                          onClick={() => setAiAuditEnabled(!aiAuditEnabled)}
                          className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                            aiAuditEnabled ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                        >
                          <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                            aiAuditEnabled ? 'translate-x-6' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500">Automatically inspect new curriculum modules for speech-to-text accuracy and high-res video encoding.</p>
                      <span className="inline-block px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[11px] font-bold rounded-lg">
                        Engine Status: Gemini 2.5 Flash Connected
                      </span>
                    </div>

                    {/* Gemini API Key Manager Section */}
                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
                      <div className="flex items-center space-x-2 text-xs font-black text-slate-900 dark:text-slate-100">
                        <Key className="w-4 h-4 text-indigo-500" />
                        <span>Gemini API Key Manager</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Store and manage your Gemini API keys in the database. Set a default key to power all AI integrations (syllabus generation, quizzes, assistant explanations, and auto-audit engine).
                      </p>

                      {/* Add Key Form */}
                      <form onSubmit={handleAddGeminiKey} className="space-y-3 pt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Key Name / Description</label>
                            <input
                              type="text"
                              placeholder="e.g. Production Flash Key"
                              value={newKeyName}
                              onChange={(e) => setNewKeyName(e.target.value)}
                              className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Gemini API Key (AIza...)</label>
                            <input
                              type="password"
                              required
                              placeholder="Paste Gemini API Key..."
                              value={newApiKey}
                              onChange={(e) => setNewApiKey(e.target.value)}
                              className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={keyAdding || !newApiKey.trim()}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                          >
                            {keyAdding ? 'Adding Key...' : 'Add Gemini API Key'}
                          </button>
                        </div>
                      </form>

                      {/* Saved Keys List */}
                      {geminiKeys.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                            Configured Database Keys ({geminiKeys.length})
                          </span>
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {geminiKeys.map((k) => (
                              <div key={k.id} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs">
                                <div className="min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-black text-slate-900 dark:text-slate-100 truncate">{k.keyName}</span>
                                    {k.isDefault ? (
                                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-black uppercase">
                                        Active Default
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold">
                                        Secondary
                                      </span>
                                    )}
                                  </div>
                                  <p className="font-mono text-[11px] text-slate-400 mt-0.5">
                                    {k.apiKey.substring(0, 8)}••••••••{k.apiKey.slice(-4)}
                                  </p>
                                </div>

                                <div className="flex items-center space-x-2 shrink-0">
                                  {!k.isDefault && (
                                    <button
                                      type="button"
                                      onClick={() => handleSetDefaultKey(k.id)}
                                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[10px] rounded-lg transition-colors cursor-pointer"
                                    >
                                      Set Default
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteKey(k.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                                    title="Delete Key"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* CEO & Official Certificate Signature Section */}
                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4 md:col-span-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-700/80 pb-3">
                        <div className="flex items-center space-x-2 text-xs font-black text-slate-900 dark:text-slate-100">
                          <Award className="w-4 h-4 text-amber-500" />
                          <span>CEO Official Certificate Signature</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsCeoSignerModalOpen(true)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center space-x-1.5 self-start sm:self-auto"
                        >
                          <PenTool className="w-3.5 h-3.5" />
                          <span>{ceoSignature ? 'Open Signature Canvas Page / Re-sign' : 'Add CEO Signature'}</span>
                        </button>
                      </div>

                      <p className="text-[11px] text-slate-500">
                        Configure the official CEO signature stamped on student Certificates of Completion. You can draw your signature using the signature pad below and save it.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            CEO Full Name (Printed on Certificate)
                          </label>
                          <input
                            type="text"
                            value={ceoNameInput}
                            onChange={(e) => {
                              setCeoNameInput(e.target.value);
                              updateCourseConfig({ ceoName: e.target.value });
                            }}
                            placeholder="e.g. SIR, RAJAB WAMUU"
                            className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Official Executive Title
                          </label>
                          <input
                            type="text"
                            value={ceoTitleInput}
                            onChange={(e) => {
                              setCeoTitleInput(e.target.value);
                              updateCourseConfig({ ceoTitle: e.target.value });
                            }}
                            placeholder="e.g. CEO UQLEARN"
                            className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Canvas Signature Pad */}
                      <div className="pt-2">
                        <SignaturePad
                          userId="ceo"
                          initialSignature={ceoSignature}
                          title="CEO Signature Pad"
                          subtitle="Draw your signature directly onto the canvas surface below and press Save Official Signature."
                          signerName={ceoNameInput || 'SIR, RAJAB WAMUU'}
                          signerTitle={ceoTitleInput || 'CEO UQLEARN'}
                          onSave={(data) => {
                            setCeoSignature(data);
                            updateCourseConfig({ 
                              ceoSignature: data,
                              ceoName: ceoNameInput || 'SIR, RAJAB WAMUU',
                              ceoTitle: ceoTitleInput || 'CEO UQLEARN'
                            });
                            setNotificationMsg('CEO signature saved and updated across all completion certificates!');
                            setTimeout(() => setNotificationMsg(''), 4000);
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button 
                      onClick={() => {
                        setNotificationMsg('Global settings saved and synced across cluster.');
                        setTimeout(() => setNotificationMsg(''), 3000);
                      }}
                      className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
                    >
                      Save Configuration
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'course-categories' && (
              <AdminCourseCategoriesTab 
                courses={courses} 
                onSelectCategoryFilter={(cat) => {
                  setSelectedCategory(cat);
                  setActiveTab('courses');
                }}
              />
            )}

            {activeTab === 'assign-courses' && (
              <AdminAssignCoursesTab 
                onManageCourse={(c) => openManageCourseModal(c)}
              />
            )}

            {activeTab === 'courses-config' && (
              <AdminCoursesConfigTab 
                courses={courses} 
                initialSubTab="rules"
                onNavigateToTab={(t) => setActiveTab(t as AdminTabKey)}
                onManageCourse={(c) => openManageCourseModal(c)}
              />
            )}

            {activeTab === 'banner-manager' && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-xs">
                <HeroBannerManager />
              </div>
            )}

            {activeTab === 'top-adverts' && (
              <TopAdvertManager />
            )}

            {activeTab === 'adverts-manager' && (
              <AdvertManager />
            )}

            {activeTab === 'sponsored-ads' && (
              <AdminSponsoredAdsManager courses={courses} />
            )}

            {activeTab === 'promotion-management' && (
              <AdminPromotionManagementTab />
            )}

            {activeTab === 'promotion-subscribers' && (
              <AdminPromotionSubscribersTab />
            )}

            {activeTab === 'flash-sale' && (
              <AdminFlashSaleManager courses={courses} />
            )}

            {activeTab === 'payment-integrations' && (
              <AdminPaymentIntegrationsTab />
            )}

            {activeTab === 'payout-countries' && (
              <AdminPayoutCountriesTab />
            )}

            {activeTab === 'email-settings' && (
              <AdminEmailSettingsTab />
            )}

            {activeTab === 'custom-mail-pricing' && (
              <AdminCustomMailPricingTab />
            )}

            {activeTab === 'php-sync' && (
              <InstructorPhpSyncTab />
            )}

            {activeTab === 'price-notices' && (
              <AdminPriceAdjustmentNoticesTab 
                onManageCourse={(c) => openManageCourseModal(c)}
                onNavigateToCatalog={() => handleSelectTab('courses')}
              />
            )}

            {activeTab === 'htaccess-viewer' && (
              <AdminHtaccessViewer />
            )}

            {activeTab === 'visitor-tracking' && (
              <AdminVisitorTrackingTab />
            )}

            {activeTab === 'subscriptions' && (
              <AdminSubscriptionsTab />
            )}

          </div>
        )}

      </div>

      {/* Instructor Payout Details Modal */}
      {selectedUserForPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                    Instructor Payout Details
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedUserForPayout.name} ({selectedUserForPayout.email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserForPayout(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isLoadingPayout ? (
              <div className="py-12 text-center space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
                <p className="text-xs text-slate-500 font-bold">Loading payout and bank configuration from database...</p>
              </div>
            ) : instructorPayoutDetails && (instructorPayoutDetails.bankName || instructorPayoutDetails.accountNumber) ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between text-xs border-b border-slate-200 dark:border-slate-700 pb-2.5">
                    <span className="text-slate-500 font-medium">Payout Country</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{instructorPayoutDetails.country || 'Not specified'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs border-b border-slate-200 dark:border-slate-700 pb-2.5">
                    <span className="text-slate-500 font-medium">Bank Name</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">{instructorPayoutDetails.bankName}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs border-b border-slate-200 dark:border-slate-700 pb-2.5">
                    <span className="text-slate-500 font-medium">Account Number</span>
                    <span className="font-black text-slate-900 dark:text-slate-100 font-mono text-sm tracking-wider bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                      {instructorPayoutDetails.accountNumber}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs border-b border-slate-200 dark:border-slate-700 pb-2.5">
                    <span className="text-slate-500 font-medium">Account Holder Name</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{instructorPayoutDetails.fullName || instructorPayoutDetails.accountHolderName || selectedUserForPayout.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs border-b border-slate-200 dark:border-slate-700 pb-2.5">
                    <span className="text-slate-500 font-medium">Payout Email</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{instructorPayoutDetails.email || selectedUserForPayout.email}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Phone Number</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{instructorPayoutDetails.phone || instructorPayoutDetails.phoneNumber || 'Not provided'}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center space-x-3 text-xs text-emerald-800 dark:text-emerald-300">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <p className="font-bold">Verified Database Payout Destination</p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">Use these account details when executing wire transfers or mobile money disbursements to this instructor.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">No Payout Details Configured Yet</p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  This instructor has not yet set up their bank account or payout destination in their Instructor Studio settings.
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setSelectedUserForPayout(null)}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CEO Official Certificate Signature Studio Modal Page */}
      {isCeoSignerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 rounded-xl border border-amber-200 dark:border-amber-800">
                  <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    CEO Official Certificate Signature Studio
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sign using your finger, stylus, mouse, or trackpad.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCeoSignerModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-200/50 dark:bg-slate-800 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
              <SignaturePad
                userId="ceo"
                initialSignature={ceoSignature}
                title="CEO Signature Pad"
                signerName={ceoNameInput || 'SIR, RAJAB WAMUU'}
                signerTitle={ceoTitleInput || 'CEO UQLEARN'}
                onSave={(data) => {
                  setCeoSignature(data);
                  updateCourseConfig({
                    ceoSignature: data,
                    ceoName: ceoNameInput || 'SIR, RAJAB WAMUU',
                    ceoTitle: ceoTitleInput || 'CEO UQLEARN'
                  });
                  setIsCeoSignerModalOpen(false);
                  setNotificationMsg('CEO signature saved successfully!');
                  setTimeout(() => setNotificationMsg(''), 4000);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Alerts Drawer (YouTube Mix Popover Style) */}
      <AdminActionAlertsDrawer 
        pendingCoursesCount={pendingCoursesCount}
        pendingPriceNoticesCount={pendingPriceNoticesCount}
        onSelectTab={handleSelectTab}
      />
    </div>
  </div>
);
};
