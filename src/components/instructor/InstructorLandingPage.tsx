import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Presentation, Sparkles, BookOpen, Award, ArrowRight, LogIn, UserPlus } from 'lucide-react';

export const InstructorLandingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    if (typeof window !== 'undefined' && window.location.hostname.includes('uqlearn.org')) {
      window.location.href = 'https://instructor.uqlearn.org' + path;
    } else {
      navigate(path);
    }
  };

  return (
    <div id="instructor-landing-page" className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Navbar */}
      <header className="px-6 sm:px-12 py-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => handleNavigation('/')}>
          <div className="w-10 h-10 rounded-2xl bg-teal-600 flex items-center justify-center text-white shadow-md">
            <Presentation className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight">UQlearn Instructor</h1>
            <p className="text-[10px] text-teal-600 dark:text-teal-400 font-bold uppercase tracking-wider">Educator Portal</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => handleNavigation('/login')}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <LogIn className="w-4 h-4 text-teal-600" />
            <span>Login</span>
          </button>
          <button
            onClick={() => handleNavigation('/login?signup=true')}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Get started with us</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 max-w-7xl mx-auto px-6 sm:px-12 py-16 sm:py-24 flex flex-col items-center text-center space-y-8">
        <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 text-xs font-black tracking-wide uppercase">
          <Sparkles className="w-4 h-4 text-teal-600" />
          <span>Join Global Educators</span>
        </div>

        <div className="space-y-4 max-w-3xl">
          <h2 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
            Come teach with us
          </h2>
          <p className="text-base sm:text-xl text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
            Become an instructor and change lives — including your own.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md pt-2">
          <button
            onClick={() => handleNavigation('/login?signup=true')}
            className="w-full sm:w-auto px-8 py-4 bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm rounded-2xl shadow-xl transition-all flex items-center justify-center space-x-2 cursor-pointer group"
          >
            <span>Get started with us</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            onClick={() => handleNavigation('/login')}
            className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-sm rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <span>Login</span>
          </button>
        </div>
      </section>

      {/* Core Value Pillars Section */}
      <section className="bg-white dark:bg-slate-900 py-16 sm:py-24 border-t border-slate-200 dark:border-slate-800 px-6 sm:px-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Pillar 1: Teach your way */}
          <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-4 hover:shadow-lg transition-all">
            <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center font-black text-lg">
              <Presentation className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Teach your way</h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Publish the course you want, in the way you want, and always have control of your own content.
            </p>
          </div>

          {/* Pillar 2: Inspire learners */}
          <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-4 hover:shadow-lg transition-all">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-lg">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Inspire learners</h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Teach what you know and help learners explore their interests, gain new skills, and advance their careers.
            </p>
          </div>

          {/* Pillar 3: Get rewarded */}
          <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-4 hover:shadow-lg transition-all">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-lg">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Get rewarded</h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Expand your professional network, build your expertise, and earn money on each paid enrollment.
            </p>
          </div>

        </div>
      </section>

      {/* 8-Step Course Creation Guide */}
      <section className="py-20 px-6 sm:px-12 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h3 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              How to Begin Creating Your Course
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mx-auto">
              Follow this clear, step-by-step breakdown from initial concept to publishing your course on UQlearn.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                step: 'Step 1',
                title: 'Start with Your Passion & Knowledge',
                desc: 'Begin by identifying what you already know and are passionate about teaching.'
              },
              {
                step: 'Step 2',
                title: 'Choose a Promising Topic',
                desc: 'Use marketplace insights and curriculum trends to find a topic that has strong student demand.'
              },
              {
                step: 'Step 3',
                title: 'Plan Your Teaching Style',
                desc: 'Decide how you want to teach—the structure, tone, and delivery are entirely up to you.'
              },
              {
                step: 'Step 4',
                title: 'Get Organized',
                desc: 'Use the instructor dashboard and curriculum pages to keep your course content well-organized.'
              },
              {
                step: 'Step 5',
                title: 'Record Your Video Content',
                desc: 'Use basic equipment: a smartphone or DSLR camera, plus a good microphone. If you prefer not to be on camera, record your screen. For paid courses, aim for at least 2 hours of total video content.'
              },
              {
                step: 'Step 6',
                title: 'Get Feedback',
                desc: 'Use our support team to help you throughout the process and provide feedback on test videos.'
              },
              {
                step: 'Step 7',
                title: 'Promote Your Course',
                desc: 'Share your course through social media and your professional networks to gather your first ratings and reviews.'
              },
              {
                step: 'Step 8',
                title: 'Earn Revenue',
                desc: 'Your course becomes discoverable in the marketplace, and you earn revenue from each paid enrollment.'
              }
            ].map((s, idx) => (
              <div key={idx} className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
                <span className="px-3 py-1 bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 text-[11px] font-black rounded-full uppercase tracking-wider">
                  {s.step}
                </span>
                <h4 className="text-base font-black text-slate-900 dark:text-slate-100">{s.title}</h4>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* Support Table Section */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-xs">
            <h4 className="text-lg font-black text-slate-900 dark:text-slate-100">How UQlearn Helps You Along the Way</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold">
                    <th className="py-3 px-4 w-1/4">Stage</th>
                    <th className="py-3 px-4 w-3/4">UQlearn's Support</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  <tr>
                    <td className="py-4 px-4 font-bold text-teal-600 dark:text-teal-400">Planning</td>
                    <td className="py-4 px-4 font-medium">Marketplace Insights tool, instructor dashboard, curriculum pages.</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 font-bold text-teal-600 dark:text-teal-400">Recording</td>
                    <td className="py-4 px-4 font-medium">Support team available for guidance and test-video feedback.</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 font-bold text-teal-600 dark:text-teal-400">Launching</td>
                    <td className="py-4 px-4 font-medium">Custom coupon tool for incentives, global promotions to drive traffic, and additional enterprise and business opportunities.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-slate-500 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
        <p>© {new Date().getFullYear()} UQlearn Instructor Portal. All rights reserved.</p>
      </footer>
    </div>
  );
};
