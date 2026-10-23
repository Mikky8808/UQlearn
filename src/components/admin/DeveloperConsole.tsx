import React, { useState, useEffect } from 'react';
import { AlertCircle, X, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { API_ERROR_EVENT, ApiErrorDetail } from '../../lib/apiEvent';

export const DeveloperConsole: React.FC = () => {
  const [logs, setLogs] = useState<ApiErrorDetail[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleApiError = (event: Event) => {
      const customEvent = event as CustomEvent<ApiErrorDetail>;
      setLogs(prev => [customEvent.detail, ...prev].slice(0, 50));
      setIsOpen(true);
    };

    window.addEventListener(API_ERROR_EVENT, handleApiError);
    return () => window.removeEventListener(API_ERROR_EVENT, handleApiError);
  }, []);

  if (logs.length === 0) return null;

  return (
    <div className="fixed bottom-0 right-0 z-50 w-full max-w-2xl bg-slate-900 text-white shadow-2xl border-t border-slate-700">
      <div 
        className="flex items-center justify-between p-3 cursor-pointer bg-slate-800"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <h3 className="font-semibold text-sm">Developer Console ({logs.length})</h3>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); setLogs([]); }} className="p-1 hover:bg-slate-700 rounded"><Trash2 className="w-4 h-4"/></button>
          {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
        </div>
      </div>
      
      {isOpen && (
        <div className="max-h-64 overflow-y-auto p-2 text-xs font-mono space-y-2">
          {logs.map((log, i) => (
            <div key={i} className="border-b border-slate-800 pb-1">
              <div className="flex gap-2">
                <span className="text-red-400">[{log.status || 'ERR'}]</span>
                <span className="truncate">{log.url}</span>
                <span className="text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
              </div>
              <div className="text-slate-300 mt-1">{log.error}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
