import React, { useState, useEffect } from 'react';
import { Terminal, Loader2 } from 'lucide-react';
import { apiFetch } from '../../lib/apiConfig';

export const AdminHtaccessViewer: React.FC = () => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('debug_htaccess.php')
      .then(data => {
        if (typeof data === 'string') {
          setContent(data);
        } else if (data && typeof data === 'object' && 'content' in data) {
          setContent(data.content);
        } else {
          setContent(JSON.stringify(data, null, 2));
        }
        setLoading(false);
      })
      .catch(err => {
        setContent(`Error loading .htaccess: ${err.message}`);
        setLoading(false);
      });
  }, []);

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center">
            <Terminal className="w-5 h-5 mr-2 text-sky-500" /> .htaccess Contents
        </h2>
        {loading ? 
          <div className="p-8 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            Loading .htaccess files...
          </div> : 
          <pre className="text-[11px] bg-slate-950 text-sky-300 p-4 rounded-xl overflow-x-auto border border-slate-800 font-mono">
              {content}
          </pre>
        }
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 font-medium">
            <strong>Security Warning:</strong> This viewer exposes sensitive server configuration. Please delete the `/api/v1/debug_htaccess.php` file immediately after you have obtained the information you need.
        </div>
    </div>
  );
};
