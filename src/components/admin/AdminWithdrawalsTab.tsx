import React, { useState, useEffect } from 'react';
import { DollarSign, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { apiFetch } from '../../lib/apiConfig';

export const AdminWithdrawalsTab: React.FC<{ onUserClick: (userId: string) => void }> = ({ onUserClick }) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // Assuming instructor-payout.php without userId returns all
      const data = await apiFetch('instructor-payout.php?action=withdrawals', { silent: true });
      if (Array.isArray(data)) {
        setRequests(data);
      } else if (data && data.success) {
        setRequests(Array.isArray(data.data) ? data.data : []);
      } else {
        setRequests([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch withdrawal requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-indigo-500" />
          Instructor Withdrawals
        </h3>
        <button 
          onClick={fetchRequests}
          className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-500">Loading payout requests...</div>
      ) : error ? (
        <div className="text-center py-10 text-rose-500 flex items-center justify-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-10 text-slate-500">No payout requests found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-2">Instructor</th>
                <th className="py-3 px-2">Amount</th>
                <th className="py-3 px-2">Status</th>
                <th className="py-3 px-2">Date</th>
                <th className="py-3 px-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {Array.isArray(requests) && requests.length > 0 ? requests.map((req: any) => (
                <tr key={req.id} className="text-slate-700 dark:text-slate-300">
                  <td className="py-3 px-2 font-bold">
                    <button 
                      onClick={() => onUserClick(req.instructorId || req.userId)}
                      className="text-indigo-600 hover:underline cursor-pointer"
                    >
                      {req.instructorName || 'Unknown'}
                    </button>
                  </td>
                  <td className="py-3 px-2 font-mono">${parseFloat(req.amount || 0).toFixed(2)}</td>
                  <td className="py-3 px-2 capitalize">{req.status || 'Pending'}</td>
                  <td className="py-3 px-2">{req.createdAt || 'N/A'}</td>
                  <td className="py-3 px-2 flex gap-2">
                    {req.status === 'pending' && (
                      <button 
                        onClick={async () => {
                          try {
                            await apiFetch('instructor-payout.php', {
                              method: 'POST',
                              body: JSON.stringify({ action: 'update_status', id: req.id, status: 'paid' })
                            });
                            fetchRequests();
                          } catch (e) {
                            console.error('Failed to mark as paid', e);
                          }
                        }}
                        className="text-emerald-500 hover:text-emerald-600"
                        title="Mark as Paid"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button className="text-rose-500 hover:text-rose-600"><XCircle className="w-4 h-4" /></button>
                  </td>
                </tr>
              )) : (
                <tr>
                    <td colSpan={5} className="py-3 px-2 text-center text-slate-500">No requests</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
