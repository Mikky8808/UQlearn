import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Video, 
  FileText, 
  HelpCircle, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  CheckCircle2, 
  RefreshCw,
  Layers,
  Clock,
  Play,
  Eye,
  Settings,
  MoreVertical,
  ChevronDown,
  BookOpen
} from 'lucide-react';
import { LessonInput, ModuleInput } from './CourseBuilder';
import { upsertModuleApi, upsertLessonApi, deleteModuleOrLessonApi, fetchCourseModulesApi } from '../../../lib/apiConfig';
import { QuillWordEditor } from '../../common/QuillWordEditor';

interface ModuleEditorProps {
  courseId: string;
  courseTitle: string;
  moduleId: string;
  onBack: () => void;
  onManageLesson: (lessonId: string) => void;
}

export const ModuleEditor: React.FC<ModuleEditorProps> = ({
  courseId,
  courseTitle,
  moduleId,
  onBack,
  onManageLesson
}) => {
  const [module, setModule] = useState<ModuleInput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Lesson Modal State
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<LessonInput | null>(null);
  const [isSavingLesson, setIsSavingLesson] = useState(false);

  // Lesson Form State
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonType, setLessonType] = useState<LessonInput['type']>('video');
  const [lessonDuration, setLessonDuration] = useState('10:00');
  const [lessonVideoUrl, setLessonVideoUrl] = useState('');
  const [lessonContent, setLessonContent] = useState('');
  const [lessonIsPreview, setLessonIsPreview] = useState(false);

  // Lesson deletion state
  const [lessonToDelete, setLessonToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDeletingLesson, setIsDeletingLesson] = useState(false);

  const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadModuleData = async () => {
    setIsLoading(true);
    try {
      const modules = await fetchCourseModulesApi(courseId);
      const targetModule = modules.find((m: any) => m.id === moduleId);
      if (targetModule) {
        setModule(targetModule);
      } else {
        showNotification('Module not found.', 'error');
      }
    } catch (err) {
      console.error('Error loading module:', err);
      showNotification('Failed to load module data.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadModuleData();
  }, [courseId, moduleId]);

  const handleOpenLessonModal = (lesson?: LessonInput) => {
    if (lesson) {
      setEditingLesson(lesson);
      setLessonTitle(lesson.title);
      setLessonType(lesson.type);
      setLessonDuration(lesson.duration);
      setLessonVideoUrl(lesson.videoUrl || '');
      setLessonContent(lesson.content || '');
      setLessonIsPreview(lesson.isPreview || false);
    } else {
      setEditingLesson(null);
      setLessonTitle('');
      setLessonType('video');
      setLessonDuration('10:00');
      setLessonVideoUrl('');
      setLessonContent('');
      setLessonIsPreview(false);
    }
    setIsLessonModalOpen(true);
  };

  const handleSaveLesson = async () => {
    if (!lessonTitle.trim()) {
      showNotification('Lesson title is required.', 'error');
      return;
    }

    setIsSavingLesson(true);
    try {
      const lessonData = {
        id: editingLesson?.id,
        module_id: moduleId,
        title: lessonTitle.trim(),
        type: lessonType,
        duration: lessonDuration,
        videoUrl: lessonVideoUrl,
        content: lessonContent,
        is_preview: lessonIsPreview ? 1 : 0,
        order_index: editingLesson ? undefined : (module?.lessons.length || 0)
      };

      const res = await upsertLessonApi(lessonData);
      if (res.success) {
        showNotification(`Lesson "${lessonTitle}" saved successfully!`);
        setIsLessonModalOpen(false);
        loadModuleData(); // Refresh list
      } else {
        showNotification(res.message || 'Failed to save lesson.', 'error');
      }
    } catch (err) {
      console.error('Error saving lesson:', err);
      showNotification('An error occurred while saving the lesson.', 'error');
    } finally {
      setIsSavingLesson(false);
    }
  };

  const handleDeleteLessonRequest = (id: string, title: string) => {
    setLessonToDelete({ id, title });
  };

  const confirmDeleteLesson = async () => {
    if (!lessonToDelete) return;

    setIsDeletingLesson(true);
    try {
      const res = await deleteModuleOrLessonApi('lesson', lessonToDelete.id);
      if (res.success) {
        showNotification('Lesson deleted successfully.');
        setLessonToDelete(null);
        loadModuleData();
      } else {
        showNotification(res.message || 'Failed to delete lesson.', 'error');
      }
    } catch (err) {
      console.error('Error deleting lesson:', err);
      showNotification('Error deleting lesson.', 'error');
    } finally {
      setIsDeletingLesson(false);
    }
  };

  const handleUpdateModule = async () => {
    if (!module) return;
    try {
      const res = await upsertModuleApi({
        id: module.id,
        course_id: courseId,
        title: module.title,
        description: module.description
      });
      if (res.success) {
        showNotification('Module details updated.');
      } else {
        showNotification(res.message || 'Update failed.', 'error');
      }
    } catch (err) {
      showNotification('Error updating module.', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-sm font-bold text-slate-500">Loading module configuration...</p>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="text-center py-12 space-y-4">
        <Layers className="w-12 h-12 text-slate-300 mx-auto" />
        <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Module Not Found</h2>
        <button onClick={onBack} className="text-indigo-600 font-bold text-sm">Back to Course Builder</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-5 right-5 z-50 p-4 rounded-2xl flex items-center space-x-3 text-xs font-bold shadow-2xl transition-all ${
          notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
        }`}>
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="space-y-0.5">
            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
              Course: {courseTitle}
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center space-x-3">
              <span>{module.title}</span>
              <div className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500">
                Full Page Editor
              </div>
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleUpdateModule}
            className="px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center space-x-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
          <button
            onClick={() => handleOpenLessonModal()}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/20 flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Lesson</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Module Settings Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-xs">
            <div className="flex items-center space-x-2">
              <Settings className="w-4 h-4 text-indigo-500" />
              <h2 className="text-sm font-black text-slate-900 dark:text-slate-100">Module Configuration</h2>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Module Title</label>
                <input
                  type="text"
                  value={module.title}
                  onChange={(e) => setModule({ ...module, title: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Description</label>
                <textarea
                  rows={4}
                  value={module.description || ''}
                  onChange={(e) => setModule({ ...module, description: e.target.value })}
                  placeholder="Describe what learners learn in this section..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-start space-x-3">
                <Video className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-indigo-900 dark:text-indigo-200">Production Checklist</p>
                  <p className="text-[10px] text-indigo-700 dark:text-indigo-400 leading-relaxed">
                    Ensure all lessons have video sources or detailed markdown content before publishing.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-xs text-center">
             <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto">
               <Video className="w-6 h-6 text-slate-400" />
             </div>
             <div className="space-y-1">
               <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">Upload Bulk Assets</h3>
               <p className="text-[10px] text-slate-500">Drag videos here to upload them directly to the cloud.</p>
             </div>
             <button className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all">
               Browse Files
             </button>
          </div>
        </div>

        {/* Lessons List Area */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-emerald-500" />
              <span>Curriculum Items ({module.lessons.length})</span>
            </h2>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold text-slate-400">Sort by: Order</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </div>
          </div>

          {module.lessons.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-20 text-center space-y-4">
              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl flex items-center justify-center mx-auto text-indigo-500">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">No lessons yet</h3>
                <p className="text-xs text-slate-500">Start building your curriculum by adding your first lecture.</p>
              </div>
              <button
                onClick={() => handleOpenLessonModal()}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md"
              >
                Create First Lesson
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {module.lessons.map((lesson, idx) => (
                <div
                  key={lesson.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs group hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-all"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center space-x-4 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-black text-slate-500 shrink-0">
                        {idx + 1}
                      </div>
                      <div className={`p-2 rounded-xl shrink-0 ${
                        lesson.type === 'video' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950' :
                        lesson.type === 'quiz' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950' :
                        'bg-slate-50 text-slate-600 dark:bg-slate-800'
                      }`}>
                        {lesson.type === 'video' ? <Video className="w-4 h-4" /> :
                         lesson.type === 'quiz' ? <HelpCircle className="w-4 h-4" /> :
                         <FileText className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {lesson.title}
                        </h3>
                        <div className="flex items-center space-x-3 text-[10px] text-slate-400 font-medium">
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{lesson.duration}</span>
                          </span>
                          <span>•</span>
                          <span className="capitalize">{lesson.type}</span>
                          {lesson.isPreview && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-600 font-bold">Free Preview</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onManageLesson(lesson.id)}
                        className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center space-x-1.5 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-all cursor-pointer"
                        title="Manage Lesson"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Manage</span>
                      </button>
                      <button
                        onClick={() => handleDeleteLessonRequest(lesson.id, lesson.title)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-all"
                        title="Delete Lesson"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lesson Deletion Confirmation Modal */}
      {lessonToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center space-x-4 text-rose-600 dark:text-rose-400">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black">Delete Lecture?</h3>
                <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Permanent Action</p>
              </div>
            </div>
            
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-slate-900 dark:text-slate-100">"{lessonToDelete.title}"</span>? 
              This will permanently remove the content and meta-data from this module.
            </p>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setLessonToDelete(null)}
                disabled={isDeletingLesson}
                className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-black text-xs rounded-2xl cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteLesson}
                disabled={isDeletingLesson}
                className="flex-1 py-4 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-2xl cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2 shadow-xl shadow-rose-900/20"
              >
                {isDeletingLesson ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Confirm Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lesson Edit/Create Modal */}
      {isLessonModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  {lessonType === 'video' ? <Video className="w-6 h-6" /> :
                   lessonType === 'quiz' ? <HelpCircle className="w-6 h-6" /> :
                   <FileText className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">
                    {editingLesson ? 'Edit Lesson' : 'Create New Lesson'}
                  </h3>
                  <p className="text-xs text-slate-500">Configure lecture details and multimedia content.</p>
                </div>
              </div>
              <button
                onClick={() => setIsLessonModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Lesson Title</label>
                <input
                  type="text"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="e.g. Introduction to React Hooks"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Content Type</label>
                <select
                  value={lessonType}
                  onChange={(e: any) => setLessonType(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  <option value="video">Video Lecture</option>
                  <option value="article">Article / Reading</option>
                  <option value="quiz">Interactive Quiz</option>
                  <option value="audio">Audio / Podcast</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Duration (mm:ss)</label>
                <input
                  type="text"
                  value={lessonDuration}
                  onChange={(e) => setLessonDuration(e.target.value)}
                  placeholder="10:00"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {lessonType === 'video' && (
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Video Stream URL</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={lessonVideoUrl}
                      onChange={(e) => setLessonVideoUrl(e.target.value)}
                      placeholder="YouTube, Vimeo, or MP4 URL..."
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <Video className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
                  </div>
                  {lessonVideoUrl && (
                    <div className="mt-3 rounded-2xl overflow-hidden aspect-video bg-black flex items-center justify-center">
                       <Play className="w-10 h-10 text-white/50" />
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1.5 md:col-span-2">
                <QuillWordEditor
                  value={lessonContent}
                  onChange={(val) => setLessonContent(val)}
                  placeholder="Write lesson notes, code snippets, or reading material..."
                  minHeight="240px"
                  title="Lesson Document & Notes Editor"
                />
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <div 
                    onClick={() => setLessonIsPreview(!lessonIsPreview)}
                    className={`w-10 h-5 rounded-full transition-all relative ${lessonIsPreview ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${lessonIsPreview ? 'left-6' : 'left-1'}`} />
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Set as Free Preview Lesson</span>
                </label>
              </div>
            </div>

            <div className="flex space-x-4 pt-2">
              <button
                onClick={() => setIsLessonModalOpen(false)}
                className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-black text-xs rounded-2xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLesson}
                disabled={isSavingLesson}
                className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-2xl shadow-xl shadow-indigo-500/20 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isSavingLesson ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{editingLesson ? 'Update Lesson' : 'Create Lesson'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
