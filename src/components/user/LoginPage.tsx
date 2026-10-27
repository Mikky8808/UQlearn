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
  Loader2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { API_ENDPOINTS, apiFetch, GOOGLE_CLIENT_ID } from '../../lib/apiConfig';
import { decodeGoogleJwt, signInWithGoogleFirebase } from '../../lib/googleAuth';
import { BrandLogo } from '../common/BrandLogo';

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

  // OTP State
  const [otpSent, setOtpSent] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(45);
  const [timerActive, setTimerActive] = useState(false);

  // Status & validation
  const [formLoading, setFormLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [gsiReady, setGsiReady] = useState(false);

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
            email: googleEmail,
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

      setSuccessMsg(`Welcome back, ${userToLogin.name}! Redirecting...`);
      setTimeout(() => navigate(redirectPath), 600);
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
      const profile = await signInWithGoogleFirebase();
      await processGoogleUser(profile.email, profile.name, profile.picture);
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        setErrorMsg(err.message || 'Google Sign-In popup could not be completed.');
      }
    } finally {
      setFormLoading(false);
    }
  };

  // Handle Send OTP to Email
  const handleSendOtp = async () => {
    setErrorMsg('');
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setFormLoading(true);
    try {
      const data = await apiFetch(API_ENDPOINTS.SEND_LOGIN_OTP, {
        method: 'POST',
        body: JSON.stringify({ email: cleanEmail })
      });
      setOtpSent(true);
      setTimerActive(true);
      setCountdown(60);
      setOtpDigits(['', '', '', '', '', '']);
      setSuccessMsg(data?.message || `6-digit verification code sent to ${cleanEmail}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send verification code. Please check your email.');
    } finally {
      setFormLoading(false);
    }
  };

  // Timer effect
  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timerActive && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0) {
      setTimerActive(false);
    }
    return () => clearTimeout(timer);
  }, [timerActive, countdown]);

  const handleOtpChange = (index: number, val: string) => {
    if (val.length > 1) {
      val = val.slice(-1);
    }
    const newDigits = [...otpDigits];
    newDigits[index] = val;
    setOtpDigits(newDigits);

    // Auto-focus next input
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const newDigits = [...otpDigits];
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i];
      }
      setOtpDigits(newDigits);
    }
  };

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (authMethod === 'password') {
      if (!email.trim() || !email.includes('@')) {
        setErrorMsg('Please enter a valid email address.');
        return;
      }

      if (!password || password.length < 6) {
        setErrorMsg('Password must be at least 6 characters.');
        return;
      }
    } else {
      // OTP Method
      if (!otpSent) {
        handleSendOtp();
        return;
      }
      const code = otpDigits.join('');
      if (code.length < 6) {
        setErrorMsg('Please enter all 6 digits of your verification code.');
        return;
      }
    }

    const cleanEmail = email.trim().toLowerCase();
    setFormLoading(true);

    try {
      if (authMethod === 'otp') {
        const code = otpDigits.join('');
        await apiFetch(API_ENDPOINTS.VERIFY_EMAIL, {
          method: 'POST',
          body: JSON.stringify({ action: 'verify', email: cleanEmail, code: code })
        });

        loginUser({
          id: `stu-${Date.now()}`,
          name: cleanEmail.split('@')[0].replace('.', ' '),
          email: cleanEmail,
          role: 'student',
          isVerified: true
        });

        setSuccessMsg('Email verified successfully! Loading your dashboard...');
        setTimeout(() => navigate(redirectPath), 700);
      } else {
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
      }
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

            {/* Method 2: OTP Digits */}
            {authMethod === 'otp' && (
              <div className="space-y-3 pt-1">
                {!otpSent ? (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={formLoading || !email}
                    className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    {formLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                    ) : (
                      <KeyRound className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    )}
                    <span>Send 6-Digit Code to Email</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Enter 6-Digit Verification Code
                    </label>
                    <div className="flex justify-between gap-2 on-paste" onPaste={handleOtpPaste}>
                      {otpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          id={`otp-input-${idx}`}
                          type="text"
                          maxLength={1}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={digit}
                          onChange={(e) => handleOtpChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          className="w-11 h-12 text-center text-lg font-black bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        Didn't receive code?
                      </span>
                      {timerActive ? (
                        <span className="text-slate-400 font-bold">Resend in {countdown}s</span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          className="text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer"
                        >
                          Resend Code
                        </button>
                      )}
                    </div>
                  </div>
                )}
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
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

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
    </div>
  );
};
export default LoginPage;
