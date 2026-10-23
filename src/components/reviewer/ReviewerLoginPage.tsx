import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { resolveBrandingLogoUrl, DEFAULT_LOGO_URL } from '../../lib/branding';
import { verifyReviewerAuthorization, authenticateReviewerApi } from '../../lib/reviewerService';
import { GOOGLE_CLIENT_ID } from '../../lib/apiConfig';
import { 
  Mail, 
  ArrowRight, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2,
  Globe
} from 'lucide-react';

declare global {
  interface Window {
    google?: any;
  }
}

export const ReviewerLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginUser, logoUrl } = useApp();

  const [email, setEmail] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
  const isReviewerHost = hostname.startsWith('rev.') || hostname.startsWith('reviewer.') || hostname.startsWith('review.') || hostname.startsWith('coursereviewer.');
  const defaultReviewerHome = isReviewerHost ? '/' : '/reviewer';
  const queryParams = new URLSearchParams(location.search);
  const redirectPath = queryParams.get('redirect') || (location.state as any)?.from || defaultReviewerHome;

  useEffect(() => {
    // Dynamically load Google Identity Services client SDK
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      try {
        if (window.google?.accounts?.id) {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCredentialResponse,
            auto_select: false
          });

          const btnEl = document.getElementById('googleSignInBtn');
          if (btnEl) {
            window.google.accounts.id.renderButton(btnEl, {
              theme: 'filled_dark',
              size: 'large',
              shape: 'rectangular',
              width: btnEl.clientWidth || 340
            });
          }
        }
      } catch (err) {
        console.error('Failed to init Google Sign-In button:', err);
      }
    };
    document.body.appendChild(script);
    return () => {
      // Cleanup to prevent duplicate append
      try {
        document.body.removeChild(script);
      } catch (e) {}
    };
  }, []);

  const handleGoogleCredentialResponse = async (response: any) => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      // Decode JWT token securely on client side
      const base64Url = response.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonPayload);
      const googleEmail = payload.email?.toLowerCase().trim();
      const googleName = payload.name;
      const googlePicture = payload.picture;

      if (!googleEmail) {
        throw new Error('Failed to retrieve email from your Google Account.');
      }

      // If user typed an email in the field, check for mismatch
      const enteredEmail = email.trim().toLowerCase();
      if (enteredEmail && googleEmail !== enteredEmail) {
        setErrorMsg(`Verification Mismatch: The selected Google Account (${googleEmail}) does not match the entered email (${enteredEmail}).`);
        setLoading(false);
        return;
      }

      // Check with PHP database to ensure the user is active in the reviewer roster
      const apiResult = await authenticateReviewerApi(googleEmail);
      if (!apiResult.authorized || !apiResult.reviewer) {
        setErrorMsg(apiResult.message || `Access Denied: The email "${googleEmail}" is not configured as an active Course Reviewer in the database.`);
        setLoading(false);
        return;
      }

      const activeRev = apiResult.reviewer;
      loginUser({
        id: activeRev.id,
        email: googleEmail,
        name: googleName || activeRev.name,
        role: 'reviewer',
        avatar: googlePicture || activeRev.avatar,
        isVerified: true
      });

      setSuccessMsg(`Google Sign-In Approved: Welcome, ${googleName || activeRev.name}!`);
      setTimeout(() => {
        navigate(redirectPath);
      }, 600);

    } catch (err: any) {
      setErrorMsg(err.message || 'Google authentication flow failed.');
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      // Authenticate via PHP API with database active check
      const apiResult = await authenticateReviewerApi(cleanEmail);

      if (!apiResult.authorized || !apiResult.reviewer) {
        setErrorMsg(apiResult.message || `Access Denied: The email "${cleanEmail}" is not configured as an active Course Reviewer.`);
        setLoading(false);
        return;
      }

      const activeRev = apiResult.reviewer;

      // Authenticated - sign in
      loginUser({
        id: activeRev.id,
        email: cleanEmail,
        name: activeRev.name || cleanEmail.split('@')[0],
        role: 'reviewer',
        avatar: activeRev.avatar,
        isVerified: true
      });

      setSuccessMsg(`Sign-In approved! Opening Reviewer Workspace...`);
      setTimeout(() => {
        navigate(redirectPath);
      }, 600);

    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. This email is not in the reviewer roster.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/10 rounded-none blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-600/10 rounded-none blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-6">
          <div className="flex items-center space-x-3 bg-slate-900 border border-slate-800 p-3 rounded-none shadow-2xl">
            <img 
              src={resolveBrandingLogoUrl(logoUrl)} 
              alt="UQlearn Logo" 
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_LOGO_URL; }}
              className="w-10 h-10 object-contain rounded-none bg-slate-800 p-1 border border-slate-700"
            />
            <div>
              <span className="text-xl font-black tracking-tight">
                <span className="text-teal-400">UQ</span>
                <span className="text-purple-400">learn</span>
              </span>
              <span className="text-[11px] font-bold text-purple-300 block uppercase tracking-widest flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3 text-purple-400" />
                <span>Course Reviewer Portal</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        {/* Sharp Edges Card */}
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 sm:px-8 shadow-2xl rounded-none space-y-6">
          
          {errorMsg && (
            <div className="bg-rose-950/80 border border-rose-500/50 p-4 rounded-none flex items-start space-x-3 text-rose-200 text-xs shadow-lg">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-rose-300 block">Authorization Error</span>
                <p className="leading-relaxed">{errorMsg}</p>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-950/80 border border-emerald-500/50 p-4 rounded-none flex items-center space-x-3 text-emerald-200 text-xs shadow-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Verification Email Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Enter Authorized Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. name@company.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-none text-xs sm:text-sm text-white placeholder-slate-700 focus:outline-none focus:border-purple-500 transition-all font-mono"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed font-mono">
                Provide your registered email address above and click "Access Dashboard". Only authorized reviewer emails are permitted.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-2"
            >
              {loading ? (
                <span>Verifying...</span>
              ) : (
                <span>Access Dashboard</span>
              )}
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800/60" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-slate-900 px-3 text-slate-500 font-bold uppercase tracking-widest text-[9px]">
                  Or Sign In With Google
                </span>
              </div>
            </div>

            {/* Real Google Sign-In SDK Button rendering target */}
            <div className="space-y-3 text-center">
              <div id="googleSignInBtn" className="w-full flex justify-center bg-slate-950 p-1 border border-slate-800 rounded-none h-11"></div>
            </div>
          </form>

          {/* Footer Area with Back link */}
          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center space-x-1 text-purple-400/90 font-bold font-mono">
              <Globe className="w-3.5 h-3.5" />
              <span>rev.uqlearn.org</span>
            </span>
            <button
              onClick={() => navigate('/')}
              className="hover:text-slate-300 transition-colors font-semibold cursor-pointer"
            >
              Back to Main Platform
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
