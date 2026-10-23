import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Sparkles, 
  Megaphone, 
  Award, 
  Crown, 
  Check, 
  Plus, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  Save, 
  Eye, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  X,
  BadgeCheck,
  Zap,
  Globe,
  ArrowRight,
  TrendingUp,
  Tag,
  Users,
  Star
} from 'lucide-react';
import { 
  PromotionTierConfig, 
  DEFAULT_PROMOTION_TIERS, 
  getPromotionTiersApi, 
  savePromotionTiersApi, 
  resetPromotionTiersApi,
  EnrollmentProofPricingConfig,
  getStoredEnrollmentPricing,
  getEnrollmentPricingApi,
  saveEnrollmentPricingApi,
  apiFetch,
  API_ENDPOINTS
} from '../../lib/apiConfig';
import { SponsoredLabel } from '../common/SponsoredLabel';

export const AdminPromotionManagementTab: React.FC = () => {
  const [tiers, setTiers] = useState<PromotionTierConfig[]>(DEFAULT_PROMOTION_TIERS);
  const [enrollmentPricing, setEnrollmentPricing] = useState<EnrollmentProofPricingConfig>(getStoredEnrollmentPricing);
  const [savingEnrollment, setSavingEnrollment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSaveEnrollmentPricing = async () => {
    setSavingEnrollment(true);
    const res = await saveEnrollmentPricingApi(enrollmentPricing);
    setSavingEnrollment(false);
    if (res.success) {
      setSuccessMsg(res.message);
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setErrorMsg(res.message);
      setTimeout(() => setErrorMsg(null), 3000);
    }
  };

  // Currency preview rate (Default 130 KES per USD)
  const [previewExchangeRate, setPreviewExchangeRate] = useState<number>(130);
  const [previewCurrencyCode, setPreviewCurrencyCode] = useState<string>('KSh');

  // Modal edit state
  const [editingTier, setEditingTier] = useState<PromotionTierConfig | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newBulletText, setNewBulletText] = useState('');

  // Quick inline price edit
  const [quickEditId, setQuickEditId] = useState<string | null>(null);
  const [quickEditPrice, setQuickEditPrice] = useState<string>('');

  interface PromotionSubscriber {
    id: string;
    instructorName: string;
    instructorEmail: string;
    courseTitle: string;
    badgeTypes: string[];
    dailyBudget: number;
    totalBudget: number;
    startDate: string;
    endDate: string;
    status: 'active' | 'completed' | 'pending';
    paymentMethod: string;
  }

  // Fetch promotion tiers on mount
  useEffect(() => {
    loadTiers();
    loadEnrollmentPricing();
  }, []);

  const loadEnrollmentPricing = async () => {
    try {
      const data = await getEnrollmentPricingApi();
      if (data && data.id) {
        setEnrollmentPricing(data);
      }
    } catch (e) {
      console.warn('Failed to load dynamic enrollment pricing from API', e);
    }
  };

  const loadTiers = async () => {
    setLoading(true);
    try {
      const data = await getPromotionTiersApi(true);
      if (data && data.length > 0) {
        setTiers(data);
      }
    } catch (e) {
      console.warn('Failed to load promotion tiers', e);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setSuccessMsg(null);
    } else {
      setSuccessMsg(msg);
      setErrorMsg(null);
    }
    setTimeout(() => {
      setSuccessMsg(null);
      setErrorMsg(null);
    }, 4500);
  };

  // Save all tiers to backend & cache
  const handleSaveAll = async (updatedTiers = tiers) => {
    setSaving(true);
    try {
      const res = await savePromotionTiersApi(updatedTiers);
      setTiers(updatedTiers);
      showNotification(res.message || 'Promotion tiers saved successfully!');
    } catch (e: any) {
      showNotification('Failed to save promotion tiers. Please retry.', true);
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults
  const handleResetDefaults = async () => {
    if (!window.confirm('Reset all promotion tiers, pricing rates, and marketing bullets to system defaults?')) {
      return;
    }
    setSaving(true);
    try {
      const res = await resetPromotionTiersApi();
      setTiers(res);
      showNotification('Promotion tiers reset to system defaults!');
    } catch (e) {
      showNotification('Failed to reset tiers.', true);
    } finally {
      setSaving(false);
    }
  };

  // Toggle active status of a tier
  const handleToggleActive = (id: string) => {
    const updated = tiers.map(t => t.id === id ? { ...t, isActive: !t.isActive } : t);
    setTiers(updated);
    handleSaveAll(updated);
  };

  // Open edit modal for tier
  const handleOpenEdit = (tier: PromotionTierConfig) => {
    setEditingTier({ ...tier, features: [...tier.features] });
    setNewBulletText('');
    setIsEditModalOpen(true);
  };

  // Save changes from modal
  const handleSaveModal = () => {
    if (!editingTier) return;
    if (!editingTier.name.trim()) {
      alert('Please enter a tier name.');
      return;
    }
    if (editingTier.dailyRateUsd <= 0) {
      alert('Daily rate must be greater than 0.');
      return;
    }

    const updated = tiers.map(t => t.id === editingTier.id ? editingTier : t);
    setTiers(updated);
    setIsEditModalOpen(false);
    setEditingTier(null);
    handleSaveAll(updated);
  };

  // Add bullet to editing tier
  const handleAddBullet = () => {
    if (!editingTier || !newBulletText.trim()) return;
    setEditingTier({
      ...editingTier,
      features: [...editingTier.features, newBulletText.trim()]
    });
    setNewBulletText('');
  };

  // Remove bullet from editing tier
  const handleRemoveBullet = (index: number) => {
    if (!editingTier) return;
    setEditingTier({
      ...editingTier,
      features: editingTier.features.filter((_, i) => i !== index)
    });
  };

  // Quick price save
  const handleSaveQuickPrice = (id: string) => {
    const num = parseFloat(quickEditPrice);
    if (isNaN(num) || num <= 0) {
      alert('Please enter a valid price.');
      return;
    }
    const updated = tiers.map(t => t.id === id ? { ...t, dailyRateUsd: num } : t);
    setTiers(updated);
    setQuickEditId(null);
    handleSaveAll(updated);
  };

  // Format currency helper for USD and KSh
  const formatMoney = (usd: number) => {
    return `$${usd.toFixed(2)}`;
  };

  const formatKsh = (usd: number) => {
    const ksh = Math.round(usd * previewExchangeRate);
    return `${previewCurrencyCode}${ksh.toLocaleString()}`;
  };

  const renderBadgePreview = (badgeType: string) => {
    if (badgeType === 'sponsored') {
      return <SponsoredLabel size="xs" />;
    }
    if (badgeType === 'bestseller') {
      return (
        <span className="px-2 py-0.5 bg-amber-500 text-white font-bold text-[9px] rounded-xs uppercase tracking-wider shadow-xs">
          Best Seller
        </span>
      );
    }
    if (badgeType === 'triple-bundle') {
      return (
        <span className="px-2 py-0.5 bg-gradient-to-r from-amber-500 via-indigo-600 to-purple-600 text-white font-bold text-[9px] rounded-xs uppercase tracking-wider flex items-center gap-1 shadow-xs">
          <Sparkles className="w-3 h-3" /> Triple Bundle
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 bg-purple-600 text-white font-bold text-[9px] rounded-xs uppercase tracking-wider flex items-center gap-1 shadow-xs">
        <BadgeCheck className="w-3 h-3" /> Premium
      </span>
    );
  };

  return (
    <div className="space-y-6 text-left animate-fadeIn pb-12">
      {/* Notifications */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {isEditModalOpen && editingTier ? (
        /* Edit Page View */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xs p-6 sm:p-8 shadow-xs space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                  Edit Promotion Tier: {editingTier.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Adjust pricing, marketing copy, and bullet points.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Back to Tiers
            </button>
          </div>

          <div className="space-y-4 max-w-2xl">
            {/* Tier Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Tier Card Title
              </label>
              <input
                type="text"
                value={editingTier.name}
                onChange={(e) => setEditingTier({ ...editingTier, name: e.target.value })}
                placeholder="e.g. Sponsored Placement"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Daily Rate (USD) with KSh conversion */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Daily Rate (USD $)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.25"
                    min="0.5"
                    value={editingTier.dailyRateUsd}
                    onChange={(e) => setEditingTier({ ...editingTier, dailyRateUsd: Math.max(0.1, Number(e.target.value)) })}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Equivalent in KSh (at {previewExchangeRate} KES/$)
                </label>
                <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black text-indigo-600 dark:text-indigo-400">
                  ≈ {formatKsh(editingTier.dailyRateUsd)} / day
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Card Marketing Subtitle / Description
              </label>
              <textarea
                rows={2}
                value={editingTier.description}
                onChange={(e) => setEditingTier({ ...editingTier, description: e.target.value })}
                placeholder="Describe the placement and impact for instructors..."
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* CTA Button Text */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 dark:text-slate-100">
                CTA Action Button Text
              </label>
              <input
                type="text"
                value={editingTier.ctaText}
                onChange={(e) => setEditingTier({ ...editingTier, ctaText: e.target.value })}
                placeholder="e.g. Boost as Sponsored"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Marketing Bullet Points */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                <span>Marketing Features (Checklist Bullets)</span>
                <span className="text-[10px] text-slate-400 font-normal">Shown with green checkmarks on card</span>
              </label>

              <div className="space-y-2">
                {editingTier.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <input
                      type="text"
                      value={feat}
                      onChange={(e) => {
                        const updated = [...editingTier.features];
                        updated[idx] = e.target.value;
                        setEditingTier({ ...editingTier, features: updated });
                      }}
                      className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveBullet(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                      title="Remove bullet"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add new bullet */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="text"
                  value={newBulletText}
                  onChange={(e) => setNewBulletText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddBullet();
                    }
                  }}
                  placeholder="Type new benefit & press Enter or Add..."
                  className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddBullet}
                  className="px-3.5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-3 max-w-2xl">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-slate-500 hover:text-slate-700 font-bold text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveModal}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center space-x-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Tier Changes</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 3-Month Student Enrollment Social Proof Pricing Configuration Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xs p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                  <Users className="w-5 h-5 text-amber-500" />
                  <span>Student Enrollment & Rating Growth Package Pricing</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Configure package pricing tiers for student enrollments and star rating growth.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveEnrollmentPricing}
                disabled={savingEnrollment}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center space-x-1.5 shrink-0"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingEnrollment ? 'Saving...' : 'Save Enrollment Pricing'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900 dark:text-slate-100">Students Step Unit (e.g. 100)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="50"
                    min="10"
                    value={enrollmentPricing.studentStepUnit || 100}
                    onChange={(e) => setEnrollmentPricing({ ...enrollmentPricing, studentStepUnit: Math.max(10, Number(e.target.value)) })}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <p className="text-[10px] text-slate-400">Step increment for seek bar</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900 dark:text-slate-100">Price per Unit (USD $)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={enrollmentPricing.pricePerUnitUsd || 0.15}
                    onChange={(e) => setEnrollmentPricing({ ...enrollmentPricing, pricePerUnitUsd: Math.max(0.01, Number(e.target.value)) })}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <p className="text-[10px] text-slate-400">e.g. $0.15 for every 100 students</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1">
                  <span>Star Rating Included</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-amber-500">★</span>
                  <input
                    type="number"
                    step="0.05"
                    min="1.0"
                    max="5.0"
                    value={enrollmentPricing.defaultRating || 4.90}
                    onChange={(e) => setEnrollmentPricing({ ...enrollmentPricing, defaultRating: Math.min(5.0, Math.max(1.0, Number(e.target.value))) })}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <p className="text-[10px] text-slate-400">Default rating for social proof boost</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900 dark:text-slate-100">Duration Period</label>
                <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white">
                  3 Months (90 Days)
                </div>
                <p className="text-[10px] text-slate-400">Fixed duration for social proof</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900 dark:text-slate-100">Max Seek Bar Limit</label>
                <input
                  type="number"
                  step="500"
                  min="500"
                  value={enrollmentPricing.maxStudents || 10000}
                  onChange={(e) => setEnrollmentPricing({ ...enrollmentPricing, maxStudents: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                />
                <p className="text-[10px] text-slate-400">Upper limit for slider</p>
              </div>
            </div>

            {/* Live Formula Preview Box */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center space-x-2">
                <span className="p-1 bg-amber-500 text-white rounded font-bold text-[10px]">RATE</span>
                <span className="text-slate-700 dark:text-slate-200 font-semibold">
                  Every <strong>{enrollmentPricing.studentStepUnit || 100} students</strong> = <strong>${(enrollmentPricing.pricePerUnitUsd || 0.15).toFixed(2)} USD</strong> (≈ {formatKsh(enrollmentPricing.pricePerUnitUsd || 0.15)})
                </span>
              </div>
              <div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-lg">
                Example (2,100 students): 2,100 ÷ {enrollmentPricing.studentStepUnit || 100} × ${(enrollmentPricing.pricePerUnitUsd || 0.15).toFixed(2)} = ${( (2100 / (enrollmentPricing.studentStepUnit || 100)) * (enrollmentPricing.pricePerUnitUsd || 0.15) ).toFixed(2)} USD (≈ {formatKsh((2100 / (enrollmentPricing.studentStepUnit || 100)) * (enrollmentPricing.pricePerUnitUsd || 0.15))})
              </div>
            </div>
          </div>

          {/* Main Promotion Tiers Table View */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xs overflow-hidden shadow-xs">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Configured Promotion Cards & Tiers
                </h3>
              </div>
            </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-5">Tier & Badge</th>
                  <th className="py-3.5 px-5">Daily Rate (USD / KSh)</th>
                  <th className="py-3.5 px-5">Card Description</th>
                  <th className="py-3.5 px-5">Features (Bullet Points)</th>
                  <th className="py-3.5 px-5">CTA Button Label</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tiers.map((tier) => (
                  <tr key={tier.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Tier & Badge */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          tier.id === 'sponsored'
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 border border-indigo-200 dark:border-indigo-800'
                            : tier.id === 'bestseller'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 border border-amber-200 dark:border-amber-800'
                            : 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 border border-purple-200 dark:border-purple-800'
                        }`}>
                          {tier.id === 'sponsored' && <Megaphone className="w-4 h-4" />}
                          {tier.id === 'bestseller' && <Award className="w-4 h-4" />}
                          {tier.id === 'premium' && <Crown className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                              {tier.name}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 mt-0.5">
                            {renderBadgePreview(tier.badgeType)}
                            <span className="text-[10px] text-slate-400 font-mono">ID: {tier.id}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Daily Rate */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      {quickEditId === tier.id ? (
                        <div className="flex items-center space-x-1.5">
                          <span className="text-slate-400 font-bold">$</span>
                          <input
                            type="number"
                            step="0.5"
                            min="0.5"
                            value={quickEditPrice}
                            onChange={(e) => setQuickEditPrice(e.target.value)}
                            className="w-20 px-2 py-1 bg-white dark:bg-slate-900 border border-indigo-500 rounded-lg text-xs font-black text-slate-900 dark:text-white"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveQuickPrice(tier.id)}
                            className="p-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuickEditId(null)}
                            className="p-1 bg-slate-200 text-slate-600 rounded-md hover:bg-slate-300 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div 
                          onClick={() => {
                            setQuickEditId(tier.id);
                            setQuickEditPrice(tier.dailyRateUsd.toString());
                          }}
                          className="group/rate cursor-pointer"
                          title="Click to quickly adjust rate"
                        >
                          <div className="font-black text-slate-900 dark:text-slate-100 text-sm flex items-center space-x-1">
                            <span>{formatMoney(tier.dailyRateUsd)}</span>
                            <span className="text-slate-400 text-xs font-normal">/ day</span>
                            <Edit3 className="w-3 h-3 text-slate-400 opacity-0 group-hover/rate:opacity-100 transition-opacity ml-1" />
                          </div>
                          <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                            ≈ {formatKsh(tier.dailyRateUsd)} / day
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Card Description */}
                    <td className="py-4 px-5 max-w-xs">
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {tier.description}
                      </p>
                    </td>

                    {/* Features / Bullets */}
                    <td className="py-4 px-5">
                      <div className="space-y-1 max-w-xs">
                        {tier.features.slice(0, 3).map((feat, i) => (
                          <div key={i} className="flex items-start space-x-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                            <Check className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                            <span className="line-clamp-1">{feat}</span>
                          </div>
                        ))}
                        {tier.features.length > 3 && (
                          <span className="text-[10px] text-slate-400 font-bold block pl-4.5">
                            +{tier.features.length - 3} more bullets
                          </span>
                        )}
                      </div>
                    </td>

                    {/* CTA Button Text */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-lg border border-slate-200 dark:border-slate-700 inline-block">
                        {tier.ctaText}
                      </span>
                    </td>

                    {/* Status Toggle */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(tier.id)}
                        className={`px-3 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider transition-colors cursor-pointer border ${
                          tier.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                        }`}
                      >
                        {tier.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(tier)}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-xl transition-colors cursor-pointer inline-flex items-center space-x-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Card</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}
    </div>
  );
};
