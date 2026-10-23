import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Trash2, Edit3, CheckCircle, Upload, Shield, Sparkles, Globe, Key, Lock, Server, Smartphone, Zap, RefreshCw } from 'lucide-react';
import { uploadImageApi, uploadMediaApi, API_BASE_URL, apiFetch } from '../../lib/apiConfig';
import { payheroService, PayHeroConfig } from '../../services/payhero-service';

export interface PaymentGatewayRecord {
  id: string;
  name: string;
  slug: string;
  logoUrl: string;
  isActive: boolean;
  apiKey: string;
  secretKey: string;
  environment: 'sandbox' | 'production';
  createdAt: string;
}

const DEFAULT_GATEWAYS: PaymentGatewayRecord[] = [
  {
    id: 'gw-1',
    name: 'Visa / Mastercard (Stripe)',
    slug: 'visa',
    logoUrl: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=400&q=80',
    isActive: true,
    apiKey: 'pk_live_51M...',
    secretKey: 'sk_live_51M...',
    environment: 'production',
    createdAt: '2025-01-15'
  },
  {
    id: 'gw-2',
    name: 'Google Pay API',
    slug: 'googlepay',
    logoUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=400&q=80',
    isActive: true,
    apiKey: 'AIzaSyGooglePayKey...',
    secretKey: 'gpay_sec_9981',
    environment: 'production',
    createdAt: '2025-01-15'
  },
  {
    id: 'gw-3',
    name: 'PayPal Checkout',
    slug: 'paypal',
    logoUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=400&q=80',
    isActive: true,
    apiKey: 'AY-PayPal-Client-ID...',
    secretKey: 'EL-PayPal-Secret...',
    environment: 'production',
    createdAt: '2025-01-18'
  },
  {
    id: 'gw-4',
    name: 'M-Pesa (Daraja API)',
    slug: 'mpesa',
    logoUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=400&q=80',
    isActive: true,
    apiKey: 'Safaricom_Consumer_Key...',
    secretKey: 'Safaricom_Consumer_Secret...',
    environment: 'production',
    createdAt: '2025-02-01'
  }
];

export const AdminPaymentIntegrationsTab: React.FC = () => {
  const [gateways, setGateways] = useState<PaymentGatewayRecord[]>(DEFAULT_GATEWAYS);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('sandbox');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // PayHero state
  const [payheroConfig, setPayheroConfig] = useState<PayHeroConfig>({
    apiKey: '',
    apiSecret: '',
    authToken: '',
    channelId: '3501',
    provider: 'm-pesa',
    isActive: true,
    environment: 'production'
  });
  const [isSavingPayhero, setIsSavingPayhero] = useState(false);

  useEffect(() => {
    payheroService.getPayHeroConfig().then(cfg => {
      if (cfg) setPayheroConfig(cfg);
    });
  }, []);

  const handleSavePayhero = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPayhero(true);
    try {
      await payheroService.savePayHeroConfig(payheroConfig);
      setNotification('PayHero M-Pesa STK Push settings saved and activated!');
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save PayHero config.');
    } finally {
      setIsSavingPayhero(false);
    }
  };

  // Fetch gateways from PHP API on mount
  useEffect(() => {
    apiFetch('payment-gateways')
      .then(data => {
        if (data && Array.isArray(data)) {
          setGateways(data);
          localStorage.setItem('uqlearn_payment_gateways', JSON.stringify(data));
        } else if (data && data.success && Array.isArray(data.data)) {
          setGateways(data.data);
          localStorage.setItem('uqlearn_payment_gateways', JSON.stringify(data.data));
        } else {
          // Fallback to localStorage
          const saved = localStorage.getItem('uqlearn_payment_gateways');
          if (saved) setGateways(JSON.parse(saved));
        }
      })
      .catch(() => {
        try {
          const saved = localStorage.getItem('uqlearn_payment_gateways');
          if (saved) setGateways(JSON.parse(saved));
        } catch (e) {
          console.error(e);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const syncToApi = async (gatewayData: PaymentGatewayRecord, method: 'POST' | 'DELETE', deleteId?: string) => {
    try {
      if (method === 'DELETE') {
        await apiFetch(`payment-gateways?id=${deleteId}`, { method: 'DELETE' });
      } else {
        await apiFetch('payment-gateways', {
          method: 'POST',
          body: JSON.stringify(gatewayData)
        });
      }
    } catch (err) {
      console.error('API sync error:', err);
    }
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setName('');
    setSlug('');
    setLogoUrl('');
    setIsActive(true);
    setApiKey('');
    setSecretKey('');
    setEnvironment('sandbox');
    setIsModalOpen(true);
  };

  const handleEditGateway = (gw: PaymentGatewayRecord) => {
    setEditingId(gw.id);
    setName(gw.name);
    setSlug(gw.slug);
    setLogoUrl(gw.logoUrl);
    setIsActive(gw.isActive);
    setApiKey(gw.apiKey);
    setSecretKey(gw.secretKey);
    setEnvironment(gw.environment);
    setIsModalOpen(true);
  };

  const handleDeleteGateway = async (id: string) => {
    if (confirm('Are you sure you want to remove this payment gateway integration?')) {
      const updated = gateways.filter(g => g.id !== id);
      setGateways(updated);
      localStorage.setItem('uqlearn_payment_gateways', JSON.stringify(updated));
      await syncToApi({} as any, 'DELETE', id);
      setNotification('Payment gateway removed successfully.');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleSaveGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newSlug = slug.trim() || name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const defaultLogo = 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=400&q=80';

    let updated: PaymentGatewayRecord[];
    if (editingId) {
      updated = gateways.map(g => g.id === editingId ? {
        ...g,
        name,
        slug: newSlug,
        logoUrl: logoUrl.trim() || g.logoUrl || defaultLogo,
        isActive,
        apiKey,
        secretKey,
        environment
      } : g);
      setNotification(`Payment gateway "${name}" updated successfully.`);
    } else {
      const newGateway: PaymentGatewayRecord = {
        id: `gw-${Date.now()}`,
        name,
        slug: newSlug,
        logoUrl: logoUrl.trim() || defaultLogo,
        isActive,
        apiKey,
        secretKey,
        environment,
        createdAt: new Date().toISOString().split('T')[0]
      };
      updated = [...gateways, newGateway];
      setNotification(`Payment gateway "${name}" added successfully.`);
    }

    setGateways(updated);
    localStorage.setItem('uqlearn_payment_gateways', JSON.stringify(updated));

    const targetGw = updated.find(g => g.id === (editingId || updated[updated.length - 1].id));
    if (targetGw) {
      await syncToApi(targetGw, 'POST');
    }

    setIsModalOpen(false);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleToggleActive = async (id: string) => {
    const updated = gateways.map(g => g.id === id ? { ...g, isActive: !g.isActive } : g);
    setGateways(updated);
    localStorage.setItem('uqlearn_payment_gateways', JSON.stringify(updated));

    const targetGw = updated.find(g => g.id === id);
    if (targetGw) {
      await syncToApi(targetGw, 'POST');
    }

    setNotification('Gateway status updated.');
    setTimeout(() => setNotification(null), 2500);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <CreditCard className="w-5 h-5 text-rose-500" />
              <span>Payment Gateway Integrations</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage payment providers, upload custom logos, configure API keys & credentials for your shared host PHP backend.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center space-x-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Payment Gateway</span>
          </button>
        </div>

        {notification && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* PayHero M-Pesa Integration Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-6 border border-emerald-500/30 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-black text-base text-white">PayHero M-Pesa STK Push (API v2)</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Recommended Kenya Gateway
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Instant mobile checkout via Safaricom M-Pesa STK Push prompts directly on students' phones.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={payheroConfig.isActive}
                  onChange={(e) => setPayheroConfig({ ...payheroConfig, isActive: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                <span className="ml-2 text-xs font-bold text-slate-300">
                  {payheroConfig.isActive ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>
          </div>

          <form onSubmit={handleSavePayhero} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-300 mb-1">PayHero API Key *</label>
              <input
                type="text"
                required
                placeholder="e.g. ph_live_xxx or ph_test_xxx"
                value={payheroConfig.apiKey}
                onChange={(e) => setPayheroConfig({ ...payheroConfig, apiKey: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl font-mono text-emerald-400 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">PayHero API Secret / Token *</label>
              <input
                type="password"
                required
                placeholder="PayHero API Secret Token"
                value={payheroConfig.apiSecret}
                onChange={(e) => setPayheroConfig({ ...payheroConfig, apiSecret: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl font-mono text-emerald-400 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Channel ID (Wallet / Till / Paybill Channel)</label>
              <input
                type="text"
                required
                placeholder="e.g. 63902"
                value={payheroConfig.channelId}
                onChange={(e) => setPayheroConfig({ ...payheroConfig, channelId: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl font-mono text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Payment Provider</label>
              <select
                value={payheroConfig.provider}
                onChange={(e) => setPayheroConfig({ ...payheroConfig, provider: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="m-pesa">Safaricom M-Pesa STK Push</option>
                <option value="airtel-money">Airtel Money</option>
              </select>
            </div>

            <div className="md:col-span-2 pt-2 flex items-center justify-between border-t border-slate-800/80">
              <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>Endpoint: <code>https://backend.payhero.co.ke/api/v2/payments</code></span>
              </span>

              <button
                type="submit"
                disabled={isSavingPayhero}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow-lg transition-all flex items-center space-x-2 cursor-pointer"
              >
                {isSavingPayhero ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                <span>Save PayHero Credentials</span>
              </button>
            </div>
          </form>
        </div>



        {/* Gateways Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {gateways.map((gw) => (
            <div 
              key={gw.id} 
              className={`p-5 rounded-2xl border transition-all space-y-4 ${
                gw.isActive 
                  ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs' 
                  : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/70 dark:border-slate-800/70 opacity-75'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img 
                    src={gw.logoUrl} 
                    alt={gw.name} 
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=400&q=80'; }}
                    className="w-12 h-12 object-cover rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">{gw.name}</h3>
                    <p className="text-[11px] font-mono text-slate-400">slug: {gw.slug}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(gw.id)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                      gw.isActive 
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' 
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {gw.isActive ? 'Active' : 'Disabled'}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 font-mono bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-400">Environment:</span>
                  <span className={`uppercase font-bold text-[10px] px-1.5 py-0.5 rounded ${gw.environment === 'production' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}`}>
                    {gw.environment}
                  </span>
                </div>
                <div className="flex justify-between truncate">
                  <span className="text-slate-400">API Key:</span>
                  <span className="truncate max-w-[180px]">{gw.apiKey ? gw.apiKey.substring(0, 12) + '...' : 'Not Set'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] text-slate-400">Added: {gw.createdAt}</span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleEditGateway(gw)}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Configure</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteGateway(gw.id)}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                    title="Delete Gateway"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {editingId ? 'Configure Payment Gateway' : 'Add New Payment Gateway'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGateway} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 dark:text-slate-300">Gateway Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Flutterwave, Paystack, Stripe, M-Pesa"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 dark:text-slate-300">Slug Identifier</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. flutterwave (auto-generated if empty)"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 dark:text-slate-300">Logo Image URL or Upload</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://... or upload file"
                    className="flex-1 px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
                  />
                  <label className="px-4 py-2.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold rounded-xl border border-indigo-200 dark:border-indigo-800 cursor-pointer flex items-center space-x-1 shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingLogo ? 'Uploading...' : 'Upload'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setUploadingLogo(true);
                          try {
                            const result = await uploadMediaApi(file, undefined, 'assets');
                            const up = typeof result === 'string' ? { success: true, url: result, path: result } : result;
                            
                            if (up && (up as any).success && ((up as any).url || (up as any).path)) {
                              setLogoUrl((up as any).url || (up as any).path || '');
                            } else {
                              // Fallback reader
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                if (ev.target?.result) setLogoUrl(ev.target.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          } catch (err) {
                            console.error('Logo upload error:', err);
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              if (ev.target?.result) setLogoUrl(ev.target.result as string);
                            };
                            reader.readAsDataURL(file);
                          } finally {
                            setUploadingLogo(false);
                          }
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">Environment</label>
                  <select
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
                  >
                    <option value="sandbox">Sandbox / Testing</option>
                    <option value="production">Production / Live</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">Status</label>
                  <select
                    value={isActive ? 'active' : 'disabled'}
                    onChange={(e) => setIsActive(e.target.value === 'active')}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
                  >
                    <option value="active">Active (Enabled)</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 dark:text-slate-300">API Key / Client ID</label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="e.g. pk_live_..."
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 dark:text-slate-300">Secret Key / Consumer Secret</label>
                <input
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="e.g. sk_live_..."
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  {editingId ? 'Save Changes' : 'Add Gateway'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
