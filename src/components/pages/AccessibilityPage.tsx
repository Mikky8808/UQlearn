import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Mail, 
  Eye, 
  Monitor, 
  Volume2, 
  Sliders, 
  Search, 
  Palette, 
  BookOpen, 
  FileText 
} from 'lucide-react';
import { Footer } from '../common/Footer';

export const AccessibilityPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full">
        
        {/* Breadcrumb Navigation */}
        <div className="text-xs text-slate-500 mb-6 flex items-center space-x-2">
          <Link to="/" className="hover:text-teal-600 dark:hover:text-teal-400">Home</Link>
          <span>/</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">Accessibility Statement</span>
        </div>

        {/* Page Header */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 shadow-xs mb-8 rounded-none">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2.5 bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
              <Eye className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                UQlearn Accessibility Statement
              </h1>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Commitment to Inclusive Learning & Universal Access
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 space-y-8 rounded-none">
          
          {/* Section 1: Our Commitment to Accessibility */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <ShieldCheck className="w-5 h-5 text-teal-600" />
              <span>Our Commitment to Accessibility</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Our mission is to deliver flexible and effective learning and skill development that empowers both organizations and individuals. We believe high-quality education should be accessible to everyone, which is why accessibility is a fundamental priority for us.
            </p>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Our teams are continuously working to enhance the accessibility of our services. Here are some of the ways we are building a more accessible UQlearn platform:
            </p>
          </section>

          {/* Pillars of Accessibility */}
          <section className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* 1. Accessibility standards */}
              <div className="p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center space-x-2 text-teal-600 dark:text-teal-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Accessibility standards
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  We aim to comply with the Web Content Accessibility Guidelines (WCAG) 2.1 published by the World Wide Web Consortium (W3C) and apply the Accessible Rich Internet Applications (WAI-ARIA) specification. We assess our website and mobile applications using the international version of the Voluntary Product Accessibility Template (VPAT).
                </p>
              </div>

              {/* 2. Compatibility testing */}
              <div className="p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center space-x-2 text-teal-600 dark:text-teal-400">
                  <Monitor className="w-4 h-4 shrink-0" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Compatibility testing
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  We test our website and mobile applications for compatibility with a range of screen readers and accessibility tools, including NonVisual Desktop Access (NVDA), Job Access with Speech (JAWS®), VoiceOver for macOS and iOS, and TalkBack for Android.
                </p>
              </div>

              {/* 3. Subtitles and closed captions */}
              <div className="p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center space-x-2 text-teal-600 dark:text-teal-400">
                  <Volume2 className="w-4 h-4 shrink-0" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Subtitles and closed captions
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Many of our courses offer machine-generated subtitles in multiple languages. Closed captions are also available for select courses. Learn more about how to use subtitles on our website and in our mobile applications.
                </p>
              </div>

              {/* 4. Video settings */}
              <div className="p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center space-x-2 text-teal-600 dark:text-teal-400">
                  <Sliders className="w-4 h-4 shrink-0" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Video settings
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Our video player includes features and settings that help learners customize their experience. Keyboard shortcuts on the UQlearn marketplace and most UQlearn Business products can be used to adjust various video settings. Learn more about how to use our video player settings.
                </p>
              </div>

              {/* 5. Search filters */}
              <div className="p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center space-x-2 text-teal-600 dark:text-teal-400">
                  <Search className="w-4 h-4 shrink-0" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Search filters
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Our search filters on the UQlearn marketplace and most UQlearn Business products allow learners to find courses with subtitles and closed captions. Learn more about how to search for courses with subtitles.
                </p>
              </div>

              {/* 6. Design system */}
              <div className="p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center space-x-2 text-teal-600 dark:text-teal-400">
                  <Palette className="w-4 h-4 shrink-0" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Design system
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Accessibility is a core principle of our internal design system. Our engineers and designers collaborate with accessibility consultants on updates to our design system.
                </p>
              </div>

              {/* 7. Instructor guidance */}
              <div className="p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center space-x-2 text-teal-600 dark:text-teal-400">
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Instructor guidance
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  We provide our instructors with recommendations on how to create accessible and inclusive courses.
                </p>
              </div>

              {/* 8. Ongoing research */}
              <div className="p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center space-x-2 text-teal-600 dark:text-teal-400">
                  <FileText className="w-4 h-4 shrink-0" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Ongoing research
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  We work with accessibility consultants to audit and provide recommendations to improve the accessibility of our services.
                </p>
              </div>

            </div>
          </section>

          {/* Section 2: Accessibility support */}
          <section className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Mail className="w-5 h-5 text-teal-600" />
              <span>Accessibility support</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              If you have any difficulty using or accessing UQlearn, or if you have suggestions on how we can improve the accessibility of our services, please email us at{' '}
              <a href="mailto:support@uqlearn.com" className="text-teal-600 dark:text-teal-400 font-bold hover:underline">
                support@uqlearn.com
              </a>{' '}
              or use our in-app support feature.
            </p>
          </section>

        </div>
      </div>

      <Footer />
    </div>
  );
};
