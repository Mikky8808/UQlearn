import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Clock, 
  Search, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Play, 
  BookOpen, 
  Edit3, 
  Sparkles,
  Share2
} from 'lucide-react';
import { Course, LearnerNote } from '../../../types';

interface LearnerNotesTabProps {
  enrolledCourses: Course[];
}

export const LearnerNotesTab: React.FC<LearnerNotesTabProps> = ({ enrolledCourses }) => {
  const navigate = useNavigate();
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Note Form
  const [newCourseId, setNewCourseId] = useState(enrolledCourses[0]?.id || '');
  const [newLessonTitle, setNewLessonTitle] = useState('Lecture 4: React Server Components & Streaming');
  const [newTimestamp, setNewTimestamp] = useState('08:42');
  const [newContent, setNewContent] = useState('');

  // Stored notes state
  const [notes, setNotes] = useState<LearnerNote[]>([
    {
      id: 'n-1',
      courseId: enrolledCourses[0]?.id || 'c-1',
      courseTitle: enrolledCourses[0]?.title || 'Full-Stack Web Development',
      lessonId: 'l-4',
      lessonTitle: 'Lecture 4: State Architecture & Redux Toolkit',
      timestamp: '14:20',
      content: 'Important rule: Never mutate draft state directly outside createSlice reducers. Immer handles immutability under the hood.',
      createdAt: 'Yesterday'
    },
    {
      id: 'n-2',
      courseId: enrolledCourses[0]?.id || 'c-1',
      courseTitle: enrolledCourses[0]?.title || 'Full-Stack Web Development',
      lessonId: 'l-9',
      lessonTitle: 'Lecture 9: PostgreSQL Indexing & Optimization',
      timestamp: '06:15',
      content: 'Use EXPLAIN ANALYZE to check sequential vs bitmap index scan costs before deploying queries to production.',
      createdAt: '3 days ago'
    },
    {
      id: 'n-3',
      courseId: 'c-2',
      courseTitle: 'Python & Data Science Masterclass',
      lessonId: 'l-12',
      lessonTitle: 'Lecture 12: Supervised Machine Learning Pipelines',
      timestamp: '22:05',
      content: 'Always fit ColumnTransformer and Scalers strictly on X_train before calling transform on X_test to prevent data leakage.',
      createdAt: '1 week ago'
    }
  ]);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    const matchedCourse = enrolledCourses.find(c => c.id === newCourseId) || enrolledCourses[0];

    const noteObj: LearnerNote = {
      id: `n-${Date.now()}`,
      courseId: matchedCourse?.id || 'general',
      courseTitle: matchedCourse?.title || 'Course Lecture',
      lessonId: `l-${Date.now()}`,
      lessonTitle: newLessonTitle.trim() || 'Video Lecture',
      timestamp: newTimestamp.trim() || '00:00',
      content: newContent.trim(),
      createdAt: 'Just now'
    };

    setNotes([noteObj, ...notes]);
    setNewContent('');
    setShowAddModal(false);
  };

  const handleDeleteNote = (id: string) => {
    setNotes(notes.filter(n => n.id !== id));
  };

  const filteredNotes = notes.filter(n => {
    if (selectedCourseId !== 'all' && n.courseId !== selectedCourseId) return false;
    if (searchQuery.trim()) {
      const match = n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    n.lessonTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    n.courseTitle.toLowerCase().includes(searchQuery.toLowerCase());
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Filter, Search & Actions Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search notes content or lesson..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500 font-medium"
            >
              <option value="all">All Enrolled Courses ({notes.length} notes)</option>
              {enrolledCourses.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Note</span>
          </button>
        </div>
      </div>

      {/* Notes Grid */}
      <div className="space-y-4">
        {filteredNotes.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">No notes recorded</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Take notes while watching video lectures or click "Add New Note" to save key reference points.
            </p>
          </div>
        ) : (
          filteredNotes.map((note) => (
            <div
              key={note.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-3 hover:shadow-md transition-all"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider block">
                    {note.courseTitle}
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {note.lessonTitle}
                  </h4>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => navigate(`/learn/${note.courseId}?tab=notes`)}
                    className="px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold text-xs flex items-center space-x-1.5 hover:bg-teal-100 transition-colors cursor-pointer"
                    title="Jump to video lecture timestamp"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{note.timestamp}</span>
                    <Play className="w-3 h-3 fill-current ml-0.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 transition-colors cursor-pointer rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
                    title="Delete Note"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Note Content */}
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-normal bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                {note.content}
              </p>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Recorded: {note.createdAt}</span>
                <span className="text-teal-600 dark:text-teal-400 font-medium">Click timestamp to resume lesson</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Note Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Add Timestamped Note</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddNote} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Course</label>
                <select
                  value={newCourseId}
                  onChange={(e) => setNewCourseId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                >
                  {enrolledCourses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Lecture Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lecture 6: Database Relations"
                    value={newLessonTitle}
                    onChange={(e) => setNewLessonTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Timestamp</label>
                  <input
                    type="text"
                    required
                    placeholder="MM:SS"
                    value={newTimestamp}
                    onChange={(e) => setNewTimestamp(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Note Content & Code Snippet</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Record your takeaway, formula, shortcut, or reference..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
