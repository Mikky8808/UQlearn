import { apiFetch } from '../lib/apiConfig';
import { ALL_CURRENCIES } from '../lib/currencies';

export interface CurrencyItem {
  code: string;
  symbol: string;
  name: string;
  exchange_rate: number;
  is_default: number;
}

export const currencyService = {
  // Fetch supported currencies and user preference from backend API with localStorage fallback
  async getSystemCurrency(userId: string = 'current-user'): Promise<{ preference: string; currencies: CurrencyItem[] }> {
    let localPreference = '';
    try {
      if (typeof localStorage !== 'undefined') {
        const sysCurr = localStorage.getItem('uqlearn_system_currency');
        if (sysCurr && sysCurr.length <= 6 && !sysCurr.startsWith('{')) {
          localPreference = sysCurr;
        } else {
          const raw = localStorage.getItem('uqlearn_currency');
          if (raw) {
            if (raw.startsWith('{')) {
              try {
                const parsed = JSON.parse(raw);
                if (parsed?.code) localPreference = parsed.code;
              } catch (e) {}
            } else if (raw.length <= 6) {
              localPreference = raw;
            }
          }
        }
      }
    } catch (e) {}

    try {
      const res = await apiFetch(`currencies.php?user_id=${encodeURIComponent(userId)}`, {}, 0);
      if (res && res.success) {
        const pref = res.preference || localPreference || 'KES';
        if (typeof localStorage !== 'undefined' && pref) {
          localStorage.setItem('uqlearn_system_currency', pref);
          localStorage.setItem('uqlearn_currency', pref);
        }
        return {
          preference: pref,
          currencies: res.currencies && res.currencies.length > 0 ? res.currencies : ALL_CURRENCIES.map((c, i) => ({
            ...c,
            exchange_rate: c.exchange_rate || (c.code === 'KES' ? 130 : 1),
            is_default: c.code === pref ? 1 : 0
          }))
        };
      }
    } catch (e) {
      console.warn('Failed fetching currencies from API, using fallback:', e);
    }

    const fallbackPref = localPreference || 'KES';
    return {
      preference: fallbackPref,
      currencies: ALL_CURRENCIES.map((c, i) => ({
        ...c,
        exchange_rate: c.exchange_rate || (c.code === 'KES' ? 130 : 1),
        is_default: c.code === fallbackPref ? 1 : 0
      }))
    };
  },

  // Save system currency preference to backend API and localStorage
  async setSystemCurrency(userId: string = 'current-user', currencyCode: string): Promise<boolean> {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('uqlearn_system_currency', currencyCode);
        localStorage.setItem('uqlearn_currency', currencyCode);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('uqlearn_currency_changed', { detail: { currency: currencyCode } }));
      }

      const res = await apiFetch('currencies.php', {
        method: 'POST',
        body: JSON.stringify({
          action: 'set_preference',
          user_id: userId,
          currency_code: currencyCode
        })
      });
      return res && res.success === true;
    } catch (e) {
      console.warn('Failed updating currency preference on API:', e);
      return false;
    }
  },

  // Convert amount from one currency to another
  convertAmount(amount: number, fromCurrencyCode: string, toCurrencyCode: string, currencies: CurrencyItem[]): number {
    if (fromCurrencyCode === toCurrencyCode) return amount;
    
    const fromCurrency = currencies.find(c => c.code === fromCurrencyCode);
    const toCurrency = currencies.find(c => c.code === toCurrencyCode);
    
    if (!fromCurrency || !toCurrency) return amount; // Fallback to original amount if conversion data missing

    // Convert to base (USD equivalent based on provided exchange rates)
    // Assuming exchange_rate is relative to a common base (e.g., USD = 1)
    const amountInBase = amount / fromCurrency.exchange_rate;
    
    // Convert to target
    return amountInBase * toCurrency.exchange_rate;
  }
};
