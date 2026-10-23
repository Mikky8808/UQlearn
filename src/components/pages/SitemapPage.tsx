import React from 'react';
import { Link } from 'react-router-dom';
import { Map, BookOpen, User, ShieldCheck, Layers } from 'lucide-react';
import { Footer } from '../common/Footer';

export const SitemapPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full">
        
        {/* Breadcrumb */}
        <div className="text-xs text-slate-500 mb-6 flex items-center space-x-2">
          <Link to="/" className="hover:text-teal-600 dark:hover:text-teal-400">Home</Link>
          <span>/</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">Sitemap</span>
        </div>

        {/* Page Header */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 shadow-xs mb-8">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2.5 bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
              <Map className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                UQlearn Sitemap
              </h1>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Complete directory structure and navigational map
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-4">
            Browse through all core areas of UQlearn, including learning portals, course categories, instructor studio pages, and legal documentation.
          </p>
        </div>

        {/* Sitemap Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          
          {/* Main Learner Hub */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <BookOpen className="w-4 h-4" />
              <span>Learner Platform</span>
            </h2>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <li><Link to="/" className="hover:text-teal-600 dark:hover:text-teal-400 font-semibold">Home Landing Page</Link></li>
              <li><Link to="/courses" className="hover:text-teal-600 dark:hover:text-teal-400">Full Course Catalog</Link></li>
              <li><Link to="/dashboard" className="hover:text-teal-600 dark:hover:text-teal-400">Learner Dashboard & My Learning</Link></li>
              <li><Link to="/checkout" className="hover:text-teal-600 dark:hover:text-teal-400">Cart & Checkout</Link></li>
              <li><Link to="/personalization" className="hover:text-teal-600 dark:hover:text-teal-400">AI Personalization Customizer</Link></li>
            </ul>
          </div>

          {/* Portals & Sign In */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <User className="w-4 h-4" />
              <span>Portals & Account Access</span>
            </h2>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <li><Link to="/login" className="hover:text-indigo-600 dark:hover:text-indigo-400">Learner Sign In</Link></li>
              <li><Link to="/signup" className="hover:text-indigo-600 dark:hover:text-indigo-400">Register New Account</Link></li>
              <li><Link to="/forgot-password" className="hover:text-indigo-600 dark:hover:text-indigo-400">Password Recovery</Link></li>
              <li><Link to="/login/instructor" className="hover:text-indigo-600 dark:hover:text-indigo-400">Instructor Studio Login</Link></li>
            </ul>
          </div>

          {/* Categories */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Layers className="w-4 h-4" />
              <span>Popular Course Categories</span>
            </h2>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <li><Link to="/courses?category=Development" className="hover:text-amber-600">Web & Mobile Development</Link></li>
              <li><Link to="/courses?category=Design" className="hover:text-amber-600">UI/UX Design & Graphics</Link></li>
              <li><Link to="/courses?category=Data%20Science" className="hover:text-amber-600">Data Science & Machine Learning</Link></li>
              <li><Link to="/courses?category=Business" className="hover:text-amber-600">Business & Entrepreneurship</Link></li>
            </ul>
          </div>

          {/* Legal & Accessibility */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Legal & Accessibility</span>
            </h2>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <li><Link to="/accessibility" className="hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold">Accessibility Statement</Link></li>
              <li><Link to="/privacy" className="hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold">Privacy Policy</Link></li>
              <li><Link to="/sitemap" className="hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold">Sitemap Index</Link></li>
              <li><Link to="/terms" className="hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold">Terms of Service</Link></li>
            </ul>
          </div>

        </div>
      </div>

      <Footer />
    </div>
  );
};
