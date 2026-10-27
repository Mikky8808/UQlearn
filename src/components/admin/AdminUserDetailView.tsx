import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Wallet, 
  Building2, 
  UserCheck, 
  UserX, 
  Trash2, 
  ShieldCheck, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Save,
  RefreshCw,
  CreditCard,
  PenTool,
  Award
} from 'lucide-react';
import { deleteUserApi, API_BASE_URL, apiFetch } from '../../lib/apiConfig';
import { instructorService } from '../../services/instructor-service';
import { instructorSignatureService } from '../../services/instructor-signature-service';
import { useApp } from '../../context/AppContext';
import { SignaturePad } from '../common/SignaturePad';

interface AdminUserDetailViewProps {
  userId: string;
  onBack: () => void;
  onUserUpdated?: () => void;
  initialSubTab?: 'payout' | 'history' | 'security' | 'signature';
}

export const AdminUserDetailView: React.FC<AdminUserDetailViewProps> = ({ userId, onBack, onUserUpdated, initialSubTab = 'payout' }) => {
  const { usersList, payoutCountries, getPayoutBanksForCountry } = useApp() as any;
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [payoutDetails, setPayoutDetails] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'payout' | 'history' | 'security' | 'signature'>(initialSubTab);
  const [userSignature, setUserSignature] = useState('');

  // Editable payout form state
  const [selectedCountryId, setSelectedCountryId] = useState('');
  const [selectedCountryName, setSelectedCountryName] = useState('');
  const [selectedBankName, setSelectedBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    loadUserData();
  }, [userId]);

  const loadUserData = async () => {
    setLoading(true);
    try {
      // Find in usersList or fetch
      const found = (usersList || []).find((u: any) => u.id === userId);
      if (found) {
        setUser(found);
        setFullName(found.name || '');
        setEmail(found.email || '');
      } else {
        // Fallback fetch
        const json = await apiFetch(`users.php?id=${encodeURIComponent(userId)}`);
        if (json && json.data) {
          setUser(json.data);
          setFullName(json.data.name || `${json.data.first_name || ''} ${json.data.last_name || ''}`.trim());
          setEmail(json.data.email || '');
        }
      }

      // Load payout details from database
      const payout = await instructorService.getPayoutDetails(userId);
      if (payout) {
        setPayoutDetails(payout);
        setSelectedCountryId(payout.countryId || '');
        setSelectedCountryName(payout.country || '');
        setSelectedBankName(payout.bankName || '');
        setAccountNumber(payout.accountNumber || '');
        if (payout.fullName || payout.accountHolderName) setFullName(payout.fullName || payout.accountHolderName);
        if (payout.email) setEmail(payout.email);
        if (payout.phone || payout.phoneNumber) setPhone(payout.phone || payout.phoneNumber);
      }

      // Load instructor signature from profile
      const sigRes = await instructorSignatureService.getInstructorSignature(userId);
      if (sigRes && sigRes.success && sigRes.signatureData) {
        setUserSignature(sigRes.signatureData);
      }
    } catch (e) {
      console.warn('Error loading user detail', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage('');
    try {
      const payload = {
        countryId: selectedCountryId,
        country: selectedCountryName,
        bankName: selectedBankName,
        accountNumber: accountNumber.trim(),
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim()
      };
      const res = await instructorService.savePayoutDetails({ userId, ...payload });
      if (res && res.success) {
        setPayoutDetails({ userId, ...payload });
        setMessage('Payout and bank details saved successfully to database!');
        if (onUserUpdated) onUserUpdated();
      } else {
        setMessage('Failed to save payout details.');
      }
    } catch (err) {
      setMessage('Error saving payout details.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!window.confirm(`Are you sure you want to delete user ${user?.name || userId} and remove their payout details? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await deleteUserApi(userId);
      if (res && res.success) {
        alert('User and payout details successfully deleted.');
        if (onUserUpdated) onUserUpdated();
        onBack();
      } else {
        alert('Failed to delete user.');
      }
    } catch (e) {
      alert('Error deleting user.');
    }
  };

  const activeCountries = (payoutCountries || []).filter((c: any) => c.isActive !== false);
  const currentCountryObj = activeCountries.find((c: any) => c.id === selectedCountryId || c.name === selectedCountryName);
  const availableBanks = currentCountryObj ? (getPayoutBanksForCountry ? getPayoutBanksForCountry(currentCountryObj.id) : (currentCountryObj.banks || [])) : [];

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-rose-600 mx-auto" />
        <p className="text-xs font-bold text-slate-500">Loading user profile & payout financials...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
        <h3 className="text-base font-black text-slate-900 dark:text-slate-100">User Not Found</h3>
        <p className="text-xs text-slate-500">The requested user account could not be found or has been deleted.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl cursor-pointer"
        >
          Return to User Directory
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="Back to User Directory"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-2xl font-black flex items-center justify-center text-base text-white shadow-md ${
              user.role === 'admin' ? 'bg-rose-600' :
              user.role === 'instructor' ? 'bg-indigo-600' :
              'bg-teal-600'
            }`}>
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover rounded-2xl" />
              ) : (
                (user.name || user.email || 'U').charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">{user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User Account'}</h2>
                <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider ${
                  user.role === 'admin' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' :
                  user.role === 'instructor' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' :
                  'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300'
                }`}>
                  {user.role}
                </span>
              </div>
              <p className="text-xs text-slate-500">{user.email} • ID: {user.id}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span className={`px-3 py-1.5 text-xs font-bold rounded-xl ${
            user.status === 'Suspended' ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' :
            'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
          }`}>
            Status: {user.status || 'Active'}
          </span>

          <button
            onClick={handleDeleteUser}
            className="px-4 py-2 bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-300 text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5 border border-red-200 dark:border-red-800 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete User & Payouts</span>
          </button>
        </div>
      </div>

      {/* Sub Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
        {[
          { key: 'payout', label: 'Payout & Bank Details', icon: Wallet },
          { key: 'history', label: 'Payment & Earnings History', icon: DollarSign },
          { key: 'security', label: 'Account Profile & Security', icon: ShieldCheck },
          { key: 'signature', label: 'Official Signature Pad', icon: PenTool }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveSubTab(tab.key as any)}
              className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center space-x-2 cursor-pointer ${
                isActive
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: PAYOUT & BANK DETAILS */}
      {activeSubTab === 'payout' && (
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
          {payoutDetails && payoutDetails.bankName ? (
            <div className="space-y-6">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                    <Building2 className="w-5 h-5 text-indigo-500" />
                    <span>User Bank & Payout Destination</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    These details are configured for this user.
                  </p>
                </div>
                
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Bank / Provider:</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{payoutDetails.bankName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Account Number:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{payoutDetails.accountNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Account Name:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{payoutDetails.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Country:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{payoutDetails.country || 'Not specified'}</span>
                  </div>
                </div>
            </div>
          ) : (
            <div className="text-center py-8 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
                <AlertCircle className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No Configured User Bank</p>
              <p className="text-[11px] text-slate-500">This user has not configured their payout destination details.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PAYMENT & EARNINGS HISTORY */}
      {activeSubTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-rose-500" />
                <span>Payment & Payout Disbursement History</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                View all past earnings, settlement receipts, and pending payout transfers for {user.name}.
              </p>
            </div>
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300">
              Total Disbursed: $0.00
            </div>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3 bg-slate-50 dark:bg-slate-800/40">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-200 dark:border-indigo-800">
              <DollarSign className="w-6 h-6" />
            </div>
            <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">No Payout Transactions Yet</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              When student enrollments generate instructor earnings or payouts are processed for this user, transaction receipts and audit logs will appear here.
            </p>
          </div>
        </div>
      )}

      {/* TAB 3: ACCOUNT PROFILE & SECURITY */}
      {activeSubTab === 'security' && (
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6 shadow-xs">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-slate-100">Account Security & Role Management</h3>
            <p className="text-xs text-slate-500 mt-1">Manage role permissions and account status for {user.name}.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <span className="text-xs font-bold text-slate-500">Account ID</span>
              <p className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">{user.id}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <span className="text-xs font-bold text-slate-500">Registered Email</span>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{user.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: OFFICIAL SIGNATURE PAD */}
      {activeSubTab === 'signature' && (
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6 shadow-xs">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <Award className="w-5 h-5 text-indigo-500" />
              <span>Official Digital Signature: {user.name}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Draw and save digital signature. Stored directly in the database and automatically linked to course certification.
            </p>
          </div>

          <SignaturePad
            userId={user.id}
            initialSignature={userSignature}
            signerName={user.name || fullName}
            signerTitle={user.role === 'admin' ? 'Administrator' : 'Course Instructor'}
            title={`Signature Pad for ${user.name}`}
            onSave={async (data) => {
              setUserSignature(data);
              try {
                await instructorService.updateProfile(user.id, {
                  signature: data
                });
              } catch (e) {}
              setMessage('Digital signature saved successfully!');
              if (onUserUpdated) onUserUpdated();
            }}
          />
        </div>
      )}
    </div>
  );
};
