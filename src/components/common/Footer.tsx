import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from './BrandLogo';

export const Footer: React.FC = () => {
  const [emailInput, setEmailInput] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
  const isLiveUqDomain = hostname.endsWith('uqlearn.org');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput.trim() && emailInput.includes('@')) {
      setSubscribed(true);
      setEmailInput('');
    }
  };

  return (
    <footer className="bg-slate-950 text-slate-400 py-16 border-t border-slate-900 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
        
        {/* Brand Summary */}
        <div className="space-y-4 lg:col-span-2">
          <BrandLogo size="md" />
          <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
            The premier online learning platform empowering global learners with secure, high-quality education, expert instruction, and verifiable credentials.
          </p>
          <div className="pt-2 text-[11px] text-slate-500">
            <span>© 2026 UQlearn Inc. All rights reserved.</span>
          </div>
        </div>

        {/* Explore Links */}
        <div>
          <h5 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Explore</h5>
          <ul className="space-y-2.5 text-xs">
            <li>
              <Link to="/courses" className="hover:text-white transition-colors">Courses Catalog</Link>
            </li>
            <li>
              <Link to="/courses?category=Development" className="hover:text-white transition-colors">Development</Link>
            </li>
            <li>
              <Link to="/courses?category=Design" className="hover:text-white transition-colors">UI/UX Design</Link>
            </li>
            <li>
              <Link to="/courses?category=Data%20Science" className="hover:text-white transition-colors">Data Science & AI</Link>
            </li>
          </ul>
        </div>

        {/* Legal & Accessibility (Matches User Design Specs) */}
        <div>
          <h5 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
            Legal & Accessibility
          </h5>
          <ul className="space-y-2.5 text-xs">
            <li>
              <Link to="/accessibility" className="hover:text-white transition-colors flex items-center space-x-1">
                <span>Accessibility statement</span>
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="hover:text-white transition-colors flex items-center space-x-1">
                <span>Privacy policy</span>
              </Link>
            </li>
            <li>
              <Link to="/sitemap" className="hover:text-white transition-colors flex items-center space-x-1">
                <span>Sitemap</span>
              </Link>
            </li>
            <li>
              <Link to="/terms" className="hover:text-white transition-colors flex items-center space-x-1">
                <span>Terms</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* Portals & Newsletter */}
        <div>
          <h5 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Stay Updated</h5>
          <p className="text-xs text-slate-400 mb-3">Subscribe for weekly tech courses and updates.</p>
          {subscribed ? (
            <div className="p-3 bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-xs font-semibold rounded-none">
              ✓ Subscribed to UQlearn!
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="space-y-2">
              <input
                type="email"
                required
                placeholder="Enter your email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-none text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
              <button
                type="submit"
                className="w-full py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-none text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Subscribe
              </button>
            </form>
          )}

          <div className="mt-5 pt-4 border-t border-slate-900 text-[11px] space-y-1">
            <div className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Portal Access</div>
            <div className="flex space-x-3">
              <Link to="/login" className="text-slate-400 hover:text-teal-400">Learner</Link>
              <span className="text-slate-700">•</span>
              {isLiveUqDomain ? (
                <a href="https://instructor.uqlearn.org/login" className="text-slate-400 hover:text-indigo-400">Instructor</a>
              ) : (
                <Link to="/login/instructor" className="text-slate-400 hover:text-indigo-400">Instructor</Link>
              )}
            </div>
          </div>
        </div>

      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
        <p>© 2026 UQlearn Inc. All rights reserved. End-to-end encrypted architecture.</p>
        <div className="flex space-x-6 mt-4 sm:mt-0">
          <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          <Link to="/accessibility" className="hover:text-white transition-colors">Accessibility</Link>
          <Link to="/sitemap" className="hover:text-white transition-colors">Sitemap</Link>
        </div>
      </div>
    </footer>
  );
};
