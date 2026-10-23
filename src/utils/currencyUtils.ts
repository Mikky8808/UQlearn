import { ALL_CURRENCIES } from '../lib/currencies';

export const STANDARD_KES_USD_RATE = 130;

export interface NormalizedTransaction {
  id: string;
  studentName: string;
  courseTitle: string;
  rawAmount: number;
  currency: 'KES' | 'USD';
  amountInKes: number;
  amountInUsd: number;
  paymentMethod: string;
  status: string;
  date: string;
}

export const currencyUtils = {
  rate: STANDARD_KES_USD_RATE,

  toKes(amount: number, currency: 'KES' | 'USD'): number {
    if (currency === 'USD' || amount < 100) {
      return amount * STANDARD_KES_USD_RATE;
    }
    return amount;
  },

  toUsd(amount: number, currency: 'KES' | 'USD'): number {
    if (currency === 'KES' || amount >= 100) {
      return amount / STANDARD_KES_USD_RATE;
    }
    return amount;
  },

  formatKes(amount: number): string {
    return `KSh ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  },

  formatUsd(amount: number): string {
    return `$${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
  },

  getAppealFeeAmount(currencyCode?: string, rate?: number): number {
    const baseUsd = 0.55;
    const targetCode = currencyCode || (typeof localStorage !== 'undefined' ? (localStorage.getItem('uqlearn_system_currency') || 'KES') : 'KES');
    if (targetCode === 'USD') return 0.55;
    if (targetCode === 'KES') return 71.50;

    let targetRate = rate;
    if (!targetRate) {
      const match = ALL_CURRENCIES.find(c => c.code === targetCode);
      targetRate = match?.exchange_rate || 1;
    }
    return Number((baseUsd * targetRate).toFixed(2));
  },

  getAppealFeeFormatted(currencyCode?: string, rate?: number, symbol?: string): string {
    const baseUsd = 0.55;
    const targetCode = currencyCode || (typeof localStorage !== 'undefined' ? (localStorage.getItem('uqlearn_system_currency') || 'KES') : 'KES');
    if (targetCode === 'USD') return '$0.55';
    if (targetCode === 'KES') return 'KSh 71.50';

    let targetRate = rate;
    let targetSymbol = symbol;
    if (!targetRate || !targetSymbol) {
      const match = ALL_CURRENCIES.find(c => c.code === targetCode);
      if (match) {
        targetRate = targetRate || match.exchange_rate;
        targetSymbol = targetSymbol || match.symbol;
      }
    }

    const converted = baseUsd * (targetRate || 1);
    const formatted = converted.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return `${targetSymbol || targetCode} ${formatted}`;
  },

  normalize(sub: {
    id?: string;
    studentName?: string;
    courseTitle?: string;
    coursePrice?: number;
    amount?: number;
    amountKes?: number;
    amountUsd?: number;
    currency?: string;
    paymentMethod?: string;
    status?: string;
    enrolledAt?: string;
    date?: string;
  }): NormalizedTransaction {
    const raw = Number(sub.coursePrice || sub.amount || 0);
    const curr = (sub.currency === 'KES' || sub.currency === 'KSh' || raw >= 100 || sub.paymentMethod === 'payhero_stk' || sub.paymentMethod === 'm-pesa') ? 'KES' : 'USD';

    const kes = sub.amountKes || (curr === 'KES' ? raw : raw * STANDARD_KES_USD_RATE);
    const usd = sub.amountUsd || (curr === 'USD' ? raw : raw / STANDARD_KES_USD_RATE);

    return {
      id: sub.id || `tx_${Math.random()}`,
      studentName: sub.studentName || 'Learner',
      courseTitle: sub.courseTitle || 'Course Enrollment',
      rawAmount: raw,
      currency: curr,
      amountInKes: kes,
      amountInUsd: usd,
      paymentMethod: sub.paymentMethod || 'online',
      status: sub.status || 'active',
      date: sub.enrolledAt || sub.date || new Date().toISOString()
    };
  }
};
