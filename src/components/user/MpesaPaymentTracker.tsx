import React from 'react';
import { Loader2, CheckCircle2, XCircle, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ROOT_URL } from '../../lib/apiConfig';

export type StepStatus = 'pending' | 'loading' | 'success' | 'error';

export interface MpesaStepsState {
  request: StepStatus;
  auth: StepStatus;
  confirm: StepStatus;
  message: string;
  receipt: string;
}

interface MpesaPaymentTrackerProps {
  steps: MpesaStepsState;
}

export const MpesaPaymentTracker: React.FC<MpesaPaymentTrackerProps> = ({ steps }) => {
  const StepItem = ({ 
    label, 
    status, 
    errorMessage, 
    receipt 
  }: { 
    label: string; 
    status: StepStatus; 
    errorMessage?: string; 
    receipt?: string; 
  }) => {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-3"
      >
        <div className="mt-0.5 shrink-0">
          {status === 'pending' && <Circle className="w-5 h-5 text-slate-200 dark:text-slate-700" />}
          {status === 'loading' && <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />}
          {status === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          {status === 'error' && <XCircle className="w-5 h-5 text-rose-500" />}
        </div>
        <div className="flex-1">
          <p className={`text-sm font-medium ${
            status === 'pending' ? 'text-slate-400 dark:text-slate-500' : 
            status === 'error' ? 'text-rose-600 dark:text-rose-400' : 
            status === 'success' ? 'text-emerald-600 dark:text-emerald-400' :
            'text-slate-700 dark:text-slate-200'
          }`}>
            {label}
          </p>
          {status === 'error' && errorMessage && (
            <p className="text-xs text-rose-500 dark:text-rose-400 mt-1">{errorMessage}</p>
          )}
          {status === 'success' && receipt && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-mono font-bold">
              Receipt: {receipt}
            </p>
          )}
          {status === 'loading' && errorMessage && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{errorMessage}</p>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="p-5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-6">
      <div className="flex justify-center">
        <img 
          src={`${ROOT_URL}/uploads/logo/mpesa.png`} 
          alt="M-Pesa" 
          className="h-10 object-contain drop-shadow-sm"
        />
      </div>
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          <StepItem 
            key="step-request"
            label="STK Push Triggered Successfully" 
            status={steps.request} 
            errorMessage={steps.request === 'error' ? steps.message : undefined} 
          />
          
          {steps.request === 'success' && (
            <StepItem 
              key="step-auth"
              label="Waiting for M-Pesa PIN authorization..." 
              status={steps.auth} 
              errorMessage={steps.auth === 'error' ? steps.message : (steps.auth === 'loading' ? steps.message : undefined)} 
            />
          )}

          {steps.auth === 'success' && (
            <StepItem 
              key="step-confirm"
              label="Payment Confirmed" 
              status={steps.confirm} 
              receipt={steps.receipt} 
              errorMessage={steps.confirm === 'error' ? steps.message : undefined}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
