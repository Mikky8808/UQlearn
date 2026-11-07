import { API_ENDPOINTS, apiFetch } from './apiConfig';

export interface EmailApiResponse {
  success: boolean;
  message: string;
  codeHint?: string;
  token?: string;
  user?: any;
  expiresIn?: number;
}

export interface VerificationModalState {
  isOpen: boolean;
  email: string;
  codeHint?: string;
  loading: boolean;
  error?: string;
  successMsg?: string;
}

/**
 * Client-side Email Service Wrapper for UQlearn Authentication & Verification
 */
export const emailService = {
  /**
   * Send 6-digit Login OTP verification code to user's email
   */
  async sendLoginOtp(email: string): Promise<EmailApiResponse> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }

    const data = await apiFetch(API_ENDPOINTS.SEND_LOGIN_OTP, {
      method: 'POST',
      body: JSON.stringify({ email: cleanEmail })
    });

    return {
      success: data?.success !== false,
      message: data?.message || `6-digit verification code sent to ${cleanEmail}`,
      codeHint: data?.codeHint
    };
  },

  /**
   * Verify an Email OTP code for login or sign-in flow
   */
  async verifyEmailOtp(email: string, code: string): Promise<EmailApiResponse> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }

    if (!cleanCode || cleanCode.length < 6) {
      throw new Error('Please enter all 6 digits of your verification code.');
    }

    const data = await apiFetch(API_ENDPOINTS.VERIFY_LOGIN_OTP, {
      method: 'POST',
      body: JSON.stringify({
        email: cleanEmail,
        otp: cleanCode
      })
    });

    return {
      success: data?.success !== false,
      message: data?.message || 'Email verified successfully!',
      token: data?.token,
      user: data?.user
    };
  },

  /**
   * Resend email verification code
   */
  async resendVerificationOtp(email: string): Promise<EmailApiResponse> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }

    const data = await apiFetch(API_ENDPOINTS.VERIFY_EMAIL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'resend',
        email: cleanEmail
      })
    });

    return {
      success: data?.success !== false,
      message: data?.message || 'Verification code resent successfully.',
      expiresIn: data?.expiresIn || 3600
    };
  }
};

export default emailService;
