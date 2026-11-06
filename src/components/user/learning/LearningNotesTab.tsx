import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Clock, 
  Plus, 
  Trash2, 
  Download, 
  Play, 
  X,
  Bookmark
} from 'lucide-react';
import { LearnerNote, Lesson } from '../../../types';
import { QuillWordEditor } from '../../common/QuillWordEditor';
import { useApp } from '../../../context/AppContext';
import { fetchNotesApi, saveNoteApi, deleteNoteApi } from '../../../lib/apiConfig';

interface LearningNotesTabProps {
  courseId: string;
  courseTitle: string;
  currentLesson: Lesson;
  currentVideoTime: number;
  onSeekToTime: (timeSeconds: number) => void;
}

export const LearningNotesTab: React.FC<LearningNotesTabProps> = ({
  courseId,
  courseTitle,
  currentLesson,
  currentVideoTime,
  onSeekToTime
}) => {
  const { currentUser } = useApp();
  const userId = currentUser?.id || 'guest';

  const [notes, setNotes] = useState<LearnerNote[]>(() => {
    try {
      const saved = localStorage.getItem(`uqlearn_notes_${courseId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((n: any) => !n.content?.includes('foundational setup') && !n.content?.includes('Key takeaway'));
        }
      }
    } catch {}
    return [];
  });

  const [isAdding, setIsAdding] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [capturedSeconds, setCapturedSeconds] = useState(0);

  // Fetch notes from API on mount
  useEffect(() => {
    let isMounted = true;
    fetchNotesApi(userId, courseId)
      .then(res => {
        if (isMounted && res && res.success && Array.isArray(res.notes)) {
          if (res.notes.length > 0) {
            setNotes(res.notes);
          }
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, [userId, courseId]);

  // Sync with localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`uqlearn_notes_${courseId}`, JSON.stringify(notes));
    } catch {}
  }, [notes, courseId]);

  const formatSecondsToTimestamp = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const parseTimestampToSeconds = (timestamp: string): number => {
    const parts = timestamp.split(':').map(p => parseInt(p, 10));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return parts[0] * 60 + parts[1];
    }
    return 0;
  };

  const handleStartAddNote = () => {
    setCapturedSeconds(currentVideoTime || 0);
    setNoteTitle('');
    setNoteContent('');
    setIsAdding(true);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim() && !noteTitle.trim()) return;

    const newNote: LearnerNote & { userId?: string } = {
      id: `note-${Date.now()}`,
      userId,
      courseId,
      courseTitle,
      lessonId: currentLesson.id,
      lessonTitle: currentLesson.title,
      timestamp: formatSecondsToTimestamp(capturedSeconds),
      title: noteTitle.trim() || `Note at ${formatSecondsToTimestamp(capturedSeconds)}`,
      content: noteContent.trim(),
      createdAt: 'Just now'
    };

    setNotes(prev => [newNote, ...prev]);
    setNoteTitle('');
    setNoteContent('');
    setIsAdding(false);

    try {
      await saveNoteApi(newNote);
    } catch (err) {
      console.error('Failed to sync note to API:', err);
    }
  };

  const handleDeleteNote = async (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    try {
      await deleteNoteApi(id);
    } catch (err) {
      console.error('Failed to delete note from API:', err);
    }
  };

  const handleExportNotes = () => {
    const markdownContent = `# Course Notes: ${courseTitle}\n\n` + 
      notes.map(n => `### ${n.title || 'Note'} [${n.timestamp}] - ${n.lessonTitle}\n${n.content}\n*Saved: ${n.createdAt}*\n`).join('\n---\n\n');
    
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${courseTitle.replace(/\s+/g, '_')}_notes.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Top Action bar (Sharp UI) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-none transition-colors">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-[#a435f0]" />
            <span>My Lecture Notes</span>
            <span className="text-xs font-bold text-slate-400">({notes.length})</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Create titles and capture thoughts at specific video timestamps to jump back anytime.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isAdding && (
            <button
              type="button"
              onClick={handleStartAddNote}
              className="px-4 py-2 rounded-none bg-[#a435f0] hover:bg-[#8710d8] text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create Note at {formatSecondsToTimestamp(currentVideoTime)}</span>
            </button>
          )}

          {notes.length > 0 && (
            <button
              type="button"
              onClick={handleExportNotes}
              className="px-3 py-2 rounded-none bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white border border-slate-300 dark:border-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Export Notes as Markdown"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
          )}
        </div>
      </div>

      {/* Note Composer Box (Sharp UI) */}
      {isAdding && (
        <form onSubmit={handleSaveNote} className="bg-white dark:bg-slate-900 border border-[#a435f0] rounded-none p-5 space-y-3.5 shadow-md animate-fadeIn transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#a435f0] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Timestamp: {formatSecondsToTimestamp(capturedSeconds)} ({currentLesson.title})</span>
            </span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Note Title
            </label>
            <input
              type="text"
              autoFocus
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="e.g. Core Architecture Summary & Setup"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-none text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#a435f0] font-semibold"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Note Details & Takeaways
            </label>
            <QuillWordEditor
              value={noteContent}
              onChange={setNoteContent}
              placeholder="Type your personal note or insight here..."
              minHeight="180px"
              title="Lecture Note Editor"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3.5 py-1.5 rounded-none bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!noteContent.trim() && !noteTitle.trim()}
              className="px-4 py-1.5 rounded-none bg-[#a435f0] hover:bg-[#8710d8] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Save Note
            </button>
          </div>
        </form>
      )}

      {/* Notes List (Sharp UI) */}
      <div className="space-y-3">
        {notes.length === 0 ? (
          <div className="p-10 text-center bg-slate-50 dark:bg-slate-900/50 rounded-none border border-slate-300 dark:border-slate-800 text-slate-400 space-y-3">
            <FileText className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No notes created yet</p>
              <p className="text-[11px] text-slate-500">Create custom titled notes tied to any video timestamp.</p>
            </div>
            <button
              type="button"
              onClick={handleStartAddNote}
              className="px-4 py-2 bg-[#a435f0] hover:bg-[#8710d8] text-white text-xs font-bold rounded-none transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Your First Note</span>
            </button>
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none hover:border-slate-400 dark:hover:border-slate-600 transition-colors space-y-2.5 group shadow-none"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Clickable timestamp button */}
                  <button
                    type="button"
                    onClick={() => onSeekToTime(parseTimestampToSeconds(note.timestamp))}
                    className="px-2 py-0.5 rounded-none bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 text-[#a435f0] border border-purple-200 dark:border-purple-800 text-[11px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                    title={`Jump to ${note.timestamp}`}
                  >
                    <Play className="w-2.5 h-2.5 fill-current" />
                    <span>{note.timestamp}</span>
                  </button>

                  <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                    {note.title}
                  </h4>
                </div>

                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:inline mr-2">
                    {note.createdAt}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteNote(note.id)}
                    className="p-1 rounded-none hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                    title="Delete Note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {note.content && (
                <div 
                  className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed pl-1 prose prose-slate dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: note.content }}
                />
              )}

              <div className="pt-1 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>Lesson: {note.lessonTitle}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
