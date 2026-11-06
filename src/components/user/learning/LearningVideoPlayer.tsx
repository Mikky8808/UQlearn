import React, { useState } from 'react';
import { 
  FileText, FileSpreadsheet, MonitorPlay, Image as ImageIcon, Mic as MicIcon, 
  HardDrive, AlignLeft, FileIcon, Film, NotebookPen
} from 'lucide-react';
import { Lesson, Course } from '../../../types';
import { VideoPlayerComponent } from '../../common/VideoPlayerComponent';

export const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return <FileText className="w-full h-full text-rose-500" />;
    case 'doc': case 'docx': return <FileText className="w-full h-full text-blue-500" />;
    case 'xls': case 'xlsx': case 'csv': return <FileSpreadsheet className="w-full h-full text-emerald-500" />;
    case 'ppt': case 'pptx': return <MonitorPlay className="w-full h-full text-orange-500" />;
    case 'jpg': case 'jpeg': case 'png': case 'gif': case 'webp': case 'svg': return <ImageIcon className="w-full h-full text-purple-500" />;
    case 'mp3': case 'wav': case 'ogg': return <MicIcon className="w-full h-full text-amber-500" />;
    case 'zip': case 'rar': case '7z': case 'tar': case 'gz': return <HardDrive className="w-full h-full text-slate-500" />;
    case 'txt': return <AlignLeft className="w-full h-full text-slate-400" />;
    case 'mp4': case 'mov': case 'avi': case 'mkv': case 'webm': return <Film className="w-full h-full text-indigo-500" />;
    default: return <FileIcon className="w-full h-full text-slate-400" />;
  }
};

export const LearningVideoPlayer: React.FC<any> = ({
  currentLesson, course, videoRef, playbackSpeed, onSpeedChange, showResumeBanner,
  resumeTime, onResumePlayback, onDismissResume, onTimeUpdate, onVideoPause,
  onVideoEnded, autoplayNext, onPlayNextLesson, nextLessonTitle
}) => {
  const [countdown, setCountdown] = useState<number | null>(null);

  const handleEnded = () => {
    if (onVideoPause) onVideoPause();
    if (onVideoEnded) onVideoEnded();
    if (autoplayNext && onPlayNextLesson && nextLessonTitle) setCountdown(5);
  };

  return (
    <div className="relative aspect-video w-full bg-black rounded-none overflow-hidden shadow-xl border-y sm:border border-slate-200 dark:border-slate-800 flex items-center justify-center group select-none transition-colors">
      {currentLesson?.videoUrl ? (
        <div className="relative w-full h-full">
          <VideoPlayerComponent
            ref={videoRef}
            src={currentLesson.videoUrl}
            poster={course?.image || course?.thumbnail}
            playbackRates={[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]}
            onTimeUpdate={(currentTime, duration) => {
              if (onTimeUpdate) {
                onTimeUpdate();
              }
            }}
            onPause={onVideoPause}
            onEnded={handleEnded}
            className="w-full h-full object-contain bg-black"
          />
        </div>
      ) : (
        <div className="relative w-full h-full flex flex-col items-center justify-center text-center p-6 bg-slate-900 overflow-hidden rounded-none min-h-[300px]">
          {/* Blurred Background Course Image */}
          {(course.image || course.thumbnail) && (
            <div 
              className="absolute inset-0 bg-cover bg-center filter blur-xl opacity-30 scale-105"
              style={{ backgroundImage: `url(${course.image || course.thumbnail})` }}
            />
          )}
          
          <div className="relative z-10 flex flex-col items-center space-y-4 max-w-md">
            {/* Beautiful Content/Notes Icon */}
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/5 animate-pulse">
              <NotebookPen className="w-8 h-8" />
            </div>
            
            <div className="space-y-1">
              <h4 className="text-white font-black text-lg sm:text-xl tracking-tight">Written Lesson & Lecture Notes</h4>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                This lesson contains reading material, resources, or downloadable assets. Check the tabs below to read the contents!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
