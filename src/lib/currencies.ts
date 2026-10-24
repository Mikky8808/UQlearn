export interface CurrencyDefinition {
  code: string;
  symbol: string;
  name: string;
  exchange_rate: number;
}

export const ALL_CURRENCIES: CurrencyDefinition[] = [
  { code: 'NGN', symbol: '₦', name: 'Naira', exchange_rate: 1400.0 },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghana Cedi', exchange_rate: 15.5 },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', exchange_rate: 130.0 },
  { code: 'ZMW', symbol: 'ZK', name: 'Zambian Kwacha', exchange_rate: 26.0 },
  { code: 'USD', symbol: '$', name: 'US Dollar', exchange_rate: 1.0 },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', exchange_rate: 18.5 },
  { code: 'XAF', symbol: 'FCFA', name: 'CFA Franc (Central)', exchange_rate: 600.0 },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling', exchange_rate: 3700.0 },
];
