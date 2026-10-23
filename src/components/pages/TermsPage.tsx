import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  UserCheck, 
  BookOpen, 
  CreditCard, 
  AlertTriangle, 
  Lock, 
  Layers, 
  Sparkles, 
  Award, 
  Video, 
  Scale, 
  RefreshCw, 
  Mail 
} from 'lucide-react';
import { Footer } from '../common/Footer';

export const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full">
        
        {/* Breadcrumb Navigation */}
        <div className="text-xs text-slate-500 mb-6 flex items-center space-x-2">
          <Link to="/" className="hover:text-teal-600 dark:hover:text-teal-400">Home</Link>
          <span>/</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">Terms of Use</span>
        </div>

        {/* Page Header */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 shadow-xs mb-8 rounded-none">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2.5 bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                UQlearn Terms of Use
              </h1>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Last updated: July 31, 2026
              </p>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-4">
            Please review these Terms carefully. They form an enforceable contract between you and UQlearn and contain important information about your legal rights.
          </p>
        </div>

        {/* Content Body */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 space-y-8 rounded-none">
          
          <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">
            <p>
              UQlearn&apos;s mission is to improve lives through learning. We enable anyone to create and share educational content (instructors) and to access that content to learn (students). These Terms apply to all your activities on the UQlearn website, mobile applications, TV applications, APIs, and related services (&quot;Services&quot;).
            </p>
            <p className="text-xs text-slate-500">
              If you act as an instructor, you must also agree to the Instructor Terms. Our Privacy Policy describes how we handle personal data. If you use UQlearn through your employer&apos;s UQlearn Business program, consult our UQlearn Business Privacy Statement.
            </p>
          </div>

          {/* 1. Accounts */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <UserCheck className="w-4 h-4 text-teal-600" />
              <span>1. Accounts</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              You need an account for most activities. You are responsible for all activity on your account and must keep your password safe. You must be at least 18 years old to create an account. If you are younger than 18 but above the age of consent where you live, a parent or guardian may open an account for you. You may not share your login credentials or transfer your account. Notify us immediately if you suspect unauthorized use. You can terminate your account at any time.
            </p>
          </section>

          {/* 2. Content Enrollment and Lifetime Access */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <BookOpen className="w-4 h-4 text-teal-600" />
              <span>2. Content Enrollment and Lifetime Access</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              When you enroll in a course, you receive a limited, non-exclusive, non-transferable license to view the content for personal, non-commercial, educational purposes. Content is licensed, not sold. You may not reproduce, resell, share, or redistribute content. We generally grant lifetime access, but we may revoke access if required by law or policy. Lifetime access does not apply to Subscription Plans, Coaching Services, or add-on features.
            </p>
          </section>

          {/* 3. Payments, Credits, and Refunds */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <CreditCard className="w-4 h-4 text-teal-600" />
              <span>3. Payments, Credits, and Refunds</span>
            </h2>
            <div className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <p><strong>Pricing:</strong> Prices are determined by Instructor Terms and our Promotions Policy. Prices may vary by platform and location. Taxes may be added at checkout.</p>
              <p><strong>Payments:</strong> You agree to pay all fees and authorize us to charge your payment method. We work with payment service providers to keep your information secure.</p>
              <p><strong>Refunds:</strong> Most content purchases are eligible for a 30-day refund. Subscription Plans, Coaching Services, and Exam Vouchers are not eligible. Refunds may be issued as credits or to your original payment method. We may deny refunds if we suspect abuse.</p>
              <p><strong>Gift and Promotional Codes:</strong> Codes and credits may expire and cannot be refunded for cash. They cannot be used on mobile or TV applications.</p>
            </div>
          </section>

          {/* 3B. Dedicated Tax, Pricing & Currency Terms */}
          <section id="tax-terms" className="space-y-4 p-6 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-700/80 pb-3">
              <Scale className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Tax, Pricing &amp; Currency Terms
                </h2>
                <p className="text-[11px] text-slate-500 font-mono">
                  Last Updated: 10 October 2026
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 dark:text-slate-100">1. Prices Displayed</h3>
                <p>
                  All prices shown on the Platform are in the currency indicated at the point of sale. Prices may be displayed in multiple currencies for convenience. The currency you are charged in is confirmed at checkout before payment is completed.
                </p>
                <p>
                  We reserve the right to change prices, course fees, and available currencies at any time without prior notice. Changes do not affect purchases already completed.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 dark:text-slate-100">2. Taxes and Statutory Charges</h3>
                <p>
                  <strong>2.1</strong> Prices may be shown exclusive of applicable taxes, levies, and statutory charges, which will be added at checkout where required by law.
                </p>
                <div className="pl-3 border-l-2 border-indigo-500/40 space-y-1">
                  <p>
                    <strong>2.2</strong> The tax treatment of your purchase depends on your location and tax status:
                  </p>
                  <ul className="list-disc pl-5 space-y-0.5">
                    <li><strong>Customers within Kenya:</strong> Purchases are subject to Value Added Tax (VAT) at the prevailing statutory rate, where applicable.</li>
                    <li><strong>Customers outside Kenya:</strong> Purchases may qualify as exported services and be zero-rated for VAT purposes, subject to verification of your location and consumption of the service outside Kenya.</li>
                  </ul>
                </div>
                <p>
                  <strong>2.3</strong> Where you purchase on behalf of a business and wish to claim input tax, you are responsible for providing accurate tax registration details at checkout. We are not liable for any tax you are unable to recover due to incorrect or incomplete information provided by you.
                </p>
                <p>
                  <strong>2.4</strong> If you are exempt from tax or entitled to a reduced rate under applicable law, you must notify us before purchase and provide valid supporting documentation. We may apply the exemption only where we are satisfied the documentation meets legal requirements.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 dark:text-slate-100">3. Determining Your Location</h3>
                <p>
                  <strong>3.1</strong> To determine the correct tax treatment of your purchase, we may collect and rely on location indicators, including billing address provided at checkout, country associated with your payment method, IP address or device location at the time of purchase, and any other information you provide.
                </p>
                <p>
                  <strong>3.2</strong> You agree to provide accurate location information. Providing false or misleading location details to obtain a tax advantage is a breach of these Terms and may result in cancellation of your purchase without refund and reporting to the relevant authorities.
                </p>
                <p>
                  <strong>3.3</strong> Where our records indicate your purchase is consumed outside Kenya, we may apply zero-rating. If evidence later shows the service was consumed in Kenya, we reserve the right to charge the applicable tax retroactively.
                </p>
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 dark:text-slate-100">4. Currency Conversion</h3>
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

              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 dark:text-slate-100">5. Invoices and Records</h3>
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

              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 dark:text-slate-100">6. Tax Withholding</h3>
                <p>
                  <strong>6.1</strong> If you are required by law to withhold tax on payments to us, you must notify us before payment, provide a valid withholding tax certificate, and pay the withheld amount to the relevant authority and remit the balance to us.
                </p>
                <p>
                  <strong>6.2</strong> Where you fail to provide a valid withholding tax certificate, we may treat the full invoiced amount as payable and you remain liable for the withheld portion.
                </p>
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 dark:text-slate-100">7. Changes to Tax Treatment</h3>
                <p>
                  <strong>7.1</strong> Tax laws, rates, and rules may change. We reserve the right to adjust pricing and tax treatment to reflect changes in applicable law, without prior notice to you.
                </p>
                <p>
                  <strong>7.2</strong> Where a change in tax law affects a purchase already made but not yet delivered, we may adjust the amount payable or, at our discretion, cancel the purchase and issue a refund.
                </p>
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 dark:text-slate-100">8. Your Responsibilities</h3>
                <p>
                  By making a purchase on the Platform, you confirm that the information you provide is accurate and complete, you will not misrepresent your location or tax status, you will comply with all tax obligations applicable to you in your jurisdiction, and you will not use the Platform to evade tax or facilitate tax evasion by others.
                </p>
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 dark:text-slate-100">9. Contact</h3>
                <p>
                  For questions about tax, pricing, or invoicing, contact us at <a href="mailto:support@uqlearn.org" className="text-teal-600 dark:text-teal-400 font-bold underline">support@uqlearn.org</a>.
                </p>
              </div>
            </div>
          </section>

          {/* 4. Content and Behavior Rules */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <AlertTriangle className="w-4 h-4 text-teal-600" />
              <span>4. Content and Behavior Rules</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              You may only use UQlearn for lawful purposes. You are responsible for your behavior and all content you post. You must respect the intellectual property rights of others. We may remove content or ban your account for violations. If you believe your copyright is infringed, contact us.
            </p>
          </section>

          {/* 5. UQlearn's Rights to Content You Post */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Lock className="w-4 h-4 text-teal-600" />
              <span>5. UQlearn&apos;s Rights to Content You Post</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              You retain ownership of content you post. By posting, you grant UQlearn a worldwide, non-exclusive, royalty-free license to use, share, distribute, and promote your content. You waive any privacy or publicity rights related to these uses. You represent that you have the rights to authorize these uses.
            </p>
          </section>

          {/* 6. Using UQlearn at Your Own Risk */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              6. Using UQlearn at Your Own Risk
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              We do not review or edit content for legal issues and do not guarantee its reliability or accuracy. You may be exposed to offensive content. We are not liable for interactions between instructors and students. We are not responsible for third-party websites or advertisements.
            </p>
          </section>

          {/* 7. UQlearn's Rights */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              7. UQlearn&apos;s Rights
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              We own the UQlearn platform and Services, including our website, apps, APIs, and content created by our employees. You may not tamper with, copy, reverse engineer, or misuse our platform. You may not scrape, spam, or interfere with the Services.
            </p>
          </section>

          {/* 8. Subscription Terms */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Layers className="w-4 h-4 text-teal-600" />
              <span>8. Subscription Terms</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Subscription Plans grant a limited, non-exclusive, non-transferable license to access included content. Subscriptions may include Interactive Sessions and GenAI Features. You may not share your subscription.
            </p>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-1 leading-relaxed">
              <li><strong>Account Management:</strong> You may cancel your subscription at any time. Access ends at the end of your billing period. No refunds for partially used periods.</li>
              <li><strong>Free Trials &amp; Renewals:</strong> Subscriptions may start with a free trial and automatically renew unless cancelled.</li>
              <li><strong>Payments and Billing:</strong> Subscription fees are listed at purchase. We may adjust pricing with notice. If payment fails or is disputed, we may suspend or terminate your subscription.</li>
              <li><strong>Interactive Session Restrictions:</strong> You may not use Interactive Sessions for unauthorized purposes, exceed usage limits, or disrupt our infrastructure.</li>
              <li><strong>Subscription Disclaimers:</strong> We do not guarantee availability of specific content and may modify or terminate Subscription Plans at any time.</li>
            </ul>
          </section>

          {/* 9. Generative AI Terms */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Sparkles className="w-4 h-4 text-teal-600" />
              <span>9. Generative AI Terms</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <strong>Inputs and Outputs:</strong> You retain ownership of Input and grant UQlearn rights to use it. UQlearn grants you a limited license to use GenAI Features and Output for personal, non-commercial, educational purposes.
            </p>
            <div className="p-3 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-xs font-bold text-teal-900 dark:text-teal-200">
              ⚡ No Model Training: We do not use your personal data to train or fine-tune GenAI models.
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <strong>Restrictions &amp; Disclaimers:</strong> You may not use GenAI Features to violate laws, mislead others, submit sensitive information, extract data, or make consequential decisions. Output may be incorrect or misleading. You are responsible for verifying Output.
            </p>
          </section>

          {/* 10. Exam Vouchers */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Award className="w-4 h-4 text-teal-600" />
              <span>10. Exam Vouchers</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Exam Vouchers are non-refundable, non-transferable, and non-exchangeable. They are valid only for the specified exam and provider and expire as stated at purchase. UQlearn is not responsible for redemption failures due to regional restrictions or provider changes.
            </p>
          </section>

          {/* 11. Coaching Services */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Video className="w-4 h-4 text-teal-600" />
              <span>11. Coaching Services</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Coaching Services connect you with instructors for live sessions. Sessions are non-refundable except as stated. You may cancel for a full refund up to 48 hours before a session. You are responsible for your behavior and may not record or share sessions. Coaching Services do not create a professional-client relationship.
            </p>
          </section>

          {/* 12. Miscellaneous Legal Terms */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Scale className="w-4 h-4 text-teal-600" />
              <span>12. Miscellaneous Legal Terms</span>
            </h2>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <li><strong>Binding Agreement:</strong> By using the Services, you agree to these Terms. If any part is invalid, the rest remains in effect.</li>
              <li><strong>Disclaimers:</strong> The Services are provided &quot;as is&quot; and &quot;as available.&quot; We make no warranties about suitability, reliability, or accuracy.</li>
              <li><strong>Limitation of Liability:</strong> We are not liable for indirect, incidental, or consequential damages. Our total liability is limited to the greater of $100 USD or the amount you paid us in the 12 months before the claim.</li>
              <li><strong>Indemnification:</strong> You agree to indemnify UQlearn against claims arising from your content, use of the Services, or violation of these Terms.</li>
              <li><strong>Governing Law:</strong> If you are a student in India, you contract with UQlearn India LLP under Indian law. Otherwise, you contract with UQlearn, Inc. under California law.</li>
              <li><strong>Legal Actions &amp; Assignment:</strong> Claims must be brought within one year. Notices must be in writing. You may not transfer your account or these Terms.</li>
              <li><strong>Sanctions &amp; Recommendation Systems:</strong> You warrant that you are not located in a sanctioned country. We suggest content based on your activity and information provided.</li>
            </ul>
          </section>

          {/* 13. Updating These Terms */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <RefreshCw className="w-4 h-4 text-teal-600" />
              <span>13. Updating These Terms</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              We may update these Terms at any time. Material changes will be notified via email or in-product notice. Continued use of the Services means you accept the revised Terms.
            </p>
          </section>

          {/* 14. How to Contact Us */}
          <section className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Mail className="w-4 h-4 text-teal-600" />
              <span>14. How to Contact Us</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              The best way to reach us is through our Support Team or at{' '}
              <a href="mailto:support@uqlearn.com" className="text-teal-600 dark:text-teal-400 font-bold hover:underline">
                support@uqlearn.com
              </a>. We welcome your questions, concerns, and feedback.
            </p>
            <p className="text-xs font-bold text-teal-700 dark:text-teal-300 pt-1">
              Thanks for teaching and learning with us!
            </p>
          </section>

        </div>
      </div>

      <Footer />
    </div>
  );
};
