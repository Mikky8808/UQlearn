import React from 'react';
import { Link } from 'react-router-dom';
import { 
  X, 
  Scale, 
  ShieldCheck, 
  FileText, 
  CheckCircle2, 
  Globe, 
  DollarSign, 
  Receipt, 
  HelpCircle,
  ExternalLink,
  Printer
} from 'lucide-react';

interface TaxTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TaxTermsModal: React.FC<TaxTermsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Tax, Pricing &amp; Currency Terms</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  Terms of Service
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Last Updated: 10 October 2026
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal divide-y divide-slate-100 dark:divide-slate-800/80">
          
          {/* Section 1 */}
          <div className="space-y-2 pt-2 first:pt-0">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              <span>1. Prices Displayed</span>
            </h3>
            <p>
              All prices shown on the Platform are in the currency indicated at the point of sale. Prices may be displayed in multiple currencies for convenience. The currency you are charged in is confirmed at checkout before payment is completed.
            </p>
            <p>
              We reserve the right to change prices, course fees, and available currencies at any time without prior notice. Changes do not affect purchases already completed.
            </p>
          </div>

          {/* Section 2 */}
          <div className="space-y-3 pt-5">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
              <Receipt className="w-4 h-4 text-indigo-500" />
              <span>2. Taxes and Statutory Charges</span>
            </h3>
            <p>
              <strong>2.1</strong> Prices may be shown exclusive of applicable taxes, levies, and statutory charges, which will be added at checkout where required by law.
            </p>
            <div className="space-y-1.5 pl-3 border-l-2 border-indigo-500/40">
              <p>
                <strong>2.2</strong> The tax treatment of your purchase depends on your location and tax status:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>Customers within Kenya:</strong> Purchases are subject to Value Added Tax (VAT) at the prevailing statutory rate, where applicable.
                </li>
                <li>
                  <strong>Customers outside Kenya:</strong> Purchases may qualify as exported services and be zero-rated for VAT purposes, subject to verification of your location and consumption of the service outside Kenya.
                </li>
              </ul>
            </div>
            <p>
              <strong>2.3</strong> Where you purchase on behalf of a business and wish to claim input tax, you are responsible for providing accurate tax registration details at checkout. We are not liable for any tax you are unable to recover due to incorrect or incomplete information provided by you.
            </p>
            <p>
              <strong>2.4</strong> If you are exempt from tax or entitled to a reduced rate under applicable law, you must notify us before purchase and provide valid supporting documentation. We may apply the exemption only where we are satisfied the documentation meets legal requirements.
            </p>
          </div>

          {/* Section 3 */}
          <div className="space-y-3 pt-5">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-500" />
              <span>3. Determining Your Location</span>
            </h3>
            <div className="space-y-1.5 pl-3 border-l-2 border-blue-500/40">
              <p>
                <strong>3.1</strong> To determine the correct tax treatment of your purchase, we may collect and rely on location indicators, including but not limited to:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Billing address provided at checkout</li>
                <li>Country associated with your payment method</li>
                <li>IP address or device location at the time of purchase</li>
                <li>Any other information you provide</li>
              </ul>
            </div>
            <p>
              <strong>3.2</strong> You agree to provide accurate location information. Providing false or misleading location details to obtain a tax advantage is a breach of these Terms and may result in cancellation of your purchase without refund and reporting to the relevant authorities.
            </p>
            <p>
              <strong>3.3</strong> Where our records indicate your purchase is consumed outside Kenya, we may apply zero-rating. If evidence later shows the service was consumed in Kenya, we reserve the right to charge the applicable tax retroactively.
            </p>
          </div>

          {/* Section 4 */}
          <div className="space-y-3 pt-5">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-amber-500" />
              <span>4. Currency Conversion</span>
            </h3>
            <p>
              <strong>4.1</strong> Where you pay in a currency other than the base currency of the Platform, the amount charged is converted at the exchange rate applied at the time of checkout.
            </p>
            <p>
              <strong>4.2</strong> Exchange rates are indicative and may be updated periodically. The final amount charged is confirmed at checkout and may differ slightly from displayed prices due to exchange rate fluctuations between the time of viewing and the time of payment.
            </p>
            <p>
              <strong>4.3</strong> Your bank, card issuer, or payment provider may apply additional foreign transaction fees or use a different exchange rate. We are not responsible for any such charges or differences.
            </p>
          </div>

          {/* Section 5 */}
          <div className="space-y-3 pt-5">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-500" />
              <span>5. Invoices and Records</span>
            </h3>
            <p>
              <strong>5.1</strong> Where required by law, we will issue you a tax invoice for your purchase. Invoices are delivered electronically to the email address associated with your account.
            </p>
            <p>
              <strong>5.2</strong> It is your responsibility to ensure your billing details, tax registration number (where applicable), and email address are accurate and up to date, so that invoices are issued correctly.
            </p>
            <p>
              <strong>5.3</strong> We retain records of transactions for the period required by applicable law. You may request a copy of your invoice by contacting us.
            </p>
          </div>

          {/* Section 6 */}
          <div className="space-y-3 pt-5">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-500" />
              <span>6. Tax Withholding</span>
            </h3>
            <div className="space-y-1.5 pl-3 border-l-2 border-purple-500/40">
              <p>
                <strong>6.1</strong> If you are required by law to withhold tax on payments to us, you must:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Notify us before payment</li>
                <li>Provide a valid withholding tax certificate</li>
                <li>Pay the withheld amount to the relevant authority and remit the balance to us</li>
              </ul>
            </div>
            <p>
              <strong>6.2</strong> Where you fail to provide a valid withholding tax certificate, we may treat the full invoiced amount as payable and you remain liable for the withheld portion.
            </p>
          </div>

          {/* Section 7 */}
          <div className="space-y-3 pt-5">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
              <Scale className="w-4 h-4 text-rose-500" />
              <span>7. Changes to Tax Treatment</span>
            </h3>
            <p>
              <strong>7.1</strong> Tax laws, rates, and rules may change. We reserve the right to adjust pricing and tax treatment to reflect changes in applicable law, without prior notice to you.
            </p>
            <p>
              <strong>7.2</strong> Where a change in tax law affects a purchase already made but not yet delivered, we may adjust the amount payable or, at our discretion, cancel the purchase and issue a refund.
            </p>
          </div>

          {/* Section 8 */}
          <div className="space-y-3 pt-5">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>8. Your Responsibilities</span>
            </h3>
            <p>By making a purchase on the Platform, you confirm that:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>The information you provide is accurate and complete</li>
              <li>You will not misrepresent your location or tax status</li>
              <li>You will comply with all tax obligations applicable to you in your jurisdiction</li>
              <li>You will not use the Platform to evade tax or facilitate tax evasion by others</li>
            </ul>
          </div>

          {/* Section 9 */}
          <div className="space-y-2 pt-5">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-500" />
              <span>9. Contact</span>
            </h3>
            <p>
              For questions about tax, pricing, or invoicing, contact us at <a href="mailto:support@uqlearn.org" className="text-indigo-600 dark:text-indigo-400 font-bold underline">support@uqlearn.org</a>.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            UQlearn Platform Terms • All sales governed by applicable statutory provisions
          </p>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer"
              title="Print Terms"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <Link
              to="/terms#tax-terms"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <span>Full Terms Page</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
