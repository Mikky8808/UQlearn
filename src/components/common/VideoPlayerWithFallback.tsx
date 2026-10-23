import React, { useState } from 'react';
import { Film, AlertTriangle, Download, ExternalLink } from 'lucide-react';

interface VideoPlayerWithFallbackProps {
  src: string;
  className?: string;
  controls?: boolean;
  autoPlay?: boolean;
  poster?: string;
  watermarkText?: string;
}

export const VideoPlayerWithFallback: React.FC<VideoPlayerWithFallbackProps> = ({
  src,
  className = 'w-full h-full object-contain',
  controls = true,
  autoPlay = false,
  watermarkText = 'UQlearn'
}) => {
  const [hasError, setHasError] = useState(false);
  const isMkv = src.toLowerCase().includes('.mkv') || src.toLowerCase().endsWith('.mkv');

  return (
    <div className="relative w-full h-full bg-slate-950 flex items-center justify-center overflow-hidden">
      {!hasError && (
        <video
          src={src}
          controls={controls}
          autoPlay={autoPlay}
          className={className}
          onError={() => setHasError(true)}
        />
      )}

      {(hasError || isMkv) && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md p-6 flex flex-col items-center justify-center text-center space-y-4 z-30">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-lg">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-1.5 max-w-md">
            <h4 className="text-sm font-black text-white">MKV Container Format Notice</h4>
            <p className="text-xs text-slate-300">
              Web browsers (such as Safari and Firefox) have limited native support for MKV video container playback. The video file format cannot be decoded directly in this browser.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href={src}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center space-x-2 shadow-lg cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Video</span>
            </a>
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 text-indigo-400" />
              <span>Open in New Tab</span>
            </a>
          </div>
        </div>
      )}

      {watermarkText && !hasError && !isMkv && (
        <div className="absolute top-6 left-6 z-20 pointer-events-none opacity-60 flex items-center space-x-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] mix-blend-screen">
          <div className="w-6 h-6 rounded-md bg-teal-500/90 flex items-center justify-center backdrop-blur-sm shadow-[0_0_15px_rgba(20,184,166,0.3)]">
            <svg className="w-3.5 h-3.5 text-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          </div>
          <span className="text-white font-black tracking-tighter text-base select-none">{watermarkText}</span>
        </div>
      )}
    </div>
  );
};
