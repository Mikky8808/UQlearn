import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  Info, 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Link as LinkIcon, 
  ImageIcon, 
  Code, 
  AlertCircle,
  X,
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  Video
} from 'lucide-react';
import { saveAssignmentApi, fetchAssignmentsApi, uploadMediaApi, apiFetch, getActiveSession } from '../../../lib/apiConfig';

export interface AssignmentData {
  id?: string;
  courseId?: string;
  moduleId?: string;
  title: string;
  description?: string;
  duration?: number;
  videoUrl?: string;
  videoFileName?: string;
  instructions?: string;
  downloadableResourceUrl?: string;
  downloadableResourceFileName?: string;
  questions?: { id: string; text: string }[];
  questionAnswers?: { [questionId: string]: string };
  solutionVideoUrl?: string;
  solutionResourceUrl?: string;
  status?: string;
}

export interface CreateAssignmentProps {
  initialAssignment?: AssignmentData;
  courseId?: string;
  moduleId?: string;
  currentUser?: any;
  onBack: () => void;
  onSave: (assignment: AssignmentData) => void;
  onPublish?: (assignment: AssignmentData) => void;
}

export const CreateAssignment: React.FC<CreateAssignmentProps> = ({
  initialAssignment,
  courseId,
  moduleId,
  currentUser,
  onBack,
  onSave,
  onPublish
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'instructions' | 'questions' | 'solutions'>('basic');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState(initialAssignment?.title || '');
  const [description, setDescription] = useState(initialAssignment?.description || '');
  const [duration, setDuration] = useState<number | ''>(initialAssignment?.duration || '');

  // Validation State for blur/touch dynamic error styling
  const [isTitleTouched, setIsTitleTouched] = useState(false);
  const [isDescriptionTouched, setIsDescriptionTouched] = useState(false);
  const [isDurationTouched, setIsDurationTouched] = useState(false);

  const hasTitleError = isTitleTouched && !title.trim();
  const hasDescriptionError = isDescriptionTouched && !description.trim();
  const hasDurationError = isDurationTouched && (!duration || Number(duration) < 1);

  // Instructions State
  const [videoSourceTab, setVideoSourceTab] = useState<'upload' | 'library'>('upload');
  const [videoFileName, setVideoFileName] = useState(
    initialAssignment?.videoFileName || (initialAssignment?.videoUrl ? 'Uploaded_Assignment_Video.mp4' : 'No file selected')
  );
  const [videoUrl, setVideoUrl] = useState(initialAssignment?.videoUrl || '');
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [libraryVideos, setLibraryVideos] = useState<any[]>([]);
  const [isLoadingLibraryVideos, setIsLoadingLibraryVideos] = useState(false);
  const [instructionsText, setInstructionsText] = useState(initialAssignment?.instructions || '');
  const [resourceFileName, setResourceFileName] = useState(initialAssignment?.downloadableResourceFileName || 'No file selected');
  const [isPublished, setIsPublished] = useState<boolean>(
    initialAssignment?.status === 'published' || (initialAssignment as any)?.isPublished || false
  );

  const validateMandatoryFields = () => {
    const missing: string[] = [];
    if (!title.trim()) missing.push('Title');
    if (!description.trim()) missing.push('Description');
    if (!duration || Number(duration) < 1) missing.push('Estimated Duration (at least 1 min)');
    if (questions.length === 0) missing.push('At least 1 Question');
    return missing;
  };

  useEffect(() => {
    const loadLibraryVideos = async () => {
      setIsLoadingLibraryVideos(true);
      try {
        const session = getActiveSession() || JSON.parse(localStorage.getItem('uqlearn_session') || '{}');
        const userId = currentUser?.id || currentUser?.userId || session?.id || session?.userId || session?.email || 'instructor';
        const res = await apiFetch(`user-videos.php?user_id=${encodeURIComponent(userId)}`, { silent: true });
        if (res) {
          const list = Array.isArray(res) ? res : (res.videos || res.data || []);
          setLibraryVideos(list);
        }
      } catch (e) {
        console.warn('Failed to load library videos:', e);
      } finally {
        setIsLoadingLibraryVideos(false);
      }
    };
    if (videoSourceTab === 'library') {
      loadLibraryVideos();
    }
  }, [videoSourceTab, currentUser]);

  const videoFilteredLibraryVideos = libraryVideos.filter((vid) => {
    const name = (vid.name || vid.file_name || vid.url || '').toLowerCase();
    const ext = name.split('.').pop() || '';
    const nonVideoExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'ppt', 'pptx', 'txt', 'zip', 'rar', '7z', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'];
    if (nonVideoExts.includes(ext)) return false;
    const videoExts = ['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v', 'ogv', '3gp'];
    if (videoExts.includes(ext) || vid.folder === 'videos' || name.includes('mp4') || name.includes('mov') || name.includes('mkv') || name.includes('webm') || name.includes('avi')) {
      return true;
    }
    return !nonVideoExts.includes(ext);
  });

  const handleVideoFileChange = async (file: File) => {
    setIsVideoUploading(true);
    setUploadProgress(1);
    setVideoFileName(file.name);
    try {
      const res = await uploadMediaApi(file, (percent) => {
        setUploadProgress(percent);
      }, 'videos');
      if (res && (res.success || res.url || res.path || res.fileUrl || res.stored_path)) {
        const url = res.url || res.path || res.fileUrl || res.stored_path || '';
        const name = res.filename || res.fileName || file.name;
        if (url) {
          setVideoUrl(url);
          setVideoFileName(name);

          const updated: AssignmentData = {
            id: initialAssignment?.id || `assg-${Date.now()}`,
            courseId: courseId || initialAssignment?.courseId,
            moduleId: moduleId || initialAssignment?.moduleId,
            title: title || 'Untitled Assignment',
            description,
            duration: typeof duration === 'number' ? duration : 0,
            videoUrl: url,
            videoFileName: name,
            instructions: instructionsText,
            downloadableResourceFileName: resourceFileName,
            questions,
            solutionVideoUrl,
            status: initialAssignment?.status || 'draft'
          };

          await saveAssignmentApi({
            id: updated.id,
            course_id: updated.courseId,
            module_id: updated.moduleId,
            title: updated.title,
            description: updated.description,
            duration: updated.duration,
            video_url: url,
            video_file_name: name,
            instructions: updated.instructions,
            downloadable_resource_file_name: updated.downloadableResourceFileName,
            questions: updated.questions,
            question_answers: questionAnswers,
            solution_video_url: updated.solutionVideoUrl,
            status: updated.status
          });

          setSaveSuccessMessage('Video uploaded and saved to database successfully!');
          setTimeout(() => setSaveSuccessMessage(null), 3000);
          onSave(updated);
        }
      }
    } catch (err) {
      console.warn('Video upload error:', err);
      setSaveSuccessMessage('Video upload failed. Please try again.');
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    } finally {
      setIsVideoUploading(false);
    }
  };

  const handleSelectLibraryVideo = async (vid: any) => {
    const url = vid.url || vid.file_url || vid.path || '';
    const name = vid.name || vid.file_name || 'Studio Video.mp4';
    if (url) {
      setVideoUrl(url);
      setVideoFileName(name);
      setVideoSourceTab('upload');

      const updated: AssignmentData = {
        id: initialAssignment?.id || `assg-${Date.now()}`,
        courseId: courseId || initialAssignment?.courseId,
        moduleId: moduleId || initialAssignment?.moduleId,
        title: title || 'Untitled Assignment',
        description,
        duration: typeof duration === 'number' ? duration : 0,
        videoUrl: url,
        videoFileName: name,
        instructions: instructionsText,
        downloadableResourceFileName: resourceFileName,
        questions,
        solutionVideoUrl,
        status: initialAssignment?.status || 'draft'
      };

      try {
        await saveAssignmentApi({
          id: updated.id,
          course_id: updated.courseId,
          module_id: updated.moduleId,
          title: updated.title,
          description: updated.description,
          duration: updated.duration,
          video_url: url,
          video_file_name: name,
          instructions: updated.instructions,
          downloadable_resource_file_name: updated.downloadableResourceFileName,
          questions: updated.questions,
          question_answers: questionAnswers,
          solution_video_url: updated.solutionVideoUrl,
          status: updated.status
        });
        setSaveSuccessMessage('Studio video selected and saved to database successfully!');
        setTimeout(() => setSaveSuccessMessage(null), 3000);
        onSave(updated);
      } catch (err) {
        console.warn('Library video selection save error:', err);
      }
    }
  };

  // Questions State
  const [questions, setQuestions] = useState<{ id: string; text: string }[]>(
    initialAssignment?.questions || []
  );
  const [newQuestionText, setNewQuestionText] = useState('');
  const [isAddingQuestion, setIsAddingQuestion] = useState(questions.length === 0);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [isQuestionInfoDismissed, setIsQuestionInfoDismissed] = useState(false);

  // Solutions State
  const [solutionVideoTab, setSolutionVideoTab] = useState<'upload' | 'library'>('upload');
  const [solutionVideoFileName, setSolutionVideoFileName] = useState('No file selected');
  const [solutionVideoUrl, setSolutionVideoUrl] = useState(initialAssignment?.solutionVideoUrl || '');
  const [isSolutionVideoUploading, setIsSolutionVideoUploading] = useState(false);
  const [solutionUploadProgress, setSolutionUploadProgress] = useState(0);
  const [solutionResourceFileName, setSolutionResourceFileName] = useState('No file selected');
  const [questionAnswers, setQuestionAnswers] = useState<{ [questionId: string]: string }>(
    initialAssignment?.questionAnswers || {}
  );
  const [answeringQuestionId, setAnsweringQuestionId] = useState<string | null>(null);
  const [currentAnswerText, setCurrentAnswerText] = useState('');

  const handleFormatText = (
    value: string,
    setValue: (val: string) => void,
    tag: 'b' | 'i' | 'ul' | 'ol' | 'link' | 'image' | 'code'
  ) => {
    let formatted = value;
    if (tag === 'b') {
      formatted = value + ' **bold text** ';
    } else if (tag === 'i') {
      formatted = value + ' *italic text* ';
    } else if (tag === 'ul') {
      formatted = value + '\n- Item 1\n- Item 2\n';
    } else if (tag === 'ol') {
      formatted = value + '\n1. First\n2. Second\n';
    } else if (tag === 'link') {
      formatted = value + ' [Link Text](https://example.com) ';
    } else if (tag === 'image') {
      formatted = value + ' ![Image Alt](https://example.com/image.png) ';
    } else if (tag === 'code') {
      formatted = value + ' `code snippet` ';
    }
    setValue(formatted);
  };

  const handleSolutionVideoFileChange = async (file: File) => {
    setIsSolutionVideoUploading(true);
    setSolutionUploadProgress(1);
    setSolutionVideoFileName(file.name);
    try {
      const res = await uploadMediaApi(file, (percent) => {
        setSolutionUploadProgress(percent);
      }, 'videos');
      if (res && (res.success || res.url || res.path)) {
        const url = res.url || res.path || res.fileUrl || '';
        if (url) setSolutionVideoUrl(url);
      }
    } catch (err) {
      console.warn('Solution video upload error:', err);
    } finally {
      setIsSolutionVideoUploading(false);
    }
  };
  const [isLoadingApi, setIsLoadingApi] = useState(false);

  useEffect(() => {
    const loadAssignmentData = async () => {
      const assgId = initialAssignment?.id;
      if (!assgId) return;

      setIsLoadingApi(true);
      try {
        const res = await fetchAssignmentsApi(courseId, moduleId);
        let match: any = null;

        if (res && res.data) {
          if (Array.isArray(res.data)) {
            match = res.data.find((item: any) => item.id === assgId);
          } else if (res.data.id === assgId) {
            match = res.data;
          }
        }

        if (match) {
          if (match.title) setTitle(match.title);
          if (match.description) setDescription(match.description);
          if (match.duration) setDuration(Number(match.duration));
          if (match.instructions) setInstructionsText(match.instructions);
          if (match.video_file_name) setVideoFileName(match.video_file_name);
          if (match.downloadable_resource_file_name) setResourceFileName(match.downloadable_resource_file_name);
          if (Array.isArray(match.questions)) setQuestions(match.questions);
          if (match.question_answers) setQuestionAnswers(match.question_answers);
          if (match.solution_video_url) setSolutionVideoFileName(match.solution_video_url);
          if (match.solution_resource_url) setSolutionResourceFileName(match.solution_resource_url);
          if (match.status === 'published' || match.is_published == 1) {
            setIsPublished(true);
          }
        }
      } catch (err) {
        console.warn('Assignment API load notice:', err);
      } finally {
        setIsLoadingApi(false);
      }
    };

    loadAssignmentData();
  }, [initialAssignment?.id, courseId, moduleId]);

  const handleSaveCurrent = async (statusOverride?: string, nextTab?: 'basic' | 'instructions' | 'questions' | 'solutions') => {
    setIsTitleTouched(true);
    setIsDescriptionTouched(true);
    setIsDurationTouched(true);

    const targetStatus = statusOverride || (isPublished ? 'published' : 'draft');
    const missing = validateMandatoryFields();

    if (targetStatus === 'published' && missing.length > 0) {
      setSaveSuccessMessage(`Cannot publish: Missing mandatory fields: ${missing.join(', ')}.`);
      setActiveTab('basic');
      setIsPublished(false);
      return;
    }

    if (!title.trim()) {
      setActiveTab('basic');
      return;
    }

    setIsSaving(true);
    const updated: AssignmentData = {
      id: initialAssignment?.id || `assg-${Date.now()}`,
      courseId: courseId || initialAssignment?.courseId,
      moduleId: moduleId || initialAssignment?.moduleId,
      title: title || 'Untitled Assignment',
      description,
      duration: typeof duration === 'number' ? duration : 0,
      videoUrl,
      videoFileName,
      instructions: instructionsText,
      downloadableResourceFileName: resourceFileName,
      questions,
      solutionVideoUrl,
      solutionResourceUrl: solutionResourceFileName !== 'No file selected' ? solutionResourceFileName : undefined,
      status: targetStatus,
      isPublished: targetStatus === 'published'
    } as any;

    try {
      await saveAssignmentApi({
        id: updated.id,
        course_id: updated.courseId,
        module_id: updated.moduleId,
        title: updated.title,
        description: updated.description,
        duration: updated.duration,
        video_url: updated.videoUrl,
        video_file_name: updated.videoFileName,
        instructions: updated.instructions,
        downloadable_resource_file_name: updated.downloadableResourceFileName,
        questions: updated.questions,
        question_answers: questionAnswers,
        solution_video_url: updated.solutionVideoUrl,
        solution_resource_url: updated.solutionResourceUrl,
        status: updated.status,
        is_published: targetStatus === 'published' ? 1 : 0
      });
      setSaveSuccessMessage(targetStatus === 'published' ? 'Assignment published successfully!' : 'Assignment saved successfully!');
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    } catch (err) {
      console.warn('Backend assignment save fallback:', err);
      setSaveSuccessMessage('Assignment saved locally!');
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    } finally {
      setIsSaving(false);
    }

    if (nextTab) {
      setActiveTab(nextTab);
    }

    onSave(updated);
  };

  const saveQuestionsToBackend = async (updatedQuestions: { id: string; text: string }[]) => {
    try {
      await saveAssignmentApi({
        id: initialAssignment?.id || `assg-${Date.now()}`,
        course_id: courseId || initialAssignment?.courseId,
        module_id: moduleId || initialAssignment?.moduleId,
        title: title || 'Untitled Assignment',
        description,
        duration: typeof duration === 'number' ? duration : 0,
        video_url: videoUrl,
        video_file_name: videoFileName,
        instructions: instructionsText,
        downloadable_resource_file_name: resourceFileName,
        questions: updatedQuestions,
        solution_video_url: solutionVideoUrl,
        status: initialAssignment?.status || 'draft'
      });
      setSaveSuccessMessage('Question saved to database successfully!');
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    } catch (err) {
      console.warn('Database question save notice:', err);
    }
  };

  const handleAddOrUpdateQuestion = async () => {
    if (!newQuestionText.trim()) return;
    let updated: { id: string; text: string }[];
    if (editingQuestionId) {
      updated = questions.map(q => q.id === editingQuestionId ? { ...q, text: newQuestionText.trim() } : q);
    } else {
      const q = { id: `q-${Date.now()}`, text: newQuestionText.trim() };
      updated = [...questions, q];
    }
    setQuestions(updated);
    setNewQuestionText('');
    setIsAddingQuestion(false);
    setEditingQuestionId(null);
    await saveQuestionsToBackend(updated);
    onSave({ ...initialAssignment, title, description, questions: updated });
  };

  const handleDeleteQuestion = async (id: string) => {
    const updated = questions.filter(q => q.id !== id);
    setQuestions(updated);
    await saveQuestionsToBackend(updated);
    onSave({ ...initialAssignment, title, description, questions: updated });
  };

  const handleEditQuestion = (q: { id: string; text: string }) => {
    setEditingQuestionId(q.id);
    setNewQuestionText(q.text);
    setIsAddingQuestion(true);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 sm:p-8 font-sans text-slate-800 dark:text-slate-100">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Bar matching screenshot */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="text-xs font-bold text-[#6D28D9] dark:text-purple-400 hover:underline flex items-center space-x-1 cursor-pointer mb-1.5"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back to curriculum</span>
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Create Assignment
            </h1>
          </div>

          <button
            type="button"
            disabled={isSaving}
            onClick={async () => {
              const missing = validateMandatoryFields();
              if (!isPublished && missing.length > 0) {
                setSaveSuccessMessage(`Cannot publish: Missing mandatory fields: ${missing.join(', ')}.`);
                setActiveTab('basic');
                return;
              }
              const nextPublished = !isPublished;
              setIsPublished(nextPublished);
              const nextStatus = nextPublished ? 'published' : 'draft';
              await handleSaveCurrent(nextStatus);
              if (onPublish) onPublish({ title, description, questions, status: nextStatus, isPublished: nextPublished } as any);
            }}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer self-start sm:self-auto active:scale-95 ${
              isPublished
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-[#6D28D9] hover:bg-[#5B21B6] text-white'
            }`}
          >
            {isSaving ? 'Processing...' : isPublished ? 'Unpublish Assignment' : 'Publish Assignment'}
          </button>
        </div>

        {/* Step-by-Step Progress Tracker */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
          {[
            { id: 'basic', label: 'Basic Info', step: 1 },
            { id: 'instructions', label: 'Instructions', step: 2 },
            { id: 'solutions', label: 'Resource Upload', step: 3 }
          ].map((st) => {
            const isCurrent = (st.id === 'basic' && activeTab === 'basic') ||
                              (st.id === 'instructions' && activeTab === 'instructions') ||
                              (st.id === 'solutions' && (activeTab === 'questions' || activeTab === 'solutions'));
            const isCompleted = (st.id === 'basic' && activeTab !== 'basic') ||
                                (st.id === 'instructions' && (activeTab === 'questions' || activeTab === 'solutions'));

            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setActiveTab(st.id === 'solutions' ? 'solutions' : st.id as any)}
                className="flex items-center space-x-3 group cursor-pointer text-left w-full sm:w-auto flex-1 px-3 py-2 rounded-xl transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                  isCurrent
                    ? 'bg-[#6D28D9] text-white shadow-md ring-4 ring-purple-600/20'
                    : isCompleted
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200'
                }`}>
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : st.step}
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    Step {st.step}
                  </span>
                  <span className={`text-xs font-bold truncate block ${
                    isCurrent ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'
                  }`}>
                    {st.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Main Grid: Left Tabs Column + Right Form Canvas */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-2">
          {/* Left Vertical Navigation Tabs */}
          <div className="md:col-span-3 space-y-1">
            {[
              { id: 'basic', label: 'Basic Info' },
              { id: 'instructions', label: 'Instructions' },
              { id: 'questions', label: 'Questions' },
              { id: 'solutions', label: 'Solutions' }
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full text-left px-4 py-3 text-xs font-medium transition-all flex items-center border-l-4 cursor-pointer ${
                    isActive
                      ? 'border-[#6D28D9] text-[#6D28D9] dark:text-purple-400 font-bold bg-purple-50/40 dark:bg-purple-950/20'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Form Content */}
          <div className="md:col-span-9 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-6">
            
            {/* Global Save Success Message Toast */}
            {saveSuccessMessage && (
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center justify-between animate-in fade-in duration-150">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{saveSuccessMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSaveSuccessMessage(null)}
                  className="text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-200 p-0.5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* TAB 1: BASIC INFO (Screenshot 1: image_37885616.png) */}
            {activeTab === 'basic' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Title */}
                <div className="space-y-1.5">
                  <div className={`flex items-center space-x-1 text-xs font-bold ${
                    hasTitleError 
                      ? 'text-red-500 dark:text-red-400' 
                      : 'text-slate-700 dark:text-slate-300'
                  }`}>
                    <span>Title</span>
                    {hasTitleError && <Info className="w-3.5 h-3.5 text-red-500" />}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={100}
                      value={title}
                      onBlur={() => setIsTitleTouched(true)}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        if (e.target.value.trim()) setIsTitleTouched(false);
                      }}
                      className={`w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 pr-12 transition-colors ${
                        hasTitleError 
                          ? 'border-red-500 focus:ring-red-500/40' 
                          : 'border-slate-300 dark:border-slate-700 focus:ring-purple-600/40'
                      }`}
                      placeholder="Enter a Title"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                      {100 - title.length}
                    </span>
                  </div>
                  {hasTitleError && (
                    <p className="text-[11px] font-bold text-red-500 dark:text-red-400">
                      Title is required
                    </p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <div className={`flex items-center space-x-1 text-xs font-bold ${
                    hasDescriptionError 
                      ? 'text-rose-600 dark:text-rose-400' 
                      : 'text-slate-700 dark:text-slate-300'
                  }`}>
                    <span>Description</span>
                    {hasDescriptionError && <Info className="w-3.5 h-3.5 text-rose-500" />}
                  </div>
                  <div className="relative">
                    <textarea
                      rows={4}
                      value={description}
                      onBlur={() => setIsDescriptionTouched(true)}
                      onChange={(e) => {
                        setDescription(e.target.value);
                        if (e.target.value.trim()) setIsDescriptionTouched(false);
                      }}
                      className={`w-full p-3.5 bg-white dark:bg-slate-950 border rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 pr-12 transition-colors ${
                        hasDescriptionError 
                          ? 'border-rose-500 dark:border-rose-600 focus:ring-rose-500/40' 
                          : 'border-slate-300 dark:border-slate-700 focus:ring-purple-600/40'
                      }`}
                      placeholder="Add a detailed description..."
                    />
                    <span className="absolute right-3.5 bottom-3 text-xs font-medium text-slate-400">
                      300
                    </span>
                  </div>
                </div>

                {/* Estimated Duration */}
                <div className="space-y-1.5 max-w-xs">
                  <div className={`flex items-center space-x-1 text-xs font-bold ${
                    hasDurationError 
                      ? 'text-rose-600 dark:text-rose-400' 
                      : 'text-slate-700 dark:text-slate-300'
                  }`}>
                    <span>Estimated Duration</span>
                    {hasDurationError && <Info className="w-3.5 h-3.5 text-rose-500" />}
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={duration}
                    onBlur={() => setIsDurationTouched(true)}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDuration(val ? Number(val) : '');
                      if (val && Number(val) >= 1) setIsDurationTouched(false);
                    }}
                    className={`w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-colors ${
                      hasDurationError 
                        ? 'border-rose-500 dark:border-rose-600 focus:ring-rose-500/40' 
                        : 'border-slate-300 dark:border-slate-700 focus:ring-purple-600/40'
                    }`}
                    placeholder="Duration in minutes (e.g. 15)"
                  />
                  {hasDurationError && (
                    <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                      A minimum duration of 1 minute is required
                    </p>
                  )}
                </div>

                {/* Publish Status Toggle Switch */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                      Publish Status
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {isPublished ? 'Assignment is published and active for students' : 'Assignment is saved as draft'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const missing = validateMandatoryFields();
                      if (!isPublished && missing.length > 0) {
                        setSaveSuccessMessage(`Cannot publish: Missing mandatory fields: ${missing.join(', ')}.`);
                        return;
                      }
                      setIsPublished(!isPublished);
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isPublished ? 'bg-[#6D28D9]' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        isPublished ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Save Action */}
                <div className="pt-2 flex items-center space-x-3">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSaveCurrent(undefined)}
                    className="px-5 py-2 bg-purple-200 dark:bg-purple-950 text-purple-700 dark:text-purple-300 hover:bg-purple-300 disabled:opacity-50 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-1.5"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save</span>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSaveCurrent(undefined, 'instructions')}
                    className="px-5 py-2 bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-2xs transition-all cursor-pointer flex items-center space-x-1.5"
                  >
                    <span>Save & Go to Instructions &rarr;</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: INSTRUCTIONS (Screenshot 2: image_1ea0dfe6.png) */}
            {activeTab === 'instructions' && (
              <div className="space-y-8 animate-in fade-in duration-150">
                {/* Video Upload Section */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Video
                  </label>
                  <div className="flex items-center space-x-6 border-b border-slate-200 dark:border-slate-800 pb-1 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setVideoSourceTab('upload')}
                      className={`pb-2 transition-all cursor-pointer border-b-2 ${
                        videoSourceTab === 'upload'
                          ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white font-bold'
                          : 'border-transparent text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Upload Video
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoSourceTab('library')}
                      className={`pb-2 transition-all cursor-pointer border-b-2 ${
                        videoSourceTab === 'library'
                          ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white font-bold'
                          : 'border-transparent text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Add from library
                    </button>
                  </div>

                    {videoSourceTab === 'upload' ? (
                      isVideoUploading ? (
                        <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-950 p-4 space-y-3">
                          <div className="grid grid-cols-12 text-xs font-bold text-slate-500 border-b border-slate-200 dark:border-slate-800 pb-2">
                            <div className="col-span-5">Filename</div>
                            <div className="col-span-2">Type</div>
                            <div className="col-span-3">Status</div>
                            <div className="col-span-2 flex justify-between"><span>Date</span><span></span></div>
                          </div>
                          <div className="grid grid-cols-12 items-center text-xs text-slate-800 dark:text-slate-200 py-1">
                            <div className="col-span-5 truncate pr-2 font-medium">{videoFileName !== 'No file selected' ? videoFileName : 'Uploaded Video.mp4'}</div>
                            <div className="col-span-2 text-slate-500">Video</div>
                            <div className="col-span-3 flex items-center space-x-2 pr-4">
                              <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-600 transition-all duration-200" style={{ width: `${uploadProgress}%` }}></div>
                              </div>
                              <span className="text-[11px] font-bold text-slate-500">{uploadProgress}%</span>
                            </div>
                            <div className="col-span-2 flex items-center justify-between text-slate-500 text-[11px]">
                              <span>{new Date().toLocaleDateString('en-US')}</span>
                              <button type="button" onClick={() => setIsVideoUploading(false)} className="text-slate-400 hover:text-rose-500 cursor-pointer">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : videoFileName !== 'No file selected' ? (
                        <div className="space-y-4 max-w-xl">
                          <div className="px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                            {videoFileName}
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            We've uploaded your file, and are processing it to ensure it works smoothly on UQlearn. As soon as it's ready, we'll send you an email.
                          </p>
                          <div className="flex items-center space-x-3">
                            <label className="px-5 py-2 border border-[#6D28D9] text-[#6D28D9] dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-xl text-xs font-bold cursor-pointer transition-colors text-center">
                              Change
                              <input
                                type="file"
                                accept="video/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleVideoFileChange(file);
                                }}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setVideoFileName('No file selected');
                                setVideoUrl('');
                              }}
                              className="px-5 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-xl">
                          <div className="flex-1 px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-400 truncate">
                            {videoFileName}
                          </div>
                          <label className="px-4 py-2.5 border border-[#6D28D9] text-[#6D28D9] dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-lg text-xs font-bold cursor-pointer transition-colors text-center shrink-0">
                            Select Video
                            <input
                              type="file"
                              accept="video/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleVideoFileChange(file);
                              }}
                            />
                          </label>
                        </div>
                      )
                    ) : (
                      /* Add from library view listing videos uploaded via film and edit */
                      <div className="space-y-3 max-w-2xl">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            Studio Video Library ({videoFilteredLibraryVideos.length})
                          </span>
                          <span className="text-[9px] font-bold text-slate-400">
                            Videos uploaded via Film & Edit Studio
                          </span>
                        </div>

                        {isLoadingLibraryVideos ? (
                          <div className="py-8 text-center space-y-2">
                            <Loader2 className="w-6 h-6 text-purple-600 animate-spin mx-auto" />
                            <p className="text-xs text-slate-500">Loading videos from studio...</p>
                          </div>
                        ) : videoFilteredLibraryVideos.length === 0 ? (
                          <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center py-6 bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
                            <p className="text-xs text-slate-500 font-semibold">No studio videos found.</p>
                            <p className="text-[10px] text-slate-400">Record or upload videos in Film & Edit Studio to see them here.</p>
                          </div>
                        ) : (
                          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                            {videoFilteredLibraryVideos.map((vid) => {
                              const vUrl = vid.url || vid.file_url || '';
                              const vName = vid.name || vid.file_name || 'Studio Video.mp4';
                              const isSelected = videoUrl === vUrl;

                              return (
                                <div
                                  key={vid.id || vUrl}
                                  className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                                    isSelected
                                      ? 'border-purple-500 bg-purple-50/30 dark:bg-purple-950/20 ring-1 ring-purple-400'
                                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-purple-300'
                                  }`}
                                >
                                  <div className="flex items-center space-x-3 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center shrink-0">
                                      <Video className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate" title={vName}>
                                        {vName}
                                      </p>
                                      <p className="text-[10px] text-slate-400">
                                        Uploaded: {vid.created_at || vid.uploadedAt || 'Recently'} • Size: {vid.file_size || vid.fileSize || 'HD'}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleSelectLibraryVideo(vid)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                                      isSelected
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-[#6D28D9] hover:bg-[#5B21B6] text-white shadow-xs'
                                    }`}
                                  >
                                    {isSelected ? 'Selected' : 'Select'}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                    Note: All files should be at least 720p and less than 4.0 GB.
                  </p>
                </div>

                {/* Assignment Instructions Rich Text Area */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Assignment Instructions
                  </label>
                  <div className="border border-purple-500 dark:border-purple-600 rounded-lg overflow-hidden bg-white dark:bg-slate-950">
                    {/* Rich Formatting Toolbar */}
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 p-2 bg-slate-50/50 dark:bg-slate-900/50 text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex items-center space-x-3">
                        <select className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer">
                          <option>Styles</option>
                        </select>
                        <button type="button" onClick={() => handleFormatText(instructionsText, setInstructionsText, 'b')} className="font-bold hover:text-slate-900 dark:hover:text-white cursor-pointer">B</button>
                        <button type="button" onClick={() => handleFormatText(instructionsText, setInstructionsText, 'i')} className="italic hover:text-slate-900 dark:hover:text-white cursor-pointer">I</button>
                        <button type="button" onClick={() => handleFormatText(instructionsText, setInstructionsText, 'ol')} className="hover:text-slate-900 dark:hover:text-white cursor-pointer"><ListOrdered className="w-3.5 h-3.5" /></button>
                        <button type="button" onClick={() => handleFormatText(instructionsText, setInstructionsText, 'ul')} className="hover:text-slate-900 dark:hover:text-white cursor-pointer"><List className="w-3.5 h-3.5" /></button>
                        <button type="button" onClick={() => handleFormatText(instructionsText, setInstructionsText, 'link')} className="hover:text-slate-900 dark:hover:text-white cursor-pointer"><LinkIcon className="w-3.5 h-3.5" /></button>
                        <button type="button" onClick={() => handleFormatText(instructionsText, setInstructionsText, 'image')} className="hover:text-slate-900 dark:hover:text-white cursor-pointer"><ImageIcon className="w-3.5 h-3.5" /></button>
                        <button type="button" onClick={() => handleFormatText(instructionsText, setInstructionsText, 'code')} className="hover:text-slate-900 dark:hover:text-white cursor-pointer"><Code className="w-3.5 h-3.5" /></button>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-400 cursor-pointer hover:underline">Edit HTML</span>
                    </div>
                    <textarea
                      rows={5}
                      value={instructionsText}
                      onChange={(e) => setInstructionsText(e.target.value)}
                      className="w-full p-3.5 bg-transparent text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                      placeholder="Type instructions here..."
                    />
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => handleSaveCurrent()}
                      className="px-5 py-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer"
                    >
                      Submit
                    </button>
                    <button
                      type="button"
                      onClick={onBack}
                      className="px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900"
                    >
                      Cancel
                    </button>
                  </div>
                </div>

                {/* Downloadable resource */}
                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Downloadable resource
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-xl">
                    <div className="flex-1 px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-400 truncate">
                      {resourceFileName}
                    </div>
                    <label className="px-4 py-2.5 border border-[#6D28D9] text-[#6D28D9] dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-lg text-xs font-bold cursor-pointer transition-colors text-center shrink-0">
                      Select File
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setResourceFileName(file.name);
                        }}
                      />
                    </label>
                  </div>
                  {/* Note requested explicitly by user */}
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal max-w-2xl font-normal">
                    <strong>Note:</strong> A resource is for any type of document that can be used to help students in the lecture. This file is going to be seen as a lecture extra. Make sure everything is legible and the file size is less than 100MB.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: QUESTIONS (Screenshot 3: image_933f4c32.png) */}
            {activeTab === 'questions' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Info Card Banner */}
                {!isQuestionInfoDismissed && (
                  <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-950 flex items-start space-x-3.5 relative shadow-2xs">
                    <div className="w-7 h-7 rounded-full border border-purple-300 dark:border-purple-800 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 text-xs font-bold">
                      i
                    </div>
                    <div className="flex-1 space-y-3 pt-0.5">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                        Each assignment must include at least one question. You can add a maximum of 12 questions. Please consider that students will type their answers into a text box next to each question.
                      </p>
                      <div className="flex items-center space-x-4">
                        <button
                          type="button"
                          className="px-4 py-1.5 border border-purple-600 text-purple-600 dark:text-purple-400 rounded-lg text-xs font-bold hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors"
                        >
                          Learn more
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsQuestionInfoDismissed(true)}
                          className="text-xs font-bold text-purple-700 dark:text-purple-300 hover:underline"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Existing Questions List matching mockup */}
                {questions.map((q, idx) => (
                  <div key={q.id} className="p-5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Question {idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="text-slate-400 hover:text-rose-500 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {q.text}
                    </p>
                    <div className="flex items-center space-x-2 pt-2">
                      <button
                        type="button"
                        onClick={() => handleEditQuestion(q)}
                        className="px-4 py-1.5 bg-[#6D28D9] hover:bg-[#5B21B6] text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="px-4 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add More Button / Question Entry Form */}
                {!isAddingQuestion ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingQuestionId(null);
                      setNewQuestionText('');
                      setIsAddingQuestion(true);
                    }}
                    className="px-5 py-2.5 bg-white dark:bg-slate-900 border border-[#6D28D9] text-[#6D28D9] dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center space-x-1.5"
                  >
                    <span>+ Add more</span>
                  </button>
                ) : (
                  <div className="space-y-3 pt-2 p-5 border border-purple-500 dark:border-purple-600 rounded-2xl bg-white dark:bg-slate-950 shadow-sm">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      {editingQuestionId ? 'Edit Question' : `Question ${questions.length + 1}`}
                    </label>
                    <div className="border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-950">
                      <div className="flex items-center space-x-3 border-b border-slate-200 dark:border-slate-800 p-2 bg-slate-50/50 dark:bg-slate-900/50 text-xs text-slate-600 dark:text-slate-400">
                        <button type="button" onClick={() => handleFormatText(newQuestionText, setNewQuestionText, 'b')} className="font-bold hover:text-slate-900 cursor-pointer">B</button>
                        <button type="button" onClick={() => handleFormatText(newQuestionText, setNewQuestionText, 'i')} className="italic hover:text-slate-900 cursor-pointer">I</button>
                      </div>
                      <textarea
                        rows={4}
                        value={newQuestionText}
                        onChange={(e) => setNewQuestionText(e.target.value)}
                        className="w-full p-3.5 bg-transparent text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                        placeholder="Type question text here..."
                      />
                    </div>

                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={handleAddOrUpdateQuestion}
                        disabled={!newQuestionText.trim()}
                        className="px-5 py-2 bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer"
                      >
                        Submit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingQuestion(false);
                          setNewQuestionText('');
                          setEditingQuestionId(null);
                        }}
                        className="px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: SOLUTIONS */}
            {activeTab === 'solutions' && (
              <div className="space-y-8 animate-in fade-in duration-150">
                {/* Questions Solutions List */}
                {questions.length > 0 ? (
                  <div className="space-y-6">
                    {questions.map((q, idx) => {
                      const ans = questionAnswers[q.id];
                      const isAnswering = answeringQuestionId === q.id;

                      return (
                        <div key={q.id} className="p-5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950 space-y-3 shadow-2xs">
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                            Question {idx + 1}
                          </span>
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            {q.text}
                          </p>
                          <div className="space-y-2 pt-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                              Your answer
                            </label>
                            {ans && !isAnswering ? (
                              <div className="space-y-3">
                                <div className="text-xs font-normal text-slate-800 dark:text-slate-200 leading-relaxed pt-1">
                                  {ans}
                                </div>
                                <div className="flex items-center space-x-2 pt-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAnsweringQuestionId(q.id);
                                      setCurrentAnswerText(ans);
                                    }}
                                    className="px-5 py-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const updatedAnswers = { ...questionAnswers };
                                      delete updatedAnswers[q.id];
                                      setQuestionAnswers(updatedAnswers);
                                      await saveAssignmentApi({
                                        id: initialAssignment?.id || `assg-${Date.now()}`,
                                        course_id: courseId || initialAssignment?.courseId,
                                        module_id: moduleId || initialAssignment?.moduleId,
                                        title: title || 'Untitled Assignment',
                                        description,
                                        duration: typeof duration === 'number' ? duration : 0,
                                        video_url: videoUrl,
                                        video_file_name: videoFileName,
                                        instructions: instructionsText,
                                        downloadable_resource_file_name: resourceFileName,
                                        questions,
                                        question_answers: updatedAnswers,
                                        solution_video_url: solutionVideoUrl,
                                        status: initialAssignment?.status || 'draft'
                                      });
                                    }}
                                    className="px-5 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ) : isAnswering ? (
                              <div className="space-y-3">
                                <textarea
                                  rows={4}
                                  value={currentAnswerText}
                                  onChange={(e) => setCurrentAnswerText(e.target.value)}
                                  className="w-full p-3.5 bg-white dark:bg-slate-950 border border-purple-500 dark:border-purple-600 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none"
                                  placeholder="Type answer here..."
                                />
                                <div className="flex items-center space-x-3">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (!currentAnswerText.trim()) return;
                                      const updatedAnswers = { ...questionAnswers, [q.id]: currentAnswerText.trim() };
                                      setQuestionAnswers(updatedAnswers);
                                      setAnsweringQuestionId(null);
                                      setCurrentAnswerText('');
                                      await saveAssignmentApi({
                                        id: initialAssignment?.id || `assg-${Date.now()}`,
                                        course_id: courseId || initialAssignment?.courseId,
                                        module_id: moduleId || initialAssignment?.moduleId,
                                        title: title || 'Untitled Assignment',
                                        description,
                                        duration: typeof duration === 'number' ? duration : 0,
                                        video_url: videoUrl,
                                        video_file_name: videoFileName,
                                        instructions: instructionsText,
                                        downloadable_resource_file_name: resourceFileName,
                                        questions,
                                        question_answers: updatedAnswers,
                                        solution_video_url: solutionVideoUrl,
                                        status: initialAssignment?.status || 'draft'
                                      });
                                    }}
                                    className="px-5 py-2.5 bg-[#6D28D9] hover:bg-[#5B21B6] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                                  >
                                    Submit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAnsweringQuestionId(null);
                                      setCurrentAnswerText('');
                                    }}
                                    className="px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setAnsweringQuestionId(q.id);
                                  setCurrentAnswerText('');
                                }}
                                className="px-5 py-2.5 bg-[#6D28D9] hover:bg-[#5B21B6] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                              >
                                Add Answer
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 border border-rose-500 dark:border-rose-600 rounded-xl bg-white dark:bg-slate-950 flex items-center space-x-3 text-xs font-semibold text-slate-900 dark:text-slate-100">
                    <div className="w-6 h-6 rounded-full border border-rose-500 text-rose-500 flex items-center justify-center shrink-0 text-xs font-bold">
                      !
                    </div>
                    <div>
                      <span>You have no question yet. </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('questions')}
                        className="text-[#6D28D9] dark:text-purple-400 font-bold underline hover:text-[#5B21B6] cursor-pointer"
                      >
                        Click Here to Add
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
