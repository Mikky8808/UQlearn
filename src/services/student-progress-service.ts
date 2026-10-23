import { StudentCourseProgress } from '../types';
import { apiFetch } from '../lib/apiConfig';

export const studentProgressService = {
  /**
   * Save or update student's completed lessons & calculated progress percentage
   */
  async saveStudentProgress(params: {
    studentId: string;
    courseId: string;
    completedLessonIds: string[];
    lastLessonId?: string;
    totalLessonsCount: number;
  }): Promise<StudentCourseProgress> {
    const progId = `prog_${params.studentId}_${params.courseId}`.replace(/[^a-zA-Z0-9_]/g, '_');
    const total = Math.max(1, params.totalLessonsCount);
    const completedCount = params.completedLessonIds.length;
    const progressPercent = Math.min(100, Math.round((completedCount / total) * 100));

    const progressRecord: StudentCourseProgress = {
      id: progId,
      studentId: params.studentId,
      courseId: params.courseId,
      completedLessonIds: params.completedLessonIds,
      ...(params.lastLessonId ? { lastLessonId: params.lastLessonId } : {}),
      progressPercent,
      updatedAt: new Date().toISOString()
    };

    try {
      // 1. Local storage cache
      localStorage.setItem(`uqlearn_prog_${params.studentId}_${params.courseId}`, JSON.stringify(progressRecord));

      // 2. Post to PHP backend API
      apiFetch('course-progress.php', {
        method: 'POST',
        body: JSON.stringify(progressRecord),
        silent: true
      }).catch(() => {});

      return progressRecord;
    } catch (error) {
      console.warn('Error saving student progress:', error);
      return progressRecord;
    }
  },

  /**
   * Get student course progress
   */
  async getStudentProgress(studentId: string, courseId: string): Promise<StudentCourseProgress | null> {
    // 1. Check local storage cache
    try {
      const cached = localStorage.getItem(`uqlearn_prog_${studentId}_${courseId}`);
      if (cached) return JSON.parse(cached);
    } catch (e) {}

    // 2. Fetch from PHP API
    try {
      const res = await apiFetch(`course-progress.php?student_id=${encodeURIComponent(studentId)}&course_id=${encodeURIComponent(courseId)}`, { silent: true }, 1);
      if (res && res.success && res.data) {
        localStorage.setItem(`uqlearn_prog_${studentId}_${courseId}`, JSON.stringify(res.data));
        return res.data;
      }
    } catch (e) {
      // Non-blocking
    }

    return null;
  },

  /**
   * Listen to progress updates
   */
  subscribeToStudentProgress(
    studentId: string, 
    courseId: string, 
    callback: (progress: StudentCourseProgress | null) => void
  ): () => void {
    // Load initial
    this.getStudentProgress(studentId, courseId).then(callback);

    // Listen to local storage storage events
    const handleStorage = (e: StorageEvent) => {
      if (e.key === `uqlearn_prog_${studentId}_${courseId}`) {
        try {
          callback(e.newValue ? JSON.parse(e.newValue) : null);
        } catch {
          callback(null);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }
};
