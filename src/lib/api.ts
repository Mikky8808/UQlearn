// Frontend API Client utility for backend communication with uqlearn.org/api/v1/...
import { API_BASE_URL, API_ENDPOINTS, apiFetch, uploadImageApi } from './apiConfig';

export const apiClient = {
  // Courses API (Connected directly to uqlearn.org/api/v1/courses.php)
  courses: {
    getAll: async (params?: { category?: string; search?: string; instructor?: string }) => {
      try {
        const query = new URLSearchParams(params as any).toString();
        const url = `${API_ENDPOINTS.COURSES}${query ? `?${query}` : ''}`;
        return await apiFetch(url);
      } catch (err) {
        console.warn('Fetch from courses API failed:', err);
        throw err;
      }
    },

    getById: async (id: string) => {
      try {
        return await apiFetch(API_ENDPOINTS.COURSE_DETAIL(id));
      } catch (err) {
        console.warn('Fetch from course detail failed:', err);
        throw err;
      }
    },

    create: async (courseData: any) => {
      try {
        return await apiFetch(API_ENDPOINTS.COURSES, {
          method: 'POST',
          body: JSON.stringify(courseData)
        });
      } catch (err) {
        console.warn('Failed to save to MySQL backend:', err);
        throw err;
      }
    },

    update: async (id: string, courseData: any) => {
      return await apiFetch(`${API_ENDPOINTS.COURSES}?id=${id}`, {
        method: 'POST', // PHP handles updates often via POST with action or ID
        body: JSON.stringify({ action: 'update', ...courseData })
      });
    },

    delete: async (id: string) => {
      return await apiFetch(`${API_ENDPOINTS.COURSES}?id=${id}`, { method: 'DELETE' });
    },

    updateCurriculum: async (id: string, modules: any[]) => {
      return await apiFetch(`${API_ENDPOINTS.COURSES}?id=${id}`, {
        method: 'POST',
        body: JSON.stringify({ action: 'update_curriculum', modules })
      });
    }
  },

  // Auth & Verification API on uqlearn.org
  auth: {
    login: async (credentials: { email: string; password?: string; role?: string }) => {
      return apiFetch(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
    },

    register: async (registrationData: {
      firstName: string;
      lastName: string;
      email: string;
      password?: string;
      role?: string;
      phoneCountry?: string;
      phoneNumber?: string;
      preferredLanguage?: string;
    }) => {
      return apiFetch(API_ENDPOINTS.REGISTER, {
        method: 'POST',
        body: JSON.stringify(registrationData)
      });
    },

    verifyEmail: async (email: string, otp: string) => {
      return apiFetch(API_ENDPOINTS.VERIFY_EMAIL, {
        method: 'POST',
        body: JSON.stringify({ action: 'verify', email, otp })
      });
    },

    resendOtp: async (email: string) => {
      return apiFetch(API_ENDPOINTS.VERIFY_EMAIL, {
        method: 'POST',
        body: JSON.stringify({ action: 'resend', email })
      });
    }
  },

  // Database Sync API on uqlearn.org
  sync: {
    getStatus: async () => {
      return apiFetch(API_ENDPOINTS.SYNC_STATUS);
    },

    getTableData: async (tableName: string, limit = 100, offset = 0) => {
      return apiFetch(API_ENDPOINTS.SYNC_TABLE(tableName, limit, offset));
    },

    exportAll: async () => {
      return apiFetch(API_ENDPOINTS.SYNC_EXPORT);
    },

    upsertPayload: async (payload: any) => {
      return apiFetch(API_ENDPOINTS.SYNC, {
        method: 'POST',
        body: JSON.stringify({ action: 'sync_upsert', payload })
      });
    },

    generateSql: async () => {
      return apiFetch(API_ENDPOINTS.SYNC_SQL);
    }
  },

  // Quizzes API
  quizzes: {
    getForLesson: async (courseId: string, lessonId: string) => {
      return apiFetch(`${API_ENDPOINTS.QUIZZES}?action=get&courseId=${courseId}&lessonId=${lessonId}`);
    },

    saveToLesson: async (courseId: string, lessonId: string, quizData: any) => {
      return apiFetch(API_ENDPOINTS.QUIZZES, {
        method: 'POST',
        body: JSON.stringify({ action: 'save', courseId, lessonId, ...quizData })
      });
    },

    submit: async (payload: { quizId: string; answers: Record<string, string>; questions: any[] }) => {
      return apiFetch(API_ENDPOINTS.QUIZZES, {
        method: 'POST',
        body: JSON.stringify({ action: 'submit', ...payload })
      });
    }
  },

  // Gemini AI Assistant API (Proxied or moved to PHP)
  ai: {
    generateSyllabus: async (topic: string, category?: string, level?: string) => {
      return apiFetch(API_ENDPOINTS.AI, {
        method: 'POST',
        body: JSON.stringify({ action: 'generate-syllabus', topic, category, level })
      });
    },

    generateLessonNotes: async (lessonTitle: string, courseTitle?: string) => {
      return apiFetch(API_ENDPOINTS.AI, {
        method: 'POST',
        body: JSON.stringify({ action: 'generate-lesson-notes', lessonTitle, courseTitle })
      });
    },

    generateQuizQuestions: async (topic: string, count: number = 3) => {
      return apiFetch(API_ENDPOINTS.AI, {
        method: 'POST',
        body: JSON.stringify({ action: 'generate-quiz-questions', topic, count })
      });
    }
  },

  // Analytics API
  analytics: {
    get: async () => {
      return apiFetch(API_ENDPOINTS.ANALYTICS);
    }
  },

  // Purchases & Coupons API
  purchases: {
    getAll: async () => {
      return apiFetch(API_ENDPOINTS.PURCHASES);
    },

    create: async (data: { courseId: string; courseTitle: string; amount: number; paymentMethod?: string; couponCode?: string }) => {
      return apiFetch(API_ENDPOINTS.PURCHASES, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    verifyCoupon: async (code: string) => {
      return apiFetch(`${API_ENDPOINTS.PURCHASES}?action=verify_coupon&code=${code}`);
    }
  },

  // Communication & Q&A API
  messages: {
    getAll: async () => {
      return apiFetch(API_ENDPOINTS.MESSAGES);
    },

    reply: async (messageId: string, reply: { senderName: string; senderRole: string; content: string }) => {
      return apiFetch(API_ENDPOINTS.MESSAGES, {
        method: 'POST',
        body: JSON.stringify({ action: 'reply', messageId, ...reply })
      });
    }
  },

  courseMessages: {
    getByCourseId: async (courseId: string) => {
      return apiFetch(`${API_ENDPOINTS.COURSE_MESSAGES}?course_id=${encodeURIComponent(courseId)}`);
    },
    save: async (data: { course_id: string; welcome_message: string; congratulations_message: string }) => {
      return apiFetch(API_ENDPOINTS.COURSE_MESSAGES, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    }
  },

  // Media & Image Uploads (Stores in timestamped path under /uploads/courses/)
  upload: {
    image: async (fileData: string, fileName?: string, folder: 'courses' | 'avatars' = 'courses') => {
      return uploadImageApi(fileData, fileName, folder);
    }
  },

  promoVideos: {
    getByCourseId: async (courseId: string) => {
      return apiFetch(`${API_ENDPOINTS.PROMOTIONAL_VIDEOS}?course_id=${encodeURIComponent(courseId)}`);
    },
    save: async (courseId: string, videoPath: string) => {
      return apiFetch(API_ENDPOINTS.PROMOTIONAL_VIDEOS, {
        method: 'POST',
        body: JSON.stringify({ course_id: courseId, video_path: videoPath })
      });
    }
  },

  users: {
    getAll: async (role?: string) => {
      const url = role && role !== 'All' ? `${API_ENDPOINTS.USERS}?role=${role}` : API_ENDPOINTS.USERS;
      return apiFetch(url);
    },
    update: async (id: string, updates: any) => {
      return apiFetch(`${API_ENDPOINTS.USERS}?id=${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
    },
    delete: async (id: string) => {
      return apiFetch(`${API_ENDPOINTS.USERS}?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
    }
  },

  // Admin Actions
  priceAdjustments: {
    getAll: async (status?: string) => {
      const url = status && status !== 'all' ? `${API_ENDPOINTS.PRICE_ADJUSTMENTS}?status=${status}` : API_ENDPOINTS.PRICE_ADJUSTMENTS;
      return apiFetch(url);
    },
    create: async (data: any) => {
      return apiFetch(API_ENDPOINTS.PRICE_ADJUSTMENTS, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    update: async (id: string, updates: any) => {
      return apiFetch(`${API_ENDPOINTS.PRICE_ADJUSTMENTS}?id=${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
    },
    delete: async (id: string) => {
      return apiFetch(`${API_ENDPOINTS.PRICE_ADJUSTMENTS}?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
    },
    executeAction: async (id: string, action: string) => {
      return apiFetch(`${API_ENDPOINTS.PRICE_ADJUSTMENTS}?id=${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify({ action })
      });
    }
  },

  // Q&A API
  qna: {
    getAll: async () => {
      try {
        const response = await apiFetch(API_ENDPOINTS.QNA);
        if (response && Array.isArray(response) && response.length > 0) {
          return response;
        }
      } catch (e) {
        console.warn("API load all failed, aggregating local storage Q&A:", e);
      }
      const aggregated: any[] = [];
      const seenIds = new Set<string>();
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('uqlearn_qna_course_')) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const list = JSON.parse(raw);
              if (Array.isArray(list)) {
                list.forEach(item => {
                  if (item && item.id && !seenIds.has(item.id)) {
                    seenIds.add(item.id);
                    aggregated.push(item);
                  }
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn("Error reading localStorage Q&A:", err);
      }
      return aggregated;
    },
    getForCourse: async (courseId: string) => {
      try {
        const response = await apiFetch(`${API_ENDPOINTS.QNA}?courseId=${encodeURIComponent(courseId)}`);
        if (response && Array.isArray(response)) {
          return response;
        }
        const key = `uqlearn_qna_course_${courseId}`;
        const data = localStorage.getItem(key);
        if (data) return JSON.parse(data);
        return [];
      } catch (e) {
        console.warn("API load failed, falling back to local storage Q&A:", e);
        const key = `uqlearn_qna_course_${courseId}`;
        const data = localStorage.getItem(key);
        if (data) return JSON.parse(data);
        return [];
      }
    },
    saveForCourse: async (courseId: string, questions: any[]) => {
      try {
        const key = `uqlearn_qna_course_${courseId}`;
        localStorage.setItem(key, JSON.stringify(questions));
      } catch (e) {
        console.error("Local save failed:", e);
      }

      try {
        await apiFetch(API_ENDPOINTS.QNA, {
          method: 'POST',
          body: JSON.stringify({ courseId, questions })
        });
        return { success: true };
      } catch (e) {
        console.warn("Backend save failed, saved locally:", e);
        return { success: true };
      }
    }
  }
};
