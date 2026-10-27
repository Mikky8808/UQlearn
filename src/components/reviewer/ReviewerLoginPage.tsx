import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { resolveBrandingLogoUrl, DEFAULT_LOGO_URL } from '../../lib/branding';
import { verifyReviewerAuthorization, authenticateReviewerApi } from '../../lib/reviewerService';
import { GOOGLE_CLIENT_ID } from '../../lib/apiConfig';
import { decodeGoogleJwt, signInWithGoogleFirebase } from '../../lib/googleAuth';
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

  const [gsiReady, setGsiReady] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn('Google Client ID is missing. Google Sign-In button cannot initialize.');
      return;
    }

    const initGsi = () => {
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
            setGsiReady(true);
          }
        }
      } catch (err) {
        console.error('Failed to init Google Sign-In button:', err);
      }
    };

    if (window.google?.accounts?.id) {
      initGsi();
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGsi;
      document.body.appendChild(script);
    }
  }, []);

  const processGoogleReviewerUser = async (googleEmail: string, googleName: string, googlePicture?: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
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
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredentialResponse = async (response: any) => {
    try {
      const profile = decodeGoogleJwt(response.credential);
      await processGoogleReviewerUser(profile.email, profile.name, profile.picture);
    } catch (err: any) {
      console.error('Failed to parse Google reviewer credential:', err);
      setErrorMsg(err.message || 'Google authentication flow failed.');
      setLoading(false);
    }
  };

  const handleDirectGoogleLogin = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const profile = await signInWithGoogleFirebase();
      await processGoogleReviewerUser(profile.email, profile.name, profile.picture);
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        setErrorMsg(err.message || 'Google Sign-In popup could not be completed.');
      }
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
              <div id="googleSignInBtn" className={`w-full flex justify-center bg-slate-950 p-1 border border-slate-800 rounded-none h-11 ${gsiReady ? '' : 'hidden'}`}></div>
              {!gsiReady && (
                <button
                  type="button"
                  onClick={handleDirectGoogleLogin}
                  disabled={loading}
                  className="w-full h-11 px-4 bg-slate-950 hover:bg-slate-800 text-white border border-slate-800 rounded-none text-xs font-semibold uppercase tracking-wider flex items-center justify-center space-x-3 transition-all cursor-pointer font-mono"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Sign In with Google</span>
                </button>
              )}
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
