import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Save, 
  Video, 
  FileText, 
  HelpCircle, 
  Play, 
  CheckCircle2, 
  RefreshCw, 
  Settings,
  Eye,
  Clock,
  Layout,
  Globe,
  Lock,
  ChevronRight,
  MoreVertical,
  Upload,
  Link,
  Paperclip,
  Trash,
  AlertTriangle,
  DownloadCloud,
  File as FileIcon,
  Plus,
  UploadCloud
} from 'lucide-react';
import { LessonInput, ResourceInput } from './CourseBuilder';
import { fetchCourseModulesApi, upsertLessonApi, uploadMediaApi } from '../../../lib/apiConfig';
import { generateVideoThumbnailFile } from '../../../lib/videoUtils';
import { QuillWordEditor } from '../../common/QuillWordEditor';

interface LessonEditorProps {
  courseId: string;
  courseTitle: string;
  moduleId: string;
  lessonId: string;
  onBack: () => void;
}

export const LessonEditor: React.FC<LessonEditorProps> = ({
  courseId,
  courseTitle,
  moduleId,
  lessonId,
  onBack
}) => {
  const [lesson, setLesson] = useState<LessonInput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Video Upload State
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [pendingVideoData, setPendingVideoData] = useState<{ url: string; path: string; thumbnailUrl?: string; duration?: string } | null>(null);

  // Resources State
  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [isAddingResource, setIsAddingResource] = useState(false);

  const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadLessonData = async () => {
    setIsLoading(true);
    try {
      const modules = await fetchCourseModulesApi(courseId);
      const module = modules.find((m: any) => m.id === moduleId);
      if (module) {
        const targetLesson = module.lessons.find((l: any) => l.id === lessonId);
        if (targetLesson) {
          setLesson(targetLesson);
        } else {
          showNotification('Lesson not found.', 'error');
        }
      } else {
        showNotification('Module not found.', 'error');
      }
    } catch (err) {
      console.error('Error loading lesson:', err);
      showNotification('Failed to load lesson data.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLessonData();
  }, [courseId, moduleId, lessonId]);

  const handleSave = async () => {
    if (!lesson || !lesson.title.trim()) {
      showNotification('Lesson title is required.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const res = await upsertLessonApi({
        ...lesson,
        module_id: moduleId,
        is_preview: lesson.isPreview ? 1 : 0,
        resources: JSON.stringify(lesson.resources || [])
      });
      if (res.success) {
        showNotification('Lesson changes saved successfully!');
      } else {
        showNotification(res.message || 'Failed to save changes.', 'error');
      }
    } catch (err) {
      console.error('Error saving lesson:', err);
      showNotification('An error occurred during save.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      showNotification('Invalid file type. Please upload a valid video file (e.g., MP4, WEBM).', 'error');
      return;
    }

    // Validate size (500MB)
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      showNotification('Video file size exceeds 500MB limit.', 'error');
      return;
    }

    // Validate extension
    const forbiddenExts = ['.php', '.exe', '.sh', '.bat', '.js'];
    const fileName = file.name.toLowerCase();
    if (forbiddenExts.some(ext => fileName.endsWith(ext))) {
      showNotification('This file type is not allowed for security reasons.', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setIsUploadModalOpen(true);
    setPendingVideoData(null);

    let detectedDuration = lesson?.duration || '10:00';
    try {
      const objectUrl = URL.createObjectURL(file);
      const tempVid = document.createElement('video');
      tempVid.src = objectUrl;
      await new Promise((resolve) => {
        tempVid.onloadedmetadata = () => {
          const secs = Math.round(tempVid.duration);
          const mins = Math.floor(secs / 60);
          const remainSecs = secs % 60;
          detectedDuration = `${mins.toString().padStart(2, '0')}:${remainSecs.toString().padStart(2, '0')}`;
          URL.revokeObjectURL(objectUrl);
          resolve(true);
        };
        tempVid.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(true);
        };
      });
    } catch (err) {
      console.error("Error reading video duration", err);
    }

    try {
      let thumbnailUrl = '';
      try {
        const thumbFile = await generateVideoThumbnailFile(file);
        const thumbRes = await uploadMediaApi(thumbFile, undefined, 'assets');
        if (thumbRes && (thumbRes as any).success) {
          thumbnailUrl = (thumbRes as any).url || (thumbRes as any).path || '';
        } else if (typeof thumbRes === 'string') {
          thumbnailUrl = thumbRes;
        }
      } catch (thumbErr) {
        console.error('Failed to generate/upload thumbnail:', thumbErr);
      }

      const res = await uploadMediaApi(file, (percent) => {
        setUploadProgress(percent);
      }, 'videos');

      if (res && (res as any).success) {
        const finalUrl = (res as any).url || (res as any).path || '';
        const finalPath = (res as any).path || (res as any).url || '';
        setPendingVideoData({ url: finalUrl, path: finalPath, thumbnailUrl, duration: detectedDuration });
      } else if (res && typeof res === 'string') {
        setPendingVideoData({ url: res, path: res, thumbnailUrl, duration: detectedDuration });
      } else {
        showNotification((res as any)?.message || 'Video upload failed.', 'error');
        setIsUploadModalOpen(false);
      }
    } catch (err) {
      console.error('Upload error:', err);
      showNotification('A network error occurred during upload.', 'error');
      setIsUploadModalOpen(false);
    } finally {
      setIsUploading(false);
    }
  };

  const confirmVideoSave = () => {
    if (!pendingVideoData) return;
    setLesson(prev => prev ? { 
      ...prev, 
      videoPath: pendingVideoData.path, 
      videoUrl: pendingVideoData.url,
      duration: pendingVideoData.duration || prev.duration,
      ...(pendingVideoData.thumbnailUrl ? { thumbnailUrl: pendingVideoData.thumbnailUrl } : {})
    } : null);
    setIsUploadModalOpen(false);
    setUploadProgress(null);
    showNotification('Video updated. Remember to save changes.');
  };

  const handleResourceFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate extension
    const forbiddenExts = ['.php', '.exe', '.sh', '.bat', '.js', '.ts', '.jsx', '.tsx'];
    const fileName = file.name.toLowerCase();
    if (forbiddenExts.some(ext => fileName.endsWith(ext))) {
      showNotification('This file type is not allowed for security reasons.', 'error');
      return;
    }

    setIsAddingResource(true);
    try {
      const res = await uploadMediaApi(file, undefined, 'resources');
      if (res && ((res as any).success || typeof res === 'string')) {
        const finalUrl = typeof res === 'string' ? res : ((res as any).url || (res as any).path);
        const newResource: ResourceInput = {
          id: `res-${Date.now()}`,
          name: file.name,
          type: 'file',
          url: finalUrl,
          fileSize: (file.size / (1024 * 1024)).toFixed(2) + ' MB'
        };
        setLesson(prev => prev ? { 
          ...prev, 
          resources: [...(prev.resources || []), newResource] 
        } : null);
        showNotification('Resource uploaded.');
      } else {
        showNotification((res as any)?.message || 'Upload failed.', 'error');
      }
    } catch (err) {
      showNotification('Error uploading resource.', 'error');
    } finally {
      setIsAddingResource(false);
    }
  };

  const handleAddLinkResource = () => {
    if (!newLinkName.trim() || !newLinkUrl.trim()) {
      showNotification('Link name and URL are required.', 'error');
      return;
    }

    const newResource: ResourceInput = {
      id: `res-${Date.now()}`,
      name: newLinkName.trim(),
      type: 'link',
      url: newLinkUrl.trim()
    };

    setLesson(prev => prev ? { 
      ...prev, 
      resources: [...(prev.resources || []), newResource] 
    } : null);
    
    setNewLinkName('');
    setNewLinkUrl('');
    showNotification('Link added to resources.');
  };

  const removeResource = (id: string) => {
    setLesson(prev => prev ? { 
      ...prev, 
      resources: (prev.resources || []).filter(r => r.id !== id) 
    } : null);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-sm font-bold text-slate-500">Retrieving lesson content...</p>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto">
          <FileText className="w-6 h-6 text-slate-400" />
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Lesson Not Found</h2>
        <button onClick={onBack} className="text-indigo-600 font-bold text-sm">Return to Module</button>
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
            <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest">
              <span className="text-slate-400">{courseTitle}</span>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <span className="text-indigo-600 dark:text-indigo-400">Lesson Editor</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center space-x-3">
              <span>{lesson.title}</span>
              <div className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                lesson.type === 'video' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950' :
                lesson.type === 'quiz' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950' :
                'bg-slate-100 text-slate-500 dark:bg-slate-800'
              }`}>
                {lesson.type.toUpperCase()}
              </div>
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/20 flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Changes</span>
          </button>
          <button className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 rounded-xl hover:text-slate-600 dark:hover:text-slate-200 transition-all">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Content Editor */}
        <div className="lg:col-span-8 space-y-6">
          {/* Title & Metadata Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center space-x-2 mb-2">
              <Settings className="w-4 h-4 text-indigo-500" />
              <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">Lesson Identity</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Lecture Title</label>
                <input
                  type="text"
                  value={lesson.title}
                  onChange={(e) => setLesson({ ...lesson, title: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Format</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setLesson({ ...lesson, type: 'video' })}
                    className={`flex items-center justify-center space-x-2 p-3 rounded-xl border text-[10px] font-bold transition-all ${
                      lesson.type === 'video' 
                        ? 'bg-indigo-50 dark:bg-indigo-950 border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400' 
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Video</span>
                  </button>
                  <button
                    onClick={() => setLesson({ ...lesson, type: 'article' })}
                    className={`flex items-center justify-center space-x-2 p-3 rounded-xl border text-[10px] font-bold transition-all ${
                      lesson.type === 'article' 
                        ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400' 
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Article</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Estimated Duration</label>
                <div className="relative">
                  <input
                    type="text"
                    value={lesson.duration}
                    onChange={(e) => setLesson({ ...lesson, duration: e.target.value })}
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                  <Clock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>
          </div>

          {/* Media Content Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layout className="w-4 h-4 text-indigo-500" />
                <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">Curriculum Asset</h2>
              </div>
              <div className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500">
                Auto-saved
              </div>
            </div>

            {lesson.type === 'video' ? (
              <div className="space-y-5">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Video Lecture Asset (Max 500MB)</label>
                  
                  {lesson.videoPath || lesson.videoUrl ? (
                    <div className="p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                          <Video className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Video Attached</p>
                          <p className="text-xs text-slate-500 font-mono font-bold truncate max-w-[240px]">
                            {(() => {
                              const pathOrUrl = lesson.videoPath || lesson.videoUrl || '';
                              try {
                                const clean = pathOrUrl.split('?')[0].split('#')[0];
                                const parts = clean.split('/');
                                const last = parts[parts.length - 1];
                                return last ? decodeURIComponent(last) : 'video_lesson.mp4';
                              } catch {
                                return 'video_lesson.mp4';
                              }
                            })()}
                          </p>
                        </div>
                      </div>
                      <label className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer">
                        Replace Video
                        <input type="file" className="hidden" accept="video/*" onChange={handleVideoUpload} disabled={isUploading} />
                      </label>
                    </div>
                  ) : (
                    <label className="w-full flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-[32px] p-12 hover:border-indigo-400 dark:hover:border-indigo-800 transition-all cursor-pointer bg-slate-50/50 dark:bg-slate-900/50 group">
                      <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-indigo-500 group-hover:scale-110 transition-all shadow-sm">
                        <Upload className="w-8 h-8" />
                      </div>
                      <div className="mt-4 text-center">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Upload Video Lesson</p>
                        <p className="text-xs text-slate-500">Drag and drop or click to browse (MP4, WEBM)</p>
                      </div>
                      <input type="file" className="hidden" accept="video/*" onChange={handleVideoUpload} disabled={isUploading} />
                    </label>
                  )}
                </div>

                <div className="aspect-video bg-slate-950 rounded-[32px] overflow-hidden relative group border border-slate-800 shadow-2xl">
                  {lesson.videoUrl ? (
                    <video 
                      src={lesson.videoUrl} 
                      controls 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 text-slate-700">
                      <Video className="w-12 h-12" />
                      <p className="text-xs font-bold">No video uploaded yet</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <QuillWordEditor
                  value={lesson.content || ''}
                  onChange={(newContent) => setLesson({ ...lesson, content: newContent })}
                  placeholder="Write comprehensive lecture notes, study instructions, formulas, code, or takeaways..."
                  minHeight="320px"
                  title="Lecture Document & Notes Editor"
                />
              </div>
            )}
          </div>

          {/* Lesson Resources Component */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Paperclip className="w-4 h-4 text-emerald-500" />
                <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">Lesson Resources</h2>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-[10px] font-bold text-emerald-600">
                {lesson.resources?.length || 0} items
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Resource List */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Attached Resources</label>
                
                {(!lesson.resources || lesson.resources.length === 0) ? (
                  <div className="py-10 text-center bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    <FileIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-[10px] font-bold text-slate-400">No resources attached yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {lesson.resources.map((res) => (
                      <div key={res.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between group">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className={`p-2 rounded-lg ${res.type === 'file' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            {res.type === 'file' ? <FileIcon className="w-3.5 h-3.5" /> : <Link className="w-3.5 h-3.5" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{res.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{res.type === 'file' ? res.fileSize : res.url}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => removeResource(res.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Resource Actions */}
              <div className="space-y-5">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Add Link Resource</label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Resource Name (e.g. GitHub Repo)"
                      value={newLinkName}
                      onChange={(e) => setNewLinkName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-bold text-slate-900 dark:text-slate-100 focus:outline-none"
                    />
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="https://..."
                        value={newLinkUrl}
                        onChange={(e) => setNewLinkUrl(e.target.value)}
                        className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-medium text-slate-900 dark:text-slate-100 focus:outline-none"
                      />
                      <button 
                        onClick={handleAddLinkResource}
                        className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Upload Document (PDF, DOCX, ZIP)</label>
                  <label className={`w-full flex items-center space-x-3 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all ${isAddingResource ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-emerald-500 shadow-sm">
                      {isAddingResource ? <RefreshCw className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-900 dark:text-slate-100">Attach Local File</p>
                      <p className="text-[9px] text-slate-500">Allowed: PDFs, Docs, Sheets, Archives</p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      onChange={handleResourceFileUpload} 
                      disabled={isAddingResource}
                    />
                  </label>
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 rounded-xl flex items-start space-x-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-amber-800 dark:text-amber-400 font-medium leading-relaxed">
                      For security, code files (.php, .js) are restricted. Please compress them into a ZIP archive before uploading.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Options */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-xs">
            <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-4">
              Lecture Visibility
            </h3>

            <div className="space-y-4">
              <div 
                onClick={() => setLesson({ ...lesson, isPreview: !lesson.isPreview })}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start space-x-4 ${
                  lesson.isPreview 
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900' 
                    : 'bg-slate-50 dark:bg-slate-800/50 border-transparent'
                }`}
              >
                <div className={`mt-1 w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  lesson.isPreview ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 dark:border-slate-600'
                }`}>
                  {lesson.isPreview && <CheckCircle2 className="w-5 h-5 text-white" />}
                </div>
                <div className="space-y-1">
                  <p className={`text-xs font-black ${lesson.isPreview ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300'}`}>
                    Enable Free Preview
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                    Allow non-enrolled learners to view this lesson to increase conversions.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 space-y-3">
                 <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
                   <Globe className="w-4 h-4" />
                   <span className="text-[10px] font-black uppercase tracking-widest">Accessibility</span>
                 </div>
                 <p className="text-[10px] text-indigo-700 dark:text-indigo-300 font-medium leading-relaxed">
                   Currently this lecture is visible to all enrolled learners. Use the drip-feed settings in the module view to schedule release dates.
                 </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-4 shadow-xs">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto border border-slate-100 dark:border-slate-800">
               <Lock className="w-8 h-8 text-slate-300" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">Drip-Feed Lock</h4>
              <p className="text-[10px] text-slate-500 px-4">Set this lecture to unlock only after 5 days of enrollment.</p>
            </div>
            <button className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-[10px] font-black transition-all">
              Configure Release Schedule
            </button>
          </div>
        </div>
      </div>
      {/* Video Upload Progress Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400">
                {isUploading ? <RefreshCw className="w-8 h-8 animate-spin" /> : <CheckCircle2 className="w-8 h-8" />}
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                {isUploading ? 'Uploading Video...' : 'Upload Complete!'}
              </h3>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {isUploading 
                  ? 'Your video is being processed and securely stored on the server.' 
                  : 'Your video has been successfully uploaded and is ready to be saved.'}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                <span>Transfer Progress</span>
                <span>{uploadProgress || 0}%</span>
              </div>
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 shadow-lg ${isUploading ? 'bg-indigo-600' : 'bg-emerald-500'}`}
                  style={{ width: `${uploadProgress || 0}%` }}
                />
              </div>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setUploadProgress(null);
                }}
                disabled={isUploading}
                className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-black text-xs rounded-2xl cursor-pointer disabled:opacity-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmVideoSave}
                disabled={isUploading || !pendingVideoData}
                className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-2xl cursor-pointer disabled:opacity-50 shadow-xl shadow-indigo-900/20 transition-all flex items-center justify-center space-x-2"
              >
                <span>Save & Finish</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
