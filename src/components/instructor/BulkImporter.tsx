import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  FileVideo, 
  FileText, 
  FileArchive, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Loader2,
  Plus,
  Trash2,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { API_ENDPOINTS, apiFetch, API_BASE_URL } from '../../lib/apiConfig';

interface FileProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  category: 'lecture' | 'resource' | 'image';
  url?: string;
}

interface BulkImporterProps {
  onUploadComplete?: () => void;
}

export const BulkImporter: React.FC<BulkImporterProps> = ({ onUploadComplete }) => {
  const { currentUser } = useApp();
  const [queue, setQueue] = useState<FileProgress[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [serverLimits, setServerLimits] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchLimits = async () => {
      try {
        const result = await apiFetch('media-upload.php');
        if (result && result.success) setServerLimits(result.limits);
      } catch (e) {
        console.error("Failed to fetch server limits");
      }
    };
    fetchLimits();
  }, []);

  const determineCategory = (file: File): 'lecture' | 'resource' | 'image' => {
    const videoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'];
    if (videoTypes.includes(file.type) || file.name.match(/\.(mp4|mov|avi|mkv|webm)$/i)) return 'lecture';
    if (imageTypes.includes(file.type) || file.name.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i)) return 'image';
    return 'resource';
  };

  const handleFileSelection = (files: FileList | null) => {
    if (!files) return;

    const archiveTypes = ['application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed', 'application/x-7z-compressed'];
    
    // Check against server limits if available
    let maxBytes = 256 * 1024 * 1024; // Default 256MB fallback
    if (serverLimits?.upload_max_filesize) {
      const unit = serverLimits.upload_max_filesize.slice(-1).toUpperCase();
      const value = parseInt(serverLimits.upload_max_filesize);
      if (unit === 'M') maxBytes = value * 1024 * 1024;
      if (unit === 'G') maxBytes = value * 1024 * 1024 * 1024;
    }

    const newFiles = Array.from(files)
      .filter(file => !archiveTypes.includes(file.type) && !file.name.endsWith('.zip'))
      .map(file => {
        const isTooLarge = file.size > maxBytes;
        return {
          file,
          progress: 0,
          status: isTooLarge ? 'error' as const : 'pending' as const,
          category: determineCategory(file),
          error: isTooLarge ? `File exceeds server limit (${serverLimits?.upload_max_filesize})` : undefined
        };
      });

    if (newFiles.length < files.length) {
      alert("ZIP and Archive files are not allowed for upload. Please upload individual videos and documents.");
    }

    setQueue(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
  };

  const clearQueue = () => {
    setQueue([]);
  };

  const uploadBatch = async () => {
    const pendingFiles = queue.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    // Mark all pending files as uploading to provide early user feedback
    setQueue(prev => prev.map(f => f.status === 'pending' ? { ...f, status: 'uploading', progress: 0 } : f));

    // Upload each pending file individually to prevent exceeding post_max_size
    for (let i = 0; i < pendingFiles.length; i++) {
      const pendingItem = pendingFiles[i];
      const filename = pendingItem.file.name;

      try {
        await new Promise<void>((resolve, reject) => {
          const formData = new FormData();
          // Use 'fileData' key to match media-upload.php's upload standard
          formData.append('fileData', pendingItem.file);
          if (currentUser?.id) {
            formData.append('user_id', currentUser.id);
          }

          const xhr = new XMLHttpRequest();

          // Monitor real-time progress of this individual file
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percentComplete = Math.round((event.loaded / event.total) * 100);
              setQueue(prev => prev.map(item => 
                item.file.name === filename ? { ...item, progress: percentComplete } : item
              ));
            }
          };

          xhr.onload = () => {
            try {
              const result = JSON.parse(xhr.responseText);
              if (result.success) {
                const uploaded = result.data && result.data[0];
                setQueue(prev => prev.map(item => {
                  if (item.file.name === filename) {
                    return { 
                      ...item, 
                      status: 'completed', 
                      progress: 100, 
                      url: uploaded ? uploaded.url : (result.url || '')
                    };
                  }
                  return item;
                }));
                resolve();
              } else {
                reject(new Error(result.message || 'Upload failed'));
              }
            } catch (error: any) {
              reject(new Error('Invalid response from server'));
            }
          };

          xhr.onerror = () => {
            reject(new Error('Network error occurred during upload.'));
          };

          // Use the proxy-friendly relative path
          xhr.open('POST', `${API_BASE_URL.replace(/\/+$/, '')}/media-upload.php`);
          if (currentUser?.id || currentUser?.email) {
            xhr.setRequestHeader('X-User-Id', currentUser.id || currentUser.email);
          }
          xhr.send(formData);
        });
      } catch (error: any) {
        setQueue(prev => prev.map(item => 
          item.file.name === filename ? { 
            ...item, 
            status: 'error', 
            error: error.message 
          } : item
        ));
      }
    }

    if (onUploadComplete) {
      onUploadComplete();
    }
  };

  const getFileIcon = (category: string, type: string) => {
    if (category === 'lecture') return <FileVideo className="w-5 h-5 text-teal-500" />;
    if (category === 'image') return <ImageIcon className="w-5 h-5 text-indigo-500" />;
    if (type.includes('pdf')) return <FileText className="w-5 h-5 text-rose-500" />;
    return <FileText className="w-5 h-5 text-slate-400" />;
  };

  const handleDownloadZip = () => {
    if (!currentUser?.id) return;
    window.open(`${API_BASE_URL.replace(/\/+$/, '')}/download_zip.php?user_id=${currentUser.id}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Bulk Content Importer</h2>
          <p className="text-xs text-slate-500 font-medium">Batch upload videos, PDFs, and code repositories to your courses.</p>
        </div>
        <div className="flex items-center space-x-2">
          {serverLimits && (
            <div className="hidden md:flex items-center space-x-4 mr-4 px-4 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Max Upload</span>
                <span className={`text-[10px] font-bold ${serverLimits.upload_max_filesize === '2M' ? 'text-rose-500' : 'text-teal-600'}`}>
                  {serverLimits.upload_max_filesize}
                </span>
              </div>
              <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Max Post</span>
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{serverLimits.post_max_size}</span>
              </div>
            </div>
          )}
          <button 
            onClick={handleDownloadZip}
            className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 font-bold text-xs rounded-xl shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
          >
            <FileArchive className="w-4 h-4 text-amber-500" />
            <span>Download All as ZIP</span>
          </button>
          {queue.length > 0 && (
            <button 
              onClick={clearQueue}
              className="px-4 py-2 text-slate-500 hover:text-slate-900 font-bold text-xs transition-colors cursor-pointer"
            >
              Clear All
            </button>
          )}
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Select Files</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={(e) => handleFileSelection(e.target.files)}
            multiple 
            className="hidden" 
          />
        </div>
      </div>

      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFileSelection(e.dataTransfer.files);
        }}
        className={`relative border-2 border-dashed rounded-[40px] p-12 transition-all flex flex-col items-center justify-center space-y-4 ${
          isDragging 
            ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-900/20' 
            : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20'
        }`}
      >
        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center ${isDragging ? 'bg-teal-100 text-teal-600' : 'bg-white dark:bg-slate-800 text-slate-400'}`}>
          <Upload className="w-8 h-8" />
        </div>
        <div className="text-center">
          <p className="text-sm font-black text-slate-900 dark:text-slate-100">Drop your batch files here</p>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Videos, PDFs, Documents (Max 100MB per file)</p>
          <p className="text-[10px] text-amber-600 font-black uppercase tracking-tighter mt-2">ZIP files are not allowed</p>
        </div>
      </div>

      {queue.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Upload Queue ({queue.length})</span>
            <button 
              onClick={uploadBatch}
              disabled={queue.every(f => f.status !== 'pending')}
              className="flex items-center space-x-2 px-6 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-lg shadow-teal-900/20 transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Start Batch Upload</span>
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <AnimatePresence>
              {queue.map((item, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="px-6 py-4 flex items-center space-x-4 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    {getFileIcon(item.category, item.file.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-slate-900 dark:text-slate-100 truncate pr-4">
                        {item.file.name}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                    {item.status === 'uploading' ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black text-teal-600 uppercase tracking-widest animate-pulse">Uploading...</span>
                          <span className="text-[10px] font-black text-teal-600">{item.progress}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
                          <motion.div 
                            className="h-full bg-linear-to-r from-teal-600 to-emerald-400 shadow-[0_0_8px_rgba(20,184,166,0.5)]"
                            initial={{ width: 0 }}
                            animate={{ width: `${item.progress}%` }}
                            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${
                          item.status === 'completed' ? 'text-emerald-500' : 
                          item.status === 'error' ? 'text-rose-500' : 'text-slate-400'
                        }`}>
                          {item.status}
                        </span>
                        {item.status === 'completed' && (
                          <div className="flex items-center space-x-2">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">{item.url}</span>
                          </div>
                        )}
                        {item.status === 'error' && (
                          <div className="flex items-center space-x-1 text-rose-500">
                            <AlertCircle className="w-3 h-3" />
                            <span className="text-[10px] font-bold">{item.error}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.status === 'uploading' ? (
                      <Loader2 className="w-4 h-4 text-teal-500 animate-spin" />
                    ) : (
                      <button 
                        onClick={() => removeFile(index)}
                        className="p-2 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
};
