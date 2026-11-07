import React, { useState, useEffect } from 'react';
import { Mail, RefreshCw, AlertCircle } from 'lucide-react';
import { apiFetch, API_ENDPOINTS } from '../../lib/apiConfig';

export const AdminAbandonedCartsTab: React.FC = () => {
  const [carts, setCarts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<Record<string, boolean>>({});

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
    setProcessing(p => ({ ...p, [learnerId]: true }));
    try {
      await apiFetch('admin-send-reminder.php', {
        method: 'POST',
        body: JSON.stringify({ learner_id: learnerId })
      });
      alert('Reminder sent successfully!');
    } catch (e) {
      alert('Failed to send reminder.');
    } finally {
      setProcessing(p => ({ ...p, [learnerId]: false }));
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">Abandoned Carts</h2>
        <button onClick={fetchCarts} className="p-2 bg-slate-100 rounded-full cursor-pointer"><RefreshCw className="w-4 h-4" /></button>
      </div>
      <table className="w-full text-xs text-left">
        <thead className="text-slate-500 uppercase font-bold border-b dark:border-slate-800">
          <tr>
            <th className="py-3 px-2">Learner</th>
            <th className="py-3 px-2">Email</th>
            <th className="py-3 px-2">Items</th>
            <th className="py-3 px-2">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y dark:divide-slate-800">
          {carts.map(c => (
            <tr key={c.learnerId}>
              <td className="py-3 px-2 font-bold">{c.learnerName}</td>
              <td className="py-3 px-2">{c.email}</td>
              <td className="py-3 px-2">{c.items.join(', ')}</td>
              <td className="py-3 px-2">
                <button 
                  onClick={() => sendReminder(c.learnerId)}
                  disabled={processing[c.learnerId]}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-teal-600 text-white rounded-lg font-bold disabled:opacity-50 cursor-pointer"
                >
                  <Mail className="w-3 h-3" />
                  <span>{processing[c.learnerId] ? 'Sending...' : 'Send Reminder'}</span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
