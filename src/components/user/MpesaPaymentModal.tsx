import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, CheckCircle2, XCircle, Smartphone, Clock, Play, ArrowLeft } from 'lucide-react';
import { ROOT_URL } from '../../lib/apiConfig';

interface MpesaPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseTitle: string;
  coursePrice: number;
  phone: string;
  status: 'pending' | 'active' | 'rejected' | 'expired' | 'FAILED' | 'QUEUED';
  statusMessage: string;
  receipt?: string;
  timeLeft: number;
  formatTimer: (secs: number) => string;
  onRetry: () => void;
  onSuccessNavigate: () => void;
}

export const MpesaPaymentModal: React.FC<MpesaPaymentModalProps> = ({
  isOpen,
  onClose,
  courseTitle,
  coursePrice,
  phone,
  status,
  statusMessage,
  receipt,
  timeLeft,
  formatTimer,
  onRetry,
  onSuccessNavigate
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const isSuccess = status === 'active';
  const isFailed = ['rejected', 'expired', 'FAILED'].includes(status);

  // Sequential responses logic
  useEffect(() => {
    if (!isOpen) {
      setCurrentStepIndex(0);
      return;
    }

    if (isSuccess || isFailed) {
      setCurrentStepIndex(2);
      return;
    }

    const timer = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < 2) return prev + 1;
        return prev;
      });
    }, 2000);

    return () => clearInterval(timer);
  }, [isOpen, isSuccess, isFailed]);

  if (!isOpen) return null;

  const steps = [
    {
      title: 'STK Push Triggered',
      desc: `Sent payment request to ${phone}.`
    },
    {
      title: 'Waiting for PIN Authorization',
      desc: 'Check your phone and enter your M-Pesa PIN.'
    },
    {
      title: isSuccess ? 'Payment Confirmed & Verified' : isFailed ? 'Payment Failed or Cancelled' : 'Verifying Payment Response',
      desc: statusMessage
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden p-6 sm:p-8 space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <img 
              src={`${ROOT_URL}/uploads/logo/mpesa.png`} 
              alt="M-Pesa" 
              className="h-8 object-contain"
            />
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">M-Pesa Express Checkout</h3>
            </div>
          </div>
          {status !== 'pending' && (
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full cursor-pointer"
            >
              <XCircle className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Status Icon Header */}
        <div className="text-center space-y-3">
          {isSuccess ? (
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>
          ) : isFailed ? (
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/60 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <XCircle className="w-8 h-8" />
            </div>
          ) : (
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-500 animate-ping opacity-25"></div>
              <div className="w-full h-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-full flex items-center justify-center relative z-10 shadow-inner">
                <Smartphone className="w-7 h-7 animate-pulse" />
              </div>
            </div>
          )}

          <div>
            <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {isSuccess ? 'Payment Successful!' : isFailed ? 'Transaction Failed' : 'Processing Payment'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isSuccess ? `Receipt: ${receipt || 'CONFIRMED'}` : isFailed ? 'The M-Pesa STK Push request was declined or timed out.' : 'Showing payment responses one after the other...'}
            </p>
          </div>
        </div>

        {/* Sequential Responses Container (One after the other) */}
        <div className="space-y-3 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
          <AnimatePresence mode="popLayout">
            {steps.slice(0, isSuccess || isFailed ? 3 : currentStepIndex + 1).map((step, idx) => {
              const isLatest = idx === (isSuccess || isFailed ? 2 : currentStepIndex);
              const isCompleted = idx < (isSuccess || isFailed ? 2 : currentStepIndex);
              
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-start space-x-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs"
                >
                  <div className="mt-0.5 shrink-0">
                    {isSuccess || isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : isFailed && isLatest ? (
                      <XCircle className="w-5 h-5 text-rose-500" />
                    ) : isLatest ? (
                      <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-slate-300 dark:text-slate-700" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{step.title}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{step.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Timer if pending */}
        {status === 'pending' && (
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
            <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
              <Clock className="w-4 h-4 animate-spin" /> Waiting for authorization...
            </span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 text-sm">
              {formatTimer(timeLeft)}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2">
          {isSuccess ? (
            <button
              onClick={onSuccessNavigate}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Play className="w-4 h-4" />
              <span>Start Learning Now</span>
            </button>
          ) : isFailed ? (
            <button
              onClick={onRetry}
              className="w-full py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          ) : (
            <button
              onClick={onRetry}
              className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel Transaction
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
