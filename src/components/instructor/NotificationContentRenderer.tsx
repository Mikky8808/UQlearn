import React, { useState } from 'react';
import { 
  FileText, 
  Paperclip, 
  Maximize2, 
  X, 
  Download, 
  ExternalLink,
  ImageIcon,
  FileSpreadsheet,
  FileArchive,
  Eye
} from 'lucide-react';

interface NotificationContentRendererProps {
  message: string;
}

export const NotificationContentRenderer: React.FC<NotificationContentRendererProps> = ({ message }) => {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  if (!message) return null;

  // 1. Clean internal note tags if present
  const isInternalNote = message.startsWith('[INTERNAL NOTE]');
  let cleanMsg = isInternalNote ? message.replace('[INTERNAL NOTE]', '').trim() : message;

  // 2. Extract [IMAGE: ...] tags OR base64 data URLs OR direct image links (.png, .jpg, .jpeg, .webp, .gif, .svg)
  const imageRegex = /\[IMAGE:\s*(data:image\/[^\]]+)\]|(data:image\/[a-zA-Z]+;base64,[^\s]+)|(https?:\/\/[^\s]+\.(png|jpe?g|webp|gif|svg)(\?[^\s]*)?)/gi;
  const extractedImages: string[] = [];
  let imgMatch;

  while ((imgMatch = imageRegex.exec(cleanMsg)) !== null) {
    const imgUrl = imgMatch[1] || imgMatch[2] || imgMatch[3];
    if (imgUrl && !extractedImages.includes(imgUrl)) {
      extractedImages.push(imgUrl);
    }
  }

  // 3. Extract [DOCUMENT: url] OR [FILE: url] OR direct document links (.pdf, .docx, .xlsx, .zip, .csv, .txt, .pptx)
  const docRegex = /\[(?:DOCUMENT|FILE):\s*([^\]]+)\]|(https?:\/\/[^\s]+\.(pdf|docx?|xlsx?|zip|rar|tar|csv|txt|pptx?)(\?[^\s]*)?)/gi;
  const extractedDocs: { url: string; name: string; type: string }[] = [];
  let docMatch;

  while ((docMatch = docRegex.exec(cleanMsg)) !== null) {
    const url = (docMatch[1] || docMatch[2] || '').trim();
    if (url && !extractedDocs.some(d => d.url === url)) {
      const fileName = url.split('/').pop()?.split('?')[0] || 'Attached Document';
      const ext = fileName.split('.').pop()?.toLowerCase() || 'doc';
      extractedDocs.push({ url, name: fileName, type: ext });
    }
  }

  // 4. Strip out raw image/doc URLs and tags from main text string so no raw URLs are displayed
  let textOnly = cleanMsg
    .replace(imageRegex, '')
    .replace(docRegex, '')
    .trim();

  const getDocIcon = (type: string) => {
    if (['xlsx', 'xls', 'csv'].includes(type)) return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
    if (['zip', 'rar', 'tar', '7z'].includes(type)) return <FileArchive className="w-5 h-5 text-amber-500" />;
    return <FileText className="w-5 h-5 text-indigo-500" />;
  };

  return (
    <div className="space-y-3">
      {/* Internal Note Banner */}
      {isInternalNote && (
        <div className="bg-purple-100 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-800 text-purple-800 dark:text-purple-300 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider inline-flex items-center space-x-1">
          <span>📌 Internal Reviewer Note</span>
        </div>
      )}

      {/* Clean Text Content (Without raw URL strings) */}
      {textOnly && (
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
          {textOnly}
        </p>
      )}

      {/* Image Preview Cards */}
      {extractedImages.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center space-x-1">
            <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
            <span>Image Preview ({extractedImages.length})</span>
          </div>

          <div className={`grid gap-2 ${extractedImages.length > 1 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1'}`}>
            {extractedImages.map((imgSrc, idx) => (
              <div 
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxImage(imgSrc);
                }}
                className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 cursor-pointer hover:border-indigo-500 transition-all shadow-xs"
              >
                <img 
                  src={imgSrc} 
                  alt="Notification attachment preview" 
                  className="w-full h-36 object-cover" 
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white space-x-1 font-bold text-xs">
                  <Eye className="w-4 h-4" />
                  <span>Preview Image</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File Download Indicators */}
      {extractedDocs.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center space-x-1">
            <Paperclip className="w-3.5 h-3.5 text-indigo-400" />
            <span>Document Attachments ({extractedDocs.length})</span>
          </div>

          <div className="space-y-1.5">
            {extractedDocs.map((doc, idx) => (
              <a
                key={idx}
                href={doc.url}
                download
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 rounded-xl text-xs transition-colors cursor-pointer group"
              >
                <div className="flex items-center space-x-3 min-w-0 pr-2">
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shrink-0">
                    {getDocIcon(doc.type)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {doc.name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono uppercase">
                      {doc.type} Document &bull; Click to Download
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shrink-0 transition-colors shadow-xs">
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Full Resolution Lightbox Modal */}
      {lightboxImage && (
        <div 
          onClick={(e) => {
            e.stopPropagation();
            setLightboxImage(null);
          }}
          className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-12 right-0 bg-slate-800 text-white p-2 rounded-full hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={lightboxImage} 
              alt="Notification Screenshot Full View" 
              className="max-w-full max-h-[80vh] object-contain rounded-2xl border border-slate-800 shadow-2xl"
            />
            <div className="mt-3 flex items-center space-x-3">
              <a
                href={lightboxImage}
                download="attachment-screenshot.jpg"
                onClick={(e) => e.stopPropagation()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-lg transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Screenshot</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
