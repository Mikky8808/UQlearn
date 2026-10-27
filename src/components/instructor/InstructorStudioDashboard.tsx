import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Plus, 
  GraduationCap, 
  ChevronRight, 
  Eye, 
  RefreshCw,
  FolderOpen,
  Camera,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import { Course, CourseSubscription } from '../../types';
import { InstructorTabKey } from '../navigation/InstructorSidebar';
import { subscriptionService } from '../../services/subscription-service';

interface InstructorStudioDashboardProps {
  courses: Course[];
  currentUser: any;
  onSelectTab: (tab: InstructorTabKey) => void;
  onSelectCourse?: (courseId: string) => void;
  complianceStatus?: 'none' | 'pending' | 'approved' | 'rejected';
}

export const InstructorStudioDashboard: React.FC<InstructorStudioDashboardProps> = ({
  courses,
  currentUser,
  onSelectTab,
  complianceStatus = 'none',
}) => {
  // Learners State
  const [enrolledLearners, setEnrolledLearners] = useState<CourseSubscription[]>([]);
  const [loadingLearners, setLoadingLearners] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAllLearners, setShowAllLearners] = useState(false);

  // Check if instructor has a profile avatar set
  const hasAvatar = Boolean(
    currentUser?.avatar &&
    typeof currentUser.avatar === 'string' &&
    currentUser.avatar.trim() !== '' &&
    !currentUser.avatar.includes('default') &&
    !currentUser.avatar.includes('placeholder') &&
    !currentUser.avatar.includes('ui-avatars.com')
  );

  // Fetch real enrolled learners for this instructor's courses
  const fetchLearners = async (silent = false) => {
    if (!silent) setLoadingLearners(true);
    setIsRefreshing(true);
    try {
      const courseIds = courses.map(c => c.id).filter(Boolean);
      const data = await subscriptionService.getInstructorTransactions({
        instructorId: currentUser?.id,
        instructorEmail: currentUser?.email,
        instructorName: currentUser?.name,
        courseIds: courseIds.length > 0 ? courseIds : undefined
      });

      if (Array.isArray(data)) {
        setEnrolledLearners(data);
      }
    } catch (err) {
      console.warn('Failed to fetch instructor learners:', err);
    } finally {
      setLoadingLearners(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLearners();
  }, [currentUser, courses]);

  // Filtered & Deduplicated Learners who have actively enrolled in a course
  const filteredLearners = useMemo(() => {
    // 1. Filter out students who have no enrolled course or invalid/inactive status
    const validLearners = enrolledLearners.filter(learner => {
      const cId = (learner.courseId || (learner as any).course_id || '').trim();
      const cTitle = (learner.courseTitle || (learner as any).course_title || '').trim();
      if (!cId || !cTitle) return false;
      const st = String(learner.status || '').toLowerCase();
      if (st && st !== 'active' && st !== 'successful' && st !== 'completed') {
        return false;
      }
      return true;
    });

    // 2. Deduplicate learners (in case recorded multiple times for the same course)
    const uniqueMap = new Map<string, CourseSubscription>();
    for (const l of validLearners) {
      const emailOrId = (l.studentEmail || l.studentId || '').toLowerCase().trim();
      const courseId = (l.courseId || (l as any).course_id || '').trim();
      const uniqueKey = `${emailOrId}_${courseId}`;
      if (!uniqueMap.has(uniqueKey)) {
        uniqueMap.set(uniqueKey, l);
      } else {
        const existing = uniqueMap.get(uniqueKey)!;
        if (l.activatedAt && !existing.activatedAt) {
          uniqueMap.set(uniqueKey, l);
        }
      }
    }
    return Array.from(uniqueMap.values());
  }, [enrolledLearners]);

  // Display 5 learners by default, or all if user clicked View All
  const displayedLearners = useMemo(() => {
    if (showAllLearners) return filteredLearners;
    return filteredLearners.slice(0, 5);
  }, [filteredLearners, showAllLearners]);

  const handleCreateCourseClick = () => {
    if (!hasAvatar) {
      alert('Profile Image Required: Please set your profile avatar before creating any course. Your image is required so learners can identify you on course details pages.');
      onSelectTab('profile');
      return;
    }
    onSelectTab('add-course');
  };

  return (
    <div className="space-y-8 pb-16">
      {/* 1. SECTION 1: COURSES */}
      <section className="space-y-5">
        
        {/* Profile Avatar Required Warning Banner (Show above My Courses) */}
        {!hasAvatar && (
          <div className="p-5 bg-amber-50 dark:bg-amber-950/70 border-2 border-amber-400 dark:border-amber-700/80 rounded-none shadow-md space-y-3.5 animate-fadeIn">
            <div className="flex items-start space-x-3.5">
              <div className="p-2.5 bg-amber-100 dark:bg-amber-900/80 text-amber-800 dark:text-amber-200 rounded-none shrink-0">
                <Camera className="w-6 h-6" />
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-base font-extrabold text-amber-950 dark:text-amber-100">
                    Profile Image Required
                  </h3>
                  <span className="px-2.5 py-0.5 bg-amber-200 dark:bg-amber-800 text-amber-950 dark:text-amber-100 text-[10px] font-black uppercase tracking-wider rounded-none">
                    Required for Course Creation
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
                  You have not set your profile avatar. Your profile image is required for learners so it appears on the course details page. Please set your avatar image before creating any course.
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-amber-200 dark:border-amber-800/80 flex items-center justify-end">
              <button
                type="button"
                onClick={() => onSelectTab('profile')}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-none shadow-xs hover:shadow transition-all flex items-center space-x-2 cursor-pointer"
              >
                <span>Click here to set your image in My Profile</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <GraduationCap className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            My Courses ({courses.length})
          </h2>
        </div>

        {/* Courses List */}
        {courses.length > 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 shadow-md overflow-hidden">
            {courses.map((course) => (
              <div
                key={course.id}
                className="p-3.5 sm:p-4 flex items-center space-x-4 hover:bg-slate-50/75 dark:hover:bg-slate-800/50 transition duration-150"
              >
                {/* Thumbnail Image */}
                <div className="relative w-16 h-12 sm:w-20 sm:h-14 rounded-none overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700">
                  <img
                    src={course.thumbnail || course.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80'}
                    alt={course.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>

                {/* Course Title */}
                <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate">
                  {course.title}
                </h3>
              </div>
            ))}
          </div>
        ) : (
          /* Empty Courses State */
          <div className="bg-white dark:bg-slate-900 rounded-none border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center space-y-4 shadow-md">
            <div className="w-16 h-16 rounded-none bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mx-auto">
              <FolderOpen className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                No courses yet
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Share your skills with thousands of eager learners. Create modular lessons, quizzes, and project resources.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => onSelectTab('add-course')}
                className="inline-flex items-center space-x-2 px-6 py-3 rounded-none bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-bold shadow-md transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create Your First Course</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 2. SECTION 2: ENROLLED LEARNERS */}
      <section id="instructor-learners-section" className="space-y-5 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Enrolled Learners ({filteredLearners.length})
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {filteredLearners.length > 5 && (
              <button
                onClick={() => setShowAllLearners(!showAllLearners)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-none bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs sm:text-sm font-semibold transition shadow-xs"
              >
                <Eye className="w-4 h-4" />
                <span>{showAllLearners ? 'Show Top 5 Only' : `View All (${filteredLearners.length})`}</span>
              </button>
            )}
          </div>
        </div>

        {/* Enrolled Learners List without Columns */}
        {loadingLearners ? (
          <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800 p-12 text-center shadow-md">
            <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Loading enrolled learners directory...
            </p>
          </div>
        ) : filteredLearners.length > 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 shadow-md overflow-hidden">
            {displayedLearners.map((learner) => {
              const initials = (learner.studentName || 'Learner')
                .split(' ')
                .map(p => p[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();

              return (
                <div
                  key={learner.id}
                  className="p-3.5 sm:p-4 flex items-center space-x-4 hover:bg-slate-50/75 dark:hover:bg-slate-800/50 transition duration-150"
                >
                  <div className="w-10 h-10 rounded-none bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                    {initials || 'S'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate">
                      {learner.studentName || 'Enrolled Student'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {learner.courseTitle || 'Enrolled Course'}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* View All / Toggle Footer */}
            {filteredLearners.length > 5 && (
              <div className="p-3.5 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>
                  Showing {displayedLearners.length} of {filteredLearners.length} enrolled students
                </span>
                <button
                  onClick={() => setShowAllLearners(!showAllLearners)}
                  className="inline-flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-bold hover:underline"
                >
                  <span>{showAllLearners ? 'Show Top 5 Only' : `View All ${filteredLearners.length} Students`}</span>
                  <ChevronRight className={`w-3.5 h-3.5 transition transform ${showAllLearners ? '-rotate-90' : 'rotate-90'}`} />
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Empty Learners State */
          <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800 p-10 text-center space-y-3 shadow-md">
            <div className="w-14 h-14 rounded-none bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <Users className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No Enrolled Learners Yet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Once students enroll in your courses, their details will appear here automatically.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
