import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Course, User, UserRole, CourseCategory, CourseConfigDefaults } from '../types';
import { 
  deleteCourseApi, 
  fetchCoursesApi, 
  apiFetch,
  normalizeCourse, 
  logApiError,
  API_ENDPOINTS, 
  fetchLogoApi,
  getCourseDefaultThumbnailApi, 
  updateLogoApi,
  fetchCourseCategoriesApi,
  saveCourseCategoryApi,
  deleteCourseCategoryApi,
  syncCourseCategoriesApi,
  PayoutCountry,
  DEFAULT_PAYOUT_COUNTRIES,
  DEFAULT_KENYA_COUNTRY,
  DEFAULT_KENYA_BANKS,
  getDefaultKenyaPayoutBanks,
  fetchPayoutCountriesApi,
  createPayoutCountryApi,
  updatePayoutCountryApi,
  deletePayoutCountryApi,
  togglePayoutCountryActiveApi,
  PayoutBank,
  fetchPayoutBanksApi,
  createPayoutBankApi,
  updatePayoutBankApi,
  deletePayoutBankApi,
  togglePayoutBankActiveApi,
  ROOT_URL
} from '../lib/apiConfig';
import { updateDocumentFavicon } from '../lib/branding';
import { subscriptionService } from '../services/subscription-service';
import { apiClient as api } from '../lib/api';
import { AutoLogoutModal } from '../components/common/AutoLogoutModal';
import { InviteFriendModal } from '../components/common/InviteFriendModal';
import { ShareCourseModal } from '../components/common/ShareCourseModal';
import { UpdateNameModal } from '../components/common/UpdateNameModal';
import { ALL_CURRENCIES } from '../lib/currencies';
import { currencyService } from '../services/currency-service';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface AppContextType {
  courses: Course[];
  isLoadingCourses: boolean;
  isLoadingEnrolled: boolean;
  loadingState: { courses: boolean; dashboard: boolean; onboarding: boolean };
  setLoadingState: (state: any) => void;
  enrolledCourses: Course[];
  cart: Course[];
  currentUser: User | null;
  darkMode: boolean;
  cartModalOpen: boolean;
  inviteModalOpen: boolean;
  shareCourseModalOpen: boolean;
  shareCourseTarget: Course | null;
  shareCourseOptions?: { customUrl?: string; customTitle?: string; customText?: string };
  openShareCourseModal: (course?: Course | null, options?: { customUrl?: string; customTitle?: string; customText?: string }) => void;
  closeShareCourseModal: () => void;
  authModalMode: 'login' | 'signup' | null;
  selectedModalCourse: Course | null;
  setSelectedModalCourse: (course: Course | null) => void;
  toggleDarkMode: () => void;
  setDarkMode: (value: boolean) => void;
  addToCart: (course: Course) => void;
  removeFromCart: (courseId: string) => void;
  clearCart: () => void;
  enrollCourse: (course: Course) => void;
  checkoutCart: (purchasedCourses: Course[]) => void;
  setCurrentUser: (user: User | null) => void;
  loginUser: (user: Partial<User>) => void;
  updateUserProfile: (updates: Partial<User>) => Promise<boolean>;
  logoutUser: () => void;
  extendSession: () => void;
  setCartModalOpen: (open: boolean) => void;
  setInviteModalOpen: (open: boolean) => void;
  setAuthModalMode: (mode: 'login' | 'signup' | null) => void;
  refreshCourses: (creatorId?: string) => Promise<void>;
  createCourse: (courseData: Partial<Course>) => Promise<boolean>;
  deleteCourse: (courseId: string) => Promise<boolean>;
  approveCourse: (courseId: string, isApproved: boolean) => Promise<boolean>;
  reviewCourse: (courseId: string, status: 'approved' | 'rejected' | 'needs_changes' | 'under_review', notes?: string) => Promise<boolean>;
  publishCourse: (courseId: string, isPublished: boolean) => Promise<boolean>;
  updateCourse: (courseId: string, updates: Partial<Course>) => Promise<boolean>;
  setCourses: (courses: Course[] | ((prev: Course[]) => Course[])) => void;
  // Instructor Notifications from Admin (e.g., price adjustment notices)
  instructorNotifications: InstructorNotification[];
  sendInstructorNotification: (notification: Omit<InstructorNotification, 'id' | 'createdAt' | 'read'>) => void;
  markInstructorNotificationAsRead: (id: string) => void;
  updateInstructorNotification: (id: string, updates: Partial<InstructorNotification>) => void;
  deleteInstructorNotification: (id: string) => void;
  resendPriceAdjustmentNotice: (id: string) => void;
  resolvePriceAdjustment: (id: string, action: 'accept' | 'decline' | 'dismiss') => Promise<void>;
  logoUrl: string;
  courseDefaultThumbnail: string;
  setCourseDefaultThumbnail: (url: string) => void;
  setLogoUrl: (url: string) => void;
  categories: CourseCategory[];
  setCategories: (categories: CourseCategory[] | ((prev: CourseCategory[]) => CourseCategory[])) => void;
  addCategory: (category: Omit<CourseCategory, 'id'>) => void;
  updateCategory: (id: string, updates: Partial<CourseCategory>) => void;
  deleteCategory: (id: string) => boolean;
  reorderCategories: (newCategories: CourseCategory[]) => void;
  resetDefaultCategories: () => void;
  courseConfig: CourseConfigDefaults;
  updateCourseConfig: (updates: Partial<CourseConfigDefaults>) => void;
  // Currency Management
  selectedCurrency: Currency;
  setSelectedCurrency: (currency: Currency) => void;
  formatPrice: (usdAmount: number) => string;
  getDiscountPercentage: (price: number, originalPrice?: number) => number;
  // Supported Payout Countries (Admin configured for instructors)
  payoutCountries: PayoutCountry[];
  fetchPayoutCountries: () => Promise<void>;
  addPayoutCountry: (country: Partial<PayoutCountry>) => Promise<boolean>;
  updatePayoutCountry: (id: string, updates: Partial<PayoutCountry>) => Promise<boolean>;
  deletePayoutCountry: (id: string) => Promise<boolean>;
  togglePayoutCountryActive: (id: string, isActive: boolean) => Promise<boolean>;
  seedDefaultPayoutCountries: () => Promise<boolean>;
  // Supported Payout Banks (Admin configured per country for instructors)
  payoutBanks: PayoutBank[];
  fetchPayoutBanks: (countryId?: string) => Promise<void>;
  addPayoutBank: (bankData: { countryId: string; countryName?: string; name: string; isActive?: boolean }) => Promise<boolean>;
  updatePayoutBank: (id: string, updates: Partial<PayoutBank>) => Promise<boolean>;
  deletePayoutBank: (id: string) => Promise<boolean>;
  togglePayoutBankActive: (id: string, isActive: boolean) => Promise<boolean>;
  getPayoutBanksForCountry: (countryIdOrName: string, activeOnly?: boolean) => PayoutBank[];
  seedKenyaBanks: () => Promise<boolean>;
}

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  rate: number;
  flag?: string;
}

export const supportedCurrencies: Currency[] = [
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', rate: 1400, flag: '🇳🇬' },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi', rate: 15.5, flag: '🇬🇭' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', rate: 130, flag: '🇰🇪' },
  { code: 'ZMW', symbol: 'ZK', name: 'Zambian Kwacha', rate: 26, flag: '🇿🇲' },
  { code: 'USD', symbol: '$', name: 'US Dollar', rate: 1, flag: '🇺🇸' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', rate: 18.5, flag: '🇿🇦' },
  { code: 'XAF', symbol: 'FCFA', name: 'Central African CFA Franc', rate: 600, flag: '🇨🇲' },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling', rate: 3700, flag: '🇺🇬' },
  { code: 'RWF', symbol: 'FRw', name: 'Rwandan Franc', rate: 1300, flag: '🇷🇼' },
];

export interface InstructorNotification {
  id: string;
  instructorName?: string;
  instructorEmail?: string;
  courseId: string;
  courseTitle: string;
  courseThumbnail?: string;
  category?: string;
  type: 'price_adjustment' | 'system' | 'quality' | 'general';
  title: string;
  message: string;
  suggestedPrice?: number;
  currentPrice?: number;
  flagReason?: string;
  status?: 'pending' | 'accepted' | 'declined' | 'dismissed';
  createdAt: string;
  reminderSentAt?: string;
  resolvedAt?: string;
  read: boolean;
}

export const defaultInstructorNotifications: InstructorNotification[] = [
  {
    id: 'notif-price-1',
    courseId: 'c-deep-learning-masterclass',
    courseTitle: 'Deep Learning & Computer Vision Masterclass 2026',
    courseThumbnail: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=600&auto=format&fit=crop&q=80',
    instructorName: 'Dr. Angela Vance',
    instructorEmail: 'angela.vance@uqlearn.org',
    category: 'Data Science',
    type: 'price_adjustment',
    title: 'Price Adjustment Notice: Deep Learning & Computer Vision',
    message: 'Hello Dr. Vance,\n\nOur platform curriculum moderation team conducted a pricing audit of "Deep Learning & Computer Vision Masterclass 2026".\n\nThe current price ($179.99) exceeds competitive platform benchmarks ($64.99 - $89.99) for this category and length.\n\nWe recommend adjusting the price to approximately $84.99 to optimize learner enrollment conversion and qualify for platform showcase placement.',
    currentPrice: 179.99,
    suggestedPrice: 84.99,
    flagReason: 'Price exceeds category benchmark median by +112% (Benchmark: $64.99 - $89.99)',
    status: 'pending',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    read: false,
  },
  {
    id: 'notif-price-2',
    courseId: 'c-enterprise-microservices',
    courseTitle: 'Enterprise Microservices Architecture with Go & gRPC',
    courseThumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
    instructorName: 'Marcus Sterling',
    instructorEmail: 'marcus.sterling@uqlearn.org',
    category: 'Development',
    type: 'price_adjustment',
    title: 'Price Adjustment Notice: Enterprise Microservices Architecture',
    message: 'Hello Marcus,\n\nMarketplace telemetry identified a high checkout drop-off rate (78%) for this course. While curriculum feedback is exceptional, the $149.99 listing price is significantly above marketplace conversion thresholds.\n\nWe advise setting the price to $69.99 to increase purchase completion rates.',
    currentPrice: 149.99,
    suggestedPrice: 69.99,
    flagReason: 'Checkout cart abandonment rate 78% • Listed above category ceiling',
    status: 'pending',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    read: false,
  },
  {
    id: 'notif-price-3',
    courseId: 'c-figma-masterclass',
    courseTitle: 'Figma UI/UX Design Masterclass & Design Systems',
    courseThumbnail: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=600&auto=format&fit=crop&q=80',
    instructorName: 'Sophia Chen',
    instructorEmail: 'sophia.chen@uqlearn.org',
    category: 'Design',
    type: 'price_adjustment',
    title: 'Price Adjustment Notice: Figma UI/UX Design Masterclass',
    message: 'Recommended adjusting listing price from $119.99 to $59.99 to align with trending UX design masterclasses.',
    currentPrice: 59.99,
    suggestedPrice: 59.99,
    flagReason: 'Price alignment with design bootcamp marketplace benchmarks',
    status: 'accepted',
    resolvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    read: true,
  },
  {
    id: 'notif-welcome',
    courseId: 'welcome',
    courseTitle: 'Instructor Studio',
    type: 'system',
    title: 'Welcome to Instructor Studio',
    message: 'Review learner feedback, curriculum quality, and ensure fair marketplace course pricing.',
    status: 'accepted',
    createdAt: new Date().toISOString(),
    read: false
  }
];

export const defaultCourseCategories: CourseCategory[] = [
  {
    id: 'cat-1',
    name: 'Development',
    slug: 'development',
    description: 'Full-stack web, mobile apps, software engineering, APIs, and cloud infrastructure.',
    icon: 'Code',
    color: 'rose',
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    subCategories: ['Web Development', 'React & Next.js', 'Node.js & Python', 'Mobile Apps', 'DevOps & Cloud'],
  },
  {
    id: 'cat-2',
    name: 'Data Science',
    slug: 'data-science',
    description: 'Machine learning, artificial intelligence, Python for data analytics, deep neural networks, and big data.',
    icon: 'Cpu',
    color: 'purple',
    isFeatured: true,
    isActive: true,
    sortOrder: 2,
    subCategories: ['Machine Learning', 'Artificial Intelligence', 'Data Analysis', 'Deep Learning', 'PyTorch & TensorFlow'],
  },
  {
    id: 'cat-3',
    name: 'Design',
    slug: 'design',
    description: 'User experience (UX), UI systems, Figma masterclasses, brand identity, and motion design.',
    icon: 'Palette',
    color: 'teal',
    isFeatured: true,
    isActive: true,
    sortOrder: 3,
    subCategories: ['UI/UX Design', 'Figma & Design Systems', 'Graphic Design', 'Motion & 3D', 'User Research'],
  },
  {
    id: 'cat-4',
    name: 'Business',
    slug: 'business',
    description: 'Product management, startup scaling, financial modeling, agile leadership, and operations.',
    icon: 'Briefcase',
    color: 'indigo',
    isFeatured: true,
    isActive: true,
    sortOrder: 4,
    subCategories: ['Product Management', 'Startup Growth', 'Leadership', 'Financial Modeling', 'Operations'],
  },
  {
    id: 'cat-5',
    name: 'Marketing',
    slug: 'marketing',
    description: 'SEO strategy, digital advertising, content marketing, growth hacking, and social media analytics.',
    icon: 'Megaphone',
    color: 'amber',
    isFeatured: true,
    isActive: true,
    sortOrder: 5,
    subCategories: ['Search Engine Optimization', 'Performance Marketing', 'Social Media', 'Content Strategy', 'Copywriting'],
  },
  {
    id: 'cat-6',
    name: 'Personal Growth',
    slug: 'personal-growth',
    description: 'Public speaking, career acceleration, productivity mastery, leadership presence, and critical thinking.',
    icon: 'Sparkles',
    color: 'emerald',
    isFeatured: true,
    isActive: true,
    sortOrder: 6,
    subCategories: ['Productivity', 'Career Acceleration', 'Public Speaking', 'Critical Thinking', 'Mindset & Habits'],
  },
  {
    id: 'cat-7',
    name: 'Cybersecurity',
    slug: 'cybersecurity',
    description: 'Ethical hacking, network security, penetration testing, threat modeling, and cloud security architectures.',
    icon: 'ShieldCheck',
    color: 'sky',
    isFeatured: false,
    isActive: true,
    sortOrder: 7,
    subCategories: ['Ethical Hacking', 'Network Security', 'Penetration Testing', 'Cloud Security', 'SOC & SIEM'],
  }
];

export const defaultCourseConfig: CourseConfigDefaults = {
  autoPublish: false,
  defaultCommissionRate: 15,
  minimumPrice: 9.99,
  maximumPrice: 999.99,
  allowFreeCourses: true,
  requireAiAudit: true,
  allowedVideoFormats: ['mp4', 'webm', 'mov', 'mkv'],
  maxVideoSizeMb: 500,
  defaultLevel: 'All Levels',
  ceoName: 'SIR, RAJAB WAMUU',
  ceoTitle: 'CEO UQLEARN',
  ceoSignature: ''
};


const defaultCourses: Course[] = [];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [courses, setCoursesState] = useState<Course[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('uqlearn_courses');
      } catch (e) {}
    }
    return defaultCourses;
  });
  const [isLoadingCourses, setIsLoadingCourses] = useState<boolean>(true);
  const [loadingState, setLoadingState] = useState({ courses: true, dashboard: false, onboarding: false });
  useEffect(() => {
    const t = setTimeout(() => {
      setIsLoadingCourses(false);
      setLoadingState(prev => ({ ...prev, courses: false }));
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  const setCourses = (update: Course[] | ((prev: Course[]) => Course[])) => {
    setCoursesState(prev => {
      const nextCourses = typeof update === 'function' ? update(prev) : update;
      if (!Array.isArray(nextCourses)) return prev;
      
      const seen = new Set<string>();
      const deduplicated: Course[] = [];
      for (const c of nextCourses) {
        if (c && c.id) {
          if (!seen.has(c.id)) {
            seen.add(c.id);
            deduplicated.push(c);
          }
        } else if (c) {
          deduplicated.push(c);
        }
      }

      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('uqlearn_courses', JSON.stringify(deduplicated));
        }
      } catch (e) {}
      return deduplicated;
    });
  };

  const [cart, setCart] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [isLoadingEnrolled, setIsLoadingEnrolled] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('uqlearn_enrolled_courses', JSON.stringify(enrolledCourses));
      } catch (e) {}
    }
  }, [enrolledCourses]);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('uqlearn_theme') === 'dark';
    }
    return false;
  });
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const THIRTY_DAYS_MS = SEVEN_DAYS_MS; // Keep for backward compatibility if needed, or update usage

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      const sessionKeys = ['uqlearn_admin', 'uqlearn_reviewer', 'uqlearn_instructor', 'uqlearn_user'];
      for (const key of sessionKeys) {
        const savedUser = localStorage.getItem(key);
        if (savedUser) {
          try {
            const parsed = JSON.parse(savedUser);
            const now = Date.now();
            const sessionExpiresAt = parsed.sessionExpiresAt || Number(localStorage.getItem('uqlearn_session_expires_at'));
            
            if (sessionExpiresAt && typeof sessionExpiresAt === 'number' && !isNaN(sessionExpiresAt)) {
              if (now > sessionExpiresAt) {
                console.info(`UQlearn login session (${key}) expired after 7 days.`);
                localStorage.removeItem(key);
                localStorage.removeItem('uqlearn_session_expires_at');
                continue;
              }
            } else if (parsed && parsed.email) {
              parsed.sessionExpiresAt = now + SEVEN_DAYS_MS;
              parsed.loginTimestamp = parsed.loginTimestamp || now;
              try {
                localStorage.setItem(key, JSON.stringify(parsed));
                localStorage.setItem('uqlearn_session_expires_at', String(parsed.sessionExpiresAt));
              } catch (e) {}
            }

            if (parsed && parsed.email) {
              return parsed;
            }
          } catch (e) {
            console.warn(`Failed to parse cached user for key ${key}`, e);
          }
        }
      }
    }
    return null;
  });

  // Sync authentication state from localStorage & background user verify
  useEffect(() => {
    const syncUser = async () => {
      if (currentUser) return; // Already handled by initial state
      const sessionKeys = ['uqlearn_admin', 'uqlearn_reviewer', 'uqlearn_instructor', 'uqlearn_user'];
      for (const key of sessionKeys) {
        const saved = localStorage.getItem(key);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.email) {
              const now = Date.now();
              const sessionExpiresAt = parsed.sessionExpiresAt || Number(localStorage.getItem('uqlearn_session_expires_at'));
              if (sessionExpiresAt && now > sessionExpiresAt) {
                localStorage.removeItem(key);
                localStorage.removeItem('uqlearn_session_expires_at');
                setCurrentUser(null);
                continue;
              }

              const email = (parsed.email || '').toLowerCase().trim();
              const defaultRole = (email === 'michaelomare045@gmail.com' || email === 'omaremichael8808@gmail.com' || email === 'wamuurajab@gmail.com') ? 'admin' : (parsed.role || 'learner');
              
              try {
                const usersRes = await apiFetch('users.php', { silent: true }, 1).catch(() => null);
                if (usersRes && Array.isArray(usersRes.data)) {
                  const matched = usersRes.data.find((u: any) => (u.email || '').toLowerCase().trim() === email);
                  if (matched) {
                    let resolvedRole = parsed.role || defaultRole;
                    if (matched.role && matched.role !== 'learner') {
                      resolvedRole = matched.role as UserRole;
                    }

                    const updated: User = {
                      ...parsed,
                      id: (matched.id || parsed.id || '').trim(),
                      role: resolvedRole,
                      avatar: matched.avatar || parsed.avatar,
                      sessionExpiresAt: parsed.sessionExpiresAt || (now + SEVEN_DAYS_MS),
                      loginTimestamp: parsed.loginTimestamp || now
                    };
                    setCurrentUser(updated);
                    const storageKey = updated.role === 'admin' 
                      ? 'uqlearn_admin' 
                      : (updated.role === 'reviewer' || updated.role === 'course_reviewer' ? 'uqlearn_reviewer' : (updated.role === 'instructor' ? 'uqlearn_instructor' : 'uqlearn_user'));
                    localStorage.setItem(storageKey, JSON.stringify(updated));
                    localStorage.setItem('uqlearn_session_expires_at', String(updated.sessionExpiresAt));
                  }
                }
              } catch (e) {
                // ignore
              }
              break; // Found and synced the active user
            }
          } catch (e) {
            // ignore
          }
        }
      }
    };

    syncUser();
  }, []);

  const loginUser = (userData: Partial<User>) => {
    const rawId = (userData.id || '').trim();
    const now = Date.now();
    const sessionExpiresAt = userData.sessionExpiresAt || (now + SEVEN_DAYS_MS);

    const newUser: User = {
      id: rawId || `usr-${Date.now()}`,
      name: userData.name || (userData.email ? userData.email.split('@')[0] : 'User'),
      email: (userData.email || '').toLowerCase().trim(),
      role: userData.role || 'learner',
      avatar: userData.avatar || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80`,
      phone: userData.phone,
      country: userData.country,
      city: userData.city,
      marketingOptIn: userData.marketingOptIn,
      isVerified: userData.isVerified ?? true,
      enrolledCourseIds: userData.enrolledCourseIds || [],
      wishlist: userData.wishlist || [],
      token: userData.token,
      loginTimestamp: userData.loginTimestamp || now,
      sessionExpiresAt: sessionExpiresAt
    };
    setCurrentUser(newUser);
    try {
      const storageKey = newUser.role === 'admin' 
        ? 'uqlearn_admin' 
        : (newUser.role === 'reviewer' || newUser.role === 'course_reviewer' ? 'uqlearn_reviewer' : (newUser.role === 'instructor' ? 'uqlearn_instructor' : 'uqlearn_user'));
      localStorage.setItem(storageKey, JSON.stringify(newUser));
      localStorage.setItem('uqlearn_session_expires_at', String(sessionExpiresAt));
    } catch (e) {
      console.warn('Failed to persist user', e);
    }
  };

  const logoutUser = () => {
    try {
      // 1. Clear local state synchronously
      setCurrentUser(null);
      setEnrolledCourses([]);
      setCart([]);
      
      // 2. Clear local storage & session storage keys
      localStorage.removeItem('uqlearn_user');
      localStorage.removeItem('uqlearn_instructor');
      localStorage.removeItem('uqlearn_reviewer');
      localStorage.removeItem('uqlearn_admin');
      localStorage.removeItem('uqlearn_session_expires_at');
      
      // 3. Clear all cookies, localStorage, and sessionStorage
      try {
        document.cookie.split(';').forEach(c => { 
          document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/'); 
        });
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {}

      // 4. Background fire-and-forget server-side logout request
      apiFetch('logout.php', { method: 'POST', credentials: 'include', silent: true }).catch(() => {});
    } catch (e) {
      console.warn('Failed to logout cleanly', e);
    }
  };

  const extendSession = () => {
    if (!currentUser) return;
    const now = Date.now();
    const sessionExpiresAt = now + SEVEN_DAYS_MS;
    const updated = {
      ...currentUser,
      sessionExpiresAt
    };
    setCurrentUser(updated);
    try {
      const storageKey = updated.role === 'admin' ? 'uqlearn_admin' : (updated.role === 'instructor' ? 'uqlearn_instructor' : 'uqlearn_user');
      localStorage.setItem(storageKey, JSON.stringify(updated));
      localStorage.setItem('uqlearn_session_expires_at', String(sessionExpiresAt));
    } catch (e) {
      console.warn('Failed to extend session', e);
    }
  };

  const updateUserProfile = async (updates: Partial<User>): Promise<boolean> => {
    if (!currentUser) return false;
    const updatedUser: User = {
      ...currentUser,
      ...updates
    };
    setCurrentUser(updatedUser);
    try {
      const storageKey = updatedUser.role === 'admin' 
        ? 'uqlearn_admin' 
        : (updatedUser.role === 'instructor' ? 'uqlearn_instructor' : 'uqlearn_user');
      localStorage.setItem(storageKey, JSON.stringify(updatedUser));
    } catch (e) {
      console.warn('Failed to update local storage user profile', e);
    }
    try {
      await apiFetch('users.php', {
        method: 'POST',
        body: JSON.stringify({
          action: 'update_profile',
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
          ...updates
        }),
        silent: true
      }).catch(() => {});
    } catch (err) {
      console.warn('Profile sync warning:', err);
    }
    return true;
  };
  const [cartModalOpen, setCartModalOpen] = useState<boolean>(false);
  const [inviteModalOpen, setInviteModalOpen] = useState<boolean>(false);
  const [shareCourseModalOpen, setShareCourseModalOpen] = useState<boolean>(false);
  const [shareCourseTarget, setShareCourseTarget] = useState<Course | null>(null);
  const [shareCourseOptions, setShareCourseOptions] = useState<{ customUrl?: string; customTitle?: string; customText?: string } | undefined>(undefined);

  const openShareCourseModal = (course?: Course | null, options?: { customUrl?: string; customTitle?: string; customText?: string }) => {
    setShareCourseTarget(course || null);
    setShareCourseOptions(options);
    setShareCourseModalOpen(true);
  };

  const closeShareCourseModal = () => {
    setShareCourseModalOpen(false);
    setShareCourseTarget(null);
    setShareCourseOptions(undefined);
  };
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup' | null>(null);
  const [selectedModalCourse, setSelectedModalCourse] = useState<Course | null>(null);
  const [logoUrl, setLogoUrlState] = useState<string>(() => {
    try {
      return localStorage.getItem('uqlearn_logo_url') || `${ROOT_URL}/logo/logo.png`;
    } catch {
      return `${ROOT_URL}/logo/logo.png`;
    }
  });

  const [courseDefaultThumbnail, setCourseDefaultThumbnailState] = useState<string>(() => {
    try {
      return localStorage.getItem('uqlearn_course_default_thumbnail') || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80';
    } catch {
      return 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80';
    }
  });

  useEffect(() => {
    // Initial favicon sync
    updateDocumentFavicon(logoUrl);
  }, [logoUrl]);

  useEffect(() => {
    // Fetch logo from backend API (with live PHP /api/v1/logo.php & local support)
    fetchLogoApi().then(res => {
      if (res && res.success && res.logoUrl) {
        setLogoUrlState(res.logoUrl);
        updateDocumentFavicon(res.logoUrl);
        try {
          localStorage.setItem('uqlearn_logo_url', res.logoUrl);
        } catch {
          // ignore
        }
      }
    }).catch(() => {});

    getCourseDefaultThumbnailApi().then(res => {
      if (res && (res as any).success && (res as any).thumbnailUrl) {
        setCourseDefaultThumbnailState((res as any).thumbnailUrl);
        try {
          localStorage.setItem('uqlearn_course_default_thumbnail', (res as any).thumbnailUrl);
        } catch {
          // ignore
        }
      } else if (typeof res === 'string') {
        setCourseDefaultThumbnailState(res);
      }
    }).catch(() => {});
  }, []);

  const setLogoUrl = (url: string) => {
    setLogoUrlState(url);
    updateDocumentFavicon(url);
    try {
      localStorage.setItem('uqlearn_logo_url', url);
    } catch (e) {
      console.warn('Failed to save logo URL', e);
    }
    // Sync to backend API (Node and PHP shared host compatible)
    updateLogoApi(url).catch(err => console.warn('Failed to sync logo to backend API', err));
  };

  const setCourseDefaultThumbnail = (url: string) => {
    setCourseDefaultThumbnailState(url);
    try {
      localStorage.setItem('uqlearn_course_default_thumbnail', url);
    } catch (e) {
      console.warn('Failed to save default thumbnail URL', e);
    }
  };

  const fetchCourses = useCallback(async (creatorId?: string) => {
    setIsLoadingCourses(true);
    try {
      // Determine effective creatorId when in instructor mode
      const effectiveCreatorId = creatorId || (currentUser?.role === 'instructor' && currentUser?.id ? currentUser.id : undefined);

      // Fetch live courses from API endpoints with optional creator_id parameter
      const rawRes = await fetchCoursesApi(effectiveCreatorId);
      const apiCourses = Array.isArray(rawRes) ? rawRes : (Array.isArray(rawRes?.data) ? rawRes.data : []);
      const normalized = apiCourses.map(normalizeCourse);
      
      if (normalized.length > 0) {
        setCourses(normalized);
      } else {
        const endpointUsed = effectiveCreatorId ? `courses.php?creator_id=${effectiveCreatorId}` : 'courses.php';
        void logApiError({
          endpoint: endpointUsed,
          url: `/api/proxy/v1/${endpointUsed}`,
          originalUrl: `https://uqlearn.org/api/v1/${endpointUsed}`,
          method: 'GET',
          status: 200,
          statusText: 'Empty Courses Payload',
          errorMessage: `Courses API returned 0 courses after normalization (raw type: ${Array.isArray(rawRes) ? 'array' : typeof rawRes})`,
          responsePreview: JSON.stringify(rawRes ?? null).slice(0, 2000),
          domain: 'uqlearn.org/api/v1/',
        });
      }
    } catch (err) {
      console.warn("Using current cached courses:", err);
    } finally {
      setIsLoadingCourses(false);
    }
  }, [currentUser?.id, currentUser?.role, currentUser?.email]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Synchronize enrolled courses based on active subscriptions from PHP backend & user state
  useEffect(() => {
    let isMounted = true;
    async function syncEnrolledCourses() {
      if (isLoadingCourses && courses.length === 0) return;

      setIsLoadingEnrolled(true);
      try {
        if (currentUser?.id) {
          try {
            const subs = await subscriptionService.getStudentSubscriptions(currentUser.id, currentUser.email);
            const activeSubCourseIds = subs
              .filter((s: any) => s.status === 'active' || s.status === 'success')
              .map((s: any) => s.courseId);

            const combinedEnrolledIds = Array.from(new Set([
              ...(currentUser.enrolledCourseIds || []),
              ...activeSubCourseIds
            ]));

            const userCourses = courses.filter(c => combinedEnrolledIds.includes(c.id));
            if (isMounted) {
              setEnrolledCourses(userCourses);
            }
          } catch (e) {
            const enrolledIds = currentUser.enrolledCourseIds || [];
            const userCourses = courses.filter(c => enrolledIds.includes(c.id));
            if (isMounted) {
              setEnrolledCourses(userCourses);
            }
          }
        } else {
          // Guest or un-synced user: fallback to localStorage subscriptions
          try {
            const subs = JSON.parse(localStorage.getItem('uqlearn_subscriptions') || '[]');
            const activeSubCourseIds = subs
              .filter((s: any) => s.status === 'active' || s.status === 'success')
              .map((s: any) => s.courseId);
            
            const guestCourses = courses.filter(c => activeSubCourseIds.includes(c.id));
            if (isMounted) {
              setEnrolledCourses(guestCourses);
            }
          } catch (e) {
            if (isMounted) {
              setEnrolledCourses([]);
            }
          }
        }
      } finally {
        if (isMounted) {
          setIsLoadingEnrolled(false);
        }
      }
    }

    syncEnrolledCourses();
    return () => { isMounted = false; };
  }, [courses, currentUser, isLoadingCourses]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('uqlearn_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('uqlearn_theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  const addToCart = (course: Course) => {
    if (!cart.some(c => c.id === course.id)) {
      setCart(prev => [...prev, course]);
    }
    setCartModalOpen(true);
  };

  const removeFromCart = (courseId: string) => {
    setCart(prev => prev.filter(c => c.id !== courseId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const enrollCourse = (course: Course) => {
    if (!enrolledCourses.some(e => e.id === course.id)) {
      setEnrolledCourses(prev => [...prev, course]);
    }
  };

  const checkoutCart = (purchasedCourses: Course[]) => {
    setEnrolledCourses(prev => {
      const updated = [...prev];
      purchasedCourses.forEach(c => {
        if (!updated.some(e => e.id === c.id)) {
          updated.push(c);
        }
      });
      return updated;
    });
    setCart([]);
    setCartModalOpen(false);
  };

  const createCourse = async (courseData: Partial<Course>): Promise<boolean> => {
    try {
      const res = await apiFetch('courses.php', {
        method: 'POST',
        body: JSON.stringify(courseData)
      });
      if (res) {
        await fetchCourses();
        return true;
      }
    } catch (err) {
      console.error("Failed to create course", err);
    }
    // Fallback local state update
    const newCourse: Course = {
      id: `course-${Date.now()}`,
      title: courseData.title || 'Untitled Course',
      subtitle: courseData.subtitle || '',
      description: courseData.description || '',
      instructor: courseData.instructor || 'Dr. Angela Vance',
      instructorTitle: courseData.instructorTitle || 'Instructor',
      instructorAvatar: courseData.instructorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      category: (courseData.category as any) || 'Development',
      level: (courseData.level as any) || 'All Levels',
      price: courseData.price || 49.99,
      originalPrice: courseData.originalPrice || 99.99,
      rating: 5.0,
      reviewCount: 1,
      learnersEnrolled: 0,
      image: courseData.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
      duration: courseData.duration || '10.0 hours',
      bestSeller: false,
      updatedAt: '2026-03-01',
      modules: courseData.modules || []
    };
    setCourses(prev => [newCourse, ...prev.filter(c => c.id !== newCourse.id)]);
    return true;
  };

  const deleteCourse = async (courseId: string): Promise<boolean> => {
    try {
      await deleteCourseApi(courseId);
    } catch (err) {
      console.warn("Delete course API notice:", err);
    }

    setCourses(prev => prev.filter(c => c.id !== courseId));
    return true;
  };

  const approveCourse = async (courseId: string, isApproved: boolean): Promise<boolean> => {
    try {
      // PHP Backend sync
      await apiFetch('courses.php', {
        method: 'POST',
        body: JSON.stringify({ 
          action: 'approve',
          id: courseId,
          isApprovedByAdmin: isApproved 
        })
      });
    } catch (err) {
      console.error("Failed to update course approval via PHP API", err);
    }

    setCourses(prev => prev.map(c => c.id === courseId ? { 
      ...c, 
      isApprovedByAdmin: isApproved,
      reviewStatus: isApproved ? 'approved' : 'rejected' 
    } : c));
    return true;
  };

  const reviewCourse = async (
    courseId: string, 
    status: 'approved' | 'rejected' | 'needs_changes' | 'under_review', 
    notes?: string
  ): Promise<boolean> => {
    const isApproved = status === 'approved';
    const reviewedAt = new Date().toISOString();
    const reviewedBy = currentUser?.email || 'Course Reviewer';

    try {
      await apiFetch('courses.php', {
        method: 'POST',
        body: JSON.stringify({
          action: 'review',
          id: courseId,
          status,
          isApprovedByAdmin: isApproved,
          reviewStatus: status,
          reviewerNotes: notes || '',
          reviewedAt,
          reviewedBy
        })
      });
    } catch (err) {
      console.warn("Failed to sync course review status to remote PHP API:", err);
    }

    setCourses(prev => {
      const updated = prev.map(c => c.id === courseId ? {
        ...c,
        isApprovedByAdmin: isApproved,
        reviewStatus: status,
        reviewerNotes: notes !== undefined ? notes : c.reviewerNotes,
        reviewedAt,
        reviewedBy
      } : c);
      try {
        localStorage.setItem('uqlearn_courses', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    return true;
  };

  const publishCourse = async (courseId: string, isPublished: boolean): Promise<boolean> => {
    try {
      // PHP Backend sync
      await apiFetch('courses.php', {
        method: 'POST',
        body: JSON.stringify({ 
          action: 'publish',
          id: courseId,
          isPublished 
        })
      });
    } catch (err) {
      console.error("Failed to update course publish status via PHP API", err);
    }

    setCourses(prev => prev.map(c => c.id === courseId ? { ...c, isPublished } : c));
    return true;
  };

  const updateCourse = async (courseId: string, updates: Partial<Course>): Promise<boolean> => {
    // Shared-hosting PHP backend sync
    try {
      await apiFetch('courses.php', {
        method: 'POST',
        body: JSON.stringify({
          action: 'update_meta',
          id: courseId,
          ...updates
        })
      });
    } catch (err) {
      console.warn("Notice updating course via PHP API:", err);
    }

    // Instant real-time frontend state sync
    setCourses(prev => prev.map(c => c.id === courseId ? { ...c, ...updates } : c));
    return true;
  };

  // Instructor Notifications from Admin (e.g. price adjustment requests)
  const [instructorNotifications, setInstructorNotifications] = useState<InstructorNotification[]>([]);

  const fetchInstructorNotifications = useCallback(async () => {
    try {
      // Fetch from PHP API
      const res = await api.priceAdjustments.getAll();
      const apiNotifs = (res.success && res.data) ? res.data : [];

      // Filter by current user if not admin
      if (currentUser?.role === 'instructor') {
        const email = currentUser.email.toLowerCase();
        const filtered = apiNotifs.filter((n: InstructorNotification) => 
          (n.instructorEmail || '').toLowerCase() === email || 
          (n.instructorName || '').toLowerCase() === (currentUser.name || '').toLowerCase()
        );
        setInstructorNotifications(filtered);
      } else {
        setInstructorNotifications(apiNotifs);
      }
    } catch (e) {
      console.warn("Failed to fetch instructor notifications", e);
    }
  }, [currentUser?.email, currentUser?.role, currentUser?.name]);

  useEffect(() => {
    fetchInstructorNotifications();
  }, [fetchInstructorNotifications]);

  const sendInstructorNotification = async (notification: Omit<InstructorNotification, 'id' | 'createdAt' | 'read'>) => {
    const id = `notif-${Date.now()}`;
    const newNotif: InstructorNotification = {
      ...notification,
      id,
      status: notification.status || 'pending',
      createdAt: new Date().toISOString(),
      read: false
    };

    try {
      // Sync to PHP API
      await api.priceAdjustments.create(notification).catch(() => {});
      
      await fetchInstructorNotifications();
    } catch (e) {
      console.warn('Failed to send notification via API', e);
      setInstructorNotifications(prev => [newNotif, ...prev]);
    }
  };

  const markInstructorNotificationAsRead = async (id: string) => {
    setInstructorNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await api.priceAdjustments.update(id, { read: true });
    } catch (e) {
      console.warn('Failed to mark read', e);
    }
  };

  const updateInstructorNotification = async (id: string, updates: Partial<InstructorNotification>) => {
    setInstructorNotifications(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
    try {
      await api.priceAdjustments.update(id, updates);
    } catch (e) {
      console.warn('Failed to update notification via API', e);
    }
  };

  const deleteInstructorNotification = async (id: string) => {
    setInstructorNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await api.priceAdjustments.delete(id);
    } catch (e) {
      console.warn('Failed to delete notification', e);
    }
  };

  const resendPriceAdjustmentNotice = async (id: string) => {
    setInstructorNotifications(prev => prev.map(n => n.id === id ? { ...n, reminderSentAt: new Date().toISOString(), status: 'pending', read: false } : n));
    try {
      await api.priceAdjustments.executeAction(id, 'resend');
    } catch (e) {
      console.warn('Failed to resend notice', e);
    }
  };

  const resolvePriceAdjustment = async (id: string, action: 'accept' | 'decline' | 'dismiss') => {
    const notif = instructorNotifications.find(n => n.id === id);
    if (!notif) return;

    setInstructorNotifications(prev => prev.map(n => {
      if (n.id === id) {
        return {
          ...n,
          status: (action === 'accept' ? 'accepted' : action === 'decline' ? 'declined' : 'dismissed') as any,
          resolvedAt: new Date().toISOString(),
          currentPrice: action === 'accept' && notif.suggestedPrice ? notif.suggestedPrice : n.currentPrice,
        };
      }
      return n;
    }));

    try {
      await api.priceAdjustments.executeAction(id, action);
      if (action === 'accept' && notif.suggestedPrice) {
        // Optimistically update the UI for course price changes
        setCourses(prev => prev.map(c => c.id === notif.courseId ? { ...c, price: notif.suggestedPrice! } : c));
        // Update via PHP API
        await updateCourse(notif.courseId, { price: notif.suggestedPrice });
      }
    } catch (e) {
      console.warn('Failed to resolve price adjustment via API', e);
    }
  };

  // Course Categories State & Management
  const [categories, setCategoriesState] = useState<CourseCategory[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('uqlearn_categories');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {}
      }
    }
    return defaultCourseCategories;
  });

  const setCategories = (update: CourseCategory[] | ((prev: CourseCategory[]) => CourseCategory[])) => {
    setCategoriesState(prev => {
      const next = typeof update === 'function' ? update(prev) : update;
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('uqlearn_categories', JSON.stringify(next));
        }
      } catch (e) {}
      return next;
    });
  };

  // Fetch live categories from API on mount
  useEffect(() => {
    let isMounted = true;
    async function loadApiCategories() {
      try {
        const apiCats = await fetchCourseCategoriesApi();
        if (isMounted && Array.isArray(apiCats) && apiCats.length > 0) {
          const formatted: CourseCategory[] = apiCats.map((c: any, idx: number) => ({
            id: String(c.id || `cat-${idx + 1}`),
            name: String(c.name || 'Untitled Category'),
            slug: String(c.slug || c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')),
            description: String(c.description || ''),
            icon: c.icon || 'BookOpen',
            color: c.color || 'blue',
            isFeatured: Boolean(c.isFeatured || c.is_featured),
            isActive: c.isActive !== false && c.is_active !== 0,
            sortOrder: Number(c.orderIndex ?? c.order_index ?? c.sortOrder ?? idx + 1),
            courseCount: Number(c.courseCount ?? c.course_count ?? 0)
          }));
          setCategories(formatted);
        }
      } catch (err) {
        console.warn("Notice loading categories from API:", err);
      }
    }
    loadApiCategories();
    return () => { isMounted = false; };
  }, []);

  const addCategory = (categoryData: Omit<CourseCategory, 'id'>) => {
    const slug = categoryData.slug || categoryData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newCategory: CourseCategory = {
      ...categoryData,
      id: `cat-${Date.now()}`,
      slug,
      sortOrder: categoryData.sortOrder || (categories.length + 1),
      createdAt: new Date().toISOString().split('T')[0]
    };
    setCategories(prev => [...prev, newCategory]);
    // Save to API in background
    saveCourseCategoryApi({
      id: newCategory.id,
      name: newCategory.name,
      slug: newCategory.slug,
      description: newCategory.description,
      icon: newCategory.icon,
      color: newCategory.color,
      orderIndex: newCategory.sortOrder,
      isActive: newCategory.isActive ? 1 : 0,
      isFeatured: newCategory.isFeatured ? 1 : 0
    }).catch(e => console.warn("Notice saving category to API:", e));
  };

  const updateCategory = (id: string, updates: Partial<CourseCategory>) => {
    setCategories(prev => {
      const updated = prev.map(cat => cat.id === id ? { ...cat, ...updates, updatedAt: new Date().toISOString().split('T')[0] } : cat);
      const target = updated.find(c => c.id === id);
      if (target) {
        saveCourseCategoryApi({
          id: target.id,
          name: target.name,
          slug: target.slug,
          description: target.description,
          icon: target.icon,
          color: target.color,
          orderIndex: target.sortOrder,
          isActive: target.isActive ? 1 : 0,
          isFeatured: target.isFeatured ? 1 : 0
        }).catch(e => console.warn("Notice updating category in API:", e));
      }
      return updated;
    });
  };

  const deleteCategory = (id: string): boolean => {
    setCategories(prev => prev.filter(cat => cat.id !== id));
    deleteCourseCategoryApi(id).catch(e => console.warn("Notice deleting category in API:", e));
    return true;
  };

  const reorderCategories = (newCategories: CourseCategory[]) => {
    const updated = newCategories.map((c, idx) => ({ ...c, sortOrder: idx + 1 }));
    setCategories(updated);
    syncCourseCategoriesApi().catch(e => console.warn("Notice syncing reordered categories to API:", e));
  };

  const resetDefaultCategories = () => {
    setCategories(defaultCourseCategories);
    syncCourseCategoriesApi().catch(e => console.warn("Notice resetting categories in API:", e));
  };

  // Course Global Configuration Settings
  const [courseConfig, setCourseConfigState] = useState<CourseConfigDefaults>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('uqlearn_course_config');
      if (saved) {
        try {
          return { ...defaultCourseConfig, ...JSON.parse(saved) };
        } catch (e) {}
      }
    }
    return defaultCourseConfig;
  });

  const updateCourseConfig = (updates: Partial<CourseConfigDefaults>) => {
    setCourseConfigState(prev => {
      const next = { ...prev, ...updates };
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('uqlearn_course_config', JSON.stringify(next));
        }
      } catch (e) {}
      return next;
    });
  };

  // Currency Logic
  const [selectedCurrency, setSelectedCurrencyState] = useState<Currency>(() => {
    if (typeof window !== 'undefined') {
      const sysCurr = localStorage.getItem('uqlearn_system_currency');
      if (sysCurr) {
        const found = supportedCurrencies.find(c => c.code === sysCurr);
        if (found) return found;
        const allFound = ALL_CURRENCIES.find(c => c.code === sysCurr);
        if (allFound) {
          return {
            code: allFound.code,
            symbol: allFound.symbol,
            name: allFound.name,
            rate: allFound.exchange_rate || 1
          };
        }
      }
      const saved = localStorage.getItem('uqlearn_currency');
      if (saved) {
        try {
          const parsed = typeof saved === 'string' && saved.startsWith('{') ? JSON.parse(saved) : { code: saved };
          const found = supportedCurrencies.find(c => c.code === parsed.code);
          if (found) return found;
          const allFound = ALL_CURRENCIES.find(c => c.code === parsed.code);
          if (allFound) {
            return {
              code: allFound.code,
              symbol: allFound.symbol,
              name: allFound.name,
              rate: allFound.exchange_rate || 1
            };
          }
        } catch (e) {}
      }
    }
    // Default to KES as highlighted in requested currency options
    return supportedCurrencies.find(c => c.code === 'KES') || supportedCurrencies[0];
  });

  // Listen to cross-component currency changes
  useEffect(() => {
    const handleCurrencyChanged = (e: any) => {
      const code = e?.detail?.currency;
      if (!code) return;
      const found = supportedCurrencies.find(c => c.code === code);
      if (found) {
        setSelectedCurrencyState(found);
        return;
      }
      const allFound = ALL_CURRENCIES.find(c => c.code === code);
      if (allFound) {
        setSelectedCurrencyState({
          code: allFound.code,
          symbol: allFound.symbol,
          name: allFound.name,
          rate: allFound.exchange_rate || (e?.detail?.rate || 1)
        });
      }
    };
    window.addEventListener('uqlearn_currency_changed', handleCurrencyChanged);
    return () => window.removeEventListener('uqlearn_currency_changed', handleCurrencyChanged);
  }, []);

  const setSelectedCurrency = (currency: Currency) => {
    setSelectedCurrencyState(currency);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('uqlearn_currency', JSON.stringify(currency));
        localStorage.setItem('uqlearn_system_currency', currency.code);
        window.dispatchEvent(new CustomEvent('uqlearn_currency_changed', { 
          detail: { currency: currency.code, rate: currency.rate } 
        }));
      }
    } catch (e) {}
  };

  // Sync with default system currency from backend preference
  useEffect(() => {
    currencyService.getSystemCurrency(currentUser?.id || 'current-user').then(res => {
      if (res && res.preference) {
        const found = supportedCurrencies.find(c => c.code === res.preference);
        if (found) {
          setSelectedCurrencyState(found);
        } else {
          const allFound = ALL_CURRENCIES.find(c => c.code === res.preference);
          if (allFound) {
            setSelectedCurrencyState({
              code: allFound.code,
              symbol: allFound.symbol,
              name: allFound.name,
              rate: allFound.exchange_rate || 1
            });
          }
        }
      }
    }).catch(() => {});
  }, [currentUser?.id]);

  // IP Detection for Currency
  useEffect(() => {
    // Only auto-detect if no currency is saved in localStorage
    const hasSavedCurrency = localStorage.getItem('uqlearn_currency') || localStorage.getItem('uqlearn_system_currency');
    if (!hasSavedCurrency) {
      const detectCurrency = async () => {
        try {
          const res = await fetch('https://ipapi.co/json/');
          const data = await res.json();
          if (data && data.currency) {
            const found = supportedCurrencies.find(c => c.code === data.currency);
            if (found) {
              setSelectedCurrencyState(found);
              localStorage.setItem('uqlearn_currency', JSON.stringify(found));
              localStorage.setItem('uqlearn_system_currency', found.code);
              window.dispatchEvent(new CustomEvent('uqlearn_currency_changed', { 
                detail: { currency: found.code, rate: found.rate } 
              }));
            }
          }
        } catch (err) {
          console.warn("Currency detection failed, using default.");
        }
      };
      detectCurrency();
    }
  }, []);

  const formatPrice = (usdAmount: number): string => {
    if (usdAmount === 0) return 'Free';
    const converted = Math.round(usdAmount * selectedCurrency.rate);
    
    if (selectedCurrency.code === 'USD') {
      return `$${usdAmount.toFixed(2)}`;
    }

    const formattedNumber = converted.toLocaleString('en-US');
    return `${selectedCurrency.symbol} ${formattedNumber}`;
  };

  const getDiscountPercentage = (price: number, originalPrice?: number): number => {
    if (!originalPrice || originalPrice <= price) return 0;
    return Math.round(((originalPrice - price) / originalPrice) * 100);
  };

  // ============================================================================
  // SUPPORTED PAYOUT COUNTRIES (Admin Managed & Instructor Consumed)
  // ============================================================================
  const [payoutCountries, setPayoutCountriesState] = useState<PayoutCountry[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('uqlearn_payout_countries');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        }
      } catch (e) {}
    }
    return [];
  });

  const fetchPayoutCountries = useCallback(async () => {
    try {
      const apiCountries = await fetchPayoutCountriesApi();
      if (Array.isArray(apiCountries)) {
        setPayoutCountriesState(apiCountries);
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('uqlearn_payout_countries', JSON.stringify(apiCountries));
          }
        } catch (e) {}
      }
    } catch (err) {
      console.warn("API payout_countries fetch warning:", err);
    }
  }, []);

  useEffect(() => {
    fetchPayoutCountries();
  }, [fetchPayoutCountries]);

  const addPayoutCountry = async (countryData: Partial<PayoutCountry>): Promise<boolean> => {
    const name = (countryData.name || '').trim();
    if (!name) return false;

    let code = (countryData.code || '').trim().toUpperCase();
    if (!code) {
      const clean = name.replace(/[^A-Za-z]/g, '');
      code = (clean.slice(0, 3) || 'CTY').toUpperCase();
    }

    const id = countryData.id || `pc-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;
    const newCountry: PayoutCountry = {
      id,
      name,
      code,
      currencyCode: (countryData.currencyCode || 'USD').toUpperCase(),
      currencySymbol: countryData.currencySymbol || '$',
      payoutMethods: countryData.payoutMethods || ['Bank Transfer'],
      minPayout: Number(countryData.minPayout || 50.00),
      processingTime: countryData.processingTime || '1-3 business days',
      isActive: countryData.isActive !== false,
      notes: countryData.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setPayoutCountriesState(prev => {
      const filtered = prev.filter(c => c.id !== id && c.name.toLowerCase() !== name.toLowerCase());
      const updated = [...filtered, newCountry].sort((a, b) => a.name.localeCompare(b.name));
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('uqlearn_payout_countries', JSON.stringify(updated));
        }
      } catch (e) {}
      return updated;
    });

    // Save to Database API
    try {
      await createPayoutCountryApi(newCountry);
    } catch (err) {
      console.warn("Failed to save payout country to database API:", err);
    }
    return true;
  };

  const updatePayoutCountry = async (id: string, updates: Partial<PayoutCountry>): Promise<boolean> => {
    setPayoutCountriesState(prev => {
      const updated = prev.map(c => {
        if (c.id === id) {
          return {
            ...c,
            ...updates,
            updatedAt: new Date().toISOString()
          };
        }
        return c;
      }).sort((a, b) => a.name.localeCompare(b.name));

      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('uqlearn_payout_countries', JSON.stringify(updated));
        }
      } catch (e) {}
      return updated;
    });

    // Update via Database API
    try {
      await updatePayoutCountryApi(id, updates);
    } catch (err) {
      console.warn("Failed to update payout country via database API:", err);
    }
    return true;
  };

  const deletePayoutCountry = async (id: string): Promise<boolean> => {
    setPayoutCountriesState(prev => {
      const updated = prev.filter(c => c.id !== id);
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('uqlearn_payout_countries', JSON.stringify(updated));
        }
      } catch (e) {}
      return updated;
    });

    // Delete via Database API
    try {
      await deletePayoutCountryApi(id);
    } catch (err) {
      console.warn("Failed to delete payout country via database API:", err);
    }
    return true;
  };

  const togglePayoutCountryActive = async (id: string, isActive: boolean): Promise<boolean> => {
    setPayoutCountriesState(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, isActive } : c);
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('uqlearn_payout_countries', JSON.stringify(updated));
        }
      } catch (e) {}
      return updated;
    });

    // Toggle via Database API
    try {
      await togglePayoutCountryActiveApi(id, isActive);
    } catch (err) {
      console.warn("Failed to toggle payout country via database API:", err);
    }
    return true;
  };

  const seedDefaultPayoutCountries = async (): Promise<boolean> => {
    setPayoutCountriesState(DEFAULT_PAYOUT_COUNTRIES);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('uqlearn_payout_countries', JSON.stringify(DEFAULT_PAYOUT_COUNTRIES));
      }
      for (const country of DEFAULT_PAYOUT_COUNTRIES) {
        await createPayoutCountryApi(country).catch(() => {});
      }
    } catch (e) {}
    return true;
  };

  // ============================================================================
  // SUPPORTED PAYOUT BANKS (Admin Managed per Country & Instructor Consumed)
  // Dynamic database-backed storage using MySQL Database APIs
  // ============================================================================
  const [payoutBanks, setPayoutBanksState] = useState<PayoutBank[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('uqlearn_payout_banks');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
    }
    return getDefaultKenyaPayoutBanks();
  });

  const fetchPayoutBanks = useCallback(async (countryId?: string) => {
    let combinedBanks: PayoutBank[] = [];

    // 1. Fetch from backend Database API
    try {
      const res = await fetchPayoutBanksApi(countryId);
      const rawList = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      if (rawList.length > 0) {
        for (const item of rawList) {
          const cId = (item.countryId || item.country_id || '').trim();
          let cName = (item.countryName || item.country_name || '').trim();
          if (!cName && cId === 'pc-ke') cName = 'Kenya';

          const bank: PayoutBank = {
            id: String(item.id || `pb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
            countryId: cId,
            countryName: cName,
            name: String(item.name || '').trim(),
            code: String(item.code || '').trim(),
            isActive: item.isActive !== undefined ? Boolean(item.isActive) : (item.is_active !== undefined ? Boolean(Number(item.is_active)) : true),
            createdAt: item.createdAt || item.created_at || new Date().toISOString(),
            updatedAt: item.updatedAt || item.updated_at || new Date().toISOString()
          };
          if (!combinedBanks.some(b => b.id === bank.id || (b.name.toLowerCase() === bank.name.toLowerCase() && b.countryId.toLowerCase() === bank.countryId.toLowerCase()))) {
            combinedBanks.push(bank);
          }
        }
      }
    } catch (err) {
      console.warn("API payout_banks fetch error:", err);
    }

    // 2. Dynamic Seeding: If Kenya has no banks loaded from database yet, auto-seed Kenya's supported banks
    const hasKenyaBanks = combinedBanks.some(b => b.countryId === 'pc-ke' || b.countryName?.toLowerCase() === 'kenya');
    if (!hasKenyaBanks) {
      const defaultKenya = getDefaultKenyaPayoutBanks();
      combinedBanks = [...combinedBanks, ...defaultKenya];

      // Store Kenya banks into database via API
      (async () => {
        try {
          for (const bank of defaultKenya) {
            await createPayoutBankApi(bank).catch(() => {});
          }
        } catch (e) {
          console.warn("Auto-seeding Kenya banks to database warning:", e);
        }
      })();
    }

    setPayoutBanksState(prev => {
      let next: PayoutBank[];
      if (countryId && countryId !== 'undefined' && countryId !== 'null') {
        const cleanCountryId = countryId.trim().toLowerCase();
        const withoutCountry = prev.filter(b => b.countryId.toLowerCase() !== cleanCountryId && b.countryName?.toLowerCase() !== cleanCountryId);
        const forThisCountry = combinedBanks.filter(b => b.countryId.toLowerCase() === cleanCountryId || b.countryName?.toLowerCase() === cleanCountryId);
        next = [...withoutCountry, ...forThisCountry].sort((a, b) => a.name.localeCompare(b.name));
      } else {
        next = combinedBanks.sort((a, b) => a.name.localeCompare(b.name));
      }
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('uqlearn_payout_banks', JSON.stringify(next));
        }
      } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    fetchPayoutBanks();
  }, [fetchPayoutBanks]);

  const addPayoutBank = async (bankData: { countryId: string; countryName?: string; name: string; code?: string; isActive?: boolean }): Promise<boolean> => {
    const name = (bankData.name || '').trim();
    if (!name || !bankData.countryId) return false;

    // Find country name if missing
    const matchedCountry = payoutCountries.find(c => c.id === bankData.countryId || c.name.toLowerCase() === bankData.countryId.toLowerCase());
    const countryName = bankData.countryName || matchedCountry?.name || (bankData.countryId === 'pc-ke' ? 'Kenya' : '');

    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const id = `pb-${bankData.countryId === 'pc-ke' ? 'ke' : bankData.countryId.slice(0, 3)}-${slug}-${Date.now().toString().slice(-4)}`;
    const newBank: PayoutBank = {
      id,
      countryId: bankData.countryId,
      countryName,
      name,
      code: bankData.code || '',
      isActive: bankData.isActive !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setPayoutBanksState(prev => {
      const filtered = prev.filter(b => b.id !== id);
      const updated = [...filtered, newBank].sort((a, b) => a.name.localeCompare(b.name));
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('uqlearn_payout_banks', JSON.stringify(updated));
        }
      } catch {}
      return updated;
    });

    // Dynamic persistence to Database API backend
    try {
      const res = await createPayoutBankApi(newBank);
      if (res?.data?.id) {
        const serverBank = res.data;
        setPayoutBanksState(prev => prev.map(b => b.id === id ? {
          ...b,
          id: serverBank.id || b.id,
          createdAt: serverBank.createdAt || serverBank.created_at || b.createdAt,
          updatedAt: serverBank.updatedAt || serverBank.updated_at || b.updatedAt
        } : b));
      }
    } catch (err) {
      console.warn("Failed to save payout bank to database API:", err);
      throw err;
    }
    return true;
  };

  const updatePayoutBank = async (id: string, updates: Partial<PayoutBank>): Promise<boolean> => {
    const existing = payoutBanks.find(b => b.id === id);
    const countryId = updates.countryId || existing?.countryId || '';
    const countryName = updates.countryName || existing?.countryName || '';
    const payload = {
      ...updates,
      id,
      countryId,
      countryName
    };
    const updatedAt = new Date().toISOString();

    setPayoutBanksState(prev => {
      const updated = prev.map(b => {
        if (b.id === id) {
          return {
            ...b,
            ...updates,
            updatedAt
          };
        }
        return b;
      }).sort((a, b) => a.name.localeCompare(b.name));

      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('uqlearn_payout_banks', JSON.stringify(updated));
        }
      } catch {}
      return updated;
    });

    // Update via Database API
    try {
      await updatePayoutBankApi(id, payload);
    } catch (err) {
      console.warn("Failed to update payout bank via database API:", err);
      throw err;
    }
    return true;
  };

  const deletePayoutBank = async (id: string): Promise<boolean> => {
    setPayoutBanksState(prev => {
      const updated = prev.filter(b => b.id !== id);
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('uqlearn_payout_banks', JSON.stringify(updated));
        }
      } catch {}
      return updated;
    });

    // Delete via Database API
    try {
      await deletePayoutBankApi(id);
    } catch (err) {
      console.warn("Failed to delete payout bank via database API:", err);
      throw err;
    }
    return true;
  };

  const togglePayoutBankActive = async (id: string, isActive: boolean): Promise<boolean> => {
    const updatedAt = new Date().toISOString();
    setPayoutBanksState(prev => {
      const updated = prev.map(b => b.id === id ? { ...b, isActive, updatedAt } : b);
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('uqlearn_payout_banks', JSON.stringify(updated));
        }
      } catch {}
      return updated;
    });

    // Toggle via Database API
    try {
      await togglePayoutBankActiveApi(id, isActive);
    } catch (err) {
      console.warn("Failed to toggle payout bank via database API:", err);
      throw err;
    }
    return true;
  };

  const getPayoutBanksForCountry = useCallback((countryIdOrName: string, activeOnly = false): PayoutBank[] => {
    if (!countryIdOrName) return [];
    const term = countryIdOrName.trim().toLowerCase();
    return payoutBanks
      .filter(b => {
        const matchesCountry = b.countryId.toLowerCase() === term || 
          (b.countryName && b.countryName.toLowerCase() === term) ||
          (term === 'kenya' && (b.countryId.toLowerCase() === 'pc-ke' || b.countryId.toLowerCase() === 'ke')) ||
          (term === 'pc-ke' && (b.countryName?.toLowerCase() === 'kenya' || b.countryId.toLowerCase() === 'pc-ke')) ||
          (term === 'nigeria' && (b.countryId.toLowerCase() === 'pc-ng' || b.countryId.toLowerCase() === 'ng')) ||
          (term === 'pc-ng' && (b.countryName?.toLowerCase() === 'nigeria' || b.countryId.toLowerCase() === 'pc-ng')) ||
          (term === 'united states' && (b.countryId.toLowerCase() === 'pc-us' || b.countryId.toLowerCase() === 'us')) ||
          (term === 'pc-us' && (b.countryName?.toLowerCase() === 'united states' || b.countryId.toLowerCase() === 'pc-us')) ||
          (term === 'united kingdom' && (b.countryId.toLowerCase() === 'pc-gb' || b.countryId.toLowerCase() === 'gb')) ||
          (term === 'pc-gb' && (b.countryName?.toLowerCase() === 'united kingdom' || b.countryId.toLowerCase() === 'pc-gb'));
        if (!matchesCountry) return false;
        if (activeOnly) return b.isActive !== false;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [payoutBanks]);

  const seedKenyaBanks = async (): Promise<boolean> => {
    const defaultKenya = getDefaultKenyaPayoutBanks();
    setPayoutBanksState(prev => {
      const withoutKenya = prev.filter(b => b.countryId !== 'pc-ke' && b.countryName?.toLowerCase() !== 'kenya');
      const updated = [...withoutKenya, ...defaultKenya].sort((a, b) => a.name.localeCompare(b.name));
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('uqlearn_payout_banks', JSON.stringify(updated));
        }
      } catch {}
      return updated;
    });

    // Store each bank to Database API
    for (const bank of defaultKenya) {
      await createPayoutBankApi(bank).catch(() => {});
    }
    return true;
  };

  return (
    <AppContext.Provider
      value={{
        courses,
        isLoadingCourses,
        isLoadingEnrolled,
        loadingState,
        setLoadingState,
        enrolledCourses,
        cart,
        currentUser,
        darkMode,
        cartModalOpen,
        inviteModalOpen,
        shareCourseModalOpen,
        shareCourseTarget,
        shareCourseOptions,
        openShareCourseModal,
        closeShareCourseModal,
        authModalMode,
        selectedModalCourse,
        setSelectedModalCourse,
        toggleDarkMode,
        setDarkMode,
        addToCart,
        removeFromCart,
        clearCart,
        enrollCourse,
        checkoutCart,
        setCurrentUser,
        loginUser,
        updateUserProfile,
        logoutUser,
        extendSession,
        setCartModalOpen,
        setInviteModalOpen,
        setAuthModalMode,
        refreshCourses: fetchCourses,
        createCourse,
        deleteCourse,
        approveCourse,
        reviewCourse,
        publishCourse,
        updateCourse,
        setCourses,
        instructorNotifications,
        sendInstructorNotification,
        markInstructorNotificationAsRead,
        updateInstructorNotification,
        deleteInstructorNotification,
        resendPriceAdjustmentNotice,
        resolvePriceAdjustment,
        logoUrl,
        courseDefaultThumbnail,
        setCourseDefaultThumbnail,
        setLogoUrl,
        categories,
        setCategories,
        addCategory,
        updateCategory,
        deleteCategory,
        reorderCategories,
        resetDefaultCategories,
        courseConfig,
        updateCourseConfig,
        selectedCurrency,
        setSelectedCurrency,
        formatPrice,
        getDiscountPercentage,
        payoutCountries,
        fetchPayoutCountries,
        addPayoutCountry,
        updatePayoutCountry,
        deletePayoutCountry,
        togglePayoutCountryActive,
        seedDefaultPayoutCountries,
        payoutBanks,
        fetchPayoutBanks,
        addPayoutBank,
        updatePayoutBank,
        deletePayoutBank,
        togglePayoutBankActive,
        getPayoutBanksForCountry,
        seedKenyaBanks
      }}
    >
      {children}
      <AutoLogoutModal />
      <InviteFriendModal isOpen={inviteModalOpen} onClose={() => setInviteModalOpen(false)} />
      <ShareCourseModal 
        isOpen={shareCourseModalOpen} 
        onClose={closeShareCourseModal} 
        course={shareCourseTarget} 
        customUrl={shareCourseOptions?.customUrl}
        customTitle={shareCourseOptions?.customTitle}
        customText={shareCourseOptions?.customText}
      />
      <UpdateNameModal />
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
