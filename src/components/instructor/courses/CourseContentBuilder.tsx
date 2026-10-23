import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Sparkles, 
  Video, 
  HelpCircle, 
  FileText, 
  Play, 
  Eye, 
  Check, 
  Upload, 
  Loader2, 
  ArrowLeft, 
  ChevronRight, 
  ChevronLeft, 
  Film, 
  X, 
  Plus, 
  Filter, 
  PlayCircle, 
  RefreshCw, 
  Layers,
  Maximize2,
  Trash2,
  CheckCircle2,
  FolderOpen,
  Grid,
  List
} from 'lucide-react';
import { LessonInput, ModuleInput } from './CourseBuilder';
import { DEFAULT_VIDEO_THUMBNAIL } from '../../../lib/apiConfig';
import { upsertLessonApi, uploadMediaApi, API_ENDPOINTS, apiFetch, API_BASE_URL } from '../../../lib/apiConfig';
import { generateVideoThumbnailFile } from '../../../lib/videoUtils';
import { ResumableVideoUploader } from '../../common/ResumableVideoUploader';
import { QuillWordEditor } from '../../common/QuillWordEditor';
import { ResourcePreviewModal } from '../../common/ResourcePreviewModal';
import { VideoPlayerWithFallback } from '../../common/VideoPlayerWithFallback';

interface CourseContentBuilderProps {
  allLessons: { moduleTitle: string; lesson: LessonInput; moduleId?: string }[];
  selectedLessonId: string | null;
  setSelectedLessonId: (id: string | null) => void;
  currentLesson: LessonInput | null | any;
  handleUpdateCurrentLesson: (updates: Partial<LessonInput | any>) => void;
  handleGenerateAiLessonNotes: () => void;
  showNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onSaveLesson: () => void;
  onBackToCurriculum?: () => void;
  modules?: ModuleInput[];
  currentUser?: any;
  allFilmVideos?: any[];
  onAddFilmClip?: (clip: any) => void;
}

export const CourseContentBuilder: React.FC<CourseContentBuilderProps> = ({
  allLessons,
  selectedLessonId,
  setSelectedLessonId,
  currentLesson,
  handleUpdateCurrentLesson,
  handleGenerateAiLessonNotes,
  showNotification,
  onSaveLesson,
  onBackToCurriculum,
  modules = [],
  currentUser,
  allFilmVideos: propFilmVideos = [],
  onAddFilmClip,
}) => {
  const [contentStudioMode, setContentStudioMode] = useState<'editor' | 'preview'>('editor');
  const [lessonSearchQuery, setLessonSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Media Library / Choose Uploaded Videos Modal State
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [mediaViewMode, setMediaViewMode] = useState<'grid' | 'list'>('grid');
  const [mediaSearchQuery, setMediaSearchQuery] = useState('');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'film_studio' | 'curriculum' | 'promo_test'>('all');
  const [previewingVideoUrl, setPreviewingVideoUrl] = useState<string | null>(null);
  const [previewingVideoName, setPreviewingVideoName] = useState<string>('');
  const [fetchedUserVideos, setFetchedUserVideos] = useState<any[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewResource, setPreviewResource] = useState<any | null>(null);

  // Resource Upload & Link States
  const [isResourceUploading, setIsResourceUploading] = useState(false);
  const [showAddLinkForm, setShowAddLinkForm] = useState(false);
  const [newResourceLinkName, setNewResourceLinkName] = useState('');
  const [newResourceLinkUrl, setNewResourceLinkUrl] = useState('');

  const handleResourceFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentLesson) return;

    setIsResourceUploading(true);
    try {
      const formData = new FormData();
      formData.append('fileData', file);
      formData.append('folder', 'resources');
      if (currentLesson.id) {
        formData.append('lesson_id', currentLesson.id);
      }

      const res: any = await apiFetch('media-upload.php', {
        method: 'POST',
        body: formData,
      });

      if (res && res.success) {
        const fileType = file.name.split('.').pop()?.toLowerCase() || 'pdf';
        const formattedSize = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
        const newResource = {
          id: `res-${Date.now()}`,
          name: file.name,
          url: res.url || res.path || '',
          fileSize: formattedSize,
          type: 'file',
          fileType: fileType
        };

        const updatedResources = [...(currentLesson.resources || []), newResource];
        handleUpdateCurrentLesson({ resources: updatedResources });
        showNotification('Resource uploaded & attached to lecture', 'success');
      } else {
        showNotification(res?.error || 'Failed to upload resource', 'error');
      }
    } catch (err: any) {
      console.error('Resource upload error:', err);
      showNotification(err?.message || 'Error uploading resource file', 'error');
    } finally {
      setIsResourceUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleAddLinkResource = () => {
    if (!newResourceLinkName.trim() || !newResourceLinkUrl.trim() || !currentLesson) return;
    
    let formattedUrl = newResourceLinkUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const newResource = {
      id: `res-link-${Date.now()}`,
      name: newResourceLinkName.trim(),
      url: formattedUrl,
      fileSize: 'Web Link',
      type: 'link',
      fileType: 'link'
    };

    const updatedResources = [...(currentLesson.resources || []), newResource];
    handleUpdateCurrentLesson({ resources: updatedResources });
    setNewResourceLinkName('');
    setNewResourceLinkUrl('');
    setShowAddLinkForm(false);
    showNotification('Resource link attached to lecture', 'success');
  };

  const handleRemoveResource = (resourceId: string) => {
    if (!currentLesson) return;
    const updatedResources = (currentLesson.resources || []).filter((r: any) => r.id !== resourceId);
    handleUpdateCurrentLesson({ resources: updatedResources });
    showNotification('Resource detached from lecture', 'info');
  };

  // Fetch all user-uploaded videos from remote backend API like in Film & Edit
  const fetchUserVideos = async () => {
    setIsLoadingMedia(true);
    try {
      const userId = currentUser?.id || currentUser?.email || 'instructor_user';
      const url = `user-videos.php?user_id=${encodeURIComponent(userId)}`;
      const data = await apiFetch(url);
      if (data && data.success && Array.isArray(data.videos)) {
        const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv', '3gp', 'ogg', 'ogv', 'm4v', 'ts'];
        const isVideoFile = (filename: string) => {
          const ext = filename.split('.').pop()?.toLowerCase() || '';
          return videoExtensions.includes(ext);
        };

        const formatted = data.videos
          .filter((v: any) => {
            const name = v.filename || v.title || '';
            return isVideoFile(name) || isVideoFile(v.url || '');
          })
          .map((v: any) => ({
            id: v.id || `video-${Date.now()}`,
            name: v.filename || v.title || 'Filmed_Lecture_Video.mp4',
            url: v.url,
            fileSize: v.file_size ? `${(v.file_size / (1024 * 1024)).toFixed(1)} MB` : '12.5 MB',
            duration: 'Ready',
            uploadedAt: v.created_at ? new Date(v.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
            uploadedBy: v.user_id || userId,
            source: v.source || (v.folder === 'film-edit-studio' ? 'film_and_edit' : 'curriculum'),
            folder: v.folder || 'videos',
            tags: ['Chunked Resumable', v.folder || 'Studio']
          }));
        setFetchedUserVideos(formatted);
      }
    } catch (err) {
      console.warn('Failed to load user videos for media picker:', err);
    } finally {
      setIsLoadingMedia(false);
    }
  };

  useEffect(() => {
    if (isMediaLibraryOpen) {
      fetchUserVideos();
    }
  }, [isMediaLibraryOpen]);

  // Merge all available videos (from prop videos + fetched API videos)
  const allAvailableVideos = useMemo(() => {
    const list: any[] = [...propFilmVideos];
    fetchedUserVideos.forEach(fv => {
      if (fv.url && !list.some(item => item.url === fv.url)) {
        list.push(fv);
      }
    });
    return list;
  }, [propFilmVideos, fetchedUserVideos]);

  // Filtered media library videos
  const filteredMediaVideos = useMemo(() => {
    return allAvailableVideos.filter(video => {
      if (mediaSearchQuery.trim()) {
        const q = mediaSearchQuery.toLowerCase();
        const matchesName = (video.name || '').toLowerCase().includes(q);
        const matchesLesson = (video.associatedLessonTitle || '').toLowerCase().includes(q);
        const matchesTags = (video.tags || []).some((t: string) => t.toLowerCase().includes(q));
        if (!matchesName && !matchesLesson && !matchesTags) return false;
      }

      if (mediaFilter === 'film_studio') {
        return video.source === 'film_and_edit';
      }
      if (mediaFilter === 'curriculum') {
        return video.source === 'curriculum' || !!video.associatedLessonId;
      }
      if (mediaFilter === 'promo_test') {
        return video.source === 'promo_video' || video.source === 'test_video';
      }
      return true;
    });
  }, [allAvailableVideos, mediaSearchQuery, mediaFilter]);

  // Find module title and index for current selected lesson
  const currentLessonInfo = useMemo(() => {
    if (!selectedLessonId) return null;
    return allLessons.find(item => item.lesson.id === selectedLessonId) || null;
  }, [allLessons, selectedLessonId]);

  // Section module details for prominent top navigation display
  const sectionDetails = useMemo(() => {
    if (!currentLessonInfo) return { title: 'Curriculum Section', index: 1 };
    const modIdx = modules.findIndex(m => m.id === currentLessonInfo.moduleId || m.title === currentLessonInfo.moduleTitle);
    return {
      title: currentLessonInfo.moduleTitle || (modIdx >= 0 ? modules[modIdx].title : 'Curriculum Section'),
      index: modIdx >= 0 ? modIdx + 1 : 1
    };
  }, [modules, currentLessonInfo]);

  // Sequential Navigation: Next & Prev Lessons
  const currentIndex = useMemo(() => {
    return allLessons.findIndex(item => item.lesson.id === selectedLessonId);
  }, [allLessons, selectedLessonId]);

  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  // Direct Standard File Upload Handler
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      showNotification('Invalid file type. Please upload a valid video file (e.g., MP4, WEBM).', 'error');
      return;
    }

    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      showNotification('Video file size exceeds 500MB limit.', 'error');
      return;
    }

    const forbiddenExts = ['.php', '.exe', '.sh', '.bat', '.js'];
    const fileName = file.name.toLowerCase();
    if (forbiddenExts.some(ext => fileName.endsWith(ext))) {
      showNotification('This file type is not allowed for security reasons.', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

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
        const updates: Partial<LessonInput> = { videoUrl: finalUrl, videoPath: finalPath };
        if (thumbnailUrl) {
          updates.thumbnailUrl = thumbnailUrl;
        }
        handleUpdateCurrentLesson(updates);

        // Register in user-videos API
        const userId = currentUser?.id || currentUser?.email || 'instructor_user';
        const uploadId = `vid-${Date.now()}`;
        try {
          await apiFetch('user-videos.php', {
            method: 'POST',
            body: JSON.stringify({
              id: uploadId,
              user_id: userId,
              user_email: currentUser?.email || '',
              filename: file.name,
              url: finalUrl,
              file_path: finalPath,
              folder: 'course-lectures',
              source: 'curriculum',
              file_size: file.size
            })
          });
        } catch (e) {
          console.warn('Could not register video in user_videos table:', e);
        }

        // Persist lesson to backend DB
        if (currentLessonInfo?.moduleId && currentLesson) {
          await upsertLessonApi({
            id: currentLesson.id,
            module_id: currentLessonInfo.moduleId,
            title: currentLesson.title,
            type: 'video',
            videoUrl: finalUrl,
            videoPath: finalPath,
            content: currentLesson.content,
            isPreview: currentLesson.isPreview
          });
        }

        showNotification('Lecture video uploaded and assigned successfully!', 'success');
      } else {
        showNotification((res as any)?.message || 'Video upload failed.', 'error');
      }
    } catch (err) {
      console.error('Upload error:', err);
      showNotification('A network error occurred during upload.', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // Assign Selected Video from Media Library Modal
  const handleAssignVideoFromLibrary = async (video: any) => {
    if (!currentLesson) return;
    
    const updates: Partial<LessonInput> = {
      videoUrl: video.url,
      videoPath: video.file_path || video.url,
      type: 'video'
    };
    handleUpdateCurrentLesson(updates);

    // Persist directly to remote DB
    if (currentLessonInfo?.moduleId) {
      try {
        await upsertLessonApi({
          id: currentLesson.id,
          module_id: currentLessonInfo.moduleId,
          title: currentLesson.title,
          type: 'video',
          videoUrl: video.url,
          videoPath: video.file_path || video.url,
          content: currentLesson.content,
          isPreview: currentLesson.isPreview
        });
      } catch (err) {
        console.warn('Failed to sync assigned video to backend:', err);
      }
    }

    setIsMediaLibraryOpen(false);
    showNotification(`Assigned "${video.name}" to lecture "${currentLesson.title}"!`, 'success');
  };

  // Sync Lesson Directly via API
  const handleSyncLesson = async () => {
    if (!currentLesson) return;
    setIsSyncing(true);
    
    if (onSaveLesson) {
      onSaveLesson();
    }
    
    try {
      const lessonInfo = allLessons.find(l => l.lesson.id === currentLesson.id);
      const moduleId = lessonInfo?.moduleId;
      
      if (moduleId) {
        await upsertLessonApi({
          id: currentLesson.id,
          module_id: moduleId,
          title: currentLesson.title,
          duration: currentLesson.duration || '10:00',
          type: currentLesson.type,
          videoUrl: currentLesson.videoUrl,
          videoPath: currentLesson.videoPath,
          content: currentLesson.content,
          isPreview: currentLesson.isPreview
        });
        showNotification(`Lesson "${currentLesson.title}" saved successfully!`, 'success');
      }
    } catch (err) {
      console.error('Failed to sync lesson:', err);
      showNotification('Failed to save lesson content.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden text-left animate-fadeIn">
      
      {/* ========================================================================= */}
      {/* FULL-SCREEN TOP ACTION BAR (Prominently shows Section & Lecture)           */}
      {/* ========================================================================= */}
      <header className="h-16 px-4 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 z-30 shadow-none">
        
        {/* Left: Back button + Section Badge + Lecture Title */}
        <div className="flex items-center space-x-3 min-w-0 flex-1 mr-4">
          {onBackToCurriculum && (
            <button
              type="button"
              onClick={onBackToCurriculum}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-none text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer shrink-0"
              title="Return to Curriculum"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              <span className="hidden sm:inline">Back to Curriculum</span>
              <span className="sm:hidden">Back</span>
            </button>
          )}

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 shrink-0 hidden sm:block" />

          {/* Section Title & Lecture Title Context */}
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            {/* Prominent Section Badge */}
            <div className="flex items-center space-x-1.5 shrink-0">
              <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 rounded-none text-xs font-black uppercase tracking-wider max-w-[200px] sm:max-w-[280px] truncate shadow-none">
                Section {sectionDetails.index}: {sectionDetails.title}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 hidden md:block" />
            </div>
            
            {currentLesson ? (
              <div className="flex items-center space-x-2 min-w-0 flex-1">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 shrink-0 hidden lg:inline">
                  Lecture {currentIndex >= 0 ? currentIndex + 1 : 1}:
                </span>
                <input
                  type="text"
                  value={currentLesson.title}
                  onChange={(e) => handleUpdateCurrentLesson({ title: e.target.value })}
                  placeholder="Lecture Title..."
                  className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:outline-none px-1 py-0.5 w-full max-w-xl truncate transition-colors"
                />
              </div>
            ) : (
              <span className="text-sm font-black text-slate-500">No Lecture Selected</span>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* YouTube-style Episode Playlist Drawer Toggle */}
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`px-3 py-2 border rounded-none text-xs font-black flex items-center space-x-2 cursor-pointer transition-all ${
              isSidebarOpen
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 shadow-none'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Toggle Episodes & Lectures Playlist"
          >
            <Layers className="w-4 h-4 text-indigo-500" />
            <span className="hidden sm:inline">Episodes Playlist</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-none bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-black">
              {currentIndex >= 0 ? currentIndex + 1 : 1}/{allLessons.length}
            </span>
          </button>

          {/* Previous / Next Lesson */}
          <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-none overflow-hidden bg-white dark:bg-slate-900">
            <button
              type="button"
              disabled={!prevLesson}
              onClick={() => prevLesson && setSelectedLessonId(prevLesson.lesson.id)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title={prevLesson ? `Previous: ${prevLesson.lesson.title}` : 'No previous lesson'}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-800" />
            <button
              type="button"
              disabled={!nextLesson}
              onClick={() => nextLesson && setSelectedLessonId(nextLesson.lesson.id)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title={nextLesson ? `Next: ${nextLesson.lesson.title}` : 'No next lesson'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSyncLesson}
            disabled={isSyncing || !currentLesson}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-none text-xs font-black shadow-none cursor-pointer disabled:opacity-70 flex items-center space-x-1.5 transition-all active:scale-95"
          >
            {isSyncing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Save Lesson</span>
              </>
            )}
          </button>
        </div>
      </header>


      {/* ========================================================================= */}
      {/* MAIN FULL-SCREEN WORKSPACE: FOCUSED ON SINGLE LECTURE ALONE               */}
      {/* ========================================================================= */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Focused Main Editor Canvas */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50/70 dark:bg-slate-950/40">
          <div className="max-w-4xl mx-auto space-y-6 pb-16">
            {currentLesson ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-xs">
                
                {/* Lecture Config Bar: Type Selector & Free Preview Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Content Format:
                    </span>
                    <select
                      value={currentLesson.type}
                      onChange={(e: any) => handleUpdateCurrentLesson({ type: e.target.value })}
                      className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold capitalize cursor-pointer focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="video">📹 Video Lecture</option>
                      <option value="article">📝 Article Reading</option>
                      <option value="quiz">❓ Interactive Quiz</option>
                      <option value="audio">🎙️ Audio Session</option>
                      <option value="scorm">📦 SCORM Package</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleUpdateCurrentLesson({ isPreview: !currentLesson.isPreview })}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center space-x-1.5 ${
                        currentLesson.isPreview
                          ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-black'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                      title="Allow students to preview this lecture before purchasing"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{currentLesson.isPreview ? 'Free Preview Active' : 'Enable Free Preview'}</span>
                    </button>
                  </div>
                </div>

               {/* Video Lecture Upload & Media Studio */}
              {currentLesson.type === 'video' && (
                <div className="p-5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black">
                        <Video className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">
                          Video Lecture Media
                        </h4>
                      </div>
                    </div>

                    {/* Media Actions: Choose from Library */}
                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsMediaLibraryOpen(true)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
                      >
                        <FolderOpen className="w-4 h-4" />
                        <span>Choose from Uploaded Videos</span>
                      </button>
                    </div>
                  </div>

                  {/* Video State Card */}
                  {currentLesson.videoUrl || currentLesson.videoPath ? (
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-950/80 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 font-bold">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                              {(() => {
                                const pathOrUrl = currentLesson.videoPath || currentLesson.videoUrl || '';
                                try {
                                  const clean = pathOrUrl.split('?')[0].split('#')[0];
                                  const parts = clean.split('/');
                                  const last = parts[parts.length - 1];
                                  return last ? decodeURIComponent(last) : 'Lecture_Video.mp4';
                                } catch {
                                  return 'Lecture_Video.mp4';
                                }
                              })()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          {/* Quick standard replace file input */}
                          <label className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer">
                            {isUploading ? (
                              <div className="flex items-center space-x-1">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>{uploadProgress}%</span>
                              </div>
                            ) : (
                              <>
                                <span>Replace File</span>
                                <input type="file" className="hidden" accept="video/*" onChange={handleVideoUpload} disabled={isUploading} />
                              </>
                            )}
                          </label>

                          <button
                            type="button"
                            onClick={() => handleUpdateCurrentLesson({ videoUrl: '', videoPath: '' })}
                            className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                            title="Remove video from lecture"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Live Video Player Preview */}
                      <div className="rounded-xl overflow-hidden bg-black aspect-video max-h-64 relative flex items-center justify-center shadow-inner">
                        <video
                          src={currentLesson.videoUrl}
                          controls
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                  ) : (
                    /* Drag & Drop Standard Upload Box */
                    <label className="w-full flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 dark:border-indigo-800/50 rounded-2xl p-8 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors cursor-pointer group">
                      <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:text-indigo-600 transition-colors shadow-xs mb-3">
                        {isUploading ? (
                          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                        ) : (
                          <Upload className="w-6 h-6" />
                        )}
                      </div>
                      {isUploading ? (
                        <div className="text-center">
                          <p className="text-xs font-black text-slate-900 dark:text-slate-100">Uploading Lecture Video...</p>
                          <p className="text-[11px] text-indigo-600 font-bold mt-1">{uploadProgress}% uploaded</p>
                        </div>
                      ) : (
                        <div className="text-center space-y-1">
                          <p className="text-xs font-black text-slate-900 dark:text-slate-100">Click or Drag & Drop to upload video</p>
                          <p className="text-[10px] text-slate-400">Supports MP4, WEBM, MOV (Fast chunked direct upload)</p>
                        </div>
                      )}
                      <input type="file" className="hidden" accept="video/*" onChange={handleVideoUpload} disabled={isUploading} />
                    </label>
                  )}
                </div>
              )}

              {/* Lecture Resources & Supporting Media Studio */}
              <div className="p-5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                        <span>Lecture Resources & Supporting Media</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                          {(currentLesson.resources || []).length} attached
                        </span>
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowAddLinkForm(!showAddLinkForm)}
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{showAddLinkForm ? 'Cancel Link' : 'Add Web Link'}</span>
                    </button>

                    <label className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs">
                      {isResourceUploading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>Attach File</span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={handleResourceFileUpload}
                            disabled={isResourceUploading}
                          />
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* Optional Web Link Form */}
                {showAddLinkForm && (
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/80 space-y-3 animate-in fade-in duration-200">
                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Attach Web Link / External Workspace Resource</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Link Name (e.g. GitHub Starter Code, Figma File)"
                        value={newResourceLinkName}
                        onChange={(e) => setNewResourceLinkName(e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      />
                      <input
                        type="url"
                        placeholder="URL (e.g. https://github.com/org/repo)"
                        value={newResourceLinkUrl}
                        onChange={(e) => setNewResourceLinkUrl(e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleAddLinkResource}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black cursor-pointer"
                      >
                        Save Resource Link
                      </button>
                    </div>
                  </div>
                )}

                {/* Attached Resource Cards List with Preview */}
                {currentLesson.resources && currentLesson.resources.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {currentLesson.resources.map((res: any) => {
                      let icon = '📎';
                      const fileType = res.fileType || res.type || res.name?.split('.').pop()?.toLowerCase();
                      if (fileType === 'pdf') icon = '📕';
                      else if (['doc', 'docx'].includes(fileType)) icon = '📘';
                      else if (['xls', 'xlsx', 'csv'].includes(fileType)) icon = '📗';
                      else if (['ppt', 'pptx'].includes(fileType)) icon = '📙';
                      else if (['zip', 'rar', '7z'].includes(fileType)) icon = '📦';
                      else if (fileType === 'link' || res.type === 'link') icon = '🔗';

                      return (
                        <div
                          key={res.id}
                          className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs hover:border-emerald-300 dark:hover:border-emerald-800 transition-all"
                        >
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <span className="text-xl shrink-0">{icon}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate" title={res.name}>
                                {res.name}
                              </p>
                              <p className="text-[10px] text-slate-400 font-semibold truncate">
                                {res.fileSize || 'Attached'} • {String(fileType).toUpperCase()}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                            {/* Preview Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewResource({
                                  id: res.id,
                                  name: res.name,
                                  url: res.url,
                                  fileSize: res.fileSize || 'Attached',
                                  type: res.type || 'file',
                                  fileType: fileType
                                });
                                setIsPreviewModalOpen(true);
                              }}
                              className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1"
                              title="Live Preview Resource"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span className="text-[10px] hidden md:inline">Preview</span>
                            </button>

                            {/* Remove Button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveResource(res.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                              title="Detach Resource"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-dashed border-emerald-200 dark:border-emerald-900/60 text-center space-y-1">
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No supporting resources attached yet</p>
                    <p className="text-[10px] text-slate-400">Attach lecture slides, PDFs, code zip archives, or web links for your students</p>
                  </div>
                )}
              </div>

              {/* Word-Style Quill Document & Markdown Notes Studio */}
              <div className="space-y-3">
                <QuillWordEditor
                  value={currentLesson.content || ''}
                  onChange={(newContent) => handleUpdateCurrentLesson({ content: newContent })}
                  placeholder="Write comprehensive lecture instructions, study notes, formulas, reference links, and takeaways..."
                  minHeight="320px"
                  title="Lecture Document & Notes Editor"
                />
              </div>

              {/* Lesson Context, Lab and Resources Panel */}
              {(currentLesson.description || currentLesson.labUrl || (currentLesson.resources && currentLesson.resources.length > 0)) && (
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-in slide-in-from-top-2 duration-250">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <span>Lesson Context & Attached Resources</span>
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Description Card */}
                    {currentLesson.description && (
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-800 flex flex-col justify-between space-y-2">
                        <div className="space-y-1">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Lesson Description</span>
                          <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                            {currentLesson.description}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Lab Card */}
                    {currentLesson.labUrl && (
                      <div className="p-4 rounded-2xl bg-purple-50/40 dark:bg-purple-950/10 border border-purple-100 dark:border-purple-900/30 flex flex-col justify-between space-y-2">
                        <div className="space-y-1">
                          <span className="text-[9px] font-black uppercase tracking-wider text-[#7c3aed] block">Hands-on Coding Lab</span>
                          <h5 className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                            {currentLesson.labTitle || 'Interactive Workspace'}
                          </h5>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">{currentLesson.labUrl}</p>
                        </div>
                        <a
                          href={currentLesson.labUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-1.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl text-xs font-black text-center block transition-all"
                        >
                          Open Lab Workspace
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Resources List */}
                  {currentLesson.resources && currentLesson.resources.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                        Lesson Resources ({currentLesson.resources.length})
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {currentLesson.resources.map((res: any) => {
                          let icon = '📎';
                          const fileType = res.fileType || res.type || res.name?.split('.').pop()?.toLowerCase();
                          if (fileType === 'pdf') icon = '📕';
                          else if (['doc', 'docx'].includes(fileType)) icon = '📘';
                          else if (['xls', 'xlsx', 'csv'].includes(fileType)) icon = '📗';
                          else if (['ppt', 'pptx'].includes(fileType)) icon = '📙';
                          else if (fileType === 'txt') icon = '📝';
                          else if (['zip', 'rar', '7z'].includes(fileType)) icon = '📦';

                          return (
                            <div 
                              key={res.id} 
                              className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                            >
                              <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                                <span className="text-sm shrink-0">{icon}</span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate" title={res.name}>{res.name}</p>
                                  <p className="text-[9px] text-slate-400 font-bold truncate">Size: {res.fileSize || 'Attached'} • Type: {String(fileType).toUpperCase()}</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPreviewResource({
                                      id: res.id,
                                      name: res.name,
                                      url: res.url,
                                      fileSize: res.fileSize || 'Attached',
                                      type: res.type || 'file',
                                      fileType: fileType
                                    });
                                    setIsPreviewModalOpen(true);
                                  }}
                                  className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-400 hover:text-indigo-600 rounded-md transition-colors cursor-pointer"
                                  title="Quick Preview"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Sync Bar */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-2 text-emerald-600 text-xs font-bold">
                  <Check className="w-4 h-4" />
                  <span>Auto-saved to course memory</span>
                </div>
                <button
                  type="button"
                  onClick={handleSyncLesson}
                  disabled={isSyncing}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-md cursor-pointer disabled:opacity-70 flex items-center space-x-1.5 transition-all"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Lesson</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center text-xs text-slate-400 shadow-xs">
              No lecture selected. Please select a lesson from the list or return to Curriculum.
            </div>
          )}
          </div>
        </main>

        {/* ========================================================================= */}
        {/* YOUTUBE-STYLE EPISODES & PLAYLIST DRAWER / PANEL                          */}
        {/* ========================================================================= */}
        {isSidebarOpen && (
          <>
            {/* Backdrop for small/medium screens */}
            <div
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-2xs z-30 lg:hidden"
            />

            {/* Slide-over Episode Playlist Panel */}
            <aside className="fixed top-16 right-0 bottom-0 z-40 w-full sm:w-96 md:w-[420px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
              
              {/* YouTube-style Playlist Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight">
                        Course Episodes
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                        Episode {currentIndex >= 0 ? currentIndex + 1 : 1} of {allLessons.length}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                    title="Close Playlist"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Search / Filter Episodes */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search episode or section..."
                    value={lessonSearchQuery}
                    onChange={(e) => setLessonSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Episode Items List (YouTube video card style) */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {allLessons
                  .filter(item => {
                    if (!lessonSearchQuery.trim()) return true;
                    const q = lessonSearchQuery.toLowerCase();
                    return item.lesson.title.toLowerCase().includes(q) || item.moduleTitle.toLowerCase().includes(q);
                  })
                  .map(({ lesson, moduleTitle }, index) => {
                    const isSelected = lesson.id === selectedLessonId;
                    const originalIndex = allLessons.findIndex(l => l.lesson.id === lesson.id);

                    return (
                      <div
                        key={lesson.id}
                        onClick={() => {
                          setSelectedLessonId(lesson.id);
                        }}
                        className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex gap-3 group relative ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 ring-1 ring-indigo-400 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        {/* 16:9 YouTube Thumbnail Box */}
                        <div className="w-28 sm:w-32 aspect-video rounded-xl bg-slate-900 overflow-hidden relative shrink-0 flex items-center justify-center border border-slate-800 shadow-2xs">
                          {lesson.thumbnailUrl ? (
                            <img
                              src={lesson.thumbnailUrl}
                              alt=""
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : lesson.videoUrl ? (
                            <div className="w-full h-full bg-linear-to-br from-indigo-950 to-slate-900 flex items-center justify-center">
                              <Video className="w-5 h-5 text-indigo-400" />
                            </div>
                          ) : lesson.type === 'quiz' ? (
                            <div className="w-full h-full bg-linear-to-br from-emerald-950 to-slate-900 flex items-center justify-center">
                              <HelpCircle className="w-5 h-5 text-emerald-400" />
                            </div>
                          ) : (
                            <div className="w-full h-full bg-linear-to-br from-slate-900 to-slate-950 flex items-center justify-center">
                              <FileText className="w-5 h-5 text-slate-400" />
                            </div>
                          )}

                          {/* Episode Index Pill */}
                          <span className="absolute top-1 left-1 px-1.5 py-0.2 bg-black/75 backdrop-blur-2xs text-[9px] font-black text-white rounded">
                            #{originalIndex + 1}
                          </span>

                          {/* Duration or Format Badge */}
                          <span className="absolute bottom-1 right-1 px-1.5 py-0.2 bg-black/80 backdrop-blur-2xs text-[9px] font-bold text-white rounded-none">
                            {lesson.duration || (lesson.type === 'video' ? 'VIDEO' : lesson.type === 'quiz' ? 'QUIZ' : 'ARTICLE')}
                          </span>

                          {/* Now Playing / Now Editing Overlay */}
                          {isSelected && (
                            <div className="absolute inset-0 bg-indigo-900/60 backdrop-blur-2xs flex flex-col items-center justify-center text-white space-y-0.5">
                              <Play className="w-4 h-4 fill-white text-white animate-pulse" />
                              <span className="text-[8px] font-black uppercase tracking-widest">Editing</span>
                            </div>
                          )}
                        </div>

                        {/* Episode Info */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 truncate max-w-[140px]">
                                {moduleTitle}
                              </span>
                              {isSelected && (
                                <span className="text-[9px] font-black text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950 px-1.5 py-0.2 rounded-md shrink-0">
                                  Current
                                </span>
                              )}
                            </div>
                            <h4 className={`text-xs font-bold line-clamp-2 leading-snug ${
                              isSelected ? 'text-indigo-950 dark:text-indigo-100' : 'text-slate-900 dark:text-slate-100'
                            }`}>
                              {lesson.title || 'Untitled Lecture'}
                            </h4>
                          </div>

                          {/* Bottom Tags */}
                          <div className="flex items-center gap-1.5 mt-1">
                            {lesson.videoUrl ? (
                              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Video Ready
                              </span>
                            ) : (
                              <span className="text-[9px] font-medium text-slate-400">
                                No video attached
                              </span>
                            )}
                            {lesson.isPreview && (
                              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/80 px-1 py-0.2 rounded">
                                Preview
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

            </aside>
          </>
        )}

      </div>

      {/* ========================================================================= */}
      {/* FULLSCREEN / MODAL: CHOOSE FROM UPLOADED VIDEOS (FILM & EDIT STUDIO)       */}
      {/* ========================================================================= */}
      {isMediaLibraryOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative z-[99999]">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                    Media Studio Video Library
                    <span className="text-xs bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 font-bold px-2 py-0.5 rounded-full">
                      {allAvailableVideos.length} Videos
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    Select any uploaded footage or studio clip to assign to lecture: <strong className="text-slate-800 dark:text-slate-200">"{currentLesson?.title}"</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsMediaLibraryOpen(false);
                  setPreviewingVideoUrl(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter & Search Bar with Grid/List Toggle */}
            <div className="p-4 sm:px-6 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto">
                {[
                  { key: 'all', label: `All Videos (${allAvailableVideos.length})` },
                  { key: 'film_studio', label: 'Studio Clips' },
                  { key: 'curriculum', label: 'Curriculum' },
                  { key: 'promo_test', label: 'Promo & Test' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setMediaFilter(tab.key as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      mediaFilter === tab.key
                        ? 'bg-indigo-600 text-white shadow-xs font-black'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-2.5 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search video name..."
                    value={mediaSearchQuery}
                    onChange={(e) => setMediaSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Grid / List Icon Toggle Switcher */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shrink-0">
                  <button
                    type="button"
                    onClick={() => setMediaViewMode('grid')}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      mediaViewMode === 'grid'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                    title="Grid View"
                  >
                    <Grid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaViewMode('list')}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      mediaViewMode === 'list'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                    title="List View"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Video Grid / Video Preview Area */}
            <div className="p-6 overflow-y-auto flex-1 max-h-[60vh]">
              {isLoadingMedia ? (
                <div className="py-16 text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                  <p className="text-xs font-bold text-slate-500">Loading your video library from remote server...</p>
                </div>
              ) : filteredMediaVideos.length === 0 ? (
                <div className="py-16 text-center space-y-4">
                  <Film className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
                  <div>
                    <h4 className="text-sm font-black text-slate-700 dark:text-slate-300">No videos found</h4>
                    <p className="text-xs text-slate-400 mt-1">Upload a video lecture using the Resumable Uploader or Film & Edit Studio.</p>
                  </div>
                </div>
              ) : mediaViewMode === 'grid' ? (
                /* GRID VIEW LAYOUT */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredMediaVideos.map(video => {
                    const isCurrentlyAttached = currentLesson?.videoUrl === video.url;

                    return (
                      <div
                        key={video.id || video.url}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                          isCurrentlyAttached
                            ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20 ring-1 ring-emerald-400'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-indigo-300 dark:hover:border-indigo-700'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                              {video.source === 'film_and_edit' ? 'Studio Clip' : video.source === 'promo_video' ? 'Promo Trailer' : 'Lecture Footage'}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 font-semibold">
                              {video.fileSize || 'HD Video'}
                            </span>
                          </div>

                          <div className="flex items-start space-x-2.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                              <Video className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-black text-slate-900 dark:text-slate-100 line-clamp-1">
                                {video.name}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Uploaded {video.uploadedAt || 'recently'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Card Action Buttons */}
                        <div className="pt-2 flex items-center space-x-2 border-t border-slate-100 dark:border-slate-700/60">
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewingVideoUrl(video.url);
                              setPreviewingVideoName(video.name);
                            }}
                            className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                            title="Preview video"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleAssignVideoFromLibrary(video)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                              isCurrentlyAttached
                                ? 'bg-emerald-600 text-white'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xs'
                            }`}
                          >
                            {isCurrentlyAttached ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Attached</span>
                              </>
                            ) : (
                              <span>Assign to Lecture</span>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* LIST VIEW LAYOUT (COMPACT SINGLE-COLUMN ROW LAYOUT) */
                <div className="space-y-2">
                  {filteredMediaVideos.map(video => {
                    const isCurrentlyAttached = currentLesson?.videoUrl === video.url;

                    return (
                      <div
                        key={video.id || video.url}
                        className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isCurrentlyAttached
                            ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10 ring-1 ring-emerald-400'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-indigo-300 dark:hover:border-indigo-700'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isCurrentlyAttached ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600' : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600'
                          }`}>
                            <Video className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-850 dark:text-slate-100 truncate max-w-[220px] sm:max-w-[450px]">
                              {video.name}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-450 dark:text-slate-400 font-medium mt-0.5">
                              <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded font-bold uppercase tracking-wide text-[9px]">
                                {video.source === 'film_and_edit' ? 'Studio' : video.source === 'promo_video' ? 'Promo' : 'Curriculum'}
                              </span>
                              <span>•</span>
                              <span>{video.fileSize || 'HD'}</span>
                              <span>•</span>
                              <span>Uploaded {video.uploadedAt || 'recently'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewingVideoUrl(video.url);
                              setPreviewingVideoName(video.name);
                            }}
                            className="p-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs cursor-pointer"
                            title="Preview video"
                          >
                            <PlayCircle className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAssignVideoFromLibrary(video)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                              isCurrentlyAttached
                                ? 'bg-emerald-600 text-white'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                            }`}
                          >
                            {isCurrentlyAttached ? 'Attached' : 'Assign to Lecture'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Video Player Modal Sub-overlay when clicking Preview */}
            {previewingVideoUrl && (
              <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-bottom-2">
                <div className="flex items-center space-x-3 text-white text-xs font-bold min-w-0">
                  <PlayCircle className="w-5 h-5 text-indigo-400 shrink-0" />
                  <span className="truncate max-w-sm">Previewing: {previewingVideoName}</span>
                </div>

                <div className="w-full md:w-auto aspect-video max-h-48 rounded-xl overflow-hidden bg-black">
                  <VideoPlayerWithFallback src={previewingVideoUrl} autoPlay className="w-full h-full object-contain" />
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const matched = allAvailableVideos.find(v => v.url === previewingVideoUrl);
                      if (matched) handleAssignVideoFromLibrary(matched);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black cursor-pointer shadow-xs"
                  >
                    Use This Video
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewingVideoUrl(null)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="p-4 sm:px-6 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={fetchUserVideos}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-indigo-600 font-bold flex items-center space-x-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMedia ? 'animate-spin' : ''}`} />
                <span>Refresh Video List</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMediaLibraryOpen(false);
                  setPreviewingVideoUrl(null);
                }}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-black cursor-pointer transition-colors"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Resource Quick Preview Modal */}
      <ResourcePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        resource={previewResource}
      />

    </div>
  );
};
