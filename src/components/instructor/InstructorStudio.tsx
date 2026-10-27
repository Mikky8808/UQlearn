import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { 
  DollarSign, 
  Users, 
  BookOpen, 
  Plus, 
  ArrowRight, 
  CheckCircle2,
  BarChart2,
  MessageSquare,
  Megaphone,
  LayoutDashboard,
  AlertCircle
} from 'lucide-react';
import { Course } from '../../types';
import { useApp } from '../../context/AppContext';
import { InstructorTabKey } from '../navigation/InstructorSidebar';
import { InstructorNavbar } from './InstructorNavbar';
import { InstructorSidebarDrawer } from './InstructorSidebarDrawer';
import { InstructorStudioDashboard } from './InstructorStudioDashboard';
import { CourseBuilder } from './courses/CourseBuilder';
import { AddCoursePage } from './courses/AddCoursePage';
import { InstructorAnalyticsTab } from './InstructorAnalyticsTab';
import { InstructorMessagesTab } from './InstructorMessagesTab';
import { InstructorCoursesTab } from './courses/InstructorCoursesTab';
import { ModuleEditor } from './courses/ModuleEditor';
import { LessonEditor } from './courses/LessonEditor';
import { InstructorAnalyticsViews } from './InstructorAnalyticsViews';
import { InstructorCommunicationViews } from './InstructorCommunicationViews';
import { InstructorAdminSettingsViews } from './InstructorAdminSettingsViews';
import { InstructorProViews } from './InstructorProViews';
import { InstructorPhpSyncTab } from './InstructorPhpSyncTab';
import { InstructorComplianceTab } from './InstructorComplianceTab';
import { InstructorSponsoredAdsTab } from './InstructorSponsoredAdsTab';
import { InstructorRequestWithdrawalPage } from './InstructorRequestWithdrawalPage';
import { InstructorTermsOfServicePage } from './InstructorTermsOfServicePage';
import { InstructorLoginPage } from './InstructorLoginPage';
import { apiFetch } from '../../lib/apiConfig';

interface InstructorStudioProps {
  courses: Course[];
  onCreateCourse: (courseData: any) => void;
  onDeleteCourse: (courseId: string) => void;
}

export const InstructorStudio: React.FC<InstructorStudioProps> = ({
  courses,
  onCreateCourse,
  onDeleteCourse,
}) => {
  const { currentUser, setCurrentUser, darkMode, toggleDarkMode, loginUser } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
  const isInstructorHost = hostname.startsWith('instructor.');
  const isLiveUqDomain = hostname.includes('uqlearn.org');
  const loginPath = isInstructorHost ? '/login' : '/login/instructor';
  const dashboardPath = isInstructorHost ? '/' : '/instructor';

  const effectiveInstructor = currentUser;

  // Filter courses specific to the logged-in instructor
  const instructorCourses = useMemo(() => {
    if (!effectiveInstructor) return [];

    const instructorId = (effectiveInstructor.id || '').trim().toLowerCase();
    const instructorEmail = (effectiveInstructor.email || '').trim().toLowerCase();
    const instructorName = (effectiveInstructor.name || '').trim().toLowerCase();

    const rawList = courses.filter(c => {
      if (!c) return false;
      
      const courseCreatedBy = (c.createdBy || c.created_by || '').toString().trim().toLowerCase();
      const courseCreatorEmail = (c.creatorEmail || '').toString().trim().toLowerCase();
      const courseInstructor = (c.instructor || '').toString().trim().toLowerCase();
      const courseAvatar = (c.instructorAvatar || (c as any).instructor_avatar || '').toString().toLowerCase();

      // 1. Direct match on user ID / created_by (Priority #1)
      if (instructorId && (courseCreatedBy === instructorId || courseCreatedBy.replace(/\s+/g, '') === instructorId.replace(/\s+/g, ''))) {
        return true;
      }

      // 2. Match on Creator Email (Priority #2)
      // Check both current email and known alternate emails for this user
      const altEmails = ['michaelomare045@gmail.com', 'omaremichael8808@gmail.com'];
      if (instructorEmail && (courseCreatorEmail === instructorEmail || courseCreatedBy === instructorEmail)) {
        return true;
      }
      if (altEmails.includes(instructorEmail) && altEmails.some(email => courseCreatorEmail === email || courseCreatedBy === email)) {
        return true;
      }

      // 3. Match on Instructor Avatar URL (if it contains email)
      if (instructorEmail && courseAvatar && (courseAvatar.includes(encodeURIComponent(instructorEmail)) || courseAvatar.includes(instructorEmail))) {
        return true;
      }

      // 4. Match on Instructor Name (Fallback)
      if (instructorName && courseInstructor && (courseInstructor === instructorName || instructorName.includes(courseInstructor) || courseInstructor.includes(instructorName))) {
        // Avoid matching generic names
        if (courseInstructor.length > 3 && !['user', 'instructor', 'student', 'admin', 'guest'].includes(courseInstructor)) {
          return true;
        }
      }
      
      console.log('DEBUG: Course not matched', c.id, c.title, 'createdBy=', courseCreatedBy, 'instructorId=', instructorId);
      return false;
    });

    // If an admin has NO courses of their own, show them all so they can still manage the platform
    // But if they HAVE courses, only show theirs to avoid clutter as requested
    if (effectiveInstructor.role === 'admin' && rawList.length === 0) {
      const seen = new Set<string>();
      return courses.filter(c => {
        if (!c || !c.id || seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });
    }

    const seen = new Set<string>();
    return rawList.filter(c => {
      if (!c || !c.id || seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [courses, effectiveInstructor]);

  const [searchParams, setSearchParams] = useSearchParams();

  // Tab state synchronized with URL path across both subdomain (root) and path-based (/instructor/*) routes
  const [activeTab, setActiveTab] = useState<InstructorTabKey>(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/add-course') || path.includes('/new-course')) return 'add-course';
    if (path.includes('/course-builder') || path.includes('/builder')) return 'course-builder';
    if (path.includes('/learner-progress') || path.includes('/progress')) return 'learner-progress';
    if (path.includes('/quiz-stats') || path.includes('/quizzes')) return 'quiz-stats';
    if (path.includes('/reviews')) return 'reviews';
    if (path.includes('/analytics')) return 'analytics';
    if (path.includes('/announcements')) return 'announcements';
    if (path.includes('/direct-messages')) return 'direct-messages';
    if (path.includes('/messages')) return 'messages';
    if (path.includes('/payouts')) return 'payouts';
    if (path.includes('/profile')) return 'profile';
    if (path.includes('/co-instructors')) return 'co-instructors';
    if (path.includes('/certificates')) return 'certificates';
    if (path.includes('/custom-mail') || path.includes('/abandoned-cart')) return 'custom-mail';
    if (path.includes('/sponsored') || path.includes('/boost')) return 'sponsored-ads';
    if (path.includes('/terms-of-service') || path.includes('/terms')) return 'terms-of-service';
    if (path.includes('/request-withdrawal') || path.includes('/withdraw')) return 'request-withdrawal';
    if (path.includes('/php-sync') || path.includes('/remote-deploy')) return 'dashboard';
    if (path.includes('/module')) return 'module-editor';
    if (path.includes('/lesson')) return 'lesson-editor';
    if (path.includes('/courses')) return 'courses';
    return 'dashboard';
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [complianceStatus, setComplianceStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [autoOpenCategoryReqModal, setAutoOpenCategoryReqModal] = useState(false);

  // Fetch compliance status from PHP backend
  useEffect(() => {
    const fetchCompliance = async () => {
      try {
        const data = await apiFetch('compliance-manage.php');
        if (Array.isArray(data)) {
          const instructorId = (currentUser?.id || 'me').toString();
          // Find submission for current instructor
          const mySubmission = data.find((item: any) => 
            item.instructor_id?.toString() === instructorId || 
            item.instructor_email === currentUser?.email
          );
          if (mySubmission) {
            setComplianceStatus(mySubmission.status || 'pending');
          }
        }
      } catch (err) {
        console.warn('Error fetching compliance in studio (offline/fallback):', err);
      }
    };

    if (currentUser) {
      fetchCompliance();
    }
  }, [currentUser]);

  // Initialize selected IDs from the URL search parameters to capture exact page reload state
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(() => {
    return searchParams.get('courseId') || courses[0]?.id || null;
  });
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(() => {
    return searchParams.get('moduleId') || null;
  });
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(() => {
    return searchParams.get('lessonId') || null;
  });

  // Keep state synchronized when the browser URL parameters change (handles back/forward/refresh)
  useEffect(() => {
    const courseIdFromUrl = searchParams.get('courseId');
    if (courseIdFromUrl && courseIdFromUrl !== selectedCourseId) {
      setSelectedCourseId(courseIdFromUrl);
    }
    const moduleIdFromUrl = searchParams.get('moduleId');
    if (moduleIdFromUrl !== selectedModuleId) {
      setSelectedModuleId(moduleIdFromUrl);
    }
    const lessonIdFromUrl = searchParams.get('lessonId');
    if (lessonIdFromUrl !== selectedLessonId) {
      setSelectedLessonId(lessonIdFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/add-course') || path.includes('/new-course')) setActiveTab('add-course');
    else if (path.includes('/course-builder') || path.includes('/builder')) setActiveTab('course-builder');
    else if (path.includes('/learner-progress') || path.includes('/progress')) setActiveTab('learner-progress');
    else if (path.includes('/quiz-stats') || path.includes('/quizzes')) setActiveTab('quiz-stats');
    else if (path.includes('/reviews')) setActiveTab('reviews');
    else if (path.includes('/analytics')) setActiveTab('analytics');
    else if (path.includes('/announcements')) setActiveTab('announcements');
    else if (path.includes('/direct-messages')) setActiveTab('direct-messages');
    else if (path.includes('/messages')) setActiveTab('messages');
    else if (path.includes('/payouts')) setActiveTab('payouts');
    else if (path.includes('/profile')) setActiveTab('profile');
    else if (path.includes('/co-instructors')) setActiveTab('co-instructors');
    else if (path.includes('/certificates')) setActiveTab('certificates');
    else if (path.includes('/custom-mail') || path.includes('/abandoned-cart')) setActiveTab('custom-mail');
    else if (path.includes('/sponsored') || path.includes('/boost')) setActiveTab('sponsored-ads');
    else if (path.includes('/courses')) setActiveTab('courses');
    else if (path.includes('/module')) setActiveTab('module-editor');
    else if (path.includes('/lesson')) setActiveTab('lesson-editor');
    else if (path === '/instructor' || path === '/instructor/' || path === '/') setActiveTab('dashboard');
  }, [location.pathname]);

  // Sync selectedCourseId when courses list changes
  useEffect(() => {
    if (!selectedCourseId && courses.length > 0) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses, selectedCourseId]);

  const selectedCourse = courses.find(c => c.id === selectedCourseId) || courses[0] || null;

  // Helper to build parameterized URLs to ensure robust reload support without complex router nested path matching on PHP shared hosts
  const getUrlForTab = (tab: InstructorTabKey, params?: Record<string, string>) => {
    const searchString = params ? `?${new URLSearchParams(params).toString()}` : '';
    if (tab === 'dashboard') {
      return (isInstructorHost ? '/' : '/instructor') + searchString;
    }
    return (isInstructorHost ? `/${tab}` : `/instructor/${tab}`) + searchString;
  };

  const handleSelectTab = (tab: InstructorTabKey) => {
    setActiveTab(tab);
    
    // Retain relevant course params if we are within the course creation or editing workspace
    const params: Record<string, string> = {};
    const hasCourseId = tab === 'course-builder' || tab === 'module-editor' || tab === 'lesson-editor';
    if (hasCourseId && selectedCourseId) {
      params.courseId = selectedCourseId;
    }
    const hasModuleId = tab === 'module-editor' || tab === 'lesson-editor';
    if (hasModuleId && selectedModuleId) {
      params.moduleId = selectedModuleId;
    }
    const hasLessonId = tab === 'lesson-editor';
    if (hasLessonId && selectedLessonId) {
      params.lessonId = selectedLessonId;
    }

    setSearchParams(params);
    navigate(getUrlForTab(tab, params));
  };

  // Handle Quick Educator Activation from Login Required Card
  const handleActivateInstructorSession = () => {
    if (!effectiveInstructor) return;
    loginUser({
      id: effectiveInstructor.id,
      name: effectiveInstructor.name,
      email: effectiveInstructor.email,
      role: 'instructor',
      avatar: effectiveInstructor.avatar,
      isVerified: true
    });
    navigate(dashboardPath);
  };

  // Handle Full Builder save
  const handleCreateCourseSubmit = (courseData: any) => {
    onCreateCourse({
      ...courseData,
      instructor: effectiveInstructor?.name || courseData.instructor || "Dr. Angela Vance",
      instructorTitle: courseData.instructorTitle || "Principal Software Architect",
      instructorAvatar: effectiveInstructor?.avatar || courseData.instructorAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
      createdBy: effectiveInstructor?.id || courseData.createdBy || "usr_45e453fb57306121",
      creatorEmail: effectiveInstructor?.email || "omaremichael8808@gmail.com",
    });
    if (courseData.id) {
      setSelectedCourseId(courseData.id);
      const params = { courseId: courseData.id };
      setSearchParams(params);
    }
  };

  const handleSelectCourseToBuild = (courseId: string) => {
    setSelectedCourseId(courseId);
    setActiveTab('course-builder');
    const params = { courseId, builderTab: 'overview' };
    setSearchParams(params);
    navigate(getUrlForTab('course-builder', params));
  };

  const handleManageModule = (courseId: string, moduleId: string) => {
    setSelectedCourseId(courseId);
    setSelectedModuleId(moduleId);
    setActiveTab('module-editor');
    const params = { courseId, moduleId };
    setSearchParams(params);
    navigate(getUrlForTab('module-editor', params));
  };

  const handleManageLesson = (courseId: string, moduleId: string, lessonId: string) => {
    setSelectedCourseId(courseId);
    setSelectedModuleId(moduleId);
    setSelectedLessonId(lessonId);
    setActiveTab('lesson-editor');
    const params = { courseId, moduleId, lessonId };
    setSearchParams(params);
    navigate(getUrlForTab('lesson-editor', params));
  };

  const totalEarnings = instructorCourses.reduce((acc, c) => acc + (c.price * (c.learnersEnrolled || 0)), 0);
  const totalLearners = instructorCourses.reduce((acc, c) => acc + (c.learnersEnrolled || 0), 0);

  const [showLogin, setShowLogin] = useState(false);

  // Strict Authentication Check: Deny access if not a real registered instructor or admin user
  if (showLogin) {
    return <InstructorLoginPage />;
  }

  if (!currentUser || (currentUser.role !== 'instructor' && currentUser.role !== 'admin')) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl space-y-6">
          <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-800">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Instructor Access Restricted</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Access to Instructor Studio requires a verified registered instructor database account. Unregistered or guest accounts are strictly restricted.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                if (currentUser && currentUser.role !== 'instructor' && currentUser.role !== 'admin') {
                  setCurrentUser(null);
                  try {
                    localStorage.removeItem('uqlearn_user');
                    localStorage.removeItem('uqlearn_instructor');
                  } catch (e) {}
                }
                setShowLogin(true);
                navigate(loginPath);
              }}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md cursor-pointer"
            >
              <span>Sign In as Instructor</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors flex flex-col">
      {/* Dedicated Instructor Left Drawer Sidebar */}
      <InstructorSidebarDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeTab={activeTab}
        onSelectTab={(tab) => handleSelectTab(tab)}
        coursesCount={instructorCourses.length}
        currentUser={effectiveInstructor}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        complianceStatus={complianceStatus}
        onLogout={() => {
          setCurrentUser(null);
          navigate(loginPath);
        }}
      />

      {/* Dedicated Instructor Top Navbar with search, notification icon, profile icon */}
      <InstructorNavbar
        activeTab={activeTab}
        onSelectTab={(tab) => handleSelectTab(tab)}
        onOpenSidebar={() => setDrawerOpen(true)}
        coursesCount={instructorCourses.length}
        onOpenQuickAddModal={() => handleSelectTab('add-course')}
        currentUser={effectiveInstructor}
        complianceStatus={complianceStatus}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
      />

      <div className="flex-1 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
          {/* Header Banner - ONLY in Dashboard as requested */}
          {activeTab === 'dashboard' && (
            <div className="bg-white dark:bg-slate-900 rounded-none p-6 text-slate-900 dark:text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-200 dark:border-slate-800 animate-fadeIn">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center flex-wrap gap-2 text-slate-900 dark:text-white">
                <span>Welcome back, {effectiveInstructor?.name || 'Instructor'}!</span>
                {complianceStatus === 'approved' && (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-none bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verified</span>
                  </span>
                )}
              </h1>
            </div>
          )}

          {/* Dynamic Studio Views: Render full-width cleanly without in-page sidebar */}
          <div className="w-full">
            
            {/* Dashboard Home Overview */}
            {activeTab === 'dashboard' && (
              <InstructorStudioDashboard
                courses={instructorCourses}
                currentUser={effectiveInstructor}
                onSelectTab={handleSelectTab}
                onSelectCourse={(id) => setSelectedCourseId(id)}
                complianceStatus={complianceStatus}
              />
            )}

            {/* Course Builder Component */}
            {activeTab === 'course-builder' && (
              <CourseBuilder
                initialData={selectedCourse || undefined}
                courses={instructorCourses}
                selectedCourseId={selectedCourseId || undefined}
                onSelectCourse={(id) => setSelectedCourseId(id)}
                onOpenQuickAddModal={() => setActiveTab('add-course')}
                onSave={handleCreateCourseSubmit}
                onDeleteCourse={onDeleteCourse}
                onManageModule={handleManageModule}
                onManageLesson={handleManageLesson}
                onCancel={() => setActiveTab('courses')}
              />
            )}

            {/* Add Course Page */}
            {(activeTab === 'new-course' || activeTab === 'add-course') && (
              <AddCoursePage
                onSaveAndBuild={(courseData) => {
                  onCreateCourse(courseData);
                  if (courseData.id) setSelectedCourseId(courseData.id);
                  setActiveTab('course-builder');
                }}
                onSaveAsDraft={(courseData) => {
                  onCreateCourse(courseData);
                  if (courseData.id) setSelectedCourseId(courseData.id);
                  setActiveTab('courses');
                }}
                onRequestCategory={() => {
                  setAutoOpenCategoryReqModal(true);
                  setActiveTab('requests');
                }}
                onCancel={() => setActiveTab('courses')}
              />
            )}

            {/* Removed Course Management Views */}

            {/* Category 2: Analytics & Performance Views */}
            {activeTab === 'analytics' && (
              <InstructorAnalyticsTab 
                courses={instructorCourses} 
                currentUser={effectiveInstructor}
                onSelectTab={handleSelectTab}
              />
            )}

            {(activeTab === 'learner-progress' || activeTab === 'quiz-stats' || activeTab === 'reviews') && (
              <InstructorAnalyticsViews
                tab={activeTab}
                courses={instructorCourses}
              />
            )}

            {/* Category 3: Communication Views */}
            {(activeTab === 'announcements' || activeTab === 'messages') && (
              <InstructorMessagesTab courses={instructorCourses} currentUser={effectiveInstructor} />
            )}

            {(activeTab === 'direct-messages' || activeTab === 'requests') && (
              <InstructorCommunicationViews
                tab={activeTab}
                courses={instructorCourses}
                currentUser={effectiveInstructor}
                autoOpenCategoryRequestModal={autoOpenCategoryReqModal}
                onClearAutoOpenCategoryRequest={() => setAutoOpenCategoryReqModal(false)}
              />
            )}

            {/* Category 4: Settings Views */}
            {activeTab === 'compliance' && (
              <InstructorComplianceTab currentUser={effectiveInstructor} />
            )}

            {(activeTab === 'payouts' || activeTab === 'profile' || activeTab === 'tiktok-pixel') && (
              <InstructorAdminSettingsViews
                tab={activeTab}
                currentUser={effectiveInstructor}
              />
            )}

            {/* Custom Mail Settings View */}
            {(activeTab === 'custom-mail' || activeTab === 'abandoned-cart-emails') && (
              <InstructorProViews
                tab={activeTab}
                courses={instructorCourses}
              />
            )}

            {/* Course Catalog Tab */}
            {activeTab === 'courses' && (
              <InstructorCoursesTab 
                courses={instructorCourses} 
                onDeleteCourse={onDeleteCourse}
                onNavigateToCreate={() => {
                  const hasAvatar = Boolean(
                    effectiveInstructor?.avatar &&
                    typeof effectiveInstructor.avatar === 'string' &&
                    effectiveInstructor.avatar.trim() !== '' &&
                    !effectiveInstructor.avatar.includes('default') &&
                    !effectiveInstructor.avatar.includes('placeholder') &&
                    !effectiveInstructor.avatar.includes('ui-avatars.com')
                  );
                  if (!hasAvatar) {
                    alert('Profile Image Required: Please set your profile avatar before creating any course. Your image is required so learners can identify you on course details pages.');
                    handleSelectTab('profile');
                    return;
                  }
                  handleSelectTab('add-course');
                }}
                onNavigateToProfile={() => handleSelectTab('profile')}
                onSelectCourseToBuild={handleSelectCourseToBuild}
              />
            )}

            {/* Sponsored Ads & Boost Tab */}
            {activeTab === 'sponsored-ads' && (
              <InstructorSponsoredAdsTab 
                courses={instructorCourses}
                currentUser={effectiveInstructor}
              />
            )}

            {/* Request Withdrawal Page */}
            {activeTab === 'request-withdrawal' && (
              <InstructorRequestWithdrawalPage
                courses={instructorCourses}
                currentUser={effectiveInstructor}
                onSelectTab={handleSelectTab}
              />
            )}

            {/* Dedicated Full Page Terms of Service */}
            {activeTab === 'terms-of-service' && (
              <InstructorTermsOfServicePage
                onSelectTab={handleSelectTab}
              />
            )}

            {/* Module Editor Full Page View */}
            {activeTab === 'module-editor' && selectedCourse && selectedModuleId && (
              <ModuleEditor
                courseId={selectedCourse.id}
                courseTitle={selectedCourse.title}
                moduleId={selectedModuleId}
                onBack={() => handleSelectTab('course-builder')}
                onManageLesson={(lessonId) => handleManageLesson(selectedCourse.id, selectedModuleId, lessonId)}
              />
            )}

            {/* Lesson Editor Full Page View */}
            {activeTab === 'lesson-editor' && selectedCourse && selectedModuleId && selectedLessonId && (
              <LessonEditor
                courseId={selectedCourse.id}
                courseTitle={selectedCourse.title}
                moduleId={selectedModuleId}
                lessonId={selectedLessonId}
                onBack={() => handleSelectTab('module-editor')}
              />
            )}

            {/* PHP Backend Deployment & Synchronization View */}
            {activeTab === ('php-sync' as any) && (
              <InstructorPhpSyncTab />
            )}

          </div>

        </div>
      </div>
    </div>
  );
};
