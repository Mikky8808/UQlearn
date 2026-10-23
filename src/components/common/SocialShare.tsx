import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  Share2
} from 'lucide-react';
import { ROOT_URL } from '../../lib/apiConfig';

export interface SocialShareProps {
  shareUrl?: string;
  shareTitle?: string;
  shareText?: string;
  referralCode?: string;
  onCopySuccess?: (msg: string) => void;
  className?: string;
  variant?: 'full' | 'compact' | 'buttons-only';
}

export const SocialShare: React.FC<SocialShareProps> = ({
  shareUrl: propUrl,
  shareTitle = "Join me on UQlearn!",
  shareText = "Explore thousands of expert-led online courses and advance your skills today.",
  referralCode,
  onCopySuccess,
  className = '',
  variant = 'full',
}) => {
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ROOT_URL;
  const urlToShare = propUrl || (referralCode ? `${baseUrl}/?ref=${referralCode}` : `${baseUrl}/`);
  const fullMessage = referralCode 
    ? `${shareText} Use my invite code: ${referralCode}` 
    : shareText;

  const showToast = (msg: string) => {
    setNotice(msg);
    if (onCopySuccess) onCopySuccess(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  // Helper: Copy to Clipboard
  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(urlToShare);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = urlToShare;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      showToast('Referral link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  // Facebook Share
  const handleFacebookShare = () => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(urlToShare)}`;
    window.open(fbUrl, '_blank', 'width=600,height=500');
    showToast('Opening Facebook Sharer...');
  };

  // WhatsApp Share
  const handleWhatsAppShare = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullMessage + ' ' + urlToShare)}`;
    window.open(waUrl, '_blank');
    showToast('Opening WhatsApp...');
  };

  // Instagram Share
  const handleInstagramShare = async () => {
    await handleCopyLink();
    showToast('Referral link copied! Opening Instagram Direct...');
    setTimeout(() => {
      window.open('https://www.instagram.com/direct/inbox/', '_blank');
    }, 800);
  };

  // Email Share
  const handleEmailShare = () => {
    const subject = encodeURIComponent(shareTitle);
    const body = encodeURIComponent(`${shareText}\n\nJoin here: ${urlToShare}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    showToast('Opening Email Client...');
  };

  return (
    <div className={`space-y-4 ${className}`}>
      
      {/* Toast Feedback Notice */}
      {notice && (
        <div className="p-3 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 rounded-none text-teal-800 dark:text-teal-200 text-xs font-bold flex items-center space-x-2">
          <Check className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Referral Link Copy Bar */}
      {variant === 'full' && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span>Referral Link</span>
            {referralCode && (
              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-mono">
                Code: {referralCode}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={urlToShare}
              className="flex-1 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className={`px-4 py-2 rounded-none text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shrink-0 ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Social Platforms Action Grid */}
      <div className="space-y-2">
        {variant === 'full' && (
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
              <Share2 className="w-3.5 h-3.5 text-teal-500" />
              <span>Share via Socials</span>
            </h4>
          </div>
        )}

        {/* 4 Core Buttons with Sharp Edges: Facebook, Email, WhatsApp, Instagram */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          
          {/* 1. Facebook */}
          <button
            type="button"
            onClick={handleFacebookShare}
            className="p-3 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-none flex flex-col items-center justify-center space-y-1.5 transition-all group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-none bg-[#1877F2] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </div>
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Facebook</span>
          </button>

          {/* 2. WhatsApp */}
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="p-3 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-none flex flex-col items-center justify-center space-y-1.5 transition-all group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-none bg-[#25D366] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.305-1.654a11.882 11.882 0 005.733 1.474h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">WhatsApp</span>
          </button>

          {/* 3. Instagram */}
          <button
            type="button"
            onClick={handleInstagramShare}
            className="p-3 bg-pink-50 dark:bg-pink-950/40 hover:bg-pink-100 dark:hover:bg-pink-900/60 border border-pink-200 dark:border-pink-800 rounded-none flex flex-col items-center justify-center space-y-1.5 transition-all group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-none bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </div>
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Instagram</span>
          </button>

          {/* 4. Gmail / Email */}
          <button
            type="button"
            onClick={handleEmailShare}
            className="p-3 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-800 rounded-none flex flex-col items-center justify-center space-y-1.5 transition-all group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-none bg-slate-900 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6z" opacity="0"/>
                <path fill="#EA4335" d="M3.5 18.5h3v-7.5l-4.5-3.375v9.375c0 .828.672 1.5 1.5 1.5z"/>
                <path fill="#34A853" d="M20.5 18.5h-3v-7.5l4.5-3.375v9.375c0 .828-.672 1.5-1.5 1.5z"/>
                <path fill="#4285F4" d="M17.5 11v7.5h3c.828 0 1.5-.672 1.5-1.5V7.625L17.5 11z"/>
                <path fill="#FBBC05" d="M3.5 5.5C2.672 5.5 2 6.172 2 7v.625l10 7.5 10-7.5V7c0-.828-.672-1.5-1.5-1.5H3.5z"/>
              </svg>
            </div>
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Gmail</span>
          </button>

        </div>
      </div>
    </div>
  );
};
