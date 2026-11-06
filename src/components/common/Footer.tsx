import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from './BrandLogo';
import { useApp } from '../../context/AppContext';

export const Footer: React.FC = () => {
  const { categories } = useApp();
  const [emailInput, setEmailInput] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
  const isLiveUqDomain = hostname.endsWith('uqlearn.org');

  const activeCategories = (categories && categories.length > 0)
    ? categories.filter(c => c.isActive !== false).slice(0, 5)
    : [
        { id: '1', name: 'Development' },
        { id: '2', name: 'UI/UX Design' },
        { id: '3', name: 'Data Science & AI' },
        { id: '4', name: 'Business' }
      ];

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

          {/* Verified Badge Stamp & Join WhatsApp Community in same row */}
          <div className="flex items-center space-x-3.5 pt-2">
            <img 
              src="/assets/verified-badge.jpeg" 
              alt="UQlearn Verified Badge" 
              className="w-14 h-14 rounded-full object-contain bg-white p-0.5 border border-teal-500/40 shadow-md shadow-teal-500/10 shrink-0 hover:scale-105 transition-transform"
            />
            <a
              href="https://whatsapp.com/channel/0029Vb9Cu8I5vKAEE5MDTo1i"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2.5 px-3.5 py-2.5 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 hover:from-emerald-600/30 hover:to-teal-600/30 border border-emerald-500/40 text-emerald-400 hover:text-emerald-300 rounded-xl text-xs font-semibold transition-all group shadow-sm hover:shadow-emerald-500/10"
              title="Join our WhatsApp Channel"
            >
              <svg className="w-4.5 h-4.5 fill-current text-emerald-400 group-hover:scale-110 transition-transform shrink-0" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
              <span>Join our community</span>
            </a>
          </div>
          <div className="pt-1 text-[11px] text-slate-500">
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
            {activeCategories.map((cat) => (
              <li key={cat.id || cat.name}>
                <Link to={`/courses?category=${encodeURIComponent(cat.name)}`} className="hover:text-white transition-colors">
                  {cat.name}
                </Link>
              </li>
            ))}
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
