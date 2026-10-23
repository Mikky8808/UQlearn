/**
 * Video Progress Tracking Service
 * Captures current video timestamps and syncs them with the 'video_playback_progress'
 * MySQL database table via the '/api/v1/video-progress.php' endpoint.
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
   * Save or update video playback progress in the MySQL database
   */
  async saveProgress(record: {
    userId: string;
    lessonId: string;
    courseId?: string;
    currentTime: number;
    duration: number;
    percentage: number;
  }): Promise<boolean> {
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
        })
      });
      return res.success;
    } catch (e) {
      console.error('[ProgressTrackingService] Failed to save progress:', e);
      return false;
    }
  },

  /**
   * Get saved progress for a specific lesson and user from MySQL database
   */
  async getLessonProgress(userId: string, lessonId: string): Promise<VideoProgressRecord | null> {
    try {
      const endpoint = `${API_ENDPOINTS.VIDEO_PROGRESS}?user_id=${encodeURIComponent(userId)}&lesson_id=${encodeURIComponent(lessonId)}`;
      const res = await apiFetch(endpoint);
      if (res.success && res.data) {
        return res.data;
      }
      return null;
    } catch (e) {
      console.error('[ProgressTrackingService] Failed to fetch lesson progress:', e);
      return null;
    }
  },

  /**
   * Get all watch progress for a user in a course
   */
  async getCourseProgress(userId: string, courseId: string): Promise<Record<string, VideoProgressRecord>> {
    try {
      const endpoint = `${API_ENDPOINTS.VIDEO_PROGRESS}?user_id=${encodeURIComponent(userId)}&course_id=${encodeURIComponent(courseId)}`;
      const res = await apiFetch(endpoint);
      if (res.success && Array.isArray(res.data)) {
        const map: Record<string, VideoProgressRecord> = {};
        for (const item of res.data) {
          map[item.lesson_id] = item;
        }
        return map;
      }
      return {};
    } catch (e) {
      console.error('[ProgressTrackingService] Failed to fetch course progress:', e);
      return {};
    }
  }
};
