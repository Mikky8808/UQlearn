import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { currencyService, CurrencyItem } from '../services/currency-service';

interface CurrencyContextType {
  systemCurrency: string;
  currenciesList: CurrencyItem[];
  setCurrency: (code: string) => Promise<void>;
  formatPrice: (amount: number, fromCurrencyCode?: string) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [systemCurrency, setSystemCurrency] = useState('KES');
  const [currenciesList, setCurrenciesList] = useState<CurrencyItem[]>([]);

  useEffect(() => {
    currencyService.getSystemCurrency('current-user').then(res => {
      setSystemCurrency(res.preference);
      setCurrenciesList(res.currencies);
    });
  }, []);

  const setCurrency = async (code: string) => {
    const success = await currencyService.setSystemCurrency('current-user', code);
    if (success) {
      setSystemCurrency(code);
    }
  };

  const formatPrice = (amount: number, fromCurrencyCode: string = 'KES') => {
    if (currenciesList.length === 0) return `${fromCurrencyCode} ${amount.toFixed(2)}`;
    
    const converted = currencyService.convertAmount(amount, fromCurrencyCode, systemCurrency, currenciesList);
    const symbol = currenciesList.find(c => c.code === systemCurrency)?.symbol || systemCurrency;
    
    return `${symbol} ${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <CurrencyContext.Provider value={{ systemCurrency, currenciesList, setCurrency, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
