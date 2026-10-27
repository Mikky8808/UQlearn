/**
 * Video Progress Tracking Service
 * Captures current video timestamps and syncs them with the 'video_playback_progress'
 * MySQL database table via the '/api/v1/video-progress.php' endpoint with offline localStorage fallback.
 */

import { API_ENDPOINTS, apiFetch } from '../lib/apiConfig';

export interface VideoProgressRecord {
  id: string;
  user_id: string;
  lesson_id: string;
  course_id?: string;
  current_time: number;
  duration: number;
  percentage: number;
  updated_at?: string;
}

export const progressTrackingService = {
  /**
   * Save or update video playback progress in the MySQL database & local cache
   */
  async saveProgress(record: {
    userId: string;
    lessonId: string;
    courseId?: string;
    currentTime: number;
    duration: number;
    percentage: number;
  }): Promise<boolean> {
    // 1. Sync to localStorage for immediate resilience
    if (record.courseId && typeof localStorage !== 'undefined') {
      try {
        const key = `uqlearn_watch_progress_${record.courseId}`;
        const current = JSON.parse(localStorage.getItem(key) || '{}');
        current[record.lessonId] = {
          currentTime: record.currentTime,
          duration: record.duration,
          percentage: record.percentage
        };
        localStorage.setItem(key, JSON.stringify(current));
      } catch {}
    }

    // 2. Sync to backend API silently (non-blocking)
    try {
      const res = await apiFetch(API_ENDPOINTS.VIDEO_PROGRESS, {
        method: 'POST',
        body: JSON.stringify({
          user_id: record.userId,
          lesson_id: record.lessonId,
          course_id: record.courseId || '',
          current_time: record.currentTime,
          duration: record.duration,
          percentage: record.percentage
        }),
        silent: true
      });
      return Boolean(res?.success);
    } catch {
      return false;
    }
  },

  /**
   * Get saved progress for a specific lesson and user from MySQL database with local fallback
   */
  async getLessonProgress(userId: string, lessonId: string, courseId?: string): Promise<VideoProgressRecord | null> {
    try {
      const endpoint = `${API_ENDPOINTS.VIDEO_PROGRESS}?user_id=${encodeURIComponent(userId)}&lesson_id=${encodeURIComponent(lessonId)}`;
      const res = await apiFetch(endpoint, { silent: true });
      if (res && res.success && res.data) {
        return res.data;
      }
    } catch {}

    // Fallback to localStorage
    if (courseId && typeof localStorage !== 'undefined') {
      try {
        const key = `uqlearn_watch_progress_${courseId}`;
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed[lessonId]) {
            return {
              id: `local_${lessonId}`,
              user_id: userId,
              lesson_id: lessonId,
              course_id: courseId,
              current_time: parsed[lessonId].currentTime || 0,
              duration: parsed[lessonId].duration || 0,
              percentage: parsed[lessonId].percentage || 0
            };
          }
        }
      } catch {}
    }

    return null;
  },

  /**
   * Get all watch progress for a user in a course
   */
  async getCourseProgress(userId: string, courseId: string): Promise<Record<string, VideoProgressRecord>> {
    try {
      const endpoint = `${API_ENDPOINTS.VIDEO_PROGRESS}?user_id=${encodeURIComponent(userId)}&course_id=${encodeURIComponent(courseId)}`;
      const res = await apiFetch(endpoint, { silent: true });
      if (res && res.success && Array.isArray(res.data)) {
        const map: Record<string, VideoProgressRecord> = {};
        for (const item of res.data) {
          map[item.lesson_id] = item;
        }
        return map;
      }
    } catch {}

    // Fallback to localStorage cache
    if (typeof localStorage !== 'undefined' && courseId) {
      try {
        const key = `uqlearn_watch_progress_${courseId}`;
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          const map: Record<string, VideoProgressRecord> = {};
          for (const [lesId, item] of Object.entries(parsed as Record<string, any>)) {
            map[lesId] = {
              id: `local_${lesId}`,
              user_id: userId,
              lesson_id: lesId,
              course_id: courseId,
              current_time: item.currentTime || 0,
              duration: item.duration || 0,
              percentage: item.percentage || 0
            };
          }
          return map;
        }
      } catch {}
    }

    return {};
  }
};
