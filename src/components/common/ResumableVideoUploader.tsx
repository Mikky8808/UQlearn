import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  UploadCloud, 
  Film, 
  Pause, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  X,
  Gauge,
  Clock,
  Layers,
  Sparkles,
  FileText,
  FileSpreadsheet,
  MonitorPlay,
  Image as ImageIcon,
  Mic,
  HardDrive,
  AlignLeft,
  FileIcon,
  ArrowLeft,
  Maximize2,
  FolderOpen
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { API_BASE_URL } from '../../lib/apiConfig';
import { ResumableChunkUploader } from '../../lib/resumableUploader';

export type ResumableStatus = 'idle' | 'uploading' | 'paused' | 'retrying' | 'completed' | 'error';

export const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return <FileText className="w-full h-full text-rose-500" />;
    case 'doc':
    case 'docx':
      return <FileText className="w-full h-full text-blue-500" />;
    case 'xls':
    case 'xlsx':
    case 'csv':
      return <FileSpreadsheet className="w-full h-full text-emerald-500" />;
    case 'ppt':
    case 'pptx':
      return <MonitorPlay className="w-full h-full text-orange-500" />;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
    case 'svg':
      return <ImageIcon className="w-full h-full text-purple-500" />;
    case 'mp3':
    case 'wav':
    case 'ogg':
      return <Mic className="w-full h-full text-amber-500" />;
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
      return <HardDrive className="w-full h-full text-slate-500" />;
    case 'txt':
      return <AlignLeft className="w-full h-full text-slate-400" />;
    case 'mp4':
    case 'mov':
    case 'avi':
    case 'mkv':
    case 'webm':
      return <Film className="w-full h-full text-indigo-500" />;
    default:
      return <FileIcon className="w-full h-full text-slate-400" />;
  }
};

export interface ResumableUploadProgress {
  percentage: number;
  uploadedBytes: number;
  totalBytes: number;
  speedBps: number;
  speedFormatted: string;
  remainingSeconds: number;
  remainingFormatted: string;
  chunkCurrent: number;
  chunkTotal: number;
  uploadId: string;
}

interface ResumableVideoUploaderProps {
  onUploadComplete?: (result: { url: string; file_path: string; userId?: string; file_size?: number; total_bytes?: number }) => void;
  onProgress?: (progress: ResumableUploadProgress) => void;
  onStatusChange?: (status: ResumableStatus) => void;
  onFileSelect?: (file: File) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  folder?: string;
  userId?: string;
  userEmail?: string;
  maxSizeMB?: number;
  label?: string;
  description?: string;
  initialFile?: File | null;
  autoStart?: boolean;
  mode?: 'inline' | 'modal' | 'fullscreen';
  triggerButtonText?: string;
  className?: string;
}

const GoogleDriveSvg = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 87.3 78" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.65-2.85 7.6-13.15c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 10.15z" fill="#ea4335"/>
    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.45-1.2h-18.6c-1.55 0-3.1.4-4.45 1.2z" fill="#00832d"/>
    <path d="m59.8 53-16.15-28-13.75 23.8 16.15 28h27.5c0-1.55-.4-3.1-1.2-4.5z" fill="#2684fc"/>
    <path d="m73.4 23.45-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28 16.15-28c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
  </svg>
);

const FolderDeviceSvg = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 20H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2z" className="text-blue-600 dark:text-blue-400 stroke-blue-600 dark:stroke-blue-400" />
    <path d="M2 10h20" className="text-blue-600 dark:text-blue-400 stroke-blue-600 dark:stroke-blue-400" />
  </svg>
);

export const ResumableVideoUploader: React.FC<ResumableVideoUploaderProps> = ({
  onUploadComplete,
  onProgress,
  onStatusChange,
  onFileSelect,
  isOpen: propIsOpen,
  onOpenChange,
  folder = 'videos',
  userId: propUserId,
  userEmail: propUserEmail,
  maxSizeMB = 500,
  label = 'Upload video file',
  description = '',
  initialFile = null,
  autoStart = true,
  mode = 'modal',
  triggerButtonText = 'Upload Video',
  className = ''
}) => {
  const { currentUser, setAuthModalMode } = useApp();
  const effectiveUserId = propUserId || currentUser?.id || currentUser?.email || 'user_anon';
  const effectiveUserEmail = propUserEmail || currentUser?.email || '';

  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isModalOpen = propIsOpen !== undefined ? propIsOpen : internalIsOpen;
  const setModalOpen = (val: boolean) => {
    setInternalIsOpen(val);
    if (onOpenChange) onOpenChange(val);
  };

  const [file, setFile] = useState<File | null>(initialFile);
  const [uploadSource, setUploadSource] = useState<'device' | 'gdrive'>('device');
  const [gdriveUrl, setGdriveUrl] = useState('');
  const [gdriveLoading, setGdriveLoading] = useState(false);
  const [gdriveError, setGdriveError] = useState<string | null>(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const [status, setStatus] = useState<ResumableStatus>('idle');
  const [progress, setProgress] = useState<ResumableUploadProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedResult, setCompletedResult] = useState<{ url: string; file_path: string; userId?: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const chunkUploaderRef = useRef<ResumableChunkUploader | null>(null);

  const handleGoogleDriveImport = (urlInput: string) => {
    if (!currentUser || !currentUser.email) {
      setErrorMessage('You must be logged in to import videos. Please log in first.');
      if (setAuthModalMode) {
        setAuthModalMode('login');
      }
      return;
    }

    if (!urlInput.trim()) {
      setGdriveError('Please enter a valid Google Drive video URL or file ID.');
      return;
    }
    setGdriveError(null);
    setGdriveLoading(true);

    try {
      let fileId = urlInput.trim();
      const match = urlInput.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || 
                    urlInput.match(/id=([a-zA-Z0-9_-]+)/) ||
                    urlInput.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        fileId = match[1];
      }

      const streamUrl = `https://drive.google.com/file/d/${fileId}/preview`;
      const fileName = `Google_Drive_Lecture_${fileId.slice(0, 8)}.mp4`;
      
      const resultObj = {
        url: streamUrl,
        file_path: fileName,
        userId: effectiveUserId,
        file_size: 104857600,
        total_bytes: 104857600
      };

      setCompletedResult(resultObj);
      changeStatus('completed');
      if (onUploadComplete) {
        onUploadComplete(resultObj);
      }
    } catch (err: any) {
      setGdriveError('Invalid Google Drive URL format. Please check the link and try again.');
    } finally {
      setGdriveLoading(false);
    }
  };

  const changeStatus = (newStatus: ResumableStatus) => {
    setStatus(newStatus);
    if (onStatusChange) onStatusChange(newStatus);
  };

  useEffect(() => {
    if (initialFile) {
      if ((mode === 'modal' || mode === 'fullscreen') && propIsOpen === undefined) {
        setModalOpen(true);
      }
      handleFileSelected(initialFile, autoStart);
    }
  }, [initialFile]);

  useEffect(() => {
    if (isModalOpen && (mode === 'modal' || mode === 'fullscreen') && typeof document !== 'undefined') {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isModalOpen, mode]);

  const handleFileSelected = (selectedFile: File, shouldAutoStart: boolean = true) => {
    if (!currentUser || !currentUser.email) {
      setErrorMessage('You must be logged in to upload videos. Please log in first.');
      if (setAuthModalMode) {
        setAuthModalMode('login');
      }
      return;
    }

    const isVideo = selectedFile.type.startsWith('video/');
    const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip', 'rar'];
    const extension = selectedFile.name.split('.').pop()?.toLowerCase() || '';
    const isAllowedOther = allowedExtensions.includes(extension);

    if (!isVideo && !isAllowedOther) {
      setErrorMessage('Please select a valid video file or document (PDF, Word, Excel, etc.).');
      return;
    }
    if (selectedFile.size > maxSizeMB * 1024 * 1024) {
      setErrorMessage(`File size exceeds maximum limit of ${maxSizeMB}MB.`);
      return;
    }

    setErrorMessage(null);
    setFile(selectedFile);
    changeStatus('idle');
    setProgress(null);
    setCompletedResult(null);

    if (onFileSelect) {
      onFileSelect(selectedFile);
    }

    if (shouldAutoStart) {
      setTimeout(() => startDirectUploadWithFile(selectedFile), 100);
    }
  };

  const startDirectUploadWithFile = (targetFile: File) => {
    setErrorMessage(null);
    changeStatus('uploading');

    if (chunkUploaderRef.current) {
      chunkUploaderRef.current.cancel();
    }

    const uploader = new ResumableChunkUploader({
      file: targetFile,
      folder,
      userId: effectiveUserId,
      userEmail: effectiveUserEmail,
      chunkSize: 2 * 1024 * 1024, // 2MB chunks to safely stay under post_max_size / LiteSpeed limits for large files (1GB+)
      onProgress: (p) => {
        setProgress(p);
        if (onProgress) onProgress(p);
      },
      onStatusChange: (st) => {
        changeStatus(st);
      },
      onSuccess: (res) => {
        changeStatus('completed');
        const sizeBytes = (res as any).total_bytes || (res as any).file_size || targetFile.size;
        const resultObj = {
          url: res.url,
          file_path: res.file_path,
          userId: res.userId || effectiveUserId,
          file_size: sizeBytes,
          total_bytes: sizeBytes
        };
        setCompletedResult(resultObj);
        if (onUploadComplete) {
          onUploadComplete(resultObj);
        }
        if (mode === 'modal' || mode === 'fullscreen') {
          setTimeout(() => {
            setModalOpen(false);
            handleReset();
          }, 2000);
        }
      },
      onError: (err) => {
        changeStatus('error');
        setErrorMessage(err);
      }
    });

    chunkUploaderRef.current = uploader;
    uploader.start();
  };

  const handleStart = () => {
    if (file) {
      startDirectUploadWithFile(file);
    }
  };

  const handleReset = () => {
    if (chunkUploaderRef.current) {
      chunkUploaderRef.current.cancel();
      chunkUploaderRef.current = null;
    }
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    setFile(null);
    setStatus('idle');
    setProgress(null);
    setErrorMessage(null);
    setCompletedResult(null);
  };

  if (mode === 'inline') {
    return (
      <div className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">{label}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
          </div>
          {file && status !== 'uploading' && (
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-rose-600 hover:text-rose-700 font-bold"
            >
              Change File
            </button>
          )}
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {!file ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              const droppedFile = e.dataTransfer.files?.[0];
              if (droppedFile) handleFileSelected(droppedFile, true);
            }}
            className={`p-8 rounded-none border-2 border-dashed transition-all flex flex-col items-center text-center space-y-4 ${
              isDragOver
                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40'
                : 'border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-indigo-400'
            }`}
          >
            <div className="w-14 h-14 rounded-none bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-none">
              <UploadCloud className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Drag &amp; drop your video file here, or click to browse
              </p>
            </div>

            <label className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-none border border-indigo-600 text-xs font-black uppercase tracking-wider transition-all shadow-none cursor-pointer">
              Select Video File
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const selected = e.target.files?.[0];
                  if (selected) handleFileSelected(selected, true);
                }}
              />
            </label>
          </div>
        ) : (
          <div className="p-5 bg-slate-50 dark:bg-slate-900/80 rounded-none border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className="w-10 h-10 rounded-none bg-indigo-100 dark:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  {getFileIcon(file.name)}
                </div>
                <div className="truncate">
                  <p className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                    {file.name}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>

              {status === 'idle' && (
                <button
                  type="button"
                  onClick={handleStart}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-none border border-indigo-600 text-xs font-black uppercase tracking-wider transition-all shadow-none cursor-pointer flex items-center space-x-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Upload Now</span>
                </button>
              )}

              {status === 'uploading' && (
                <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold animate-pulse">
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Uploading...</span>
                </div>
              )}

              {status === 'error' && (
                <button
                  type="button"
                  onClick={handleStart}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-none border border-rose-600 text-xs font-bold"
                >
                  Retry
                </button>
              )}

              {status === 'completed' && (
                <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-black text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Completed</span>
                </div>
              )}
            </div>

            {status !== 'idle' && progress && (
              <div className="space-y-3 pt-3 border-t border-slate-200/60 dark:border-slate-800">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {status === 'completed' ? '100% Uploaded Successfully' : 'Uploading Video Clip'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-none font-black text-xs border ${
                        status === 'completed' 
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800' 
                          : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                      }`}>
                        {progress.percentage}%
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                      {(progress.uploadedBytes / (1024 * 1024)).toFixed(1)} / {(progress.totalBytes / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  </div>

                  <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-none overflow-hidden p-0 border border-slate-200 dark:border-slate-700">
                    <div
                      className={`h-full rounded-none transition-all duration-300 ${
                        status === 'completed'
                          ? 'bg-emerald-500'
                          : status === 'error'
                          ? 'bg-rose-500'
                          : 'bg-indigo-600'
                      }`}
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{progress.speedFormatted || 'Uploading...'}</span>
                    <span>{progress.remainingFormatted || ''}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Modal / Fullscreen Mode
  const fullScreenContent = (
    <div className="fixed inset-0 z-[99999] bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col min-h-screen w-screen overflow-y-auto animate-fadeIn">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
          <button
            type="button"
            onClick={() => {
              handleReset();
              setModalOpen(false);
            }}
            className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-none text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-none shrink-0"
            title="Return to Course Studio"
          >
            <ArrowLeft className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="hidden xs:inline">Back to Studio</span>
            <span className="xs:hidden">Back</span>
          </button>
          
          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block shrink-0" />

          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2 truncate">
              <Film className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 hidden sm:inline" />
              <span className="truncate">{label}</span>
            </h2>
            {description ? <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden md:block">{description}</p> : null}
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              handleReset();
              setModalOpen(false);
            }}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-none transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Full-Screen Body */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-8 space-y-6 flex flex-col justify-center">
        {errorMessage && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-none text-xs flex items-center space-x-3 shadow-none animate-shake">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {!file ? (
          <div className="space-y-6">
            {/* Dual Upload Source Selector: My Device & Google Drive */}
            <div className="flex items-center justify-center gap-8 sm:gap-14 p-6 sm:p-8 bg-slate-100/70 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
              {/* My Device Option */}
              <button
                type="button"
                onClick={() => setUploadSource('device')}
                className={`flex flex-col items-center space-y-2.5 group cursor-pointer transition-all ${
                  uploadSource === 'device' ? 'scale-105' : 'opacity-70 hover:opacity-100'
                }`}
              >
                <div className={`w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 shadow-md border flex items-center justify-center transition-all ${
                  uploadSource === 'device' 
                    ? 'border-blue-500 ring-4 ring-blue-500/20 shadow-lg' 
                    : 'border-slate-200 dark:border-slate-700 group-hover:border-blue-400'
                }`}>
                  <FolderDeviceSvg className="w-8 h-8" />
                </div>
                <span className={`text-xs font-bold transition-colors ${
                  uploadSource === 'device' ? 'text-blue-600 dark:text-blue-400 font-black' : 'text-slate-700 dark:text-slate-300'
                }`}>
                  My Device
                </span>
              </button>

              {/* Google Drive Option */}
              <button
                type="button"
                onClick={() => setUploadSource('gdrive')}
                className={`flex flex-col items-center space-y-2.5 group cursor-pointer transition-all ${
                  uploadSource === 'gdrive' ? 'scale-105' : 'opacity-70 hover:opacity-100'
                }`}
              >
                <div className={`w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 shadow-md border flex items-center justify-center transition-all ${
                  uploadSource === 'gdrive' 
                    ? 'border-blue-500 ring-4 ring-blue-500/20 shadow-lg' 
                    : 'border-slate-200 dark:border-slate-700 group-hover:border-blue-400'
                }`}>
                  <GoogleDriveSvg className="w-8 h-8" />
                </div>
                <span className={`text-xs font-bold transition-colors ${
                  uploadSource === 'gdrive' ? 'text-blue-600 dark:text-blue-400 font-black' : 'text-slate-700 dark:text-slate-300'
                }`}>
                  Google Drive
                </span>
              </button>
            </div>

            {uploadSource === 'device' ? (
              /* Local Device Drag & Drop Area */
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  const droppedFile = e.dataTransfer.files?.[0];
                  if (droppedFile) handleFileSelected(droppedFile, true);
                }}
                className={`p-8 sm:p-12 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center text-center justify-center space-y-6 min-h-[320px] relative overflow-hidden ${
                  isDragOver
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
                    : 'border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 hover:border-indigo-500/80 hover:bg-slate-100/50 dark:hover:bg-slate-900/80'
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/90 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs relative z-10">
                  <UploadCloud className="w-8 h-8" />
                </div>

                <div className="space-y-1.5 relative z-10 max-w-md">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
                    Drag &amp; drop your lecture video here
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Supports MP4, MOV, MKV, AVI, WebM and course documents up to 500MB
                  </p>
                </div>

                <label className="relative z-10 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl border border-indigo-600 text-xs font-black uppercase tracking-wider transition-all shadow-xs cursor-pointer flex items-center space-x-2">
                  <UploadCloud className="w-4 h-4" />
                  <span>Select Video From My Device</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                    className="hidden"
                    onChange={(e) => {
                      const selected = e.target.files?.[0];
                      if (selected) handleFileSelected(selected, true);
                    }}
                  />
                </label>
              </div>
            ) : (
              /* Google Drive Import Interface */
              <div className="p-8 sm:p-12 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 flex flex-col items-center text-center justify-center space-y-6 min-h-[320px] relative">
                <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-center">
                  <GoogleDriveSvg className="w-9 h-9" />
                </div>

                <div className="space-y-1.5 max-w-lg">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
                    Import Lecture Video from Google Drive
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Paste your Google Drive video share link or file ID below to stream directly into your course module.
                  </p>
                </div>

                {gdriveError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl max-w-md w-full font-medium">
                    {gdriveError}
                  </div>
                )}

                <div className="w-full max-w-lg space-y-3">
                  <div className="relative w-full">
                    <input
                      type="text"
                      value={gdriveUrl}
                      onChange={(e) => setGdriveUrl(e.target.value)}
                      placeholder="https://drive.google.com/file/d/1A2B3C4D.../view"
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleGoogleDriveImport(gdriveUrl)}
                      disabled={gdriveLoading || !gdriveUrl.trim()}
                      className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl border border-blue-600 text-xs font-black uppercase tracking-wider transition-all shadow-xs cursor-pointer flex items-center justify-center space-x-2"
                    >
                      <GoogleDriveSvg className="w-4 h-4" />
                      <span>{gdriveLoading ? 'Importing...' : 'Import from Google Drive'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Production Guidelines Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-none space-y-1.5 shadow-none">
                <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider">
                  <Film className="w-4 h-4" />
                  <span>1080p / 4K UHD</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Record in Full HD (1920x1080) or 4K with 16:9 widescreen ratio for crisp presentation on all learner screens.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-none space-y-1.5 shadow-none">
                <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider">
                  <HardDrive className="w-4 h-4" />
                  <span>Studio Ingestion</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Uploaded footage is stored directly into your library and immediately accessible across your course modules.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-6 sm:p-8 space-y-6 shadow-none">
            {/* File Info Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-4 min-w-0">
                <div className="w-14 h-14 rounded-none bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-none">
                  {getFileIcon(file.name)}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100 truncate max-w-lg">
                    {file.name}
                  </h3>
                  <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">
                    <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                    <span>•</span>
                    <span className="uppercase font-bold text-indigo-600 dark:text-indigo-400">{file.name.split('.').pop() || 'FILE'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 shrink-0">
                {status === 'idle' && (
                  <button
                    type="button"
                    onClick={handleStart}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-none border border-indigo-600 text-xs font-black uppercase tracking-wider transition-all shadow-none cursor-pointer flex items-center space-x-1.5"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Upload Now</span>
                  </button>
                )}

                {status === 'uploading' && (
                  <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold px-4 py-2 bg-indigo-50 dark:bg-indigo-950/80 rounded-none border border-indigo-200 dark:border-indigo-800 animate-pulse">
                    <RotateCcw className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                    <span>Uploading...</span>
                  </div>
                )}

                {status === 'error' && (
                  <button
                    type="button"
                    onClick={handleStart}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-none border border-rose-600 text-xs font-bold transition-all shadow-none cursor-pointer"
                  >
                    Retry Upload
                  </button>
                )}

                {status === 'completed' && (
                  <div className="flex items-center space-x-1.5 text-emerald-700 dark:text-emerald-400 font-black text-xs px-4 py-2 bg-emerald-50 dark:bg-emerald-950/80 rounded-none border border-emerald-300 dark:border-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Upload Completed</span>
                  </div>
                )}
              </div>
            </div>

            {/* Progress Section */}
            {status !== 'idle' && progress && (
              <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center space-x-2.5">
                    <span className="font-black text-slate-800 dark:text-slate-200">
                      {status === 'completed' ? '100% Uploaded & Verified' : 'Uploading Video Footage'}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-none font-black text-xs border ${
                      status === 'completed' 
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800' 
                        : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 text-indigo-300 border-indigo-200 dark:border-indigo-800'
                    }`}>
                      {progress.percentage}%
                    </span>
                  </div>
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400 font-bold">
                    {(progress.uploadedBytes / (1024 * 1024)).toFixed(1)} MB / {(progress.totalBytes / (1024 * 1024)).toFixed(1)} MB
                  </span>
                </div>

                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-none overflow-hidden p-0 border border-slate-200 dark:border-slate-700">
                  <div
                    className={`h-full rounded-none transition-all duration-300 ${
                      status === 'completed'
                        ? 'bg-emerald-500'
                        : status === 'error'
                        ? 'bg-rose-500'
                        : 'bg-indigo-600'
                    }`}
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
                  <span className="flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>{progress.speedFormatted || 'Calculating speed...'}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{progress.remainingFormatted || ''}</span>
                  </span>
                </div>
              </div>
            )}

            {/* Video Preview When Completed */}
            {status === 'completed' && completedResult?.url && (
              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Film className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Video Playback Preview</span>
                  </span>
                  <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    Direct Stream Ready
                  </span>
                </div>

                {['mp4', 'mov', 'webm', 'ogg'].includes(file.name.split('.').pop()?.toLowerCase() || '') ? (
                  <div className="w-full max-h-[380px] bg-black rounded-none overflow-hidden border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                    <video
                      src={completedResult.url}
                      controls
                      playsInline
                      className="w-full max-h-[380px] object-contain"
                    />
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-none border border-slate-200 dark:border-slate-800 flex items-center space-x-3 text-xs text-slate-700 dark:text-slate-300">
                    <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span className="font-mono truncate">{completedResult.url}</span>
                  </div>
                )}

                {/* Return or Upload More Buttons */}
                <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-none text-xs font-bold transition-all cursor-pointer"
                  >
                    Upload Another File
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleReset();
                      setModalOpen(false);
                    }}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-none border border-emerald-600 text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Done &amp; Return to Studio</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={className || "px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer shrink-0"}
      >
        <UploadCloud className="w-4 h-4 shrink-0" />
        <span className="truncate">{triggerButtonText}</span>
      </button>

      {isModalOpen && (typeof document !== 'undefined' ? createPortal(fullScreenContent, document.body) : fullScreenContent)}
    </>
  );
};
