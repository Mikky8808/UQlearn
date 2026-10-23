import React, { useState, useEffect } from 'react';
import { CreditCard, Smartphone, Shield, Zap, Globe, Plus, CheckCircle, Loader2 } from 'lucide-react';
import { paymentGatewayService, SdkTransactionResult } from '../../services/payment-gateway-service';
import { apiFetch } from '../../lib/apiConfig';

export type PaymentMethodId = 'Visa Cards' | 'Google Pay' | 'PayPal' | 'MPESA' | 'Apple Pay' | 'Bank Transfer';

export interface PaymentOption {
  id: PaymentMethodId;
  name: string;
  category: 'Card' | 'Digital Wallet' | 'Mobile Money' | 'Bank';
  description: string;
  badge: string;
  iconType: 'visa' | 'googlepay' | 'paypal' | 'mpesa' | 'apple' | 'bank';
}

interface PaymentMethodManagerProps {
  selectedMethod: PaymentMethodId;
  onSelectMethod: (method: PaymentMethodId) => void;
  onAddNewMethod?: () => void;
  onSimulatedResult?: (result: SdkTransactionResult) => void;
}

export const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: 'Visa Cards',
    name: 'Visa / Mastercard',
    category: 'Card',
    description: 'Instant debit or credit card transaction',
    badge: 'Popular',
    iconType: 'visa',
  },
  {
    id: 'Google Pay',
    name: 'Google Pay',
    category: 'Digital Wallet',
    description: 'Fast, secure checkout using your Google account',
    badge: 'Instant',
    iconType: 'googlepay',
  },
  {
    id: 'PayPal',
    name: 'PayPal',
    category: 'Digital Wallet',
    description: 'Pay securely with your PayPal balance or linked bank',
    badge: 'Secure',
    iconType: 'paypal',
  },
  {
    id: 'MPESA',
    name: 'M-PESA',
    category: 'Mobile Money',
    description: 'Instant STK push prompt directly to your mobile phone',
    badge: 'East Africa',
    iconType: 'mpesa',
  },
  {
    id: 'Apple Pay',
    name: 'Apple Pay',
    category: 'Digital Wallet',
    description: 'One-touch biometric payment via Apple device',
    badge: 'Express',
    iconType: 'apple',
  },
  {
    id: 'Bank Transfer',
    name: 'Direct Wire',
    category: 'Bank',
    description: 'Secure bank-to-bank transfer with verification',
    badge: 'Global',
    iconType: 'bank',
  },
];

export const PaymentMethodManager: React.FC<PaymentMethodManagerProps> = ({
  selectedMethod,
  onSelectMethod,
  onAddNewMethod,
  onSimulatedResult,
}) => {
  const [paymentOptions, setPaymentOptions] = useState<PaymentOption[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [simulatingId, setSimulatingId] = useState<PaymentMethodId | null>(null);
  const [simulationResult, setSimulationResult] = useState<SdkTransactionResult | null>(null);

  // Load active gateways dynamically from API / localStorage
  useEffect(() => {
    const loadGateways = async () => {
      setIsLoading(true);
      try {
        const data = await apiFetch('payment-gateways.php');
        if (data && data.success && Array.isArray(data.data)) {
          // Filter active gateways and map to PaymentOption format
          const activeGateways = data.data
            .filter((g: any) => g.isActive || g.is_active === 1 || g.is_active === true)
            .map((g: any) => {
              const slug = (g.slug || g.name).toLowerCase();
              let iconType: PaymentOption['iconType'] = 'bank';
              if (slug.includes('visa') || slug.includes('card') || slug.includes('stripe')) iconType = 'visa';
              else if (slug.includes('google')) iconType = 'googlepay';
              else if (slug.includes('paypal')) iconType = 'paypal';
              else if (slug.includes('mpesa') || slug.includes('m-pesa')) iconType = 'mpesa';
              else if (slug.includes('apple')) iconType = 'apple';

              return {
                id: g.name as PaymentMethodId,
                name: g.name,
                category: slug.includes('mpesa') ? 'Mobile Money' : slug.includes('pay') || slug.includes('paypal') ? 'Digital Wallet' : slug.includes('card') || slug.includes('visa') ? 'Card' : 'Bank',
                description: `Processed securely via ${g.name} (${g.environment || 'sandbox'})`,
                badge: g.environment === 'production' ? 'Live' : 'Sandbox',
                iconType,
              };
            });

          if (activeGateways.length > 0) {
            setPaymentOptions(activeGateways);
            localStorage.setItem('uqlearn_payment_gateways', JSON.stringify(data.data));
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error('Failed to fetch gateways from API, checking local storage:', err);
      }

      // Fallback to localStorage
      try {
        const saved = localStorage.getItem('uqlearn_payment_gateways');
        if (saved) {
          const parsed = JSON.parse(saved);
          const active = parsed
            .filter((g: any) => g.isActive)
            .map((g: any) => {
              const slug = (g.slug || g.name).toLowerCase();
              let iconType: PaymentOption['iconType'] = 'bank';
              if (slug.includes('visa') || slug.includes('card') || slug.includes('stripe')) iconType = 'visa';
              else if (slug.includes('google')) iconType = 'googlepay';
              else if (slug.includes('paypal')) iconType = 'paypal';
              else if (slug.includes('mpesa') || slug.includes('m-pesa')) iconType = 'mpesa';
              else if (slug.includes('apple')) iconType = 'apple';

              return {
                id: g.name as PaymentMethodId,
                name: g.name,
                category: slug.includes('mpesa') ? 'Mobile Money' : 'Digital Wallet',
                description: `Processed securely via ${g.name}`,
                badge: 'Active',
                iconType,
              };
            });
          if (active.length > 0) {
            setPaymentOptions(active);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    loadGateways();
  }, []);

  // Helper to render official-style brand logos / SVG badges
  const renderBrandLogo = (type: PaymentOption['iconType'], isSelected: boolean) => {
    switch (type) {
      case 'visa':
        return (
          <div className={`px-2 py-1 font-black text-xs tracking-tighter ${isSelected ? 'text-white bg-blue-900' : 'text-blue-700 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300'}`}>
            VISA
          </div>
        );
      case 'googlepay':
        return (
          <div className={`px-2 py-1 font-bold text-xs tracking-tight flex items-center space-x-1 ${isSelected ? 'text-white bg-slate-900' : 'text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800'}`}>
            <span className="text-blue-500 font-black">G</span>
            <span>Pay</span>
          </div>
        );
      case 'paypal':
        return (
          <div className={`px-2 py-1 font-black text-xs italic ${isSelected ? 'text-white bg-blue-600' : 'text-blue-600 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-400'}`}>
            P
          </div>
        );
      case 'mpesa':
        return (
          <div className={`px-2 py-1 font-black text-xs ${isSelected ? 'text-white bg-emerald-700' : 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300'}`}>
            M-PESA
          </div>
        );
      case 'apple':
        return (
          <div className={`px-2 py-1 font-bold text-xs flex items-center space-x-0.5 ${isSelected ? 'text-white bg-black' : 'text-black dark:text-white bg-slate-100 dark:bg-slate-800'}`}>
            <span> Pay</span>
          </div>
        );
      case 'bank':
      default:
        return (
          <div className={`p-1.5 ${isSelected ? 'text-white bg-teal-800' : 'text-teal-700 bg-teal-50 dark:bg-teal-950/60 dark:text-teal-300'}`}>
            <Globe className="w-4 h-4" />
          </div>
        );
    }
  };

  const handleSimulateSdk = async (e: React.MouseEvent, method: PaymentMethodId) => {
    e.stopPropagation();
    setSimulatingId(method);
    setSimulationResult(null);

    try {
      let res: SdkTransactionResult;
      if (method === 'MPESA') {
        res = await paymentGatewayService.executeMpesaStkPush('+254712345678', 6499);
      } else if (method === 'PayPal') {
        res = await paymentGatewayService.executePayPalOrder(6499, 'USD');
      } else if (method === 'Google Pay') {
        res = await paymentGatewayService.executeGooglePayTransaction(6499);
      } else {
        res = await paymentGatewayService.executeVisaPayment('4242424242424242', 6499);
      }

      setSimulationResult(res);
      if (onSimulatedResult) {
        onSimulatedResult(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSimulatingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Payment Method ({paymentOptions.length} Available)
        </label>
        {onAddNewMethod && (
          <button
            type="button"
            onClick={onAddNewMethod}
            className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center space-x-1 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Add New Method</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {isLoading ? (
          <div className="col-span-full py-8 text-center text-slate-400 text-xs flex items-center justify-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
            <span>Loading payment gateways...</span>
          </div>
        ) : paymentOptions.length === 0 ? (
          <div className="col-span-full py-8 text-center text-slate-400 text-xs">
            No active payment gateways configured. Please configure payment gateways in the Admin Panel.
          </div>
        ) : (
          paymentOptions.map((m) => {
          const isSelected = selectedMethod === m.id;
          const isSimulating = simulatingId === m.id;
          return (
            <div
              key={m.id}
              onClick={() => onSelectMethod(m.id)}
              className={`p-3 border text-left transition-all flex flex-col justify-between space-y-2 cursor-pointer relative ${
                isSelected
                  ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-500'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                {renderBrandLogo(m.iconType, isSelected)}
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={(e) => handleSimulateSdk(e, m.id)}
                    disabled={isSimulating}
                    className={`text-[9px] px-2 py-0.5 font-bold uppercase transition-all ${
                      isSelected
                        ? 'bg-white text-teal-700 hover:bg-teal-50'
                        : 'bg-teal-600 text-white hover:bg-teal-500'
                    }`}
                  >
                    {isSimulating ? (
                      <span className="flex items-center space-x-1">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        <span>Testing...</span>
                      </span>
                    ) : (
                      'Simulate SDK'
                    )}
                  </button>
                  <span className={`text-[10px] px-2 py-0.5 font-semibold ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                    {m.badge}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-xs">{m.name}</h4>
                <p className={`text-[10px] line-clamp-1 ${isSelected ? 'text-teal-100' : 'text-slate-500 dark:text-slate-400'}`}>
                  {m.description}
                </p>
              </div>
            </div>
          );
        })
        )}
      </div>

      {simulationResult && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>SDK Test Success! Ref: <strong className="font-mono">{simulationResult.transactionReference}</strong> ({simulationResult.gatewayName})</span>
          </div>
          <button
            type="button"
            onClick={() => setSimulationResult(null)}
            className="text-[10px] underline font-bold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};

