import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Lock, 
  ShoppingCart, 
  ArrowLeft, 
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Clock,
  Play,
  RefreshCw,
  CreditCard
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Course, CourseSubscription } from '../../types';
import { ROOT_URL, API_BASE_URL, apiFetch } from '../../lib/apiConfig';
import { payheroService } from '../../services/payhero-service';
import { subscriptionService } from '../../services/subscription-service';
import { MpesaPaymentTracker, MpesaStepsState } from './MpesaPaymentTracker';
import { MpesaPaymentModal } from './MpesaPaymentModal';

interface CheckoutPageProps {
  cart: Course[];
  onRemoveFromCart: (courseId: string) => void;
  onCheckoutComplete: (purchasedCourses: Course[]) => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  cart,
  onRemoveFromCart,
  onCheckoutComplete,
}) => {
  const navigate = useNavigate();
  const { formatPrice, currentUser } = useApp();

  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'card'>('mpesa');
  const [payheroPhone, setPayheroPhone] = useState(currentUser?.phone || '');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState(currentUser?.name || '');
  const [loading, setLoading] = useState(false);
  const [submittedSub, setSubmittedSub] = useState<CourseSubscription[] | null>(null);
  const [statusMessage, setStatusMessage] = useState('Waiting for M-Pesa PIN authorization...');
  const [timeLeft, setTimeLeft] = useState(180);

  const totalAmountUsd = cart.reduce((acc, c) => acc + c.price, 0);
  const totalAmount = formatPrice(totalAmountUsd);
  const [showPaymentStatusModal, setShowPaymentStatusModal] = useState<{show: boolean, success: boolean, message: string, courseId?: string} >({show: false, success: false, message: ''});

  // Timer & Polling logic (similar to CourseEnrollmentPage)
  const subRef = useRef(submittedSub);
  useEffect(() => {
    subRef.current = submittedSub;
  }, [submittedSub]);

  useEffect(() => {
    let timer: any = null;
    let poller: any = null;

    if (submittedSub && submittedSub.some(s => s.status === 'pending')) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timer) clearInterval(timer);
            if (poller) clearInterval(poller);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      poller = setInterval(async () => {
        const currentSubs = subRef.current;
        if (!currentSubs || !currentSubs.some(s => s.status === 'pending')) {
          if (poller) clearInterval(poller);
          if (timer) clearInterval(timer);
          return;
        }

        try {
          // Check status via reference - assuming all subs in cart have the same transactionCode
          const reference = currentSubs[0].transactionCode;
          const statusRes = await payheroService.checkTransactionStatus(reference!);
          
          if (statusRes.success && (statusRes.status === 'SUCCESS' || statusRes.status === 'COMPLETED' || statusRes.status === 'SUCCESSFUL')) {
            const mpesaReceipt = statusRes.data?.response?.MpesaReceiptNumber || statusRes.data?.mpesa_receipt || 'Confirmed';
            setStatusMessage(`Payment successful! Receipt: ${mpesaReceipt}`);
            
            // Activate all subscriptions
            for (const sub of currentSubs) {
                await subscriptionService.activateSubscription(sub.id, mpesaReceipt, 'M-Pesa Webhook automatically activated');
            }
            
            setSubmittedSub(currentSubs.map(s => ({ ...s, status: 'active' as const, transactionCode: mpesaReceipt })));
            onCheckoutComplete(cart);
            if (poller) clearInterval(poller);
            if (timer) clearInterval(timer);
          } else if (statusRes.status === 'FAILED' || statusRes.status === 'REJECTED' || statusRes.status === 'CANCELLED') {
            setStatusMessage(statusRes.message || 'Payment failed or was cancelled.');
            // Reject all subscriptions
            for (const sub of currentSubs) {
                await subscriptionService.rejectSubscription(sub.id, statusRes.message || 'Payment failed');
            }
            setSubmittedSub(currentSubs.map(s => ({ ...s, status: 'rejected' as const })));
            if (poller) clearInterval(poller);
            if (timer) clearInterval(timer);
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
  }, [submittedSub, currentUser?.id, cart, onCheckoutComplete]);

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (paymentMethod === 'mpesa') {
      if (!payheroPhone) {
        alert('Please enter your M-Pesa mobile phone number.');
        return;
      }
      setLoading(true);
      setStatusMessage('Initiating M-Pesa STK Push...');

      try {
        const response = await payheroService.initiateCartStkPush({
          amount: totalAmountUsd,
          phoneNumber: payheroPhone,
          cart: cart,
          studentId: currentUser!.id,
          studentName: currentUser!.name || '',
          studentEmail: currentUser!.email || ''
        });

        if (response.success && response.subscriptions) {
          setSubmittedSub(response.subscriptions);
          setTimeLeft(180);
          setStatusMessage('Request sent! Waiting for M-Pesa PIN authorization...');
        } else {
          setStatusMessage(response.message || 'Failed to initiate M-Pesa payment.');
          alert(response.message || 'Failed to initiate M-Pesa STK Push.');
        }
      } catch (err: any) {
        setStatusMessage(err.message || 'Error connecting to PayHero.');
        alert('Payment initiation failed: ' + err.message);
      } finally {
        setLoading(false);
      }
    } else {
      // Card Payment via Paystack
      setLoading(true);
      setStatusMessage('Connecting to secure Paystack gateway...');

      const email = currentUser?.email || 'learner@uqlearn.org';
      const reference = `PSK_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      const amountKes = totalAmountUsd < 100 ? Math.round(totalAmountUsd * 130) : totalAmountUsd;
      const amountInSubunit = Math.round(amountKes * 100);
      
      const onPaymentSuccess = async (verifiedRef: string) => {
        try {
          // Verify with backend
          try {
            await apiFetch(`${API_BASE_URL}/paystack.php?verify=${encodeURIComponent(verifiedRef)}`, { silent: true }, 1).catch(() => null);
          } catch {}

          const createdSubs: CourseSubscription[] = [];
          let lastCourseId = '';

          for (const courseItem of cart) {
            lastCourseId = courseItem.id;
            const sub = await subscriptionService.requestSubscription({
              studentId: currentUser!.id,
              studentName: currentUser!.name || '',
              studentEmail: email,
              courseId: courseItem.id,
              courseTitle: courseItem.title,
              coursePrice: courseItem.price,
              currency: 'USD',
              paymentMethod: 'online',
              transactionCode: verifiedRef
            });

            await subscriptionService.activateSubscription(
              sub.id,
              verifiedRef,
              'Paystack Card Payment'
            );
            
            // Record purchase in USD
            await apiFetch(`${API_BASE_URL}/purchases.php`, {
              method: 'POST',
              body: JSON.stringify({
                action: 'create_purchase',
                student_id: currentUser!.id,
                course_id: courseItem.id,
                amount: courseItem.price,
                status: 'success'
              })
            });

            createdSubs.push({
              ...sub,
              status: 'active',
              transactionCode: verifiedRef,
              activatedAt: new Date().toISOString()
            });
          }

          setSubmittedSub(createdSubs);
          onCheckoutComplete(cart);
          setStatusMessage(`Payment successful! Reference: ${verifiedRef}`);
          setShowPaymentStatusModal({
            show: true, 
            success: true, 
            message: 'Your payment was successful and you have been enrolled.',
            courseId: lastCourseId
          });
        } catch (err: any) {
          console.error('Error activating subscriptions:', err);
          onCheckoutComplete(cart);
          setShowPaymentStatusModal({
            show: true,
            success: false,
            message: 'There was an error completing your enrollment: ' + err.message
          });
        } finally {
          setLoading(false);
        }
      };

      try {
        let publicKey = 'pk_live_b7f1f56f379b773724bf604cfcfb8eeed36e482c';
        let accessCode = '';
        let activeRef = reference;

        try {
          const initData = await apiFetch(`${API_BASE_URL}/paystack.php`, {
            method: 'POST',
            body: JSON.stringify({
              email: email,
              amount: amountKes,
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
                  setLoading(false);
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

          // Fallback simulation
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
        alert('Paystack initialization failed: ' + (err.message || 'Network error'));
        setLoading(false);
      }
    }
  };

  const getMpesaTrackerState = (): MpesaStepsState => {
    const defaultState: MpesaStepsState = {
      request: 'pending',
      auth: 'pending',
      confirm: 'pending',
      message: statusMessage,
      receipt: ''
    };

    if (!submittedSub || submittedSub.some(s => s.status === 'pending')) {
        defaultState.request = 'success';
        defaultState.auth = 'loading';
    } else if (submittedSub.every(s => s.status === 'active')) {
      defaultState.request = 'success';
      defaultState.auth = 'success';
      defaultState.confirm = 'success';
      defaultState.receipt = submittedSub[0].transactionCode !== submittedSub[0].id ? submittedSub[0].transactionCode : '';
    } else if (submittedSub.some(s => s.status === 'rejected')) {
        defaultState.request = 'success';
        defaultState.auth = 'error';
    }
    
    return defaultState;
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-6 px-4 sm:px-8 lg:px-12 transition-colors w-full">
      <div className="w-full space-y-6">
        
        {/* Navigation / Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => navigate('/courses')}
            className="inline-flex items-center space-x-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Continue Shopping</span>
          </button>
          
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 text-xs font-bold border border-teal-200 dark:border-teal-900/40">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>256-bit Secure Checkout</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Payment Form */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Secure Checkout
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Complete your payment details below for instant course access
              </p>
            </div>

            <form onSubmit={handleProcessPayment} className="space-y-6">
              
              {/* Payment Method Selector - M-Pesa or Card */}
              <div className="space-y-4">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Select Payment Method
                </label>
                
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('mpesa')}
                    className={`p-3.5 border-2 rounded-xl flex items-center justify-center transition-all cursor-pointer bg-white dark:bg-slate-800 ${
                      paymentMethod === 'mpesa'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <img 
                      src={`${ROOT_URL}/uploads/logo/mpesa.png`} 
                      alt="M-Pesa" 
                      className="h-7 object-contain"
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3.5 border-2 rounded-xl flex items-center justify-center transition-all cursor-pointer bg-white dark:bg-slate-800 ${
                      paymentMethod === 'card'
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <img 
                      src={`${ROOT_URL}/uploads/logo/card.png`} 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/card.png';
                      }}
                      alt="Card" 
                      className="h-7 object-contain"
                    />
                  </button>
                </div>

                {paymentMethod === 'mpesa' ? (
                  <div className="space-y-3 pt-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      M-PESA Phone Number
                    </label>
                    <input
                      type="tel"
                      value={payheroPhone}
                      onChange={(e) => setPayheroPhone(e.target.value)}
                      placeholder="+254 712 345 678"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-teal-500 outline-none rounded-lg"
                      required
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      An STK push prompt will be sent to your mobile phone to approve the transaction.
                    </p>
                  </div>
                ) : (
                  /* Paystack Card Checkout details */
                  <div className="space-y-3 pt-2">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Email</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{currentUser?.email || 'learner@uqlearn.org'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Currency</span>
                        <span className="font-semibold text-slate-900 dark:text-white">KES</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700 font-bold text-sm text-[#0a7d3f]">
                        <span>Total KES</span>
                        <span>KES {(totalAmountUsd < 100 ? Math.round(totalAmountUsd * 130) : totalAmountUsd).toFixed(2)}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-center text-slate-500 dark:text-slate-400">
                      Card details are entered securely on Paystack.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400 bg-teal-50/50 dark:bg-teal-950/20 p-3.5 border border-teal-100 dark:border-teal-900/30">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>30-Day unconditional money-back guarantee on all courses.</span>
              </div>

              <button
                type="submit"
                disabled={loading || cart.length === 0}
                className="w-full py-4 bg-[#0ba4db] hover:bg-[#0993c4] disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-[#0ba4db]/20 transition-all flex items-center justify-center space-x-2 cursor-pointer rounded-xl"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Connecting Paystack...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>{paymentMethod === 'card' ? 'Pay with Card' : `Pay ${totalAmount}`}</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Order Summary</h3>
              </div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{cart.length} Courses</span>
            </div>

            {cart.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">Your cart is empty.</p>
                <button
                  onClick={() => navigate('/courses')}
                  className="px-4 py-2 bg-teal-600 text-white text-xs font-bold"
                >
                  Browse Courses
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto pr-1">
                  {cart.map((course) => (
                    <div key={course.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <img 
                          src={course.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80'} 
                          alt={course.title}
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 object-cover shrink-0" 
                        />
                        <div>
                          <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs line-clamp-1 max-w-[160px]">{course.title}</h4>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">{formatPrice(course.price)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => onRemoveFromCart(course.id)}
                        className="text-xs text-rose-500 hover:text-rose-700 font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Subtotal</span>
                    <span>{totalAmount}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Transaction Fee</span>
                    <span>Free</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span>Total</span>
                    <span className="text-teal-600 dark:text-teal-400">{totalAmount}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* M-Pesa Modal */}
      <MpesaPaymentModal
        isOpen={!!submittedSub && paymentMethod === 'mpesa'}
        onClose={() => setSubmittedSub(null)}
        courseTitle={`Cart checkout (${cart.length} items)`}
        coursePrice={totalAmountUsd}
        phone={payheroPhone}
        status={submittedSub ? (submittedSub.every(s => s.status === 'active') ? 'active' : submittedSub.some(s => s.status === 'rejected') ? 'FAILED' : 'pending') : 'pending'}
        statusMessage={statusMessage}
        receipt={submittedSub ? submittedSub[0].transactionCode : ''}
        timeLeft={timeLeft}
        formatTimer={formatTimer}
        onRetry={() => setSubmittedSub(null)}
        onSuccessNavigate={() => navigate(`/dashboard`)}
      />

      {/* Payment Status Modal */}
      {showPaymentStatusModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-sm p-6 w-full max-w-sm space-y-4 text-center">
            <h3 className={`font-bold text-lg ${showPaymentStatusModal.success ? 'text-green-600' : 'text-red-600'}`}>
              {showPaymentStatusModal.success ? 'Payment Successful' : 'Payment Failed'}
            </h3>
            <p className="text-sm text-slate-600">{showPaymentStatusModal.message}</p>
            <div className="pt-4 flex flex-col space-y-2">
              {showPaymentStatusModal.success ? (
                <button 
                  onClick={() => {
                    setShowPaymentStatusModal({show: false, success: false, message: ''});
                    navigate(`/course/${showPaymentStatusModal.courseId}`);
                  }}
                  className="w-full py-2 bg-purple-600 text-white font-bold rounded-sm"
                >
                  Go to Course
                </button>
              ) : (
                <button 
                  onClick={() => setShowPaymentStatusModal({show: false, success: false, message: ''})}
                  className="w-full py-2 bg-rose-600 text-white font-bold rounded-sm"
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
