import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Upload, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  CheckCircle2, 
  Trash2, 
  Edit3, 
  Eye, 
  EyeOff, 
  Plus, 
  RefreshCw, 
  Sparkles, 
  AlertCircle, 
  ExternalLink, 
  Layers, 
  Palette, 
  Check, 
  X, 
  Database, 
  Flame, 
  Tag, 
  Sliders,
  ArrowLeft
} from 'lucide-react';
import { Advert } from '../../types';
import { 
  getAdvertsApi, 
  saveAdvertApi, 
  toggleAdvertActiveApi, 
  deleteAdvertApi, 
  uploadAdvertImageApi,
  ROOT_URL 
} from '../../lib/apiConfig';

interface SlotDefinition {
  key: string;
  name: string;
  description: string;
  badge: string;
  badgeColor: string;
  icon: any;
}

const ADVERT_SLOTS: SlotDefinition[] = [
  {
    key: 'super_deals',
    name: 'Super Deals & Flash Sale Advert',
    description: 'Promotional banner rendered directly at the Super Deals & Flash Sale section on the main marketplace page.',
    badge: 'Section 1 Advert',
    badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    icon: Flame,
  },
  {
    key: 'tailored_for_you',
    name: 'Tailored For You Advert',
    description: 'Promotional banner rendered right after the Tailored For You section on the main marketplace page.',
    badge: 'Section 2 Advert',
    badgeColor: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
    icon: Sparkles,
  },
];

const SlotPreviewCarousel: React.FC<{ banners: Advert[] }> = ({ banners }) => {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => {
      setIdx((prev) => (prev + 1) % banners.length);
    }, 2000);
    return () => clearInterval(t);
  }, [banners.length]);

  if (banners.length === 0) return null;
  const safeIdx = idx >= banners.length ? 0 : idx;
  const current = banners[safeIdx];

  return (
    <div className="space-y-1.5 pt-1">
      <div 
        className="w-full h-24 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 p-2 flex items-center justify-center shadow-inner relative transition-colors"
        style={{ backgroundColor: current.bgColor || current.bg_color || '#0f172a' }}
      >
        <img
          src={current.imageUrl || current.image_url}
          alt={current.title || 'Slot Advert'}
          className="max-h-full w-auto max-w-full object-contain transition-opacity duration-300"
        />
        {current.badgeText && (
          <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-xs">
            {current.badgeText}
          </span>
        )}
      </div>
      {banners.length > 1 && (
        <div className="flex items-center justify-center space-x-1">
          {banners.map((_, dotIdx) => (
            <button
              key={dotIdx}
              type="button"
              onClick={() => setIdx(dotIdx)}
              className={`transition-all rounded-full cursor-pointer ${
                safeIdx === dotIdx ? 'w-4 h-1 bg-teal-500' : 'w-1 h-1 bg-slate-300 dark:bg-slate-700'
              }`}
              title={`View banner ${dotIdx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const AdvertManager: React.FC = () => {
  const [adverts, setAdverts] = useState<Advert[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Active Slot Filter / Editor
  const [activeSlotFilter, setActiveSlotFilter] = useState<string>('all');

  // Form State
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [slot, setSlot] = useState<string>('super_deals');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [badgeText, setBadgeText] = useState('');
  const [altText, setAltText] = useState('');
  const [bgColor, setBgColor] = useState('#0f172a');
  const [isActive, setIsActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(0);

  const fetchAdverts = async () => {
    try {
      setLoading(true);
      const res = await getAdvertsApi(undefined, false);
      if (res && res.success && Array.isArray(res.data)) {
        setAdverts(res.data);
      } else {
        setAdverts([]);
      }
    } catch (err: any) {
      console.error('Error fetching adverts:', err);
      setStatusMsg({ type: 'error', text: 'Could not connect to /api/v1/adverts.php. Ensure backend is reachable.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdverts();
  }, []);

  // Listen for searchParams to open upload or edit subpage
  useEffect(() => {
    const action = searchParams.get('action');
    const slotParam = searchParams.get('slot');
    const idParam = searchParams.get('id');

    if (action === 'upload') {
      setIsFormOpen(true);
      if (slotParam) setSlot(slotParam);
    } else if (action === 'edit' && idParam && adverts.length > 0) {
      const adv = adverts.find(a => String(a.id) === String(idParam));
      if (adv) {
        setEditingId(adv.id);
        setSlot(adv.slot || 'super_deals');
        setImageUrl(adv.imageUrl || adv.image_url || '');
        setLinkUrl(adv.linkUrl || adv.link_url || '');
        setTitle(adv.title || '');
        setSubtitle(adv.subtitle || '');
        setBadgeText(adv.badgeText || adv.badge_text || '');
        setAltText(adv.altText || adv.alt_text || '');
        setBgColor(adv.bgColor || adv.bg_color || '#0f172a');
        setIsActive(Boolean(adv.isActive ?? adv.is_active));
        setDisplayOrder(adv.displayOrder ?? adv.display_order ?? 0);
        setIsFormOpen(true);
      }
    }
  }, [searchParams, adverts]);

  const resetForm = () => {
    setEditingId(null);
    setSlot('super_deals');
    setImageUrl('');
    setLinkUrl('');
    setTitle('');
    setSubtitle('');
    setBadgeText('');
    setAltText('');
    setBgColor('#0f172a');
    setIsActive(true);
    setDisplayOrder(0);
    setIsFormOpen(false);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('action');
      next.delete('slot');
      next.delete('id');
      return next;
    });
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleOpenNewForSlot = (targetSlot: string) => {
    setEditingId(null);
    setSlot(targetSlot);
    setImageUrl('');
    setLinkUrl('');
    setTitle('');
    setSubtitle('');
    setBadgeText('');
    setAltText('');
    setBgColor('#0f172a');
    setIsActive(true);
    setDisplayOrder(0);
    setIsFormOpen(true);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('action', 'upload');
      next.set('slot', targetSlot);
      next.delete('id');
      return next;
    });
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleEdit = (advert: Advert) => {
    setEditingId(advert.id);
    setSlot(advert.slot || 'super_deals');
    setImageUrl(advert.imageUrl || advert.image_url || '');
    setLinkUrl(advert.linkUrl || advert.link_url || '');
    setTitle(advert.title || '');
    setSubtitle(advert.subtitle || '');
    setBadgeText(advert.badgeText || advert.badge_text || '');
    setAltText(advert.altText || advert.alt_text || '');
    setBgColor(advert.bgColor || advert.bg_color || '#0f172a');
    setIsActive(Boolean(advert.isActive ?? advert.is_active));
    setDisplayOrder(advert.displayOrder ?? advert.display_order ?? 0);
    setIsFormOpen(true);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('action', 'edit');
      next.set('id', String(advert.id));
      next.delete('slot');
      return next;
    });
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setStatusMsg({ type: 'error', text: 'Image file size exceeds 10MB limit.' });
      return;
    }

    setUploading(true);
    setStatusMsg(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await uploadAdvertImageApi(formData);
      if (res && res.success && (res.url || res.image_url)) {
        const uploadedUrl = res.url || res.image_url;
        setImageUrl(uploadedUrl);
        if (!title) {
          setTitle(file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
        }
        setStatusMsg({ type: 'success', text: 'Advert image uploaded to server successfully!' });
      } else {
        setStatusMsg({ type: 'error', text: res?.message || 'Upload failed. Check PHP folder permissions.' });
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setStatusMsg({ type: 'error', text: 'Error uploading image to /api/v1/adverts.php' });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) {
      setStatusMsg({ type: 'error', text: 'Please upload or specify an advert banner image URL.' });
      return;
    }

    setSaving(true);
    setStatusMsg(null);

    try {
      const payload = {
        id: editingId || undefined,
        slot: slot || 'super_deals',
        imageUrl: imageUrl.trim(),
        linkUrl: linkUrl.trim(),
        title: title.trim() || 'Featured Promotion',
        subtitle: subtitle.trim(),
        altText: altText.trim() || title.trim() || 'Advert Banner',
        badgeText: badgeText.trim(),
        bgColor: bgColor || '#0f172a',
        isActive: isActive,
        displayOrder: Number(displayOrder) || 0
      };

      const res = await saveAdvertApi(payload);
      if (res && res.success) {
        setStatusMsg({ 
          type: 'success', 
          text: editingId ? 'Advert updated successfully!' : 'New section advert published successfully!' 
        });
        resetForm();
        await fetchAdverts();
        window.dispatchEvent(new CustomEvent('uqlearn_advert_updated'));
      } else {
        setStatusMsg({ type: 'error', text: res?.message || 'Failed to save advert.' });
      }
    } catch (err: any) {
      console.error('Save error:', err);
      setStatusMsg({ type: 'error', text: 'Save failed: ' + (err.message || 'Server error') });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (advert: Advert) => {
    try {
      const currentVal = Boolean(advert.isActive ?? advert.is_active);
      const res = await toggleAdvertActiveApi(advert.id, !currentVal);
      if (res && res.success) {
        setAdverts(prev => prev.map(a => a.id === advert.id ? { ...a, isActive: !currentVal, is_active: !currentVal ? 1 : 0 } : a));
        window.dispatchEvent(new CustomEvent('uqlearn_advert_updated'));
      }
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  const handleDelete = async (id: number | string) => {
    if (!window.confirm('Are you sure you want to delete this advert?')) return;
    try {
      const res = await deleteAdvertApi(id);
      if (res && res.success) {
        setAdverts(prev => prev.filter(a => a.id !== id));
        setStatusMsg({ type: 'success', text: 'Advert deleted successfully.' });
        window.dispatchEvent(new CustomEvent('uqlearn_advert_updated'));
      } else {
        setStatusMsg({ type: 'error', text: res?.message || 'Failed to delete advert.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'Delete failed: ' + err.message });
    }
  };

  const filteredAdverts = activeSlotFilter === 'all' 
    ? adverts 
    : adverts.filter(a => a.slot === activeSlotFilter);

  // If in Form / Upload mode, render dedicated Upload & Edit Page View
  if (isFormOpen) {
    const selectedSlotDef = ADVERT_SLOTS.find(s => s.key === slot) || ADVERT_SLOTS[0];

    return (
      <div className="space-y-6 animate-fadeIn pb-16">
        {/* Navigation / Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Section Adverts</span>
          </button>

          <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Section Adverts</span>
            <span>/</span>
            <span className="text-teal-600 dark:text-teal-400 font-bold">
              {editingId ? `Edit Advert #${editingId}` : 'Upload Advert Banner'}
            </span>
          </div>
        </div>

        {/* Status Alert */}
        {statusMsg && (
          <div className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between animate-fadeIn ${
            statusMsg.type === 'success' 
              ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300' 
              : 'bg-rose-950/60 border border-rose-800 text-rose-300'
          }`}>
            <div className="flex items-center space-x-2">
              {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{statusMsg.text}</span>
            </div>
            <button onClick={() => setStatusMsg(null)} className="p-1 hover:opacity-75">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Dedicated Upload / Edit Page Container */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-teal-600 dark:text-teal-400 text-xs font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{editingId ? 'Edit Configuration' : `Upload for ${selectedSlotDef.name}`}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                <Upload className="w-5 h-5 text-teal-500" />
                <span>{editingId ? 'Edit Section Advert Banner' : 'Upload & Configure Section Advert'}</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                Upload wide graphical banners designed for the in-page showcase sections (Recommended size: 1200x240px to 1920x360px). Active banners smoothly rotate every 2 seconds on the marketplace page (supports up to 10 banners per section).
              </p>
            </div>
            <button
              onClick={resetForm}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Close and return to overview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Slot Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Target In-Page Placement Section
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ADVERT_SLOTS.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSlot(s.key)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center space-x-3 ${
                      slot === s.key
                        ? 'border-teal-500 bg-teal-50/60 dark:bg-teal-950/40 ring-2 ring-teal-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${slot === s.key ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      <Check className={`w-4 h-4 ${slot === s.key ? 'opacity-100' : 'opacity-0'}`} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">{s.name}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{s.badge}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Direct Image Upload & URL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* File Dropzone */}
              <div className="space-y-2">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Upload Image File (PHP Server)
                </label>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-500 dark:hover:border-teal-500 rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all bg-slate-50 dark:bg-slate-950/40 relative cursor-pointer group">
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    {uploading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {uploading ? 'Uploading to /uploads/adverts/ ...' : 'Click or Drag & Drop Image Banner'}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    PNG, JPG, WEBP, SVG or GIF (Max 10MB)
                  </span>
                </div>
              </div>

              {/* Image URL & Click Destination */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Image Direct URL
                  </label>
                  <div className="relative">
                    <ImageIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      placeholder={`${ROOT_URL}/uploads/adverts/banner.webp`}
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Click Destination Link (Optional)
                  </label>
                  <div className="relative">
                    <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder={`e.g. /courses or ${ROOT_URL}/courses/course-id`}
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Campaign details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Campaign Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Master Full Stack & AI"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:outline-none font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Badge Tag (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 50% Off Flash Sale"
                  value={badgeText}
                  onChange={(e) => setBadgeText(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:outline-none font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Background Color
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-10 h-10 p-0.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    placeholder="#0f172a"
                    className="flex-1 px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Rotation Order (1 to 10)
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:outline-none font-medium"
                />
              </div>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center space-x-3 p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800">
              <input
                type="checkbox"
                id="is_advert_active_toggle"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-teal-600 rounded-md focus:ring-teal-500 cursor-pointer"
              />
              <label htmlFor="is_advert_active_toggle" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                Make active immediately (participates in 2-second continuous auto-advance)
              </label>
            </div>

            {/* Live Preview */}
            {imageUrl && (
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                  <Eye className="w-3.5 h-3.5 text-teal-500" />
                  <span>Section Banner Preview</span>
                </label>
                <div 
                  className="w-full rounded-3xl overflow-hidden border border-slate-300 dark:border-slate-700 p-4 flex items-center justify-center shadow-inner relative"
                  style={{ backgroundColor: bgColor }}
                >
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="max-h-48 w-auto max-w-full object-contain"
                  />
                  {badgeText && (
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-600 text-white shadow-md">
                        {badgeText}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !imageUrl.trim()}
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center space-x-2 transition-all shadow-md cursor-pointer"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>{saving ? 'Saving...' : editingId ? 'Update Advert' : 'Save & Publish Advert'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Main Section Adverts Dashboard / Overview View
  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -top-12 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-teal-400 text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Section Adverts & Campaigns</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              In-Page Section Advert Banners
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl font-medium">
              Manage up to 10 in-page section banners with 2-second continuous auto-rotation: at the <strong>Super Deals & Flash Sale</strong> section and after the <strong>Tailored For You</strong> section.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchAdverts}
              disabled={loading}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs flex items-center space-x-2 transition-colors border border-slate-700 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => handleOpenNewForSlot('super_deals')}
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-xs flex items-center space-x-2 transition-all shadow-md cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload Section Advert</span>
            </button>
          </div>
        </div>

        {/* Database Status Pills */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-400">
          <span className="flex items-center space-x-1.5 px-3 py-1 bg-slate-800/80 rounded-lg border border-slate-700/60 text-slate-300">
            <Database className="w-3.5 h-3.5 text-teal-400" />
            <span>Table: <code className="text-teal-400">adverts</code></span>
          </span>
          <span className="flex items-center space-x-1.5 px-3 py-1 bg-slate-800/80 rounded-lg border border-slate-700/60 text-slate-300">
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>Super Deals: <strong className="text-white">{adverts.filter(a => a.slot === 'super_deals' || a.slot === 'deals').length}</strong></span>
          </span>
          <span className="flex items-center space-x-1.5 px-3 py-1 bg-slate-800/80 rounded-lg border border-slate-700/60 text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Tailored For You: <strong className="text-white">{adverts.filter(a => a.slot === 'tailored_for_you' || a.slot === 'tailored').length}</strong></span>
          </span>
          <span className="flex items-center space-x-1.5 px-3 py-1 bg-slate-800/80 rounded-lg border border-slate-700/60 text-teal-300 font-bold">
            <Sliders className="w-3.5 h-3.5 text-teal-400" />
            <span>2s Auto-Advance Enabled (Up to 10 Banners)</span>
          </span>
        </div>
      </div>

      {/* 2 Slot Quick Actions Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ADVERT_SLOTS.map((slotDef) => {
          const slotAdverts = adverts.filter(a => a.slot === slotDef.key || (slotDef.key === 'super_deals' && a.slot === 'deals') || (slotDef.key === 'tailored_for_you' && a.slot === 'tailored'));
          const activeBanners = slotAdverts.filter(a => a.isActive ?? a.is_active);
          const IconComp = slotDef.icon;

          return (
            <div 
              key={slotDef.key}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${slotDef.badgeColor}`}>
                    {slotDef.badge}
                  </span>
                  {activeBanners.length > 0 ? (
                    <span className="flex items-center space-x-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{activeBanners.length} Active in 2s Auto-Rotation</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1 text-[11px] font-bold text-amber-500">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>No Active Banner</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-200 dark:border-teal-900">
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-slate-100">{slotDef.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{slotDef.description}</p>
                  </div>
                </div>

                {activeBanners.length > 0 && (
                  <SlotPreviewCarousel banners={activeBanners} />
                )}
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-500 font-medium">
                  {slotAdverts.length} banner{slotAdverts.length === 1 ? '' : 's'} ({activeBanners.length}/10 active)
                </span>
                <button
                  onClick={() => handleOpenNewForSlot(slotDef.key)}
                  className="px-4 py-2 bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer border border-teal-200 dark:border-teal-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Upload for this Section</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Status Alert on Overview page */}
      {statusMsg && (
        <div className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between animate-fadeIn ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300' 
            : 'bg-rose-950/60 border border-rose-800 text-rose-300'
        }`}>
          <div className="flex items-center space-x-2">
            {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="p-1 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {/* Adverts Listing */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <Layers className="w-4 h-4 text-teal-500" />
            <span>Configured Section Adverts ({adverts.length})</span>
          </h2>

          {/* Slot Filter Buttons */}
          <div className="flex items-center space-x-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => setActiveSlotFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeSlotFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              All Slots
            </button>
            <button
              onClick={() => setActiveSlotFilter('super_deals')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeSlotFilter === 'super_deals'
                  ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Super Deals
            </button>
            <button
              onClick={() => setActiveSlotFilter('tailored_for_you')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeSlotFilter === 'tailored_for_you'
                  ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Tailored For You
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-teal-500" />
            <p className="text-xs font-bold">Loading section adverts from database...</p>
          </div>
        ) : filteredAdverts.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-500 dark:text-slate-400 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-teal-50 dark:bg-teal-950/50 text-teal-500 flex items-center justify-center mx-auto border border-teal-200 dark:border-teal-900">
              <ImageIcon className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Section Adverts in This Slot</h3>
              <p className="text-xs max-w-md mx-auto">
                Click below to upload a promotional banner that will be rendered directly in the marketplace section.
              </p>
            </div>
            <button
              onClick={() => {
                resetForm();
                if (activeSlotFilter !== 'all') setSlot(activeSlotFilter);
                setIsFormOpen(true);
              }}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-xs inline-flex items-center space-x-2 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Upload Advert Banner</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredAdverts.map((adv) => {
              const active = Boolean(adv.isActive ?? adv.is_active);
              const isSuperDeals = adv.slot === 'super_deals' || adv.slot === 'deals';
              const slotLabel = isSuperDeals ? 'Super Deals & Flash Sale' : 'Tailored For You';

              return (
                <div
                  key={adv.id}
                  className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 sm:p-5 transition-all shadow-sm hover:shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                    active 
                      ? 'border-teal-300 dark:border-teal-900/60 ring-1 ring-teal-500/20' 
                      : 'border-slate-200 dark:border-slate-800 opacity-75'
                  }`}
                >
                  {/* Left: Visual Banner & Details */}
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <div 
                      className="w-40 sm:w-56 h-20 rounded-xl flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0 p-1 relative shadow-inner"
                      style={{ backgroundColor: adv.bgColor || adv.bg_color || '#0f172a' }}
                    >
                      <img
                        src={adv.imageUrl || adv.image_url}
                        alt={adv.title || 'Section Advert'}
                        className="max-h-full w-auto max-w-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                      {adv.badgeText && (
                        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-rose-600 text-white">
                          {adv.badgeText}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                          {adv.title || 'Promotional Banner'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          isSuperDeals 
                            ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900' 
                            : 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-900'
                        }`}>
                          {slotLabel}
                        </span>
                        {active ? (
                          <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full text-[10px] font-black uppercase tracking-wider">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            Inactive
                          </span>
                        )}
                      </div>

                      {adv.linkUrl ? (
                        <a
                          href={adv.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline flex items-center space-x-1 truncate max-w-md"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate">{adv.linkUrl}</span>
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">No destination link configured</span>
                      )}

                      <div className="text-[10px] text-slate-400 flex items-center space-x-3 pt-0.5">
                        <span>Slot: <code className="font-mono text-teal-600 dark:text-teal-400">{adv.slot}</code></span>
                        <span>ID: <code className="font-mono">{adv.id}</code></span>
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center space-x-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => handleToggleActive(adv)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer ${
                        active 
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                      title={active ? 'Click to deactivate' : 'Click to activate'}
                    >
                      {active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      <span>{active ? 'Active' : 'Enable'}</span>
                    </button>

                    <button
                      onClick={() => handleEdit(adv)}
                      className="p-2 text-slate-600 dark:text-slate-300 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/40 rounded-xl transition-colors cursor-pointer"
                      title="Edit advert details"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(adv.id)}
                      className="p-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                      title="Delete advert"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
