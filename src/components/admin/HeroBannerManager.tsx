import React, { useState, useEffect } from 'react';
import { HeroBanner } from '../../types';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Image as ImageIcon,
  Layout,
  Eye,
  EyeOff,
  Sparkles,
  Grid,
  List,
  UploadCloud,
  CheckCircle2
} from 'lucide-react';
import { BannerTable } from './BannerTable';
import { apiFetch } from '../../lib/apiConfig';

export const HeroBannerManager: React.FC = () => {
  const [banners, setBanners] = useState<HeroBanner[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // Form State
  const [formData, setFormData] = useState({
    imageUrl: '',
    isActive: true,
    order: 0
  });

  const loadBanners = async () => {
    try {
      const cached = localStorage.getItem('uqlearn_hero_banners');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) setBanners(parsed);
        } catch (e) {}
      }

      const res = await apiFetch('media-upload.php?action=list_banners', { silent: true }, 1).catch(() => null);
      if (res && res.success && Array.isArray(res.data)) {
        setBanners(res.data);
        localStorage.setItem('uqlearn_hero_banners', JSON.stringify(res.data));
      }
    } catch (err) {
      console.warn('Error loading banners:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBanners();
  }, []);

  const resetForm = () => {
    setFormData({
      imageUrl: '',
      isActive: true,
      order: banners.length
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    try {
      const result = await apiFetch('media-upload.php', {
        method: 'POST',
        body: uploadFormData,
      });
      
      if (result.success) {
        setFormData(prev => ({ ...prev, imageUrl: result.url }));
      } else {
        alert(result.message || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Error uploading image. Make sure api/v1/media-upload exists on your host.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.imageUrl) {
      alert("Please upload an image first.");
      return;
    }
    try {
      let updatedList: HeroBanner[];
      if (editingId) {
        updatedList = banners.map(b => b.id === editingId ? { ...b, ...formData } : b);
      } else {
        const newBanner: HeroBanner = {
          id: `banner-${Date.now()}`,
          ...formData,
          createdAt: new Date().toISOString()
        };
        updatedList = [...banners, newBanner];
      }
      setBanners(updatedList);
      localStorage.setItem('uqlearn_hero_banners', JSON.stringify(updatedList));

      // Post update to backend
      apiFetch('media-upload.php?action=save_banners', {
        method: 'POST',
        body: JSON.stringify({ banners: updatedList })
      }).catch(() => {});

      resetForm();
    } catch (error) {
      console.error("Error saving banner:", error);
      alert("Error saving banner.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;
    try {
      const updatedList = banners.filter(b => b.id !== id);
      setBanners(updatedList);
      localStorage.setItem('uqlearn_hero_banners', JSON.stringify(updatedList));

      apiFetch('media-upload.php?action=save_banners', {
        method: 'POST',
        body: JSON.stringify({ banners: updatedList })
      }).catch(() => {});
    } catch (error) {
      console.error("Error deleting banner:", error);
    }
  };

  const startEdit = (banner: HeroBanner) => {
    setFormData({
      imageUrl: banner.imageUrl,
      isActive: banner.isActive,
      order: banner.order
    });
    setEditingId(banner.id);
    setIsAdding(true);
  };

  if (loading) return <div className="p-8 text-center text-xs font-bold text-slate-500">Loading Banners...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 text-xs font-bold mb-2">
            <Layout className="w-3.5 h-3.5" />
            <span>Marketing Assets</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Hero Banner Manager</h2>
          <p className="text-xs text-slate-500 mt-1">
            Upload images for the landing page hero section. No text or links required.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 mr-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-sm' : 'text-slate-400'}`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-sm' : 'text-slate-400'}`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Banner</span>
            </button>
          )}
        </div>
      </div>

      {isAdding && (
        <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-teal-500" />
              <span>{editingId ? 'Edit Banner' : 'Upload New Banner'}</span>
            </h3>
            <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="relative group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className={`w-full aspect-video border-2 border-dashed rounded-3xl flex flex-col items-center justify-center p-6 transition-all ${
                  formData.imageUrl 
                    ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20' 
                    : 'border-slate-200 dark:border-slate-700 hover:border-teal-500 hover:bg-teal-50/30 dark:hover:bg-teal-950/20'
                }`}>
                  {formData.imageUrl ? (
                    <div className="relative w-full h-full">
                      <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover rounded-2xl" />
                      <div className="absolute top-2 right-2 bg-emerald-500 text-white p-1 rounded-full">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-2">
                      <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center ${uploading ? 'bg-teal-100 dark:bg-teal-900' : 'bg-slate-100 dark:bg-slate-800'}`}>
                        {uploading ? (
                          <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <UploadCloud className="w-6 h-6 text-slate-400 group-hover:text-teal-600" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {uploading ? 'Uploading Image...' : 'Click to Upload Image'}
                        </p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">PNG, JPG or WebP (Max 5MB)</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Image URL (Direct Edit)</label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:ring-2 focus:ring-teal-500 outline-none"
                    placeholder="https://your-domain.com/uploads/..."
                  />
                </div>

                <div className="flex items-center space-x-8">
                  <label className="flex items-center space-x-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={e => setFormData({...formData, isActive: e.target.checked})}
                      className="w-5 h-5 text-teal-600 rounded-lg focus:ring-teal-500 border-slate-300 dark:border-slate-700"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Live Status</span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Visible to Guests</span>
                    </div>
                  </label>
                  
                  <div className="flex items-center space-x-3">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Priority</span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest text-right">Order</span>
                    </div>
                    <input
                      type="number"
                      value={formData.order}
                      onChange={e => setFormData({...formData, order: parseInt(e.target.value)})}
                      className="w-20 px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black text-center focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-8 flex justify-end space-x-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-100 font-bold text-xs rounded-2xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!formData.imageUrl || uploading}
                  className="px-10 py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs rounded-2xl shadow-xl shadow-teal-900/20 transition-all cursor-pointer flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingId ? 'Update Banner' : 'Save Banner'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {viewMode === 'table' ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <BannerTable 
            banners={banners} 
            onEdit={startEdit} 
            onDelete={handleDelete} 
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {banners.map(banner => (
            <div key={banner.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm group">
              <div className="relative aspect-video">
                <img src={banner.imageUrl} alt="Banner" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-3">
                  <button 
                    onClick={() => startEdit(banner)}
                    className="p-3 bg-white text-slate-900 rounded-2xl hover:bg-teal-50 transition-colors cursor-pointer shadow-lg"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleDelete(banner.id)}
                    className="p-3 bg-white text-rose-600 rounded-2xl hover:bg-rose-50 transition-colors cursor-pointer shadow-lg"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                {!banner.isActive && (
                  <div className="absolute top-4 right-4 px-3 py-1.5 bg-slate-900/80 text-white text-[9px] font-black uppercase tracking-widest backdrop-blur-md rounded-xl flex items-center space-x-2">
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Hidden</span>
                  </div>
                )}
                {banner.isActive && (
                  <div className="absolute top-4 right-4 px-3 py-1.5 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-xl flex items-center space-x-2 shadow-lg">
                    <Eye className="w-3.5 h-3.5" />
                    <span>Live</span>
                  </div>
                )}
                <div className="absolute top-4 left-4 px-3 py-1.5 bg-teal-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-lg">
                  Order #{banner.order}
                </div>
              </div>
            </div>
          ))}

          {banners.length === 0 && !isAdding && (
            <div className="col-span-full py-24 text-center space-y-6 border-4 border-dashed border-slate-100 dark:border-slate-800/50 rounded-[40px]">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                <Layout className="w-10 h-10 text-slate-300" />
              </div>
              <div className="space-y-2">
                <p className="text-lg font-black text-slate-900 dark:text-slate-100">No Banners Configured</p>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Upload your first high-impact marketing image.</p>
              </div>
              <button
                onClick={() => setIsAdding(true)}
                className="px-10 py-4 bg-teal-600 hover:bg-teal-500 text-white font-black text-xs rounded-2xl shadow-xl shadow-teal-900/20 transition-all cursor-pointer"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
