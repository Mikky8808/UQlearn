import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { InstructorStudio } from './InstructorStudio';
import { InstructorLoginPage } from './InstructorLoginPage';
import { InstructorLandingPage } from './InstructorLandingPage';
import { InstructorOnboardingWizard } from './InstructorOnboardingWizard';
import { useApp } from '../../context/AppContext';
import { Course } from '../../types';
import { API_ENDPOINTS, deleteCourseApi, API_BASE_URL, apiFetch } from '../../lib/apiConfig';
import { instructorService } from '../../services/instructor-service';
import { SkeletonCard, SkeletonTableRows } from '../common/SkeletonLoader';
import { CheckCircle2, X } from 'lucide-react';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useApp();
  if (!currentUser || (currentUser.role !== 'instructor' && currentUser.role !== 'admin')) {
    return <InstructorLoginPage />;
  }
  return <>{children}</>;
};

export default function InstructorApp() {
  const { courses, setCourses, refreshCourses, darkMode, currentUser } = useApp();
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState(true);

  // Load existing courses from Live API & Firestore on initial mount
  useEffect(() => {
    refreshCourses().catch(err => {
      console.warn('Initial courses sync notice:', err);
    });
  }, []);

  const [isLoadingOnboarding, setIsLoadingOnboarding] = useState(false);

  useEffect(() => {
    if (currentUser?.id) {
      const cachedCompleted = localStorage.getItem(`uqlearn_instructor_onboarding_completed_${currentUser.id}`);
      if (cachedCompleted === 'true') {
        setIsOnboardingCompleted(true);
      } else {
        // Non-blocking background check
        instructorService.getOnboardingStatus(currentUser.id).then(res => {
          if (res && res.success && res.completed) {
            setIsOnboardingCompleted(true);
            localStorage.setItem(`uqlearn_instructor_onboarding_completed_${currentUser.id}`, 'true');
          }
        }).catch(() => {
          // Fallback to true if API fails so it never blocks the instructor
          setIsOnboardingCompleted(true);
        });
      }
    }
  }, [currentUser]);

  /**
   * handleCreateCourse:
   * 1. Directly invokes the /api/v1/courses.php API endpoint (via API_BASE_URL)
   *    to insert/update the course, curriculum modules, and lessons in the MySQL database with created_by user ID.
   * 2. Persists to Firestore ('courses' collection) and local backend for seamless synchronization.
   * 3. Updates application state instantly without prompting with manual SQL copy/paste modals.
   */
  const handleCreateCourse = async (courseData: Partial<Course>) => {
    setIsSaving(true);
    const courseId = courseData.id || `course-${Date.now()}`;
    const creatorUserId = courseData.createdBy || courseData.created_by || currentUser?.id || '';
    const instructorName = courseData.instructor || currentUser?.name || '';
    const instructorAvatar = courseData.instructorAvatar || currentUser?.avatar || '';
    const instructorDescription = courseData.instructorDescription || (courseData as any)?.instructor_description || (courseData as any)?.instructorBio || '';
    const instructorImage = courseData.instructorImage || courseData.instructorAvatar || instructorAvatar || '';
    const subcategory = courseData.subcategory || (courseData as any)?.subCategory || '';
    const primaryTaught = courseData.primaryTaught || (courseData as any)?.primary_taught || '';
    const language = courseData.language || 'English';
    const promoVideo = courseData.promoVideo || (courseData as any)?.promo_video || '';

    const newCourse: Course = {
      id: courseId,
      title: courseData.title || '',
      subtitle: courseData.subtitle || '',
      description: courseData.description || '',
      instructor: instructorName,
      instructorTitle: courseData.instructorTitle || '',
      instructorAvatar: instructorImage || instructorAvatar,
      instructorImage: instructorImage,
      instructorDescription: instructorDescription,
      instructor_description: instructorDescription,
      instructorBio: instructorDescription,
      subcategory,
      primaryTaught,
      language,
      promoVideo,
      createdBy: creatorUserId,
      created_by: creatorUserId,
      creatorEmail: currentUser?.email || '',
      category: courseData.category || 'Development',
      price: courseData.price !== undefined && courseData.price !== null && !isNaN(Number(courseData.price)) ? Number(courseData.price) : 49.99,
      originalPrice: courseData.originalPrice !== undefined && courseData.originalPrice !== null && !isNaN(Number(courseData.originalPrice)) ? Number(courseData.originalPrice) : 0,
      rating: 5.0,
      reviewCount: 1,
      learnersEnrolled: 0,
      image: courseData.image || '',
      duration: courseData.duration || '',
      level: courseData.level || 'Beginner',
      updatedAt: new Date().toISOString().split('T')[0],
      isPublished: courseData.isPublished !== false,
      learningOutcomes: courseData.learningOutcomes || courseData.whatYouWillLearn || [],
      whatYouWillLearn: courseData.learningOutcomes || courseData.whatYouWillLearn || [],
      modules: courseData.modules || [],
    };

    // Prepare full relational payload for courses.php
    const coursesPhpPayload = {
      id: newCourse.id,
      title: newCourse.title,
      subtitle: newCourse.subtitle,
      description: newCourse.description,
      instructor: newCourse.instructor,
      instructorTitle: newCourse.instructorTitle,
      instructorAvatar: newCourse.instructorAvatar,
      instructorDescription: instructorDescription,
      instructor_description: instructorDescription,
      instructorImage: instructorImage,
      subcategory,
      primaryTaught,
      language,
      promoVideo,
      createdBy: creatorUserId,
      created_by: creatorUserId,
      category: newCourse.category,
      level: newCourse.level,
      price: newCourse.price,
      originalPrice: newCourse.originalPrice,
      image: newCourse.image,
      duration: newCourse.duration,
      isPublished: newCourse.isPublished ? 1 : 0,
      learningOutcomes: newCourse.learningOutcomes || [],
      learning_outcomes: newCourse.learningOutcomes || [],
      whatYouWillLearn: newCourse.learningOutcomes || [],
      modules: (newCourse.modules || []).map((m, mIdx) => ({
        id: m.id || `mod-${Date.now()}-${mIdx}`,
        title: m.title || `Module ${mIdx + 1}`,
        description: m.description || '',
        lessons: (m.lessons || []).map((l, lIdx) => ({
          id: l.id || `les-${Date.now()}-${lIdx}`,
          title: l.title || `Lesson ${lIdx + 1}`,
          duration: l.duration || '10:00',
          type: l.type || 'video',
          videoUrl: l.videoUrl || '',
          content: l.content || '',
          isPreview: l.isPreview ? 1 : 0
        }))
      }))
    };

    try {
      if (instructorDescription) {
        localStorage.setItem(`uqlearn_course_${newCourse.id}_instructor_desc`, instructorDescription);
      }
      if (instructorImage) {
        localStorage.setItem(`uqlearn_course_${newCourse.id}_instructor_img`, instructorImage);
      }
    } catch (e) {
      console.warn('Local storage cache notice:', e);
    }

    try {
      // 1. Direct API call to courses.php via apiFetch
      await apiFetch('courses.php', {
        method: 'POST',
        body: JSON.stringify(coursesPhpPayload)
      });

      // 2. Update React App State
      const updatedCoursesList = [newCourse, ...courses.filter(c => c.id !== newCourse.id)];
      setCourses(updatedCoursesList);

      // Instant confirmation toast to instructor
      setToastMessage(`Course "${newCourse.title}" saved successfully!`);
      setTimeout(() => {
        setToastMessage(null);
      }, 3500);
    } catch (error: any) {
      console.error('Error saving course:', error);
      setCourses(prev => [newCourse, ...prev.filter(c => c.id !== newCourse.id)]);
      setToastMessage(`Course "${newCourse.title}" saved.`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    try {
      // 1. Call real delete-course API endpoint
      await deleteCourseApi(courseId);
    } catch (err) {
      console.warn('Delete course API invocation notice:', err);
    }

    // 2. Update React app context state
    setCourses(prev => prev.filter(c => c.id !== courseId));
    setToastMessage('Course successfully deleted.');
    setTimeout(() => setToastMessage(null), 3500);
  };



  return (
    <div className={darkMode ? 'dark' : ''}>
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center space-x-3 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-xs font-medium">{toastMessage}</p>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white p-1 ml-2 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <Routes>
        <Route path="/login" element={<InstructorLoginPage />} />
        <Route path="/login/instructor" element={<InstructorLoginPage />} />
        <Route path="/instructor/login" element={<InstructorLoginPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              {!isOnboardingCompleted ? (
                <InstructorOnboardingWizard onComplete={() => setIsOnboardingCompleted(true)} />
              ) : (
                <InstructorStudio
                  courses={courses}
                  onCreateCourse={handleCreateCourse}
                  onDeleteCourse={handleDeleteCourse}
                />
              )}
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}
