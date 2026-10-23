import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  DollarSign, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Save, 
  Users, 
  CreditCard, 
  Smartphone, 
  Plus, 
  Trash2, 
  Check, 
  Clock, 
  Search,
  ExternalLink,
  ShieldCheck,
  Zap,
  TrendingUp
} from 'lucide-react';
import { 
  getCustomMailPricingApi, 
  saveCustomMailPricingApi, 
  getAllCustomMailSubscriptionsApi 
} from '../../lib/apiConfig';

export const AdminCustomMailPricingTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Pricing & Plan Configuration
  const [amountKes, setAmountKes] = useState(1500);
  const [amountUsd, setAmountUsd] = useState(12);
  const [periodDays, setPeriodDays] = useState(30);
  const [periodLabel, setPeriodLabel] = useState('Monthly (30 Days)');
  const [isActive, setIsActive] = useState(true);
  const [features, setFeatures] = useState<string[]>([
    'Automated abandoned cart recovery email sequences',
    'Custom instructor store email sender name & reply-to address',
    'Custom branding, logo banners, and stylized discount coupons',
    'Real-time email open, click, and conversion rate analytics',
    'Direct student re-engagement and coupon push notifications'
  ]);
  const [newFeatureText, setNewFeatureText] = useState('');

  // Subscriptions List
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');

  const loadData = async () => {
    setLoading(true);
    try {
      const [pricingRes, subsRes] = await Promise.all([
        getCustomMailPricingApi().catch(() => null),
        getAllCustomMailSubscriptionsApi().catch(() => null)
      ]);

      if (pricingRes && pricingRes.success && pricingRes.data) {
        setAmountKes(pricingRes.data.amountKes || 1500);
        setAmountUsd(pricingRes.data.amountUsd || 12);
        setPeriodDays(pricingRes.data.periodDays || 30);
        setPeriodLabel(pricingRes.data.periodLabel || 'Monthly (30 Days)');
        setIsActive(pricingRes.data.isActive ?? true);
        if (Array.isArray(pricingRes.data.features) && pricingRes.data.features.length > 0) {
          setFeatures(pricingRes.data.features);
        }
      }

      if (subsRes && subsRes.success && Array.isArray(subsRes.data)) {
        setSubscriptions(subsRes.data);
      }
    } catch (e: any) {
      console.warn('Error loading custom mail admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);

    try {
      const payload = {
        amountKes: Number(amountKes),
        amountUsd: Number(amountUsd),
        periodDays: Number(periodDays),
        periodLabel: periodLabel.trim() || `${periodDays} Days Plan`,
        features: features.filter(f => f.trim().length > 0),
        isActive: isActive
      };

      const res = await saveCustomMailPricingApi(payload);
      if (res && res.success) {
        setSaveMessage({ type: 'success', text: 'Custom Mail plan pricing & duration saved successfully!' });
        setTimeout(() => setSaveMessage(null), 4000);
      } else {
        setSaveMessage({ type: 'error', text: res?.message || 'Failed to update pricing settings' });
      }
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err.message || 'Error connecting to database API' });
    } finally {
      setSaving(false);
    }
  };

  const addFeature = () => {
    if (!newFeatureText.trim()) return;
    setFeatures(prev => [...prev, newFeatureText.trim()]);
    setNewFeatureText('');
  };

  const removeFeature = (index: number) => {
    setFeatures(prev => prev.filter((_, i) => i !== index));
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = 
      (sub.instructorName && sub.instructorName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (sub.instructorEmail && sub.instructorEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (sub.reference && sub.reference.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = 
      statusFilter === 'all' ? true : 
      statusFilter === 'active' ? sub.status === 'active' : 
      sub.status === 'expired';

    return matchesSearch && matchesStatus;
  });

  const totalRevenueKes = subscriptions
    .filter(s => s.status === 'active' || s.status === 'expired')
    .reduce((acc, s) => acc + (Number(s.amount) || 0), 0);

  const activeCount = subscriptions.filter(s => s.status === 'active').length;

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">
            <Mail className="w-4 h-4" />
            <span>Monetization & Add-ons</span>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-200">Custom Mail Settings</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            Custom Mail Plan, Pricing & Subscriptions
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure the amount and duration charged to instructors for custom abandoned cart emails and store messaging.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active Subscribers</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {activeCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Instructors with active Custom Mail</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Current Plan Fee</span>
            <DollarSign className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            KSh {amountKes.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Per {periodDays} Days ({periodLabel})</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Add-on Revenue</span>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            KSh {totalRevenueKes.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Generated via M-Pesa & Card</p>
        </div>
      </div>

      {/* Main Settings Form */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
        <form onSubmit={handleSavePricing} className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Instructor Plan Configuration</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Set how much instructors pay and how long access remains active.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Status:</label>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                  isActive 
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {isActive ? '✓ Plan Active' : '✕ Disabled'}
              </button>
            </div>
          </div>

          {saveMessage && (
            <div className={`p-4 rounded-2xl text-xs font-bold flex items-center space-x-2 ${
              saveMessage.type === 'success' 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200' 
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200'
            }`}>
              {saveMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{saveMessage.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Amount in KES */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                <span>Amount (KES)</span>
                <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">KSh</span>
                <input
                  type="number"
                  min="50"
                  step="10"
                  value={amountKes}
                  onChange={(e) => {
                    const kes = Number(e.target.value);
                    setAmountKes(kes);
                    setAmountUsd(Number((kes / 125).toFixed(2)));
                  }}
                  required
                  className="w-full pl-12 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  placeholder="1500"
                />
              </div>
              <p className="text-[10px] text-slate-400">Billed via M-Pesa STK Push & Card</p>
            </div>

            {/* Amount in USD */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                <span>Equivalent (USD)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">$</span>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={amountUsd}
                  onChange={(e) => setAmountUsd(Number(e.target.value))}
                  className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  placeholder="12.00"
                />
              </div>
              <p className="text-[10px] text-slate-400">International display reference</p>
            </div>

            {/* Duration (Period in Days) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                <span>Duration Period (Days)</span>
                <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="3650"
                  value={periodDays}
                  onChange={(e) => {
                    const days = Number(e.target.value);
                    setPeriodDays(days);
                    if (days === 30) setPeriodLabel('Monthly (30 Days)');
                    else if (days === 90) setPeriodLabel('Quarterly (90 Days)');
                    else if (days === 365) setPeriodLabel('Annual (365 Days)');
                    else setPeriodLabel(`${days} Days Access`);
                  }}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  placeholder="30"
                />
              </div>
              <p className="text-[10px] text-slate-400">How many days until expiration</p>
            </div>

            {/* Duration Display Label */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Display Label
              </label>
              <input
                type="text"
                value={periodLabel}
                onChange={(e) => setPeriodLabel(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                placeholder="Monthly (30 Days)"
              />
              <p className="text-[10px] text-slate-400">Shown on checkout banner</p>
            </div>
          </div>

          {/* Quick Period Presets */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-bold text-slate-400 mr-1">Presets:</span>
            {[
              { days: 30, label: 'Monthly (30 Days)' },
              { days: 60, label: 'Bi-Monthly (60 Days)' },
              { days: 90, label: 'Quarterly (90 Days)' },
              { days: 180, label: 'Semi-Annual (180 Days)' },
              { days: 365, label: 'Annual (365 Days)' }
            ].map(preset => (
              <button
                key={preset.days}
                type="button"
                onClick={() => {
                  setPeriodDays(preset.days);
                  setPeriodLabel(preset.label);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  periodDays === preset.days 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Plan Features */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Plan Features & Value Highlights
            </label>
            <div className="space-y-2">
              {features.map((feat, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  <input
                    type="text"
                    value={feat}
                    onChange={(e) => {
                      const updated = [...features];
                      updated[idx] = e.target.value;
                      setFeatures(updated);
                    }}
                    className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeFeature(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                    title="Remove feature"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <input
                type="text"
                value={newFeatureText}
                onChange={(e) => setNewFeatureText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); } }}
                placeholder="Add another feature highlight..."
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200"
              />
              <button
                type="button"
                onClick={addFeature}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Changes...' : 'Save Pricing Settings'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Instructor Subscriptions Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2">
              <Users className="w-4 h-4 text-purple-500" />
              <span>Subscribed Instructors & History ({subscriptions.length})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live audit of all instructors who purchased Custom Mail access via M-Pesa or Card.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2">
            {/* Search Box */}
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search instructor / ref..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              {(['all', 'active', 'expired'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1 rounded-lg font-bold capitalize transition-all cursor-pointer ${
                    statusFilter === f 
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredSubscriptions.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Mail className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs font-bold">No custom mail subscriptions found</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              When instructors pay to unlock custom email features, their transaction records will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">Instructor</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Payment Method</th>
                  <th className="py-3 px-3">Reference</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Days Left</th>
                  <th className="py-3 px-3">Started</th>
                  <th className="py-3 px-3">Expires At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {filteredSubscriptions.map(sub => (
                  <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 dark:text-white">{sub.instructorName || 'Instructor'}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{sub.instructorEmail}</div>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                      KSh {Number(sub.amount).toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-1.5">
                        {sub.paymentMethod === 'card' ? (
                          <>
                            <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                            <span>Card (Paystack)</span>
                          </>
                        ) : (
                          <>
                            <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                            <span>M-Pesa STK Push</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                      {sub.reference || sub.id}
                    </td>
                    <td className="py-3 px-3">
                      {sub.status === 'active' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                          Expired
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-bold">
                      {sub.status === 'active' ? (
                        <span className="text-emerald-600 dark:text-emerald-400">{sub.daysRemaining} days</span>
                      ) : (
                        <span className="text-slate-400">0 days</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-[11px]">
                      {sub.startedAt ? new Date(sub.startedAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-[11px]">
                      {sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
