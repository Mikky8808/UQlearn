import React, { useState, useEffect } from 'react';
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
  Database
} from 'lucide-react';
import { TopAdvert } from '../../types';
import { 
  getTopAdvertsApi, 
  saveTopAdvertApi, 
  toggleTopAdvertActiveApi, 
  deleteTopAdvertApi, 
  uploadTopAdvertImageApi,
  API_BASE_URL,
  ROOT_URL 
} from '../../lib/apiConfig';

export const TopAdvertManager: React.FC = () => {
  const [adverts, setAdverts] = useState<TopAdvert[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [title, setTitle] = useState('');
  const [altText, setAltText] = useState('');
  const [bgColor, setBgColor] = useState('#0f172a');
  const [isActive, setIsActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(0);

  const fetchAdverts = async () => {
    try {
      setLoading(true);
      const res = await getTopAdvertsApi(false);
      if (res && res.success && Array.isArray(res.data)) {
        setAdverts(res.data);
      } else {
        setAdverts([]);
      }
    } catch (err: any) {
      console.error('Error fetching top adverts:', err);
      setStatusMsg({ type: 'error', text: 'Could not connect to /api/v1/top-adverts.php. Ensure backend is reachable.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdverts();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setImageUrl('');
    setLinkUrl('');
    setTitle('');
    setAltText('');
    setBgColor('#0f172a');
    setIsActive(true);
    setDisplayOrder(adverts.length);
    setIsFormOpen(false);
  };

  const handleEdit = (advert: TopAdvert) => {
    setEditingId(advert.id);
    setImageUrl(advert.imageUrl || advert.image_url || '');
    setLinkUrl(advert.linkUrl || advert.link_url || '');
    setTitle(advert.title || '');
    setAltText(advert.altText || advert.alt_text || '');
    setBgColor(advert.bgColor || advert.bg_color || '#0f172a');
    setIsActive(Boolean(advert.isActive ?? advert.is_active));
    setDisplayOrder(advert.displayOrder ?? advert.display_order ?? 0);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 10MB for adverts)
    if (file.size > 10 * 1024 * 1024) {
      setStatusMsg({ type: 'error', text: 'Image size exceeds 10MB limit.' });
      return;
    }

    setUploading(true);
    setStatusMsg(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await uploadTopAdvertImageApi(formData);
      if (res && res.success && (res.url || res.image_url)) {
        const uploadedUrl = res.url || res.image_url;
        setImageUrl(uploadedUrl);
        if (!title) {
          setTitle(file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
        }
        setStatusMsg({ type: 'success', text: 'Advert image uploaded to server successfully!' });
      } else {
        setStatusMsg({ type: 'error', text: res?.message || 'Upload failed. Check PHP server permissions.' });
      }
    } catch (err: any) {
      console.error('File upload error:', err);
      setStatusMsg({ type: 'error', text: 'Error uploading to /api/v1/top-adverts.php' });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) {
      setStatusMsg({ type: 'error', text: 'Please upload or specify an advert image URL.' });
      return;
    }

    setSaving(true);
    setStatusMsg(null);

    try {
      const payload = {
        id: editingId || undefined,
        imageUrl: imageUrl.trim(),
        linkUrl: linkUrl.trim(),
        title: title.trim() || 'Top Nav Advert',
        altText: altText.trim() || title.trim() || 'Special Announcement Banner',
        bgColor: bgColor || '#0f172a',
        isActive: isActive,
        displayOrder: Number(displayOrder) || 0
      };

      const res = await saveTopAdvertApi(payload);
      if (res && res.success) {
        setStatusMsg({ 
          type: 'success', 
          text: editingId ? 'Top advert updated successfully!' : 'New top advert banner published successfully!' 
        });
        resetForm();
        await fetchAdverts();
        // Notify live banner on client
        window.dispatchEvent(new CustomEvent('uqlearn_top_advert_updated'));
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

  const handleToggleActive = async (advert: TopAdvert) => {
    try {
      const currentVal = Boolean(advert.isActive ?? advert.is_active);
      const res = await toggleTopAdvertActiveApi(advert.id, !currentVal);
      if (res && res.success) {
        setAdverts(prev => prev.map(a => a.id === advert.id ? { ...a, isActive: !currentVal, is_active: !currentVal ? 1 : 0 } : a));
        window.dispatchEvent(new CustomEvent('uqlearn_top_advert_updated'));
      }
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  const handleDelete = async (id: number | string) => {
    if (!window.confirm('Are you sure you want to delete this top advert?')) return;
    try {
      const res = await deleteTopAdvertApi(id);
      if (res && res.success) {
        setAdverts(prev => prev.map(a => a).filter(a => a.id !== id));
        setStatusMsg({ type: 'success', text: 'Advert removed successfully.' });
        window.dispatchEvent(new CustomEvent('uqlearn_top_advert_updated'));
      } else {
        setStatusMsg({ type: 'error', text: res?.message || 'Failed to delete advert.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'Delete failed: ' + err.message });
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner & Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -top-12 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-rose-400 text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Marketing & Promotions</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Top Nav Advert Banner
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl font-medium">
              Upload promotional banners, seasonal campaign graphics, and announcements that appear right before the top navigation bar across all pages.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchAdverts}
              disabled={loading}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs flex items-center space-x-2 transition-colors border border-slate-700 cursor-pointer"
              title="Refresh database records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => {
                if (isFormOpen) {
                  resetForm();
                } else {
                  resetForm();
                  setIsFormOpen(true);
                }
              }}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs flex items-center space-x-2 transition-all shadow-md cursor-pointer"
            >
              {isFormOpen ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              <span>{isFormOpen ? 'Cancel' : 'Upload New Advert'}</span>
            </button>
          </div>
        </div>

        {/* Database Status Pills */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-400">
          <span className="flex items-center space-x-1.5 px-3 py-1 bg-slate-800/80 rounded-lg border border-slate-700/60 text-slate-300">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Table: <code className="text-emerald-400">top_adverts</code></span>
          </span>
          <span className="flex items-center space-x-1.5 px-3 py-1 bg-slate-800/80 rounded-lg border border-slate-700/60 text-slate-300">
            <Layers className="w-3.5 h-3.5 text-rose-400" />
            <span>Total Adverts: <strong className="text-white">{adverts.length}</strong></span>
          </span>
          <span className="flex items-center space-x-1.5 px-3 py-1 bg-slate-800/80 rounded-lg border border-slate-700/60 text-slate-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
            <span>Active on Live Site: <strong className="text-white">{adverts.filter(a => a.isActive ?? a.is_active).length}</strong></span>
          </span>
        </div>
      </div>

      {/* Status Messages */}
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

      {/* Upload & Form Section */}
      {isFormOpen && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="space-y-1">
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                <Upload className="w-5 h-5 text-rose-500" />
                <span>{editingId ? 'Edit Top Advert' : 'Upload & Configure Top Advert'}</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Upload your wide promotional banner (recommended aspect ratio ~ 1200x80px to 1920x120px).
              </p>
            </div>
            <button
              onClick={resetForm}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Direct File Dropzone & Image URL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* File Upload Dropzone */}
              <div className="space-y-2">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Upload Image File (PHP Shared Host)
                </label>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-rose-500 dark:hover:border-rose-500 rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all bg-slate-50 dark:bg-slate-950/40 relative cursor-pointer group">
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
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

              {/* Image URL Manual Entry */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Image Direct URL
                  </label>
                  <div className="relative">
                    <ImageIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      placeholder={`${ROOT_URL}/uploads/adverts/banner.png`}
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 focus:outline-none font-mono"
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
                      placeholder={`e.g. /courses or ${ROOT_URL}/courses/course-123`}
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Fields: Title, Alt text, BG color, Display order */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Campaign Title / Internal Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. 50% Off Flash Sale"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 focus:outline-none font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Image Alt Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Learn AI & Cloud Computing Sale"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 focus:outline-none font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Background Color (Letterboxing)
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
                  Display Order (Index)
                </label>
                <input
                  type="number"
                  min="0"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 focus:outline-none font-medium"
                />
              </div>
            </div>

            {/* Active Toggle Switch */}
            <div className="flex items-center space-x-3 p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800">
              <input
                type="checkbox"
                id="is_active_toggle"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-rose-600 rounded-md focus:ring-rose-500 cursor-pointer"
              />
              <label htmlFor="is_active_toggle" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                Make this advert active immediately on the live top navigation bar
              </label>
            </div>

            {/* Live Preview Box */}
            {imageUrl && (
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                  <Eye className="w-3.5 h-3.5 text-teal-500" />
                  <span>Live Top Nav Banner Preview</span>
                </label>
                <div 
                  className="w-full rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-700 p-2 flex items-center justify-center shadow-inner"
                  style={{ backgroundColor: bgColor }}
                >
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="max-h-16 w-auto max-w-full object-contain"
                  />
                </div>
              </div>
            )}

            {/* Form Action Buttons */}
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
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center space-x-2 transition-all shadow-md cursor-pointer"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>{saving ? 'Saving...' : editingId ? 'Update Advert' : 'Save & Publish Advert'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Adverts List / Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <Layers className="w-4 h-4 text-rose-500" />
            <span>Uploaded Top Nav Advertisements ({adverts.length})</span>
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Ordered by display priority (lowest index appears first)
          </span>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-rose-500" />
            <p className="text-xs font-bold">Loading advertisements from MySQL database...</p>
          </div>
        ) : adverts.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-500 dark:text-slate-400 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/50 text-rose-500 flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-900">
              <ImageIcon className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Top Adverts Uploaded Yet</h3>
              <p className="text-xs max-w-md mx-auto">
                Click "Upload New Advert" above to upload a promotional banner that will be shown above the top navigation bar.
              </p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setIsFormOpen(true);
              }}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs inline-flex items-center space-x-2 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Upload First Advert</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {adverts.map((advert) => {
              const active = Boolean(advert.isActive ?? advert.is_active);
              const img = advert.imageUrl || advert.image_url || '';
              const link = advert.linkUrl || advert.link_url || '';

              return (
                <div
                  key={advert.id}
                  className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 sm:p-5 transition-all shadow-sm hover:shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                    active 
                      ? 'border-emerald-300 dark:border-emerald-900/60 ring-1 ring-emerald-500/20' 
                      : 'border-slate-200 dark:border-slate-800 opacity-75'
                  }`}
                >
                  {/* Left: Banner Visual Preview */}
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <div 
                      className="w-40 sm:w-56 h-14 rounded-xl flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0 p-1"
                      style={{ backgroundColor: advert.bgColor || advert.bg_color || '#0f172a' }}
                    >
                      <img
                        src={img}
                        alt={advert.title || 'Advert banner'}
                        className="max-h-full w-auto max-w-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                          {advert.title || 'Untitled Advert'}
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

                      {link ? (
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1 truncate max-w-md"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate">{link}</span>
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">No click link configured</span>
                      )}

                      <div className="text-[10px] text-slate-400 flex items-center space-x-3 pt-0.5">
                        <span>Order: <strong>{advert.displayOrder ?? advert.display_order ?? 0}</strong></span>
                        <span>ID: <code className="font-mono">{advert.id}</code></span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center space-x-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => handleToggleActive(advert)}
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
                      onClick={() => handleEdit(advert)}
                      className="p-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-colors cursor-pointer"
                      title="Edit advert details"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(advert.id)}
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
