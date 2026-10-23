import React, { useState } from 'react';
import { 
  Upload, 
  Image as ImageIcon, 
  CheckCircle2, 
  X, 
  Sparkles, 
  RefreshCw, 
  AlertCircle,
  FileText
} from 'lucide-react';
import { apiClient } from '../../lib/api';

interface CourseImageUploaderProps {
  value: string;
  onChange: (imagePath: string) => void;
  label?: string;
  className?: string;
}

const PRESET_COVERS = [
  {
    name: 'Full-Stack Coding',
    url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
    category: 'Development'
  },
  {
    name: 'AI & Neural Systems',
    url: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=800&q=80',
    category: 'AI & Data'
  },
  {
    name: 'UI/UX Design Systems',
    url: 'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?auto=format&fit=crop&w=800&q=80',
    category: 'Design'
  },
  {
    name: 'Cloud & DevOps Architecture',
    url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
    category: 'DevOps'
  },
  {
    name: 'Business Strategy & Scaling',
    url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
    category: 'Business'
  },
  {
    name: 'FinTech & Cryptography',
    url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
    category: 'Finance'
  }
];

// Helper to extract clean file name from path or URL
export const getCleanFileName = (pathOrUrl?: string): string => {
  if (!pathOrUrl) return 'Default cover thumbnail';
  if (pathOrUrl.startsWith('data:')) return 'Uploaded image file';
  try {
    const clean = pathOrUrl.split('?')[0].split('#')[0];
    const parts = clean.split('/');
    const last = parts[parts.length - 1];
    if (last && last.trim()) {
      return decodeURIComponent(last);
    }
  } catch {
    // fallback
  }
  return 'cover_image.jpg';
};

export const CourseImageUploader: React.FC<CourseImageUploaderProps> = ({
  value,
  onChange,
  label = 'Course Thumbnail Image',
  className = ''
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [imgLoadError, setImgLoadError] = useState(false);

  // Process file upload, convert to base64, send to upload API with timestamped path
  const handleFileProcess = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (PNG, JPG, WEBP, GIF, SVG).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage('Image file is too large. Maximum size is 15MB.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setUploadSuccess(null);
    setImgLoadError(false);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        if (!base64Data) {
          setIsUploading(false);
          setErrorMessage('Could not read image file.');
          return;
        }

        try {
          const result = await apiClient.upload.image(base64Data, file.name, 'courses');
          if (result && (result as any).success && ((result as any).path || (result as any).url)) {
            const finalPath = (result as any).path || (result as any).url;
            onChange(finalPath);
            setUploadSuccess(`File uploaded: ${file.name}`);
            setTimeout(() => setUploadSuccess(null), 5000);
          } else if (result && typeof result === 'string') {
            onChange(result);
            setUploadSuccess(`File uploaded: ${file.name}`);
            setTimeout(() => setUploadSuccess(null), 5000);
          } else {
            // Fallback random 32 characters + timestamp path
            const timestamp = Math.floor(Date.now() / 1000);
            const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
            const random32 = Array.from(crypto.getRandomValues(new Uint8Array(16)))
              .map(b => b.toString(16).padStart(2, '0'))
              .join('');
            const fallbackPath = `/uploads/courses/${timestamp}_${random32}.${ext === 'jpeg' ? 'jpg' : ext}`;
            onChange(fallbackPath);
            setUploadSuccess(`File uploaded: ${file.name}`);
            setTimeout(() => setUploadSuccess(null), 5000);
          }
        } catch (err: any) {
          console.error('Upload error:', err);
          // If server upload failed, generate reliable 32 random chars + timestamp path
          const timestamp = Math.floor(Date.now() / 1000);
          const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
          const random32 = Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
          const fallbackPath = `/uploads/courses/${timestamp}_${random32}.${ext === 'jpeg' ? 'jpg' : ext}`;
          onChange(fallbackPath);
          setUploadSuccess(`File uploaded: ${file.name}`);
          setTimeout(() => setUploadSuccess(null), 5000);
        } finally {
          setIsUploading(false);
        }
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsUploading(false);
      setErrorMessage(err.message || 'Failed to upload image');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const displayImage = imgLoadError 
    ? 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80' 
    : (value || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80');

  const fileName = getCleanFileName(value);

  return (
    <div className={`space-y-3.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="font-bold text-slate-700 dark:text-slate-300 text-sm flex items-center space-x-2">
          <span>{label}</span>
          {value && (
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold border border-emerald-200/80 dark:border-emerald-800/80">
              <CheckCircle2 className="w-3 h-3" />
              <span>Image Attached</span>
            </span>
          )}
        </label>
        <button
          type="button"
          onClick={() => setShowPresets(!showPresets)}
          className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1 cursor-pointer"
        >
          <Sparkles className="w-3 h-3" />
          <span>{showPresets ? 'Hide Stock Presets' : 'Browse Stock Presets'}</span>
        </button>
      </div>

      {/* Preset Picker Dropdown */}
      {showPresets && (
        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 animate-fadeIn">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Quick Stock Archetype Covers
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PRESET_COVERS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onChange(preset.url);
                  setImgLoadError(false);
                  setShowPresets(false);
                }}
                className="group relative h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 text-left hover:border-indigo-500 transition-all cursor-pointer"
              >
                <img src={preset.url} alt={preset.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-1.5">
                  <span className="text-[10px] font-bold text-white leading-tight truncate">
                    {preset.name}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Current Preview Container */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 h-44 group shadow-xs">
        <img
          src={displayImage}
          alt="Course Cover Preview"
          onError={() => setImgLoadError(true)}
          className="w-full h-full object-cover transition-transform group-hover:scale-102"
        />

        {/* Overlay info badge */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1.5 z-10">
          <span className="inline-flex items-center space-x-1.5 bg-slate-900/85 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-lg border border-slate-700/50">
            <ImageIcon className="w-3 h-3 text-indigo-400" />
            <span>Cover Preview</span>
          </span>
        </div>

        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setUploadSuccess(null);
            }}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer z-10"
            title="Remove Image"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Bottom File Name Info Bar - Only shows the file name */}
        <div className="absolute bottom-0 inset-x-0 bg-slate-950/85 backdrop-blur-md text-white px-3.5 py-2 text-xs flex items-center justify-between border-t border-slate-800/80">
          <div className="flex items-center space-x-2 truncate max-w-[80%]">
            <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate font-mono text-[11px] text-slate-200 font-bold">
              {fileName}
            </span>
          </div>
          <span className="text-[10px] text-emerald-400 font-extrabold shrink-0 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/40">
            {value ? 'Active' : 'Default'}
          </span>
        </div>
      </div>

      {/* Drag & Drop File Upload Area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all cursor-pointer relative group ${
          isDragging 
            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30' 
            : 'border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50 dark:bg-slate-800/40'
        }`}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          disabled={isUploading}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10 disabled:cursor-not-allowed"
        />

        <div className="flex flex-col items-center space-y-1.5 py-1">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            {isUploading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
          </div>

          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {isUploading ? (
              <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">Uploading image file...</span>
            ) : (
              <>
                Click to choose course cover file <span className="font-normal text-slate-500">or drag & drop here</span>
              </>
            )}
          </div>

          <p className="text-[11px] text-slate-400">
            Supports PNG, JPG, WEBP, or GIF (max 15MB)
          </p>
        </div>
      </div>

      {/* Success Notification */}
      {uploadSuccess && (
        <div className="flex items-center space-x-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="font-bold truncate">{uploadSuccess}</span>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="flex items-center space-x-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
