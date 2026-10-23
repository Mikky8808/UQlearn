import React, { useState } from 'react';
import { 
  X, 
  Check 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SocialShare } from './SocialShare';
import { ROOT_URL } from '../../lib/apiConfig';
import { generate16BitCodeFromEmail } from '../../lib/referralCode';

interface InviteFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  customReferralCode?: string;
  customTitle?: string;
}

export const InviteFriendModal: React.FC<InviteFriendModalProps> = ({
  isOpen,
  onClose,
  customReferralCode,
  customTitle,
}) => {
  const { currentUser } = useApp();
  const [activeNotice, setActiveNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  // Generate unique referral code from user's email address
  const userEmail = currentUser?.email || 'instructor@uqlearn.org';
  const referralCode = customReferralCode || currentUser?.referralCode || generate16BitCodeFromEmail(userEmail);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ROOT_URL;
  const shareUrl = `${baseUrl}/?ref=${referralCode}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-150">
      <div 
        className="bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden relative transition-all duration-150 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Crisp White with Sharp Edges, No Gradients */}
        <div className="bg-white dark:bg-slate-900 px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {customTitle || 'Invite Friends to UQlearn'}
          </h2>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-none transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 space-y-6 bg-white dark:bg-slate-900">
          
          {/* Status Toast Notice */}
          {activeNotice && (
            <div className="p-3 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 rounded-none text-teal-800 dark:text-teal-200 text-xs font-bold flex items-center space-x-2">
              <Check className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
              <span>{activeNotice}</span>
            </div>
          )}

          {/* SocialShare Component with Facebook, Gmail, WhatsApp, Instagram */}
          <SocialShare
            shareUrl={shareUrl}
            referralCode={referralCode}
            shareTitle="Join me on UQlearn!"
            shareText="Join me on UQlearn to create, teach, or learn online courses!"
            onCopySuccess={(msg) => setActiveNotice(msg)}
          />

        </div>

        {/* Modal Footer Note */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs rounded-none hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
