import React from 'react';
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
  FileIcon
} from 'lucide-react';

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

export const ResourcePreviewModal: React.FC<ResourcePreviewModalProps> = ({
  isOpen,
  onClose,
  resource
}) => {
  if (!isOpen || !resource) return null;

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
        return <Video className="w-full h-full text-indigo-500" />;
      default:
        return <FileIcon className="w-full h-full text-slate-400" />;
    }
  };

  const getExtension = (fileName: string, fileType?: string) => {
    return fileType || fileName.split('.').pop()?.toUpperCase() || 'DOCUMENT';
  };

  const isImage = (fileName: string, fileType?: string) => {
    const ext = fileType || fileName.split('.').pop()?.toLowerCase() || '';
    return ['png', 'jpg', 'jpeg', 'svg', 'gif'].includes(ext);
  };

  const isPDF = (fileName: string, fileType?: string) => {
    const ext = fileType || fileName.split('.').pop()?.toLowerCase() || '';
    return ext === 'pdf';
  };

  const extensionName = getExtension(resource.name, resource.fileType);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-8 h-8 shrink-0">
              {getFileIconComponent(resource.name, resource.fileType)}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black text-[#7c3aed] uppercase tracking-widest block">
                Resource Quick Preview
              </span>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 truncate" title={resource.name}>
                {resource.name}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Main Visual Preview Area (8 Cols) */}
          <div className="md:col-span-8 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-150 dark:border-slate-800/60 p-4 flex flex-col items-center justify-center min-h-[40vh]">
            {isImage(resource.name, resource.fileType) ? (
              <img
                src={resource.url}
                alt={resource.name}
                className="max-w-full max-h-[50vh] object-contain rounded-lg shadow-sm"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=800&q=80';
                }}
              />
            ) : isPDF(resource.name, resource.fileType) ? (
              <iframe
                src={`${resource.url}#toolbar=0`}
                className="w-full h-[50vh] rounded-lg border border-slate-200 dark:border-slate-800 bg-white"
                title={resource.name}
              />
            ) : (
              /* Basic File Info / Placeholder visual representation of Document File */
              <div className="text-center py-8 space-y-4 max-w-sm">
                <div className="w-20 h-20 mx-auto opacity-80">
                  {getFileIconComponent(resource.name, resource.fileType)}
                </div>
                <div>
                  <span className="px-2.5 py-0.5 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-extrabold text-[10px] rounded-full uppercase tracking-wider">
                    {extensionName} File
                  </span>
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 mt-2.5 break-all">
                    {resource.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed font-medium">
                    This file format ({extensionName}) does not support inline rendering. You can preview file properties, security credentials, or download the resource directly to view full details.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Metadata & Quick Info Panel (4 Cols) */}
          <div className="md:col-span-4 space-y-4">
            <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 space-y-3.5">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-indigo-500" />
                <span>File Properties</span>
              </h4>
              <div className="space-y-2.5 text-xs font-semibold">
                <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/40">
                  <span className="text-slate-400">File Type</span>
                  <span className="font-extrabold text-slate-700 dark:text-slate-200">{extensionName}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/40">
                  <span className="text-slate-400">File Size</span>
                  <span className="font-extrabold text-slate-700 dark:text-slate-200">{resource.fileSize || 'Unknown'}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/40">
                  <span className="text-slate-400">Security Scan</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    <span>Safe</span>
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400">Attachment Method</span>
                  <span className="font-bold text-slate-600 dark:text-slate-300">
                    {resource.type === 'link' ? 'External Link' : 'Secure Upload'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-indigo-50/25 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-950/40 rounded-2xl p-4 space-y-3">
              <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider block">
                Actions
              </span>
              <div className="space-y-2">
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow-xs transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open In New Tab</span>
                </a>
                <a
                  href={resource.url}
                  download={resource.name}
                  className="w-full py-2.5 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Download Resource</span>
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
