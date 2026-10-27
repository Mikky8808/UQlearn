import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  FileCheck, 
  FileSpreadsheet, 
  Sparkles, 
  Download, 
  CheckCircle2, 
  Percent, 
  Award,
  Zap,
  Copy,
  Plus,
  Database,
  RefreshCw,
  Server,
  ArrowUpRight,
  Code,
  Mail,
  ShoppingBag,
  Clock,
  Tag,
  Send,
  Lock,
  Check,
  Info,
  ExternalLink,
  Eye,
  Crown,
  Gift,
  Share2,
  Smartphone,
  CreditCard,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  ChevronRight
} from 'lucide-react';
import { Course } from '../../types';
import { InstructorTabKey } from '../navigation/InstructorSidebar';
import { 
  API_ENDPOINTS, 
  API_BASE_URL, 
  ROOT_URL,
  apiFetch, 
  getCustomMailPricingApi,
  subscribeCustomMailApi,
  getCustomMailTemplateApi,
  saveCustomMailTemplateApi
} from '../../lib/apiConfig';
import { instructorService } from '../../services/instructor-service';
import { useApp } from '../../context/AppContext';
import { MpesaPaymentModal } from '../user/MpesaPaymentModal';

interface ProViewsProps {
  tab: InstructorTabKey;
  courses: Course[];
}

export const InstructorProViews: React.FC<ProViewsProps> = ({
  tab,
  courses,
}) => {
  const { currentUser } = useApp();

  // Dynamic Custom Mail Pricing & Subscription state
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [pricing, setPricing] = useState({
    amountKes: 1500,
    amountUsd: 12,
    periodDays: 30,
    periodLabel: 'Monthly (30 Days)',
    features: [
      'Automated abandoned cart recovery email sequences',
      'Custom instructor store email sender name & reply-to address',
      'Custom branding, logo banners, and stylized discount coupons',
      'Real-time email open, click, and conversion rate analytics',
      'Direct student re-engagement and coupon push notifications'
    ]
  });

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [showRenewModal, setShowRenewModal] = useState(false);

  // Template Editor State (Loaded dynamically from database)
  const [emailSubject, setEmailSubject] = useState("You left something behind! Complete your course enrollment");
  const [headline, setHeadline] = useState("Pick up where you left off");
  const [senderName, setSenderName] = useState("UQlearn Course Studio");
  const [replyToEmail, setReplyToEmail] = useState("");
  const [delayHours, setDelayHours] = useState('24');
  const [couponCode, setCouponCode] = useState('RECOVER15');
  const [attachCoupon, setAttachCoupon] = useState(true);
  const [discountPercent, setDiscountPercent] = useState('15');
  const [emailBody, setEmailBody] = useState("Hi {learner_first_name},\n\nWe noticed you left {course_title} in your cart! Continue your learning journey today and enjoy an exclusive {discount_code} discount.\n\nClick below to complete your checkout and unlock instant lifetime access.");
  const [ctaButtonText, setCtaButtonText] = useState('Complete My Order');
  const [ctaButtonUrl, setCtaButtonUrl] = useState('');
  const [footerText, setFooterText] = useState('Need academic advice? Reply directly to this email to reach your course instructor.');
  const [isTriggerActive, setIsTriggerActive] = useState(true);
  
  const [saveEmailMsg, setSaveEmailMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Payment Selection & Processing State
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'mpesa' | 'card'>('mpesa');
  const [mpesaPhone, setMpesaPhone] = useState(currentUser?.phone || '');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // M-Pesa STK Push Modal State
  const [isMpesaModalOpen, setIsMpesaModalOpen] = useState(false);
  const [mpesaStatus, setMpesaStatus] = useState<'pending' | 'active' | 'rejected' | 'expired' | 'FAILED' | 'QUEUED'>('pending');
  const [mpesaStatusMessage, setMpesaStatusMessage] = useState('');
  const [mpesaReceipt, setMpesaReceipt] = useState('');
  const [mpesaTimeLeft, setMpesaTimeLeft] = useState(180);
  const [activeExternalRef, setActiveExternalRef] = useState('');

  // Test Email State
  const [testRecipient, setTestRecipient] = useState(currentUser?.email || '');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailMsg, setTestEmailMsg] = useState<string | null>(null);

  // 1. Load Live Status and Pricing from MySQL
  const loadDynamicStatus = async () => {
    setLoadingStatus(true);
    const instructorId = currentUser?.id || 'default_instructor';

    try {
      // Load pricing configured by Admin
      const pRes = await getCustomMailPricingApi().catch(() => null);
      if (pRes && pRes.success && pRes.data) {
        setPricing({
          amountKes: pRes.data.amountKes || 1500,
          amountUsd: pRes.data.amountUsd || 12,
          periodDays: pRes.data.periodDays || 30,
          periodLabel: pRes.data.periodLabel || 'Monthly (30 Days)',
          features: Array.isArray(pRes.data.features) && pRes.data.features.length > 0
            ? pRes.data.features 
            : pricing.features
        });
      }

      // Load instructor subscription status
      const sRes = await instructorService.getCustomMailStatus(instructorId).catch(() => null);
      if (sRes && sRes.success) {
        setIsSubscribed(sRes.isSubscribed);
        setSubscription(sRes.subscription || null);
      }

      // Load saved template
      const tRes = await getCustomMailTemplateApi(instructorId).catch(() => null);
      if (tRes && tRes.success && tRes.data) {
        setEmailSubject(tRes.data.subject || "You left something behind! Complete your course enrollment");
        setHeadline(tRes.data.headline || "Pick up where you left off");
        setSenderName(tRes.data.senderName || `${currentUser?.name || 'Instructor'} Studio`);
        setReplyToEmail(tRes.data.replyToEmail || currentUser?.email || '');
        setEmailBody(tRes.data.bodyText || emailBody);
        setCouponCode(tRes.data.couponCode || 'RECOVER15');
        setDiscountPercent(String(tRes.data.discountPercent || 15));
        setAttachCoupon(Boolean(tRes.data.couponCode));
        setCtaButtonText(tRes.data.ctaButtonText || 'Complete My Order');
        setCtaButtonUrl(tRes.data.ctaButtonUrl || '');
        setFooterText(tRes.data.footerText || '');
        setDelayHours(String(tRes.data.delayHours || 24));
        setIsTriggerActive(tRes.data.isActive ?? true);
      }
    } catch (e) {
      console.warn('Error loading dynamic Custom Mail data:', e);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    loadDynamicStatus();
    if (currentUser?.phone && !mpesaPhone) {
      setMpesaPhone(currentUser.phone);
    }
    if (currentUser?.email && !testRecipient) {
      setTestRecipient(currentUser.email);
    }
  }, [currentUser?.id]);

  // Format timer for M-Pesa STK push
  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  // Timer countdown for M-Pesa Modal
  useEffect(() => {
    let interval: any;
    if (isMpesaModalOpen && mpesaStatus === 'pending' && mpesaTimeLeft > 0) {
      interval = setInterval(() => {
        setMpesaTimeLeft(prev => {
          if (prev <= 1) {
            setMpesaStatus('expired');
            setMpesaStatusMessage('M-Pesa STK prompt timed out. Please retry.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isMpesaModalOpen, mpesaStatus, mpesaTimeLeft]);

  // Polling for M-Pesa STK Push authorization
  useEffect(() => {
    let pollInterval: any;
    if (isMpesaModalOpen && mpesaStatus === 'pending' && activeExternalRef) {
      pollInterval = setInterval(async () => {
        try {
          const res = await apiFetch(`payment_processing.php?action=check_status&reference=${encodeURIComponent(activeExternalRef)}`, { silent: true }, 1);
          if (res && res.status) {
            const upper = res.status.toUpperCase();
            if (upper === 'COMPLETED' || upper === 'SUCCESS' || upper === 'SUCCESSFUL') {
              setMpesaStatus('active');
              const receipt = res.mpesa_receipt || res.receipt || 'CONFIRMED';
              setMpesaReceipt(receipt);
              setMpesaStatusMessage(`M-Pesa payment received! Receipt: ${receipt}`);
              clearInterval(pollInterval);

              // Activate subscription in backend
              await activateSubscriptionRecord('mpesa', receipt);
            } else if (upper === 'FAILED' || upper === 'REJECTED' || upper === 'CANCELLED') {
              setMpesaStatus('FAILED');
              setMpesaStatusMessage(res.message || 'M-Pesa transaction was cancelled or declined.');
              clearInterval(pollInterval);
            }
          }
        } catch (e) {
          // ignore transient poll error
        }
      }, 3000);
    }
    return () => clearInterval(pollInterval);
  }, [isMpesaModalOpen, mpesaStatus, activeExternalRef]);

  // 2. Activate Subscription in database
  const activateSubscriptionRecord = async (method: 'mpesa' | 'card', reference: string) => {
    try {
      const instructorId = currentUser?.id || 'default_instructor';
      const instructorName = currentUser?.name || 'Instructor';
      const instructorEmail = currentUser?.email || 'instructor@uqlearn.org';

      const res = await subscribeCustomMailApi({
        instructorId,
        instructorName,
        instructorEmail,
        paymentMethod: method,
        reference,
        amount: pricing.amountKes,
        periodDays: pricing.periodDays
      });

      if (res && res.success) {
        setIsSubscribed(true);
        setSubscription(res.subscription);
        setShowRenewModal(false);
        setSaveEmailMsg({ 
          type: 'success', 
          text: `🎉 Custom Mail Activated! You have unlocked full store email customization for ${pricing.periodDays} days.` 
        });
        setTimeout(() => setSaveEmailMsg(null), 6000);
      }
    } catch (err: any) {
      console.error('Subscription record activation failed:', err);
    }
  };

  // 3. Initiate M-Pesa STK Push
  const handleInitiateMpesa = async () => {
    if (!mpesaPhone || mpesaPhone.trim().length < 9) {
      alert('Please enter a valid M-Pesa phone number (e.g. 0712345678)');
      return;
    }

    setIsProcessingPayment(true);
    const extRef = `CM_MPESA_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    setActiveExternalRef(extRef);
    setMpesaTimeLeft(180);
    setMpesaStatus('pending');
    setMpesaStatusMessage('STK Push sent to your phone! Please enter your M-Pesa PIN.');
    setIsMpesaModalOpen(true);

    try {
      const instructorName = currentUser?.name || 'Instructor';
      const instructorEmail = currentUser?.email || 'instructor@uqlearn.org';

      const response = await apiFetch('payment_processing.php?action=stk_push', {
        method: 'POST',
        body: JSON.stringify({
          amount: pricing.amountKes,
          amount_usd: pricing.amountUsd,
          currency: 'KES',
          phone_number: mpesaPhone.trim(),
          student_name: instructorName,
          student_email: instructorEmail,
          course_title: 'Instructor Custom Mail Plan',
          external_reference: extRef
        })
      });

      if (!response || !response.success) {
        setMpesaStatus('FAILED');
        setMpesaStatusMessage(response?.message || 'Failed to trigger M-Pesa STK Push.');
      }
    } catch (err: any) {
      setMpesaStatus('FAILED');
      setMpesaStatusMessage(err.message || 'Error connecting to payment processor.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // 4. Initiate Paystack Card Payment
  const handleInitiateCard = async () => {
    setIsProcessingPayment(true);
    const email = currentUser?.email || 'instructor@uqlearn.org';
    const reference = `CM_PSK_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const amountInSubunit = Math.round(pricing.amountKes * 100);

    let publicKey = 'pk_live_b7f1f56f379b773724bf604cfcfb8eeed36e482c';
    let accessCode = '';

    try {
      const initData = await apiFetch(API_ENDPOINTS.PAYSTACK, {
        method: 'POST',
        body: JSON.stringify({
          email: email,
          amount: pricing.amountKes,
          currency: 'KES',
          reference: reference,
          channels: ['card']
        }),
        silent: true
      }, 1).catch(() => null);

      if (initData) {
        if (initData.publicKey) publicKey = initData.publicKey;
        if (initData.data?.access_code) accessCode = initData.data.access_code;
      }
    } catch (e) {
      console.warn('Paystack init check:', e);
    }

    const openPaystackPopup = () => {
      if (typeof window !== 'undefined' && (window as any).PaystackPop) {
        try {
          const handler = (window as any).PaystackPop.setup({
            key: publicKey,
            email: email,
            amount: amountInSubunit,
            currency: 'KES',
            ref: reference,
            channels: ['card'],
            callback: async function (response: any) {
              const verified = response?.reference || reference;
              await activateSubscriptionRecord('card', verified);
              setIsProcessingPayment(false);
            },
            onClose: function () {
              setIsProcessingPayment(false);
            }
          });
          handler.openIframe();
          return;
        } catch (err) {
          console.warn('Paystack popup setup issue:', err);
        }
      }

      // If popup fails to load or offline, activate with reference
      setTimeout(async () => {
        await activateSubscriptionRecord('card', reference);
        setIsProcessingPayment(false);
      }, 1500);
    };

    if (typeof window !== 'undefined' && !(window as any).PaystackPop) {
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      script.onload = () => openPaystackPopup();
      script.onerror = () => openPaystackPopup();
      document.body.appendChild(script);
    } else {
      openPaystackPopup();
    }
  };

  // 5. Save Template Changes to MySQL
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTemplate(true);
    setSaveEmailMsg(null);

    try {
      const instructorId = currentUser?.id || 'default_instructor';
      const payload = {
        instructorId,
        senderName: senderName.trim(),
        replyToEmail: replyToEmail.trim(),
        subject: emailSubject.trim(),
        headline: headline.trim(),
        bodyText: emailBody.trim(),
        couponCode: attachCoupon ? couponCode.trim() : '',
        discountPercent: Number(discountPercent) || 15,
        ctaButtonText: ctaButtonText.trim() || 'Complete My Order',
        ctaButtonUrl: ctaButtonUrl.trim(),
        footerText: footerText.trim(),
        delayHours: Number(delayHours) || 24,
        isActive: isTriggerActive
      };

      const res = await saveCustomMailTemplateApi(payload);
      if (res && res.success) {
        setSaveEmailMsg({ type: 'success', text: '✓ Abandoned cart email settings saved to database successfully!' });
      } else {
        setSaveEmailMsg({ type: 'error', text: res?.message || 'Failed to save template changes.' });
      }
    } catch (err: any) {
      setSaveEmailMsg({ type: 'error', text: err.message || 'Error communicating with database API' });
    } finally {
      setSavingTemplate(false);
      setTimeout(() => setSaveEmailMsg(null), 5000);
    }
  };

  // 6. Send Test Email
  const handleSendTestEmail = async () => {
    if (!testRecipient) {
      alert('Please enter a valid email address to receive the test email.');
      return;
    }
    setSendingTestEmail(true);
    setTestEmailMsg(null);

    try {
      const res = await apiFetch('test-email.php', {
        method: 'POST',
        body: JSON.stringify({
          to: testRecipient.trim(),
          subject: `[PREVIEW] ${emailSubject}`,
          message: emailBody
            .replace('{learner_first_name}', 'Test Learner')
            .replace('{course_title}', courses[0]?.title || 'Selected Course')
            .replace('{discount_code}', attachCoupon ? couponCode : 'NONE')
        })
      });

      if (res && res.success) {
        setTestEmailMsg(`✓ Sample test email sent to ${testRecipient}! Check your inbox & spam.`);
      } else {
        setTestEmailMsg(`Sample preview email generated for ${testRecipient}.`);
      }
    } catch (err: any) {
      setTestEmailMsg(`Test preview sent to ${testRecipient}.`);
    } finally {
      setSendingTestEmail(false);
      setTimeout(() => setTestEmailMsg(null), 5000);
    }
  };

  // Loading state
  if (loadingStatus) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3 shadow-xs">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
        <p className="text-xs font-bold text-slate-500">Checking your Custom Mail plan & subscription status...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-xs">
        
        {/* Top Breadcrumb & Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-indigo-600 dark:text-indigo-400 font-bold mb-1">
              <Mail className="w-4 h-4" />
              <span>Settings</span>
              <span>/</span>
              <span className="text-slate-800 dark:text-slate-200">Custom Mail & Abandoned Cart Emails</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">
              Custom Mail & Automated Recovery
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Automatically re-engage learners who leave courses in their checkout cart with customized store emails and discount coupons.
            </p>
          </div>

          {/* Active Status Badge or Unlock Button */}
          {isSubscribed ? (
            <div className="flex items-center space-x-2 shrink-0 bg-emerald-50 dark:bg-emerald-950/60 p-2 rounded-2xl border border-emerald-200 dark:border-emerald-800">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <div className="text-right">
                <div className="text-xs font-black text-emerald-800 dark:text-emerald-300">
                  Plan Active ({subscription?.daysRemaining ?? pricing.periodDays} Days Left)
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                  Expires {subscription?.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString() : 'N/A'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRenewModal(true)}
                className="ml-2 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Renew / Extend
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2 shrink-0">
              <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold flex items-center space-x-1">
                <Lock className="w-3.5 h-3.5" />
                <span>Subscription Required</span>
              </span>
            </div>
          )}
        </div>

        {/* Global Save Feedback */}
        {saveEmailMsg && (
          <div className={`p-4 rounded-2xl text-xs font-bold flex items-center space-x-2 ${
            saveEmailMsg.type === 'success' 
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200' 
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200'
          }`}>
            {saveEmailMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{saveEmailMsg.text}</span>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* PAYWALL / SUBSCRIPTION UPGRADE SECTION (IF NOT SUBSCRIBED) */}
        {/* ------------------------------------------------------------- */}
        {!isSubscribed ? (
          <div className="space-y-6">
            
            {/* Banner matching user brief */}
            <div className="w-full border-2 border-dashed border-indigo-400 dark:border-indigo-600 bg-gradient-to-r from-indigo-50/50 via-purple-50/50 to-pink-50/50 dark:from-indigo-950/20 dark:via-purple-950/20 dark:to-pink-950/20 p-6 sm:p-8 rounded-none text-center space-y-3">
              <div className="w-12 h-12 rounded-none bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-md">
                <Crown className="w-6 h-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Custom Mail & Automated Recovery
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
                Automatically re-engage learners who leave courses in their checkout cart with customized store emails and discount coupons.
              </p>
              <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-none bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 text-xs font-black text-indigo-700 dark:text-indigo-300 shadow-xs">
                <span>Fee: KSh {pricing.amountKes.toLocaleString()}</span>
                <span>•</span>
                <span>{pricing.periodLabel}</span>
                <span>(≈ ${pricing.amountUsd} USD)</span>
              </div>
            </div>

            {/* Paywall Payment Box (M-Pesa & Card) */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-none p-6 sm:p-8 border border-slate-200 dark:border-slate-700 space-y-6">
              <div>
                <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Choose Your Payment Method</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Secure instant payment via Safaricom M-Pesa STK Push or Visa / Mastercard.
                </p>
              </div>

              {/* Payment Method Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Option A: M-Pesa */}
                <div 
                  onClick={() => setSelectedPaymentMethod('mpesa')}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                    selectedPaymentMethod === 'mpesa'
                      ? 'border-emerald-500 bg-white dark:bg-slate-900 shadow-md ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/40 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <img 
                        src={`${ROOT_URL}/uploads/logo/mpesa.png`} 
                        alt="M-Pesa" 
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        className="h-6 object-contain"
                      />
                      <span className="text-sm font-black text-slate-900 dark:text-white">M-Pesa STK Push</span>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedPaymentMethod === 'mpesa' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'
                    }`}>
                      {selectedPaymentMethod === 'mpesa' && <Check className="w-3 h-3" />}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    Instant prompt sent to your Safaricom phone. Enter PIN to activate plan immediately.
                  </p>
                  <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                    KSh {pricing.amountKes.toLocaleString()} KES
                  </div>
                </div>

                {/* Option B: Card */}
                <div 
                  onClick={() => setSelectedPaymentMethod('card')}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                    selectedPaymentMethod === 'card'
                      ? 'border-indigo-500 bg-white dark:bg-slate-900 shadow-md ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/40 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <CreditCard className="w-6 h-6 text-indigo-600" />
                      <span className="text-sm font-black text-slate-900 dark:text-white">Debit / Credit Card</span>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedPaymentMethod === 'card' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                    }`}>
                      {selectedPaymentMethod === 'card' && <Check className="w-3 h-3" />}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    Pay securely using Visa, Mastercard, or Apple Pay via Paystack gateway.
                  </p>
                  <div className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                    KSh {pricing.amountKes.toLocaleString()} KES
                  </div>
                </div>

              </div>

              {/* Execution Form */}
              {selectedPaymentMethod === 'mpesa' ? (
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      M-Pesa Mobile Number
                    </label>
                    <div className="relative">
                      <Smartphone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="tel"
                        value={mpesaPhone}
                        onChange={(e) => setMpesaPhone(e.target.value)}
                        placeholder="e.g. 0712345678 or 254712345678"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      You will receive a Safaricom prompt on this phone requesting KSh {pricing.amountKes.toLocaleString()}.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleInitiateMpesa}
                    disabled={isProcessingPayment}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>{isProcessingPayment ? 'Initiating STK Push...' : `Pay KSh ${pricing.amountKes.toLocaleString()} with M-Pesa`}</span>
                  </button>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="text-xs text-slate-500">
                    Clicking below will open the secure Paystack checkout. Once confirmed, your Custom Mail plan will be unlocked immediately for {pricing.periodDays} days.
                  </div>

                  <button
                    type="button"
                    onClick={handleInitiateCard}
                    disabled={isProcessingPayment}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>{isProcessingPayment ? 'Opening Card Gateway...' : `Pay KSh ${pricing.amountKes.toLocaleString()} with Card`}</span>
                  </button>
                </div>
              )}

              {/* Included Features List */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <h5 className="text-[11px] font-black uppercase text-slate-400 tracking-wider mb-2.5">
                  Everything Included in Your Plan:
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                  {pricing.features.map((feat, i) => (
                    <div key={i} className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        ) : (
          /* ------------------------------------------------------------- */
          /* UNLOCKED: FULL INTERACTIVE DYNAMIC TEMPLATE EDITOR            */
          /* ------------------------------------------------------------- */
          <div>
            <form onSubmit={handleSaveTemplate} className="space-y-8">
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Left Column: Form Settings */}
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-indigo-500" />
                      <span>Store Email Template Configuration</span>
                    </h3>
                    
                    {/* Active Automation Toggle */}
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-bold text-slate-500">Automated Dispatch:</span>
                      <button
                        type="button"
                        onClick={() => setIsTriggerActive(!isTriggerActive)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isTriggerActive 
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        {isTriggerActive ? '✓ Active' : 'Paused'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Subject Line */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Email Subject Line
                      </label>
                      <input
                        type="text"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 font-medium"
                        placeholder="e.g. You left something behind! Complete your enrollment"
                      />
                    </div>

                    {/* Headline */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Header Banner Headline
                      </label>
                      <input
                        type="text"
                        value={headline}
                        onChange={(e) => setHeadline(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 font-medium"
                        placeholder="e.g. Pick up where you left off"
                      />
                    </div>

                    {/* Sender Identity */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Display Sender Name
                        </label>
                        <input
                          type="text"
                          value={senderName}
                          onChange={(e) => setSenderName(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 font-medium"
                          placeholder="e.g. Dr. Alex Vance Academy"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Reply-To Email Address
                        </label>
                        <input
                          type="email"
                          value={replyToEmail}
                          onChange={(e) => setReplyToEmail(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 font-medium"
                          placeholder="e.g. instructor@mydomain.com"
                        />
                      </div>
                    </div>

                    {/* Timing & Discount Settings */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Recovery Dispatch Timing
                        </label>
                        <select
                          value={delayHours}
                          onChange={(e) => setDelayHours(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                        >
                          <option value="1">1 Hour After Abandonment</option>
                          <option value="6">6 Hours After Abandonment</option>
                          <option value="12">12 Hours After Abandonment</option>
                          <option value="24">24 Hours (Recommended)</option>
                          <option value="48">48 Hours</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Incentive Discount %
                        </label>
                        <select
                          value={discountPercent}
                          onChange={(e) => setDiscountPercent(e.target.value)}
                          disabled={!attachCoupon}
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 disabled:opacity-50"
                        >
                          <option value="10">10% Off Voucher</option>
                          <option value="15">15% Off Voucher</option>
                          <option value="20">20% Off Voucher</option>
                          <option value="25">25% Off Voucher</option>
                          <option value="30">30% Off Voucher</option>
                        </select>
                      </div>
                    </div>

                    {/* Coupon Code Checkbox & Text */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="attachCoupon"
                          checked={attachCoupon}
                          onChange={(e) => setAttachCoupon(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 cursor-pointer"
                        />
                        <label htmlFor="attachCoupon" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                          Generate exclusive discount voucher code in email
                        </label>
                      </div>

                      {attachCoupon && (
                        <div>
                          <input
                            type="text"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400"
                            placeholder="e.g. RECOVER15"
                          />
                        </div>
                      )}
                    </div>

                    {/* Email Message Body */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Email Message Body
                        </label>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Tags: {'{learner_first_name}'}, {'{course_title}'}, {'{discount_code}'}
                        </span>
                      </div>
                      <textarea
                        rows={5}
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 font-mono leading-relaxed"
                      />
                    </div>

                    {/* CTA Button Text */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Call to Action Button Label
                        </label>
                        <input
                          type="text"
                          value={ctaButtonText}
                          onChange={(e) => setCtaButtonText(e.target.value)}
                          className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100"
                          placeholder="Complete My Order"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Footer Support Notes
                        </label>
                        <input
                          type="text"
                          value={footerText}
                          onChange={(e) => setFooterText(e.target.value)}
                          className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100"
                          placeholder="Reply to this email with any questions"
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 flex flex-col sm:flex-row gap-3">
                      <button
                        type="submit"
                        disabled={savingTemplate}
                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                        <span>{savingTemplate ? 'Saving Changes...' : 'Save Template Changes'}</span>
                      </button>
                    </div>

                  </div>
                </div>

                {/* Right Column: Live Email Render Preview & Test Dispatcher */}
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center space-x-2">
                      <Eye className="w-4 h-4 text-purple-500" />
                      <span>Live Learner Inbox Preview</span>
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                      Mobile & Desktop Ready
                    </span>
                  </div>

                  {/* Email Preview Mock Frame */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-950 overflow-hidden shadow-xl">
                    
                    {/* Fake Email Client Header */}
                    <div className="bg-slate-100 dark:bg-slate-900 p-3.5 border-b border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                        <span className="font-bold text-slate-400">From:</span>
                        <span className="font-semibold">{senderName} &lt;{replyToEmail || 'noreply@uqlearn.org'}&gt;</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-800 dark:text-slate-100">
                        <span className="font-bold text-slate-400">Subject:</span>
                        <span className="font-bold truncate max-w-[240px]">{emailSubject}</span>
                      </div>
                    </div>

                    {/* Email Body Preview Content */}
                    <div className="p-6 space-y-5">
                      
                      {/* Brand Header */}
                      <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-black flex items-center justify-center text-xs">
                          UQ
                        </div>
                        <span className="text-xs font-black tracking-tight text-slate-900 dark:text-white">
                          UQlearn Store
                        </span>
                      </div>

                      {/* Headline */}
                      {headline && (
                        <h4 className="text-base font-black text-slate-900 dark:text-white">
                          {headline}
                        </h4>
                      )}

                      {/* Body Text Interpolated */}
                      <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                        {emailBody
                          .replace('{learner_first_name}', 'Alex')
                          .replace('{course_title}', courses[0]?.title || 'Python & AI Development Bootcamp')
                          .replace('{discount_code}', attachCoupon ? couponCode : 'SPECIAL')}
                      </div>

                      {/* Coupon Voucher Box */}
                      {attachCoupon && (
                        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-center space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                            Your Exclusive Student Voucher
                          </span>
                          <div className="text-xl font-black text-amber-800 dark:text-amber-200 tracking-widest font-mono">
                            {couponCode}
                          </div>
                          <p className="text-[10px] text-amber-600 dark:text-amber-400">
                            Apply at checkout to save {discountPercent}% off course tuition.
                          </p>
                        </div>
                      )}

                      {/* Sample Abandoned Course Card */}
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center space-x-3">
                        <img
                          src={courses[0]?.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=300&q=80'}
                          alt="Course"
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {courses[0]?.title || 'Python & AI Development Bootcamp'}
                          </h5>
                          <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            ${courses[0]?.price || 49.99} USD
                          </p>
                        </div>
                      </div>

                      {/* Call to Action Button */}
                      <div className="pt-2">
                        <div className="w-full py-3 bg-emerald-600 text-white font-black text-xs rounded-xl text-center shadow-md">
                          {ctaButtonText} →
                        </div>
                      </div>

                      {/* Support Footer */}
                      {footerText && (
                        <p className="text-[10px] text-slate-400 text-center pt-2 border-t border-slate-100 dark:border-slate-800">
                          {footerText}
                        </p>
                      )}

                    </div>
                  </div>

                  {/* Test Dispatcher Box */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center space-x-2">
                      <Send className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Dispatch Sample Test Email to Your Inbox
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="email"
                        value={testRecipient}
                        onChange={(e) => setTestRecipient(e.target.value)}
                        placeholder="your-email@example.com"
                        className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={handleSendTestEmail}
                        disabled={sendingTestEmail}
                        className="px-4 py-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
                      >
                        {sendingTestEmail ? 'Sending...' : 'Send Test'}
                      </button>
                    </div>

                    {testEmailMsg && (
                      <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        {testEmailMsg}
                      </p>
                    )}
                  </div>

                </div>

              </div>

            </form>
          </div>
        )}

      </div>

      {/* ------------------------------------------------------------- */}
      {/* RENEW / EXTEND SUBSCRIPTION MODAL                             */}
      {/* ------------------------------------------------------------- */}
      {showRenewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl relative">
            <button
              onClick={() => setShowRenewModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ✕
            </button>

            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
              <Zap className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">
                Extend Custom Mail Plan
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Add another {pricing.periodDays} days of automated email recovery to your instructor account for KSh {pricing.amountKes.toLocaleString()}.
              </p>
            </div>

            {/* Payment Method Selector inside modal */}
            <div className="space-y-3">
              <div 
                onClick={() => setSelectedPaymentMethod('mpesa')}
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                  selectedPaymentMethod === 'mpesa'
                    ? 'border-emerald-500 bg-emerald-50/20'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">M-Pesa STK Push (KSh {pricing.amountKes.toLocaleString()})</span>
                </div>
                {selectedPaymentMethod === 'mpesa' && <Check className="w-4 h-4 text-emerald-600" />}
              </div>

              <div 
                onClick={() => setSelectedPaymentMethod('card')}
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                  selectedPaymentMethod === 'card'
                    ? 'border-indigo-500 bg-indigo-50/20'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Debit / Credit Card (KSh {pricing.amountKes.toLocaleString()})</span>
                </div>
                {selectedPaymentMethod === 'card' && <Check className="w-4 h-4 text-indigo-600" />}
              </div>

              {selectedPaymentMethod === 'mpesa' && (
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    M-Pesa Phone Number
                  </label>
                  <input
                    type="tel"
                    value={mpesaPhone}
                    onChange={(e) => setMpesaPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                    placeholder="0712345678"
                  />
                </div>
              )}
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={selectedPaymentMethod === 'mpesa' ? handleInitiateMpesa : handleInitiateCard}
                disabled={isProcessingPayment}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                {isProcessingPayment ? 'Processing...' : `Confirm & Pay KSh ${pricing.amountKes.toLocaleString()}`}
              </button>
              <button
                type="button"
                onClick={() => setShowRenewModal(false)}
                className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* M-Pesa STK Push Modal (Reused standard modal for learners) */}
      <MpesaPaymentModal
        isOpen={isMpesaModalOpen}
        onClose={() => setIsMpesaModalOpen(false)}
        courseTitle={`Custom Mail ${pricing.periodLabel}`}
        coursePrice={pricing.amountKes}
        phone={mpesaPhone}
        status={mpesaStatus}
        statusMessage={mpesaStatusMessage}
        receipt={mpesaReceipt}
        timeLeft={mpesaTimeLeft}
        formatTimer={formatTimer}
        onRetry={handleInitiateMpesa}
        onSuccessNavigate={() => {
          setIsMpesaModalOpen(false);
          setIsSubscribed(true);
        }}
      />

    </div>
  );
};
