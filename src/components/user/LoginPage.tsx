import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  KeyRound, 
  AlertCircle,
  Loader2,
  ShieldCheck,
  X,
  Edit3,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { API_ENDPOINTS, apiFetch, GOOGLE_CLIENT_ID } from '../../lib/apiConfig';
import { emailService } from '../../lib/emailService';
import { decodeGoogleJwt, signInWithGoogleUniversal } from '../../lib/googleAuth';
import { BrandLogo } from '../common/BrandLogo';
import { SetInitialPasswordModal } from '../common/SetInitialPasswordModal';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginUser } = useApp();

  const [authMethod, setAuthMethod] = useState<'password' | 'otp'>('password');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);



  // Status & validation
  const [formLoading, setFormLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [gsiReady, setGsiReady] = useState(false);

  // Modal Verification Code Overlay State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [modalEmail, setModalEmail] = useState('');
  const [modalOtpDigits, setModalOtpDigits] = useState(['', '', '', '', '', '']);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  const [modalCountdown, setModalCountdown] = useState(60);
  const [modalTimerActive, setModalTimerActive] = useState(false);
  const [showSetPasswordModal, setShowSetPasswordModal] = useState(false);
  const [pendingUser, setPendingUser] = useState<{ id: string; email: string; role?: string } | null>(null);

  // If already logged in, show notice or allow redirect
  const queryParams = new URLSearchParams(location.search);
  const redirectPath = queryParams.get('redirect') || '/dashboard';

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn('Google Client ID is missing. Google Sign-In button cannot initialize.');
      return;
    }

    const initGsi = () => {
      try {
        if ((window as any).google?.accounts?.id) {
          (window as any).google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCredentialResponse,
            auto_select: false
          });

          const btnEl = document.getElementById('googleSignInBtnLearner');
          if (btnEl) {
            (window as any).google.accounts.id.renderButton(btnEl, {
              theme: 'outline',
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

    if ((window as any).google?.accounts?.id) {
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

  const processGoogleUser = async (googleEmail: string, googleName: string, googlePicture?: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    setFormLoading(true);
    try {
      if (!googleEmail) {
        throw new Error('Failed to retrieve email from your Google Account.');
      }

      // 1. Authenticate with backend API v1 (login.php) to retrieve permanent database user ID and role
      let backendUser: any = null;
      let token: string | undefined = undefined;

      try {
        const data = await apiFetch(API_ENDPOINTS.LOGIN, {
          method: 'POST',
          body: JSON.stringify({
            authProvider: 'google',
            provider: 'google',
            auth_provider: 'google',
            auth_type: 'google',
            is_google: 1,
            is_google_login: 1,
            google_sso: true,
            email: googleEmail,
            password: 'google-oauth-sso-authenticated',
            name: googleName,
            displayName: googleName,
            avatar: googlePicture,
            photoURL: googlePicture,
            role: 'learner'
          })
        });

        if (data && data.user) {
          backendUser = data.user;
          token = data.token;
        }
      } catch (backendErr) {
        console.warn('Backend login response notice:', backendErr);
      }

      // Check existing cached user ID if backend was unavailable
      let fallbackId = `usr_${googleEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
      try {
        const cachedUser = JSON.parse(localStorage.getItem('uqlearn_user') || 'null');
        if (cachedUser && cachedUser.email?.toLowerCase() === googleEmail.toLowerCase() && cachedUser.id) {
          fallbackId = cachedUser.id;
        }
      } catch {}

      const userToLogin: any = {
        id: backendUser?.id || fallbackId,
        name: backendUser?.name || googleName || googleEmail.split('@')[0],
        email: backendUser?.email || googleEmail,
        avatar: backendUser?.avatar || googlePicture,
        role: (backendUser?.role === 'instructor' || backendUser?.role === 'admin') ? backendUser.role : 'student',
        isVerified: true,
        token: token || backendUser?.token
      };

      loginUser(userToLogin);

      setSuccessMsg(`Welcome back, ${userToLogin.name}! Account ready.`);
      setPendingUser(userToLogin);
      setShowSetPasswordModal(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Google Sign-In failed.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleGoogleCredentialResponse = async (response: any) => {
    try {
      const profile = decodeGoogleJwt(response.credential);
      await processGoogleUser(profile.email, profile.name, profile.picture);
    } catch (err: any) {
      console.error('Failed to parse Google credential:', err);
      setErrorMsg(err.message || 'Failed to authenticate with Google.');
    }
  };

  const handleDirectGoogleLogin = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setFormLoading(true);
    try {
      const profile = await signInWithGoogleUniversal();
      await processGoogleUser(profile.email, profile.name, profile.picture);
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        const errMsg = err?.message || String(err);
        setErrorMsg(errMsg || 'Google Sign-In popup could not be completed.');
      }
    } finally {
      setFormLoading(false);
    }
  };

  // Modal Timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (modalTimerActive && modalCountdown > 0) {
      timer = setTimeout(() => setModalCountdown(prev => prev - 1), 1000);
    } else if (modalCountdown === 0) {
      setModalTimerActive(false);
    }
    return () => clearTimeout(timer);
  }, [modalTimerActive, modalCountdown]);

  // Open Verification Modal & Send OTP
  const handleInitiateOtpModal = async (targetEmailInput?: string) => {
    setErrorMsg('');
    const targetEmail = (targetEmailInput || email).trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setFormLoading(true);
    try {
      const res = await emailService.sendLoginOtp(targetEmail);
      setModalEmail(targetEmail);
      setModalOtpDigits(['', '', '', '', '', '']);
      setModalError('');
      setModalSuccess(res.message);
      setModalCountdown(60);
      setModalTimerActive(true);
      setShowOtpModal(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send verification code. Please check your email.');
    } finally {
      setFormLoading(false);
    }
  };

  // Handle Modal Resend Code
  const handleModalResendCode = async () => {
    if (modalTimerActive) return;
    setModalError('');
    setModalSuccess('');
    setModalLoading(true);
    try {
      const res = await emailService.sendLoginOtp(modalEmail);
      setModalSuccess(res.message);
      setModalCountdown(60);
      setModalTimerActive(true);
      setModalOtpDigits(['', '', '', '', '', '']);
    } catch (err: any) {
      setModalError(err.message || 'Failed to resend code.');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle Modal OTP digit changes
  const handleModalOtpChange = (index: number, val: string) => {
    if (val.length > 1) val = val.slice(-1);
    const newDigits = [...modalOtpDigits];
    newDigits[index] = val;
    setModalOtpDigits(newDigits);

    if (val && index < 5) {
      const nextInput = document.getElementById(`modal-otp-input-${index + 1}`);
      nextInput?.focus();
    }

    if (val && index === 5 && newDigits.every(d => d !== '')) {
      handleModalVerifySubmit(newDigits.join(''));
    }
  };

  const handleModalOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !modalOtpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`modal-otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleModalOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const newDigits = [...modalOtpDigits];
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i];
      }
      setModalOtpDigits(newDigits);
      if (pasted.length === 6) {
        handleModalVerifySubmit(pasted);
      }
    }
  };

  // Handle Modal Verification Submit
  const handleModalVerifySubmit = async (codeToVerify?: string) => {
    const code = codeToVerify || modalOtpDigits.join('');
    if (code.length < 6) {
      setModalError('Please enter all 6 digits of your verification code.');
      return;
    }

    setModalError('');
    setModalSuccess('');
    setModalLoading(true);

    try {
      const res = await emailService.verifyEmailOtp(modalEmail, code);

      const verifiedUser = res.user || {
        id: `stu-${Date.now()}`,
        name: modalEmail.split('@')[0].replace('.', ' '),
        email: modalEmail,
        role: 'student',
        isVerified: true
      };

      const userToLogin = {
        id: verifiedUser.id || `stu-${Date.now()}`,
        name: verifiedUser.name || modalEmail.split('@')[0].replace('.', ' '),
        email: verifiedUser.email || modalEmail,
        role: 'student' as const,
        isVerified: true,
        token: res.token
      };

      loginUser(userToLogin);

      setModalSuccess(res.message || 'Email verified successfully!');
      setShowOtpModal(false);
      setPendingUser(userToLogin);
      setShowSetPasswordModal(true);
    } catch (err: any) {
      setModalError(err.message || 'Invalid or expired verification code.');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (authMethod === 'otp') {
      // Open 6-Digit Verification Modal
      handleInitiateOtpModal(cleanEmail);
      return;
    }

    // Password Login Method
    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setFormLoading(true);
    try {
      // Password Login via PHP backend
      const data = await apiFetch(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        body: JSON.stringify({ email: cleanEmail, password: password, role: 'student' })
      });
      
      if (!data || !data.user) {
        throw new Error('Authentication failed on backend.');
      }

      const backendUser = data.user;
      loginUser({
        id: backendUser?.id,
        name: backendUser?.name || cleanEmail.split('@')[0],
        email: backendUser?.email || cleanEmail,
        avatar: backendUser?.avatar || undefined,
        role: 'student',
        isVerified: true,
        token: data.token
      });

      setSuccessMsg(`Welcome back, ${backendUser?.name || 'Learner'}! Redirecting...`);
      setTimeout(() => navigate(redirectPath), 600);
    } catch (err: any) {
      console.error('Login Auth Error:', err);
      setErrorMsg(err.message || 'Login failed. Please check your credentials or sign up first.');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div id="login-page" className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 space-y-6">
        
        {/* Page Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Sign In
          </h1>
        </div>

        {/* Success Banner */}
        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center space-x-2 animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Banner */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center space-x-2 animate-shake">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Primary Email Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Email Address <span className="text-teal-600">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  placeholder="e.g. name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 font-medium transition-all"
                />
              </div>
            </div>

            {/* Auth Method Selector */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('password');
                    setErrorMsg('');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    authMethod === 'password'
                      ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('otp');
                    setErrorMsg('');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    authMethod === 'otp'
                      ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Email Code
                </button>
              </div>

              {authMethod === 'password' && (
                <Link
                  to="/forgot-password"
                  className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
                >
                  Forgot password?
                </Link>
              )}
            </div>

            {/* Method 1: Password Input */}
            {authMethod === 'password' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Password <span className="text-teal-600">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-11 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 font-medium transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Method 2: OTP Verification Prompt */}
            {authMethod === 'otp' && (
              <div className="p-4 bg-teal-50/60 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80 rounded-2xl text-xs space-y-2">
                <div className="flex items-center space-x-2 text-teal-800 dark:text-teal-200 font-bold">
                  <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span>1-Click Verification Code Sign-In</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                  Submitting will send a 6-digit verification code to <strong className="text-slate-900 dark:text-slate-100 font-semibold">{email || 'your email'}</strong> and open the verification modal.
                </p>
              </div>
            )}

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 border-slate-300 focus:ring-teal-500"
                />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Keep me signed in
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={formLoading}
              className="w-full py-3.5 px-4 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-teal-600/25 flex items-center justify-center space-x-2 transition-all transform active:scale-[0.99] cursor-pointer"
            >
              {formLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending Code...</span>
                </>
              ) : (
                <>
                  <span>{authMethod === 'otp' ? 'Send Code & Verify' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Option to Open Email Code Verification Modal */}
          {authMethod === 'password' && (
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => handleInitiateOtpModal()}
                disabled={formLoading || !email}
                className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center justify-center space-x-1.5 mx-auto cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Or Sign In with 1-Click Verification Code</span>
              </button>
            </div>
          )}

          {/* Social Sign-In Divider */}
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            <span className="flex-shrink mx-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Or Continue With
            </span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
          </div>

          {/* Google SSO Button Target */}
          <div className="w-full flex flex-col items-center justify-center py-1">
            <div id="googleSignInBtnLearner" className={`w-full flex justify-center ${gsiReady ? 'h-11' : 'hidden'}`}></div>
            {!gsiReady && (
              <button
                type="button"
                onClick={handleDirectGoogleLogin}
                disabled={formLoading}
                className="w-full max-w-[340px] h-11 px-4 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-200 text-sm font-semibold flex items-center justify-center space-x-3 shadow-xs transition-all cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Continue with Google</span>
              </button>
            )}
          </div>

          {/* Sign up link */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            Don't have an account?{' '}
            <Link to="/signup" className="font-bold text-teal-600 dark:text-teal-400 hover:underline">
              Create Account
            </Link>
          </p>
        </div>

      </div>

      {/* 6-DIGIT VERIFICATION CODE MODAL OVERLAY */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 relative">
            
            {/* Close Modal Button */}
            <button
              type="button"
              onClick={() => setShowOtpModal(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800/80 flex items-center justify-center shadow-lg shadow-teal-500/10">
                <ShieldCheck className="w-7 h-7 text-teal-600 dark:text-teal-400" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  Enter Verification Code
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  We've sent a 6-digit verification code to
                </p>
                <div className="pt-1 flex items-center justify-center space-x-2">
                  <span className="px-3 py-1 bg-teal-50 dark:bg-teal-950/60 border border-teal-200/80 dark:border-teal-800/80 text-teal-700 dark:text-teal-300 font-mono font-bold text-xs rounded-full truncate max-w-[240px]">
                    {modalEmail}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowOtpModal(false)}
                    className="text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 p-1 cursor-pointer transition-colors"
                    title="Change email address"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Success Alert */}
            {modalSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center space-x-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{modalSuccess}</span>
              </div>
            )}

            {/* Modal Error Alert */}
            {modalError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center space-x-2 animate-shake">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {/* 6-Digit OTP Digits Grid */}
            <div className="space-y-4">
              <div className="flex justify-between gap-2" onPaste={handleModalOtpPaste}>
                {modalOtpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`modal-otp-input-${idx}`}
                    type="text"
                    maxLength={1}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={digit}
                    onChange={(e) => handleModalOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleModalOtpKeyDown(idx, e)}
                    disabled={modalLoading}
                    className="w-11 h-13 text-center text-xl font-black bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 disabled:opacity-50 transition-all font-mono shadow-xs"
                  />
                ))}
              </div>

              {/* Resend Code & Timer */}
              <div className="flex items-center justify-between text-xs font-medium pt-1">
                <span className="text-slate-500 dark:text-slate-400">
                  Didn't receive the code?
                </span>
                {modalTimerActive ? (
                  <span className="text-slate-400 font-bold font-mono">Resend in {modalCountdown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleModalResendCode}
                    disabled={modalLoading}
                    className="text-teal-600 dark:text-teal-400 font-bold hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${modalLoading ? 'animate-spin' : ''}`} />
                    <span>Resend Code</span>
                  </button>
                )}
              </div>
            </div>

            {/* Modal Submit & Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => handleModalVerifySubmit()}
                disabled={modalLoading || modalOtpDigits.some(d => d === '')}
                className="w-full py-3.5 px-4 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-lg shadow-teal-600/25 flex items-center justify-center space-x-2 transition-all transform active:scale-[0.99] cursor-pointer"
              >
                {modalLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                className="w-full py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                Cancel & Change Email
              </button>
            </div>

          </div>
        </div>
      )}

      {/* OPTIONAL SET INITIAL PASSWORD PROMPT MODAL */}
      {pendingUser && (
        <SetInitialPasswordModal
          isOpen={showSetPasswordModal}
          userId={pendingUser.id}
          userEmail={pendingUser.email}
          userRole={pendingUser.role || 'student'}
          onComplete={() => {
            setShowSetPasswordModal(false);
            navigate(redirectPath);
          }}
          onSkip={() => {
            setShowSetPasswordModal(false);
            navigate(redirectPath);
          }}
        />
      )}
    </div>
  );
};
export default LoginPage;
