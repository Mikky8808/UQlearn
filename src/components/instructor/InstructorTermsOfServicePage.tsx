import React from 'react';
import { 
  Scale, 
  Receipt, 
  DollarSign, 
  Globe, 
  ShieldCheck, 
  FileText, 
  ExternalLink,
  Landmark,
  AlertCircle,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';
import { InstructorTabKey } from '../navigation/InstructorSidebar';

interface InstructorTermsOfServicePageProps {
  onSelectTab: (tab: InstructorTabKey) => void;
}

export const InstructorTermsOfServicePage: React.FC<InstructorTermsOfServicePageProps> = ({
  onSelectTab
}) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-20">
      
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-3.5">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Scale className="w-6 h-6 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Tax, Pricing &amp; Currency Terms</span>
            </h1>
          </div>
        </div>
      </div>



      {/* 3. Detailed Sections Body */}
      <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs divide-y divide-slate-100 dark:divide-slate-800/80 space-y-8">
        
        {/* Section 1 */}
        <section className="space-y-3 pt-6 first:pt-0">
          <div className="flex items-center space-x-2 text-slate-900 dark:text-slate-100">
            <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-base sm:text-lg font-black tracking-tight">
              1. Prices Displayed &amp; Currency Selection
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            All prices shown across the Platform are in the currency indicated at the point of presentation. Prices may be displayed in multiple regional currencies for user convenience based on geo-location or user currency preference.
          </p>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            The currency charged to the customer is confirmed at checkout prior to authorization. UQlearn reserves the right to adjust nominal catalog prices and conversion schedules. Adjustments do not retroactively alter purchases already settled.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-3 pt-8">
          <div className="flex items-center space-x-2 text-slate-900 dark:text-slate-100">
            <Receipt className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base sm:text-lg font-black tracking-tight">
              2. Taxes and Statutory Charges
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <strong>2.1</strong> Catalog prices may be displayed exclusive of statutory levies, digital services taxes, and Value Added Tax (VAT), which are calculated and applied at checkout where required by applicable law.
          </p>
          <div className="space-y-2 pl-4 border-l-2 border-indigo-500/50 my-3">
            <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              2.2 Statutory Treatment by Learner Jurisdiction:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <li>
                <strong>Customers within Kenya:</strong> Transactions are subjected to Value Added Tax (VAT) at the prevailing statutory rate (currently 16%), where applicable by statutory threshold.
              </li>
              <li>
                <strong>Customers outside Kenya (Exported Services):</strong> Transactions qualify as exported educational services and are treated as zero-rated for VAT purposes, subject to verification of consumption and foreign residence.
              </li>
            </ul>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <strong>2.3 Business Input Tax:</strong> Corporate learners purchasing for organizational accounts are responsible for providing valid tax registration numbers (KRA PIN / VAT identification) at checkout for deduction eligibility.
          </p>
        </section>

        {/* Section 3 */}
        <section className="space-y-3 pt-8">
          <div className="flex items-center space-x-2 text-slate-900 dark:text-slate-100">
            <Globe className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h2 className="text-base sm:text-lg font-black tracking-tight">
              3. Currency Conversion &amp; Exchange Rate Disclaimers
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Where transactions involve multi-currency conversion, rates are derived from institutional market benchmarks plus applicable payment network clearing spreads.
          </p>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Bank card issuers and mobile network operators may levy independent foreign transaction fees. UQlearn bears no liability for third-party banking charges incurred on cross-border payments.
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-3 pt-8">
          <div className="flex items-center space-x-2 text-slate-900 dark:text-slate-100">
            <Landmark className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-base sm:text-lg font-black tracking-tight">
              4. Instructor Revenue Share &amp; Settlement Ledger
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <strong>4.1 Base Accounting Currency:</strong> All instructor earnings and withdrawal ledgers are recorded and reconciled in USD ($). When withdrawals are initiated in local currency, the system converts the input value to the corresponding USD ledger value at settlement.
          </p>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <strong>4.2 Statutory Withholding:</strong> Where local law requires the platform to withhold taxes at source on educator royalty payments, applicable withholding certificates will be furnished to the instructor upon settlement disbursement.
          </p>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <strong>4.3 Settlement Timelines:</strong> Direct bank settlements and mobile money disbursements are fulfilled within one to three (1–3) banking business days following administrative verification.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-3 pt-8">
          <div className="flex items-center space-x-2 text-slate-900 dark:text-slate-100">
            <HelpCircle className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <h2 className="text-base sm:text-lg font-black tracking-tight">
              5. Tax Inquiries &amp; Instructor Support
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            For questions concerning your platform tax status, export exemptions, invoice generation, or payout tax reports, contact our specialized financial compliance desk at <strong className="text-indigo-600 dark:text-indigo-400">support@uqlearn.org</strong>.
          </p>
        </section>

      </div>

    </div>
  );
};
