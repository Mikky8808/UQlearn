import { apiFetch } from '../lib/apiConfig';

export interface InstructorSignatureData {
  success: boolean;
  signatureData: string;
  instructorId: string;
}

/**
 * Dedicated service for retrieving instructor-specific electronic signatures.
 * This service ensures that completion certificates render the unique handwritten 
 * signature of the course creator.
 */
export const instructorSignatureService = {
  /**
   * Fetches the signature for a specific instructor using their ID.
   * 
   * @param instructorId The unique identifier for the instructor (user ID)
   * @returns A promise resolving to the signature data (Base64 string or image URL)
   */
  getInstructorSignature: async (instructorId: string): Promise<InstructorSignatureData> => {
    try {
      // 1. Handle CEO specifically (base endpoint returns CEO signature)
      if (instructorId === 'ceo') {
        const ceoRes = await apiFetch('signatures.php');
        if (ceoRes && (ceoRes.signatureData || ceoRes.signature)) {
          return {
            success: true,
            signatureData: ceoRes.signatureData || ceoRes.signature,
            instructorId: 'ceo'
          };
        }
      }

      // 2. Prioritize the dedicated signature retrieval endpoint pattern for instructors
      const res = await apiFetch(`signatures.php?action=get_signature&instructor_id=${encodeURIComponent(instructorId)}`);
      
      if (res && (res.signatureData || res.signature)) {
        return {
          success: true,
          signatureData: res.signatureData || res.signature,
          instructorId
        };
      }

      // Fallback: Check the instructor's profile which may contain the signature field
      const profileRes = await apiFetch(`profile.php?id=${encodeURIComponent(instructorId)}`);
      if (profileRes && profileRes.data && profileRes.data.signature) {
        return {
          success: true,
          signatureData: profileRes.data.signature,
          instructorId
        };
      }

      return {
        success: false,
        signatureData: '',
        instructorId
      };
    } catch (error) {
      console.warn(`[SignatureService] Failed to fetch signature for instructor ${instructorId}:`, error);
      return {
        success: false,
        signatureData: '',
        instructorId
      };
    }
  },

  /**
   * Helper to determine if a string is a valid signature image payload
   */
  isValidSignature: (signature: string | undefined | null): boolean => {
    if (!signature || typeof signature !== 'string') return false;
    const s = signature.trim();
    if (!s || s === 'null' || s === 'undefined' || s.length < 5) return false;
    return (
      s.startsWith('data:image/') || 
      s.startsWith('http') || 
      s.startsWith('/') || 
      s.includes('.png') || 
      s.includes('.jpg') || 
      s.includes('.jpeg') || 
      s.includes('.svg')
    );
  }
};
