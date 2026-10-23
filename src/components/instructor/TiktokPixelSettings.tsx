import React, { useState, useEffect } from 'react';
import { Sparkles, Save, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { apiFetch } from '../../lib/apiConfig';

interface TiktokPixelSettingsProps {
  currentUser: any;
}

export const TiktokPixelSettings: React.FC<TiktokPixelSettingsProps> = ({ currentUser }) => {
  const [pixelId, setPixelId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isValid, setIsValid] = useState<boolean | null>(null);

  const validatePixelId = (id: string) => {
    // Basic TikTok Pixel ID regex: C followed by 15 alphanumeric characters
    return /^C[A-Za-z0-9]{15}$/.test(id);
  };

  useEffect(() => {
    if (currentUser?.id) {
      fetchPixelId();
    }
  }, [currentUser?.id]);

  const fetchPixelId = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch(`tiktok-pixel.php?userId=${encodeURIComponent(currentUser.id)}`);
      if (res && res.success && res.pixelId) {
        setPixelId(res.pixelId);
        setIsValid(validatePixelId(res.pixelId));
      }
    } catch (err) {
      console.error('Failed to fetch TikTok Pixel ID', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPixelId(value);
    setIsValid(value ? validatePixelId(value) : null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid === false) return;
    
    setError('');
    setMessage('');
    setIsSaving(true);
    try {
      const res = await apiFetch('tiktok-pixel.php', {
        method: 'POST',
        body: JSON.stringify({ userId: currentUser.id, pixelId })
      });
      if (res && res.success) {
        setMessage('TikTok Pixel ID saved successfully!');
      } else {
        throw new Error(res.message || 'Failed to save TikTok Pixel ID');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save TikTok Pixel ID');
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-xs">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">TikTok Pixel Integration</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure your TikTok Pixel ID to track conversions and optimize your ad campaigns.
        </p>
      </div>

      {message && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-none flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-none flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              TikTok Pixel ID *
            </label>
            {isValid !== null && (
              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${isValid ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                {isValid ? 'Active' : 'Invalid'}
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type="text"
              value={pixelId}
              onChange={handleInputChange}
              placeholder="e.g. C1234567890ABCDEF"
              className={`w-full px-4 py-3 bg-white dark:bg-slate-900 border ${
                isValid === null ? 'border-slate-200 dark:border-slate-700' : 
                isValid ? 'border-emerald-500' : 'border-rose-500'
              } rounded-none text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none`}
            />
            {isValid !== null && (
              <div className="absolute right-3 top-3.5">
                {isValid ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                )}
              </div>
            )}
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 flex items-center space-x-1">
             <Info className="w-3 h-3" />
             <span>The Pixel ID must start with 'C' followed by 15 alphanumeric characters.</span>
          </p>
        </div>
        
        <div className="pt-3">
          <button
            type="submit"
            disabled={isSaving || isLoading || isValid === false}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-none shadow-md shadow-indigo-500/20 transition-all cursor-pointer flex items-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Pixel ID'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
