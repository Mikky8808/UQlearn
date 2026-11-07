import React, { useState, useEffect } from 'react';
import { Mail, RefreshCw, X, Loader2 } from 'lucide-react';
import { apiFetch } from '../../lib/apiConfig';

export const AbandonedCarts: React.FC = () => {
  const [carts, setCarts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reminderModal, setReminderModal] = useState<any | null>(null);
  const [customBody, setCustomBody] = useState('');
  const [templateType, setTemplateType] = useState('nudge');
  const [isSending, setIsSending] = useState(false);
  const [page, setPage] = useState(0);

  const getTemplateBody = (type: string, learnerName: string, courseTitle: string) => {
    switch (type) {
      case 'scarcity': return `Hi ${learnerName},\n\nYour cart is about to expire. We've saved ${courseTitle} for you, but spots are filling up fast.\n\nWe would hate for you to miss out on this cohort.\n\n[ Complete Enrollment Now ]`;
      case 'incentive': return `Hi ${learnerName},\n\nWe noticed ${courseTitle} is still in your cart. To help you get started, we'd love to offer you 10% off your enrollment!\n\n[ Apply Discount & Checkout ]`;
      default: return `Hi ${learnerName},\n\nWe noticed you left ${courseTitle} in your cart.\n\nYour spot isn't secure until you complete your enrollment. Don't miss out on the opportunity to upskill and advance your career!\n\n[ Complete Enrollment Now ]`;
    }
  };

  const openReminderModal = (cart: any) => {
    setReminderModal(cart);
    setTemplateType('nudge');
    setCustomBody(getTemplateBody('nudge', cart.learnerName, cart.items[0]));
  };

  useEffect(() => {
    if (reminderModal) {
      setCustomBody(getTemplateBody(templateType, reminderModal.learnerName, reminderModal.items[0]));
    }
  }, [templateType]);

  const fetchCarts = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('admin-carts.php');
      if (res.success) {
        setCarts(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCarts();
  }, []);

  const sendReminder = async (learnerId: string) => {
    setIsSending(true);
    try {
      await apiFetch('admin-send-reminder.php', {
        method: 'POST',
        body: JSON.stringify({ learner_id: learnerId, custom_message: customBody, template_type: templateType })
      });
      alert('Reminder sent successfully!');
      setReminderModal(null);
      fetchCarts();
    } catch (e) {
      alert('Failed to send reminder.');
    } finally {
      setIsSending(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-slate-500">Loading...</div>;

  return (
    <div className="bg-white dark:bg-slate-950 p-6 md:p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-black text-slate-950 dark:text-slate-50">Abandoned Carts</h2>
        <button onClick={fetchCarts} className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full cursor-pointer transition-colors">
          <RefreshCw className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-slate-500 uppercase font-bold border-b border-slate-100 dark:border-slate-800">
            <tr>
              <th className="py-4 px-4">Learner</th>
              <th className="py-4 px-4">Email</th>
              <th className="py-4 px-4">Items</th>
              <th className="py-4 px-4">Last Reminded</th>
              <th className="py-4 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {carts.slice(page * 10, (page + 1) * 10).map(c => (
              <tr key={c.learnerId} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                <td className="py-4 px-4 font-bold text-slate-950 dark:text-slate-100">{c.learnerName}</td>
                <td className="py-4 px-4 text-slate-600 dark:text-slate-400">{c.email}</td>
                <td className="py-4 px-4 text-slate-600 dark:text-slate-400">{c.items.join(', ')}</td>
                <td className="py-4 px-4 text-slate-500">{c.lastNotified || 'Never'}</td>
                <td className="py-4 px-4 text-right">
                  <button 
                    onClick={() => openReminderModal(c)}
                    className="inline-flex items-center space-x-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-all cursor-pointer shadow-md hover:shadow-teal-500/20"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Remind</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center mt-8 border-t border-slate-100 dark:border-slate-800 pt-6">
        <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 rounded-xl cursor-pointer font-bold text-sm transition-colors">Previous</button>
        <span className="text-sm text-slate-500 font-medium">Page {page + 1} of {Math.max(1, Math.ceil(carts.length / 10))}</span>
        <button disabled={(page + 1) * 10 >= carts.length} onClick={() => setPage(p => p + 1)} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 rounded-xl cursor-pointer font-bold text-sm transition-colors">Next</button>
      </div>

      {reminderModal && <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-950 flex flex-col p-6 md:p-12 overflow-y-auto">
        <div className="max-w-4xl mx-auto w-full">
          <div className="flex justify-between items-center mb-12">
            <h3 className="text-4xl font-black text-slate-950 dark:text-slate-50">Send Reminder</h3>
            <button onClick={() => setReminderModal(null)} className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X className="w-8 h-8" /></button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1 space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-2">Recipient</label>
                <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 font-bold text-slate-950 dark:text-slate-100">{reminderModal.email}</div>
              </div>
              
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-2">Select Template</label>
                <select className="w-full p-4 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-950 dark:text-slate-100 cursor-pointer" onChange={(e) => setTemplateType(e.target.value)} value={templateType}>
                   <option value="nudge">1-Hour Nudge (Gentle)</option>
                   <option value="scarcity">24-Hour Scarcity (Urgent)</option>
                   <option value="incentive">10% Discount Incentive</option>
                </select>
              </div>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-xs font-black text-slate-400 uppercase mb-2">Message Preview</label>
              <textarea className="w-full p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium h-96 mb-6 resize-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" value={customBody} onChange={(e) => setCustomBody(e.target.value)} />
              
              <div className="flex justify-end space-x-4">
                <button onClick={() => setReminderModal(null)} className="px-8 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl font-black text-sm cursor-pointer transition-colors">Cancel</button>
                <button 
                  onClick={() => sendReminder(reminderModal.learnerId)} 
                  disabled={isSending}
                  className="inline-flex items-center space-x-2 px-8 py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-black text-sm cursor-pointer transition-all shadow-lg hover:shadow-teal-500/20 disabled:opacity-50"
                >
                  {isSending ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Sending...</span></> : <span>Send Email</span>}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>}
    </div>
  );
};
