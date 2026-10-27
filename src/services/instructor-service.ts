import { apiFetch } from '../lib/apiConfig';



export interface InstructorProfile {
  id: string;
  name: string;
  email: string;
  bio?: string;
  signature?: string;
  [key: string]: any;
}

export const instructorService = {
  /**
   * Fetches the instructor's profile details including their electronic signature.
   */
  getProfile: async (userId: string): Promise<InstructorProfile | null> => {
    try {
      const res = await apiFetch(`profile.php?id=${encodeURIComponent(userId)}&userId=${encodeURIComponent(userId)}&user_id=${encodeURIComponent(userId)}`);
      return res?.data || res || null;
    } catch (error) {
      console.error('Error fetching instructor profile:', error);
      return null;
    }
  },

  /**
   * Updates instructor profile including signature.
   */
  updateProfile: async (userId: string, data: Partial<InstructorProfile>) => {
    return apiFetch('profile.php', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        userId,
        id: userId,
        action: 'update_profile'
      })
    });
  },

  /**
   * Saves a signature specifically.
   */
  saveSignature: async (userId: string, signatureData: string) => {
    return apiFetch('signatures.php', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        user_id: userId,
        signature: signatureData
      })
    });
  },

  getOnboardingStatus: async (userId: string) => {
    return apiFetch(`instructor-onboarding.php?userId=${encodeURIComponent(userId)}`);
  },

  saveOnboardingStatus: async (data: any) => {
    return apiFetch('instructor-onboarding.php', { method: 'POST', body: JSON.stringify(data) });
  },

  getPayoutDetails: async (userId: string) => {
    return apiFetch(`instructor-payout.php?userId=${encodeURIComponent(userId)}&user_id=${encodeURIComponent(userId)}`);
  },

  savePayoutDetails: async (data: any) => {
    return apiFetch('instructor-payout.php', { method: 'POST', body: JSON.stringify(data) });
  },

  getCustomMailStatus: async (instructorId: string) => {
    return apiFetch(`custom-mail.php?action=status&instructor_id=${instructorId}`);
  }
};
