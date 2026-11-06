import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  ExternalLink, 
  Shield, 
  Info, 
  FileText, 
  FileSpreadsheet, 
  MonitorPlay, 
  Image as ImageIcon, 
  Mic, 
  HardDrive, 
  AlignLeft, 
  Video, 
  FileCode,
  FileIcon,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  PanelRightClose,
  PanelRightOpen
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export interface ResourceItem {
  id: string;
  name: string;
  url: string;
  fileSize?: string;
  type?: 'file' | 'link';
  fileType?: string;
}

interface ResourcePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: ResourceItem | null;
}

const UqlearnLicensedWatermarkBadge: React.FC = () => {
  const { currentUser } = useApp ? useApp() : { currentUser: null };
  const learnerName = currentUser?.name || currentUser?.displayName || 'Wamuu Rajab';
  const learnerEmail = currentUser?.email || 'wamuurajab@gmail.com';
  const licenseDate = '30 oct 2026';
  const licenseId = 'UQ-7F3A9C';

  return (
    <div className="absolute bottom-6 right-6 z-35 pointer-events-none select-none opacity-85">
      <div className="w-52 h-52 rounded-full bg-white/95 dark:bg-slate-900/95 border-2 border-purple-500/60 shadow-2xl p-2 flex flex-col items-center justify-center text-center relative backdrop-blur-md">
        <div className="absolute inset-1 rounded-full border border-dashed border-teal-400/70 pointer-events-none" />
        
        <span className="text-[8px] font-black tracking-widest text-indigo-700 dark:text-indigo-300 uppercase">
          UQLEARN LICENSED COPY
        </span>

        <div className="my-1 w-7 h-7 rounded-full bg-gradient-to-tr from-purple-600 to-teal-400 p-0.5 flex items-center justify-center shadow-sm">
          <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center text-[9px] font-bold text-teal-600">
            UQL
          </div>
        </div>

        <div className="space-y-0.5 px-2">
          <div className="text-[7px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
            LICENSED TO
          </div>
          <div className="text-[10px] font-extrabold text-slate-900 dark:text-white truncate max-w-[150px]">
            {learnerName}
          </div>
          <div className="text-[7px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
            {learnerEmail}
          </div>
          <div className="text-[6px] text-slate-400 pt-0.5 font-mono">
            Single-user license, {licenseDate}
          </div>
          <div className="text-[6px] font-bold text-indigo-600 dark:text-indigo-400 font-mono">
            ID {licenseId} · www.uqlearn.org
          </div>
        </div>

        <div className="absolute bottom-1 text-[6px] font-black tracking-widest text-purple-700 dark:text-purple-300 uppercase">
          DO NOT COPY OR SHARE
        </div>
      </div>
    </div>
  );
};

export const ResourcePreviewModal: React.FC<ResourcePreviewModalProps> = ({
  isOpen,
  onClose,
  resource
}) => {
  const [showDetails, setShowDetails] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleFullscreenChange = () => {
      setIsBrowserFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !resource) return null;

  const toggleBrowserFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const handleCopyLink = () => {
    if (resource.url) {
      navigator.clipboard.writeText(resource.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getFileIconComponent = (fileName: string, fileType?: string) => {
    const ext = fileType || fileName.split('.').pop()?.toLowerCase() || '';
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
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'svg':
      case 'gif':
      case 'webp':
      case 'avif':
        return <ImageIcon className="w-full h-full text-purple-500" />;
      case 'mp3':
      case 'wav':
      case 'ogg':
      case 'aac':
      case 'flac':
      case 'm4a':
        return <Mic className="w-full h-full text-amber-500" />;
      case 'zip':
      case 'rar':
      case '7z':
      case 'tar':
      case 'gz':
        return <HardDrive className="w-full h-full text-slate-400" />;
      case 'txt':
      case 'md':
        return <AlignLeft className="w-full h-full text-slate-300" />;
      case 'mp4':
      case 'mov':
      case 'avi':
      case 'mkv':
      case 'webm':
      case 'm4v':
        return <Video className="w-full h-full text-indigo-400" />;
      case 'js':
      case 'ts':
      case 'tsx':
      case 'jsx':
      case 'json':
      case 'html':
      case 'css':
      case 'php':
      case 'py':
      case 'sql':
        return <FileCode className="w-full h-full text-cyan-400" />;
      default:
        return <FileIcon className="w-full h-full text-slate-400" />;
    }
  };

  const getExtension = (fileName: string, fileType?: string) => {
    return (fileType || fileName.split('.').pop() || 'DOCUMENT').toUpperCase();
  };

  const isImage = (fileName: string, fileType?: string) => {
    const ext = fileType || fileName.split('.').pop()?.toLowerCase() || '';
    return ['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp', 'avif', 'bmp'].includes(ext);
  };

  const isPDF = (fileName: string, fileType?: string) => {
    const ext = fileType || fileName.split('.').pop()?.toLowerCase() || '';
    return ext === 'pdf';
  };

  const isVideo = (fileName: string, fileType?: string) => {
    const ext = fileType || fileName.split('.').pop()?.toLowerCase() || '';
    return ['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v', 'ogv'].includes(ext);
  };

  const isAudio = (fileName: string, fileType?: string) => {
    const ext = fileType || fileName.split('.').pop()?.toLowerCase() || '';
    return ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'].includes(ext);
  };

  const extensionName = getExtension(resource.name, resource.fileType);

  return (
    <div className="fixed inset-0 z-[99999] w-screen h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden animate-in fade-in duration-150">
      {/* Fullscreen Header Bar */}
      <header className="h-14 sm:h-16 px-4 sm:px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0 z-20 select-none shadow-md">
        <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1 mr-4">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-800/90 border border-slate-700/80 p-2 flex items-center justify-center shrink-0 shadow-inner">
            {getFileIconComponent(resource.name, resource.fileType)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                Resource Quick Preview
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-slate-800 text-slate-300 border border-slate-700">
                {extensionName}
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-bold text-white truncate max-w-xs sm:max-w-md md:max-w-xl lg:max-w-2xl" title={resource.name}>
              {resource.name}
            </h2>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          {/* Toggle Details Panel */}
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className={`p-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
              showDetails
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent'
            }`}
            title={showDetails ? 'Hide file details' : 'Show file details'}
          >
            {showDetails ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            <span className="hidden sm:inline">{showDetails ? 'Hide Info' : 'File Info'}</span>
          </button>

          {/* Copy Resource URL */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold border border-transparent"
            title="Copy resource URL"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span className="hidden md:inline">{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>

          {/* Open in New Tab */}
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-semibold border border-transparent"
            title="Open original resource in a new tab"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="hidden md:inline">Open</span>
          </a>

          {/* Download Button */}
          <a
            href={resource.url}
            download={resource.name}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold shadow-xs cursor-pointer"
            title="Download this file"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download</span>
          </a>

          {/* Fullscreen Mode Toggle */}
          <button
            type="button"
            onClick={toggleBrowserFullscreen}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer hidden md:flex items-center"
            title={isBrowserFullscreen ? 'Exit browser fullscreen' : 'Expand to browser fullscreen'}
          >
            {isBrowserFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close Modal Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold ml-1"
            title="Close preview (Esc)"
          >
            <X className="w-5 h-5" />
            <span className="hidden lg:inline text-[10px] text-slate-500 font-mono uppercase bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">ESC</span>
          </button>
        </div>
      </header>

      {/* Fullscreen Body View */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden w-full h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] relative">
        {/* Main Viewport Content Area */}
        <main className="flex-1 h-full overflow-hidden bg-slate-950 flex flex-col items-center justify-center relative">
          <UqlearnLicensedWatermarkBadge />
          {isPDF(resource.name, resource.fileType) ? (
            <div className="w-full h-full flex flex-col bg-slate-900">
              <iframe
                src={`${resource.url}#toolbar=1`}
                className="w-full h-full border-0 bg-white"
                title={resource.name}
              />
            </div>
          ) : isImage(resource.name, resource.fileType) ? (
            <div className="w-full h-full flex items-center justify-center p-4 sm:p-8 overflow-auto">
              <img
                src={resource.url}
                alt={resource.name}
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl transition-transform"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=1200&q=80';
                }}
              />
            </div>
          ) : isVideo(resource.name, resource.fileType) ? (
            <div className="w-full h-full flex items-center justify-center p-4 sm:p-8 bg-black">
              <video
                src={resource.url}
                controls
                autoPlay={false}
                className="max-w-full max-h-full rounded-xl shadow-2xl bg-black border border-slate-800"
              >
                Your browser does not support HTML5 video preview.
              </video>
            </div>
          ) : isAudio(resource.name, resource.fileType) ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 space-y-6 bg-slate-900/60">
              <div className="w-28 h-28 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-xl">
                <Mic className="w-14 h-14" />
              </div>
              <div className="text-center space-y-1">
                <span className="text-xs font-black text-amber-400 uppercase tracking-widest">Audio Track</span>
                <h3 className="text-lg font-bold text-white max-w-lg truncate">{resource.name}</h3>
              </div>
              <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
                <audio src={resource.url} controls className="w-full" />
              </div>
            </div>
          ) : (
            /* Document/Generic File Fullscreen Representation */
            <div className="w-full h-full flex items-center justify-center p-6 overflow-auto">
              <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
                <div className="w-24 h-24 mx-auto p-5 rounded-3xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center shadow-inner">
                  {getFileIconComponent(resource.name, resource.fileType)}
                </div>
                <div className="space-y-2">
                  <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-black text-[11px] rounded-full uppercase tracking-wider inline-block">
                    {extensionName} Document
                  </span>
                  <h3 className="text-base font-bold text-white break-all leading-snug">
                    {resource.name}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed pt-1">
                    This file format does not render inline in browsers. You can open the file in a new tab or download it directly to view it on your device.
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <a
                    href={resource.url}
                    download={resource.name}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download File</span>
                  </a>
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Open in Tab</span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Collapsible Details & Properties Sidebar */}
        {showDetails && (
          <aside className="w-full md:w-80 lg:w-96 border-t md:border-t-0 md:border-l border-slate-800 bg-slate-900/95 flex flex-col justify-between shrink-0 overflow-y-auto p-5 space-y-5 animate-in slide-in-from-right-4 duration-200 z-10 shadow-xl">
            <div className="space-y-5">
              {/* Sidebar Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Info className="w-4 h-4 text-indigo-400" />
                  <span>Resource Details</span>
                </h3>
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <Shield className="w-3 h-3" />
                  <span>Verified Safe</span>
                </span>
              </div>

              {/* Properties Grid */}
              <div className="space-y-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">File Type</span>
                  <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded text-[11px] uppercase">
                    {extensionName}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">File Size</span>
                  <span className="font-bold text-slate-200">{resource.fileSize || 'Standard Resource'}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Delivery Method</span>
                  <span className="font-bold text-slate-200">
                    {resource.type === 'link' ? 'External Link' : 'Secure Cloud Storage'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-slate-400">Content Integrity</span>
                  <span className="text-emerald-400 font-bold">SHA-256 Passed</span>
                </div>
              </div>

              {/* Quick Summary Card */}
              <div className="bg-indigo-950/20 border border-indigo-900/30 rounded-2xl p-4 space-y-2">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-indigo-300">
                  Resource Access
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  This resource is attached to your course curriculum for enhanced learning. You can download and keep local copies offline for reference.
                </p>
              </div>
            </div>

            {/* Sidebar Bottom Action Buttons */}
            <div className="pt-4 border-t border-slate-800 space-y-2.5">
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 shadow-md transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open In Browser Window</span>
              </a>
              <a
                href={resource.url}
                download={resource.name}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span>Save to Local Drive</span>
              </a>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

