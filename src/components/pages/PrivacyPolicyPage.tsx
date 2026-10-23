import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Database, 
  Cookie, 
  Sliders, 
  Users, 
  Lock, 
  UserCheck, 
  Globe, 
  Mail, 
  MapPin 
} from 'lucide-react';
import { Footer } from '../common/Footer';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full">
        
        {/* Breadcrumb Navigation */}
        <div className="text-xs text-slate-500 mb-6 flex items-center space-x-2">
          <Link to="/" className="hover:text-teal-600 dark:hover:text-teal-400">Home</Link>
          <span>/</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">Privacy Policy</span>
        </div>

        {/* Page Header */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 shadow-xs mb-8 rounded-none">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2.5 bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                UQlearn Privacy Policy
              </h1>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Last updated: August 13, 2026
              </p>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-4">
            Thank you for joining UQlearn. We respect your privacy and want you to understand how we collect, use, and share data about you. This Privacy Policy applies when you visit or use UQlearn websites, mobile applications, APIs, or related services (the &quot;Services&quot;). By using the Services, you agree to this Privacy Policy.
          </p>
        </div>

        {/* Content Body */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 space-y-8 rounded-none">
          
          {/* Section 1: What Data We Get */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Database className="w-5 h-5 text-teal-600" />
              <span>1. What Data We Get</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              We collect data you provide directly, data about your use of content, and data collected automatically.
            </p>

            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                Data You Provide:
              </h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-300">
                <li className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <strong className="text-slate-900 dark:text-white block mb-0.5">Account Data:</strong>
                  Email, password, account settings, and optionally phone number, occupation, and skill interests. Instructors may also provide government ID, photo, date of birth, race/ethnicity, and phone number.
                </li>
                <li className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <strong className="text-slate-900 dark:text-white block mb-0.5">Profile Data:</strong>
                  Photo, headline, biography, language, website, social media, country, and other publicly viewable information.
                </li>
                <li className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <strong className="text-slate-900 dark:text-white block mb-0.5">Shared Content:</strong>
                  Courses, reviews, questions, answers, messages, photos, and other content you post publicly.
                </li>
                <li className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <strong className="text-slate-900 dark:text-white block mb-0.5">Learning Data:</strong>
                  Courses started/completed, purchases, subscriptions, certificates, badges, and exchanges with instructors and students.
                </li>
                <li className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <strong className="text-slate-900 dark:text-white block mb-0.5">Payment Data:</strong>
                  Name, billing address, and ZIP code for purchases. Payment providers handle credit card details. Instructors provide payment account and tax information.
                </li>
                <li className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <strong className="text-slate-900 dark:text-white block mb-0.5">Third-Party Account Data:</strong>
                  Name, user ID, and email from connected social media or third-party platforms.
                </li>
                <li className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <strong className="text-slate-900 dark:text-white block mb-0.5">Promotions &amp; Surveys:</strong>
                  Name, email, address, date of birth, and phone number for participation.
                </li>
                <li className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <strong className="text-slate-900 dark:text-white block mb-0.5">Communications &amp; Support:</strong>
                  Contact information, messages, and other data when you contact us.
                </li>
              </ul>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                Data Collected Automatically:
              </h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-300">
                <li className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <strong className="text-slate-900 dark:text-white block mb-0.5">System Data:</strong>
                  IP address, device type, operating system, unique identifiers, browser, and platform type.
                </li>
                <li className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <strong className="text-slate-900 dark:text-white block mb-0.5">Usage Data:</strong>
                  Content accessed, time spent, pages visited, features used, search queries, and click data.
                </li>
                <li className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <strong className="text-slate-900 dark:text-white block mb-0.5">Approximate Geographic Data:</strong>
                  Country, city, and coordinates based on IP address.
                </li>
                <li className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <strong className="text-slate-900 dark:text-white block mb-0.5">Session Replay:</strong>
                  Clicks, navigation patterns, and form interactions. Sensitive fields are masked. You can opt out via cookie settings.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 2: How We Get Data About You */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Cookie className="w-5 h-5 text-teal-600" />
              <span>2. How We Get Data About You</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              We use cookies, web beacons, and similar tracking technologies. These include:
            </p>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-1 leading-relaxed">
              <li><strong>Strictly Necessary:</strong> Required for the Services to function.</li>
              <li><strong>Functional:</strong> Remember preferences and settings.</li>
              <li><strong>Performance:</strong> Measure and improve the Services.</li>
              <li><strong>Advertising:</strong> Deliver relevant ads based on your activity.</li>
              <li><strong>Social Media:</strong> Enable sharing and build interest profiles.</li>
            </ul>
            <p className="text-xs text-slate-500 italic">
              You can control cookies through your browser settings, but some features may not work properly.
            </p>
          </section>

          {/* Section 3: What We Use Your Data For */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Sliders className="w-5 h-5 text-teal-600" />
              <span>3. What We Use Your Data For</span>
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
              <li className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">Provide and administer the Services</li>
              <li className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">Process payments</li>
              <li className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">Communicate with you about your account</li>
              <li className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">Personalize your experience</li>
              <li className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">Improve Services &amp; develop new features</li>
              <li className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">Analyze trends and usage</li>
              <li className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">Market products, services, and promotions</li>
              <li className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">Display tailored advertisements</li>
              <li className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">Ensure security and prevent fraud</li>
              <li className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">Comply with legal requirements</li>
            </ul>
            <div className="p-3 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-xs text-teal-900 dark:text-teal-200 font-bold">
              🛡️ GenAI Privacy Guarantee: We do not use your personal data to train or fine-tune GenAI models.
            </div>
          </section>

          {/* Section 4: Who We Share Your Data With */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Users className="w-5 h-5 text-teal-600" />
              <span>4. Who We Share Your Data With</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              We may share your data with:
            </p>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-1.5 leading-relaxed">
              <li><strong>Instructors:</strong> Data about your activity (but not your email address).</li>
              <li><strong>Other Students and Instructors:</strong> Publicly viewable profile and shared content.</li>
              <li><strong>Service Providers:</strong> Companies performing services on our behalf, such as payment processing, analytics, and marketing.</li>
              <li><strong>UQlearn Affiliates:</strong> To support our Services.</li>
              <li><strong>Business Partners:</strong> To distribute our Services and drive traffic.</li>
              <li><strong>Credit-Granting Organizations:</strong> For continuing education requirements.</li>
              <li><strong>Analytics and Data Enrichment Services:</strong> Such as Google Analytics and ZoomInfo.</li>
              <li><strong>Social Media Providers:</strong> To power social features.</li>
              <li><strong>Advertisers:</strong> For targeted advertising.</li>
              <li><strong>Legal Authorities:</strong> When required by law or to protect rights and safety.</li>
              <li><strong>Successor Organizations:</strong> During a merger, acquisition, or sale of assets.</li>
            </ul>
            <p className="text-xs text-slate-500">
              We may also share aggregated or de-identified data for any purpose.
            </p>
          </section>

          {/* Section 5: Security */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Lock className="w-5 h-5 text-teal-600" />
              <span>5. Security</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              We use appropriate security measures based on the type and sensitivity of data. However, no system is 100% secure. You are responsible for protecting your password and should contact us immediately if you suspect unauthorized access.
            </p>
          </section>

          {/* Section 6: Your Rights */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <UserCheck className="w-5 h-5 text-teal-600" />
              <span>6. Your Rights</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              You may have certain rights regarding your data, including:
            </p>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-1 leading-relaxed">
              <li>Opting out of promotional emails</li>
              <li>Controlling cookies and tracking technologies</li>
              <li>Accessing, updating, or deleting your personal data</li>
              <li>Requesting a copy of your data</li>
            </ul>
            <p className="text-xs text-slate-600 dark:text-slate-300 pt-1">
              To exercise these rights, contact us at{' '}
              <a href="mailto:support@uqlearn.com" className="text-teal-600 dark:text-teal-400 font-bold hover:underline">
                support@uqlearn.com
              </a>.
            </p>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
              <strong>Children&apos;s Privacy:</strong> Individuals under the required age of consent (e.g., 13 in the US, 16 in Ireland) may not create an account. Parents who believe we have collected data from a child should contact us for deletion.
            </div>
          </section>

          {/* Section 7: Jurisdiction-Specific Rules */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Globe className="w-5 h-5 text-teal-600" />
              <span>7. Jurisdiction-Specific Rules</span>
            </h2>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <li><strong>California:</strong> You have the right to know, correct, delete, and opt out of the sale or sharing of your personal information under CCPA.</li>
              <li><strong>Nevada:</strong> You may request that we do not sell your personal information.</li>
              <li><strong>Australia:</strong> You may complain to the OAIC about a breach of the Australian Privacy Principles.</li>
              <li><strong>EEA/UK/Switzerland:</strong> You have rights to access, rectify, erase, restrict, or object to processing of your data and to lodge a complaint with your supervisory authority.</li>
              <li><strong>Data Privacy Framework:</strong> UQlearn complies with the EU-U.S. DPF, UK Extension, and Swiss-U.S. DPF.</li>
              <li><strong>Outside the U.S.:</strong> Your data will be transferred to and processed in the United States.</li>
            </ul>
          </section>

          {/* Section 8: Updates & Contact Info */}
          <section className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Mail className="w-5 h-5 text-teal-600" />
              <span>8. Updates &amp; Contact Info</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              We may update this Privacy Policy. Material changes will be notified via email or in-product notice. Continued use of the Services means you accept the revised policy.
            </p>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-center space-x-2 font-bold text-slate-900 dark:text-white">
                <Mail className="w-4 h-4 text-teal-600" />
                <span>Contact Email:</span>
                <a href="mailto:support@uqlearn.com" className="text-teal-600 dark:text-teal-400 hover:underline">
                  support@uqlearn.com
                </a>
              </div>
              <div className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Postal Address:</strong> UQlearn, Attn: Privacy/Legal Team, 600 Harrison Street, 3rd floor, San Francisco, CA 94107.
                </span>
              </div>
            </div>
          </section>

        </div>
      </div>

      <Footer />
    </div>
  );
};
