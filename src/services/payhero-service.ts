import { apiFetch } from '../lib/apiConfig';
import { subscriptionService } from './subscription-service';
import { CourseSubscription, Course } from '../types';

export interface PayHeroConfig {
  id?: string;
  apiKey: string;
  apiSecret: string;
  authToken: string;
  channelId: string;
  provider: string; // default 'm-pesa'
  isActive: boolean;
  environment: 'sandbox' | 'production';
  updatedAt?: string;
}

export interface StkPushRequestParams {
  amount: number;
  currency?: string;
  phoneNumber: string;
  courseId: string;
  courseTitle: string;
  studentId: string;
  studentEmail: string;
  studentName: string;
}

export interface StkPushResponse {
  success: boolean;
  message: string;
  checkoutRequestId?: string;
  reference?: string;
  subscription?: CourseSubscription;
}

const DEFAULT_CONFIG: PayHeroConfig = {
  apiKey: '',
  apiSecret: '',
  authToken: '',
  channelId: '3501',
  provider: 'm-pesa',
  isActive: true,
  environment: 'production'
};

export const payheroService = {
  /**
   * Load PayHero Configuration from PHP Backend / Cache
   */
  async getPayHeroConfig(): Promise<PayHeroConfig> {
    try {
      const json = await apiFetch('payment-gateways.php', { silent: true }, 1);
      if (json && json.success && Array.isArray(json.data)) {
        const payheroGw = json.data.find((g: any) => g.slug === 'payhero' || (g.name && g.name.toLowerCase().includes('payhero')));
        if (payheroGw && payheroGw.apiKey && payheroGw.secretKey) {
          const auth = `Basic ${btoa(`${payheroGw.apiKey.trim()}:${payheroGw.secretKey.trim()}`)}`;
          return {
            apiKey: payheroGw.apiKey.trim(),
            apiSecret: payheroGw.secretKey.trim(),
            authToken: auth,
            channelId: '3501',
            provider: 'm-pesa',
            isActive: payheroGw.isActive ?? true,
            environment: payheroGw.environment || 'production'
          };
        }
      }
    } catch (e) {
      // Non-blocking fallback
    }

    try {
      const cached = localStorage.getItem('uqlearn_payhero_config');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.apiKey && !parsed.apiKey.includes('sample')) return parsed;
      }
    } catch {}

    return DEFAULT_CONFIG;
  },

  /**
   * Save PayHero Configuration to PHP Backend & localStorage
   */
  async savePayHeroConfig(config: PayHeroConfig): Promise<boolean> {
    const updated: PayHeroConfig = {
      ...config,
      updatedAt: new Date().toISOString()
    };

    try {
      // 1. Cache locally
      localStorage.setItem('uqlearn_payhero_config', JSON.stringify(updated));

      // 2. Post to PHP API
      apiFetch('payment-gateways.php', {
        method: 'POST',
        body: JSON.stringify({
          slug: 'payhero',
          name: 'PayHero M-Pesa',
          apiKey: updated.apiKey,
          secretKey: updated.apiSecret,
          isActive: updated.isActive,
          environment: updated.environment
        }),
        silent: true
      }).catch(() => {});

      return true;
    } catch (error) {
      console.error('Error saving PayHero config:', error);
      return true;
    }
  },

  /**
   * Sanitize phone number to standard East Africa format (e.g., 0712345678 or 254712345678)
   */
  formatPhoneNumber(phone: string): string {
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('254')) {
      return clean;
    }
    if (clean.startsWith('0')) {
      return '254' + clean.slice(1);
    }
    if (clean.length === 9) {
      return '254' + clean;
    }
    return clean;
  },

  /**
   * Initiate STK Push Payment via PayHero
   */
  async initiateStkPush(params: StkPushRequestParams): Promise<StkPushResponse> {
    const formattedPhone = this.formatPhoneNumber(params.phoneNumber);
    if (!formattedPhone || formattedPhone.length < 10) {
      return {
        success: false,
        message: 'Invalid phone number format. Please enter a valid M-Pesa mobile number (e.g. 0712345678).'
      };
    }

    const config = await this.getPayHeroConfig();
    const externalRef = `PAYHERO_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    const rawAmount = Number(params.amount);
    if (isNaN(rawAmount) || rawAmount <= 0) {
      return {
        success: false,
        message: 'Invalid course price. Amount must be greater than zero.'
      };
    }

    // Currency Normalization: If price < 100, assume USD store price and convert to KES @ 130 rate
    const isUsdStorePrice = rawAmount < 100 && (params.currency || 'USD') === 'USD';
    const amountKes = isUsdStorePrice ? Math.round(rawAmount * 130) : rawAmount;
    const amountUsd = isUsdStorePrice ? rawAmount : Number((rawAmount / 130).toFixed(2));

    // 1. First create pending subscription record with normalized KES and USD amounts
    const subscription = await subscriptionService.requestSubscription({
      studentId: params.studentId,
      studentName: params.studentName,
      studentEmail: params.studentEmail,
      courseId: params.courseId,
      courseTitle: params.courseTitle,
      coursePrice: amountKes,
      amountKes: amountKes,
      amountUsd: amountUsd,
      currency: 'KES',
      paymentMethod: 'payhero_stk',
      transactionCode: externalRef,
      notes: `PayHero M-Pesa STK Push initiated to ${formattedPhone} (KSh ${amountKes} / $${amountUsd} USD)`
    });

    try {
      // 2. Call backend PHP proxy endpoint with KES amount for M-Pesa processing
      const data = await apiFetch('payment_processing.php?action=stk_push', {
        method: 'POST',
        body: JSON.stringify({
          amount: amountKes,
          amount_usd: amountUsd,
          currency: 'KES',
          phone_number: formattedPhone,
          channel_id: Number(config.channelId) || 3501,
          provider: config.provider || 'm-pesa',
          external_reference: externalRef,
          course_id: params.courseId,
          course_title: params.courseTitle,
          student_id: params.studentId,
          student_name: params.studentName,
          student_email: params.studentEmail
        })
      });

      if (data && data.success === false) {
        return {
          success: false,
          message: data.message || 'PayHero M-Pesa STK Push request failed.',
          reference: externalRef
        };
      }

      if (data && (data.success === true || data.status === 'QUEUED' || data.CheckoutRequestID)) {
        return {
          success: true,
          message: data.message || `M-Pesa STK Push sent to ${formattedPhone}. Please check your phone and enter your M-Pesa PIN to authorize payment.`,
          checkoutRequestId: data.checkout_request_id || data.CheckoutRequestID || externalRef,
          reference: externalRef,
          subscription
        };
      }

      if (data && data.message) {
        return {
          success: false,
          message: data.message,
          reference: externalRef
        };
      }
    } catch (e) {
      console.warn('PayHero backend network call error:', e);
      return {
        success: false,
        message: 'Network error connecting to payment gateway server. Please try again.'
      };
    }

    return {
      success: false,
      message: 'Failed to initiate M-Pesa payment prompt.'
    };
  },

  /**
   * Initiate STK Push Payment via PayHero for multiple courses (Cart)
   */
  async initiateCartStkPush(params: {
    amount: number;
    phoneNumber: string;
    cart: Course[];
    studentId: string;
    studentEmail: string;
    studentName: string;
  }): Promise<StkPushResponse & { subscriptions?: CourseSubscription[] }> {
    const formattedPhone = this.formatPhoneNumber(params.phoneNumber);
    if (!formattedPhone || formattedPhone.length < 10) {
      return {
        success: false,
        message: 'Invalid phone number format. Please enter a valid M-Pesa mobile number (e.g. 0712345678).'
      };
    }

    const config = await this.getPayHeroConfig();
    const externalRef = `PAYHERO_CART_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    // 1. Create pending subscription records for ALL courses in cart
    const subscriptions: CourseSubscription[] = [];
    for (const course of params.cart) {
      const sub = await subscriptionService.requestSubscription({
        studentId: params.studentId,
        studentName: params.studentName,
        studentEmail: params.studentEmail,
        courseId: course.id,
        courseTitle: course.title,
        coursePrice: course.price,
        paymentMethod: 'online',
        transactionCode: externalRef,
        notes: `PayHero M-Pesa STK Push initiated for Cart to ${formattedPhone}`
      });
      subscriptions.push(sub);
    }

    const totalAmount = Number(params.amount);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      return {
        success: false,
        message: 'Invalid cart total amount. Amount must be greater than zero.'
      };
    }

    try {
      // 2. Call backend PHP proxy endpoint
      const data = await apiFetch('payment_processing.php?action=stk_push', {
        method: 'POST',
        body: JSON.stringify({
          amount: totalAmount,
          currency: 'USD',
          phone_number: formattedPhone,
          channel_id: Number(config.channelId) || 3501,
          provider: config.provider || 'm-pesa',
          external_reference: externalRef,
          course_id: 'CART_CHECKOUT',
          course_title: `Cart with ${params.cart.length} items`,
          student_id: params.studentId,
          student_name: params.studentName,
          student_email: params.studentEmail
        })
      });

      if (data && data.success === false) {
        return {
          success: false,
          message: data.message || 'PayHero M-Pesa STK Push request failed.',
          reference: externalRef
        };
      }

      if (data && (data.success === true || data.status === 'QUEUED' || data.CheckoutRequestID)) {
        return {
          success: true,
          message: data.message || `M-Pesa STK Push sent to ${formattedPhone}. Please check your phone and enter your M-Pesa PIN to authorize payment.`,
          checkoutRequestId: data.checkout_request_id || data.CheckoutRequestID || externalRef,
          reference: externalRef,
          subscriptions
        };
      }

      if (data && data.message) {
        return {
          success: false,
          message: data.message,
          reference: externalRef
        };
      }
    } catch (e) {
      console.warn('PayHero backend network call error:', e);
      return {
        success: false,
        message: 'Network error connecting to payment gateway server. Please try again.'
      };
    }

    return {
      success: false,
      message: 'Failed to initiate M-Pesa payment prompt.'
    };
  },

  /**
   * Check transaction status by reference
   */
  async checkTransactionStatus(reference: string): Promise<{ success: boolean; status: string; data?: any; message?: string }> {
    try {
      const data = await apiFetch(`payment_processing.php?action=status&reference=${encodeURIComponent(reference)}`);
      
      if (data && data.success && data.data) {
        let resolvedStatus = 'PENDING';
        let resolvedMessage = data.message || 'Waiting for payment confirmation...';
        
        // Handle standard PayHero callback structure
        if (data.data.response) {
          const phResponse = data.data.response;
          if (phResponse.Status) {
            resolvedStatus = phResponse.Status.toUpperCase();
          } else if (phResponse.ResultCode === 0) {
            resolvedStatus = 'SUCCESS';
          } else if (phResponse.ResultCode !== undefined) {
            resolvedStatus = 'FAILED';
          }
          resolvedMessage = phResponse.ResultDesc || resolvedMessage;
        } else {
          // Fallback if structured differently
          resolvedStatus = data.status || data.data.status || 'PENDING';
        }

        // Normalize status strings
        if (resolvedStatus === 'SUCCESSFUL') resolvedStatus = 'SUCCESS';

        return {
          success: true,
          status: resolvedStatus,
          data: data.data,
          message: resolvedMessage
        };
      }
      return {
        success: false,
        status: 'FAILED',
        message: data?.message || 'Transaction status unknown.'
      };
    } catch (e) {
      console.warn('Error checking transaction status:', e);
      return {
        success: false,
        status: 'ERROR',
        message: 'Network error checking payment status.'
      };
    }
  }
};
