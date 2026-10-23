import React, { useState, useEffect } from 'react';
import { User, CheckCircle2, AlertCircle, Loader2, Sparkles, ShieldCheck, Award } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { isGenericName, splitFullName } from '../../lib/nameValidation';
import { apiFetch } from '../../lib/apiConfig';

interface UpdateNameModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  forceShow?: boolean;
}

export const UpdateNameModal: React.FC<UpdateNameModalProps> = ({ isOpen: propIsOpen, onClose, forceShow = false }) => {
  const { currentUser, updateUserProfile } = useApp();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [dismissed, setDismissed] = useState(false);

  // Determine if the modal should be visible
  const needsNameUpdate = currentUser ? isGenericName(currentUser.name, currentUser.email) : false;
  const isVisible = forceShow || (propIsOpen ?? (needsNameUpdate && !dismissed));

  // Auto-populate initial names when modal opens or user changes
  useEffect(() => {
    if (currentUser) {
      const { firstName: fName, lastName: lName } = splitFullName(currentUser.name);
      setFirstName(fName);
      setLastName(lName);
      setDismissed(false);
    }
  }, [currentUser?.id, currentUser?.name]);

  if (!isVisible || !currentUser) {
    return null;
  }

  const cleanFirstName = firstName.trim();
  const cleanLastName = lastName.trim();
  const fullNamePreview = cleanFirstName && cleanLastName ? `${cleanFirstName} ${cleanLastName}` : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!cleanFirstName || cleanFirstName.length < 2) {
      setErrorMsg('Please enter a valid First Name (minimum 2 characters).');
      return;
    }

    if (!cleanLastName || cleanLastName.length < 2) {
      setErrorMsg('Please enter a valid Last Name (minimum 2 characters).');
      return;
    }

    // Check that neither input is a generic placeholder word like "user" or "educator"
    const genericWords = ['user', 'educator', 'student', 'learner', 'instructor', 'admin', 'guest', 'null', 'undefined'];
    if (genericWords.includes(cleanFirstName.toLowerCase()) || genericWords.includes(cleanLastName.toLowerCase())) {
      setErrorMsg('Generic terms like "User" or "Educator" cannot be used. Please enter your real First and Last Name.');
      return;
    }

    const finalName = `${cleanFirstName} ${cleanLastName}`;

    setLoading(true);

    try {
      // 1. Update local AppContext state & localStorage
      if (updateUserProfile) {
        await updateUserProfile({ name: finalName });
      }

      // 2. Sync to backend PHP server
      await apiFetch('users.php', {
        method: 'POST',
        body: JSON.stringify({
          action: 'update_profile',
          id: currentUser.id,
          email: currentUser.email,
          name: finalName,
          firstName: cleanFirstName,
          lastName: cleanLastName,
          role: currentUser.role
        }),
        silent: true
      }).catch((err) => {
        console.warn('Backend profile update sync warning:', err);
      });

      setSuccessMsg('Your name has been updated successfully!');
      
      setTimeout(() => {
        setSuccessMsg('');
        if (onClose) onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Failed to update user name:', err);
      setErrorMsg(err.message || 'Failed to save your name. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-900 dark:text-slate-100 transition-all transform scale-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-name-title"
      >
        {/* Top Decorative Gradient Accent */}
        <div className="h-2 w-full bg-gradient-to-r from-teal-500 via-indigo-500 to-purple-500" />

        <div className="p-6 sm:p-8 space-y-6">
          
          {/* Header Icon & Title */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800/80 shadow-inner">
              <Sparkles className="w-7 h-7 animate-pulse" />
            </div>

            <div className="space-y-1">
              <h2 id="update-name-title" className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                Update Your Full Name
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto font-medium">
                Please enter your real First and Last Name to ensure your official course certificates, invoices, and profile accurately reflect your identity.
              </p>
            </div>
          </div>

          {/* Success Banner */}
          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center space-x-2 animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center space-x-2 animate-shake">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* First Name Input */}
              <div className="space-y-1.5">
                <label htmlFor="first-name-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  First Name <span className="text-teal-600 dark:text-teal-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    id="first-name-input"
                    type="text"
                    required
                    placeholder="e.g. Michael"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 font-medium transition-all"
                  />
                </div>
              </div>

              {/* Last Name Input */}
              <div className="space-y-1.5">
                <label htmlFor="last-name-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Last Name <span className="text-teal-600 dark:text-teal-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    id="last-name-input"
                    type="text"
                    required
                    placeholder="e.g. Omare"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 font-medium transition-all"
                  />
                </div>
              </div>

            </div>

            {/* Certificate Name Preview Badge */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex items-center space-x-3 text-xs">
              <Award className="w-5 h-5 text-indigo-500 shrink-0" />
              <div className="space-y-0.5 min-w-0">
                <p className="font-semibold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">
                  Certificate Name Preview
                </p>
                <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
                  {fullNamePreview ? fullNamePreview : <span className="italic text-slate-400 font-normal">Enter First & Last Name above...</span>}
                </p>
              </div>
            </div>

            {/* Account Email Info */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1 pt-1">
              <div className="flex items-center space-x-1.5 truncate">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="truncate">Connected: <strong className="text-slate-700 dark:text-slate-300">{currentUser.email}</strong></span>
              </div>
            </div>

            {/* Submit Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !cleanFirstName || !cleanLastName}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-teal-600 via-indigo-600 to-purple-600 hover:from-teal-500 hover:via-indigo-500 hover:to-purple-500 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Saving Profile Name...</span>
                  </>
                ) : (
                  <>
                    <span>Save Full Name & Continue</span>
                  </>
                )}
              </button>
            </div>

          </form>

        </div>
      </div>
    </div>
  );
};
