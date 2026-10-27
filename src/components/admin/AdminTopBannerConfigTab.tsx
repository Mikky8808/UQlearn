import React, { useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, Save, RefreshCw, CheckCircle2, AlertCircle, X, Clock, Calendar } from 'lucide-react';
import { uploadTopAdvertImageApi, saveTopAdvertApi, getTopAdvertsApi } from '../../lib/apiConfig';
import { TopAdvert } from '../../types';

export const AdminTopBannerConfigTab: React.FC = () => {
  const [imageUrl, setImageUrl] = useState('');
  const [endTime, setEndTime] = useState('2027-12-31T23:59');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // Load existing config
    const loadConfig = async () => {
      try {
        const res = await getTopAdvertsApi(true);
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          // Assuming we manage the first active advert as the main banner
          const active = res.data.find((a: TopAdvert) => a.isActive) || res.data[0];
          setImageUrl(active.imageUrl);
        }
      } catch (err) {
        console.error('Failed to load banner config', err);
      }
    };
    loadConfig();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setStatusMsg(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await uploadTopAdvertImageApi(formData);
      if (res && res.success) {
        setImageUrl(res.url || res.image_url);
        setStatusMsg({ type: 'success', text: 'Banner image uploaded successfully!' });
      } else {
        setStatusMsg({ type: 'error', text: res?.message || 'Upload failed.' });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Error uploading image.' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setStatusMsg(null);
    try {
      // In a real app, you might save these to a separate config table or JSON file
      // For now, we update the banner record with the new imageUrl
      await saveTopAdvertApi({
        imageUrl,
        isActive: true,
        title: 'Dynamic Promotional Banner',
        endTime: endTime // This assumes backend handles countdown logic based on a configured deadline
      });
      setStatusMsg({ type: 'success', text: 'Banner and countdown deadline saved successfully!' });
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Failed to save configuration.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-black text-slate-900 dark:text-white">Promotional Banner & Countdown Config</h1>
      
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="space-y-4">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Upload Banner Image</label>
          <div className="border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer hover:border-purple-500 transition-colors">
            <input type="file" onChange={handleFileUpload} className="hidden" id="banner-upload" />
            <label htmlFor="banner-upload" className="cursor-pointer">
              {uploading ? <RefreshCw className="w-8 h-8 animate-spin mx-auto text-purple-500" /> : <Upload className="w-8 h-8 mx-auto text-slate-400" />}
              <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-400">Click to upload new banner</p>
            </label>
          </div>
          {imageUrl && (
            <div className="mt-4">
              <img src={imageUrl} alt="Banner Preview" className="max-h-32 rounded-xl border" />
            </div>
          )}
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Countdown Deadline</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input 
              type="datetime-local" 
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold flex items-center gap-2"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Configuration
        </button>

        {statusMsg && (
          <div className={`p-4 rounded-xl flex items-center gap-2 ${statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            {statusMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-semibold">{statusMsg.text}</span>
          </div>
        )}
      </div>
    </div>
  );
};
