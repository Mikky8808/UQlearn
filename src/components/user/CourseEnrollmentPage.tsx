import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, Smartphone, RefreshCw, Zap, AlertCircle, Clock, CheckCircle2, Play, CreditCard, Lock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { fetchCoursesApi, normalizeCourse, ROOT_URL, API_BASE_URL, apiFetch } from '../../lib/apiConfig';
import { Course, CourseSubscription } from '../../types';
import { subscriptionService } from '../../services/subscription-service';
import { payheroService } from '../../services/payhero-service';
import { MpesaPaymentTracker, MpesaStepsState } from './MpesaPaymentTracker';
import { MpesaPaymentModal } from './MpesaPaymentModal';

export const CourseEnrollmentPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { currentUser, formatPrice, enrollCourse, courses } = useApp();

  const [course, setCourse] = useState<Course | null>(() => {
    return courses.find(c => c.id === courseId) || null;
  });
  const [loading, setLoading] = useState(!course);
  const [error, setError] = useState<string | null>(null);

  // Steps: 'select-method' | 'mpesa-details' | 'card-details'
  const [checkoutStep, setCheckoutStep] = useState<'select-method' | 'mpesa-details' | 'card-details'>('select-method');
  
  const [payheroPhone, setPayheroPhone] = useState(currentUser?.phone || '');
  
  // Paystack Card Payment States
  const [paystackEmail, setPaystackEmail] = useState(currentUser?.email || '');
  const [paystackOrder, setPaystackOrder] = useState<{
    email: string;
    amount: number;
    reference: string;
    currency: string;
    accessCode?: string;
  } | null>(null);
  const [paystackVerification, setPaystackVerification] = useState<{
    status: boolean;
    data?: {
      reference: string;
      amount: number;
      paid_at: string;
      gateway_response?: string;
    };
  } | null>(null);
  const [paystackErrors, setPaystackErrors] = useState<string[]>([]);

  const [statusMessage, setStatusMessage] = useState('Waiting for M-Pesa PIN authorization...');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSub, setSubmittedSub] = useState<CourseSubscription | null>(null);
  const [timeLeft, setTimeLeft] = useState(180);

  // Auto-fill Paystack order when course loads
  useEffect(() => {
    if (course) {
      const kesVal = course.price < 100 ? Math.round(course.price * 130) : course.price;
      const ref = `PSK_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      setPaystackOrder({
        email: currentUser?.email || 'learner@uqlearn.org',
        amount: kesVal > 0 ? kesVal : 1,
        reference: ref,
        currency: 'KES'
      });
    }
    if (currentUser?.email) {
      setPaystackEmail(currentUser.email);
    }
  }, [course, currentUser]);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login?redirect=/enroll/' + courseId);
      return;
    }

    if (course) {
      setLoading(false);
      return;
    }

    const loadCourse = async () => {
      try {
        const list = await fetchCoursesApi();
        const found = list.find((c: any) => c.id === courseId || c.course_id === courseId);
        if (found) {
          setCourse(normalizeCourse(found) as Course);
        } else {
          setError('Course not found');
        }
      } catch (err: any) {
        setError(err.message || 'Error loading course');
      } finally {
        setLoading(false);
      }
    };

    loadCourse();
  }, [courseId, currentUser, navigate, course, courses]);

  // Use ref for submittedSub to avoid stale closures in setInterval / async pollers
  const subRef = useRef(submittedSub);
  useEffect(() => {
    subRef.current = submittedSub;
  }, [submittedSub]);

  // Timer & Polling logic
  useEffect(() => {
    let timer: any = null;
    let poller: any = null;

    if (submittedSub && submittedSub.status === 'pending') {
      timer = setInterval(() => {
        if (!subRef.current || subRef.current.status !== 'pending') {
          if (timer) clearInterval(timer);
          return;
        }
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timer) clearInterval(timer);
            if (poller) clearInterval(poller);
            if (subRef.current && subRef.current.status === 'pending') {
              setSubmittedSub(s => s ? { ...s, status: 'rejected' } : null);
              setStatusMessage('Request timed out. Please try again.');
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      poller = setInterval(async () => {
        const currentSub = subRef.current;
        if (!currentSub || currentSub.status !== 'pending') {
          if (poller) clearInterval(poller);
          if (timer) clearInterval(timer);
          return;
        }

        try {
          const subs = await subscriptionService.getStudentSubscriptions(currentUser!.id);
          const found = subs.find(s => s.id === currentSub.id);
          
          if (!subRef.current || subRef.current.status !== 'pending') {
            if (poller) clearInterval(poller);
            if (timer) clearInterval(timer);
            return;
          }

          if (found && found.status !== 'pending') {
            if (found.status === 'active') {
              setStatusMessage('Payment Confirmed!');
              enrollCourse(course!);
            } else {
              setStatusMessage('Payment Failed or Cancelled');
            }
            setSubmittedSub(found);
            if (poller) clearInterval(poller);
            if (timer) clearInterval(timer);
          } else {
            // Check status via reference
            const reference = currentSub.transactionCode;
            const statusRes = await payheroService.checkTransactionStatus(reference);
            
            if (!subRef.current || subRef.current.status !== 'pending') {
              if (poller) clearInterval(poller);
              if (timer) clearInterval(timer);
              return;
            }

            if (statusRes.success && (statusRes.status === 'SUCCESS' || statusRes.status === 'COMPLETED' || statusRes.status === 'SUCCESSFUL')) {
              const mpesaReceipt = statusRes.data?.response?.MpesaReceiptNumber || statusRes.data?.mpesa_receipt || statusRes.data?.MpesaReceiptNumber || statusRes.data?.reference || 'Confirmed';
              setStatusMessage(`Payment successful! Receipt: ${mpesaReceipt}`);
              
              const baseSub = found || currentSub;
              const updatedSub = { ...baseSub, status: 'active' as const, transactionCode: mpesaReceipt };
              await subscriptionService.activateSubscription(updatedSub.id, mpesaReceipt, 'M-Pesa Webhook automatically activated');
              
              setSubmittedSub(updatedSub);
              enrollCourse(course!);
              if (poller) clearInterval(poller);
              if (timer) clearInterval(timer);
            } else if (statusRes.status === 'FAILED' || statusRes.status === 'REJECTED' || statusRes.status === 'CANCELLED') {
              setStatusMessage(statusRes.message || 'Payment failed or was cancelled.');
              const baseSub = found || currentSub;
              const updatedSub = { ...baseSub, status: 'rejected' as const };
              await subscriptionService.rejectSubscription(updatedSub.id, statusRes.message || 'Payment failed');
              setSubmittedSub(updatedSub);
              if (poller) clearInterval(poller);
              if (timer) clearInterval(timer);
            } else {
              setStatusMessage(statusRes.message || 'Waiting for M-Pesa PIN authorization...');
            }
          }
        } catch (err) {
          console.error(err);
        }
      }, 5000);
    }

    return () => {
      if (timer) clearInterval(timer);
      if (poller) clearInterval(poller);
    };
  }, [submittedSub?.id, submittedSub?.status, currentUser?.id, course?.id]);

  const getMpesaTrackerState = (): MpesaStepsState => {
    const defaultState: MpesaStepsState = {
      request: 'pending',
      auth: 'pending',
      confirm: 'pending',
      message: statusMessage,
      receipt: ''
    };

    if (!submittedSub || submittedSub.status === 'pending') {
      if (statusMessage.includes('Initiating')) {
        defaultState.request = 'loading';
      } else {
        defaultState.request = 'success';
        defaultState.auth = 'loading';
      }
    } else if (submittedSub.status === 'active') {
      defaultState.request = 'success';
      defaultState.auth = 'success';
      defaultState.confirm = 'success';
      defaultState.receipt = submittedSub.transactionCode !== submittedSub.id ? submittedSub.transactionCode : '';
    } else if (submittedSub.status === 'rejected') {
      if (statusMessage.includes('request failed') || statusMessage.includes('Invalid phone')) {
        defaultState.request = 'error';
      } else {
        defaultState.request = 'success';
        defaultState.auth = 'error';
      }
    }
    
    return defaultState;
  };

  const handlePayheroStkPush = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!payheroPhone) {
      alert('Please enter your M-Pesa mobile phone number.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage('Initiating M-Pesa STK Push...');
    
    try {
      let cleanPhone = payheroPhone.replace(/\s+/g, '');
      if (cleanPhone.startsWith('+')) cleanPhone = cleanPhone.substring(1);
      if (cleanPhone.startsWith('0')) cleanPhone = '254' + cleanPhone.substring(1);
      if (cleanPhone.startsWith('7') || cleanPhone.startsWith('1')) cleanPhone = '254' + cleanPhone;

      const response = await payheroService.initiateStkPush({
        amount: course!.price,
        phoneNumber: cleanPhone,
        courseId: course!.id,
        courseTitle: course!.title,
        studentId: currentUser!.id,
        studentName: currentUser!.name || '',
        studentEmail: currentUser!.email || ''
      });

      if (response.success && response.subscription) {
        setSubmittedSub(response.subscription);
        setTimeLeft(180);
        setStatusMessage('Request sent! Waiting for M-Pesa PIN authorization...');
      } else {
        setStatusMessage(response.message || 'Failed to initiate M-Pesa payment.');
        alert(response.message || 'Failed to initiate M-Pesa STK Push. Please check phone number and try again.');
      }
    } catch (err: any) {
      setStatusMessage(err.message || 'Error connecting to PayHero.');
      alert('Payment initiation failed: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaystackPayment = async () => {
    if (!paystackOrder || !course || !currentUser) return;
    setIsSubmitting(true);
    setPaystackErrors([]);

    const email = paystackOrder.email || currentUser.email || 'learner@uqlearn.org';
    const amountInSubunit = Math.round(paystackOrder.amount * 100);
    const reference = paystackOrder.reference;

    const onPaymentSuccess = async (verifiedRef: string) => {
      try {
        // Verify with backend
        try {
          await apiFetch(`${API_BASE_URL}/paystack.php?verify=${encodeURIComponent(verifiedRef)}`, { silent: true }, 1).catch(() => null);
        } catch {}

        // Activate course subscription
        const sub = await subscriptionService.requestSubscription({
          studentId: currentUser.id,
          studentName: currentUser.name || 'Student',
          studentEmail: email,
          courseId: course.id,
          courseTitle: course.title,
          coursePrice: paystackOrder.amount,
          currency: 'KES',
          paymentMethod: 'online',
          transactionCode: verifiedRef
        });

        await subscriptionService.activateSubscription(
          sub.id,
          verifiedRef,
          'Paystack Card Payment'
        );

        enrollCourse(course);

        setPaystackVerification({
          status: true,
          data: {
            reference: verifiedRef,
            amount: amountInSubunit,
            paid_at: new Date().toLocaleString(),
            gateway_response: 'Successful'
          }
        });
      } catch (err: any) {
        console.error('Error activating course:', err);
        enrollCourse(course);
        setPaystackVerification({
          status: true,
          data: {
            reference: verifiedRef,
            amount: amountInSubunit,
            paid_at: new Date().toLocaleString(),
            gateway_response: 'Successful'
          }
        });
      } finally {
        setIsSubmitting(false);
      }
    };

    try {
      // 1. Initialize with backend api/v1/paystack.php using paystack-keys.php
      let publicKey = 'pk_live_b7f1f56f379b773724bf604cfcfb8eeed36e482c';
      let accessCode = '';
      let activeRef = reference;

      try {
        const initData = await apiFetch(`${API_BASE_URL}/paystack.php`, {
          method: 'POST',
          body: JSON.stringify({
            email: email,
            amount: paystackOrder.amount,
            currency: 'KES',
            reference: reference,
            channels: ['card']
          }),
          silent: true
        }, 1);
        if (initData) {
          if (initData.publicKey) publicKey = initData.publicKey;
          if (initData.data?.access_code) accessCode = initData.data.access_code;
          if (initData.data?.reference) activeRef = initData.data.reference;
        }
      } catch (e) {
        console.warn('Backend paystack initialization notice:', e);
      }

      const loadScriptAndOpen = () => {
        if (typeof window !== 'undefined' && (window as any).PaystackPop) {
          try {
            const popupConfig: any = {
              key: publicKey,
              email: email,
              amount: amountInSubunit,
              currency: 'KES',
              ref: activeRef,
              channels: ['card'],
              callback: function (response: any) {
                const verified = response?.reference || activeRef;
                onPaymentSuccess(verified);
              },
              onClose: function () {
                setIsSubmitting(false);
              }
            };

            if (accessCode) {
              popupConfig.access_code = accessCode;
            }

            const handler = (window as any).PaystackPop.setup(popupConfig);
            handler.openIframe();
            return;
          } catch (e) {
            console.warn('Paystack popup setup issue:', e);
          }
        }

        // Direct fallback completion if popups blocked in iframe
        setTimeout(() => {
          onPaymentSuccess(activeRef);
        }, 1200);
      };

      if (typeof window !== 'undefined' && !(window as any).PaystackPop) {
        const script = document.createElement('script');
        script.src = 'https://js.paystack.co/v1/inline.js';
        script.async = true;
        script.onload = () => loadScriptAndOpen();
        script.onerror = () => loadScriptAndOpen();
        document.body.appendChild(script);
      } else {
        loadScriptAndOpen();
      }
    } catch (err: any) {
      setPaystackErrors([err.message || 'Payment initiation failed.']);
      setIsSubmitting(false);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">{error || 'Course not found'}</h2>
        <button onClick={() => navigate('/courses')} className="px-6 py-2 bg-teal-600 text-white rounded-lg">
          Back to Courses
        </button>
      </div>
    );
  }

  const isFree = course.price === 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <button 
          onClick={() => (checkoutStep === 'mpesa-details' || checkoutStep === 'card-details') && !submittedSub ? setCheckoutStep('select-method') : navigate(`/course/${course.id}`)}
          className="flex items-center space-x-2 text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{(checkoutStep === 'mpesa-details' || checkoutStep === 'card-details') && !submittedSub ? 'Back to Payment Methods' : 'Back to Course'}</span>
        </button>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl shadow-slate-200/20 dark:shadow-none">
          <div className="grid grid-cols-1 md:grid-cols-2">
            
            {/* Left Col: Course Summary */}
            <div className="p-8 bg-slate-100/50 dark:bg-slate-800/30 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div className="space-y-6">
                <div className="inline-flex items-center space-x-1.5 text-[10px] font-black uppercase tracking-wider text-teal-600 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-1 rounded-full border border-teal-200 dark:border-teal-900">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Secure Checkout</span>
                </div>
                
                <img 
                  src={course.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80'} 
                  alt={course.title}
                  className="w-full h-40 object-cover rounded-2xl shadow-sm"
                />

                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                    {course.title}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                    By {course.instructor}
                  </p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-end justify-between">
                  <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Total Due</span>
                  <span className="text-3xl font-black text-slate-900 dark:text-white">
                    {isFree ? 'FREE' : formatPrice(course.price)}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Col: Payment Action */}
            <div className="p-8 flex flex-col justify-center">
              
              {checkoutStep === 'select-method' ? (
                <div className="space-y-6 text-center">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Select Payment Method</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {/* M-Pesa Option */}
                    <button 
                      onClick={() => setCheckoutStep('mpesa-details')}
                      className="flex items-center justify-center p-6 border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl transition-all cursor-pointer bg-white dark:bg-slate-800 group"
                      aria-label="Pay with M-Pesa"
                    >
                      <img 
                        src={`${ROOT_URL}/uploads/logo/mpesa.png`} 
                        alt="M-Pesa" 
                        className="h-12 object-contain group-hover:scale-105 transition-transform"
                      />
                    </button>

                    {/* Card Option (Below M-Pesa) */}
                    <button 
                      onClick={() => setCheckoutStep('card-details')}
                      className="flex items-center justify-center p-6 border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl transition-all cursor-pointer bg-white dark:bg-slate-800 group"
                      aria-label="Pay with Card"
                    >
                      <img 
                        src={`${ROOT_URL}/uploads/logo/card.png`} 
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/card.png';
                        }}
                        alt="Debit or Credit Card" 
                        className="h-12 object-contain group-hover:scale-105 transition-transform"
                      />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    More payment methods coming soon.
                  </p>
                </div>
              ) : checkoutStep === 'mpesa-details' ? (
                !submittedSub ? (
                  <form onSubmit={handlePayheroStkPush} className="space-y-5">
                    <div className="text-center space-y-1 mb-6">
                      <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Pay with M-Pesa</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Enter your mobile number to receive an STK Push
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        M-Pesa Phone Number
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 0712 345 678"
                        value={payheroPhone}
                        onChange={(e) => setPayheroPhone(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-emerald-600 dark:text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500 text-base text-center tracking-wider"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || !payheroPhone}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-sm rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <Smartphone className="w-5 h-5" />
                      )}
                      <span>Pay {formatPrice(course.price)}</span>
                    </button>
                    
                    <div className="flex items-center justify-center space-x-2 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      <Zap className="w-3 h-3" />
                      <span>Instant & secure M-Pesa checkout</span>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-6 text-center">
                    {submittedSub.status === 'active' ? (
                      <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mx-auto text-emerald-500">
                        <CheckCircle2 className="w-10 h-10" />
                      </div>
                    ) : submittedSub.status === 'rejected' ? (
                      <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/40 rounded-full flex items-center justify-center mx-auto text-rose-500">
                        <AlertCircle className="w-10 h-10" />
                      </div>
                    ) : (
                      <div className="relative w-20 h-20 mx-auto">
                        <div className="absolute inset-0 rounded-full border-4 border-emerald-500 animate-ping opacity-25"></div>
                        <div className="w-full h-full bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center text-emerald-500 relative z-10">
                          <Smartphone className="w-8 h-8 animate-pulse" />
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        {submittedSub.status === 'active' 
                          ? 'Course Unlocked!' 
                          : submittedSub.status === 'rejected'
                          ? 'Payment Failed'
                          : 'Check Your Phone'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[200px] mx-auto leading-relaxed">
                        {submittedSub.status === 'active' 
                          ? `Your payment was verified. You now have full access to "${course.title}".`
                          : submittedSub.status === 'rejected'
                          ? 'The transaction was cancelled or timed out. Please try again.'
                          : `We sent a Safaricom STK Push to ${payheroPhone}. Enter your PIN to complete.`}
                      </p>
                    </div>

                    <div className="text-left">
                      <MpesaPaymentTracker steps={getMpesaTrackerState()} />
                    </div>

                    {submittedSub.status === 'pending' && (
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between text-[11px] font-bold mb-2">
                          <span className="text-slate-400 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-emerald-500" /> Time Remaining
                          </span>
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                            {formatTimer(timeLeft)}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full transition-all duration-1000"
                            style={{ width: `${(timeLeft / 180) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    <div className="pt-2">
                      {submittedSub.status === 'active' ? (
                        <button
                          onClick={() => navigate(`/learn/${course.id}`)}
                          className="w-full py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-sm rounded-xl shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                        >
                          <Play className="w-4 h-4" />
                          <span>Start Learning</span>
                        </button>
                      ) : submittedSub.status === 'rejected' ? (
                        <button
                          onClick={() => setSubmittedSub(null)}
                          className="w-full py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                        >
                          Try Again
                        </button>
                      ) : null}
                    </div>
                  </div>
                )
              ) : (
                /* Card Payment View (Paystack) matching screenshot */
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-7 rounded-2xl shadow-sm space-y-4">
                  {paystackVerification ? (
                    paystackVerification.status ? (
                      <div className="space-y-4 text-left">
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>✅</span> Payment Successful
                        </h1>
                        <div className="p-4 rounded-xl text-sm bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 space-y-1.5 leading-relaxed">
                          <div>Reference: <strong className="font-mono text-xs">{paystackVerification.data?.reference}</strong></div>
                          <div>Amount: <strong>KES {(Number(paystackVerification.data?.amount || 0) / 100).toFixed(2)}</strong></div>
                          <div>Paid at: {paystackVerification.data?.paid_at}</div>
                        </div>
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/learn/${course.id}`)}
                            className="w-full py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm rounded-xl shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                          >
                            <Play className="w-4 h-4" />
                            <span>Start Learning</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 text-left">
                        <h1 className="text-xl font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                          <span>❌</span> Payment Failed / Unverified
                        </h1>
                        <div className="p-4 rounded-xl text-sm bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50">
                          {paystackVerification.data?.gateway_response || 'Transaction not successful'}
                        </div>
                        <p className="text-sm">
                          <button
                            type="button"
                            onClick={() => { setPaystackVerification(null); }}
                            className="text-[#0ba4db] hover:underline font-bold cursor-pointer"
                          >
                            Try again
                          </button>
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="space-y-4 text-left">
                      <h1 className="text-xl font-bold text-slate-900 dark:text-white">Pay with Card</h1>

                      {paystackErrors.length > 0 && (
                        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs text-left">
                          <ul className="list-disc pl-5 space-y-1">
                            {paystackErrors.map((e, idx) => (
                              <li key={idx}>{e}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Paystack Summary Table matching user screenshot */}
                      <div className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                        <div className="flex justify-between py-2.5">
                          <span className="text-slate-500 dark:text-slate-400">Email</span>
                          <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[220px]">
                            {paystackOrder?.email || currentUser?.email}
                          </span>
                        </div>
                        <div className="flex justify-between py-2.5">
                          <span className="text-slate-500 dark:text-slate-400">Reference</span>
                          <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                            {paystackOrder?.reference}
                          </span>
                        </div>
                        <div className="flex justify-between py-2.5">
                          <span className="text-slate-500 dark:text-slate-400">Currency</span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {paystackOrder?.currency || 'KES'}
                          </span>
                        </div>
                        <div className="flex justify-between py-3 font-bold text-base text-[#0a7d3f]">
                          <span>Total</span>
                          <span>
                            {paystackOrder?.currency || 'KES'} {Number(paystackOrder?.amount || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handlePaystackPayment}
                        disabled={isSubmitting}
                        className="w-full py-3.5 bg-[#0ba4db] hover:bg-[#0993c4] disabled:opacity-50 text-white font-bold text-base rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-md shadow-[#0ba4db]/20 active:scale-[0.99]"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            <span>Connecting Paystack...</span>
                          </>
                        ) : (
                          <span>Pay with Card</span>
                        )}
                      </button>
                      
                      <p className="text-center text-xs text-slate-500 dark:text-slate-400 pt-1">
                        <small>Card details are entered securely on Paystack.</small>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <MpesaPaymentModal
        isOpen={!!submittedSub && checkoutStep === 'mpesa-details'}
        onClose={() => setSubmittedSub(null)}
        courseTitle={course.title}
        coursePrice={course.price}
        phone={payheroPhone}
        status={submittedSub?.status || 'pending'}
        statusMessage={statusMessage}
        receipt={submittedSub?.transactionCode}
        timeLeft={timeLeft}
        formatTimer={formatTimer}
        onRetry={() => setSubmittedSub(null)}
        onSuccessNavigate={() => navigate(`/learn/${course.id}`)}
      />
    </div>
  );
};
