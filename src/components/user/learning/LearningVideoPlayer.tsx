import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, FileSpreadsheet, MonitorPlay, Image as ImageIcon, Mic as MicIcon, 
  HardDrive, AlignLeft, FileIcon, Film, NotebookPen
} from 'lucide-react';
import { Lesson, Course } from '../../../types';
import { noteService } from '../../../services/note-service';
import { useApp } from '../../../context/AppContext';
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
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const { currentUser } = useApp();

  const handleSaveNote = async () => {
    if (!currentUser || !videoRef.current) return;
    const timestamp = Math.floor(videoRef.current.currentTime);
    await noteService.saveNote(currentUser.id, currentLesson.id, timestamp, noteContent);
    setNoteContent('');
    setShowNoteModal(false);
  };

  const handleEnded = () => {
    onVideoPause();
    onVideoEnded();
    if (autoplayNext && onPlayNextLesson && nextLessonTitle) setCountdown(5);
  };

  return (
    <div className="relative aspect-video w-full bg-black sm:rounded-2xl lg:rounded-3xl overflow-hidden shadow-xl border-y sm:border border-slate-200 dark:border-slate-800 flex items-center justify-center group select-none transition-colors">
      {currentLesson?.videoUrl ? (
        <div className="relative w-full h-full">
          <video
            ref={videoRef}
            src={currentLesson.videoUrl}
            controls
            playsInline
            preload="metadata"
            className="w-full h-full object-contain bg-black"
            onTimeUpdate={() => {
              if (onTimeUpdate) {
                onTimeUpdate();
              }
            }}
            onPause={onVideoPause}
            onEnded={handleEnded}
            onError={(e) => {
              console.warn("Video stream failed or unsupported format, falling back to sample video");
              const target = e.target as HTMLVideoElement;
              const fallback = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
              if (target.src !== fallback) {
                target.src = fallback;
                target.load();
                target.play().catch(() => {});
              }
            }}
          />

          {/* Controls Overlay */}
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5" data-player-menu>
            <button
              onClick={() => {
                if (videoRef.current) videoRef.current.pause();
                setShowNoteModal(true);
              }}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
            >
              <NotebookPen className="w-3.5 h-3.5" />
              <span>Note</span>
            </button>
          </div>
          {showNoteModal && (
            <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 p-6 w-full max-w-md rounded-2xl border border-slate-800 shadow-2xl">
                <h3 className="text-white font-black mb-4">Take a note</h3>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="w-full bg-slate-800 text-white p-3 rounded-lg mb-4 border border-slate-700 focus:outline-none focus:border-indigo-500 text-sm"
                  rows={4}
                  placeholder="Type your notes here..."
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowNoteModal(false)} className="text-slate-400 hover:text-white px-3 py-1.5 text-xs font-bold transition-colors">Cancel</button>
                  <button onClick={handleSaveNote} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-md">Save Note</button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="relative w-full h-full flex flex-col items-center justify-center text-center p-6 bg-slate-900 overflow-hidden sm:rounded-2xl lg:rounded-3xl min-h-[300px]">
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
