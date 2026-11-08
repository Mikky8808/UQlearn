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
  Loader2
} from 'lucide-react';
import { saveAssignmentApi, fetchAssignmentsApi } from '../../../lib/apiConfig';

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
  solutionVideoUrl?: string;
  solutionResourceUrl?: string;
  status?: string;
}

export interface CreateAssignmentProps {
  initialAssignment?: AssignmentData;
  courseId?: string;
  moduleId?: string;
  onBack: () => void;
  onSave: (assignment: AssignmentData) => void;
  onPublish?: (assignment: AssignmentData) => void;
}

export const CreateAssignment: React.FC<CreateAssignmentProps> = ({
  initialAssignment,
  courseId,
  moduleId,
  onBack,
  onSave,
  onPublish
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'instructions' | 'questions' | 'solutions'>('basic');
  const [isSaving, setIsSaving] = useState(false);
  
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
  const [videoFileName, setVideoFileName] = useState(initialAssignment?.videoFileName || 'No file selected');
  const [instructionsText, setInstructionsText] = useState(initialAssignment?.instructions || '');
  const [resourceFileName, setResourceFileName] = useState(initialAssignment?.downloadableResourceFileName || 'No file selected');

  // Questions State
  const [questions, setQuestions] = useState<{ id: string; text: string }[]>(
    initialAssignment?.questions || []
  );
  const [newQuestionText, setNewQuestionText] = useState('');
  const [isQuestionInfoDismissed, setIsQuestionInfoDismissed] = useState(false);

  // Solutions State
  const [solutionVideoTab, setSolutionVideoTab] = useState<'upload' | 'library'>('upload');
  const [solutionVideoFileName, setSolutionVideoFileName] = useState('No file selected');
  const [solutionResourceFileName, setSolutionResourceFileName] = useState('No file selected');
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
          if (match.solution_video_url) setSolutionVideoFileName(match.solution_video_url);
          if (match.solution_resource_url) setSolutionResourceFileName(match.solution_resource_url);
        }
      } catch (err) {
        console.warn('Assignment API load notice:', err);
      } finally {
        setIsLoadingApi(false);
      }
    };

    loadAssignmentData();
  }, [initialAssignment?.id, courseId, moduleId]);

  const handleSaveCurrent = async (statusOverride?: string) => {
    setIsTitleTouched(true);
    setIsDescriptionTouched(true);
    setIsDurationTouched(true);

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
      videoFileName,
      instructions: instructionsText,
      downloadableResourceFileName: resourceFileName,
      questions,
      solutionVideoUrl: solutionVideoFileName !== 'No file selected' ? solutionVideoFileName : undefined,
      solutionResourceUrl: solutionResourceFileName !== 'No file selected' ? solutionResourceFileName : undefined,
      status: statusOverride || initialAssignment?.status || 'draft'
    };

    try {
      await saveAssignmentApi({
        id: updated.id,
        course_id: updated.courseId,
        module_id: updated.moduleId,
        title: updated.title,
        description: updated.description,
        duration: updated.duration,
        video_file_name: updated.videoFileName,
        instructions: updated.instructions,
        downloadable_resource_file_name: updated.downloadableResourceFileName,
        questions: updated.questions,
        solution_video_url: updated.solutionVideoUrl,
        solution_resource_url: updated.solutionResourceUrl,
        status: updated.status
      });
    } catch (err) {
      console.warn('Backend assignment save fallback:', err);
    } finally {
      setIsSaving(false);
    }

    onSave(updated);
  };

  const handleAddQuestion = () => {
    if (!newQuestionText.trim()) return;
    const q = { id: `q-${Date.now()}`, text: newQuestionText.trim() };
    setQuestions(prev => [...prev, q]);
    setNewQuestionText('');
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
              await handleSaveCurrent('published');
              if (onPublish) onPublish({ title, description, questions, status: 'published' });
            }}
            className="px-6 py-2.5 bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer self-start sm:self-auto active:scale-95"
          >
            {isSaving ? 'Publishing...' : 'Publish'}
          </button>
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

                {/* Save Action */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleSaveCurrent()}
                    className="px-6 py-2 bg-purple-200 dark:bg-purple-950 text-purple-700 dark:text-purple-300 hover:bg-purple-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Save
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
                          if (file) setVideoFileName(file.name);
                        }}
                      />
                    </label>
                  </div>
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
                        <button type="button" className="font-bold hover:text-slate-900 dark:hover:text-white">B</button>
                        <button type="button" className="italic hover:text-slate-900 dark:hover:text-white">I</button>
                        <button type="button" className="hover:text-slate-900 dark:hover:text-white"><ListOrdered className="w-3.5 h-3.5" /></button>
                        <button type="button" className="hover:text-slate-900 dark:hover:text-white"><List className="w-3.5 h-3.5" /></button>
                        <button type="button" className="hover:text-slate-900 dark:hover:text-white"><LinkIcon className="w-3.5 h-3.5" /></button>
                        <button type="button" className="hover:text-slate-900 dark:hover:text-white"><ImageIcon className="w-3.5 h-3.5" /></button>
                        <button type="button" className="hover:text-slate-900 dark:hover:text-white"><Code className="w-3.5 h-3.5" /></button>
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

                {/* Existing Questions List */}
                {questions.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Assignment Questions ({questions.length})
                    </h4>
                    {questions.map((q, idx) => (
                      <div key={q.id} className="p-3.5 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between bg-slate-50/50 dark:bg-slate-950">
                        <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                          {idx + 1}. {q.text}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuestions(prev => prev.filter(item => item.id !== q.id))}
                          className="text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Question Entry Form */}
                <div className="space-y-3 pt-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Question {questions.length + 1}
                  </label>
                  <div className="border border-purple-500 dark:border-purple-600 rounded-lg overflow-hidden bg-white dark:bg-slate-950">
                    <div className="flex items-center space-x-3 border-b border-slate-200 dark:border-slate-800 p-2 bg-slate-50/50 dark:bg-slate-900/50 text-xs text-slate-600 dark:text-slate-400">
                      <button type="button" className="font-bold hover:text-slate-900">B</button>
                      <button type="button" className="italic hover:text-slate-900">I</button>
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
                      onClick={handleAddQuestion}
                      disabled={!newQuestionText.trim()}
                      className="px-5 py-2 bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer"
                    >
                      Submit
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewQuestionText('')}
                      className="px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: SOLUTIONS (Screenshot 4: image_e315a67d.png) */}
            {activeTab === 'solutions' && (
              <div className="space-y-8 animate-in fade-in duration-150">
                {/* Video Upload Section */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Video
                  </label>
                  <div className="flex items-center space-x-6 border-b border-slate-200 dark:border-slate-800 pb-1 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setSolutionVideoTab('upload')}
                      className={`pb-2 transition-all cursor-pointer border-b-2 ${
                        solutionVideoTab === 'upload'
                          ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white font-bold'
                          : 'border-transparent text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Upload Video
                    </button>
                    <button
                      type="button"
                      onClick={() => setSolutionVideoTab('library')}
                      className={`pb-2 transition-all cursor-pointer border-b-2 ${
                        solutionVideoTab === 'library'
                          ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white font-bold'
                          : 'border-transparent text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Add from library
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-xl">
                    <div className="flex-1 px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-400 truncate">
                      {solutionVideoFileName}
                    </div>
                    <label className="px-4 py-2.5 border border-[#6D28D9] text-[#6D28D9] dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-lg text-xs font-bold cursor-pointer transition-colors text-center shrink-0">
                      Select Video
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setSolutionVideoFileName(file.name);
                        }}
                      />
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                    Note: All files should be at least 720p and less than 4.0 GB.
                  </p>
                </div>

                {/* Red Alert Banner matching Screenshot 4 */}
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

                {/* Downloadable resource */}
                <div className="space-y-3 pt-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Downloadable resource
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-xl">
                    <div className="flex-1 px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-400 truncate">
                      {solutionResourceFileName}
                    </div>
                    <label className="px-4 py-2.5 border border-[#6D28D9] text-[#6D28D9] dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-lg text-xs font-bold cursor-pointer transition-colors text-center shrink-0">
                      Select File
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setSolutionResourceFileName(file.name);
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

          </div>
        </div>
      </div>
    </div>
  );
};
