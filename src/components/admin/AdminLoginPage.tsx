import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  GraduationCap, 
  Presentation, 
  CheckCircle2, 
  KeyRound, 
  AlertCircle,
  Loader2,
  ShieldAlert,
  Fingerprint
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ROOT_URL } from '../../lib/apiConfig';
import { resolveBrandingLogoUrl, DEFAULT_LOGO_URL } from '../../lib/branding';
import { API_ENDPOINTS, apiFetch, GOOGLE_CLIENT_ID } from '../../lib/apiConfig';
import { decodeGoogleJwt, signInWithGoogleUniversal } from '../../lib/googleAuth';

const ALLOWED_ADMIN_EMAILS = [
  'michaelomare045@gmail.com',
  'omaremichael8808@gmail.com',
  'wamuurajab@gmail.com'
];

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginUser, logoUrl } = useApp();
  const [imgError, setImgError] = useState(false);

  const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
  const isAdminHost = hostname.startsWith('en.') || hostname.startsWith('admin.');
  const isLiveUqDomain = hostname.includes('uqlearn.org');
  const defaultAdminHome = isAdminHost ? '/' : '/admin';

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

  const queryParams = new URLSearchParams(location.search);
  const redirectPath = queryParams.get('redirect') || (location.state as any)?.from || defaultAdminHome;

  const [gsiReady, setGsiReady] = useState(false);

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

          const btnEl = document.getElementById('googleSignInBtnAdmin');
          if (btnEl) {
            (window as any).google.accounts.id.renderButton(btnEl, {
              theme: 'filled_black',
              size: 'large',
              shape: 'rectangular',
              width: btnEl.clientWidth || 340
            });
            setGsiReady(true);
          }
        }
      } catch (err) {
        console.error('Failed to init Google Sign-In button for admin:', err);
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

  const processGoogleAdminUser = async (googleEmail: string, googleName: string, googlePicture?: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      if (!googleEmail) {
        throw new Error('Failed to retrieve email from your Google Account.');
      }

      // Check if user exists in database or whitelist
      let userAllowed = ALLOWED_ADMIN_EMAILS.includes(googleEmail);
      if (!userAllowed) {
        try {
          const res = await apiFetch('users.php', { silent: true }, 0);
          const usersList = Array.isArray(res) ? res : (res?.data || res?.users || []);
          const match = usersList.find((u: any) => u.email?.toLowerCase().trim() === googleEmail && (u.role === 'admin' || u.is_admin));
          if (match) {
            userAllowed = true;
          }
        } catch (e) {}
      }

      if (!userAllowed) {
        throw new Error('Access denied. Admin account not found in database or not authorized.');
      }

      loginUser({
        id: `adm-${Date.now()}`,
        name: googleName || googleEmail.split('@')[0],
        email: googleEmail,
        avatar: googlePicture,
        role: 'admin',
        isVerified: true
      });

      setSuccessMsg(`Welcome, Administrator ${googleName || googleEmail}! Unlocking Console...`);
      setTimeout(() => navigate(redirectPath), 700);
    } catch (err: any) {
      setErrorMsg(err.message || 'Google Admin Authentication failed.');
    }
  };

  const handleGoogleCredentialResponse = async (response: any) => {
    try {
      const profile = decodeGoogleJwt(response.credential);
      await processGoogleAdminUser(profile.email, profile.name, profile.picture);
    } catch (err: any) {
      console.error('Failed to parse Google admin credential:', err);
      setErrorMsg(err.message || 'Google Admin Authentication failed.');
    }
  };

  const handleDirectGoogleLogin = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const profile = await signInWithGoogleUniversal();
      await processGoogleAdminUser(profile.email, profile.name, profile.picture);
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        setErrorMsg(err.message || 'Google Sign-In popup could not be completed.');
      }
    }
  };

  // Handle Send OTP to Admin Email
  const handleSendOtp = async () => {
    setErrorMsg('');
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid administrator email address.');
      return;
    }

    if (!ALLOWED_ADMIN_EMAILS.includes(cleanEmail)) {
      setErrorMsg('Access denied. This email is not on the authorized Administrator whitelist.');
      return;
    }

    setFormLoading(true);
    try {
      const data = await apiFetch('verify-email.php', {
        method: 'POST',
        body: JSON.stringify({ action: 'resend', email: cleanEmail })
      });
      if (!data) {
        throw new Error('Failed to send admin verification code.');
      }
      setOtpSent(true);
      setTimerActive(true);
      setCountdown(60);
      setOtpDigits(['', '', '', '', '', '']);
      setSuccessMsg(data?.message || `6-digit security key sent to ${cleanEmail}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send verification key. Please check your admin inbox.');
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

    if (val && index < 5) {
      const nextInput = document.getElementById(`adm-otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`adm-otp-${index - 1}`);
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

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid administrator email address.');
      return;
    }

    // Whitelist check
    if (!ALLOWED_ADMIN_EMAILS.includes(cleanEmail)) {
      setErrorMsg('Access denied. This email is not on the authorized Administrator whitelist.');
      return;
    }

    if (authMethod === 'password') {
      if (!password || password.length < 6) {
        setErrorMsg('Admin password must be at least 6 characters.');
        return;
      }
    } else {
      if (!otpSent) {
        handleSendOtp();
        return;
      }
      const code = otpDigits.join('');
      if (code.length < 6) {
        setErrorMsg('Please enter all 6 digits of your security key.');
        return;
      }
    }

    setFormLoading(true);

    try {
      if (authMethod === 'otp') {
        const code = otpDigits.join('');
        const data = await apiFetch('verify-email.php', {
          method: 'POST',
          body: JSON.stringify({ action: 'verify', email: cleanEmail, code: code })
        });

        if (!data) {
          throw new Error('Invalid or expired security key.');
        }

        loginUser({
          id: `adm-${Date.now()}`,
          name: cleanEmail === 'michaelomare045@gmail.com' ? 'Michael Omare' : 'Rajab Wamu',
          email: cleanEmail,
          role: 'admin',
          isVerified: true
        });

        setSuccessMsg('Admin credentials verified! Unlocking Console...');
        setTimeout(() => navigate(redirectPath), 700);
      } else {
        // Password Login via PHP backend
        const data = await apiFetch('login.php', {
          method: 'POST',
          body: JSON.stringify({ email: cleanEmail, password: password, role: 'admin' })
        });

        if (!data || !data.user) {
          throw new Error('Authentication failed on backend.');
        }

        const backendUser = data.user;
        loginUser({
          id: backendUser?.id,
          name: backendUser?.name || (cleanEmail === 'michaelomare045@gmail.com' ? 'Michael Omare' : 'Rajab Wamu'),
          email: backendUser?.email || cleanEmail,
          avatar: backendUser?.avatar || undefined,
          role: 'admin',
          isVerified: true
        });

        setSuccessMsg(`Welcome, Administrator ${backendUser?.name || 'Omare'}!`);
        setTimeout(() => navigate(redirectPath), 600);
      }
    } catch (err: any) {
      console.error('Admin Auth Error:', err);
      setErrorMsg(err.message || 'Admin authentication failed. Please check credentials.');
    } finally {
      setFormLoading(false);
    }
  };

  // Google OAuth Login handler (Needs backend-native implementation)
  const handleGoogleLogin = async () => {
    setErrorMsg('Google login for admin is not supported without Firebase. Please use password or OTP.');
  };

  return (
    <div id="admin-login-page" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        
        {/* Brand & Security Header */}
        <div className="text-center space-y-3 mb-6">
          <Link to={defaultAdminHome} className="inline-flex items-center space-x-2.5 group">
            <img 
              src={imgError ? DEFAULT_LOGO_URL : resolveBrandingLogoUrl(logoUrl)} 
              alt="UQlearn Logo" 
              onError={() => setImgError(true)}
              className="w-12 h-12 object-contain rounded-2xl bg-slate-900 p-1.5 border border-slate-800 shadow-sm group-hover:scale-105 transition-transform"
              referrerPolicy="no-referrer"
            />
            <span className="text-2xl font-black tracking-tight select-none">
              <span className="text-rose-500 group-hover:text-rose-400 transition-colors">UQ</span>
              <span className="text-purple-400 group-hover:text-purple-300 transition-colors">learn</span>
            </span>
          </Link>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Admin Console Sign In
            </h1>
          </div>
        </div>

        {/* Main Card Container */}
        <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
          
          {/* Success Banner */}
          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs font-bold flex items-center space-x-2 animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs font-semibold flex items-center space-x-2 animate-shake">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Admin Email Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                Admin Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  placeholder="e.g. michaelomare045@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 font-medium transition-all"
                />
              </div>
            </div>

            {/* Auth Method Selector */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center space-x-2 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('password');
                    setErrorMsg('');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    authMethod === 'password'
                      ? 'bg-slate-900 text-rose-400 shadow-xs'
                      : 'text-slate-400'
                  }`}
                >
                  Admin Key
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('otp');
                    setErrorMsg('');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    authMethod === 'otp'
                      ? 'bg-slate-900 text-rose-400 shadow-xs'
                      : 'text-slate-400'
                  }`}
                >
                  Admin OTP Code
                </button>
              </div>

              {authMethod === 'password' && (
                <Link
                  to="/forgot-password"
                  className="text-xs font-bold text-rose-400 hover:underline"
                >
                  Emergency Reset
                </Link>
              )}
            </div>

            {/* Method 1: Password Input */}
            {authMethod === 'password' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  Admin Passcode <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter system administrative key"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-11 py-3 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 font-medium transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-200"
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
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    {formLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                    ) : (
                      <KeyRound className="w-4 h-4 text-rose-400" />
                    )}
                    <span>Dispatch Security Key to Admin Inbox</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-300">
                      Enter 6-Digit Administrator Key
                    </label>
                    <div className="flex justify-between gap-2 on-paste" onPaste={handleOtpPaste}>
                      {otpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          id={`adm-otp-${idx}`}
                          type="text"
                          maxLength={1}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={digit}
                          onChange={(e) => handleOtpChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          className="w-11 h-12 text-center text-lg font-black bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-all"
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-400 font-medium">
                        Didn't receive code?
                      </span>
                      {timerActive ? (
                        <span className="text-slate-500 font-bold">Resend in {countdown}s</span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          className="text-rose-400 font-bold hover:underline cursor-pointer"
                        >
                          Resend Key
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
                  className="w-4 h-4 rounded text-rose-600 bg-slate-800 border-slate-700 focus:ring-rose-500"
                />
                <span className="text-xs font-semibold text-slate-400">
                  Keep admin session authenticated
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={formLoading}
              className="w-full py-3.5 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-rose-600/30 flex items-center justify-center space-x-2 transition-all transform active:scale-[0.99] cursor-pointer"
            >
              {formLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Admin Authorization...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authenticate Admin Console</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Google Sign In & Admin Notice */}
          <div className="space-y-3 pt-2">
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-4 text-xs font-bold text-slate-500 uppercase tracking-wider">or sign in with</span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>
            <div id="googleSignInBtnAdmin" className={`w-full flex justify-center ${gsiReady ? 'h-11' : 'hidden'}`}></div>
            {!gsiReady && (
              <button
                type="button"
                onClick={handleDirectGoogleLogin}
                className="w-full max-w-[340px] h-11 px-4 bg-slate-900 border border-slate-700 hover:bg-slate-850 rounded-xl text-slate-200 text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-3 transition-all cursor-pointer shadow-xs mx-auto"
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

          <div className="p-3 bg-slate-800/60 border border-slate-700/80 rounded-2xl text-[11px] text-slate-400 text-center space-y-1">
            <p className="font-semibold text-slate-300">Administrator Security Notice</p>
            <p>Google sign-in verifies your email against authorized admin records in the database.</p>
          </div>
        </div>

        {/* Dedicated Portals Cross-Links */}
        <div className="mt-6 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-center">
            {isLiveUqDomain && isAdminHost ? (
              <a
                href={`${ROOT_URL}/login`}
                className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-teal-500 transition-all flex flex-col items-center space-y-1 shadow-xs group"
              >
                <GraduationCap className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold text-slate-200">Student Portal</span>
                <span className="text-[10px] text-slate-500">Learner sign in</span>
              </a>
            ) : (
              <Link
                to="/login"
                className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-teal-500 transition-all flex flex-col items-center space-y-1 shadow-xs group"
              >
                <GraduationCap className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold text-slate-200">Student Portal</span>
                <span className="text-[10px] text-slate-500">Learner sign in</span>
              </Link>
            )}

            {isLiveUqDomain ? (
              <a
                href="https://instructor.uqlearn.org/login"
                className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500 transition-all flex flex-col items-center space-y-1 shadow-xs group"
              >
                <Presentation className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold text-slate-200">Instructor Studio</span>
                <span className="text-[10px] text-slate-500">Educator sign in</span>
              </a>
            ) : (
              <Link
                to="/login/instructor"
                className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500 transition-all flex flex-col items-center space-y-1 shadow-xs group"
              >
                <Presentation className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold text-slate-200">Instructor Studio</span>
                <span className="text-[10px] text-slate-500">Educator sign in</span>
              </Link>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
export default AdminLoginPage;
