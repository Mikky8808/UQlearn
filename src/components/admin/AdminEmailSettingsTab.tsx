import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  KeyRound, 
  Server, 
  ShieldCheck, 
  Copy, 
  Check, 
  Loader2, 
  Zap, 
  Info, 
  Lock,
  Terminal,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { API_ENDPOINTS, apiFetch } from '../../lib/apiConfig';
import { AdminCustomMailPricingTab } from './AdminCustomMailPricingTab';

export const AdminEmailSettingsTab: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'smtp' | 'custom-mail-plan'>('smtp');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Settings State
  const [smtpEnabled, setSmtpEnabled] = useState(false);
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(465);
  const [smtpCrypto, setSmtpCrypto] = useState<'ssl' | 'tls' | 'none'>('ssl');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [fromEmail, setFromEmail] = useState('noreply@uqlearn.org');
  const [fromName, setFromName] = useState('AQLEARN');
  const [replyTo, setReplyTo] = useState('support@uqlearn.org');

  // Diagnostics & OTP Data
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [recentOtps, setRecentOtps] = useState<any[]>([]);
  const [lastEmailLog, setLastEmailLog] = useState<any>(null);

  // Test Email State
  const [testRecipient, setTestRecipient] = useState('MICHAELOMARE045@gmail.com');
  const [testResult, setTestResult] = useState<any>(null);
  const [copiedOtp, setCopiedOtp] = useState<string | null>(null);

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Diagnostics and recent OTPs
      const diagData = await apiFetch('test-email.php');
      if (diagData) {
        setDiagnostics(diagData.diagnostics);
        setRecentOtps(diagData.recent_verification_codes || []);
        setLastEmailLog(diagData.last_email_log);
        if (diagData.smtp_settings) {
          setSmtpEnabled(!!diagData.smtp_settings.enabled);
          setSmtpHost(diagData.smtp_settings.host || '');
          setSmtpPort(diagData.smtp_settings.port || 465);
          setSmtpCrypto(diagData.smtp_settings.crypto || 'ssl');
          setSmtpUser(diagData.smtp_settings.user || '');
          setFromEmail(diagData.smtp_settings.from_email || 'noreply@uqlearn.org');
          setFromName(diagData.smtp_settings.from_name || 'AQLEARN');
          setReplyTo(diagData.smtp_settings.reply_to || 'support@uqlearn.org');
        }
      }
    } catch (err) {
      console.warn('Could not load email diagnostics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Preset Configurations
  const applyPreset = (preset: 'gmail' | 'cpanel' | 'brevo' | 'hostinger') => {
    if (preset === 'gmail') {
      setSmtpEnabled(true);
      setSmtpHost('smtp.gmail.com');
      setSmtpPort(465);
      setSmtpCrypto('ssl');
      setFromEmail('MICHAELOMARE045@gmail.com');
      setStatusMsg({ type: 'success', text: 'Gmail SMTP preset applied. Enter your Gmail App Password below.' });
    } else if (preset === 'cpanel') {
      setSmtpEnabled(true);
      setSmtpHost('mail.uqlearn.org');
      setSmtpPort(465);
      setSmtpCrypto('ssl');
      setFromEmail('noreply@uqlearn.org');
      setStatusMsg({ type: 'success', text: 'cPanel Webmail SMTP preset applied. Enter your mailbox credentials.' });
    } else if (preset === 'brevo') {
      setSmtpEnabled(true);
      setSmtpHost('smtp-relay.brevo.com');
      setSmtpPort(587);
      setSmtpCrypto('tls');
      setStatusMsg({ type: 'success', text: 'Brevo (Sendinblue) SMTP preset applied.' });
    } else if (preset === 'hostinger') {
      setSmtpEnabled(true);
      setSmtpHost('smtp.hostinger.com');
      setSmtpPort(465);
      setSmtpCrypto('ssl');
      setStatusMsg({ type: 'success', text: 'Hostinger Mail SMTP preset applied.' });
    }
    setTimeout(() => setStatusMsg(null), 4000);
  };

  // Save SMTP Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);

    try {
      const data = await apiFetch('email-settings.php', {
        method: 'POST',
        body: JSON.stringify({
          enabled: smtpEnabled,
          host: smtpHost.trim(),
          port: Number(smtpPort),
          crypto: smtpCrypto,
          auth: true,
          user: smtpUser.trim(),
          pass: smtpPass.trim() || undefined,
          from_email: fromEmail.trim(),
          from_name: fromName.trim(),
          reply_to: replyTo.trim()
        })
      });

      if (!data) {
        throw new Error('Failed to save settings');
      }

      setStatusMsg({ type: 'success', text: 'Email & SMTP settings saved and active!' });
      setSmtpPass(''); // clear input for security
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error saving SMTP settings.' });
    } finally {
      setSaving(false);
    }
  };

  // Send Test Email
  const handleSendTestEmail = async () => {
    if (!testRecipient.trim() || !testRecipient.includes('@')) {
      setStatusMsg({ type: 'error', text: 'Please enter a valid recipient email address.' });
      return;
    }

    setTesting(true);
    setTestResult(null);
    setStatusMsg(null);

    try {
      const data = await apiFetch('test-email.php', {
        method: 'POST',
        body: JSON.stringify({
          to: testRecipient.trim(),
          subject: `AQLEARN Mail Delivery Check - ${new Date().toLocaleTimeString()}`
        })
      });

      setTestResult(data);

      if (data) {
        setStatusMsg({ 
          type: 'success', 
          text: `Test email successfully dispatched to ${testRecipient}! Check your Gmail inbox and spam.` 
        });
      } else {
        setStatusMsg({ 
          type: 'error', 
          text: 'Email delivery failed. Review debug log below.' 
        });
      }
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Could not connect to test-email endpoint.' });
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedOtp(text);
    setTimeout(() => setCopiedOtp(null), 2500);
  };

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800 dark:text-slate-100">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
            <Mail className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            <span>Email Delivery & SMTP Configuration</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure outgoing mail server, monitor live email dispatch, and view active user verification codes.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 self-start cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveSection('smtp')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSection === 'smtp'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>System SMTP & Mail Server</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('custom-mail-plan')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSection === 'custom-mail-plan'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Instructor Custom Mail Plan & Pricing</span>
        </button>
      </div>

      {activeSection === 'custom-mail-plan' ? (
        <AdminCustomMailPricingTab />
      ) : (
        <>

      {/* Notifications Alert */}
      {statusMsg && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 text-xs font-bold animate-fadeIn ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
        }`}>
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Why Gmail Drops Mail / PHP mail() Disabled Notice */}
      <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Why are emails failing or not appearing on Shared Hosting?</span>
        </div>
        <p className="text-xs text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
          Most shared hosting providers disable the native PHP <code className="bg-amber-100 dark:bg-amber-900/50 px-1 py-0.5 rounded font-mono">mail()</code> function to prevent spam, and Gmail drops unauthenticated server emails. Enabling <strong>Authenticated SMTP</strong> below (e.g. Gmail with a 16-character App Password, your cPanel Webmail, or Brevo) sends verification codes directly through secure encrypted mail servers to ensure 100% reliable inbox delivery.
        </p>
      </div>

      {/* Grid: Live Test Tool + Status Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: SMTP Settings Form */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-base font-black flex items-center gap-2">
                <Server className="w-4 h-4 text-teal-600" />
                <span>SMTP Server Settings</span>
              </h3>
              <p className="text-xs text-slate-500">Configure your direct outgoing mail server.</p>
            </div>

            {/* Enable Toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                {smtpEnabled ? 'SMTP Active' : 'Native mail()'}
              </span>
              <input
                type="checkbox"
                checked={smtpEnabled}
                onChange={(e) => setSmtpEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-teal-600"></div>
            </label>
          </div>

          {/* Quick Presets */}
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Quick Presets</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset('gmail')}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-600 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>🔴 Gmail SMTP (Port 465)</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('cpanel')}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-600 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>🌐 cPanel Webmail (Port 465)</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('brevo')}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-600 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>⚡ Brevo / Sendinblue (Port 587)</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('hostinger')}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-600 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>🟣 Hostinger Mail</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  SMTP Host Server <span className="text-teal-600">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. smtp.gmail.com or mail.uqlearn.org"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Port
                </label>
                <input
                  type="number"
                  placeholder="465"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Encryption
                </label>
                <select
                  value={smtpCrypto}
                  onChange={(e) => setSmtpCrypto(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:border-teal-500"
                >
                  <option value="ssl">SSL (Port 465)</option>
                  <option value="tls">TLS / STARTTLS (Port 587)</option>
                  <option value="none">None (Insecure)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  SMTP Username / Email
                </label>
                <input
                  type="text"
                  placeholder="e.g. noreply@uqlearn.org or your Gmail"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  SMTP Password / App Key
                </label>
                <input
                  type="password"
                  placeholder="Enter new password to update"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Sender From Email
                </label>
                <input
                  type="email"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Sender Display Name
                </label>
                <input
                  type="text"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Reply-To Email
                </label>
                <input
                  type="email"
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>Save SMTP Configuration</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Col: Live Email Test Dispatcher */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
          <div className="space-y-1">
            <h3 className="text-base font-black flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Live Test Dispatcher</span>
            </h3>
            <p className="text-xs text-slate-500">Send an instant test email and inspect live server logs.</p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Target Email Address
              </label>
              <input
                type="email"
                placeholder="e.g. MICHAELOMARE045@gmail.com"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:border-teal-500"
              />
            </div>

            <button
              type="button"
              onClick={handleSendTestEmail}
              disabled={testing}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting to Mail Server...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Test Email Now</span>
                </>
              )}
            </button>
          </div>

          {/* Test Output Card */}
          {testResult && (
            <div className={`p-4 rounded-2xl border text-xs space-y-2.5 animate-fadeIn ${
              testResult.success 
                ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
            }`}>
              <div className="flex items-center justify-between font-bold">
                <span className={testResult.success ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}>
                  {testResult.success ? '✅ Test Email Delivered' : '❌ Test Email Failed'}
                </span>
                <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                  {testResult.delivery_method}
                </span>
              </div>

              {testResult.generated_test_otp && (
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Generated Test OTP</span>
                    <span className="text-lg font-black tracking-widest font-mono text-teal-600 dark:text-teal-400">
                      {testResult.generated_test_otp}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(testResult.generated_test_otp)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 cursor-pointer"
                    title="Copy OTP"
                  >
                    {copiedOtp === testResult.generated_test_otp ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              )}

              {/* Debug Terminal Output */}
              {testResult.debug_logs && testResult.debug_logs.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                    <Terminal className="w-3 h-3" /> Live Handshake Logs:
                  </span>
                  <div className="p-2.5 bg-slate-950 rounded-xl text-[11px] font-mono text-emerald-400 max-h-36 overflow-y-auto space-y-0.5 select-text">
                    {testResult.debug_logs.map((logLine: string, idx: number) => (
                      <div key={idx} className="break-all">{logLine}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Stats */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs space-y-2 text-slate-500 dark:text-slate-400">
            <div className="flex justify-between">
              <span>PHP Version:</span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{diagnostics?.php_version || '8.x'}</span>
            </div>
            <div className="flex justify-between">
              <span>PHP mail() Function:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {diagnostics?.mail_function_enabled ? 'Available' : 'Disabled'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Socket TLS/SSL:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {diagnostics?.sockets_enabled ? 'Ready' : 'Unavailable'}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Section: Active User Verification Codes Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <h3 className="text-base font-black flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-purple-600" />
              <span>Recent Verification OTP Codes Log</span>
            </h3>
            <p className="text-xs text-slate-500">
              Active one-time confirmation codes generated for user sign-ups and email verifications.
            </p>
          </div>

          <span className="text-xs font-semibold text-slate-400">
            Showing latest {recentOtps.length} records
          </span>
        </div>

        {recentOtps.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-medium">
            No verification codes found in database yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-3">Email Recipient</th>
                  <th className="py-3 px-3">6-Digit Code</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Generated Time</th>
                  <th className="py-3 px-3">Expires At</th>
                  <th className="py-3 px-3 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {recentOtps.map((otp) => (
                  <tr key={otp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                      {otp.email}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono font-black text-sm text-teal-600 dark:text-teal-400 tracking-wider bg-teal-50 dark:bg-teal-950/40 px-2 py-1 rounded-lg border border-teal-200 dark:border-teal-800">
                        {otp.otp_code}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        otp.status === 'ACTIVE_VALID'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : otp.status === 'USED'
                            ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {otp.status === 'ACTIVE_VALID' ? 'Active / Valid' : otp.status === 'USED' ? 'Used' : 'Expired'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                      {otp.created_at}
                    </td>
                    <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                      {otp.expires_at}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => copyToClipboard(otp.otp_code)}
                        className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/50 hover:text-teal-600 rounded-lg text-[11px] font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                        title="Copy OTP Code"
                      >
                        {copiedOtp === otp.otp_code ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Code</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}

    </div>
  );
};
