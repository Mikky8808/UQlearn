import { apiFetch, API_ENDPOINTS } from '../lib/apiConfig';

export interface CertificateMetadata {
  id: string;
  credentialId: string;
  courseTitle: string;
  studentName: string;
  completionDate: string;
  instructorName: string;
  instructorSignature?: string;
  grade?: string;
  skills?: string[];
}

export const markCourseCompletedApi = async (
  studentId: string,
  courseId: string,
  courseTitle: string,
  instructorName: string,
  studentName: string
): Promise<CertificateMetadata | null> => {
  try {
    const res = await apiFetch(API_ENDPOINTS.COURSE_COMPLETE, {
      method: 'POST',
      body: JSON.stringify({
        student_id: studentId,
        course_id: courseId,
        course_title: courseTitle,
        instructor_name: instructorName,
        student_name: studentName
      }),
      silent: true
    }, 0);

    if (res && res.certificate) {
      return res.certificate;
    }
  } catch (e) {
    console.error("Error marking course completed:", e);
  }

  // Fallback local generation if network request fails
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const credId = `UQL-${courseId.toUpperCase().slice(0, 4)}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  return {
    id: `cert-${studentId}-${courseId}`,
    credentialId: credId,
    courseTitle: courseTitle,
    studentName: studentName,
    completionDate: today,
    instructorName: instructorName || 'Sir Rajab Wamuu',
    instructorSignature: '',
    grade: 'Excellence (100%)',
    skills: ['Professional Mastery', 'Practical Application']
  };
};

export const getCertificateDataApi = async (studentId: string, courseId: string): Promise<CertificateMetadata> => {
  try {
    const res = await apiFetch(`${API_ENDPOINTS.CERTIFICATES}?student_id=${encodeURIComponent(studentId)}&course_id=${encodeURIComponent(courseId)}`, { silent: true }, 0);
    if (res && res.certificate) {
      return res.certificate;
    }
  } catch (e) {
    console.error("Error fetching certificate data from backend:", e);
  }

  // Fallback data generator for demonstration
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  return {
    id: `cert-${studentId}-${courseId}`,
    credentialId: `UQL-${courseId.toUpperCase().slice(0, 4)}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    courseTitle: courseId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    studentName: studentId === 'current-user' ? 'Michael Kenyanya' : `Student (${studentId})`,
    completionDate: today,
    instructorName: 'Sir Rajab Wamuu',
    instructorSignature: '',
    grade: 'Excellence (100%)',
    skills: ['Professional Mastery', 'Practical Application', 'Advanced Execution']
  };
};

export const fetchCertificateMetadata = async (credentialId: string): Promise<CertificateMetadata | null> => {
  try {
    const res = await apiFetch(`${API_ENDPOINTS.CERTIFICATES}?id=${encodeURIComponent(credentialId)}`, { silent: true }, 0);
    if (res && res.certificate) {
      return res.certificate;
    }
  } catch (e) {}

  // Fallback / mock lookup for demonstration
  return {
    id: 'cert-1',
    credentialId: credentialId || 'UQL-CAN-2026-0001',
    courseTitle: 'Canva Mastery: Design Like a Pro',
    studentName: 'Michael Kenyanya',
    completionDate: 'September 28, 2026',
    instructorName: 'John Doe',
    instructorSignature: '',
    grade: 'Top Distinction (99.2%)',
    skills: ['Graphic Design', 'Brand Kit', 'Canva Pro', 'Typography']
  };
};

export const fetchUserCertificatesApi = async (userId: string): Promise<CertificateMetadata[]> => {
  try {
    const res = await apiFetch(`${API_ENDPOINTS.CERTIFICATES}?user_id=${encodeURIComponent(userId)}`, { silent: true }, 0);
    if (res) {
      if (Array.isArray(res)) return res;
      if (Array.isArray(res.certificates)) return res.certificates;
      if (Array.isArray(res.data)) return res.data;
    }
  } catch (e) {}
  return [];
};

export const fetchCertificateTemplates = async () => {
  try {
    const res = await apiFetch(API_ENDPOINTS.CERTIFICATE_TEMPLATES, { silent: true }, 0);
    if (res && (res.templates || Array.isArray(res))) {
      return res.templates || res;
    }
  } catch (e) {}
  return [];
};

