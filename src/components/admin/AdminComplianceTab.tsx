import React, { useState, useEffect } from 'react';
import { Check, X, Video, Loader2 } from 'lucide-react';
import { API_BASE_URL, apiFetch } from '../../lib/apiConfig';

export const AdminComplianceTab: React.FC = () => {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const data = await apiFetch('compliance-manage.php');
      setSubmissions(data || []);
    } catch (error) {
      console.error('Failed to fetch:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await apiFetch('compliance-manage.php', {
        method: 'POST',
        body: JSON.stringify({ id, status }),
      });
      fetchSubmissions();
    } catch (error) {
      console.error('Failed to update:', error);
    }
  };

  if (loading) return <div className="p-6 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" /></div>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">Instructor Compliance Review</h2>
      
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold uppercase text-[10px]">
            <tr>
              <th className="py-3 px-4">Instructor</th>
              <th className="py-3 px-4">Video/Summary</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((sub) => (
              <tr key={sub.id} className="border-t border-slate-200 dark:border-slate-800 align-top">
                <td className="py-4 px-4">
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    {sub.instructor_name || 'Unknown Instructor'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">ID: {sub.instructor_id}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{new Date(sub.created_at).toLocaleDateString()}</div>
                </td>
                <td className="py-4 px-4 max-w-md">
                  {sub.file_path && (
                    <div className="mb-3 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black aspect-video w-full max-w-[320px]">
                      <video 
                        src={sub.file_path} 
                        controls 
                        className="w-full h-full"
                        controlsList="nodownload"
                      />
                    </div>
                  )}
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
                    "{sub.summary || 'No summary provided.'}"
                  </p>
                </td>
                <td className={`py-4 px-4 capitalize font-black text-[10px] tracking-wider ${
                  sub.status === 'approved' ? 'text-emerald-600' : sub.status === 'rejected' ? 'text-rose-600' : 'text-amber-600'
                }`}>
                  <span className={`px-2 py-1 rounded-full ${
                    sub.status === 'approved' ? 'bg-emerald-50 dark:bg-emerald-950/30' : 
                    sub.status === 'rejected' ? 'bg-rose-50 dark:bg-rose-950/30' : 
                    'bg-amber-50 dark:bg-amber-950/30'
                  }`}>
                    {sub.status}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => updateStatus(sub.id, 'approved')} 
                      title="Approve Instructor"
                      className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm transition-all cursor-pointer"
                    >
                      <Check className="w-4 h-4"/>
                    </button>
                    <button 
                      onClick={() => updateStatus(sub.id, 'rejected')} 
                      title="Reject Instructor"
                      className="p-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-600 dark:text-slate-300 rounded-xl transition-all cursor-pointer"
                    >
                      <X className="w-4 h-4"/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
