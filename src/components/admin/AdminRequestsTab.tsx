import React, { useState, useEffect } from 'react';
import { 
  Inbox, 
  Search, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Check, 
  Filter, 
  MessageSquare, 
  User, 
  BookOpen, 
  Send,
  Loader2,
  RefreshCw,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { CommunicationRequest } from '../../types';
import { fetchRequestsApi, updateRequestStatusApi } from '../../lib/apiConfig';

export const AdminRequestsTab: React.FC = () => {
  const [requests, setRequests] = useState<CommunicationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'declined'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // Active modal state
  const [activeReq, setActiveReq] = useState<CommunicationRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'decline'>('approve');
  const [adminNote, setAdminNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const data = await fetchRequestsApi({ recipientType: 'admin' });
      if (Array.isArray(data)) {
        setRequests(data);
      } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
        setRequests(data.data);
      } else {
        setRequests([]);
      }
    } catch (err) {
      console.error('Failed to load admin requests', err);
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReq) return;

    setIsSubmitting(true);
    const newStatus = actionType === 'approve' ? 'approved' : 'declined';
    
    try {
      await updateRequestStatusApi(activeReq.id, newStatus, adminNote, 'Admin');
      setRequests(prev => {
        if (!Array.isArray(prev)) {
            console.error('prev is not an array in handleProcess', prev);
            return [];
        }
        return prev.map(r => r.id === activeReq.id ? {
          ...r,
          status: newStatus,
          replyNote: adminNote || (newStatus === 'approved' ? 'Request approved by system admin.' : 'Request declined by admin.'),
          repliedBy: 'Admin'
        } : r);
      });

      setActionSuccessMsg(`Request from ${activeReq.senderName} successfully ${newStatus}!`);
      setActiveReq(null);
      setAdminNote('');
      setTimeout(() => setActionSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to update request', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!Array.isArray(requests)) {
      console.error('requests is not an array:', requests);
      return <div className="p-4 text-rose-500">Error: Invalid request data format.</div>;
  }

  const filteredRequests = requests.filter(req => {
    const matchesFilter = statusFilter === 'all' || req.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || 
      req.senderName.toLowerCase().includes(q) ||
      req.senderEmail.toLowerCase().includes(q) ||
      req.title.toLowerCase().includes(q) ||
      req.details.toLowerCase().includes(q) ||
      (req.courseTitle && req.courseTitle.toLowerCase().includes(q));
    return matchesFilter && matchesSearch;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const declinedCount = requests.filter(r => r.status === 'declined').length;

  return (
    <div className="space-y-6">
      {/* Top Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <Inbox className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Instructor & User Requests to Admin</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Review and manage requests sent to the platform administration (course approvals, payout checks, sponsorship, etc.).
          </p>
        </div>

        <button
          onClick={loadRequests}
          disabled={isLoading}
          className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Requests</span>
        </button>
      </div>

      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-2xl text-xs font-bold flex items-center space-x-2 shadow-xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {(['all', 'pending', 'approved', 'declined'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {st === 'all' ? 'All Requests' : st}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search sender, title, detail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Requests Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="py-4 px-6">Sender Info</th>
                <th className="py-4 px-6">Type & Course</th>
                <th className="py-4 px-6">Request Title & Content</th>
                <th className="py-4 px-6">Date</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span>Loading requests from database...</span>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No requests found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredRequests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{req.senderName}</div>
                      <div className="text-[11px] text-slate-400">{req.senderEmail}</div>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold uppercase">
                        {req.senderType}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px] font-bold uppercase">
                        {req.type}
                      </span>
                      {req.courseTitle && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate max-w-[150px]" title={req.courseTitle}>
                          {req.courseTitle}
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-6 max-w-xs">
                      <div className="font-bold text-slate-800 dark:text-slate-200 truncate" title={req.title}>{req.title}</div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5" title={req.details}>
                        {req.details}
                      </p>
                      {req.replyNote && (
                        <div className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          Note: {req.replyNote}
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-6 text-slate-400 text-[11px] whitespace-nowrap">
                      {req.date}
                    </td>

                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        req.status === 'pending'
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/60'
                          : req.status === 'approved'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60'
                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/60'
                      }`}>
                        {req.status}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      {req.status === 'pending' ? (
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => {
                              setActiveReq(req);
                              setActionType('approve');
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] transition-all flex items-center space-x-1 cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => {
                              setActiveReq(req);
                              setActionType('decline');
                            }}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-[11px] transition-all flex items-center space-x-1 cursor-pointer"
                          >
                            <XCircle className="w-3 h-3" />
                            <span>Decline</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Processed ({req.repliedBy || 'Admin'})</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Response Modal */}
      {activeReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {actionType === 'approve' ? 'Approve Request' : 'Decline Request'}
              </h3>
              <button
                onClick={() => setActiveReq(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs space-y-1">
                <span className="font-bold text-slate-900 dark:text-slate-100">{activeReq.senderName} ({activeReq.senderType})</span>
                <p className="text-slate-500 line-clamp-2">"{activeReq.details}"</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Admin Response Note
                </label>
                <textarea
                  rows={3}
                  placeholder="Note attached to email/in-app notification..."
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setActiveReq(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleProcess}
                disabled={isSubmitting}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all cursor-pointer flex items-center space-x-1.5 ${
                  actionType === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm {actionType === 'approve' ? 'Approval' : 'Decline'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
