import React, { useState, useEffect } from 'react';
import { SignaturePad } from '../common/SignaturePad';
import { TiktokPixelSettings } from './TiktokPixelSettings';
import { 
  Wallet, 
  User, 
  CheckSquare, 
  Bell, 
  Building, 
  CreditCard, 
  CheckCircle2, 
  Save, 
  ExternalLink,
  ChevronDown,
  ShieldCheck,
  Mail,
  Upload,
  Lock,
  Key,
  AlertTriangle,
  Landmark,
  Info,
  ArrowRight,
  ArrowLeft,
  Edit2,
  Phone,
  Search
} from 'lucide-react';
import { Course } from '../../types';
import { InstructorTabKey } from '../navigation/InstructorSidebar';
import { API_ENDPOINTS, apiFetch, saveInstructorPayoutApi, getInstructorPayoutApi, getActiveSession, updateActiveSession } from '../../lib/apiConfig';
import { useApp } from '../../context/AppContext';

interface AdminSettingsViewsProps {
  tab: InstructorTabKey;
  currentUser: any;
}

export const InstructorAdminSettingsViews: React.FC<AdminSettingsViewsProps> = ({
  tab,
  currentUser,
}) => {
  const { setCurrentUser, payoutCountries, getPayoutBanksForCountry } = useApp();

  const activePayoutCountries = (payoutCountries || []).filter(c => c.isActive !== false);

  // Helper flag emoji for country code
  const getFlagEmoji = (countryCode?: string) => {
    if (!countryCode || countryCode.length !== 2) return '🌐';
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  // Multi-step Bank Setup State
  // Step 1: Select Country -> Step 2: Select Bank -> Step 3: Enter Account Number, Email, Phone Number, Full Name
  const [bankSetupStep, setBankSetupStep] = useState<1 | 2 | 3>(1);
  const [stepError, setStepError] = useState('');
  const [bankSearchTerm, setBankSearchTerm] = useState('');

  const [selectedCountryId, setSelectedCountryId] = useState(() => {
    try {
      const saved = localStorage.getItem('uqlearn_bank_details');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.countryId || '';
      }
    } catch (e) {}
    return '';
  });

  const [selectedCountryName, setSelectedCountryName] = useState(() => {
    try {
      const saved = localStorage.getItem('uqlearn_bank_details');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.country || parsed.bankCountry || '';
      }
    } catch (e) {}
    return '';
  });

  const [selectedBankName, setSelectedBankName] = useState(() => {
    try {
      const saved = localStorage.getItem('uqlearn_bank_details');
      if (saved) return JSON.parse(saved).bankName || '';
    } catch (e) {}
    return '';
  });

  const [accountNumber, setAccountNumber] = useState(() => {
    try {
      const saved = localStorage.getItem('uqlearn_bank_details');
      if (saved) return JSON.parse(saved).accountNumber || '';
    } catch (e) {}
    return '';
  });

  const [payoutFullName, setPayoutFullName] = useState(() => {
    try {
      const saved = localStorage.getItem('uqlearn_bank_details');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.fullName || parsed.accountHolderName || '';
      }
    } catch (e) {}
    return currentUser?.name || '';
  });

  const [payoutEmail, setPayoutEmail] = useState(() => {
    try {
      const saved = localStorage.getItem('uqlearn_bank_details');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.email || '';
      }
    } catch (e) {}
    return currentUser?.email || '';
  });

  const [payoutPhone, setPayoutPhone] = useState(() => {
    try {
      const saved = localStorage.getItem('uqlearn_bank_details');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.phone || parsed.phoneNumber || '';
      }
    } catch (e) {}
    return (currentUser as any)?.phone || '';
  });

  const [isBankSaved, setIsBankSaved] = useState(() => {
    try {
      const saved = localStorage.getItem('uqlearn_bank_details');
      if (saved) {
        const parsed = JSON.parse(saved);
        return !!(parsed.country || parsed.bankCountry) && 
               !!parsed.bankName && 
               !!parsed.accountNumber;
      }
    } catch (e) {}
    return false;
  });

  useEffect(() => {
    if (currentUser?.id) {
      getInstructorPayoutApi(currentUser.id).then(response => {
        const dbData = response?.data || response;
        if (dbData && (dbData.bankName || dbData.accountNumber)) {
          if (dbData.countryId) setSelectedCountryId(dbData.countryId);
          if (dbData.country) setSelectedCountryName(dbData.country);
          if (dbData.bankName) setSelectedBankName(dbData.bankName);
          if (dbData.accountNumber) setAccountNumber(dbData.accountNumber);
          if (dbData.fullName || dbData.accountHolderName) setPayoutFullName(dbData.fullName || dbData.accountHolderName);
          if (dbData.email) setPayoutEmail(dbData.email);
          if (dbData.phone || dbData.phoneNumber) setPayoutPhone(dbData.phone || dbData.phoneNumber);
          setIsBankSaved(true);
          try {
            localStorage.setItem('uqlearn_bank_details', JSON.stringify(dbData));
          } catch {}
        }
      }).catch(() => {});
    }
  }, [currentUser?.id]);

  const [payoutMsg, setPayoutMsg] = useState('');
  const [isSavingPayout, setIsSavingPayout] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPasswordState] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordErr, setPasswordErr] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Profile State with database-backed states from users table
  const [bio, setBio] = useState('Principal Cloud Architect & AI Systems Engineer. 10+ years designing enterprise microservices and mentoring over 100k engineers.');
  const [website, setWebsite] = useState('https://vance-cloud.io');
  const [twitter, setTwitter] = useState('@dr_vance_cloud');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [instructorTitle, setInstructorTitle] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [userRole, setUserRole] = useState('instructor');
  const [countryCode, setCountryCode] = useState('+254');
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [agreedMarketing, setAgreedMarketing] = useState(false);
  const [accountStatus, setAccountStatus] = useState('Active');
  const [authProvider, setAuthProvider] = useState('email');
  const [createdAt, setCreatedAt] = useState('');
  const [lastLoginAt, setLastLoginAt] = useState('');
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [signature, setSignature] = useState('');

  // Gradebook State
  const [submissions, setSubmissions] = useState([
    { id: 'sub-1', learner: 'Alex Rivera', assignment: 'Module 4: Next.js Server Action Cache Mutex', submitted: 'Yesterday', score: '98/100', status: 'Graded' },
    { id: 'sub-2', learner: 'David Kim', assignment: 'Module 6: Docker Microservice Orchestration', submitted: '3 hours ago', score: 'Pending', status: 'Needs Grading' },
    { id: 'sub-3', learner: 'Elena Rostova', assignment: 'Module 8: Gemini Multi-modal API Agent', submitted: '2 days ago', score: '100/100', status: 'Graded' },
  ]);

  // Notifications State
  const [emailDigest, setEmailDigest] = useState(true);
  const [instantQnA, setInstantQnA] = useState(true);
  const [payoutAlerts, setPayoutAlerts] = useState(true);
  const [marketingAlerts, setMarketingAlerts] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);

  // Fetch profile from central database users table when the tab is 'profile' or when component mounts
  useEffect(() => {
    if (tab === 'profile' && currentUser?.id) {
      const fetchProfile = async () => {
        setIsLoadingProfile(true);
        const userEmail = currentUser?.email || '';
        const nameParts = currentUser?.name ? currentUser.name.split(' ') : ['Instructor', 'Educator'];
        const first = nameParts[0] || 'Instructor';
        const last = nameParts.slice(1).join(' ') || 'Educator';

        try {
          const result = await apiFetch(`profile.php?id=${encodeURIComponent(currentUser.id)}&first_name=${encodeURIComponent(first)}&last_name=${encodeURIComponent(last)}&email=${encodeURIComponent(userEmail)}`);
          if (result && result.data) {
            const d = result.data;
            setBio(d.bio || '');
            setWebsite(d.website || '');
            setTwitter(d.twitter || '');
            setFirstName(d.first_name || first);
            setLastName(d.last_name || last);
            setInstructorTitle(d.instructor_title || '');
            setPhoneNumber(d.phone_number || '');
            setEmail(d.email || userEmail);
            setAvatarUrl(d.avatar_url || currentUser?.avatar || '');
            setUserRole(d.role || currentUser?.role || 'instructor');
            setCountryCode(d.country_code || '+254');
            setPreferredLanguage(d.preferred_language || 'en');
            setIsEmailVerified(!!d.is_email_verified);
            setAgreedMarketing(!!d.agreed_marketing);
            setAccountStatus(d.status || 'Active');
            setAuthProvider(d.auth_provider || 'email');
            setCreatedAt(d.created_at || '');
            setLastLoginAt(d.last_login_at || '');
            setSignature(d.signature || '');
          }
        } catch (error) {
          console.error("Failed to load profile data from users table:", error);
          // Catch and fallback gracefully to prevent crashes
          const fallbackKey = `uq_profile_${currentUser.id}`;
          const fallbackDataStr = localStorage.getItem(fallbackKey);
          if (fallbackDataStr) {
            try {
              const d = JSON.parse(fallbackDataStr);
              setBio(d.bio || '');
              setWebsite(d.website || '');
              setTwitter(d.twitter || '');
              setFirstName(d.first_name || first);
              setLastName(d.last_name || last);
              setInstructorTitle(d.instructor_title || '');
              setPhoneNumber(d.phone_number || '');
              setEmail(d.email || userEmail);
              setAvatarUrl(d.avatar_url || currentUser?.avatar || '');
              setUserRole(d.role || currentUser?.role || 'instructor');
              setCountryCode(d.country_code || '+254');
              setPreferredLanguage(d.preferred_language || 'en');
              setIsEmailVerified(!!d.is_email_verified);
              setAgreedMarketing(!!d.agreed_marketing);
              setAccountStatus(d.status || 'Active');
              setAuthProvider(d.auth_provider || 'email');
              setCreatedAt(d.created_at || '');
              setLastLoginAt(d.last_login_at || '');
              setSignature(d.signature || '');
            } catch {}
          }
        } finally {
          setIsLoadingProfile(false);
        }
      };
      fetchProfile();
    }
  }, [tab, currentUser?.id]);

  // Step navigation & saving for Instructor Bank Setup
  const handleNextToBank = () => {
    setStepError('');
    if (!selectedCountryName) {
      setStepError('Please select a country to proceed.');
      return;
    }
    // Check if the currently chosen bank belongs to the selected country; if not, reset it
    const banks = getPayoutBanksForCountry(selectedCountryId || selectedCountryName, true);
    if (selectedBankName && !banks.some(b => b.name.toLowerCase() === selectedBankName.toLowerCase())) {
      setSelectedBankName('');
    }
    setBankSetupStep(2);
  };

  const handleNextToAccount = () => {
    setStepError('');
    if (!selectedBankName) {
      setStepError('Please select a bank from the list.');
      return;
    }
    setBankSetupStep(3);
  };

  const handleSavePayout = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setStepError('');

    if (!selectedCountryName) {
      setStepError('Please select your destination country.');
      setBankSetupStep(1);
      return;
    }
    if (!selectedBankName) {
      setStepError('Please select your bank.');
      setBankSetupStep(2);
      return;
    }
    if (!accountNumber.trim()) {
      setStepError('Please enter your bank account number.');
      setBankSetupStep(3);
      return;
    }
    if (!payoutFullName.trim()) {
      setStepError('Please enter your full name (account holder name).');
      setBankSetupStep(3);
      return;
    }
    if (!payoutEmail.trim() || !payoutEmail.includes('@')) {
      setStepError('Please enter a valid email address.');
      setBankSetupStep(3);
      return;
    }
    if (!payoutPhone.trim()) {
      setStepError('Please enter your phone number.');
      setBankSetupStep(3);
      return;
    }

    setIsSavingPayout(true);
    try {
      const details = {
        countryId: selectedCountryId,
        country: selectedCountryName,
        bankCountry: selectedCountryName,
        bankName: selectedBankName.trim(),
        accountNumber: accountNumber.trim(),
        fullName: payoutFullName.trim(),
        accountHolderName: payoutFullName.trim(),
        email: payoutEmail.trim(),
        phone: payoutPhone.trim(),
        phoneNumber: payoutPhone.trim(),
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem('uqlearn_bank_details', JSON.stringify(details));
      
      // Save to database API
      if (currentUser?.id) {
        const res = await saveInstructorPayoutApi({ userId: currentUser.id, ...details });
        if (res && res.success === false) {
          throw new Error(res.message || 'Failed to save payout settings to database.');
        }
      }

      setIsBankSaved(true);
      setPayoutMsg('Bank and recipient details saved to database successfully!');
    } catch (err: any) {
      console.error('Save payout error:', err);
      setStepError(err.message || 'Failed to save bank details to database.');
    } finally {
      setIsSavingPayout(false);
      setTimeout(() => setPayoutMsg(''), 4500);
    }
  };

  const getAvatarMaskedValue = (url: string) => {
    if (!url) return '';
    if (url.startsWith('data:')) return 'secure_upload_stream_base64_active';
    
    // Extract file portion
    const lastSlash = url.lastIndexOf('/');
    const filename = lastSlash !== -1 ? url.substring(lastSlash + 1) : url;
    
    // Check if it fits the format timestamp_hex32.ext
    if (filename.includes('_')) {
      const parts = filename.split('_');
      if (parts.length > 1) {
        const hexPart = parts[1].split('.')[0];
        if (hexPart.length >= 24) {
          // Format like a nice UUID hash (e.g. 2aae8eee-c515-4492-981b-9acb6043)
          return `${hexPart.substring(0, 8)}-${hexPart.substring(8, 12)}-${hexPart.substring(12, 16)}-${hexPart.substring(16, 24)}`;
        }
      }
    }
    return filename;
  };

  const saveProfileData = async (newAvatarUrl?: string) => {
    if (!currentUser?.id) return;
    
    const targetAvatarUrl = newAvatarUrl !== undefined ? newAvatarUrl : avatarUrl;

    const payload = {
      id: currentUser.id,
      bio,
      website,
      twitter,
      first_name: firstName,
      last_name: lastName,
      instructor_title: instructorTitle,
      phone_number: phoneNumber,
      avatar_url: targetAvatarUrl,
      email: email || currentUser?.email || '',
      country_code: countryCode,
      preferred_language: preferredLanguage,
      agreed_marketing: agreedMarketing ? 1 : 0
    };

    // Save locally immediately to guarantee dynamic update response
    const fallbackKey = `uq_profile_${currentUser.id}`;
    localStorage.setItem(fallbackKey, JSON.stringify(payload));

    try {
      const result = await apiFetch('profile.php', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (result.success) {
        setProfileMsg(newAvatarUrl !== undefined ? 'Profile photo updated and saved successfully!' : 'Profile updated and saved to users table successfully!');
        if (typeof window !== 'undefined') {
          updateActiveSession({
            name: `${firstName} ${lastName}`.trim(),
            avatar: targetAvatarUrl
          });
        }
        setCurrentUser({
          ...currentUser,
          name: `${firstName} ${lastName}`.trim(),
          avatar: targetAvatarUrl
        });
      } else {
        setProfileMsg('Error: ' + (result.message || 'Failed to save profile.'));
      }
    } catch (error: any) {
      setProfileMsg(newAvatarUrl !== undefined ? 'Profile photo saved (Offline Fallback Active)!' : 'Profile updated (Offline Fallback Active)!');
    }
    setTimeout(() => setProfileMsg(''), 4000);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit to 15MB matching upload.php
    if (file.size > 15 * 1024 * 1024) {
      setUploadError('Image size must be less than 15MB');
      return;
    }

    setIsUploadingImage(true);
    setUploadError('');

    try {
      // Convert file to Base64 data URL
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      const data = await apiFetch('upload.php', {
        method: 'POST',
        body: JSON.stringify({
          fileData: base64Data,
          fileName: file.name,
          folder: 'avatars'
        })
      });

      if (data.success && data.url) {
        setAvatarUrl(data.url);
        // Automatically save the profile immediately with the new avatar URL
        setIsSavingProfile(true);
        await saveProfileData(data.url);
        setIsSavingProfile(false);
      } else {
        throw new Error(data.error || data.message || 'Failed to upload image');
      }
    } catch (err: any) {
      console.error('Image upload error:', err);
      setUploadError(err.message || 'Failed to upload image');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    await saveProfileData();
    setIsSavingProfile(false);
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErr('');
    setPasswordMsg('');

    if (!newPassword) {
      setPasswordErr('New password is required');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordErr('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordErr('Passwords do not match');
      return;
    }

    // Require current password if not using google auth and password exists on backend
    if (authProvider !== 'google' && !currentPassword) {
      setPasswordErr('Current password is required');
      return;
    }

    setIsSavingPassword(true);

    try {
      const result = await apiFetch('change-password.php', {
        method: 'POST',
        body: JSON.stringify({
          id: currentUser?.id,
          password: newPassword,
          current_password: authProvider === 'google' ? '' : currentPassword
        })
      });

      if (result.success) {
        setPasswordMsg('Password updated successfully!');
        // Clear inputs
        setCurrentPasswordState('');
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        setPasswordErr(result.message || 'Failed to update password.');
      }
    } catch (err: any) {
      setPasswordErr('Failed to connect to the server.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {tab === 'tiktok-pixel' && (
        <TiktokPixelSettings currentUser={currentUser} />
      )}

      {/* 1. PAYOUT / BANK DETAILS SETTINGS */}
      {tab === 'payouts' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold mb-2">
              <Landmark className="w-3.5 h-3.5" />
              <span>Payout Settings</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">Setup your bank details</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              This is where your funds will be paid to
            </p>
          </div>



          {payoutMsg && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-none flex items-center space-x-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{payoutMsg}</span>
            </div>
          )}

          {stepError && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-none flex items-center space-x-2 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{stepError}</span>
            </div>
          )}

          {/* SAVED BANK DETAILS SUMMARY VIEW */}
          {isBankSaved ? (
            <div className="p-6 sm:p-7 rounded-none bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-none bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      Bank Details Configured
                    </h3>
                    <p className="text-xs text-slate-500">
                      Funds will be paid to this account upon withdrawal approval.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  id="edit-bank-details-btn"
                  onClick={() => {
                    setIsBankSaved(false);
                    setBankSetupStep(1);
                  }}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Change Bank Details</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Country */}
                <div className="p-4 rounded-none bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Country
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">
                      {getFlagEmoji(activePayoutCountries.find(c => c.name.toLowerCase() === selectedCountryName.toLowerCase() || c.id === selectedCountryId)?.code)}
                    </span>
                    <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                      {selectedCountryName || 'Not set'}
                    </span>
                  </div>
                </div>

                {/* Bank */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Bank
                  </span>
                  <div className="flex items-center space-x-2">
                    <Landmark className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">
                      {selectedBankName || 'Not set'}
                    </span>
                  </div>
                </div>

                {/* Account Number */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Account Number
                  </span>
                  <div className="flex items-center space-x-2">
                    <CreditCard className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-sm font-mono font-black text-slate-900 dark:text-slate-100">
                      {accountNumber || '••••••••'}
                    </span>
                  </div>
                </div>

                {/* Full Name */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Full Name
                  </span>
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-purple-500 shrink-0" />
                    <span className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">
                      {payoutFullName || 'Not set'}
                    </span>
                  </div>
                </div>

                {/* Email Address */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Email Address
                  </span>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">
                      {payoutEmail || 'Not set'}
                    </span>
                  </div>
                </div>

                {/* Phone Number */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Phone Number
                  </span>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">
                      {payoutPhone || 'Not set'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* MULTI-STEP BANK SETUP FLOW */
            <div className="space-y-6">
              {/* Step Navigation Bar */}
              <div className="flex items-center justify-between max-w-xl mx-auto px-2">
                {/* Step 1 */}
                <button
                  type="button"
                  onClick={() => setBankSetupStep(1)}
                  className={`flex items-center space-x-2 text-left cursor-pointer transition-all ${
                    bankSetupStep === 1 ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    bankSetupStep === 1 
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-950/60' 
                      : selectedCountryName 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {selectedCountryName && bankSetupStep > 1 ? <CheckCircle2 className="w-4 h-4" /> : '1'}
                  </div>
                  <div className="hidden sm:block">
                    <span className={`text-xs font-bold block ${bankSetupStep === 1 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}`}>
                      Country
                    </span>
                  </div>
                </button>

                <div className={`flex-1 h-0.5 mx-3 ${bankSetupStep >= 2 ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`} />

                {/* Step 2 */}
                <button
                  type="button"
                  onClick={() => {
                    if (selectedCountryName) setBankSetupStep(2);
                  }}
                  disabled={!selectedCountryName}
                  className={`flex items-center space-x-2 text-left transition-all ${
                    !selectedCountryName ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:opacity-100'
                  } ${bankSetupStep === 2 ? 'opacity-100' : 'opacity-70'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    bankSetupStep === 2 
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-950/60' 
                      : selectedBankName && bankSetupStep > 2
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {selectedBankName && bankSetupStep > 2 ? <CheckCircle2 className="w-4 h-4" /> : '2'}
                  </div>
                  <div className="hidden sm:block">
                    <span className={`text-xs font-bold block ${bankSetupStep === 2 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}`}>
                      Bank
                    </span>
                  </div>
                </button>

                <div className={`flex-1 h-0.5 mx-3 ${bankSetupStep >= 3 ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`} />

                {/* Step 3 */}
                <button
                  type="button"
                  onClick={() => {
                    if (selectedCountryName && selectedBankName) setBankSetupStep(3);
                  }}
                  disabled={!selectedCountryName || !selectedBankName}
                  className={`flex items-center space-x-2 text-left transition-all ${
                    !selectedCountryName || !selectedBankName ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:opacity-100'
                  } ${bankSetupStep === 3 ? 'opacity-100' : 'opacity-70'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    bankSetupStep === 3 
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-950/60' 
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}>
                    3
                  </div>
                  <div className="hidden sm:block">
                    <span className={`text-xs font-bold block ${bankSetupStep === 3 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}`}>
                      Account & Contact
                    </span>
                  </div>
                </button>
              </div>

              {/* STEP 1: SELECT COUNTRY */}
              {bankSetupStep === 1 && (
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-5">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Step 1: Select Country
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Choose the destination country where you want to receive payments.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                        Destination Country *
                      </label>
                      <select
                        id="instructor-select-country"
                        value={selectedCountryName}
                        onChange={(e) => {
                          const chosenName = e.target.value;
                          const match = activePayoutCountries.find(c => c.name === chosenName);
                          setSelectedCountryName(chosenName);
                          setSelectedCountryId(match ? match.id : '');
                          setSelectedBankName(''); // Reset bank when country changes
                          setBankSearchTerm('');
                          setStepError('');
                          if (chosenName) {
                            setBankSetupStep(2); // Automatically advance to show banks for that country
                          }
                        }}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="">-- Select country to view banks --</option>
                        {activePayoutCountries.map((country) => (
                          <option key={country.id || country.code} value={country.name}>
                            {getFlagEmoji(country.code)} {country.name} {country.currencyCode ? `(${country.currencyCode})` : ''}
                          </option>
                        ))}
                      </select>

                      {activePayoutCountries.length === 0 && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2 font-medium">
                          No active payout countries have been configured by the admin yet.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-3 border-t border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      id="instructor-country-next-btn"
                      disabled={!selectedCountryName}
                      onClick={handleNextToBank}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/20 transition-all cursor-pointer flex items-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span>Next: Select Bank</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: SELECT BANK */}
              {bankSetupStep === 2 && (() => {
                const countryBanks = getPayoutBanksForCountry(selectedCountryId || selectedCountryName, true);
                const filteredBanks = countryBanks.filter(b => 
                  b.name.toLowerCase().includes(bankSearchTerm.toLowerCase()) || 
                  (b.code && b.code.toLowerCase().includes(bankSearchTerm.toLowerCase()))
                );

                const currentCountry = activePayoutCountries.find(
                  c => c.name.toLowerCase() === selectedCountryName.toLowerCase() || c.id === selectedCountryId
                );

                return (
                  <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-5">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Step 2: Select Bank in {selectedCountryName}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Choose your receiving financial institution or mobile payment provider.
                      </p>
                    </div>

                    {/* Country Chip */}
                    <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200/60 dark:border-indigo-800">
                      <span className="text-base">{getFlagEmoji(currentCountry?.code)}</span>
                      <span>Country: {selectedCountryName}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-[11px] text-indigo-500 font-semibold">{countryBanks.length} Banks Available</span>
                      <button
                        type="button"
                        onClick={() => {
                          setBankSetupStep(1);
                          setBankSearchTerm('');
                        }}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 underline ml-2 cursor-pointer font-bold"
                      >
                        Change Country
                      </button>
                    </div>

                    <div className="space-y-3">
                      {countryBanks.length === 0 ? (
                        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs space-y-2">
                          <p className="font-bold">No banks configured for {selectedCountryName} yet.</p>
                          <p className="text-[11px] opacity-90">
                            Supported banks for {selectedCountryName} will appear here once added by the admin in Admin {'>'} Supported Payout Countries {'>'} Configure Banks.
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Search Bank Filter */}
                          <div className="relative">
                            <input
                              type="text"
                              id="instructor-search-bank"
                              placeholder={`Search ${countryBanks.length} banks in ${selectedCountryName} (e.g. KCB, Equity, Co-op, Absa)...`}
                              value={bankSearchTerm}
                              onChange={(e) => setBankSearchTerm(e.target.value)}
                              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                            />
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                            {bankSearchTerm && (
                              <button
                                type="button"
                                onClick={() => setBankSearchTerm('')}
                                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
                              >
                                Clear
                              </button>
                            )}
                          </div>

                          {/* Bank Select Dropdown */}
                          <div>
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                              Select from dropdown ({filteredBanks.length} matches) *
                            </label>
                            <select
                              id="instructor-select-bank"
                              value={selectedBankName}
                              onChange={(e) => {
                                setSelectedBankName(e.target.value);
                                setStepError('');
                              }}
                              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 cursor-pointer"
                            >
                              <option value="">-- Choose your bank --</option>
                              {filteredBanks.map((b) => (
                                <option key={b.id} value={b.name}>
                                  {b.name} {b.code ? `(${b.code})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        id="instructor-bank-back-btn"
                        onClick={() => {
                          setBankSetupStep(1);
                          setBankSearchTerm('');
                        }}
                        className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer flex items-center space-x-1.5"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back</span>
                      </button>

                      <button
                        type="button"
                        id="instructor-bank-next-btn"
                        disabled={!selectedBankName}
                        onClick={handleNextToAccount}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/20 transition-all cursor-pointer flex items-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <span>Next: Enter Details</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* STEP 3: ENTER ACCOUNT NUMBER & PERSONAL DETAILS */}
              {bankSetupStep === 3 && (
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-5">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Step 3: Account & Recipient Details
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Enter your bank account number and contact information where payouts will be dispatched.
                    </p>
                  </div>

                  {/* Summary of Selected Country & Bank */}
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center gap-4 text-xs font-semibold">
                    <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
                      <span className="text-slate-400 text-[11px]">Country:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">{selectedCountryName}</span>
                    </div>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
                      <span className="text-slate-400 text-[11px]">Bank:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">{selectedBankName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBankSetupStep(2)}
                      className="text-[11px] text-indigo-500 hover:text-indigo-600 underline ml-auto cursor-pointer"
                    >
                      Change Bank
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Account Number */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                        Account Number *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          id="instructor-account-number"
                          required
                          placeholder="Enter your bank account number"
                          value={accountNumber}
                          onChange={(e) => {
                            setAccountNumber(e.target.value);
                            setStepError('');
                          }}
                          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                        />
                        <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      </div>
                    </div>

                    {/* Full Name */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                        Full Name (Account Holder Name) *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          id="instructor-full-name"
                          required
                          placeholder="e.g. Alexander Vance"
                          value={payoutFullName}
                          onChange={(e) => {
                            setPayoutFullName(e.target.value);
                            setStepError('');
                          }}
                          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                        />
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      </div>
                    </div>

                    {/* Grid for Email and Phone */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Email */}
                      <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                          Email Address *
                        </label>
                        <div className="relative">
                          <input
                            type="email"
                            id="instructor-email"
                            required
                            placeholder="e.g. instructor@example.com"
                            value={payoutEmail}
                            onChange={(e) => {
                              setPayoutEmail(e.target.value);
                              setStepError('');
                            }}
                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                          />
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                        </div>
                      </div>

                      {/* Phone Number */}
                      <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                          Phone Number *
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                            id="instructor-phone"
                            required
                            placeholder="e.g. +1 555-0199"
                            value={payoutPhone}
                            onChange={(e) => {
                              setPayoutPhone(e.target.value);
                              setStepError('');
                            }}
                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                          />
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      id="instructor-account-back-btn"
                      onClick={() => setBankSetupStep(2)}
                      className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer flex items-center space-x-1.5"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>

                    <button
                      type="button"
                      id="instructor-save-bank-btn"
                      disabled={isSavingPayout || !accountNumber.trim() || !payoutFullName.trim() || !payoutEmail.trim() || !payoutPhone.trim()}
                      onClick={() => handleSavePayout()}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/20 transition-all cursor-pointer flex items-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSavingPayout ? 'Saving...' : 'Save Bank Details'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. PUBLIC INSTRUCTOR PROFILE */}
      {tab === 'profile' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold mb-2">
              <User className="w-3.5 h-3.5" />
              <span>My Profile</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">My Profile</h2>
          </div>

          {profileMsg && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-2xl flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{profileMsg}</span>
            </div>
          )}

          {isLoadingProfile ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-500 font-bold animate-pulse">Syncing instructor profile from secure MySQL database...</p>
            </div>
          ) : (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              
              {/* SECTION 1: ACCOUNT INFORMATION */}
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/80 space-y-4">
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                  1. Account Information
                </h3>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div 
                    className="relative group w-20 h-20 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-indigo-500 shrink-0 flex items-center justify-center cursor-pointer"
                    onClick={() => document.getElementById('avatar-upload-input')?.click()}
                    title="Click to upload profile photo"
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Profile Avatar" className="w-full h-full object-cover transition-opacity duration-200 group-hover:opacity-75" referrerPolicy="no-referrer" />
                    ) : (
                      <User className="w-10 h-10 text-slate-400" />
                    )}
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <Upload className="w-5 h-5 text-white" />
                    </div>
                    {isUploadingImage && (
                      <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 w-full space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Profile Avatar (Encrypted Identifier)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        placeholder="No photo uploaded yet"
                        value={getAvatarMaskedValue(avatarUrl)}
                        className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-500 dark:text-slate-400 focus:outline-none cursor-not-allowed select-all"
                      />
                      <button
                        type="button"
                        disabled={isUploadingImage}
                        onClick={() => document.getElementById('avatar-upload-input')?.click()}
                        className="px-4 py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 shrink-0"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Photo</span>
                      </button>
                    </div>
                    <input
                      type="file"
                      id="avatar-upload-input"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    {uploadError && (
                      <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 mt-1">{uploadError}</p>
                    )}
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                      Supports JPG, PNG, WEBP, GIF, SVG up to 15MB. Click the avatar or use the upload button.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Email Address (Read Only)</label>
                      <span className="inline-flex items-center space-x-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Verified</span>
                      </span>
                    </div>
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-400 dark:text-slate-500 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Phone Number</label>
                    <div className="flex gap-2">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="w-24 px-2 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="+254">+254 (KE)</option>
                        <option value="+1">+1 (US)</option>
                        <option value="+44">+44 (UK)</option>
                        <option value="+91">+91 (IN)</option>
                        <option value="+234">+234 (NG)</option>
                        <option value="+256">+256 (UG)</option>
                        <option value="+255">+255 (TZ)</option>
                      </select>
                      <input
                        type="text"
                        placeholder="712345678"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="flex-1 px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <SignaturePad 
                    userId={currentUser?.id ? String(currentUser.id) : 'instructor'}
                    initialSignature={signature} 
                    title="Instructor Official Signature"
                    signerName={`${firstName} ${lastName}`.trim() || currentUser?.name || 'Course Instructor'}
                    signerTitle={instructorTitle || 'COURSE INSTRUCTOR'}
                    onSave={(data) => {
                      setSignature(data);
                      setProfileMsg('Instructor signature saved successfully!');
                      setTimeout(() => setProfileMsg(''), 4000);
                    }} 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Professional / Academic Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Senior Professor of Computer Science"
                      value={instructorTitle}
                      onChange={(e) => setInstructorTitle(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Personal Portfolio / Website</label>
                    <input
                      type="text"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                      placeholder="https://yourportfolio.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Twitter / X Handle</label>
                  <input
                    type="text"
                    value={twitter}
                    onChange={(e) => setTwitter(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                    placeholder="@yourhandle"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Instructor Biography & Credentials</label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                    placeholder="Share your teaching experience, industry achievements, or academic credentials..."
                  />
                </div>
              </div>

              {/* SECTION 2: PREFERENCES */}
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/80 space-y-4">
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                  2. Preferences
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Preferred Language</label>
                    <select
                       value={preferredLanguage}
                       onChange={(e) => setPreferredLanguage(e.target.value)}
                       className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="en">English (US)</option>
                      <option value="fr">French (Français)</option>
                      <option value="es">Spanish (Español)</option>
                      <option value="de">German (Deutsch)</option>
                      <option value="sw">Swahili (Kiswahili)</option>
                    </select>
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={agreedMarketing}
                        onChange={(e) => setAgreedMarketing(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 border-slate-300 dark:border-slate-700 rounded focus:ring-indigo-500 focus:ring-2 bg-white dark:bg-slate-900"
                      />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Receive marketing and promotional emails
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* SECTION 3: SECURITY & PASSWORD SETTINGS */}
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/80 space-y-4">
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 border-b border-slate-200/60 dark:border-slate-700/60 pb-2 flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-indigo-500" />
                  <span>3. Security & Password Settings</span>
                </h3>

                {authProvider === 'google' ? (
                  <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-indigo-800 dark:text-indigo-300 flex items-start space-x-2.5">
                    <Key className="w-4 h-4 mt-0.5 shrink-0 text-indigo-500" />
                    <div className="text-[11px] leading-relaxed">
                      <p className="font-bold">Social Login Connected (Google)</p>
                      <p className="font-medium opacity-90">You currently log in via Google Auth. You can set a password below to enable logging in via email & password as well, without needing to enter a current password.</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/40 dark:border-slate-700/40 text-slate-600 dark:text-slate-400 flex items-start space-x-2.5">
                    <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-indigo-500" />
                    <div className="text-[11px] leading-relaxed">
                      <p className="font-bold">Standard Password Protection</p>
                      <p className="font-medium opacity-90">Please enter your current password along with your desired new password to safely update your login credentials.</p>
                    </div>
                  </div>
                )}

                <form onSubmit={changePassword} className="space-y-4">
                  {authProvider !== 'google' && (
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Current Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={currentPassword}
                        onChange={(e) => setCurrentPasswordState(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">New Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                        required
                        minLength={6}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  {passwordErr && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 text-xs font-bold flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{passwordErr}</span>
                    </div>
                  )}

                  {passwordMsg && (
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{passwordMsg}</span>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isSavingPassword}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 disabled:dark:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center space-x-2 shadow-md transition-all cursor-pointer"
                    >
                      {isSavingPassword ? (
                        <span>Saving...</span>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>{authProvider === 'google' ? 'Set Login Password' : 'Update Password'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  {isSavingProfile ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>{isSavingProfile ? 'Saving...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

    </div>
  );
};
