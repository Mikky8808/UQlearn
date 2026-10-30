import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Mail, 
  Lock, 
  User, 
  Phone, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Check, 
  GraduationCap, 
  Presentation, 
  KeyRound, 
  RefreshCw,
  Loader2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import { API_ENDPOINTS, apiFetch, GOOGLE_CLIENT_ID, ROOT_URL } from '../../lib/apiConfig';
import { decodeGoogleJwt, signInWithGoogleUniversal } from '../../lib/googleAuth';

export const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginUser } = useApp();

  // Stage 1: Form Fill, Stage 2: 6-Digit Email/SMS Verification
  const [stage, setStage] = useState<'form' | 'verify'>('form');

  // Core Required Information
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordlessMode, setPasswordlessMode] = useState(false);

  // Additional / Context Information
  const [role, setRole] = useState<UserRole>('learner');
  const [phoneCountry, setPhoneCountry] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [country, setCountry] = useState('United States');
  const [city, setCity] = useState('');

  // Agreements & Consent
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(true);

  // Verification Step state
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(60);
  const [timerActive, setTimerActive] = useState(false);

  // Validation & Loading
  const [formLoading, setFormLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Country calling codes
  const countryCodes = [
    { code: '+1', country: 'US / Canada' },
    { code: '+44', country: 'United Kingdom' },
    { code: '+254', country: 'Kenya' },
    { code: '+91', country: 'India' },
    { code: '+49', country: 'Germany' },
    { code: '+33', country: 'France' },
    { code: '+61', country: 'Australia' },
    { code: '+81', country: 'Japan' },
    { code: '+234', country: 'Nigeria' },
    { code: '+971', country: 'UAE' },
  ];

  // Country lists for certification & localized content
  const worldCountries = [
    'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 
    'Kenya', 'India', 'France', 'Nigeria', 'Singapore', 'South Africa', 'Japan', 'Brazil'
  ];

  // Live Password Criteria Checks
  const passwordChecks = useMemo(() => {
    const minLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const mixedCase = hasUpper && hasLower;
    
    // Strength score out of 3
    let score = 0;
    if (minLength) score++;
    if (mixedCase) score++;
    if (hasNumber) score++;

    return {
      minLength,
      mixedCase,
      hasNumber,
      score, // 0, 1, 2, 3
      isAllValid: minLength && mixedCase && hasNumber
    };
  }, [password]);

  // Verification Countdown
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
      const nextInput = document.getElementById(`signup-otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`signup-otp-${index - 1}`);
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

  const handleResendOtp = async () => {
    setErrorMsg('');
    setFormLoading(true);
    try {
      const data = await apiFetch('verify-email.php', {
        method: 'POST',
        body: JSON.stringify({
          action: 'resend',
          email: email.trim().toLowerCase()
        })
      });

      setCountdown(60);
      setTimerActive(true);
      setSuccessMsg(data?.message || 'A new verification code has been dispatched. Please check your inbox.');
    } catch (err: any) {
      console.error('Resend verification code error:', err);
      setErrorMsg(err.message || 'Failed to send new code. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  // Form Submission -> Move to Verification Stage
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!firstName.trim() || !lastName.trim()) {
      setErrorMsg('Please enter both your First Name and Last Name.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please provide a valid email address.');
      return;
    }

    if (!passwordlessMode) {
      if (!passwordChecks.isAllValid) {
        setErrorMsg('Please ensure your password meets all 3 security requirements.');
        return;
      }
    }

    if (!agreeTerms) {
      setErrorMsg('You must agree to the Terms of Service and Privacy Policy to create an account.');
      return;
    }

    setFormLoading(true);
    setErrorMsg('');

    try {
      const data = await apiFetch('register.php', {
        method: 'POST',
        body: JSON.stringify({
          role: role,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          password: passwordlessMode ? undefined : password,
          phoneCountry: phoneCountry,
          phoneNumber: phoneNumber.trim() || undefined,
          country: country,
          city: city.trim() || undefined,
          agreeTerms: agreeTerms,
          marketingOptIn: marketingOptIn,
          authProvider: 'email'
        })
      });

      if (!data) throw new Error('Registration failed.');

      setStage('verify');
      setTimerActive(true);
      setCountdown(60);
      setSuccessMsg('Account created successfully! A verification code has been sent to your email.');
      setOtpDigits(['', '', '', '', '', '']);
    } catch (err: any) {
      console.error('Registration error:', err);
      setErrorMsg(err.message || 'Unable to connect to registration server. Please check your connection and try again.');
    } finally {
      setFormLoading(false);
    }
  };

  // Final OTP Verification & Account Activation
  const handleVerifyAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpDigits.join('');
    if (code.length < 6) {
      setErrorMsg('Please enter the complete 6-digit confirmation code.');
      return;
    }

    setFormLoading(true);
    setErrorMsg('');

    try {
      const data = await apiFetch('verify-email.php', {
        method: 'POST',
        body: JSON.stringify({
          action: 'verify',
          email: email.trim().toLowerCase(),
          otp: code
        })
      });

      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      const backendName = data?.user?.name;
      const effectiveName = (backendName && backendName.includes(' ') && !['user', 'educator', 'student', 'instructor'].includes(backendName.toLowerCase())) 
        ? backendName 
        : fullName;

      loginUser({
        id: data?.user?.id || `usr-${Date.now()}`,
        name: effectiveName,
        email: email.trim(),
        role: role,
        phone: phoneNumber.trim() ? `${phoneCountry} ${phoneNumber.trim()}` : undefined,
        country: country,
        city: city.trim() || undefined,
        marketingOptIn: marketingOptIn,
        isVerified: true
      });

      setSuccessMsg(data?.message || 'Account verified and activated successfully! Redirecting to your dashboard...');
      setTimeout(() => {
        if (role === 'instructor') {
          if (typeof window !== 'undefined' && window.location.hostname.includes(ROOT_URL.replace('https://', ''))) {
            window.location.href = `https://instructor.${ROOT_URL.replace('https://', '')}/`;
          } else {
            navigate('/instructor');
          }
        } else {
          navigate('/dashboard');
        }
      }, 1000);
    } catch (err: any) {
      console.error('Email verification error:', err);
      setErrorMsg(err.message || 'Invalid verification code. Please check and try again or click Resend Code.');
    } finally {
      setFormLoading(false);
    }
  };

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

          const btnEl = document.getElementById('googleSignUpBtnLearner');
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
        console.error('Failed to init Google Sign-In button on signup:', err);
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

  const processGoogleSignUpUser = async (googleEmail: string, googleName: string, googlePicture?: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    setFormLoading(true);
    try {
      if (!googleEmail) {
        throw new Error('Failed to retrieve email from your Google Account.');
      }

      // 1. Authenticate with backend API v1 (login.php)
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
            role: role || 'learner'
          })
        });

        if (data && data.user) {
          backendUser = data.user;
          token = data.token;
        }
      } catch (backendErr) {
        console.warn('Backend signup response notice:', backendErr);
      }

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
        role: (backendUser?.role === 'instructor' || backendUser?.role === 'admin') ? backendUser.role : (role === 'instructor' ? 'instructor' : 'student'),
        isVerified: true,
        token: token || backendUser?.token
      };

      loginUser(userToLogin);

      setSuccessMsg(`Welcome, ${userToLogin.name}! Account ready. Redirecting...`);
      setTimeout(() => navigate(role === 'instructor' ? '/instructor' : '/dashboard'), 600);
    } catch (err: any) {
      setErrorMsg(err.message || 'Google Registration failed.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleGoogleCredentialResponse = async (response: any) => {
    try {
      const profile = decodeGoogleJwt(response.credential);
      await processGoogleSignUpUser(profile.email, profile.name, profile.picture);
    } catch (err: any) {
      console.error('Failed to parse Google signup credential:', err);
      setErrorMsg(err.message || 'Failed to authenticate with Google.');
    }
  };

  const handleDirectGoogleSignUp = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setFormLoading(true);
    try {
      const profile = await signInWithGoogleUniversal();
      await processGoogleSignUpUser(profile.email, profile.name, profile.picture);
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        setErrorMsg(err.message || 'Google Sign-Up popup could not be completed.');
      }
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between py-10 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-xl w-full mx-auto space-y-6">
        
        {/* Header Title */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            {stage === 'form' ? 'Create your account' : 'Verify your email address'}
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

        {/* STAGE 1: REGISTRATION FORM */}
        {stage === 'form' && (
          <form onSubmit={handleFormSubmit} className="space-y-5">
              
              {/* Role Selection: Student vs Instructor */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Your Primary Goal on UQlearn
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('learner')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1 ${
                      role === 'learner'
                        ? 'border-teal-500 bg-teal-50/60 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 ring-2 ring-teal-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <GraduationCap className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                      {role === 'learner' && <CheckCircle2 className="w-4 h-4 text-teal-600" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold">I want to Learn</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Take courses & earn certificates</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('instructor')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1 ${
                      role === 'instructor'
                        ? 'border-teal-500 bg-teal-50/60 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 ring-2 ring-teal-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Presentation className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                      {role === 'instructor' && <CheckCircle2 className="w-4 h-4 text-teal-600" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold">I want to Teach</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Publish courses & earn revenue</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Full Name Fields (*) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Full Name <span className="text-teal-600">*</span>
                  <span className="text-[10px] font-normal text-slate-400 ml-1">(Shown on your verified certificates)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      placeholder="First Name *"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 font-medium transition-all"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      required
                      placeholder="Last Name *"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 font-medium transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Email Address Field (*) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Email Address <span className="text-teal-600">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. yourname@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 font-medium transition-all"
                  />
                </div>
              </div>

              {/* Password Option Toggle */}
              <div className="flex items-center justify-between pt-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Password <span className="text-teal-600">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setPasswordlessMode(!passwordlessMode)}
                  className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                >
                  {passwordlessMode ? '🔑 Set a standard password instead' : '⚡ Sign up passwordless (Email Code)'}
                </button>
              </div>

              {/* If Standard Password */}
              {!passwordlessMode ? (
                <div className="space-y-2.5">
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Create a strong password *"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-11 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 font-medium transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Visual Strength Meter */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      <span className="text-slate-500 dark:text-slate-400">Password Strength:</span>
                      <span className={
                        passwordChecks.score === 3 
                          ? 'text-emerald-600 dark:text-emerald-400 font-bold' 
                          : passwordChecks.score === 2 
                            ? 'text-amber-500 font-bold' 
                            : 'text-rose-500 font-bold'
                      }>
                        {password.length === 0 ? 'Not entered' : passwordChecks.score === 3 ? 'Strong' : passwordChecks.score === 2 ? 'Moderate' : 'Weak'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 h-1.5">
                      <div className={`rounded-full transition-colors ${passwordChecks.score >= 1 ? (passwordChecks.score === 1 ? 'bg-rose-500' : 'bg-amber-500') : 'bg-slate-200 dark:bg-slate-800'}`}></div>
                      <div className={`rounded-full transition-colors ${passwordChecks.score >= 2 ? (passwordChecks.score === 2 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-slate-200 dark:bg-slate-800'}`}></div>
                      <div className={`rounded-full transition-colors ${passwordChecks.score === 3 ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'}`}></div>
                    </div>
                  </div>

                  {/* 3 Explicit Criteria Checklist (Udemy Standard) */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                    <div className="flex items-center space-x-2">
                      {passwordChecks.minLength ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500 font-black shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-slate-400 flex items-center justify-center shrink-0"></div>
                      )}
                      <span className={passwordChecks.minLength ? 'text-emerald-700 dark:text-emerald-300 font-semibold' : 'text-slate-500 dark:text-slate-400'}>
                        Minimum length of 8 characters
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {passwordChecks.mixedCase ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500 font-black shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-slate-400 flex items-center justify-center shrink-0"></div>
                      )}
                      <span className={passwordChecks.mixedCase ? 'text-emerald-700 dark:text-emerald-300 font-semibold' : 'text-slate-500 dark:text-slate-400'}>
                        Mixture of uppercase and lowercase letters (e.g. Aa)
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {passwordChecks.hasNumber ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500 font-black shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-slate-400 flex items-center justify-center shrink-0"></div>
                      )}
                      <span className={passwordChecks.hasNumber ? 'text-emerald-700 dark:text-emerald-300 font-semibold' : 'text-slate-500 dark:text-slate-400'}>
                        Inclusion of at least one number (0-9)
                      </span>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="p-4 bg-teal-50/60 dark:bg-teal-950/30 rounded-2xl border border-teal-200 dark:border-teal-800 text-xs space-y-1">
                  <div className="flex items-center space-x-2 text-teal-800 dark:text-teal-200 font-bold">
                    <KeyRound className="w-4 h-4 text-teal-600" />
                    <span>Passwordless Registration Activated</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">
                    No need to create or remember a password! You will receive a 6-digit one-time code to activate your account.
                  </p>
                </div>
              )}

              {/* Optional Phone & Location Section (Collapsible / Context-dependent) */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Optional Profile Details
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">For billing & certification</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Optional Phone */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Phone Number (Optional)
                    </label>
                    <div className="flex gap-1.5">
                      <select
                        value={phoneCountry}
                        onChange={(e) => setPhoneCountry(e.target.value)}
                        className="px-2 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:border-teal-500"
                      >
                        {countryCodes.map(c => (
                          <option key={c.code + c.country} value={c.code}>{c.code}</option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        placeholder="712 345 678"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-teal-500 font-medium"
                      />
                    </div>
                  </div>

                  {/* Optional Country */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Country (Optional)
                    </label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:border-teal-500"
                    >
                      {worldCountries.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Compliance & Opt-in Checkboxes */}
              <div className="space-y-3 pt-2">
                <label className="flex items-start space-x-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-slate-700 w-4 h-4 cursor-pointer"
                  />
                  <span>
                    I agree to UQlearn's <Link to="/terms" className="text-teal-600 dark:text-teal-400 font-bold underline">Terms of Service</Link> and acknowledge the <Link to="/privacy" className="text-teal-600 dark:text-teal-400 font-bold underline">Privacy Policy</Link>. <span className="text-teal-600">*</span>
                  </span>
                </label>

                <label className="flex items-start space-x-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={marketingOptIn}
                    onChange={(e) => setMarketingOptIn(e.target.checked)}
                    className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-slate-700 w-4 h-4 cursor-pointer"
                  />
                  <span>
                    Send me promotional emails, special discounts, career advice, and tailored learning tips.
                  </span>
                </label>
              </div>

               {/* Submit Button */}
              <button
                type="submit"
                disabled={formLoading}
                className="w-full py-3.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs sm:text-sm shadow-md hover:shadow-teal-600/30 transition-all flex items-center justify-center space-x-2 cursor-pointer mt-3"
              >
                {formLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                    <span>Creating & Activating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create & Activate Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-3">
                <div className="border-t border-slate-200 dark:border-slate-800 w-full"></div>
                <span className="bg-white dark:bg-slate-900 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                  Or register with
                </span>
              </div>

              {/* Google SSO Container */}
              <div className="pt-2 flex flex-col items-center">
                <div id="googleSignUpBtnLearner" className={`w-full flex justify-center ${gsiReady ? 'h-11' : 'hidden'}`}></div>
                {!gsiReady && (
                  <button
                    type="button"
                    onClick={handleDirectGoogleSignUp}
                    disabled={formLoading}
                    className="w-full max-w-[340px] h-11 px-4 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-200 text-sm font-semibold flex items-center justify-center space-x-3 shadow-xs transition-all cursor-pointer"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>Register with Google</span>
                  </button>
                )}
              </div>

            </form>
          )}

          {/* STAGE 2: 6-DIGIT ACTIVATION CODE VERIFICATION */}
          {stage === 'verify' && (
            <form onSubmit={handleVerifyAccount} className="space-y-6 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-center space-y-1.5">
                <p className="text-xs font-bold text-teal-800 dark:text-teal-200">
                  Verification Code Sent
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Please enter the 6-digit confirmation code sent to <span className="font-bold text-teal-600 dark:text-teal-400">{email}</span>.
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  📬 Can't find it in your primary inbox? Please check your <strong>Spam / Junk</strong> or <strong>Promotions</strong> folder.
                </p>
              </div>

              {/* 6 Individual Digits */}
              <div className="space-y-2">
                <label className="block text-center text-xs font-bold text-slate-700 dark:text-slate-300">
                  Enter 6-Digit Code
                </label>
                <div className="flex justify-between gap-2 max-w-sm mx-auto" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`signup-otp-${idx}`}
                      type="text"
                      maxLength={1}
                      inputMode="numeric"
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-11 h-14 text-center text-xl font-black bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl text-teal-600 dark:text-teal-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 shadow-xs"
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setStage('form')}
                  className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold cursor-pointer"
                >
                  ← Edit details
                </button>

                <div>
                  {countdown > 0 ? (
                    <span className="text-slate-400 font-medium">Resend code in {countdown}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer flex items-center space-x-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Resend Code</span>
                    </button>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full py-3.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs sm:text-sm shadow-md hover:shadow-teal-600/30 transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                {formLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                    <span>Verifying & Activating...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify & Finish Registration</span>
                  </>
                )}
              </button>
            </form>
          )}

        {/* Footer Link to Login */}
        <div className="text-center space-y-3">
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Already have an UQlearn account?{' '}
            <Link 
              to="/login" 
              className="text-teal-600 dark:text-teal-400 font-black hover:underline"
            >
              Log in here
            </Link>
          </p>

          <div className="flex items-center justify-center space-x-4 text-[11px] text-slate-400">
            <span>256-bit SSL Secured</span>
            <span>•</span>
            <Link to="/terms" className="hover:underline">Terms of Use</Link>
            <span>•</span>
            <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
          </div>
        </div>

      </div>
    </div>
  );
};
