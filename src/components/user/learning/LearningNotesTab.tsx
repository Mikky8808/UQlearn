import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Clock, 
  Plus, 
  Trash2, 
  Download, 
  Play, 
  Edit3, 
  Check, 
  X,
  Bookmark,
  Sparkles
} from 'lucide-react';
import { LearnerNote, Lesson } from '../../../types';

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
  const [notes, setNotes] = useState<LearnerNote[]>(() => {
    try {
      const saved = localStorage.getItem(`uqlearn_notes_${courseId}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: `note-init-1`,
        courseId,
        courseTitle,
        lessonId: currentLesson.id,
        lessonTitle: currentLesson.title,
        timestamp: '01:30',
        content: 'Key takeaway: Pay special attention to foundational setup and clean workspace conventions.',
        createdAt: 'Just now'
      }
    ];
  });

  const [isAdding, setIsAdding] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [capturedSeconds, setCapturedSeconds] = useState(0);

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
    setNoteContent('');
    setIsAdding(true);
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    const newNote: LearnerNote = {
      id: `note-${Date.now()}`,
      courseId,
      courseTitle,
      lessonId: currentLesson.id,
      lessonTitle: currentLesson.title,
      timestamp: formatSecondsToTimestamp(capturedSeconds),
      content: noteContent.trim(),
      createdAt: 'Just now'
    };

    setNotes([newNote, ...notes]);
    setNoteContent('');
    setIsAdding(false);
  };

  const handleDeleteNote = (id: string) => {
    setNotes(notes.filter(n => n.id !== id));
  };

  const handleExportNotes = () => {
    const markdown = `# Study Notes: ${courseTitle}\n\nGenerated from UQlearn • Total Notes: ${notes.length}\n\n---\n\n` +
      notes.map(n => `### ${n.lessonTitle} (${n.timestamp})\n*Created: ${n.createdAt}*\n\n${n.content}\n\n---`).join('\n\n');

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${courseTitle.replace(/[^a-zA-Z0-9]/g, '_')}_Notes.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Top Action bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-colors">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>My Lecture Notes</span>
            <span className="text-xs font-bold text-slate-400">({notes.length})</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Capture thoughts at specific video timestamps and jump back anytime.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isAdding && (
            <button
              type="button"
              onClick={handleStartAddNote}
              className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-teal-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Note at {formatSecondsToTimestamp(currentVideoTime)}</span>
            </button>
          )}

          {notes.length > 0 && (
            <button
              type="button"
              onClick={handleExportNotes}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Export Notes as Markdown"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
          )}
        </div>
      </div>

      {/* Note Composer Modal / Box */}
      {isAdding && (
        <form onSubmit={handleSaveNote} className="bg-white dark:bg-slate-900 border border-teal-500/40 rounded-2xl p-4 sm:p-5 space-y-3 shadow-lg animate-fadeIn transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Timestamp: {formatSecondsToTimestamp(capturedSeconds)}</span>
            </span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <textarea
            autoFocus
            rows={3}
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Type your personal note or insight here..."
            className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-teal-500 leading-relaxed resize-y"
          />

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!noteContent.trim()}
              className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-md shadow-teal-600/20 cursor-pointer"
            >
              Save Note
            </button>
          </div>
        </form>
      )}

      {/* Notes List */}
      <div className="space-y-3">
        {notes.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-400 space-y-2">
            <FileText className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
            <p className="text-xs font-semibold">No notes captured yet for this course</p>
            <button
              type="button"
              onClick={handleStartAddNote}
              className="text-xs text-teal-600 dark:text-teal-400 hover:underline cursor-pointer font-bold"
            >
              Add your first note at current time
            </button>
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-2 group shadow-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Clickable timestamp pill */}
                  <button
                    type="button"
                    onClick={() => onSeekToTime(parseTimestampToSeconds(note.timestamp))}
                    className="px-2 py-0.5 rounded-lg bg-teal-50 dark:bg-teal-500/10 hover:bg-teal-100 dark:hover:bg-teal-500/20 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-500/30 text-[11px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    title={`Jump to ${note.timestamp}`}
                  >
                    <Play className="w-2.5 h-2.5 fill-current" />
                    <span>{note.timestamp}</span>
                  </button>

                  <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[150px] sm:max-w-xs font-medium">
                    {note.lessonTitle}
                  </span>
                </div>

                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:inline mr-2">
                    {note.createdAt}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteNote(note.id)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                    title="Delete Note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed pl-1 whitespace-pre-wrap">
                {note.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
