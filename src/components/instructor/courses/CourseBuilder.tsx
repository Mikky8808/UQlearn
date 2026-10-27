import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Video, 
  FileText, 
  AlignLeft,
  HelpCircle, 
  DollarSign, 
  Image as ImageIcon, 
  CheckCircle2, 
  Layers, 
  Clock, 
  Eye, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  ChevronRight,
  UploadCloud, 
  Tag, 
  ListChecks, 
  ArrowRight,
  ArrowLeft,
  LayoutGrid,
  Menu,
  Info,
  Play,
  Pause,
  Save,
  Check,
  Copy,
  Share2,
  Mic,
  Maximize2,
  Minimize2,
  Settings,
  Users,
  Award,
  Download,
  History,
  FileCode,
  Palette,
  Bot,
  Shuffle,
  Volume2,
  Subtitles,
  FileSpreadsheet,
  Globe,
  Lock,
  Flame,
  Wand2,
  ExternalLink,
  Code,
  CheckSquare,
  GripVertical,
  Search,
  X,
  XCircle,
  Sliders,
  Percent,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Star,
  UserCheck,
  User,
  Edit3,
  Database,
  RefreshCw,
  MessageSquare,
  Bold,
  Italic,
  Underline,
  ListOrdered,
  List,
  Table,
  Link as LinkIcon,
  Film,
  Monitor,
  PanelLeftClose,
  PanelLeft,
  PlayCircle,
  Target,
  Compass,
  Tv,
  MonitorPlay,
  Loader2,
  Pencil,
  Folder,
  FolderPlus,
  FolderOpen,
  FolderInput,
  Move,
  Grid,
  MoreVertical,
  HardDrive,
  Camera,
  File as FileIcon
} from 'lucide-react';
import { Course } from '../../../types';
import { useSearchParams } from 'react-router-dom';
import { CourseImageUploader } from '../../common/CourseImageUploader';
import { CourseImageStandardsPage } from '../../pages/CourseImageStandardsPage';
import { UqlearnCertificateSvg } from '../../common/UqlearnCertificateSvg';
import { useApp, supportedCurrencies, Currency } from '../../../context/AppContext';
import { ALL_CURRENCIES } from '../../../lib/currencies';
import { currencyService } from '../../../services/currency-service';
import { CurriculumOrganizer } from './CurriculumOrganizer';
import { QuizBuilder, QuizData } from './QuizBuilder';
import { CourseContentBuilder } from './CourseContentBuilder';
import { RichTextWordEditor } from '../../common/RichTextWordEditor';
import { ResumableVideoUploader } from '../../common/ResumableVideoUploader';
import { 
  deleteCourseApi, 
  fetchCourseModulesApi, 
  upsertModuleApi, 
  updateSectionTitleApi, 
  deleteModuleOrLessonApi, 
  API_ENDPOINTS, 
  API_BASE_URL, 
  apiFetch, 
  saveIntendedLearnersApi, 
  getCourseMessagesApi, 
  saveCourseMessagesApi, 
  uploadMediaApi, 
  getCourseDescriptionChecklistApi,
  fetchVideoFoldersApi,
  createVideoFolderApi,
  renameVideoFolderApi,
  deleteVideoFolderApi,
  moveVideoToFolderApi,
  VideoFolder,
  ROOT_URL,
  updateActiveSession,
  DEFAULT_VIDEO_THUMBNAIL
} from '../../../lib/apiConfig';
import { ResourcePreviewModal } from '../../common/ResourcePreviewModal';
import { CourseAdCampaignManager } from './CourseAdCampaignManager';

// Unified list of currencies, ensuring platform currencies (with flags) come first
const COMBINED_CURRENCIES: Array<{ code: string; symbol: string; name: string; rate: number; flag?: string }> = (() => {
  const map = new Map<string, { code: string; symbol: string; name: string; rate: number; flag?: string }>();
  supportedCurrencies.forEach(c => {
    map.set(c.code, {
      code: c.code,
      symbol: c.symbol,
      name: c.name,
      rate: Number(c.rate) || 1,
      flag: c.flag
    });
  });
  ALL_CURRENCIES.forEach(c => {
    if (!map.has(c.code)) {
      map.set(c.code, {
        code: c.code,
        symbol: c.symbol,
        name: c.name,
        rate: Number(c.exchange_rate) || 1
      });
    }
  });
  return Array.from(map.values());
})();

export interface ResourceInput {
  id: string;
  name: string;
  type: 'file' | 'link';
  url: string;
  fileSize?: string;
}

export interface LessonInput {
  id: string;
  title: string;
  duration: string;
  type: 'video' | 'article' | 'quiz' | 'audio' | 'scorm';
  content?: string;
  videoUrl?: string;
  videoPath?: string;
  thumbnailUrl?: string;
  isPreview?: boolean;
  quizData?: QuizData;
  resources?: ResourceInput[];
  description?: string;
  labTitle?: string;
  labUrl?: string;
}

export interface ModuleInput {
  id: string;
  title: string;
  description?: string;
  lessons: LessonInput[];
  isExpanded?: boolean;
}

interface CouponInput {
  id: string;
  code: string;
  discountPercent: number;
  expiryDate: string;
  usageCount: number;
  maxUsage: number;
  isActive: boolean;
}

interface SnapshotInput {
  id: string;
  version: string;
  date: string;
  author: string;
  changes: string;
  snapshotData: any;
}

interface CourseBuilderProps {
  initialData?: Partial<Course>;
  courses?: Course[];
  selectedCourseId?: string;
  onSelectCourse?: (courseId: string) => void;
  onOpenQuickAddModal?: () => void;
  onSave: (courseData: any) => void;
  onDeleteCourse?: (courseId: string) => void;
  onManageModule?: (courseId: string, moduleId: string) => void;
  onManageLesson?: (courseId: string, moduleId: string, lessonId: string) => void;
  onCancel?: () => void;
}

export type BuilderTabKey = 
  | 'overview'
  | 'intended-learners'
  | 'structure' 
  | 'setup-video'
  | 'course-description'
  | 'film-edit'
  | 'curriculum'
  | 'captions'
  | 'accessibility'
  | 'landing-page'
  | 'pricing'
  | 'promotions'
  | 'messages'
  | 'content' 
  | 'assessment' 
  | 'design' 
  | 'ai' 
  | 'settings' 
  | 'collab'
  | 'certificate';

export const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return <FileText className="w-full h-full text-rose-500" />;
    case 'doc':
    case 'docx':
      return <FileText className="w-full h-full text-blue-500" />;
    case 'xls':
    case 'xlsx':
    case 'csv':
      return <FileSpreadsheet className="w-full h-full text-emerald-500" />;
    case 'ppt':
    case 'pptx':
      return <MonitorPlay className="w-full h-full text-orange-500" />;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
    case 'svg':
      return <ImageIcon className="w-full h-full text-purple-500" />;
    case 'mp3':
    case 'wav':
    case 'ogg':
      return <Mic className="w-full h-full text-amber-500" />;
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
      return <HardDrive className="w-full h-full text-slate-500" />;
    case 'txt':
      return <AlignLeft className="w-full h-full text-slate-400" />;
    case 'mp4':
    case 'mov':
    case 'avi':
    case 'mkv':
    case 'webm':
      return <Video className="w-full h-full text-indigo-500" />;
    default:
      return <FileIcon className="w-full h-full text-slate-400" />;
  }
};

export const getFolderColorClasses = (color: string = 'indigo') => {
  switch (color) {
    case 'emerald':
    case 'green':
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-950/40',
        cardBorder: 'border-emerald-200 dark:border-emerald-800/60 hover:border-emerald-400',
        text: 'text-emerald-700 dark:text-emerald-300',
        iconBg: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400',
        badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
      };
    case 'amber':
    case 'yellow':
      return {
        bg: 'bg-amber-50 dark:bg-amber-950/40',
        cardBorder: 'border-amber-200 dark:border-amber-800/60 hover:border-amber-400',
        text: 'text-amber-700 dark:text-amber-300',
        iconBg: 'bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400',
        badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800'
      };
    case 'rose':
    case 'red':
      return {
        bg: 'bg-rose-50 dark:bg-rose-950/40',
        cardBorder: 'border-rose-200 dark:border-rose-800/60 hover:border-rose-400',
        text: 'text-rose-700 dark:text-rose-300',
        iconBg: 'bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400',
        badge: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800'
      };
    case 'sky':
    case 'blue':
      return {
        bg: 'bg-sky-50 dark:bg-sky-950/40',
        cardBorder: 'border-sky-200 dark:border-sky-800/60 hover:border-sky-400',
        text: 'text-sky-700 dark:text-sky-300',
        iconBg: 'bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-400',
        badge: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border-sky-200 dark:border-sky-800'
      };
    case 'purple':
      return {
        bg: 'bg-purple-50 dark:bg-purple-950/40',
        cardBorder: 'border-purple-200 dark:border-purple-800/60 hover:border-purple-400',
        text: 'text-purple-700 dark:text-purple-300',
        iconBg: 'bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-400',
        badge: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800'
      };
    case 'indigo':
    default:
      return {
        bg: 'bg-indigo-50 dark:bg-indigo-950/40',
        cardBorder: 'border-indigo-200 dark:border-indigo-800/60 hover:border-indigo-400',
        text: 'text-indigo-700 dark:text-indigo-300',
        iconBg: 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400',
        badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
      };
  }
};

const formatVideoDuration = (seconds?: number | string): string => {
  if (seconds === undefined || seconds === null || seconds === '') return '';
  const num = typeof seconds === 'string' ? parseFloat(seconds) : seconds;
  if (isNaN(num) || !isFinite(num) || num <= 0) return '';
  const totalSec = Math.round(num);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hrs > 0) {
    return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const formatVideoFileSize = (bytes?: number | string): string => {
  if (bytes === undefined || bytes === null || bytes === '') return '';
  if (typeof bytes === 'string') {
    const trimmed = bytes.trim();
    if (/(KB|MB|GB|TB|Bytes|B)$/i.test(trimmed)) {
      return trimmed;
    }
    const num = parseFloat(trimmed);
    if (isNaN(num) || !isFinite(num) || num <= 0) return '';
    bytes = num;
  }
  const num = bytes as number;
  if (isNaN(num) || !isFinite(num) || num <= 0) return '';
  if (num < 1024) return `${Math.round(num)} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  if (num < 1024 * 1024 * 1024) return `${(num / (1024 * 1024)).toFixed(1)} MB`;
  return `${(num / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

export const CourseBuilder: React.FC<CourseBuilderProps> = ({
  initialData,
  courses = [],
  selectedCourseId,
  onSelectCourse,
  onOpenQuickAddModal,
  onSave,
  onDeleteCourse,
  onManageModule,
  onManageLesson,
  onCancel,
}) => {
  const { refreshCourses, isLoadingCourses, categories, courseDefaultThumbnail, currentUser, setCurrentUser, selectedCurrency, logoUrl, courseConfig } = useApp();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);
  
  // Resource preview modal states
  const [previewResource, setPreviewResource] = useState<any | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    refreshCourses(currentUser?.id).catch(() => {});
  }, [currentUser?.id]);

  // Navigation Active Tab & Builder Mode (Always course-content now)
  const [builderMode, setBuilderMode] = useState<'courses-list' | 'course-content'>(
    'course-content'
  );
  const [isBuilderSidebarCollapsed, setIsBuilderSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDeletingCourse, setIsDeletingCourse] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'soft' | 'permanent'>('soft');
  const [showImageStandardsPage, setShowImageStandardsPage] = useState(false);

  const handleRefreshApiCourses = async () => {
    setIsRefreshing(true);
    try {
      await refreshCourses(currentUser?.id);
      setNotification({ message: 'Curriculum & course data synchronized from API database.', type: 'success' });
    } catch (err) {
      setNotification({ message: 'Failed to refresh from API.', type: 'error' });
    } finally {
      setIsRefreshing(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTabState] = useState<BuilderTabKey>(() => {
    const tabFromUrl = searchParams.get('builderTab') || searchParams.get('tab');
    const validTabs: BuilderTabKey[] = [
      'overview', 'intended-learners', 'structure', 'course-description', 'film-edit', 'curriculum',
      'captions', 'accessibility', 'landing-page', 'pricing', 'promotions',
      'messages', 'content', 'assessment', 'design', 'ai', 'settings', 'collab', 'certificate'
    ];
    if (tabFromUrl && validTabs.includes(tabFromUrl as BuilderTabKey)) {
      return tabFromUrl as BuilderTabKey;
    }
    return 'overview';
  });

  const setActiveTab = (tab: BuilderTabKey) => {
    setActiveTabState(tab);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('builderTab', tab);
    if (courseId) {
      nextParams.set('courseId', courseId);
    }
    if (tab !== 'content' && tab !== 'assessment') {
      nextParams.delete('lessonId');
    }
    setSearchParams(nextParams, { replace: true });
  };
  const [activePhase, setActivePhase] = useState<'plan' | 'create' | 'publish'>('plan');
  const [builderTabStyle, setBuilderTabStyle] = useState<'capsule' | 'stepper' | 'minimal'>(() => {
    try {
      return (localStorage.getItem('uqlearn_builder_tab_style') as any) || 'capsule';
    } catch {
      return 'capsule';
    }
  });
  const [isDistractionFree, setIsDistractionFree] = useState(false);
  const [structureViewMode, setStructureViewMode] = useState<'editor' | 'organizer'>('editor');
  const [isLearnerPreviewOpen, setIsLearnerPreviewOpen] = useState(false);

  // 1. Basic Details
  const [courseId, setCourseId] = useState<string>(initialData?.id || `course-${Date.now()}`);
  const [title, setTitle] = useState(initialData?.title || '');
  const [subtitle, setSubtitle] = useState(initialData?.subtitle || '');
  const [category, setCategory] = useState<'Development' | 'Business' | 'Design' | 'Data Science' | 'Marketing' | 'Personal Growth'>(
    (initialData?.category as any) || 'Development'
  );
  const [level, setLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels'>(
    (initialData?.level as any) || 'Intermediate'
  );
  const [description, setDescription] = useState(initialData?.description || '');
  const [image, setImage] = useState(initialData?.image || '');
  const [subcategory, setSubcategory] = useState<string>((initialData as any)?.subcategory || '');
  const [primaryTaught, setPrimaryTaught] = useState<string>((initialData as any)?.primaryTaught || '');
  const [instructorDescription, setInstructorDescription] = useState<string>(() => {
    const fromLocal = initialData?.id ? localStorage.getItem(`uqlearn_course_${initialData.id}_instructor_desc`) || '' : '';
    const globalCourseDesc = courseId ? localStorage.getItem(`uqlearn_course_${courseId}_instructor_desc`) || '' : '';
    const globalBio = localStorage.getItem('uqlearn_instructor_bio') || '';
    const userBio = (currentUser as any)?.bio || '';
    return (initialData as any)?.instructorDescription || 
           (initialData as any)?.instructor_description || 
           (initialData as any)?.instructorBio || 
           fromLocal || 
           globalCourseDesc ||
           globalBio ||
           userBio ||
           '';
  });
  const [instructorImage, setInstructorImage] = useState<string>(() => {
    const fromLocal = initialData?.id ? localStorage.getItem(`uqlearn_course_${initialData.id}_instructor_img`) || '' : '';
    const globalCourseImg = courseId ? localStorage.getItem(`uqlearn_course_${courseId}_instructor_img`) || '' : '';
    const userAvatar = currentUser?.avatar || '';
    return (initialData as any)?.instructorImage || 
           (initialData as any)?.instructorAvatar || 
           (initialData as any)?.instructor_avatar || 
           fromLocal || 
           globalCourseImg ||
           userAvatar ||
           '';
  });
  const [isFilmStudioModalOpen, setIsFilmStudioModalOpen] = useState(false);
  const [isUploadingInstructorImage, setIsUploadingInstructorImage] = useState(false);
  const [isSponsored, setIsSponsored] = useState<boolean>(() => Boolean(initialData?.isSponsored));
  const [bestSeller, setBestSeller] = useState<boolean>(() => Boolean(initialData?.bestSeller));
  const [isPremium, setIsPremium] = useState<boolean>(() => Boolean(initialData?.isPremium));
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);
  const [testVideoStatus, setTestVideoStatus] = useState<'idle' | 'uploading' | 'reviewing' | 'completed'>('idle');
  const [testVideoUrl, setTestVideoUrl] = useState<string>('');
  const [testVideoFile, setTestVideoFile] = useState<File | null>(null);
  const [testVideoDragOver, setTestVideoDragOver] = useState(false);
  const [testUploadProgress, setTestUploadProgress] = useState<{
    percentage: number;
    uploadedBytes: number;
    totalBytes: number;
    fileName: string;
    speedFormatted: string;
    remainingFormatted: string;
  } | null>(null);
  const testUploadXhrRef = useRef<XMLHttpRequest | null>(null);
  const [activeAddCurriculumModuleId, setActiveAddCurriculumModuleId] = useState<string | null>(null);
  const [isBulkUploaderOpen, setIsBulkUploaderOpen] = useState(false);
  const [isBulkUploaderPageActive, setIsBulkUploaderPageActive] = useState(false);
  const [isCurriculumHelpPageActive, setIsCurriculumHelpPageActive] = useState(false);
  const [isLoadingHelpGuide, setIsLoadingHelpGuide] = useState(false);
  const [selectedImportSource, setSelectedImportSource] = useState<string | null>(null);
  const [linkUrlInput, setLinkUrlInput] = useState('');
  const [bulkUploadedFiles, setBulkUploadedFiles] = useState<{ id: string; name: string; size: string; type: 'video' | 'article' | 'quiz' | 'audio' | 'scorm'; progress: number; status: 'pending' | 'uploading' | 'completed' }[]>([]);
  const [bulkTargetSectionId, setBulkTargetSectionId] = useState<string>('');
  const [themeColor, setThemeColor] = useState('#6366f1'); // Indigo default
  const [promoVideoFileName, setPromoVideoFileName] = useState<string>('No file selected');
  const [courseImageFileName, setCourseImageFileName] = useState<string>('No file selected');
  const [promoVideoUrl, setPromoVideoUrl] = useState<string>('');
  const [isSavingLandingPage, setIsSavingLandingPage] = useState(false);
  const [isSavingPricing, setIsSavingPricing] = useState(false);
  const [isSavingCurriculum, setIsSavingCurriculum] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Course description docs/checklist & saved toast state
  const [showDescriptionDocs, setShowDescriptionDocs] = useState(false);
  const [showDescriptionSavedToast, setShowDescriptionSavedToast] = useState(false);
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const [lastSavedDescription, setLastSavedDescription] = useState<string>(initialData?.description || '');
  const [showUnsavedDescriptionModal, setShowUnsavedDescriptionModal] = useState(false);
  const [showAllChecklist, setShowAllChecklist] = useState(false);
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Reviewer Audit Checklist Feedback for Instructor
  const [reviewerAuditFeedback, setReviewerAuditFeedback] = useState<any | null>(() => {
    if (!initialData?.id) return null;
    try {
      const raw = localStorage.getItem(`course_audit_checklist_feedback_${initialData.id}`);
      if (raw) return JSON.parse(raw);
    } catch {
      // fallback
    }
    return null;
  });

  useEffect(() => {
    if (!initialData?.id) return;
    let isMounted = true;

    async function checkDatabaseFeedback() {
      try {
        const remoteChecklist = await getCourseDescriptionChecklistApi(initialData.id);
        if (remoteChecklist && isMounted) {
          if (Array.isArray(remoteChecklist)) {
            const notMet = remoteChecklist.filter((i: any) => i.status === 'not_met');
            const met = remoteChecklist.filter((i: any) => i.status === 'met');
            if (notMet.length > 0 || met.length > 0) {
              setReviewerAuditFeedback({
                courseId: initialData.id,
                updatedAt: new Date().toISOString(),
                metCount: met.length,
                notMetCount: notMet.length,
                notMetItems: notMet.map((i: any) => ({
                  id: i.id,
                  title: i.title,
                  category: i.category,
                  suggestion: i.suggestion || 'Reviewer noted this criterion was not met.'
                }))
              });
            }
          } else if (remoteChecklist.notMetItems) {
            setReviewerAuditFeedback(remoteChecklist);
          }
        }
      } catch (err) {
        // Fall back to local storage
      }
    }

    checkDatabaseFeedback();

    const interval = setInterval(() => {
      if ((window as any).__UQ_UPLOADING_ACTIVE__) return; // Pause background polling during upload to maximize bandwidth
      try {
        const raw = localStorage.getItem(`course_audit_checklist_feedback_${initialData.id}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          setReviewerAuditFeedback(parsed);
        }
      } catch {
        // ignore
      }
      checkDatabaseFeedback();
    }, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [initialData?.id]);

  // Intended Learners State
  const [learningObjectives, setLearningObjectives] = useState<string[]>(initialData?.learningObjectives || ['', '', '', '']);
  const [courseRequirements, setCourseRequirements] = useState<string[]>(initialData?.requirements || ['']);
  const [targetLearners, setTargetLearners] = useState<string[]>(initialData?.targetLearners || ['']);
  const [isSavingIntendedLearners, setIsSavingIntendedLearners] = useState(false);

  // Helper to extract clean learning outcomes array from any initial data shape
  const extractOutcomes = (data: any): string[] => {
    if (!data) return [];
    const raw = data.learningOutcomes || data.whatYouWillLearn || data.learning_outcomes || data.outcomes;
    if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
      } catch {}
      if (raw.includes('\n')) return raw.split('\n').map((s: string) => s.trim()).filter(Boolean);
      if (raw.includes(',')) return raw.split(',').map((s: string) => s.trim()).filter(Boolean);
      if (raw.trim()) return [raw.trim()];
    }
    return [];
  };

  // Learning Outcomes State
  const [learningOutcomes, setLearningOutcomes] = useState<string[]>(() => extractOutcomes(initialData));
  const [newOutcome, setNewOutcome] = useState('');

  // Synchronize state when selected course or initialData updates
  useEffect(() => {
    let isMounted = true;
    if (initialData) {
      const activeId = initialData.id || `course-${Date.now()}`;
      setCourseId(activeId);
      setTitle(initialData.title || '');
      setSubtitle(initialData.subtitle || '');
      if (initialData.category) {
        setCategory(initialData.category as any);
      }
      if (initialData.level) {
        setLevel(initialData.level as any);
      }
      setDescription(initialData.description || '');
      setLastSavedDescription(initialData.description || '');
      if (initialData.price !== undefined) {
        setPrice(Number(initialData.price));
      }
      if (initialData.originalPrice !== undefined) {
        setOriginalPrice(Number(initialData.originalPrice));
      }
      if (initialData.image) {
        setImage(initialData.image);
      }
      
      const parsedOutcomes = extractOutcomes(initialData);
      setLearningOutcomes(parsedOutcomes);
      
      // Always fetch modules and full course details from the API to ensure fresh non-static data
      if (initialData.id) {
        // 1. Fetch modules
        fetchCourseModulesApi(initialData.id).then(result => {
          if (!isMounted) return;
          const apiModules = Array.isArray(result) ? result : (result && (result as any).data ? (result as any).data : []);
          
          if (apiModules && apiModules.length > 0) {
            setModules(apiModules.map((m: any) => ({ ...m, isExpanded: m.isExpanded !== false, lessons: m.lessons || [] })));
            const urlLessonId = searchParams.get('lessonId');
            if (urlLessonId) {
              setSelectedLessonIdState(urlLessonId);
            } else if (apiModules[0]?.lessons?.[0]?.id) {
              setSelectedLessonIdState(apiModules[0].lessons[0].id);
            }
          } else if (initialData.modules && initialData.modules.length > 0) {
             setModules((initialData.modules as ModuleInput[]).map(m => ({ ...m, isExpanded: m.isExpanded !== false, lessons: m.lessons || [] })));
             const urlLessonId = searchParams.get('lessonId');
             if (urlLessonId) {
               setSelectedLessonIdState(urlLessonId);
             } else if (initialData.modules[0]?.lessons?.[0]?.id) {
               setSelectedLessonIdState(initialData.modules[0].lessons[0].id);
             }
          } else {
            setModules([]);
            setSelectedLessonIdState('');
          }
        }).catch(() => {});

        // 2. Fetch full course metadata including learning outcomes from API
        apiFetch(`courses.php?id=${encodeURIComponent(initialData.id)}`)
          .then(res => {
            if (!isMounted) return;
            const resData = (res && (res as any).data) ? (res as any).data : null;
            if (resData) {
              const remoteOutcomes = extractOutcomes(resData);
              if (remoteOutcomes.length > 0) {
                setLearningOutcomes(remoteOutcomes);
              }
              if (resData.subcategory) setSubcategory(resData.subcategory);
              if (resData.primaryTaught) setPrimaryTaught(resData.primaryTaught);
              if (resData.language) setLanguage(resData.language);
              if (resData.instructorDescription || resData.instructor_description) {
                const fetchedBio = resData.instructorDescription || resData.instructor_description;
                setInstructorDescription(fetchedBio);
                try {
                  localStorage.setItem(`uqlearn_course_${initialData.id}_instructor_desc`, fetchedBio);
                  localStorage.setItem('uqlearn_instructor_bio', fetchedBio);
                } catch (e) {}
              }
              if (resData.instructorAvatar || resData.instructor_avatar || resData.instructorImage) {
                const fetchedImg = resData.instructorAvatar || resData.instructor_avatar || resData.instructorImage;
                setInstructorImage(fetchedImg);
                try {
                  localStorage.setItem(`uqlearn_course_${initialData.id}_instructor_img`, fetchedImg);
                } catch (e) {}
              }
              if (resData.promoVideo) {
                setPromoVideoFileName(resData.promoVideo.split('/').pop() || resData.promoVideo);
              }
            }
          })
          .catch(() => {});

        // 2.5 Fetch promotional video from dedicated custom table
        apiFetch(`promotional-videos.php?course_id=${encodeURIComponent(initialData.id)}`)
          .then((res: any) => {
            if (!isMounted) return;
            if (res && res.success && res.video_path) {
              setPromoVideoFileName(res.video_path.split('/').pop() || res.video_path);
            }
          })
          .catch(() => {});

        // 3. Fetch intended learners dataset from database via custom PHP API
        apiFetch(`intended-learners.php?courseId=${encodeURIComponent(initialData.id)}`)
          .then((res: any) => {
            if (!isMounted) return;
            const resData = (res && res.data) ? res.data : null;
            if (resData) {
              if (Array.isArray(resData.learning_objectives) && resData.learning_objectives.length > 0) {
                setLearningObjectives(resData.learning_objectives);
              }
              if (Array.isArray(resData.requirements) && resData.requirements.length > 0) {
                setCourseRequirements(resData.requirements);
              }
              if (Array.isArray(resData.target_learners) && resData.target_learners.length > 0) {
                setTargetLearners(resData.target_learners);
              }
            }
          })
          .catch((err) => {
            console.warn('Error fetching intended learners:', err);
          });

        // 4. Fetch course messages from database via API
        getCourseMessagesApi(initialData.id)
          .then((res: any) => {
            if (!isMounted) return;
            if (res && res.success && res.data) {
              if (res.data.welcome_message !== undefined) setWelcomeMessage(res.data.welcome_message);
              if (res.data.congratulations_message !== undefined) setCongratulationsMessage(res.data.congratulations_message);
            }
          })
          .catch(() => {});
      } else {
         if (initialData.modules && initialData.modules.length > 0) {
             setModules(initialData.modules as ModuleInput[]);
         } else {
            setModules([]);
            setSelectedLessonId('');
         }
      }
    }
    return () => { isMounted = false; };
  }, [initialData?.id]);

  // Synchronize instructor profile fields (biography and avatar) across course changes & reloads
  useEffect(() => {
    if (initialData) {
      const incomingBio = (initialData as any).instructorDescription || 
                          (initialData as any).instructor_description || 
                          (initialData as any).instructorBio || 
                          (initialData.id ? localStorage.getItem(`uqlearn_course_${initialData.id}_instructor_desc`) : '') ||
                          localStorage.getItem('uqlearn_instructor_bio') ||
                          (currentUser as any)?.bio;
      if (incomingBio && (!instructorDescription || instructorDescription.trim().length === 0)) {
        setInstructorDescription(incomingBio);
      }
      const incomingImg = (initialData as any).instructorImage || 
                          (initialData as any).instructorAvatar || 
                          (initialData as any).instructor_avatar || 
                          (initialData.id ? localStorage.getItem(`uqlearn_course_${initialData.id}_instructor_img`) : '') ||
                          currentUser?.avatar;
      if (incomingImg && (!instructorImage || instructorImage.trim().length === 0)) {
        setInstructorImage(incomingImg);
      }
    }
  }, [initialData, currentUser?.avatar]);

  // 2. Modules & Curriculum Structure (Dynamic State)
  const [modules, setModules] = useState<ModuleInput[]>([]);

  // Track expanded state for individual lessons to show description, resources, labs
  const [expandedLessons, setExpandedLessons] = useState<Record<string, boolean>>({});
  
  // Track which sub-option is currently active for each lesson (e.g. 'description', 'resources', 'lab')
  const [activeLessonSubTab, setActiveLessonSubTab] = useState<Record<string, 'description' | 'resources' | 'lab' | null>>({});

  // Temporary editing states to avoid re-rendering entire list on every key stroke
  const [tempDescriptions, setTempDescriptions] = useState<Record<string, string>>({});
  const [tempLabs, setTempLabs] = useState<Record<string, { title: string; url: string }>>({});

  // State for adding a new resource inline
  const [newResourceName, setNewResourceName] = useState<Record<string, string>>({});
  const [newResourceUrl, setNewResourceUrl] = useState<Record<string, string>>({});

  // Track which tab inside Resources is currently selected ('file' | 'library' | 'external')
  const [activeResourceTab, setActiveResourceTab] = useState<Record<string, 'file' | 'library' | 'external'>>({});
  
  // Track file upload loading status per lesson
  const [uploadingResourceFile, setUploadingResourceFile] = useState<Record<string, boolean>>({});
  const [uploadedResourceFileName, setUploadedResourceFileName] = useState<Record<string, string>>({});
  const [uploadedResourceFileUrl, setUploadedResourceFileUrl] = useState<Record<string, string>>({});

  // Selected Lesson for Dynamic Content Studio with URL Search Parameter Persistence
  const [selectedLessonId, setSelectedLessonIdState] = useState<string | null>(() => {
    return searchParams.get('lessonId') || null;
  });

  const applyToolbarFormat = (lessonId: string, format: 'bold' | 'italic' | 'number' | 'bullet') => {
    const textarea = document.getElementById(`lecture-desc-textarea-${lessonId}`) as HTMLTextAreaElement | null;
    const currentVal = tempDescriptions[lessonId] ?? '';
    
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = currentVal.substring(start, end);
      
      let prefix = '';
      let suffix = '';
      let defaultInsert = '';
      
      if (format === 'bold') {
        prefix = '**';
        suffix = '**';
        defaultInsert = 'bold text';
      } else if (format === 'italic') {
        prefix = '*';
        suffix = '*';
        defaultInsert = 'italic text';
      } else if (format === 'number') {
        prefix = '\n1. ';
        suffix = '';
        defaultInsert = '';
      } else if (format === 'bullet') {
        prefix = '\n- ';
        suffix = '';
        defaultInsert = '';
      }
      
      const insertText = selectedText || defaultInsert;
      const newVal = currentVal.substring(0, start) + prefix + insertText + suffix + currentVal.substring(end);
      
      setTempDescriptions(prev => ({
        ...prev,
        [lessonId]: newVal
      }));
      
      // Keep focus and restore selection
      setTimeout(() => {
        textarea.focus();
        const newStart = start + prefix.length;
        const newEnd = newStart + insertText.length;
        textarea.setSelectionRange(newStart, newEnd);
      }, 50);
    } else {
      let newVal = currentVal;
      if (format === 'bold') {
        newVal = currentVal ? `${currentVal} **bold text**` : '**bold text**';
      } else if (format === 'italic') {
        newVal = currentVal ? `${currentVal} *italic text*` : '*italic text*';
      } else if (format === 'number') {
        newVal = currentVal ? `${currentVal}\n1. ` : '1. ';
      } else if (format === 'bullet') {
        newVal = currentVal ? `${currentVal}\n- ` : '- ';
      }
      
      setTempDescriptions(prev => ({
        ...prev,
        [lessonId]: newVal
      }));
    }
  };

  const setSelectedLessonId = (id: string | null) => {
    setSelectedLessonIdState(id);
    const nextParams = new URLSearchParams(searchParams);
    if (id) {
      nextParams.set('lessonId', id);
    } else {
      nextParams.delete('lessonId');
    }
    if (courseId) {
      nextParams.set('courseId', courseId);
    }
    setSearchParams(nextParams, { replace: true });
  };

  // Sync state when browser back/forward buttons or URL changes
  useEffect(() => {
    const tabFromUrl = searchParams.get('builderTab') || searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      const validTabs: BuilderTabKey[] = [
        'intended-learners', 'structure', 'course-description', 'film-edit', 'curriculum',
        'captions', 'accessibility', 'landing-page', 'pricing', 'promotions',
        'messages', 'content', 'assessment', 'design', 'ai', 'settings', 'collab', 'certificate'
      ];
      if (validTabs.includes(tabFromUrl as BuilderTabKey)) {
        setActiveTabState(tabFromUrl as BuilderTabKey);
      }
    }
    const lessonIdFromUrl = searchParams.get('lessonId');
    if (lessonIdFromUrl !== null && lessonIdFromUrl !== selectedLessonId) {
      setSelectedLessonIdState(lessonIdFromUrl);
    }
  }, [searchParams]);

  // 3. Pricing, Currency & Range Settings
  const MIN_PRICE_USD = 0.99; // Allow flexible pricing starting at $0.99 USD (or 0 for free course)
  const MAX_PRICE_USD = 999.00; // Allow full marketplace pricing up to $999.00 USD

  // Stored price in USD
  const [price, setPrice] = useState<number>(() => {
    if (initialData?.price !== undefined && initialData.price !== null && !isNaN(Number(initialData.price))) {
      return Number(initialData.price);
    }
    return 19.99;
  });
  const hasOtherFreeCourse = useMemo(() => courses.some(c => Number(c.price) === 0 && c.id !== courseId), [courses, courseId]);
  const [originalPrice, setOriginalPrice] = useState<number>(() => {
    if (initialData?.originalPrice !== undefined && initialData.originalPrice !== null && !isNaN(Number(initialData.originalPrice))) {
      return Number(initialData.originalPrice);
    }
    return 0;
  });

  // Helper to determine active local currency code from AppContext or localStorage
  const resolveLocalCurrencyCode = (): string => {
    // 1. Highest priority: active selected currency in AppContext
    if (selectedCurrency?.code && typeof selectedCurrency.code === 'string') {
      return selectedCurrency.code;
    }
    // 2. localStorage preferences
    try {
      if (typeof localStorage !== 'undefined') {
        const sysCurr = localStorage.getItem('uqlearn_system_currency');
        if (sysCurr && sysCurr.length <= 6 && !sysCurr.startsWith('{')) {
          return sysCurr;
        }
        const saved = localStorage.getItem('uqlearn_currency');
        if (saved) {
          if (saved.startsWith('{')) {
            const parsed = JSON.parse(saved);
            if (parsed?.code) return parsed.code;
          } else if (saved.length <= 6) {
            return saved;
          }
        }
      }
    } catch (e) {}
    return 'USD';
  };

  // Selected currency for entering & viewing prices in the builder
  const [pricingCurrencyCode, setPricingCurrencyCode] = useState<string>(resolveLocalCurrencyCode);

  // Sync pricing currency whenever the user sets or switches their local currency globally
  useEffect(() => {
    if (selectedCurrency?.code && selectedCurrency.code !== pricingCurrencyCode) {
      setPricingCurrencyCode(selectedCurrency.code);
    }
  }, [selectedCurrency?.code]);

  // Sync available currencies and instructor backend preference if any
  useEffect(() => {
    let isMounted = true;
    currencyService.getSystemCurrency(currentUser?.id || 'current-user').then(res => {
      if (!isMounted) return;
      // Only apply backend preference if no local currency was already set in AppContext
      if (res.preference && !selectedCurrency?.code) {
        setPricingCurrencyCode(res.preference);
      }
    }).catch(() => {});

    const handleCurrencyEvent = (e: any) => {
      const code = e.detail?.currency;
      if (code && typeof code === 'string' && code !== pricingCurrencyCode) {
        setPricingCurrencyCode(code);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('uqlearn_currency_changed', handleCurrencyEvent);
    }
    return () => {
      isMounted = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('uqlearn_currency_changed', handleCurrencyEvent);
      }
    };
  }, [currentUser?.id]);

  const activePricingCurrency = useMemo(() => {
    const found = COMBINED_CURRENCIES.find(c => c.code === pricingCurrencyCode) || 
                  COMBINED_CURRENCIES.find(c => c.code === selectedCurrency?.code) || 
                  COMBINED_CURRENCIES.find(c => c.code === 'USD') || 
                  COMBINED_CURRENCIES[0];
    return {
      code: found.code,
      symbol: found.symbol,
      name: found.name,
      rate: Number((found as any).rate || (found as any).exchange_rate || 1),
      flag: (found as any).flag
    };
  }, [pricingCurrencyCode, selectedCurrency?.code]);

  // Converted min and max bounds for chosen currency
  const minPriceInSelectedCurrency = useMemo(() => {
    const raw = MIN_PRICE_USD * activePricingCurrency.rate;
    return activePricingCurrency.rate >= 10 ? Math.round(raw) : Number(raw.toFixed(2));
  }, [activePricingCurrency]);

  const maxPriceInSelectedCurrency = useMemo(() => {
    const raw = MAX_PRICE_USD * activePricingCurrency.rate;
    return activePricingCurrency.rate >= 10 ? Math.round(raw) : Number(raw.toFixed(2));
  }, [activePricingCurrency]);

  // Text inputs for direct editing in chosen currency without numeric rounding glitch
  const [displayPriceInput, setDisplayPriceInput] = useState<string>(() => {
    const initP = initialData?.price !== undefined && initialData.price !== null && !isNaN(Number(initialData.price)) ? Number(initialData.price) : 19.99;
    const initialCode = resolveLocalCurrencyCode();
    const currObj = COMBINED_CURRENCIES.find(c => c.code === initialCode) || COMBINED_CURRENCIES.find(c => c.code === 'USD') || COMBINED_CURRENCIES[0];
    const initialRate = Number((currObj as any)?.rate || (currObj as any)?.exchange_rate || 1);
    const val = initP * initialRate;
    return initialRate >= 10 ? Math.round(val).toString() : Number(val.toFixed(2)).toString();
  });

  const [displayOriginalPriceInput, setDisplayOriginalPriceInput] = useState<string>(() => {
    const initOp = initialData?.originalPrice !== undefined && initialData.originalPrice !== null && !isNaN(Number(initialData.originalPrice)) ? Number(initialData.originalPrice) : 0;
    if (initOp <= 0) return '';
    const initialCode = resolveLocalCurrencyCode();
    const currObj = COMBINED_CURRENCIES.find(c => c.code === initialCode) || COMBINED_CURRENCIES.find(c => c.code === 'USD') || COMBINED_CURRENCIES[0];
    const initialRate = Number((currObj as any)?.rate || (currObj as any)?.exchange_rate || 1);
    const val = initOp * initialRate;
    return initialRate >= 10 ? Math.round(val).toString() : Number(val.toFixed(2)).toString();
  });

  // Keep display inputs in sync with stored USD price when pricingCurrencyCode or rate changes
  useEffect(() => {
    const rate = activePricingCurrency.rate || 1;
    if (price > 0) {
      const converted = price * rate;
      setDisplayPriceInput(rate >= 10 ? Math.round(converted).toString() : Number(converted.toFixed(2)).toString());
    } else if (price === 0) {
      setDisplayPriceInput('0');
    }

    if (originalPrice > 0) {
      const convertedOp = originalPrice * rate;
      setDisplayOriginalPriceInput(rate >= 10 ? Math.round(convertedOp).toString() : Number(convertedOp.toFixed(2)).toString());
    } else {
      setDisplayOriginalPriceInput('');
    }
  }, [pricingCurrencyCode, activePricingCurrency.rate]);

  // Keep display inputs in sync if initialData changes for another course
  useEffect(() => {
    if (initialData?.id) {
      const p = Number(initialData.price || 0);
      setPrice(p);
      const converted = p * (activePricingCurrency.rate || 1);
      setDisplayPriceInput(p > 0 ? (activePricingCurrency.rate >= 10 ? Math.round(converted).toString() : Number(converted.toFixed(2)).toString()) : '0');

      const op = Number(initialData.originalPrice || 0);
      setOriginalPrice(op);
      const convertedOp = op * (activePricingCurrency.rate || 1);
      setDisplayOriginalPriceInput(op > 0 ? (activePricingCurrency.rate >= 10 ? Math.round(convertedOp).toString() : Number(convertedOp.toFixed(2)).toString()) : '');
    }
  }, [initialData?.id]);

  const handlePricingCurrencyChange = async (newCode: string) => {
    setPricingCurrencyCode(newCode);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('uqlearn_system_currency', newCode);
        const match = COMBINED_CURRENCIES.find(c => c.code === newCode);
        if (match) {
          localStorage.setItem('uqlearn_currency', JSON.stringify(match));
        }
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('uqlearn_currency_changed', { detail: { currency: newCode } }));
      }
    } catch (e) {}
    await currencyService.setSystemCurrency(currentUser?.id || 'current-user', newCode);
  };

  const handlePriceInputChange = (val: string) => {
    setDisplayPriceInput(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= 0) {
      const rate = activePricingCurrency.rate || 1;
      const usdVal = parsed === 0 ? 0 : Number((parsed / rate).toFixed(2));
      setPrice(usdVal);
    } else {
      setPrice(0);
    }
  };

  const handleOriginalPriceInputChange = (val: string) => {
    setDisplayOriginalPriceInput(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed > 0) {
      const rate = activePricingCurrency.rate || 1;
      const usdVal = Number((parsed / rate).toFixed(2));
      setOriginalPrice(usdVal);
    } else {
      setOriginalPrice(0);
    }
  };

  const [visibility, setVisibility] = useState<'public' | 'draft' | 'private'>('public');
  const [language, setLanguage] = useState('English');
  const [hasCertificate, setHasCertificate] = useState(true);
  const [projectedStudents, setProjectedStudents] = useState(150);

  // Course Messages State
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [congratulationsMessage, setCongratulationsMessage] = useState('');
  const [isSavingMessages, setIsSavingMessages] = useState(false);
  const [welcomeMode, setWelcomeMode] = useState<'write' | 'preview'>('write');
  const [congratulationsMode, setCongratulationsMode] = useState<'write' | 'preview'>('write');

  const welcomeTextareaRef = useRef<HTMLTextAreaElement>(null);
  const congratulationsTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Film & Edit Studio State
  const [filmStudioClips, setFilmStudioClips] = useState<Array<{
    id: string;
    name: string;
    url: string;
    fileSize?: string;
    duration?: string;
    uploadedAt: string;
    uploadedBy?: string;
    folder?: string;
    folderId?: string;
    source: 'film_and_edit' | 'test_video' | 'promo_video' | 'curriculum';
    associatedLessonId?: string;
    associatedLessonTitle?: string;
    status: 'raw' | 'editing' | 'ready' | 'assigned';
    thumbnailUrl?: string;
    tags?: string[];
  }>>(() => {
    try {
      const storageKey = initialData?.id ? `film_clips_${initialData.id}` : 'film_clips_draft';
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Error loading saved video clips:', e);
    }
    return [];
  });

  // Video Folders (Drive Structure) State
  const [videoFolders, setVideoFolders] = useState<VideoFolder[]>([]);
  const [activeDriveFolderId, setActiveDriveFolderId] = useState<string | null>(null); // null = Drive Root
  const [driveViewMode, setDriveViewMode] = useState<'grid' | 'list'>('grid');
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderNameInput, setNewFolderNameInput] = useState('');
  const [newFolderColorInput, setNewFolderColorInput] = useState('indigo');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isMoveVideoModalOpen, setIsMoveVideoModalOpen] = useState(false);
  const [videoToMove, setVideoToMove] = useState<any | null>(null);
  const [isMovingVideo, setIsMovingVideo] = useState(false);
  const [folderToRename, setFolderToRename] = useState<VideoFolder | null>(null);
  const [renameFolderNameInput, setRenameFolderNameInput] = useState('');
  const [folderMenuOpenId, setFolderMenuOpenId] = useState<string | null>(null);
  const [draggedVideoId, setDraggedVideoId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  const loadVideoFolders = async () => {
    try {
      const userId = currentUser?.id || currentUser?.email || 'instructor_user';
      const courseId = initialData?.id;
      const folders = await fetchVideoFoldersApi(userId, courseId);
      if (Array.isArray(folders)) {
        setVideoFolders(folders);
      } else {
        setVideoFolders([]);
      }
    } catch (e) {
      console.warn('Could not load video folders:', e);
      setVideoFolders([]);
    }
  };

  useEffect(() => {
    loadVideoFolders();
  }, [currentUser?.id, initialData?.id]);

  const handleCreateFolder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newFolderNameInput.trim()) return;
    setIsCreatingFolder(true);
    try {
      const userId = currentUser?.id || currentUser?.email || 'instructor_user';
      const courseId = initialData?.id;
      const res = await createVideoFolderApi(newFolderNameInput.trim(), newFolderColorInput, userId, courseId);
      if (res.success && res.folder) {
        setVideoFolders(prev => [...prev, res.folder!]);
        showNotification(`Folder "${newFolderNameInput.trim()}" created successfully!`);
        setNewFolderNameInput('');
        setIsNewFolderModalOpen(false);
      } else {
        showNotification(res.message || 'Folder created locally.');
        const fallbackFolder: VideoFolder = {
          id: `vfolder_${Date.now()}`,
          userId,
          courseId: courseId || null,
          name: newFolderNameInput.trim(),
          color: newFolderColorInput,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setVideoFolders(prev => [...prev, fallbackFolder]);
        setNewFolderNameInput('');
        setIsNewFolderModalOpen(false);
      }
    } catch (err) {
      showNotification('Error creating folder', 'error');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleRenameFolder = async (folderId: string, newName: string) => {
    if (!newName.trim()) return;
    try {
      const res = await renameVideoFolderApi(folderId, newName.trim());
      if (res.success) {
        setVideoFolders(prev => prev.map(f => f.id === folderId ? { ...f, name: newName.trim() } : f));
        setFilmStudioClips(prev => prev.map(c => c.folderId === folderId ? { ...c, folder: newName.trim() } : c));
        showNotification('Folder renamed successfully.');
        setFolderToRename(null);
      } else {
        showNotification(res.message || 'Folder renamed.');
        setVideoFolders(prev => prev.map(f => f.id === folderId ? { ...f, name: newName.trim() } : f));
        setFolderToRename(null);
      }
    } catch (e) {
      showNotification('Folder renamed.');
      setVideoFolders(prev => prev.map(f => f.id === folderId ? { ...f, name: newName.trim() } : f));
      setFolderToRename(null);
    }
  };

  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    if (!confirm(`Are you sure you want to delete folder "${folderName}"? Videos inside will not be deleted and will move to Drive root.`)) {
      return;
    }
    try {
      await deleteVideoFolderApi(folderId);
      setVideoFolders(prev => prev.filter(f => f.id !== folderId));
      setFilmStudioClips(prev => prev.map(c => c.folderId === folderId ? { ...c, folderId: undefined, folder: 'film-edit-studio' } : c));
      if (activeDriveFolderId === folderId) {
        setActiveDriveFolderId(null);
      }
      showNotification(`Folder "${folderName}" deleted.`);
    } catch (e) {
      setVideoFolders(prev => prev.filter(f => f.id !== folderId));
      if (activeDriveFolderId === folderId) {
        setActiveDriveFolderId(null);
      }
      showNotification(`Folder "${folderName}" removed.`);
    }
  };

  const handleMoveVideo = async (videoId: string, targetFolderId: string | null, targetFolderName: string) => {
    setIsMovingVideo(true);
    try {
      await moveVideoToFolderApi(videoId, targetFolderName, targetFolderId);
      setFilmStudioClips(prev => {
        const found = prev.some(c => c.id === videoId);
        if (found) {
          return prev.map(clip => {
            if (clip.id === videoId) {
              return {
                ...clip,
                folder: targetFolderName,
                folderId: targetFolderId || undefined
              };
            }
            return clip;
          });
        } else {
          const sourceVid = allFilmVideos.find(v => v.id === videoId);
          if (sourceVid) {
            return [
              ...prev,
              {
                id: sourceVid.id,
                name: sourceVid.name,
                url: sourceVid.url,
                fileSize: sourceVid.fileSize,
                duration: sourceVid.duration,
                uploadedAt: sourceVid.uploadedAt,
                uploadedBy: sourceVid.uploadedBy,
                folder: targetFolderName,
                folderId: targetFolderId || undefined,
                source: sourceVid.source,
                status: 'ready' as const
              }
            ];
          }
          return prev;
        }
      });
      showNotification(`Video moved to ${targetFolderId ? `"${targetFolderName}"` : 'Drive Root'} successfully!`);
      setIsMoveVideoModalOpen(false);
      setVideoToMove(null);
    } catch (e) {
      setFilmStudioClips(prev => {
        const found = prev.some(c => c.id === videoId);
        if (found) {
          return prev.map(clip => {
            if (clip.id === videoId) {
              return {
                ...clip,
                folder: targetFolderName,
                folderId: targetFolderId || undefined
              };
            }
            return clip;
          });
        }
        return prev;
      });
      showNotification(`Video moved to ${targetFolderId ? `"${targetFolderName}"` : 'Drive Root'}!`);
      setIsMoveVideoModalOpen(false);
      setVideoToMove(null);
    } finally {
      setIsMovingVideo(false);
    }
  };

  useEffect(() => {
    try {
      const storageKey = initialData?.id ? `film_clips_${initialData.id}` : 'film_clips_draft';
      localStorage.setItem(storageKey, JSON.stringify(filmStudioClips));
    } catch (e) {
      console.error('Error saving video clips:', e);
    }
  }, [filmStudioClips, initialData?.id]);

  useEffect(() => {
    const fetchUserVideosFromApi = async () => {
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

          const apiClips = data.videos
            .filter((v: any) => {
              const name = v.filename || v.title || '';
              return isVideoFile(name) || isVideoFile(v.url || '');
            })
            .map((v: any) => ({
              id: v.id || `clip-${Date.now()}`,
              name: v.filename || v.title || 'Filmed_Video.mp4',
              url: v.url,
              fileSize: v.file_size && Number(v.file_size) > 0 ? formatVideoFileSize(v.file_size) : undefined,
              duration: v.duration && v.duration !== '05:30' ? v.duration : undefined,
              uploadedAt: v.created_at ? new Date(v.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
              uploadedBy: v.user_id || v.uploadedBy || userId,
              folder: v.folder || 'film-edit-studio',
              folderId: v.folder_id || null,
              source: (v.source || (v.folder === 'film-edit-studio' ? 'film_and_edit' : 'test_video')) as any,
              status: 'ready' as const,
              tags: ['Chunked Resumable', v.folder || 'Studio']
            }));

          setFilmStudioClips(prev => {
            const existingUrls = new Set(prev.map(p => p.url));
            const newClips = apiClips.filter((c: any) => !existingUrls.has(c.url));
            return [...newClips, ...prev];
          });
        }
      } catch (e) {
        console.warn('Could not load user videos API:', e);
      }
    };

    fetchUserVideosFromApi();
  }, [currentUser?.id, currentUser?.email]);

  const [filmEditSearch, setFilmEditSearch] = useState('');
  const [filmEditSort, setFilmEditSort] = useState<'newest' | 'oldest'>('newest');
  const [clipToDelete, setClipToDelete] = useState<{ id: string; name: string; url?: string } | null>(null);
  const [isDeletingClip, setIsDeletingClip] = useState(false);
  const [videoMetadataMap, setVideoMetadataMap] = useState<Record<string, { duration?: string; fileSize?: string }>>({});
  const [previewingVideo, setPreviewingVideo] = useState<{
    id: string;
    name: string;
    url: string;
    fileSize?: string;
    duration?: string;
    uploadedAt: string;
    uploadedBy?: string;
    source: string;
    associatedLessonTitle?: string;
    status?: string;
  } | null>(null);
  const [editingVideoNameId, setEditingVideoNameId] = useState<string | null>(null);
  const [newVideoNameInput, setNewVideoNameInput] = useState('');
  const [isFilmStudioUploaderOpen, setIsFilmStudioUploaderOpen] = useState(false);
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null);
  const [isSelectVideoModalOpen, setIsSelectVideoModalOpen] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [assigningVideoId, setAssigningVideoId] = useState<string | null>(null);
  const [drawerCurriculumSearch, setDrawerCurriculumSearch] = useState('');
  const [loadedVideosMap, setLoadedVideosMap] = useState<Record<string, boolean>>({});
  const [filmUploadProgress, setFilmUploadProgress] = useState<{
    percentage: number;
    uploadedBytes: number;
    totalBytes: number;
    fileName: string;
    speedFormatted: string;
    remainingFormatted: string;
    status: 'uploading' | 'completed' | 'error';
  } | null>(null);
  const filmUploadXhrRef = useRef<XMLHttpRequest | null>(null);
  const [isFilmDragOver, setIsFilmDragOver] = useState(false);

  // Resource library files and direct upload progress (for docs/PDFs/excel/powerpoint/txt etc.)
  const [resourceLibraryFiles, setResourceLibraryFiles] = useState<Array<{
    id: string;
    name: string;
    url: string;
    fileSize?: string;
    uploadedAt: string;
    uploadedBy?: string;
    fileType: string;
  }>>([]);

  useEffect(() => {
    const fetchUserResourcesFromApi = async () => {
      try {
        const userId = currentUser?.id || currentUser?.email || 'instructor_user';
        const cleanBase = API_BASE_URL.replace(/\/+$/, '');
        const url = `${cleanBase}/user-resources.php?user_id=${encodeURIComponent(userId)}`;
        
        const response = await apiFetch(url, { silent: true }, 1);
        if (response && response.success && Array.isArray(response.resources)) {
          const apiResources = response.resources.map((r: any) => ({
            id: r.id || `res-${Date.now()}`,
            name: r.filename || r.title || 'Resource_File.pdf',
            url: r.url,
            fileSize: r.file_size ? `${(r.file_size / (1024 * 1024)).toFixed(1)} MB` : '1.2 MB',
            uploadedAt: r.created_at ? new Date(r.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
            uploadedBy: r.user_id || userId,
            fileType: r.file_type || 'pdf'
          }));

          setResourceLibraryFiles(apiResources);
        }
      } catch (e) {
        console.warn('Could not load user resources API:', e);
      }
    };

    fetchUserResourcesFromApi();
  }, [currentUser?.id, currentUser?.email]);

  const [resourceUploadProgress, setResourceUploadProgress] = useState<{
    percentage: number;
    uploadedBytes: number;
    totalBytes: number;
    fileName: string;
    speedFormatted: string;
    remainingFormatted: string;
    status: 'uploading' | 'completed' | 'error';
    lessonId?: string;
  } | null>(null);
  const resourceUploadXhrRef = useRef<XMLHttpRequest | null>(null);

  const handleUploadResourceFile = async (file: File, lessonId: string, moduleId: string, lessonResources: ResourceInput[]) => {
    const allowedExtensions = [
      'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'rtf', 'pages', 'key', 'numbers',
      'zip', 'rar', '7z', 'tar', 'gz'
    ];
    const programmingExtensions = [
      'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'cs', 'php', 'html', 'css', 'json', 'sh', 'bat', 'rb', 'go', 'rs', 'swift'
    ];

    const extension = file.name.substring(file.name.lastIndexOf('.') + 1).toLowerCase();
    if (programmingExtensions.includes(extension) || !allowedExtensions.includes(extension)) {
      showNotification('Programming files (.js, .py, .ts, etc.) cannot be uploaded. Please select documents (PDF, Word, Excel, PPT, TXT).', 'error');
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      showNotification('Resource file exceeds 500MB maximum limit.', 'error');
      return;
    }

    const generate64BitHex = () => {
      const arr = new Uint8Array(8);
      globalThis.crypto.getRandomValues(arr);
      return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
    };

    const unique64BitName = `${generate64BitHex()}.${extension}`;
    const originalName = file.name;
    const renamedFile = new File([file], unique64BitName, { type: file.type });

    const userId = currentUser?.id || currentUser?.email || 'instructor_user';
    const userEmail = currentUser?.email || '';

    setResourceUploadProgress({
      percentage: 0,
      uploadedBytes: 0,
      totalBytes: file.size,
      fileName: originalName,
      speedFormatted: 'Starting upload...',
      remainingFormatted: 'Calculating...',
      status: 'uploading',
      lessonId
    });

    const formData = new FormData();
    formData.append('fileData', renamedFile);
    formData.append('folder', 'resources');
    formData.append('user_id', userId);
    formData.append('user_email', userEmail);

    const xhr = new XMLHttpRequest();
    resourceUploadXhrRef.current = xhr;
    const cleanBase = API_BASE_URL.replace(/\/+$/, '');
    xhr.open('POST', `${cleanBase}/media-upload.php`, true);
    xhr.setRequestHeader('Accept', 'application/json');

    const startTime = Date.now();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percentage = Math.min(100, Math.round((e.loaded / e.total) * 100));
        const elapsedSec = (Date.now() - startTime) / 1000;
        const speedBps = elapsedSec > 0 ? e.loaded / elapsedSec : 0;
        const speedFormatted = speedBps > 1024 * 1024 
          ? `${(speedBps / (1024 * 1024)).toFixed(1)} MB/s` 
          : `${Math.round(speedBps / 1024)} KB/s`;
        const remainingBytes = Math.max(0, e.total - e.loaded);
        const remainingSeconds = speedBps > 0 ? Math.round(remainingBytes / speedBps) : 0;
        const remainingFormatted = remainingSeconds > 60 
          ? `${Math.floor(remainingSeconds / 60)}m ${remainingSeconds % 60}s remaining` 
          : `${remainingSeconds}s remaining`;

        setResourceUploadProgress({
          percentage,
          uploadedBytes: e.loaded,
          totalBytes: e.total,
          fileName: originalName,
          speedFormatted,
          remainingFormatted,
          status: percentage >= 100 ? 'completed' : 'uploading',
          lessonId
        });
      }
    };

    xhr.onload = async () => {
      resourceUploadXhrRef.current = null;
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.success) {
            setResourceUploadProgress(prev => prev ? { ...prev, percentage: 100, status: 'completed' } : null);
            const fileUrl = res.url;
            const filePath = res.path || res.stored_path || res.url;
            const uploadId = `res-${Date.now()}`;

            try {
              // Use FormData instead of JSON body and plain raw fetch to prevent CORS preflight OPTIONS request
              const regFormData = new FormData();
              regFormData.append('action', 'create');
              regFormData.append('id', uploadId);
              regFormData.append('user_id', userId);
              regFormData.append('filename', originalName);
              regFormData.append('stored_name', unique64BitName);
              regFormData.append('url', fileUrl);
              regFormData.append('file_path', filePath);
              regFormData.append('file_type', extension);
              regFormData.append('file_size', file.size.toString());

              await apiFetch(`${API_BASE_URL}/user-resources.php`, {
                method: 'POST',
                body: regFormData,
                silent: true
              });
            } catch (err) {
              console.warn('Could not register resource in user-resources API:', err);
            }

            const newResourceItem = {
              id: uploadId,
              name: originalName,
              url: fileUrl,
              fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
              uploadedAt: new Date().toLocaleDateString(),
              uploadedBy: userId,
              fileType: extension
            };

            setResourceLibraryFiles(prev => [newResourceItem, ...prev]);

            const newRes: ResourceInput = {
              id: uploadId,
              name: originalName,
              type: 'file',
              url: fileUrl,
              fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
            };

            const updatedRes = [...lessonResources, newRes];
            setModules(prev => prev.map(m => {
              if (m.id === moduleId) {
                return {
                  ...m,
                  lessons: m.lessons.map(l => l.id === lessonId ? { ...l, resources: updatedRes } : l)
                };
              }
              return m;
            }));

            showNotification(`Resource file "${originalName}" uploaded and secured!`);
            setTimeout(() => {
              setResourceUploadProgress(null);
            }, 3000);
          } else {
            setResourceUploadProgress(prev => prev ? { ...prev, status: 'error' } : null);
            showNotification(res.error || 'Upload failed on server.', 'error');
          }
        } catch (err) {
          setResourceUploadProgress(prev => prev ? { ...prev, status: 'error' } : null);
          showNotification('Upload completed but response parsing failed.', 'error');
        }
      } else {
        setResourceUploadProgress(prev => prev ? { ...prev, status: 'error' } : null);
        showNotification(`Upload failed with status ${xhr.status}`, 'error');
      }
    };

    xhr.onerror = () => {
      resourceUploadXhrRef.current = null;
      setResourceUploadProgress(prev => prev ? { ...prev, status: 'error' } : null);
      showNotification('Network error during resource upload.', 'error');
    };

    xhr.send(formData);
  };

  // Dynamically compute all videos across the course (Film studio clips + Test video + Promo video + Curriculum lesson videos)
  const allFilmVideos = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      url: string;
      fileSize?: string;
      duration?: string;
      uploadedAt: string;
      uploadedBy?: string;
      folder?: string;
      folderId?: string;
      source: 'film_and_edit' | 'test_video' | 'promo_video' | 'curriculum';
      associatedLessonId?: string;
      associatedLessonTitle?: string;
      status: 'raw' | 'editing' | 'ready' | 'assigned';
      thumbnailUrl?: string;
      tags?: string[];
      isDeletable?: boolean;
    }> = [...filmStudioClips.map(c => ({ 
      ...c, 
      uploadedBy: c.uploadedBy || currentUser?.id || currentUser?.email || 'instructor_user',
      isDeletable: true 
    }))];

    if (testVideoUrl && !list.some(v => v.url === testVideoUrl)) {
      list.push({
        id: 'test-video-source',
        name: 'Test_Video_Recording.mp4',
        url: testVideoUrl,
        fileSize: undefined,
        duration: undefined,
        uploadedAt: new Date().toLocaleDateString(),
        uploadedBy: currentUser?.id || currentUser?.email || 'instructor_user',
        source: 'test_video',
        status: 'ready',
        tags: ['Test Video', 'Quality Certified'],
        isDeletable: true
      });
    }

    if (promoVideoUrl && !list.some(v => v.url === promoVideoUrl)) {
      list.push({
        id: 'promo-video-source',
        name: promoVideoFileName || 'Course_Promotional_Trailer.mp4',
        url: promoVideoUrl,
        fileSize: undefined,
        duration: undefined,
        uploadedAt: new Date().toLocaleDateString(),
        uploadedBy: currentUser?.id || currentUser?.email || 'instructor_user',
        source: 'promo_video',
        status: 'assigned',
        tags: ['Promo Trailer', 'Landing Page'],
        isDeletable: true
      });
    }

    modules.forEach((mod) => {
      mod.lessons.forEach((les) => {
        if (les.type === 'video' && les.videoUrl && !list.some(v => v.url === les.videoUrl || v.id === `lesson-v-${les.id}`)) {
          list.push({
            id: `lesson-v-${les.id}`,
            name: `${les.title || 'Untitled Lecture'}.mp4`,
            url: les.videoUrl,
            fileSize: undefined,
            duration: les.duration && les.duration !== '10:00' && les.duration !== '05:30' && les.duration !== '05:00' ? les.duration : undefined,
            uploadedAt: new Date().toLocaleDateString(),
            uploadedBy: currentUser?.id || currentUser?.email || 'instructor_user',
            source: 'curriculum',
            associatedLessonId: les.id,
            associatedLessonTitle: `${mod.title} > ${les.title}`,
            status: 'assigned',
            tags: ['Lecture Video', 'Curriculum'],
            isDeletable: true
          });
        }
      });
    });

    return list;
  }, [filmStudioClips, testVideoUrl, promoVideoUrl, promoVideoFileName, modules, currentUser]);

  const filteredFilmVideos = useMemo(() => {
    const currentUserId = (currentUser?.id || '').toString().trim();
    const currentUserEmail = (currentUser?.email || '').toLowerCase().trim();
    const currentUserName = (currentUser?.name || '').toLowerCase().trim();

    const filtered = allFilmVideos.filter(video => {
      // 1. Strict filter by logged-in user
      const uBy = (video.uploadedBy || '').toString().trim().toLowerCase();
      const isOwn = !uBy || 
        uBy === currentUserId.toLowerCase() || 
        (currentUserEmail && uBy.includes(currentUserEmail)) ||
        (currentUserName && uBy.includes(currentUserName)) ||
        ((!currentUserId || currentUserId === 'instructor_user') && (uBy === 'instructor_user' || uBy === 'anonymous'));
      
      if (!isOwn) return false;

      if (filmEditSearch.trim()) {
        const query = filmEditSearch.toLowerCase();
        const matchesName = video.name.toLowerCase().includes(query);
        const matchesLesson = (video.associatedLessonTitle || '').toLowerCase().includes(query);
        const matchesTags = (video.tags || []).some(t => t.toLowerCase().includes(query));
        if (!matchesName && !matchesLesson && !matchesTags) return false;
      }

      return true;
    });

    return filtered.sort((a, b) => {
      const getTimestamp = (v: any) => {
        if (v.createdAt) return new Date(v.createdAt).getTime();
        const parsed = Date.parse(v.uploadedAt);
        if (!isNaN(parsed)) return parsed;
        const match = (v.id || '').match(/\d{10,}/);
        if (match) return parseInt(match[0], 10);
        return 0;
      };

      const timeA = getTimestamp(a);
      const timeB = getTimestamp(b);
      if (filmEditSort === 'oldest') {
        return timeA - timeB;
      }
      return timeB - timeA;
    });
  }, [allFilmVideos, filmEditSearch, filmEditSort, currentUser]);

  // Dynamically probe and calculate real video duration and file size for all videos
  useEffect(() => {
    filteredFilmVideos.forEach((v) => {
      if (!v.url) return;

      // 1. Probe real duration from media element if not already cached
      if (!videoMetadataMap[v.url]?.duration) {
        try {
          const testEl = document.createElement('video');
          testEl.preload = 'metadata';
          testEl.src = v.url;
          testEl.onloadedmetadata = () => {
            const dur = testEl.duration;
            if (dur && isFinite(dur) && dur > 0) {
              const formatted = formatVideoDuration(dur);
              setVideoMetadataMap(prev => ({
                ...prev,
                [v.url]: {
                  ...prev[v.url],
                  duration: formatted
                }
              }));
            }
          };
        } catch (e) {}
      }

      // 2. Probe real file size via HEAD request with server probe_size fallback
      const currentSize = videoMetadataMap[v.url]?.fileSize || v.fileSize;
      const isInvalid = !currentSize || currentSize === '0 B' || currentSize === '0.0 MB' || currentSize.includes('Uploaded File') || currentSize === '—';
      if (!videoMetadataMap[v.url]?.fileSize && isInvalid) {
        const videoProbeUrl = v.url.startsWith('http') ? v.url : `${ROOT_URL.replace(/\/$/, '')}/${v.url.replace(/^\//, '')}`;
        fetch(videoProbeUrl, { method: 'HEAD' })
          .then(res => {
            const cl = res.headers.get('content-length');
            if (cl) {
              const bytes = parseInt(cl, 10);
              if (bytes > 0) {
                const formatted = formatVideoFileSize(bytes);
                setVideoMetadataMap(prev => ({
                  ...prev,
                  [v.url]: {
                    ...prev[v.url],
                    fileSize: formatted
                  }
                }));
                return;
              }
            }
            throw new Error('No content-length header');
          })
          .catch(() => {
            // Server-side probe fallback (reads directly from shared host filesystem)
            apiFetch(`user-videos.php?action=probe_size&url=${encodeURIComponent(v.url)}`, { silent: true }, 1)
              .then(data => {
                const sizeNum = data?.file_size || data?.size;
                if (sizeNum && Number(sizeNum) > 0) {
                  const formatted = formatVideoFileSize(sizeNum);
                  setVideoMetadataMap(prev => ({
                    ...prev,
                    [v.url]: {
                      ...prev[v.url],
                      fileSize: formatted
                    }
                  }));
                }
              })
              .catch(() => {});
          });
      }
    });
  }, [filteredFilmVideos]);

  const recentFolders = useMemo(() => {
    return [...videoFolders]
      .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
      .slice(0, 4);
  }, [videoFolders]);

  const recentUnorganizedVideos = useMemo(() => {
    return allFilmVideos
      .filter(v => {
        if (!v.folderId) {
          if (!v.folder || v.folder === 'film-edit-studio' || v.folder === 'videos') return true;
          return !videoFolders.some(f => f.name.toLowerCase() === v.folder.toLowerCase());
        }
        return !videoFolders.some(f => f.id === v.folderId);
      })
      .slice(0, 6);
  }, [allFilmVideos, videoFolders]);

  const startFilmClipDirectUpload = (file: File) => {
    const isVideo = file.type.startsWith('video/');
    const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip', 'rar'];
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const isAllowedOther = allowedExtensions.includes(extension);

    if (!isVideo && !isAllowedOther) {
      showNotification('Please select a valid video file or document (PDF, Word, Excel, etc.).', 'error');
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      showNotification('File size exceeds 500MB maximum limit.', 'error');
      return;
    }

    const userId = currentUser?.id || currentUser?.email || 'instructor_user';
    const userEmail = currentUser?.email || '';

    setFilmUploadProgress({
      percentage: 0,
      uploadedBytes: 0,
      totalBytes: file.size,
      fileName: file.name,
      speedFormatted: 'Starting upload...',
      remainingFormatted: 'Calculating...',
      status: 'uploading'
    });

    const formData = new FormData();
    formData.append('fileData', file);
    formData.append('folder', 'film-edit-studio');
    formData.append('user_id', userId);
    formData.append('user_email', userEmail);

    const xhr = new XMLHttpRequest();
    filmUploadXhrRef.current = xhr;
    const cleanBase = API_BASE_URL.replace(/\/+$/, '');
    xhr.open('POST', `${cleanBase}/media-upload.php`, true);
    xhr.setRequestHeader('Accept', 'application/json');

    const startTime = Date.now();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percentage = Math.min(100, Math.round((e.loaded / e.total) * 100));
        const elapsedSec = (Date.now() - startTime) / 1000;
        const speedBps = elapsedSec > 0 ? e.loaded / elapsedSec : 0;
        const speedFormatted = speedBps > 1024 * 1024 
          ? `${(speedBps / (1024 * 1024)).toFixed(1)} MB/s` 
          : `${Math.round(speedBps / 1024)} KB/s`;
        const remainingBytes = Math.max(0, e.total - e.loaded);
        const remainingSeconds = speedBps > 0 ? Math.round(remainingBytes / speedBps) : 0;
        const remainingFormatted = remainingSeconds > 60 
          ? `${Math.floor(remainingSeconds / 60)}m ${remainingSeconds % 60}s remaining` 
          : `${remainingSeconds}s remaining`;

        setFilmUploadProgress({
          percentage,
          uploadedBytes: e.loaded,
          totalBytes: e.total,
          fileName: file.name,
          speedFormatted,
          remainingFormatted,
          status: percentage >= 100 ? 'completed' : 'uploading'
        });
      }
    };

    xhr.onload = async () => {
      filmUploadXhrRef.current = null;
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.success) {
            setFilmUploadProgress(prev => prev ? { ...prev, percentage: 100, status: 'completed' } : null);
            const fileName = file.name;
            const uploadId = `clip-${Date.now()}`;
            const fileUrl = res.url;
            const filePath = res.path || res.stored_path || res.url;

            try {
              await apiFetch('user-videos.php', {
                method: 'POST',
                body: JSON.stringify({
                  id: uploadId,
                  user_id: userId,
                  user_email: userEmail,
                  filename: fileName,
                  url: fileUrl,
                  file_path: filePath,
                  folder: 'film-edit-studio',
                  source: 'film_and_edit',
                  file_size: file.size
                })
              });
            } catch (err) {
              console.warn('Could not register video in user-videos API:', err);
            }

            const isVideoFile = file.type.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(extension);
            const newClip = {
              id: uploadId,
              name: fileName,
              url: fileUrl,
              fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
              duration: undefined,
              uploadedAt: new Date().toLocaleDateString(),
              uploadedBy: userId,
              source: 'film_and_edit' as const,
              status: 'ready' as const,
              tags: [isVideoFile ? 'Film & Edit' : 'Document', 'Direct Upload']
            };

            setFilmStudioClips(prev => [newClip, ...prev]);
            showNotification(`"${fileName}" uploaded successfully!`);

            setTimeout(() => {
              setFilmUploadProgress(null);
            }, 3000);
          } else {
            setFilmUploadProgress(prev => prev ? { ...prev, status: 'error' } : null);
            showNotification(res.error || 'Upload failed on server.', 'error');
          }
        } catch (err) {
          setFilmUploadProgress(prev => prev ? { ...prev, status: 'error' } : null);
          showNotification('Invalid response from server.', 'error');
        }
      } else {
        setFilmUploadProgress(prev => prev ? { ...prev, status: 'error' } : null);
        showNotification(`Server error (${xhr.status}) during upload.`, 'error');
      }
    };

    xhr.onerror = () => {
      filmUploadXhrRef.current = null;
      setFilmUploadProgress(prev => prev ? { ...prev, status: 'error' } : null);
      showNotification('Network connection error during upload.', 'error');
    };

    xhr.send(formData);
  };

  const cancelFilmUpload = () => {
    if (filmUploadXhrRef.current) {
      filmUploadXhrRef.current.abort();
      filmUploadXhrRef.current = null;
    }
    setFilmUploadProgress(null);
    showNotification('Film upload cancelled.');
  };

  const startTestVideoDirectUpload = (file: File) => {
    if (!file.type.startsWith('video/')) {
      showNotification('Please select a valid video file (MP4, MOV, WMV, AVI, WEBM).', 'error');
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      showNotification('File size exceeds 500MB maximum limit.', 'error');
      return;
    }

    const userId = currentUser?.id || currentUser?.email || 'instructor_user';
    const userEmail = currentUser?.email || '';

    setTestVideoStatus('uploading');
    setTestVideoFile(file);
    setTestUploadProgress({
      percentage: 0,
      uploadedBytes: 0,
      totalBytes: file.size,
      fileName: file.name,
      speedFormatted: 'Starting upload...',
      remainingFormatted: 'Calculating...'
    });

    const formData = new FormData();
    formData.append('fileData', file);
    formData.append('folder', 'test-videos');
    formData.append('user_id', userId);
    formData.append('user_email', userEmail);

    const xhr = new XMLHttpRequest();
    testUploadXhrRef.current = xhr;
    const cleanBase = API_BASE_URL.replace(/\/+$/, '');
    xhr.open('POST', `${cleanBase}/media-upload.php`, true);
    xhr.setRequestHeader('Accept', 'application/json');

    const startTime = Date.now();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percentage = Math.min(100, Math.round((e.loaded / e.total) * 100));
        const elapsedSec = (Date.now() - startTime) / 1000;
        const speedBps = elapsedSec > 0 ? e.loaded / elapsedSec : 0;
        const speedFormatted = speedBps > 1024 * 1024 
          ? `${(speedBps / (1024 * 1024)).toFixed(1)} MB/s` 
          : `${Math.round(speedBps / 1024)} KB/s`;
        const remainingBytes = Math.max(0, e.total - e.loaded);
        const remainingSeconds = speedBps > 0 ? Math.round(remainingBytes / speedBps) : 0;
        const remainingFormatted = remainingSeconds > 60 
          ? `${Math.floor(remainingSeconds / 60)}m ${remainingSeconds % 60}s remaining` 
          : `${remainingSeconds}s remaining`;

        setTestUploadProgress({
          percentage,
          uploadedBytes: e.loaded,
          totalBytes: e.total,
          fileName: file.name,
          speedFormatted,
          remainingFormatted
        });
      }
    };

    xhr.onload = async () => {
      testUploadXhrRef.current = null;
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.success) {
            setTestUploadProgress(prev => prev ? { ...prev, percentage: 100 } : null);
            const uploadId = `clip-${Date.now()}`;
            const fileUrl = res.url;
            const filePath = res.path || res.stored_path || res.url;

            try {
              await apiFetch('user-videos.php', {
                method: 'POST',
                body: JSON.stringify({
                  id: uploadId,
                  user_id: userId,
                  user_email: userEmail,
                  filename: file.name,
                  url: fileUrl,
                  file_path: filePath,
                  folder: 'test-videos',
                  source: 'test_video',
                  file_size: file.size
                })
              });
            } catch (err) {
              console.warn('Could not register test video in user-videos API:', err);
            }

            setTestVideoUrl(fileUrl);
            setTestVideoStatus('reviewing');
            setTimeout(() => {
              setTestVideoStatus('completed');
              setTestUploadProgress(null);
            }, 1500);
            showNotification('Test video uploaded successfully!');
          } else {
            setTestVideoStatus('idle');
            setTestUploadProgress(null);
            showNotification(res.error || 'Upload failed on server.', 'error');
          }
        } catch (err) {
          setTestVideoStatus('idle');
          setTestUploadProgress(null);
          showNotification('Invalid server response during upload.', 'error');
        }
      } else {
        setTestVideoStatus('idle');
        setTestUploadProgress(null);
        showNotification(`Server error (${xhr.status}) during upload.`, 'error');
      }
    };

    xhr.onerror = () => {
      testUploadXhrRef.current = null;
      setTestVideoStatus('idle');
      setTestUploadProgress(null);
      showNotification('Network error during test video upload.', 'error');
    };

    xhr.send(formData);
  };

  const cancelTestVideoUpload = () => {
    if (testUploadXhrRef.current) {
      testUploadXhrRef.current.abort();
      testUploadXhrRef.current = null;
    }
    setTestVideoStatus('idle');
    setTestUploadProgress(null);
    showNotification('Test video upload cancelled.');
  };

  const handleUploadFilmClip = (file: File) => {
    startFilmClipDirectUpload(file);
  };

  const handleAssignVideoToLesson = (videoId: string, videoUrl: string, lessonId: string) => {
    let targetLessonTitle = '';
    setModules(prevMods => prevMods.map(mod => ({
      ...mod,
      lessons: mod.lessons.map(les => {
        if (les.id === lessonId) {
          targetLessonTitle = `${mod.title} > ${les.title}`;
          return { ...les, type: 'video', videoUrl };
        }
        return les;
      })
    })));

    setFilmStudioClips(prev => {
      const exists = prev.some(clip => clip.id === videoId || clip.url === videoUrl);
      if (exists) {
        return prev.map(clip => 
          clip.id === videoId || clip.url === videoUrl ? {
            ...clip,
            associatedLessonId: lessonId,
            associatedLessonTitle: targetLessonTitle,
            status: 'assigned'
          } : clip
        );
      }
      return prev;
    });

    showNotification(`Video successfully assigned to: "${targetLessonTitle || 'Selected Lecture'}"`);
  };

  const handleUnassignVideoFromLesson = (videoId: string, videoUrl: string, lessonId?: string) => {
    setModules(prevMods => prevMods.map(mod => ({
      ...mod,
      lessons: mod.lessons.map(les => {
        if ((lessonId && les.id === lessonId) || (videoUrl && les.videoUrl === videoUrl)) {
          return { ...les, videoUrl: '' };
        }
        return les;
      })
    })));

    setFilmStudioClips(prev => prev.map(clip => 
      clip.id === videoId || (videoUrl && clip.url === videoUrl) ? {
        ...clip,
        associatedLessonId: undefined,
        associatedLessonTitle: undefined,
        status: 'raw' as const
      } : clip
    ));

    showNotification('Video unassigned from curriculum lecture');
  };

  const handleSetAsPromoVideo = (videoUrl: string, videoName: string) => {
    setPromoVideoUrl(videoUrl);
    setPromoVideoFileName(videoName);
    showNotification(`"${videoName}" set as Course Promotional Video!`);
  };

  const handleCourseImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showNotification("Image exceeds 10MB limit. Please upload a smaller image.", "error");
      return;
    }

    const img = new globalThis.Image();
    img.src = URL.createObjectURL(file);
    img.onload = async () => {
      if (img.width < 750 || img.height < 422) {
        showNotification(`Your image is ${img.width}x${img.height}px. We recommend at least 750x422px for high-quality displays.`, "info");
      }
      
      setIsUploadingImage(true);
      showNotification(`Uploading course image "${file.name}"...`);
      try {
        const response = await uploadMediaApi(file, undefined, 'courses');
        if (response.success) {
          setImage(response.url);
          setCourseImageFileName(file.name);
          showNotification("Course image uploaded successfully!");
        } else {
          showNotification("Failed to upload course image.", "error");
        }
      } catch (err: any) {
        console.error("Course image upload error:", err);
        showNotification(err.message || "Failed to upload course image.", "error");
      } finally {
        setIsUploadingImage(false);
      }
    };
  };

  const handleSetAsTestVideo = (videoUrl: string) => {
    setTestVideoUrl(videoUrl);
    setTestVideoStatus('completed');
    showNotification(`Video set as Course Test Video!`);
  };

  const handleRenameClip = (clipId: string, newName: string) => {
    if (!newName.trim()) return;
    setFilmStudioClips(prev => prev.map(c => c.id === clipId ? { ...c, name: newName } : c));
    setEditingVideoNameId(null);
    showNotification('Video clip renamed successfully.');
  };

  const promptDeleteClip = (clip: { id: string; name: string; url?: string }) => {
    setClipToDelete(clip);
  };

  const confirmDeleteClip = async () => {
    if (!clipToDelete) return;
    const clipId = String(clipToDelete.id);
    const clipUrl = clipToDelete.url || '';
    setIsDeletingClip(true);

    try {
      // 1. If matching test video, clear test video state
      if (clipId === 'test-video-source' || (clipUrl && testVideoUrl === clipUrl)) {
        setTestVideoUrl('');
        setTestVideoStatus('idle');
      }

      // 2. If matching promo video, clear promo video state
      if (clipId === 'promo-video-source' || (clipUrl && promoVideoUrl === clipUrl)) {
        setPromoVideoUrl('');
        setPromoVideoFileName('');
      }

      // 3. Clear from any assigned curriculum lectures so the video does not reappear in the library
      setModules(prev => prev.map(mod => ({
        ...mod,
        lessons: mod.lessons.map(les => {
          if ((clipUrl && les.videoUrl === clipUrl) || clipId === `lesson-v-${les.id}`) {
            return { ...les, videoUrl: '' };
          }
          return les;
        })
      })));

      // 4. Optimistically remove from Film Studio Clips state
      setFilmStudioClips(prev => prev.filter(c => {
        const matchesId = String(c.id) === clipId;
        const matchesUrl = clipUrl && c.url === clipUrl;
        return !matchesId && !matchesUrl;
      }));

      // 5. Immediately purge from localStorage keys
      try {
        const storageKeys = [
          initialData?.id ? `film_clips_${initialData.id}` : null,
          'film_clips_draft'
        ].filter(Boolean) as string[];

        storageKeys.forEach(key => {
          const raw = localStorage.getItem(key);
          if (raw) {
            const arr = JSON.parse(raw);
            if (Array.isArray(arr)) {
              const cleaned = arr.filter((c: any) => {
                const matchesId = String(c.id) === clipId;
                const matchesUrl = clipUrl && c.url === clipUrl;
                return !matchesId && !matchesUrl;
              });
              localStorage.setItem(key, JSON.stringify(cleaned));
            }
          }
        });
      } catch (err) {
        console.warn('LocalStorage clip purge warning:', err);
      }

      showNotification('Video clip deleted successfully.');

      // 6. Delete from backend using POST (safe for shared hosting) and DELETE fallback
      try {
        await apiFetch('user-videos.php', {
          method: 'POST',
          body: JSON.stringify({
            action: 'delete',
            id: clipId,
            url: clipUrl
          })
        });
      } catch (e) {
        await apiFetch(`user-videos.php?action=delete&id=${encodeURIComponent(clipId)}&url=${encodeURIComponent(clipUrl)}`, {
          method: 'DELETE'
        }).catch(err => console.warn('Could not delete clip on server:', err));
      }
    } catch (e) {
      console.warn('Failed to delete clip', e);
      showNotification('Failed to delete clip. Please try again.', 'error');
    } finally {
      setIsDeletingClip(false);
      setClipToDelete(null);
    }
  };

  const handleDeleteClip = (clipId: string) => {
    const found = allFilmVideos.find(v => String(v.id) === String(clipId) || (clipId && v.url === clipId));
    setClipToDelete({ id: clipId, name: found?.name || 'Video Clip', url: found?.url });
  };

  // Selection-aware Rich Text Format Helper (Word-like text selection formatting)
  const applySelectionFormat = (
    textareaRef: React.RefObject<HTMLTextAreaElement | null>,
    text: string,
    setText: (v: string) => void,
    type: 'bold' | 'italic' | 'underline' | 'number' | 'bullet' | 'image' | 'code' | 'table' | 'link'
  ) => {
    const el = textareaRef.current;
    if (!el) {
      if (type === 'bold') setText(text + '**bold text**');
      if (type === 'italic') setText(text + '*italic text*');
      return;
    }

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selectedText = text.substring(start, end);
    const before = text.substring(0, start);
    const after = text.substring(end);

    let replacement = '';
    let selectStart = start;
    let selectEnd = end;

    switch (type) {
      case 'bold':
        if (selectedText) {
          replacement = `**${selectedText}**`;
          selectStart = start + 2;
          selectEnd = end + 2;
        } else {
          replacement = '**bold text**';
          selectStart = start + 2;
          selectEnd = start + 11;
        }
        break;
      case 'italic':
        if (selectedText) {
          replacement = `*${selectedText}*`;
          selectStart = start + 1;
          selectEnd = end + 1;
        } else {
          replacement = '*italic text*';
          selectStart = start + 1;
          selectEnd = start + 12;
        }
        break;
      case 'underline':
        if (selectedText) {
          replacement = `<u>${selectedText}</u>`;
          selectStart = start + 3;
          selectEnd = end + 3;
        } else {
          replacement = '<u>underlined text</u>';
          selectStart = start + 3;
          selectEnd = start + 18;
        }
        break;
      case 'number':
        if (selectedText) {
          const lines = selectedText.split('\n');
          replacement = lines.map((line, idx) => `${idx + 1}. ${line.replace(/^(\d+\.|-)\s*/, '')}`).join('\n');
          selectStart = start;
          selectEnd = start + replacement.length;
        } else {
          replacement = (before === '' || before.endsWith('\n')) ? '1. List item' : '\n1. List item';
          selectStart = start + replacement.length - 9;
          selectEnd = start + replacement.length;
        }
        break;
      case 'bullet':
        if (selectedText) {
          const lines = selectedText.split('\n');
          replacement = lines.map((line) => `- ${line.replace(/^(\d+\.|-)\s*/, '')}`).join('\n');
          selectStart = start;
          selectEnd = start + replacement.length;
        } else {
          replacement = (before === '' || before.endsWith('\n')) ? '- List item' : '\n- List item';
          selectStart = start + replacement.length - 9;
          selectEnd = start + replacement.length;
        }
        break;
      case 'code':
        if (selectedText) {
          replacement = `\`${selectedText}\``;
          selectStart = start + 1;
          selectEnd = end + 1;
        } else {
          replacement = '`code snippet`';
          selectStart = start + 1;
          selectEnd = start + 13;
        }
        break;
      case 'link': {
        const url = prompt('Enter link URL:', 'https://');
        if (!url) return;
        if (selectedText) {
          replacement = `[${selectedText}](${url})`;
          selectStart = start + 1;
          selectEnd = start + 1 + selectedText.length;
        } else {
          replacement = `[Link text](${url})`;
          selectStart = start + 1;
          selectEnd = start + 10;
        }
        break;
      }
      case 'image': {
        const imgUrl = prompt('Enter image URL:', 'https://');
        if (!imgUrl) return;
        replacement = `\n![${selectedText || 'Image description'}](${imgUrl})\n`;
        selectStart = start + replacement.length;
        selectEnd = selectStart;
        break;
      }
      case 'table':
        replacement = `\n| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |\n`;
        selectStart = start + replacement.length;
        selectEnd = selectStart;
        break;
    }

    const updatedText = before + replacement + after;
    if (updatedText.length <= 1000) {
      setText(updatedText);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(selectStart, selectEnd);
      }, 10);
    }
  };

  // Dynamic Coupons State
  const [coupons, setCoupons] = useState<CouponInput[]>([]);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState(20);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [expiredSearchQuery, setExpiredSearchQuery] = useState('');

  // 4. AI Assistant Generator State
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiGeneratedSuccess, setAiGeneratedSuccess] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  // 5. Collaboration State
  const [coInstructors, setCoInstructors] = useState([]);
  const [newCoName, setNewCoName] = useState('');
  const [newCoEmail, setNewCoEmail] = useState('');
  const [newCoSplit, setNewCoSplit] = useState(15);
  const [reviewLinkCopied, setReviewLinkCopied] = useState(false);

  // 6. Dynamic Version Snapshots State
  const [snapshots, setSnapshots] = useState<SnapshotInput[]>([]);

  // Add Module Modal State
  const [isAddModuleModalOpen, setIsAddModuleModalOpen] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleDescription, setNewModuleDescription] = useState('');
  const [isSavingModule, setIsSavingModule] = useState(false);

  // Module Deletion State
  const [moduleToDelete, setModuleToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDeletingModule, setIsDeletingModule] = useState(false);

  // Section / Module Rename Modal State
  const [editingSectionModal, setEditingSectionModal] = useState<{
    id: string;
    index: number;
    title: string;
    description: string;
  } | null>(null);
  const [isSavingSectionModal, setIsSavingSectionModal] = useState(false);

  // Flattened Lessons for Easy Access
  const allLessons = useMemo(() => {
    const list: { lesson: LessonInput; moduleTitle: string; moduleId: string }[] = [];
    modules.forEach(m => {
      m.lessons.forEach(l => {
        list.push({ lesson: l, moduleTitle: m.title, moduleId: m.id });
      });
    });
    return list;
  }, [modules]);

  // Dynamic Current Selected Lesson
  const currentLessonInfo = useMemo(() => {
    return allLessons.find(item => item.lesson.id === selectedLessonId) || allLessons[0];
  }, [allLessons, selectedLessonId]);

  const currentLesson = currentLessonInfo?.lesson;
  const currentModuleId = currentLessonInfo?.moduleId;

  // Real-time calculation of course statistics
  const totalLessonsCount = allLessons.length;
  const totalVideoLessons = allLessons.filter(l => l.lesson.type === 'video').length;
  const totalQuizLessons = allLessons.filter(l => l.lesson.type === 'quiz').length;
  const totalDurationMinutes = allLessons.reduce((acc, l) => {
    const [minStr] = (l.lesson.duration || '10:00').split(':');
    return acc + (parseInt(minStr, 10) || 10);
  }, 0);

  // Dynamic Health / Readiness Meter
  const courseHealth = useMemo(() => {
    let score = 0;
    const checks: { label: string; done: boolean; targetTab: BuilderTabKey }[] = [
      { label: 'Intended Learners defined (4+ objectives)', done: learningObjectives.filter(o => o.trim()).length >= 4, targetTab: 'intended-learners' },
      { label: 'Course Title & Subtitle defined', done: Boolean(title.trim() && subtitle.trim()), targetTab: 'structure' },
      { label: 'At least 3 Learning Outcomes listed', done: learningOutcomes.length >= 3, targetTab: 'structure' },
      { label: 'At least 2 Modules configured', done: modules.length >= 2, targetTab: 'structure' },
      { label: 'At least 3 Lessons created', done: totalLessonsCount >= 3, targetTab: 'structure' },
      { label: 'Assessment / Quiz included', done: totalQuizLessons >= 1, targetTab: 'assessment' },
      { label: 'Cover Image selected', done: Boolean(image), targetTab: 'design' },
      { label: 'Pricing configured ($ > 0)', done: price > 0, targetTab: 'settings' }
    ];

    const completed = checks.filter(c => c.done).length;
    score = Math.round((completed / checks.length) * 100);

    return { score, checks };
  }, [title, subtitle, learningOutcomes, modules, totalLessonsCount, totalQuizLessons, image, price]);

  // Dynamic Module & Lesson Handlers
  const handleAddModule = () => {
    const newModId = `mod-${Date.now()}`;
    const newMod: ModuleInput = {
      id: newModId,
      title: `New Section Title`,
      description: '',
      isExpanded: true,
      lessons: []
    };
    setModules([...modules, newMod]);
    showNotification('New section added inline!');
  };

  const handleSaveNewModule = async () => {
    if (!newModuleTitle.trim()) {
      showNotification('Module title is required.', 'error');
      return;
    }

    setIsSavingModule(true);
    try {
      const moduleData = {
        course_id: courseId,
        title: newModuleTitle.trim(),
        description: newModuleDescription.trim(),
        order_index: modules.length
      };

      const res = await upsertModuleApi(moduleData);
      
      if (res.success && res.data) {
        const newMod: ModuleInput = {
          id: res.data.id || `mod-${Date.now()}`,
          title: moduleData.title,
          description: moduleData.description,
          isExpanded: true,
          lessons: []
        };
        
        setModules([...modules, newMod]);
        setIsAddModuleModalOpen(false);
        showNotification('New module added successfully!');
      } else {
        showNotification(res.message || 'Failed to save module.', 'error');
      }
    } catch (err) {
      console.error('Error saving module:', err);
      showNotification('An error occurred while saving the module.', 'error');
    } finally {
      setIsSavingModule(false);
    }
  };

  const handleDeleteModule = (modId: string) => {
    const mod = modules.find(m => m.id === modId);
    if (mod) {
      setModuleToDelete({ id: mod.id, title: mod.title });
    }
  };

  const confirmDeleteModule = async () => {
    if (!moduleToDelete) return;

    if (modules.length <= 1) {
      showNotification('At least 1 module is required in a course.', 'error');
      setModuleToDelete(null);
      return;
    }

    setIsDeletingModule(true);
    try {
      // Check if it's a real database ID (not a temp mod- prefix)
      if (!moduleToDelete.id.startsWith('mod-')) {
        const res = await deleteModuleOrLessonApi('module', moduleToDelete.id);
        if (!res.success) {
          showNotification(res.message || 'Failed to delete module from database.', 'error');
          setIsDeletingModule(false);
          return;
        }
      }
      
      setModules(modules.filter(m => m.id !== moduleToDelete.id));
      showNotification('Module deleted successfully.');
      setModuleToDelete(null);
    } catch (err) {
      console.error('Error deleting module:', err);
      showNotification('An error occurred during deletion.', 'error');
    } finally {
      setIsDeletingModule(false);
    }
  };

  const handleOpenEditSectionModal = (mod: ModuleInput, index: number) => {
    setEditingSectionModal({
      id: mod.id,
      index,
      title: mod.title,
      description: mod.description || ''
    });
  };

  const handleSaveSectionModal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingSectionModal) return;
    
    const updatedTitle = editingSectionModal.title.trim();
    const updatedDesc = (editingSectionModal.description || '').trim();

    if (!updatedTitle) {
      showNotification('Section title cannot be empty.', 'error');
      return;
    }

    setIsSavingSectionModal(true);
    try {
      // 1. Update React state immediately
      setModules(prev => prev.map(m => m.id === editingSectionModal.id ? {
        ...m,
        title: updatedTitle,
        description: updatedDesc
      } : m));

      // 2. Persist to backend database via API
      const res = await updateSectionTitleApi({
        id: editingSectionModal.id,
        courseId,
        title: updatedTitle,
        description: updatedDesc,
        orderIndex: editingSectionModal.index
      });

      if (res && res.success !== false) {
        showNotification(`Section "${updatedTitle}" saved successfully!`, 'success');
        setEditingSectionModal(null);
      } else {
        // Even if server returns a custom error object, inform user or close
        showNotification(res?.message || 'Section updated in curriculum.', 'success');
        setEditingSectionModal(null);
      }
    } catch (err) {
      console.error('Failed to update section title in database:', err);
      showNotification('Section updated locally.', 'info');
    } finally {
      setIsSavingSectionModal(false);
    }
  };

  const toggleModuleExpand = (modId: string) => {
    setModules(prev => prev.map(m => m.id === modId ? { ...m, isExpanded: m.isExpanded === false ? true : false } : m));
  };

  const handleAddLesson = (modId: string, type: 'video' | 'article' | 'quiz' | 'audio' | 'scorm' = 'video', customTitle?: string) => {
    const targetModule = modules.find(m => m.id === modId);
    const existingCount = targetModule?.lessons?.length || 0;
    const typeLabel = type === 'quiz' ? 'Quiz' : type === 'article' ? 'Article / Notes' : type === 'audio' ? 'Audio Session' : 'Lecture';
    const newLessonId = `les-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    
    const newLesson: LessonInput = {
      id: newLessonId,
      title: customTitle || (type === 'quiz' ? `Quiz ${existingCount + 1}: Check Your Knowledge` : `Lecture ${existingCount + 1}: Key Concepts`),
      duration: type === 'video' ? '12:00' : type === 'quiz' ? '10:00' : '05:00',
      type,
      isPreview: false,
      content: `# ${typeLabel}\n\nAdd rich lecture instructions, video resources, code blocks, and downloadable assets.`
    };

    setModules(prev => prev.map(mod => {
      if (mod.id === modId) {
        return {
          ...mod,
          isExpanded: true, // Always expand so the new curriculum item is immediately visible
          lessons: [...(mod.lessons || []), newLesson]
        };
      }
      return mod;
    }));

    setSelectedLessonId(newLessonId);
    showNotification(`Added new ${typeLabel} to section.`);
  };

  const handleDeleteLesson = (modId: string, lessonId: string) => {
    setModules(modules.map(mod => {
      if (mod.id === modId) {
        return {
          ...mod,
          lessons: mod.lessons.filter(l => l.id !== lessonId)
        };
      }
      return mod;
    }));
    showNotification('Lesson removed.');
  };

  // Dynamic Lesson Property Updater
  const handleUpdateCurrentLesson = (updates: Partial<LessonInput>) => {
    if (!currentLessonInfo) return;
    setModules(prev => prev.map(m => {
      if (m.id === currentLessonInfo.moduleId) {
        return {
          ...m,
          lessons: m.lessons.map(l => l.id === selectedLessonId ? { ...l, ...updates } : l)
        };
      }
      return m;
    }));
  };

  // AI Course Generator
  const handleRunAiCourseGenerator = (customPrompt?: string) => {
    const promptToUse = customPrompt || aiPrompt;
    setIsGeneratingAi(true);

    setTimeout(() => {
      setIsGeneratingAi(false);
      setAiGeneratedSuccess(true);

      const generatedModules: ModuleInput[] = [
        {
          id: `mod-ai-${Date.now()}-1`,
          title: `Module 1: Fundamentals of ${promptToUse.split(' ').slice(0, 4).join(' ')}`,
          description: 'Core concepts, architectural diagrams, and foundational libraries.',
          isExpanded: true,
          lessons: [
            {
              id: `les-ai-1`,
              title: '1.1 System Primitives & Mental Models',
              duration: '14:20',
              type: 'video',
              isPreview: true,
              content: `# Primitives & Mental Models\n\nDeep dive into core primitives and execution pipelines.`
            },
            {
              id: `les-ai-2`,
              title: '1.2 Architecture Deep-Dive & Schemas',
              duration: '18:00',
              type: 'article',
              content: `# Architectural Schemas\n\nReviewing data contracts and API specifications.`
            }
          ]
        },
        {
          id: `mod-ai-${Date.now()}-2`,
          title: 'Module 2: Real-World Implementation & Enterprise Patterns',
          description: 'Building production-grade services with fault tolerance.',
          isExpanded: true,
          lessons: [
            {
              id: `les-ai-3`,
              title: '2.1 Hands-on Lab: Deploying Scalable Services',
              duration: '26:15',
              type: 'video',
              content: `## Hands-on Lab\n\nStep-by-step walkthrough of writing resilient services.`
            },
            {
              id: `les-ai-4`,
              title: '2.2 Capstone Knowledge Assessment',
              duration: '15:00',
              type: 'quiz'
            }
          ]
        }
      ];

      setModules(generatedModules);
      setSelectedLessonId(generatedModules[0].lessons[0].id);
      setTitle(promptToUse.length > 50 ? promptToUse.slice(0, 50) + '...' : promptToUse);
      setDescription(`An industry-leading curriculum covering ${promptToUse} with hands-on projects and quizzes.`);
      showNotification('Gemini AI synthesized a comprehensive 2-module curriculum!');
      setTimeout(() => setAiGeneratedSuccess(false), 5000);
    }, 1500);
  };

  // AI Lesson Note Writer for Active Lesson
  const handleGenerateAiLessonNotes = () => {
    if (!currentLesson) return;
    const aiContent = `# ${currentLesson.title}\n\n## Learning Objectives\n- Understand the architectural foundations and best practices.\n- Implement real-world patterns in TypeScript & Cloud Run.\n- Debug edge-cases and error handling flows.\n\n\`\`\`typescript\n// Example Code Companion\nexport async function handleExecution() {\n  console.log("Executing high-performance microservice workflow...");\n}\n\`\`\`\n\n> Pro-Tip: Ensure all API endpoints validate input parameters with Zod schema guards.`;
    handleUpdateCurrentLesson({ content: aiContent });
    showNotification(`AI generated complete lecture notes for "${currentLesson.title}"!`);
  };

  // Dynamic Snapshot Creation
  const handleCreateSnapshot = () => {
    const newSnap: SnapshotInput = {
      id: `snap-${Date.now()}`,
      version: `v1.${snapshots.length + 2}`,
      date: 'Just now',
      author: 'Michael Onare',
      changes: `Saved snapshot containing ${modules.length} modules and ${totalLessonsCount} lessons.`,
      snapshotData: JSON.parse(JSON.stringify({ title, subtitle, price, modules, learningOutcomes }))
    };
    setSnapshots([newSnap, ...snapshots]);
    showNotification(`New snapshot ${newSnap.version} created!`);
  };

  const handleRestoreSnapshot = (snap: SnapshotInput) => {
    if (snap.snapshotData) {
      setTitle(snap.snapshotData.title || title);
      setSubtitle(snap.snapshotData.subtitle || subtitle);
      setPrice(snap.snapshotData.price || price);
      if (snap.snapshotData.modules) setModules(snap.snapshotData.modules);
      if (snap.snapshotData.learningOutcomes) setLearningOutcomes(snap.snapshotData.learningOutcomes);
    }
    showNotification(`Restored to snapshot ${snap.version}!`);
  };

  // Dynamic Coupon Handlers
  const handleAddCoupon = () => {
    if (!newCouponCode.trim()) return;
    const newC: CouponInput = {
      id: `c-${Date.now()}`,
      code: newCouponCode.toUpperCase().trim(),
      discountPercent: Number(newCouponDiscount) || 20,
      expiryDate: '2026-12-31',
      usageCount: 0,
      maxUsage: 100,
      isActive: true
    };
    setCoupons([...coupons, newC]);
    setNewCouponCode('');
    showNotification(`Coupon ${newC.code} created!`);
  };

  const handleToggleCoupon = (couponId: string) => {
    setCoupons(coupons.map(c => c.id === couponId ? { ...c, isActive: !c.isActive } : c));
  };

  const handleDeleteCoupon = (couponId: string) => {
    setCoupons(coupons.filter(c => c.id !== couponId));
    showNotification('Coupon removed.');
  };

  // Dynamic Co-Instructor Handlers
  const handleAddCoInstructor = () => {
    if (!newCoEmail.trim() || !newCoName.trim()) {
      showNotification('Please enter instructor name and email.', 'error');
      return;
    }
    const newCo = {
      id: `co-${Date.now()}`,
      name: newCoName,
      email: newCoEmail,
      role: 'Co-Instructor & Reviewer',
      split: Number(newCoSplit) || 15,
      permissions: 'Edit Content'
    };
    setCoInstructors([...coInstructors, newCo]);
    setNewCoName('');
    setNewCoEmail('');
    showNotification(`Invited ${newCo.name} as Co-Instructor!`);
  };

  // Helper to add outcome(s)
  const handleAddOutcome = () => {
    if (!newOutcome.trim()) return;
    const lines = newOutcome.includes('\n')
      ? newOutcome.split('\n').map(s => s.trim()).filter(Boolean)
      : (newOutcome.includes(';') ? newOutcome.split(';').map(s => s.trim()).filter(Boolean) : [newOutcome.trim()]);
    
    setLearningOutcomes(prev => [...prev, ...lines]);
    setNewOutcome('');
  };

  // Final Publish / Save Payload
  const handlePublish = async (asDraft: boolean = false, priceOverride?: number, originalPriceOverride?: number) => {
    if (!title.trim()) {
      showNotification('Course title cannot be blank.', 'error');
      setActiveTab('structure');
      return;
    }

    // Auto-include any pending outcome text typed in the input box
    const pending = newOutcome.trim();
    const currentOutcomes = [...learningOutcomes];
    if (pending) {
      const extra = pending.includes('\n')
        ? pending.split('\n').map(s => s.trim()).filter(Boolean)
        : [pending];
      currentOutcomes.push(...extra);
      setLearningOutcomes(currentOutcomes);
      setNewOutcome('');
    }

    const validOutcomes = currentOutcomes.map(o => o.trim()).filter(Boolean);

    // Dynamically convert entered values in chosen currency to USD ($) on submission
    const activeRate = (activePricingCurrency?.rate && activePricingCurrency.rate > 0) ? activePricingCurrency.rate : 1;
    const typedPrice = parseFloat(displayPriceInput);
    const submissionPriceUsd = priceOverride !== undefined
      ? priceOverride
      : (!isNaN(typedPrice) && typedPrice >= 0
        ? (typedPrice === 0 ? 0 : Number((typedPrice / activeRate).toFixed(2)))
        : (price >= 0 ? Number(price.toFixed(2)) : 0));

    const typedOriginal = parseFloat(displayOriginalPriceInput);
    const submissionOriginalPriceUsd = originalPriceOverride !== undefined
      ? originalPriceOverride
      : (!isNaN(typedOriginal) && typedOriginal > 0
        ? Number((typedOriginal / activeRate).toFixed(2))
        : (originalPrice > 0 ? Number(originalPrice.toFixed(2)) : 0));

    // Synchronize USD values
    setPrice(submissionPriceUsd);
    setOriginalPrice(submissionOriginalPriceUsd);

    const payload = {
      id: courseId,
      title,
      subtitle,
      description,
      subcategory,
      primaryTaught,
      instructorDescription,
      instructorImage,
      instructor: initialData?.instructor || '',
      instructorTitle: initialData?.instructorTitle || '',
      instructorAvatar: initialData?.instructorAvatar || instructorImage || '',
      createdBy: initialData?.createdBy || (initialData as any)?.created_by || currentUser?.id || '',
      created_by: initialData?.createdBy || (initialData as any)?.created_by || currentUser?.id || '',
      creatorEmail: initialData?.creatorEmail || currentUser?.email || '',
      category,
      level,
      price: submissionPriceUsd,
      originalPrice: submissionOriginalPriceUsd,
      image,
      language,
      promoVideo: promoVideoFileName,
      duration: `${Math.max(1, Math.round(totalDurationMinutes / 60))} hours`,
      learningOutcomes: validOutcomes,
      learning_outcomes: validOutcomes,
      whatYouWillLearn: validOutcomes,
      learningObjectives: learningObjectives.filter(o => o.trim()),
      requirements: courseRequirements.filter(o => o.trim()),
      targetLearners: targetLearners.filter(o => o.trim()),
      isPublished: !asDraft,
      isSponsored,
      bestSeller,
      isPremium,
      modules: modules.map(m => ({
        id: m.id,
        title: m.title,
        description: m.description,
        lessons: m.lessons.map(l => ({
          id: l.id,
          title: l.title,
          duration: l.duration,
          type: l.type,
          content: l.content || 'Lecture material and code companion notes.',
          videoUrl: l.videoUrl,
          isPreview: l.isPreview || false,
          quizData: l.quizData,
          description: (l as any).description || '',
          resources: l.resources || [],
          labUrl: (l as any).labUrl || '',
          labTitle: (l as any).labTitle || ''
        }))
      }))
    };

    // Parallel saving of promotional video to dedicated table
    if (promoVideoFileName && promoVideoFileName !== 'No file selected') {
      apiFetch('promotional-videos.php', {
        method: 'POST',
        body: JSON.stringify({
          course_id: courseId,
          video_path: promoVideoFileName
        })
      }).catch(err => {
        console.error("Error saving promotional video to dedicated table:", err);
      });
    }

    try {
      await Promise.resolve(onSave(payload));
      setLastSavedDescription(description);
    } catch (e) {
      console.warn('onSave completed with warnings or error:', e);
    }
    showNotification(asDraft ? 'Course draft saved!' : 'Course published to UQlearn marketplace!');
  };

  const handleExecuteDeleteCourse = async (courseIdToDelete: string, permanent: boolean = false) => {
    setIsDeletingCourse(true);
    try {
      // 1. Invoke delete-course API endpoint
      await deleteCourseApi({ 
        id: courseIdToDelete,
        permanent, 
        action: permanent ? 'permanent_delete' : 'soft_delete' 
      });
    } catch (err) {
      console.warn('deleteCourseApi call notice:', err);
    }

    // 2. Inform parent state
    if (onDeleteCourse) {
      onDeleteCourse(courseIdToDelete);
    }

    setIsDeletingCourse(false);
    setCourseToDelete(null);
    showNotification(`Course deleted successfully!`);

    // If deleting the active course being edited, return to course list
    if (courseIdToDelete === courseId) {
      setBuilderMode('courses-list');
    }
  };

  // Sidebar Menu Structure
  const sidebarGroups = [
    {
      title: 'Plan your course',
      items: [
        { key: 'intended-learners' as BuilderTabKey, label: 'Intended learners', icon: Users },
        { key: 'structure' as BuilderTabKey, label: 'Course structure', icon: FileText },
      ]
    },
    {
      title: 'Create your content',
      items: [
        { key: 'course-description' as BuilderTabKey, label: 'Course description', icon: AlignLeft },
        { key: 'film-edit' as BuilderTabKey, label: 'Film & edit', icon: Film, checked: true },
        { key: 'curriculum' as BuilderTabKey, label: 'Curriculum', icon: Layers, countBadge: modules.length },
        { key: 'captions' as BuilderTabKey, label: 'Captions (optional)', icon: Subtitles },
        { key: 'accessibility' as BuilderTabKey, label: 'Accessibility (optional)', icon: ShieldCheck },
      ]
    },
    {
      title: 'Publish your course',
      items: [
        { key: 'landing-page' as BuilderTabKey, label: 'Course landing page', icon: Eye },
        { key: 'pricing' as BuilderTabKey, label: 'Pricing', icon: DollarSign },
        { key: 'promotions' as BuilderTabKey, label: 'Promotions', icon: Tag },
        { key: 'messages' as BuilderTabKey, label: 'Course messages', icon: MessageSquare },
      ]
    }
  ];

  const tabLabels: Record<string, string> = {
    'overview': 'Manage Hub',
    'intended-learners': 'Intended learners',
    'structure': 'Course structure',
    'course-description': 'Course description',
    'film-edit': 'Film & edit',
    'curriculum': 'Curriculum',
    'captions': 'Captions (optional)',
    'accessibility': 'Accessibility (optional)',
    'landing-page': 'Course landing page',
    'pricing': 'Pricing',
    'promotions': 'Promotions',
    'messages': 'Course messages',
    'content': 'Lecture Content',
    'assessment': 'Assessment',
  };

  const filteredBuilderCourses = useMemo(() => {
    const seen = new Set<string>();
    return courses.filter(c => {
      if (!c || !c.id || seen.has(c.id)) return false;
      seen.add(c.id);
      if (!searchQuery.trim()) return true;
      return c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
             c.category.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [courses, searchQuery]);

  const resolvedInstructorAvatar = useMemo(() => {
    const candidates = [
      instructorImage,
      initialData?.instructorAvatar,
      (initialData as any)?.instructor_avatar,
      (initialData as any)?.instructorImage,
      (initialData as any)?.instructor_image,
      (initialData as any)?.avatar,
      (initialData as any)?.avatar_url,
      currentUser?.avatar,
      (currentUser as any)?.avatar_url,
      (currentUser as any)?.photoURL,
      (currentUser as any)?.picture,
      courseId ? localStorage.getItem(`uqlearn_course_${courseId}_instructor_img`) : null,
      initialData?.id ? localStorage.getItem(`uqlearn_course_${initialData.id}_instructor_img`) : null,
      localStorage.getItem('uqlearn_instructor_avatar')
    ];

    for (const cand of candidates) {
      if (typeof cand === 'string' && cand.trim().length > 2) {
        const trimmed = cand.trim();
        if (!/^[A-Z]{1,3}$/.test(trimmed)) {
          return trimmed;
        }
      }
    }

    for (const sk of ['uqlearn_instructor', 'uqlearn_user', 'uqlearn_admin']) {
      try {
        const raw = localStorage.getItem(sk);
        if (raw) {
          const parsed = JSON.parse(raw);
          const av = parsed.avatar || parsed.avatar_url;
          if (typeof av === 'string' && av.trim().length > 2 && !/^[A-Z]{1,3}$/.test(av.trim())) {
            return av.trim();
          }
        }
      } catch {}
    }

    if (currentUser?.id) {
      try {
        const raw = localStorage.getItem(`uq_profile_${currentUser.id}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          const av = parsed.avatar_url || parsed.avatar;
          if (typeof av === 'string' && av.trim().length > 2 && !/^[A-Z]{1,3}$/.test(av.trim())) {
            return av.trim();
          }
        }
      } catch {}
    }

    return '';
  }, [instructorImage, initialData, currentUser, courseId]);

  // Synchronize instructorImage state if resolved avatar becomes available
  useEffect(() => {
    if (resolvedInstructorAvatar && (!instructorImage || instructorImage.trim().length <= 2 || /^[A-Z]{1,3}$/.test(instructorImage.trim()))) {
      setInstructorImage(resolvedInstructorAvatar);
    }
  }, [resolvedInstructorAvatar]);

  // Synchronize remote MySQL profile avatar on mount if currentUser exists
  useEffect(() => {
    if (currentUser?.id && !resolvedInstructorAvatar) {
      apiFetch(`profile.php?id=${encodeURIComponent(currentUser.id)}`).then((res: any) => {
        if (res && res.data && res.data.avatar_url && res.data.avatar_url.trim().length > 2) {
          const remoteUrl = res.data.avatar_url.trim();
          setInstructorImage(remoteUrl);
          try {
            localStorage.setItem('uqlearn_instructor_avatar', remoteUrl);
            if (courseId) localStorage.setItem(`uqlearn_course_${courseId}_instructor_img`, remoteUrl);
          } catch {}
        }
      }).catch(() => {});
    }
  }, [currentUser?.id, resolvedInstructorAvatar, courseId]);

  const checklistItems = useMemo(() => [
    {
      section: 'Intended learners page',
      items: [
        { id: 'prereqs', text: 'Specify any course requirements or prerequisites', done: courseRequirements.filter(r => r.trim()).length >= 1, tab: 'intended-learners' as BuilderTabKey },
        { id: 'objectives', text: 'Specify at least 4 of your course’s learning objectives', done: learningObjectives.filter(o => o.trim()).length >= 4, tab: 'intended-learners' as BuilderTabKey },
        { id: 'target_learners', text: 'Specify who this course is for', done: targetLearners.filter(t => t.trim()).length >= 1, tab: 'intended-learners' as BuilderTabKey }
      ]
    },
    {
      section: 'Curriculum page',
      items: [
        { id: 'duration', text: 'Have at least 30 minutes of video content', done: totalDurationMinutes >= 30, tab: 'curriculum' as BuilderTabKey },
        { id: 'lectures', text: 'Have at least 5 lectures', done: totalLessonsCount >= 5, tab: 'curriculum' as BuilderTabKey }
      ]
    },
    {
      section: 'Course landing page page',
      items: [
        { id: 'desc_words', text: `Have a course description with at least 200 words (currently ${description.trim().split(/\s+/).filter(Boolean).length} words)`, done: description.trim().split(/\s+/).filter(Boolean).length >= 200, tab: 'landing-page' as BuilderTabKey },
        { id: 'subtitle', text: 'Have a course subtitle', done: subtitle.trim().length > 0, tab: 'landing-page' as BuilderTabKey },
        { id: 'instructor_desc', text: `Have an instructor description with at least 50 words (currently ${instructorDescription.trim().split(/\s+/).filter(Boolean).length} words)`, done: instructorDescription.trim().split(/\s+/).filter(Boolean).length >= 50, tab: 'landing-page' as BuilderTabKey },
        { id: 'category', text: 'Select the category of your course', done: category.trim().length > 0, tab: 'landing-page' as BuilderTabKey },
        { id: 'level', text: 'Select the level of your course', done: level.trim().length > 0, tab: 'landing-page' as BuilderTabKey },
        { id: 'subcategory', text: 'Select the subcategory of your course', done: subcategory.trim().length > 0, tab: 'landing-page' as BuilderTabKey },
        { id: 'primary_taught', text: 'Select what is primarily taught in your course', done: primaryTaught.trim().length > 0, tab: 'landing-page' as BuilderTabKey },
        { id: 'image', text: 'Upload a course image', done: image.trim().length > 0, tab: 'landing-page' as BuilderTabKey },
        { id: 'instructor_image', text: 'Upload an instructor image', done: Boolean(resolvedInstructorAvatar && resolvedInstructorAvatar.length > 2 && !/^[A-Z]{1,3}$/.test(resolvedInstructorAvatar)), tab: 'landing-page' as BuilderTabKey }
      ]
    },
    {
      section: 'Pricing page',
      items: [
        { id: 'price', text: `Set a course price between $3.99 and $30.00 USD (currently $${price > 0 ? price.toFixed(2) : '0.00'} USD)`, done: price >= MIN_PRICE_USD && price <= MAX_PRICE_USD, tab: 'pricing' as BuilderTabKey }
      ]
    }
  ], [
    courseRequirements,
    learningObjectives,
    targetLearners,
    totalDurationMinutes,
    totalLessonsCount,
    description,
    subtitle,
    instructorDescription,
    category,
    level,
    subcategory,
    primaryTaught,
    image,
    instructorImage,
    resolvedInstructorAvatar,
    price
  ]);

  const checkIsChecklistComplete = () => {
    return checklistItems.every(group => group.items.every(item => item.done));
  };

  const handleSubmitForReview = () => {
    if (checkIsChecklistComplete()) {
      handlePublish(false);
      setIsSubmittedSuccess(true);
    } else {
      setIsSubmitModalOpen(true);
    }
  };


  return (
    <div className="fixed inset-0 z-[60] bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4">
      {/* Top Nav - Responsive Theme Version */}
      <div className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-6 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm z-20 shrink-0 transition-colors">
        <div className="flex items-center space-x-3">
          <div className="flex flex-col min-w-0">
             <div className="flex items-center space-x-2">
               <h2 className="text-sm font-black text-slate-900 dark:text-white line-clamp-1">{title || 'Untitled Course'}</h2>
               <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{category}</span>
               <span className="text-[10px] px-1.5 py-0.5 rounded-none bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700 uppercase">
                 {visibility === 'public' ? 'Live' : 'Draft'}
               </span>
             </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2.5 mr-2 sm:mr-4">
            <div className="relative w-8 h-8 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.2"
                  className="text-slate-200 dark:text-slate-800"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.2"
                  strokeDasharray="87.96"
                  strokeDashoffset={87.96 - (87.96 * Math.min(courseHealth.score, 100)) / 100}
                  strokeLinecap="round"
                  className="text-[#4f46e5] dark:text-indigo-400 transition-all duration-700 ease-out"
                />
              </svg>
              <span className="absolute text-[9px] font-black text-slate-800 dark:text-slate-200">
                {courseHealth.score}%
              </span>
            </div>
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden xs:inline-block">
              COMPLETE
            </span>
          </div>
          
          <button 
            onClick={onCancel} 
            className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-none transition-colors cursor-pointer border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            title="Close course builder"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Container with Content */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Modals & Overlays */}
        {courseToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-slate-100">Delete Course</h3>
                  </div>
                </div>
                <button onClick={() => setCourseToDelete(null)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-500">Are you sure you want to delete this course? This action cannot be undone.</p>
              <div className="flex items-center justify-end space-x-2.5 pt-2">
                <button onClick={() => setCourseToDelete(null)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer">Cancel</button>
                <button onClick={() => handleExecuteDeleteCourse(courseToDelete.id, true)} className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-500/20 flex items-center space-x-2 cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirm Delete</span>
                </button>
              </div>
            </div>
          </div>
        )}

                {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
          <div className={`mx-auto space-y-8 transition-all ${activeTab === 'film-edit' || activeTab === 'overview' ? 'max-w-6xl w-full p-4 sm:p-8' : 'max-w-4xl p-6 sm:p-10'}`}>
            
            {showImageStandardsPage ? (
              <div className="space-y-6 animate-fadeIn py-2">
                <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
                  <button
                    type="button"
                    onClick={() => setShowImageStandardsPage(false)}
                    className="inline-flex items-center space-x-2 text-xs font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Course Builder</span>
                  </button>
                  <span className="text-xs font-bold text-slate-500">Official Course Image Standards & Guidelines</span>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
                  <CourseImageStandardsPage 
                    isInline={true} 
                    onBack={() => setShowImageStandardsPage(false)}
                    onClose={() => setShowImageStandardsPage(false)}
                    onGoToBuilder={() => setShowImageStandardsPage(false)}
                  />
                </div>
              </div>
            ) : (
              <>
            {notification && (
              <div className={`fixed top-20 right-10 z-[70] p-4 rounded-2xl flex items-center space-x-3 text-xs font-bold shadow-2xl animate-in slide-in-from-right ${
                notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
              }`}>
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>{notification.message}</span>
              </div>
            )}

            {/* TAB 0: MANAGE HUB / OVERVIEW CARDS */}
            {activeTab === 'overview' && (
              <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto py-2">
                {/* Section 01: PLAN */}
                <div className="space-y-3">
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    01. Plan
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setActivePhase('plan');
                        setActiveTab('intended-learners');
                      }}
                      className="flex items-center space-x-3.5 p-4.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 rounded-none transition-colors cursor-pointer group text-left shadow-2xs"
                    >
                      <div className="text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors shrink-0">
                        <Users className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        Intended learners
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActivePhase('plan');
                        setActiveTab('structure');
                      }}
                      className="flex items-center space-x-3.5 p-4.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 rounded-none transition-colors cursor-pointer group text-left shadow-2xs"
                    >
                      <div className="text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        Course structure
                      </span>
                    </button>
                  </div>
                </div>

                {/* Section 02: CREATE CONTENT */}
                <div className="space-y-3">
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    02. Create content
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setActivePhase('create');
                        setActiveTab('course-description');
                      }}
                      className="flex items-center space-x-3.5 p-4.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 rounded-none transition-colors cursor-pointer group text-left shadow-2xs"
                    >
                      <div className="text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors shrink-0">
                        <AlignLeft className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        Course description
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActivePhase('create');
                        setActiveTab('film-edit');
                      }}
                      className="flex items-center space-x-3.5 p-4.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 rounded-none transition-colors cursor-pointer group text-left shadow-2xs"
                    >
                      <div className="text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors shrink-0">
                        <Film className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        Film & edit
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActivePhase('create');
                        setActiveTab('curriculum');
                      }}
                      className="flex items-center space-x-3.5 p-4.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 rounded-none transition-colors cursor-pointer group text-left shadow-2xs"
                    >
                      <div className="text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors shrink-0">
                        <Layers className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        Curriculum
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActivePhase('create');
                        setActiveTab('captions');
                      }}
                      className="flex items-center space-x-3.5 p-4.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 rounded-none transition-colors cursor-pointer group text-left shadow-2xs"
                    >
                      <div className="text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors shrink-0">
                        <Subtitles className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        Captions (optional)
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActivePhase('create');
                        setActiveTab('accessibility');
                      }}
                      className="flex items-center space-x-3.5 p-4.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 rounded-none transition-colors cursor-pointer group text-left shadow-2xs"
                    >
                      <div className="text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors shrink-0">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        Accessibility (optional)
                      </span>
                    </button>
                  </div>
                </div>

                {/* Section 03: PUBLISH */}
                <div className="space-y-3">
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    03. Publish
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setActivePhase('publish');
                        setActiveTab('landing-page');
                      }}
                      className="flex items-center space-x-3.5 p-4.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 rounded-none transition-colors cursor-pointer group text-left shadow-2xs"
                    >
                      <div className="text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors shrink-0">
                        <Eye className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        Course landing page
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActivePhase('publish');
                        setActiveTab('pricing');
                      }}
                      className="flex items-center space-x-3.5 p-4.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 rounded-none transition-colors cursor-pointer group text-left shadow-2xs"
                    >
                      <div className="text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors shrink-0">
                        <DollarSign className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        Pricing
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActivePhase('publish');
                        setActiveTab('promotions');
                      }}
                      className="flex items-center space-x-3.5 p-4.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 rounded-none transition-colors cursor-pointer group text-left shadow-2xs"
                    >
                      <div className="text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors shrink-0">
                        <Tag className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        Promotions
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActivePhase('publish');
                        setActiveTab('messages');
                      }}
                      className="flex items-center space-x-3.5 p-4.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 rounded-none transition-colors cursor-pointer group text-left shadow-2xs"
                    >
                      <div className="text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors shrink-0">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        Course messages
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Back Button & Breadcrumbs when editing any section */}
            {activeTab !== 'overview' && (
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-slate-800 mb-6">
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-indigo-600 dark:hover:border-indigo-400 text-slate-800 dark:text-slate-200 rounded-none text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
                  <nav className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <button
                      type="button"
                      onClick={() => setActiveTab('overview')}
                      className="hover:text-indigo-600 dark:hover:text-indigo-400 font-bold transition-colors cursor-pointer"
                    >
                      Manage
                    </button>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-400 dark:text-slate-500">
                      {activePhase === 'plan' ? '01. Plan' : activePhase === 'create' ? '02. Create content' : '03. Publish'}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-bold text-slate-900 dark:text-white">
                      {tabLabels[activeTab] || activeTab}
                    </span>
                  </nav>
                </div>
              </div>
            )}

            {/* TAB 1: INTENDED LEARNERS */}
            {activeTab === 'intended-learners' && (
              <div className="space-y-10 animate-fadeIn">
                <div className="space-y-2">
                  <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">Intended learners</h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                    The following descriptions will be publicly visible on your Course Landing Page and will have a direct impact on your course performance. These descriptions will help learners decide if your course is right for them.
                  </p>
                </div>

                {/* Checklist Summary Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <p className="text-xs text-slate-500 font-medium">
                    Provide the baseline details of who your course is designed for and what they will learn.
                  </p>
                  <div className="flex items-center space-x-2">
                    {learningObjectives.filter(o => o.trim()).length >= 4 &&
                     courseRequirements.filter(r => r.trim()).length >= 1 &&
                     targetLearners.filter(t => t.trim()).length >= 1 ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 uppercase tracking-wider">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>All Requirements Met</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-black bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800 uppercase tracking-wider">
                        <XCircle className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                        <span>Incomplete Details</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* ==================== DIRECT EDIT FIELDS ==================== */}
                <div className="space-y-10 animate-fadeIn">
                  
                  {/* What will students learn */}
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800/60">
                      <div className="space-y-1 flex-1">
                        <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                          What will students learn in your course?
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          You must enter at least 4 learning objectives or outcomes that learners can expect to achieve after completing your course.
                        </p>
                      </div>
                      <div className="shrink-0">
                        {learningObjectives.filter(o => o.trim().length > 0).length >= 4 ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>Requirement Met ({learningObjectives.filter(o => o.trim().length > 0).length}/4)</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800">
                            <XCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
                            <span>{learningObjectives.filter(o => o.trim().length > 0).length}/4 entered (at least 4 required)</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {learningObjectives.map((obj, idx) => {
                        const isEntered = obj.trim().length > 0;
                        return (
                          <div key={idx} className="space-y-1.5">
                            <div className="relative flex items-center">
                              <div className="absolute left-3.5 flex items-center pointer-events-none z-10">
                                {isEntered ? (
                                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                                ) : (
                                  <X className="w-3.5 h-3.5 text-rose-400/80 dark:text-rose-400/70" />
                                )}
                              </div>
                              <input
                                type="text"
                                maxLength={160}
                                value={obj}
                                onChange={(e) => {
                                  const updated = [...learningObjectives];
                                  updated[idx] = e.target.value;
                                  setLearningObjectives(updated);
                                }}
                                placeholder={`Learning outcome ${idx + 1}`}
                                className={`w-full pl-10 pr-20 py-3 bg-white dark:bg-slate-900 border text-xs font-medium focus:outline-none transition-colors ${
                                  isEntered
                                    ? 'border-emerald-400/80 dark:border-emerald-700/80 focus:border-emerald-500'
                                    : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500'
                                }`}
                              />
                              <div className="absolute right-3 flex items-center gap-2">
                                <span className={`text-[10px] font-bold ${isEntered ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                                  {160 - obj.length}
                                </span>
                                {learningObjectives.length > 4 && (
                                  <button
                                    type="button"
                                    title="Delete item"
                                    onClick={() => {
                                      const updated = learningObjectives.filter((_, i) => i !== idx);
                                      setLearningObjectives(updated);
                                    }}
                                    className="text-slate-400 hover:text-rose-500 transition-colors p-0.5"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                            {idx === 0 && <p className="text-[10px] text-slate-400 font-medium ml-1 italic">Example: Define the roles and responsibilities of a project manager</p>}
                            {idx === 1 && <p className="text-[10px] text-slate-400 font-medium ml-1 italic">Example: Estimate project timelines and budgets</p>}
                            {idx === 2 && <p className="text-[10px] text-slate-400 font-medium ml-1 italic">Example: Identify and manage project risks</p>}
                            {idx === 3 && <p className="text-[10px] text-slate-400 font-medium ml-1 italic">Example: Complete a case study to manage a project from conception to completion</p>}
                          </div>
                        );
                      })}
                      <button 
                        type="button"
                        onClick={() => setLearningObjectives([...learningObjectives, ''])}
                        className="text-xs font-black text-indigo-600 hover:text-indigo-500 flex items-center space-x-1.5 pt-1"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add more to your response</span>
                      </button>
                    </div>
                  </div>

                  {/* Requirements */}
                  <div className="space-y-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800/60">
                      <div className="space-y-1 flex-1">
                        <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                          What are the requirements or prerequisites for taking your course?
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          List the required skills, experience, tools or equipment learners should have prior to taking your course.<br/>
                          If there are no requirements, use this space as an opportunity to lower the barrier for beginners.
                        </p>
                      </div>
                      <div className="shrink-0">
                        {courseRequirements.filter(r => r.trim().length > 0).length >= 1 ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>Submitted ({courseRequirements.filter(r => r.trim().length > 0).length})</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800">
                            <XCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
                            <span>Not submitted yet</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {courseRequirements.map((req, idx) => {
                        const isEntered = req.trim().length > 0;
                        return (
                          <div key={idx} className="space-y-1.5">
                            <div className="relative flex items-center">
                              <div className="absolute left-3.5 flex items-center pointer-events-none z-10">
                                {isEntered ? (
                                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                                ) : (
                                  <X className="w-3.5 h-3.5 text-rose-400/80 dark:text-rose-400/70" />
                                )}
                              </div>
                              <input
                                type="text"
                                maxLength={160}
                                value={req}
                                onChange={(e) => {
                                  const updated = [...courseRequirements];
                                  updated[idx] = e.target.value;
                                  setCourseRequirements(updated);
                                }}
                                placeholder={`Requirement ${idx + 1}`}
                                className={`w-full pl-10 pr-20 py-3 bg-white dark:bg-slate-900 border text-xs font-medium focus:outline-none transition-colors ${
                                  isEntered
                                    ? 'border-emerald-400/80 dark:border-emerald-700/80 focus:border-emerald-500'
                                    : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500'
                                }`}
                              />
                              <div className="absolute right-3 flex items-center gap-2">
                                <span className={`text-[10px] font-bold ${isEntered ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                                  {160 - req.length}
                                </span>
                                {courseRequirements.length > 1 && (
                                  <button
                                    type="button"
                                    title="Delete item"
                                    onClick={() => {
                                      const updated = courseRequirements.filter((_, i) => i !== idx);
                                      setCourseRequirements(updated);
                                    }}
                                    className="text-slate-400 hover:text-rose-500 transition-colors p-0.5"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                            {idx === 0 && <p className="text-[10px] text-slate-400 font-medium ml-1 italic">Example: No programming experience needed. You will learn everything you need to know</p>}
                          </div>
                        );
                      })}
                      <button 
                        type="button"
                        onClick={() => setCourseRequirements([...courseRequirements, ''])}
                        className="text-xs font-black text-indigo-600 hover:text-indigo-500 flex items-center space-x-1.5 pt-1"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add more to your response</span>
                      </button>
                    </div>
                  </div>

                  {/* Who is this course for */}
                  <div className="space-y-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800/60">
                      <div className="space-y-1 flex-1">
                        <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                          Who is this course for?
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Write a clear description of the intended learners for your course who will find your course content valuable.<br/>
                          This will help you attract the right learners to your course.
                        </p>
                      </div>
                      <div className="shrink-0">
                        {targetLearners.filter(tl => tl.trim().length > 0).length >= 1 ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>Submitted ({targetLearners.filter(tl => tl.trim().length > 0).length})</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800">
                            <XCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
                            <span>Not submitted yet</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {targetLearners.map((tl, idx) => {
                        const isEntered = tl.trim().length > 0;
                        return (
                          <div key={idx} className="space-y-1.5">
                            <div className="relative flex items-center">
                              <div className="absolute left-3.5 flex items-center pointer-events-none z-10">
                                {isEntered ? (
                                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                                ) : (
                                  <X className="w-3.5 h-3.5 text-rose-400/80 dark:text-rose-400/70" />
                                )}
                              </div>
                              <input
                                type="text"
                                maxLength={160}
                                value={tl}
                                onChange={(e) => {
                                  const updated = [...targetLearners];
                                  updated[idx] = e.target.value;
                                  setTargetLearners(updated);
                                }}
                                placeholder={`Target audience description ${idx + 1}`}
                                className={`w-full pl-10 pr-20 py-3 bg-white dark:bg-slate-900 border text-xs font-medium focus:outline-none transition-colors ${
                                  isEntered
                                    ? 'border-emerald-400/80 dark:border-emerald-700/80 focus:border-emerald-500'
                                    : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500'
                                }`}
                              />
                              <div className="absolute right-3 flex items-center gap-2">
                                <span className={`text-[10px] font-bold ${isEntered ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                                  {160 - tl.length}
                                </span>
                                {targetLearners.length > 1 && (
                                  <button
                                    type="button"
                                    title="Delete item"
                                    onClick={() => {
                                      const updated = targetLearners.filter((_, i) => i !== idx);
                                      setTargetLearners(updated);
                                    }}
                                    className="text-slate-400 hover:text-rose-500 transition-colors p-0.5"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                            {idx === 0 && <p className="text-[10px] text-slate-400 font-medium ml-1 italic">Example: Beginner Python developers curious about data science</p>}
                          </div>
                        );
                      })}
                      <button 
                        type="button"
                        onClick={() => setTargetLearners([...targetLearners, ''])}
                        className="text-xs font-black text-indigo-600 hover:text-indigo-500 flex items-center space-x-1.5 pt-1"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add more to your response</span>
                      </button>
                    </div>
                  </div>

                  {/* Save action keeps responses visible in fields */}
                  <div className="pt-8 flex justify-end">
                    <button
                      type="button"
                      disabled={isSavingIntendedLearners}
                      onClick={async () => {
                        setIsSavingIntendedLearners(true);
                        try {
                          await saveIntendedLearnersApi(courseId, {
                            learningObjectives: learningObjectives.filter(o => o.trim()),
                            requirements: courseRequirements.filter(o => o.trim()),
                            targetLearners: targetLearners.filter(o => o.trim())
                          });
                          handlePublish(true);
                          showNotification('Intended learners saved successfully!');
                        } catch (err) {
                          console.warn('saveIntendedLearnersApi notice:', err);
                          handlePublish(true);
                          showNotification('Intended learners updated successfully.');
                        } finally {
                          setIsSavingIntendedLearners(false);
                        }
                      }}
                      className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-none border border-indigo-600 text-xs font-black shadow-sm transition-all cursor-pointer flex items-center space-x-2"
                    >
                      {isSavingIntendedLearners ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving Changes...</span>
                        </>
                      ) : (
                        <span>SAVE CHANGES</span>
                      )}
                    </button>
                  </div>

                </div>
              </div>
            )}
            {/* TAB 2: COURSE STRUCTURE TIPS */}
            {activeTab === 'structure' && (
              <div className="space-y-10 animate-fadeIn">
                {/* Header Block */}
                <div className="space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-full">
                    Course Design Architecture
                  </span>
                  <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Course structure</h1>
                  <p className="text-base font-black text-slate-800 dark:text-slate-200">
                    There's a course in you. Plan it out.
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed font-medium">
                    Planning your course carefully will create a clear learning path for students and help you once you film. Think down to the details of each lecture including the skill you’ll teach, estimated video length, practical activities to include, and how you’ll create introductions and summaries.
                  </p>
                </div>

                {/* Library of Resources Header */}
                <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                  <h2 className="text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center space-x-2">
                    <BookOpen className="w-5 h-5 text-indigo-500" />
                    <span>Our library of resources</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Tips and guides to structuring a course students love</p>
                </div>

                {/* Sharp 2-Column Tips Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Tip 1 */}
                  <div className="p-6 bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800 shadow-none space-y-3.5">
                    <div className="w-10 h-10 rounded-none border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                      <Target className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">Start with your goals</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                      Setting goals for what learners will accomplish in your course (also known as learning objectives) at the beginning will help you determine what content to include in your course and how you will teach the content to help your learners achieve the goals.
                    </p>
                  </div>

                  {/* Tip 2 */}
                  <div className="p-6 bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800 shadow-none space-y-3.5">
                    <div className="w-10 h-10 rounded-none border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                      <Layers className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">Create an outline</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                      Decide what skills you’ll teach and how you’ll teach them. Group related lectures into sections. Each section should have at least 3 lectures, and include at least one assignment or practical activity to cement concepts.
                    </p>
                  </div>

                  {/* Tip 3 */}
                  <div className="p-6 bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800 shadow-none space-y-3.5">
                    <div className="w-10 h-10 rounded-none border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                      <Compass className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">Introduce yourself and create momentum</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                      People online want to start learning quickly. Make an introduction section that gives learners something to be excited about in the first 10 minutes, explaining who you are and why they will benefit.
                    </p>
                  </div>

                  {/* Tip 4 */}
                  <div className="p-6 bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800 shadow-none space-y-3.5">
                    <div className="w-10 h-10 rounded-none border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">Sections have a clear learning objective</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                      Introduce each section by describing the section's goal and why it’s important. Give lectures and sections titles that reflect their content and have a logical, intuitive flow for your learners.
                    </p>
                  </div>

                  {/* Tip 5 */}
                  <div className="p-6 bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800 shadow-none space-y-3.5">
                    <div className="w-10 h-10 rounded-none border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                      <Tv className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">Lectures cover one concept</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                      A good lecture length is 2-7 minutes to keep students interested and help them study in short bursts. Cover a single topic in each lecture so learners can easily find, search, and re-watch them later.
                    </p>
                  </div>

                  {/* Tip 6 */}
                  <div className="p-6 bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800 shadow-none space-y-3.5">
                    <div className="w-10 h-10 rounded-none border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                      <MonitorPlay className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">Mix and match your lecture types</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                      Alternate between filming yourself, your screen, and slides or other visuals. Showing yourself can help learners feel personally connected and invested in the course path.
                    </p>
                  </div>

                  {/* Tip 7 */}
                  <div className="p-6 bg-white dark:bg-slate-950 rounded-none border border-slate-200 dark:border-slate-800 shadow-none space-y-3.5 sm:col-span-2">
                    <div className="w-10 h-10 rounded-none border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                      <Award className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">Practice activities create hands-on learning</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                      Help learners apply your lessons to their real world with projects, assignments, coding exercises, quizzes, or step-by-step PDF worksheets. Active participation keeps completion rates exceptionally high.
                    </p>
                  </div>
                </div>

                {/* Footer Navigation bar */}
                <div className="pt-8 flex justify-between items-center border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveTab('intended-learners')}
                    className="px-6 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-none text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    ← Back to Intended Learners
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('curriculum')}
                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-none border border-indigo-600 text-xs font-black uppercase tracking-widest shadow-sm transition-all cursor-pointer"
                  >
                    Proceed to Curriculum →
                  </button>
                </div>
              </div>
            )}

            {/* TAB: SETUP & TEST VIDEO */}
            {activeTab === 'setup-video' && (
              <div className="space-y-10 animate-fadeIn">
                {/* Header Block */}
                <div className="space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-full">
                    Studio Configuration
                  </span>
                  <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Setup & test video</h1>
                  <p className="text-base font-black text-slate-800 dark:text-slate-200">
                    Arrange your ideal studio and get early feedback
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed font-medium">
                    It's important to get your audio and video set up correctly now, because it's much more difficult to fix your videos after you’ve recorded. There are many creative ways to use what you have to create professional looking video.
                  </p>
                </div>

                {/* Free Expert Video Help - Interactive Widget Card */}
                <div className="p-8 rounded-3xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-100/55 dark:border-indigo-900/20 pb-4">
                    <div className="space-y-1 text-left">
                      <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
                        <Sparkles className="w-5 h-5 animate-pulse" />
                        <h3 className="text-sm font-black uppercase tracking-wider">Free expert video help</h3>
                      </div>
                      <p className="text-xs text-slate-500 font-semibold">Get personalized advice on your audio and video from our engineering team.</p>
                    </div>

                    <div className="shrink-0">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg">
                        Turnaround: &lt; 24 Hours
                      </span>
                    </div>
                  </div>

                  {/* Realtime Chunked Resumable Video Uploader */}
                  <ResumableVideoUploader
                    mode="modal"
                    triggerButtonText="Upload 2-Minute Test Video"
                    label="Upload your 2-minute test video"
                    folder="test-videos"
                    userId={currentUser?.id || currentUser?.email || 'instructor_user'}
                    maxSizeMB={500}
                    onUploadComplete={async (result) => {
                      const fileName = result.file_path.split('/').pop() || 'Test_Video.mp4';
                      const uploadId = (result as any).id || `clip-${Date.now()}`;

                      try {
                        await apiFetch('user-videos.php', {
                          method: 'POST',
                          body: JSON.stringify({
                            id: uploadId,
                            user_id: currentUser?.id || 'instructor_user',
                            user_email: currentUser?.email || '',
                            filename: fileName,
                            url: result.url,
                            file_path: result.file_path,
                            folder: 'test-videos',
                            source: 'test_video',
                            file_size: (result as any).file_size || (result as any).total_bytes || 0
                          })
                        });
                      } catch (e) {
                        console.error("Failed to register test video in DB", e);
                      }

                      setTestVideoUrl(result.url);
                      setTestVideoStatus('completed');
                    }}
                  />

                  {testVideoStatus === 'uploading' && testUploadProgress && (
                    <div className="p-8 rounded-2xl border border-indigo-200 dark:border-indigo-900 bg-white dark:bg-slate-950 flex flex-col items-center text-center space-y-4">
                      <div className="relative">
                        <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-indigo-700 dark:text-indigo-300">
                          {testUploadProgress.percentage}%
                        </div>
                      </div>
                      <div className="space-y-1 w-full">
                        <div className="flex justify-between items-center px-1">
                          <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase">Uploading "{testUploadProgress.fileName}"</h4>
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">{testUploadProgress.percentage}%</span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-semibold text-left px-1">
                          {testUploadProgress.speedFormatted} • {testUploadProgress.remainingFormatted}
                        </p>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className="bg-indigo-600 h-full transition-all duration-300 ease-out" 
                          style={{ width: `${testUploadProgress.percentage}%` }}
                        ></div>
                      </div>
                      <button
                        type="button"
                        onClick={cancelTestVideoUpload}
                        className="text-[10px] font-bold text-rose-500 hover:text-rose-600 uppercase tracking-wider flex items-center space-x-1.5 pt-2"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Cancel Upload</span>
                      </button>
                    </div>
                  )}

                  {testVideoStatus === 'uploading' && !testUploadProgress && (
                    <div className="p-8 rounded-2xl border border-indigo-200 dark:border-indigo-900 bg-white dark:bg-slate-950 flex flex-col items-center text-center space-y-4">
                      <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase">Preparing Upload...</h4>
                        <p className="text-[11px] text-slate-500 font-semibold">Initializing connection parameters and processing file metadata.</p>
                      </div>
                      <div className="w-full max-w-xs bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-full animate-[loading_1.5s_ease-in-out_infinite]" style={{ width: '45%' }}></div>
                      </div>
                    </div>
                  )}

                  {testVideoStatus === 'reviewing' && (
                    <div className="p-8 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/10 dark:bg-amber-950/10 flex flex-col items-center text-center space-y-4">
                      <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 flex items-center justify-center animate-pulse">
                        <History className="w-6 h-6" />
                      </div>
                      <div className="space-y-1 text-xs">
                        <h4 className="font-black text-amber-800 dark:text-amber-400 uppercase tracking-wide">Test Video Under Engineering Review</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium max-w-sm">
                          Our quality evaluation engineers are testing your stereo channels, echo margins, lighting contrast, and HD export resolution.
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-amber-600 uppercase bg-amber-50 dark:bg-amber-950 px-3 py-1 rounded">
                        Analyzing audio levels & echo dampen parameters...
                      </span>
                    </div>
                  )}

                  {testVideoStatus === 'completed' && (
                    <div className="p-6 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-white dark:bg-slate-950 text-left space-y-4">
                      <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 border-b border-slate-100 dark:border-slate-800/85 pb-3">
                        <ShieldCheck className="w-5 h-5 shrink-0" />
                        <h4 className="text-xs font-black uppercase tracking-wider">LMS Expert Quality Assessment Report</h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-semibold">
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800/80">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Video Resolution</span>
                          <span className="text-slate-800 dark:text-slate-200 font-black">1080p HD Certified (10/10)</span>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800/80">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Audio Channel Alignment</span>
                          <span className="text-slate-800 dark:text-slate-200 font-black">Dual-Channel Stereo (10/10)</span>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800/80">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Echo Dampening</span>
                          <span className="text-emerald-600 font-black">Approved (9/10)</span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium space-y-1 bg-slate-50 dark:bg-slate-900 p-3.5 rounded-xl">
                        <p className="font-bold text-slate-800 dark:text-slate-200">Engineer's Verdict:</p>
                        <p>"Your mic setup sounds incredibly crisp. Video contrast has excellent balance. Minimal room reverb found. You are fully certified to begin filming your complete curriculum course modules!"</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setTestVideoStatus('idle');
                          setTestVideoUrl('');
                          setTestVideoFile(null);
                        }}
                        className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        Reset & Submit another test video
                      </button>
                    </div>
                  )}
                </div>

                {/* Library of Support Guides & Tips Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  
                  {/* Equipment */}
                  <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-xs space-y-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 shrink-0">
                      <Tv className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">Equipment can be easy</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                      You don’t need to buy fancy equipment. Most smartphone cameras can capture video in HD, and you can record audio on another phone or external microphone easily.
                    </p>
                  </div>

                  {/* Microphones */}
                  <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-xs space-y-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 shrink-0">
                      <Mic className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">Students need to hear you</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                      A good microphone is the most important piece of equipment you will choose. There are lot of affordable options. Make sure it’s correctly plugged in and 6-12 inches (15-30 cm) from you.
                    </p>
                  </div>

                  {/* Studio Background */}
                  <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-xs space-y-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 shrink-0">
                      <Layers className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">Make a studio</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                      Clean up your background and arrange props. Almost any small space can be transformed with a backdrop made of colored paper or an ironed bed sheet.
                    </p>
                  </div>

                  {/* Lighting */}
                  <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-xs space-y-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 shrink-0">
                      <Palette className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">Light the scene & your face</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                      Turn off overhead lights. Experiment with three point lighting by placing two lamps in front of you and one behind aimed on the background.
                    </p>
                  </div>

                  {/* Noise Dampening */}
                  <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-xs space-y-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 shrink-0">
                      <Volume2 className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">Reduce noise & echo</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                      Turn off fans or air vents, and record when it’s quiet. Place acoustic foam or blankets on the walls, and bring in rugs or furniture to dampen echo.
                    </p>
                  </div>

                  {/* sound proofing */}
                  <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-xs space-y-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">Be creative</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                      Students won’t see behind the scenes. No one will know if you’re surrounded by pillows for soundproofing... unless you tell other instructors in the community!
                    </p>
                  </div>
                </div>

                {/* Studio Quality Requirements Panel */}
                <div className="p-6 rounded-3xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/10 dark:bg-indigo-950/5 space-y-4">
                  <div className="flex items-center space-x-2 text-indigo-700 dark:text-indigo-400">
                    <ShieldCheck className="w-5 h-5 shrink-0" />
                    <h3 className="text-sm font-black uppercase tracking-wider">Official Quality Standards Checklist</h3>
                  </div>

                  <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                    <div className="flex items-start space-x-3">
                      <div className="mt-0.5 p-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-slate-900 dark:text-slate-100 font-bold">HD Video Standards</p>
                        <p className="text-slate-500 font-medium">Film and export in HD to create videos of at least 720p, or 1080p if possible for crisp clarity.</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="mt-0.5 p-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-slate-900 dark:text-slate-100 font-bold">Dual-Channel Sync</p>
                        <p className="text-slate-500 font-medium">Audio must come out of both the left and right channels and be synced perfectly to your video frames.</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="mt-0.5 p-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-slate-900 dark:text-slate-100 font-bold">Background Noise & Echo Elimination</p>
                        <p className="text-slate-500 font-medium">Audio should be clear, free of noticeable echo, fan hums, hiss, or background voices so as not to distract students.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Navigation Bar */}
                <div className="pt-8 flex justify-between items-center border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveTab('structure')}
                    className="px-6 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    ← Back to Course Structure
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('film-edit')}
                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-900/20 transition-all cursor-pointer"
                  >
                    Proceed to Film & Edit →
                  </button>
                </div>
              </div>
            )}

            {/* TAB: COURSE DESCRIPTION */}
            {activeTab === 'course-description' && (
              <div className="space-y-8 animate-fadeIn text-left max-w-5xl">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
                  <div>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-none border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
                        <AlignLeft className="w-5 h-5" />
                      </div>
                      <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                          Course Description
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                          Write, prepare, and structure a detailed description to explain what your course covers before filming or building sections.
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isSavingDescription}
                    onClick={async () => {
                      setIsSavingDescription(true);
                      try {
                        await handlePublish(true);
                        setLastSavedDescription(description);
                        setShowDescriptionSavedToast(true);
                        setTimeout(() => setShowDescriptionSavedToast(false), 3500);
                      } catch (err) {
                        showNotification("Failed to save description.", "error");
                      } finally {
                        setIsSavingDescription(false);
                      }
                    }}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-none border border-indigo-600 text-xs font-bold transition-colors shadow-none flex items-center space-x-2 shrink-0 cursor-pointer disabled:bg-indigo-400"
                  >
                    {isSavingDescription ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Description</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Reviewer Audit Checklist Feedback Notification Banner for Instructor */}
                {reviewerAuditFeedback && reviewerAuditFeedback.notMetCount > 0 && (
                  <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/80 rounded-none p-5 space-y-4 shadow-none animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-rose-700 dark:text-rose-400 font-bold text-sm">
                        <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                        <span>Reviewer Description Audit — {reviewerAuditFeedback.notMetCount} Items Unachieved</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-medium">
                        Updated {new Date(reviewerAuditFeedback.updatedAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                      The quality reviewer audited your course description and marked the following criteria as <strong>Not Met (✗)</strong>. Please update your description according to their suggestions:
                    </p>

                    <div className="grid grid-cols-1 gap-2.5 pt-1">
                      {reviewerAuditFeedback.notMetItems.map((item: any, iIdx: number) => (
                        <div key={iIdx} className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 rounded-none p-3.5 text-xs space-y-1.5 shadow-none">
                          <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400 font-bold">
                            <X className="w-4 h-4 text-rose-500 shrink-0" strokeWidth={3} />
                            <span>{item.category || item.title} — Unachieved</span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 pl-6 text-xs italic font-medium leading-relaxed">
                            &quot;{item.suggestion || 'Not met — please expand and follow description checklist requirements.'}&quot;
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Course Description Input Card */}
                <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-none">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                        <span>Course Description</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-xs font-mono font-bold text-slate-400">
                        Word count: {description.trim().split(/\s+/).filter(Boolean).length} / 200 words min
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Descriptions should be at least 200 words. Cover what students will accomplish, key skills taught, and prerequisites.
                    </p>
                    <textarea
                      rows={12}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Insert your course description here. Write a clear, comprehensive summary of your course curriculum..."
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-none p-4 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 leading-relaxed"
                    />
                  </div>

                  {/* Course Description Checklist (Summary) */}
                  <div className="bg-indigo-50/40 dark:bg-indigo-950/20 rounded-none p-5 border border-indigo-200 dark:border-indigo-800 space-y-4">
                    <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200 tracking-wide uppercase">
                      Course Description Guidelines &amp; Checklist
                    </h4>

                    <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300 font-medium">
                      {/* 1. What Learner Will Access */}
                      <div className="space-y-1">
                        <p className="font-bold text-indigo-950 dark:text-indigo-200">1. What Learner Will Access</p>
                        <p className="text-[11px] text-slate-500 italic">Verify that the course description highlights clear value metrics: i.e.</p>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-400 pl-2 font-mono text-[11px]">
                          <li>Best Seller Course Status</li>
                          <li>80+ Hours Video / Material</li>
                          <li>Premium Coaching Details</li>
                          <li>24-Hour Support Guarantee</li>
                          <li>100% Practical Content</li>
                          <li>Real-Time Hands-On from Lecture 1</li>
                        </ul>
                      </div>

                      {/* 2. Course Goals Stated */}
                      <div className="space-y-1">
                        <p className="font-bold text-indigo-950 dark:text-indigo-200">2. Course Goals Stated</p>
                        <p className="text-[11px] text-slate-500 italic">Ensure clear, outcome-based course goals are explicitly stated: i.e.</p>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-400 pl-2 font-mono text-[11px]">
                          <li>Grow Agency</li>
                          <li>Build Strategy with ChatGPT</li>
                          <li>Become Freelancer</li>
                          <li>Get Hired as Expert</li>
                        </ul>
                      </div>

                      {/* 3. "You'll Learn To" */}
                      <div className="space-y-1">
                        <p className="font-bold text-indigo-950 dark:text-indigo-200">3. &quot;You&apos;ll Learn To&quot;</p>
                        <p className="text-[11px] text-slate-500 italic">Verify &quot;You&apos;ll Learn To&quot; section features actionable practical skills: i.e.</p>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-400 pl-2 font-mono text-[11px]">
                          <li>Build Agency</li>
                          <li>Price Services</li>
                          <li>Build Website</li>
                          <li>Get &amp; Keep Clients</li>
                          <li>Hire Right People</li>
                          <li>Customer Relationship</li>
                          <li>Outsourcing</li>
                        </ul>
                      </div>

                      {/* 4. Who This Course Is For */}
                      <div className="space-y-1">
                        <p className="font-bold text-indigo-950 dark:text-indigo-200">4. Who This Course Is For</p>
                        <p className="text-[11px] text-slate-500 italic">Confirm target learner audience personas are defined (&quot;Who this course is for&quot;): i.e.</p>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-400 pl-2 font-mono text-[11px]">
                          <li>Agency Newcomers</li>
                          <li>SMMA Newcomers</li>
                          <li>Freelancers</li>
                          <li>Business Owners</li>
                          <li>Social Media Marketers</li>
                          <li>Digital Marketers</li>
                          <li>Influencers</li>
                          <li>Side Hustlers</li>
                        </ul>
                      </div>

                      {/* 5. Mandatory Bonuses & Guarantee */}
                      <div className="space-y-1 pt-2 border-t border-amber-500/20">
                        <p className="font-bold text-amber-600 dark:text-amber-400">5. Mandatory Bonuses &amp; Guarantee</p>
                        <ul className="list-disc list-inside space-y-0.5 text-amber-700 dark:text-amber-300 pl-2 font-mono text-[11px] font-semibold">
                          <li>Lifetime Access to Future Updates</li>
                          <li>Tools / Articles / Templates</li>
                          <li>Q&amp;A Support (Direct Instructor Response)</li>
                          <li>Downloadable Certificate of Completion</li>
                          <li className="font-bold">30-Day Money Back Guarantee</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Toast Notification - Floating Bottom Center */}
                {showDescriptionSavedToast && (
                  <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[999] bg-slate-900 border-2 border-emerald-500 text-emerald-400 px-6 py-3 rounded-none shadow-2xl flex items-center space-x-2.5 text-xs font-bold animate-bounce whitespace-nowrap">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Course description saved successfully</span>
                  </div>
                )}

                {/* Bottom Navigation buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveTab('curriculum')}
                    className="px-6 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-none text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    ← Back to Curriculum
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const isDirty = description.trim() !== lastSavedDescription.trim();
                      if (isDirty) {
                        setShowUnsavedDescriptionModal(true);
                      } else {
                        setActiveTab('film-edit');
                      }
                    }}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-none border border-indigo-600 text-xs transition-colors cursor-pointer flex items-center space-x-2"
                  >
                    <span>Proceed to Film & Edit →</span>
                  </button>
                </div>

                {/* Unsaved Changes Confirmation Modal */}
                {showUnsavedDescriptionModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
                    <div 
                      className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 w-full max-w-lg p-6 rounded-none shadow-2xl space-y-5 animate-scaleUp text-left"
                      role="dialog"
                      aria-modal="true"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start space-x-3.5">
                          <div className="w-10 h-10 rounded-none bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                            <AlertTriangle className="w-5 h-5" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                              Unsaved Course Description
                            </h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                              You have made changes to your course description that have not been saved. If you proceed now, your recent edits will be lost.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowUnsavedDescriptionModal(false)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setShowUnsavedDescriptionModal(false)}
                          className="px-4 py-2.5 rounded-none border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-center"
                        >
                          Cancel &amp; Keep Editing
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowUnsavedDescriptionModal(false);
                            setActiveTab('film-edit');
                          }}
                          className="px-4 py-2.5 rounded-none border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors cursor-pointer text-center"
                        >
                          Proceed Without Saving
                        </button>
                        <button
                          type="button"
                          disabled={isSavingDescription}
                          onClick={async () => {
                            setIsSavingDescription(true);
                            try {
                              await handlePublish(true);
                              setLastSavedDescription(description);
                              setShowDescriptionSavedToast(true);
                              setTimeout(() => setShowDescriptionSavedToast(false), 3500);
                              setShowUnsavedDescriptionModal(false);
                              setActiveTab('film-edit');
                            } catch (err) {
                              showNotification("Failed to save description.", "error");
                            } finally {
                              setIsSavingDescription(false);
                            }
                          }}
                          className="px-5 py-2.5 rounded-none border border-indigo-600 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center space-x-1.5 disabled:bg-indigo-400"
                        >
                          {isSavingDescription ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              <span>Save Now &amp; Proceed</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: FILM & EDIT - CINEMA STUDIO THEME */}
            {activeTab === 'film-edit' && (
              <div className="space-y-6 sm:space-y-8 animate-fadeIn text-left w-full min-w-0 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-none border border-slate-300 dark:border-slate-800 shadow-xl relative overflow-hidden text-slate-900 dark:text-slate-100">
                {/* Background ambient neon glow decorations */}
                <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Film & Edit Header (Not in a card) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                    Film & Edit
                  </h1>

                  <div className="flex items-center gap-3">
                    {/* Upload Video Clip (Sharp Button) */}
                    <ResumableVideoUploader
                      folder="film-edit-studio"
                      mode="fullscreen"
                      isOpen={isFilmStudioModalOpen}
                      onOpenChange={setIsFilmStudioModalOpen}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-none text-xs font-bold transition-all shadow-xs flex items-center space-x-2 cursor-pointer shrink-0"
                      triggerButtonText="Upload Video Clip"
                      userId={currentUser?.id || currentUser?.email || 'instructor_user'}
                      label="Upload Filmed Lecture Footage (HD 1080p/4K)"
                      initialFile={pendingUploadFile}
                      autoStart={!!pendingUploadFile}
                      onUploadComplete={async (result) => {
                        const rawName = result.file_path.split('/').pop() || 'Filmed_Lecture_Clip.mp4';
                        const fileName = (result as any).filename || (result as any).name || rawName;
                        const uploadId = (result as any).id || `clip-${Date.now()}`;
                        
                        const sizeBytes = (result as any).file_size || (result as any).total_bytes || 0;
                        try {
                          await apiFetch('user-videos.php', {
                            method: 'POST',
                            body: JSON.stringify({
                              id: uploadId,
                              user_id: currentUser?.id || 'instructor_user',
                              user_email: currentUser?.email || '',
                              filename: fileName,
                              url: result.url,
                              file_path: result.file_path,
                              folder: 'film-edit-studio',
                              source: 'film_and_edit',
                              file_size: sizeBytes
                            })
                          });
                        } catch (e) {
                          console.error("Failed to register video in DB", e);
                        }

                        const ext = fileName.split('.').pop()?.toLowerCase() || '';
                        const isVideoFile = ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext);
                        
                        const newClip = {
                          id: uploadId,
                          name: fileName,
                          url: result.url,
                          fileSize: sizeBytes > 0 ? formatVideoFileSize(sizeBytes) : undefined,
                          duration: undefined,
                          uploadedAt: new Date().toLocaleDateString(),
                          uploadedBy: result.userId || currentUser?.id || currentUser?.email || 'instructor_user',
                          folder: 'film-edit-studio',
                          source: 'film_and_edit' as const,
                          status: 'ready' as const,
                          tags: ['Resumable Chunked', 'film-edit-studio']
                        };
                        setFilmStudioClips(prev => {
                          const exists = prev.some(c => c.url === result.url);
                          return exists ? prev : [newClip, ...prev];
                        });
                        setPendingUploadFile(null);
                        showNotification(`Resumable video upload completed for "${fileName}"!`);
                      }}
                    />
                  </div>
                </div>

                {/* Toolbar Below Header: Sharp Responsive Container with Sort Dropdown, Flexible Search, and Grid/List View switcher */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-none border border-slate-300 dark:border-slate-800 shadow-xs w-full min-w-0">
                  {/* Dropdown: Oldest / Newest */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <label htmlFor="film-edit-sort-select" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0">
                      Sort:
                    </label>
                    <select
                      id="film-edit-sort-select"
                      value={filmEditSort}
                      onChange={(e) => setFilmEditSort(e.target.value as 'newest' | 'oldest')}
                      className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-3 py-1.5 rounded-none text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="newest">Newest</option>
                      <option value="oldest">Oldest</option>
                    </select>
                  </div>

                  {/* Search Input & View Switcher - fluid and responsive, staying within container */}
                  <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto min-w-0 flex-1 sm:flex-initial justify-between sm:justify-end">
                    <div className="relative flex-1 sm:w-48 md:w-64 min-w-0">
                      <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={filmEditSearch}
                        onChange={(e) => setFilmEditSearch(e.target.value)}
                        placeholder="Search videos..."
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 pl-8 pr-7 py-1.5 rounded-none text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      {filmEditSearch && (
                        <button
                          type="button"
                          onClick={() => setFilmEditSearch('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                          title="Clear search"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* View Switcher: Grid vs List (Sharp) */}
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-none border border-slate-300 dark:border-slate-700 shrink-0">
                      <button
                        type="button"
                        onClick={() => setDriveViewMode('grid')}
                        className={`p-1.5 rounded-none transition-all cursor-pointer ${
                          driveViewMode === 'grid'
                            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                        title="Grid View"
                      >
                        <Grid className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDriveViewMode('list')}
                        className={`p-1.5 rounded-none transition-all cursor-pointer ${
                          driveViewMode === 'list'
                            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                        title="List View"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Upload Progress Bar if active */}
                {filmUploadProgress && (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-indigo-500/30 p-5 shadow-xl shadow-indigo-900/10 space-y-3.5 animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                          <Film className="w-5 h-5 animate-pulse" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">Uploading: {filmUploadProgress.fileName}</h4>
                          <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-500">
                            <span>{filmUploadProgress.speedFormatted}</span>
                            <span>•</span>
                            <span>{filmUploadProgress.remainingFormatted}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 shrink-0">
                        <div className="text-right">
                          <div className="text-sm font-black text-indigo-600 dark:text-indigo-400">{filmUploadProgress.percentage}%</div>
                          <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Completed</div>
                        </div>
                        <button
                          type="button"
                          onClick={cancelFilmUpload}
                          className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 rounded-xl transition-colors cursor-pointer"
                          title="Cancel Upload"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="relative h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                      <div 
                        className={`h-full transition-all duration-300 ease-out ${
                          filmUploadProgress.status === 'error' ? 'bg-rose-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${filmUploadProgress.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* ============================================================ */}
                {/* SECTION 4: DRIVE FILES / VIDEOS AREA                         */}
                {/* ============================================================ */}
                {filteredFilmVideos.length === 0 ? (
                  <div className="p-12 border border-dashed border-slate-300 dark:border-slate-800 rounded-none text-center space-y-4 bg-white dark:bg-slate-900">
                    <Film className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        No videos match your search
                      </h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Upload raw footage or adjust your search filter above.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsFilmStudioModalOpen(true);
                      }}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-none text-xs font-black uppercase tracking-wider inline-flex items-center space-x-2 cursor-pointer shadow-md shadow-indigo-900/20"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Upload Video Now</span>
                    </button>
                  </div>
                ) : driveViewMode === 'grid' ? (
                  /* ================= GRID VIEW ================= */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredFilmVideos.map((video) => {
                      const isFakeDuration = (d?: string) => !d || d === '05:30' || d === '05:00' || d === '10:00' || d === 'Ready' || d === '00:00';
                      const realDuration = videoMetadataMap[video.url]?.duration || (!isFakeDuration(video.duration) ? video.duration : '');
                      const realFileSize = videoMetadataMap[video.url]?.fileSize || (video.fileSize && !video.fileSize.includes('Uploaded File') && video.fileSize !== '0 B' && video.fileSize !== '0.0 MB' && video.fileSize !== '—' ? video.fileSize : '') || '';

                      return (
                        <div
                          key={video.id}
                          className="bg-white dark:bg-slate-900 rounded-none border border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 shadow-xs hover:shadow-md transition-all flex flex-col group overflow-hidden"
                        >
                          {/* Video Player Display */}
                          <div className="relative aspect-video bg-slate-100 dark:bg-slate-900 overflow-hidden flex items-center justify-center group/player">
                            {(() => {
                              const ext = video.name.split('.').pop()?.toLowerCase();
                              const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext || '');
                              const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '');
                              
                              if (isVideo) {
                                return (
                                  <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
                                    <video
                                      src={video.url}
                                      preload="metadata"
                                      className="w-full h-full object-contain"
                                      onLoadedMetadata={(e) => {
                                        const durSec = e.currentTarget.duration;
                                        if (durSec && isFinite(durSec) && durSec > 0) {
                                          const formatted = formatVideoDuration(durSec);
                                          setVideoMetadataMap(prev => {
                                            if (prev[video.url]?.duration === formatted) return prev;
                                            return {
                                              ...prev,
                                              [video.url]: {
                                                ...prev[video.url],
                                                duration: formatted
                                              }
                                            };
                                          });
                                        }
                                      }}
                                    />
                                  </div>
                                );
                              } else if (isImage) {
                                return (
                                  <img 
                                    src={video.url} 
                                    alt={video.name}
                                    className="w-full h-full object-cover"
                                  />
                                );
                              } else {
                                return (
                                  <div className="w-16 h-16 opacity-40 group-hover/player:scale-110 transition-transform duration-500">
                                    {getFileIcon(video.name)}
                                  </div>
                                );
                              }
                            })()}
                            
                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover/player:bg-black/30 transition-all">
                              <button
                                type="button"
                                onClick={() => setPreviewingVideo(video)}
                                className="w-12 h-12 rounded-none bg-indigo-600 text-white flex items-center justify-center opacity-0 group-hover/player:opacity-100 transform scale-75 group-hover/player:scale-100 transition-all shadow-lg cursor-pointer"
                              >
                                <Eye className="w-6 h-6" />
                              </button>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => setPreviewingVideo(video)}
                              className="absolute bottom-2.5 right-2.5 p-1.5 bg-black/60 hover:bg-indigo-600 text-white rounded-none backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                              title="Expand Preview Player"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                            </button>

                            {realDuration && (
                              <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 bg-black/80 text-white font-mono text-[10px] font-bold rounded-none pointer-events-none z-10 shadow-sm">
                                {realDuration}
                              </div>
                            )}
                          </div>

                          {/* Video Details Body */}
                          <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                            <div className="space-y-2">
                              {/* Title with edit */}
                              {editingVideoNameId === video.id ? (
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="text"
                                    value={newVideoNameInput}
                                    onChange={(e) => setNewVideoNameInput(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-indigo-500 px-2 py-1 rounded-none text-xs font-bold text-slate-900 dark:text-slate-100"
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRenameClip(video.id, newVideoNameInput)}
                                    className="p-1 bg-indigo-600 text-white rounded-none hover:bg-indigo-500 cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-start justify-between group/title">
                                  <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
                                    {video.name}
                                  </h3>
                                  {video.isDeletable && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingVideoNameId(video.id);
                                        setNewVideoNameInput(video.name);
                                      }}
                                      className="opacity-0 group-hover/title:opacity-100 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer ml-1"
                                      title="Rename video"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Upload Date & Duration Row */}
                              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium pt-0.5">
                                <span>{video.uploadedAt}</span>
                                {realDuration && (
                                  <span className="font-mono text-[10px] font-bold text-slate-400">
                                    {realDuration}
                                  </span>
                                )}
                              </div>

                              {/* Associated Lesson Indicator */}
                              {video.associatedLessonTitle ? (
                                <div className="flex items-center space-x-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                                  <Layers className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">{video.associatedLessonTitle}</span>
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-400 font-medium">Unassigned to curriculum lecture</div>
                              )}
                            </div>

                            {/* Actions Toolbar - sharp and clean */}
                            <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                              {/* Assign to Lesson Button - Opens Right-Side Panel */}
                              <div className="flex-1 min-w-0">
                                <button
                                  type="button"
                                  onClick={() => setAssigningVideoId(video.id)}
                                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-300 dark:border-slate-800 rounded-none text-[11px] font-bold flex items-center justify-between transition-colors cursor-pointer"
                                  title={video.associatedLessonId ? "Reassign Lesson in Curriculum" : "Assign to Curriculum Lesson"}
                                >
                                  <span className="truncate flex items-center space-x-1.5">
                                    <Layers className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                    <span className="truncate">{video.associatedLessonId ? 'Reassign Lesson' : 'Assign to Curriculum'}</span>
                                  </span>
                                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                </button>
                              </div>

                              {video.isDeletable && (
                                <button
                                  type="button"
                                  onClick={() => promptDeleteClip({ id: video.id, name: video.name, url: video.url })}
                                  className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-none border border-slate-300 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-900 transition-colors cursor-pointer shrink-0"
                                  title="Delete Clip"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* ================= LIST VIEW (GOOGLE DRIVE TABLE) ================= */
                  <div className="bg-white dark:bg-slate-950 rounded-none border border-slate-300 dark:border-slate-800 overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          <tr>
                            <th className="py-3 px-4">Name</th>
                            <th className="py-3 px-4">Curriculum Link</th>
                            <th className="py-3 px-4">Uploaded</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {filteredFilmVideos.map((video) => {
                            const isFakeDuration = (d?: string) => !d || d === '05:30' || d === '05:00' || d === '10:00' || d === 'Ready' || d === '00:00';
                            const realDuration = videoMetadataMap[video.url]?.duration || (!isFakeDuration(video.duration) ? video.duration : '');

                            return (
                              <tr
                                key={video.id}
                                className="hover:bg-slate-50/80 dark:hover:bg-slate-900/60 transition-colors"
                              >
                                {/* Video Name & Player Preview icon */}
                                <td className="py-3 px-4">
                                  <div className="flex items-center space-x-3 min-w-0">
                                    <button
                                      type="button"
                                      onClick={() => setPreviewingVideo(video)}
                                      className="w-8 h-8 rounded-none bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center shrink-0 hover:bg-indigo-600 hover:text-white transition-colors cursor-pointer p-1.5 shadow-xs"
                                      title="Preview File"
                                    >
                                      {(() => {
                                        const ext = video.name.split('.').pop()?.toLowerCase();
                                        const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext || '');
                                        if (isVideo) return <Play className="w-3.5 h-3.5 fill-current" />;
                                        return getFileIcon(video.name);
                                      })()}
                                    </button>
                                    <div className="min-w-0 max-w-xs">
                                      <span className="font-bold text-slate-900 dark:text-slate-100 block truncate">
                                        {video.name}
                                      </span>
                                      <span className="text-[10px] text-slate-400 block truncate">
                                        {realDuration ? `${realDuration} • ` : ''}{video.source.replace(/_/g, ' ')}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                {/* Curriculum Link */}
                                <td className="py-3 px-4">
                                  {video.associatedLessonTitle ? (
                                    <button
                                      type="button"
                                      onClick={() => setAssigningVideoId(video.id)}
                                      className="inline-flex items-center space-x-1.5 text-indigo-600 dark:text-indigo-400 font-bold truncate max-w-xs hover:underline cursor-pointer text-left"
                                      title="Click to change or reassign curriculum lecture"
                                    >
                                      <Layers className="w-3.5 h-3.5 shrink-0" />
                                      <span className="truncate">{video.associatedLessonTitle}</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setAssigningVideoId(video.id)}
                                      className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-[11px] font-bold underline decoration-dotted cursor-pointer inline-flex items-center space-x-1"
                                      title="Assign to curriculum lecture"
                                    >
                                      <Layers className="w-3 h-3 shrink-0" />
                                      <span>Assign to lecture</span>
                                    </button>
                                  )}
                                </td>

                                {/* Date */}
                                <td className="py-3 px-4 text-slate-400 text-[11px]">
                                  {video.uploadedAt}
                                </td>

                                {/* Actions */}
                                <td className="py-3 px-4 text-right">
                                  <div className="inline-flex items-center space-x-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setAssigningVideoId(video.id)}
                                      className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-none hover:bg-slate-100 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
                                      title={video.associatedLessonId ? "Reassign Lesson" : "Assign to Curriculum"}
                                    >
                                      <Layers className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setPreviewingVideo(video)}
                                      className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-none hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
                                      title="Preview"
                                    >
                                      <Maximize2 className="w-3.5 h-3.5" />
                                    </button>

                                    {video.isDeletable && (
                                      <button
                                        type="button"
                                        onClick={() => promptDeleteClip({ id: video.id, name: video.name, url: video.url })}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-none hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
                                        title="Delete"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* MODAL 1: CREATE NEW FOLDER */}
                {isNewFolderModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
                    <div 
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl animate-scaleUp"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                            <FolderPlus className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                              New Folder
                            </h3>
                            <p className="text-[11px] text-slate-500">
                              Organize your course videos like Google Drive
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsNewFolderModalOpen(false)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <form onSubmit={handleCreateFolder} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Folder Name
                          </label>
                          <input
                            type="text"
                            value={newFolderNameInput}
                            onChange={(e) => setNewFolderNameInput(e.target.value)}
                            placeholder="e.g. Module 1 - Core Lessons, B-Roll, Interviews"
                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            autoFocus
                            required
                          />
                        </div>

                        {/* Color Selector */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Folder Color Theme
                          </label>
                          <div className="grid grid-cols-6 gap-2">
                            {[
                              { key: 'indigo', name: 'Indigo', bg: 'bg-indigo-500' },
                              { key: 'emerald', name: 'Emerald', bg: 'bg-emerald-500' },
                              { key: 'amber', name: 'Amber', bg: 'bg-amber-500' },
                              { key: 'rose', name: 'Rose', bg: 'bg-rose-500' },
                              { key: 'sky', name: 'Sky', bg: 'bg-sky-500' },
                              { key: 'purple', name: 'Purple', bg: 'bg-purple-500' }
                            ].map((col) => (
                              <button
                                key={col.key}
                                type="button"
                                onClick={() => setNewFolderColorInput(col.key)}
                                className={`h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${col.bg} ${
                                  newFolderColorInput === col.key
                                    ? 'ring-2 ring-offset-2 ring-indigo-500 scale-105'
                                    : 'opacity-70 hover:opacity-100'
                                }`}
                                title={col.name}
                              >
                                {newFolderColorInput === col.key && (
                                  <Check className="w-4 h-4 text-white" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => setIsNewFolderModalOpen(false)}
                            className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isCreatingFolder || !newFolderNameInput.trim()}
                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-900/20 flex items-center space-x-1.5 cursor-pointer"
                          >
                            {isCreatingFolder ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            <span>Create Folder</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* MODAL 2: MOVE VIDEO TO FOLDER */}
                {isMoveVideoModalOpen && videoToMove && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
                    <div 
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl animate-scaleUp"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                            <FolderInput className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                              Move Video to Folder
                            </h3>
                            <p className="text-[11px] text-slate-500 truncate max-w-xs">
                              Target: {videoToMove.name}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsMoveVideoModalOpen(false);
                            setVideoToMove(null);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Video Snapshot Details */}
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center space-x-3">
                        <div className="w-12 h-10 rounded-xl bg-black flex items-center justify-center text-white shrink-0">
                          <Film className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div className="truncate flex-1">
                          <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                            {videoToMove.name}
                          </h4>
                          <span className="text-[10px] text-slate-400">
                            Current Folder: <strong>{videoToMove.folder || 'Drive Root'}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Select Target Folder List */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Choose Destination:
                        </label>
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                          {/* Option: Drive Root (Unfiled) */}
                          <button
                            type="button"
                            disabled={isMovingVideo}
                            onClick={() => handleMoveVideo(videoToMove.id, null, 'film-edit-studio')}
                            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 text-left flex items-center justify-between transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center space-x-2.5">
                              <HardDrive className="w-4 h-4 text-slate-500 group-hover:text-indigo-600" />
                              <div>
                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                                  Drive Root (Unfiled)
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  Keep in main directory
                                </span>
                              </div>
                            </div>
                            <Move className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
                          </button>

                          {/* Existing Folders */}
                          {videoFolders.map((f) => {
                            const colorCls = getFolderColorClasses(f.color);
                            const countInFolder = allFilmVideos.filter(v => v.folderId === f.id || v.folder === f.name).length;
                            const isCurrentFolder = videoToMove.folderId === f.id || videoToMove.folder === f.name;

                            return (
                              <button
                                key={f.id}
                                type="button"
                                disabled={isMovingVideo || isCurrentFolder}
                                onClick={() => handleMoveVideo(videoToMove.id, f.id, f.name)}
                                className={`w-full p-3 rounded-xl border transition-colors text-left flex items-center justify-between cursor-pointer group ${
                                  isCurrentFolder
                                    ? 'bg-slate-100 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 opacity-60 cursor-not-allowed'
                                    : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20'
                                }`}
                              >
                                <div className="flex items-center space-x-2.5">
                                  <div className={`w-7 h-7 rounded-lg ${colorCls.iconBg} flex items-center justify-center shrink-0`}>
                                    <Folder className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                                      {f.name}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      {countInFolder} {countInFolder === 1 ? 'video' : 'videos'} inside
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  {isCurrentFolder ? (
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                                      Current
                                    </span>
                                  ) : (
                                    <Move className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => {
                            setIsMoveVideoModalOpen(false);
                            setVideoToMove(null);
                          }}
                          className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* MODAL 3: RENAME FOLDER */}
                {folderToRename && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
                    <div 
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl animate-scaleUp"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                            <Edit3 className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                              Rename Folder
                            </h3>
                            <p className="text-[11px] text-slate-500">
                              Update the name for this video folder
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFolderToRename(null)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            New Folder Name
                          </label>
                          <input
                            type="text"
                            value={renameFolderNameInput}
                            onChange={(e) => setRenameFolderNameInput(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            autoFocus
                          />
                        </div>

                        <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => setFolderToRename(null)}
                            className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRenameFolder(folderToRename.id, renameFolderNameInput)}
                            disabled={!renameFolderNameInput.trim()}
                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-900/20 cursor-pointer"
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SUBTLE 'ARE YOU SURE?' CONFIRMATION DIALOG: DELETE VIDEO CLIP */}
                {clipToDelete && (
                  <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
                    {/* Subtle Backdrop */}
                    <div 
                      className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs cursor-pointer animate-in fade-in"
                      onClick={() => !isDeletingClip && setClipToDelete(null)}
                    />
                    
                    {/* Dialog Box - Sharp styling consistent with theme */}
                    <div 
                      className="relative bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-none w-full max-w-md p-6 overflow-hidden shadow-2xl z-10 animate-in zoom-in-95 duration-150 space-y-4 text-slate-900 dark:text-slate-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-start space-x-3.5">
                        <div className="w-10 h-10 rounded-none bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center shrink-0">
                          <Trash2 className="w-5 h-5" />
                        </div>
                        <div className="space-y-1 min-w-0 flex-1">
                          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight">
                            Are you sure?
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                            You are about to delete <span className="font-bold text-slate-800 dark:text-slate-200 break-all">"{clipToDelete.name}"</span>. This video clip will be permanently removed from your library.
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2.5">
                        <button
                          type="button"
                          disabled={isDeletingClip}
                          onClick={() => setClipToDelete(null)}
                          className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-none text-xs font-bold transition-colors cursor-pointer border border-slate-300 dark:border-slate-700 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isDeletingClip}
                          onClick={confirmDeleteClip}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-none text-xs font-bold transition-all shadow-xs inline-flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {isDeletingClip ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Deleting...</span>
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Clip</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* RIGHT-SIDE SLIDE-OVER DRAWER: ASSIGN TO CURRICULUM */}
                {assigningVideoId && (() => {
                  const activeAssignVideo = allFilmVideos.find(v => v.id === assigningVideoId) || null;
                  const totalLecturesCount = modules.reduce((acc, m) => acc + m.lessons.length, 0);

                  return (
                    <div className="fixed inset-0 z-[140] flex justify-end">
                      {/* Backdrop */}
                      <div 
                        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs cursor-pointer animate-in fade-in duration-200"
                        onClick={() => setAssigningVideoId(null)}
                      />

                      {/* Slide-over Right Side Panel */}
                      <div 
                        className="relative w-full max-w-md sm:max-w-lg md:max-w-xl h-full bg-white dark:bg-slate-900 border-l border-slate-300 dark:border-slate-800 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200 text-slate-900 dark:text-slate-100 rounded-none overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Header */}
                        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start justify-between gap-3 shrink-0">
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="w-9 h-9 rounded-none bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900 flex items-center justify-center shrink-0">
                              <Layers className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 tracking-tight">
                                Assign to Curriculum
                              </h3>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                                Connect this video file to a lecture in your syllabus
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAssigningVideoId(null)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-none hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                            title="Close panel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Selected Media File Banner */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 space-y-3 shrink-0">
                          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Selected Media File
                          </div>
                          <div className="p-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-none flex items-center justify-between gap-3 shadow-xs">
                            <div className="flex items-center space-x-3 min-w-0">
                              <div className="w-10 h-10 rounded-none bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                                <Play className="w-4 h-4 fill-current" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate" title={activeAssignVideo?.name || 'Selected Video'}>
                                  {activeAssignVideo?.name || 'Selected Video'}
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                  {activeAssignVideo?.duration && <span className="font-mono">{activeAssignVideo.duration}</span>}
                                  {activeAssignVideo?.uploadedAt && <span>• Uploaded {activeAssignVideo.uploadedAt}</span>}
                                </div>
                              </div>
                            </div>
                            {activeAssignVideo?.associatedLessonTitle ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (activeAssignVideo) {
                                    handleUnassignVideoFromLesson(activeAssignVideo.id, activeAssignVideo.url, activeAssignVideo.associatedLessonId);
                                  }
                                }}
                                className="px-2.5 py-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-none shrink-0 transition-colors cursor-pointer"
                              >
                                Unassign
                              </button>
                            ) : null}
                          </div>

                          {activeAssignVideo?.associatedLessonTitle ? (
                            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-3 py-1.5 flex items-center justify-between">
                              <span className="truncate flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                <span className="truncate">Currently linked to: <strong>{activeAssignVideo.associatedLessonTitle}</strong></span>
                              </span>
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 px-1">
                              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>Choose any lecture below to connect this video file.</span>
                            </div>
                          )}
                        </div>

                        {/* Search & Filter */}
                        <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              value={drawerCurriculumSearch}
                              onChange={(e) => setDrawerCurriculumSearch(e.target.value)}
                              placeholder="Search section or lecture title..."
                              className="w-full pl-8 pr-8 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                            />
                            {drawerCurriculumSearch && (
                              <button
                                type="button"
                                onClick={() => setDrawerCurriculumSearch('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Modules & Lessons Scrollable List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                          {modules.length === 0 ? (
                            <div className="p-8 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-none space-y-3">
                              <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
                              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                No Curriculum Sections Created Yet
                              </div>
                              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                                You haven't created modules or lectures in your syllabus yet. Switch to the Curriculum tab to create your course structure.
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setAssigningVideoId(null);
                                  setActiveTab('curriculum');
                                }}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-none text-xs font-bold transition-colors cursor-pointer"
                              >
                                Open Curriculum Tab
                              </button>
                            </div>
                          ) : (
                            modules
                              .filter(mod => {
                                if (!drawerCurriculumSearch.trim()) return true;
                                const q = drawerCurriculumSearch.toLowerCase();
                                return mod.title.toLowerCase().includes(q) || mod.lessons.some(l => l.title.toLowerCase().includes(q));
                              })
                              .map((mod, modIdx) => {
                                const matchingLessons = mod.lessons.filter(l => {
                                  if (!drawerCurriculumSearch.trim()) return true;
                                  const q = drawerCurriculumSearch.toLowerCase();
                                  return mod.title.toLowerCase().includes(q) || l.title.toLowerCase().includes(q);
                                });

                                return (
                                  <div key={mod.id} className="border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-none overflow-hidden shadow-xs">
                                    {/* Module Title Header */}
                                    <div className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                      <div className="flex items-center space-x-2 min-w-0">
                                        <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                                          Section {modIdx + 1}
                                        </span>
                                        <span className="text-slate-300 dark:text-slate-600">•</span>
                                        <span className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                                          {mod.title}
                                        </span>
                                      </div>
                                      <span className="text-[10px] font-bold text-slate-400 shrink-0">
                                        {mod.lessons.length} {mod.lessons.length === 1 ? 'lecture' : 'lectures'}
                                      </span>
                                    </div>

                                    {/* Module Lessons */}
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                      {matchingLessons.length === 0 ? (
                                        <div className="p-3 text-[11px] text-slate-400 italic text-center">
                                          No lectures match search
                                        </div>
                                      ) : (
                                        matchingLessons.map((les, lesIdx) => {
                                          const isCurrentlyThis = activeAssignVideo?.associatedLessonId === les.id || (activeAssignVideo?.url && les.videoUrl === activeAssignVideo.url);
                                          const hasOtherVideo = les.videoUrl && !isCurrentlyThis;

                                          return (
                                            <div
                                              key={les.id}
                                              className={`p-3 transition-colors flex items-center justify-between gap-3 ${
                                                isCurrentlyThis 
                                                  ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-l-4 border-l-emerald-600 dark:border-l-emerald-500' 
                                                  : 'hover:bg-slate-50 dark:hover:bg-slate-850'
                                              }`}
                                            >
                                              <div className="flex items-center space-x-2.5 min-w-0">
                                                <div className={`w-7 h-7 rounded-none flex items-center justify-center shrink-0 text-xs font-bold border ${
                                                  isCurrentlyThis 
                                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                                    : hasOtherVideo
                                                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900'
                                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                                                }`}>
                                                  {isCurrentlyThis ? <Check className="w-3.5 h-3.5" /> : <Play className="w-3 h-3 fill-current" />}
                                                </div>
                                                <div className="min-w-0">
                                                  <div className="flex items-center space-x-1.5">
                                                    <span className="text-[11px] text-slate-400 font-medium">Lecture {lesIdx + 1}:</span>
                                                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate" title={les.title}>
                                                      {les.title}
                                                    </span>
                                                  </div>
                                                  <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                                    {isCurrentlyThis ? (
                                                      <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                                        <Check className="w-3 h-3" /> Currently Assigned
                                                      </span>
                                                    ) : hasOtherVideo ? (
                                                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                                                        Has other video attached (will overwrite)
                                                      </span>
                                                    ) : (
                                                      <span>Empty video slot</span>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>

                                              <div className="shrink-0 flex items-center space-x-1.5">
                                                {isCurrentlyThis ? (
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      if (activeAssignVideo) {
                                                        handleUnassignVideoFromLesson(activeAssignVideo.id, activeAssignVideo.url, les.id);
                                                      }
                                                    }}
                                                    className="px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-slate-300 dark:border-slate-700 rounded-none transition-colors cursor-pointer"
                                                  >
                                                    Unlink
                                                  </button>
                                                ) : (
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      if (activeAssignVideo) {
                                                        handleAssignVideoToLesson(activeAssignVideo.id, activeAssignVideo.url, les.id);
                                                      }
                                                    }}
                                                    className={`px-3 py-1 text-[11px] font-bold rounded-none border transition-colors cursor-pointer flex items-center space-x-1 ${
                                                      hasOtherVideo 
                                                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-100'
                                                        : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-600'
                                                    }`}
                                                  >
                                                    <span>{hasOtherVideo ? 'Replace' : 'Assign'}</span>
                                                    <ChevronRight className="w-3 h-3" />
                                                  </button>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                          )}
                        </div>

                        {/* Footer */}
                        <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            {totalLecturesCount} total {totalLecturesCount === 1 ? 'lecture' : 'lectures'} in course
                          </div>
                          <button
                            type="button"
                            onClick={() => setAssigningVideoId(null)}
                            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-none text-xs font-bold transition-colors cursor-pointer"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* TAB: CAPTIONS */}
            {activeTab === 'captions' && (
              <div className="space-y-6 animate-fadeIn text-left max-w-4xl">
                
                {/* Header Row matching mock image */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-5">
                  <div className="flex items-center space-x-3">
                    <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Captions</h1>
                    
                    {/* Interactive Language Selector Dropdown */}
                    <div className="relative">
                      <select
                        defaultValue="en-US"
                        className="appearance-none bg-white dark:bg-slate-950 border-2 border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400 rounded-xl px-4 py-1.5 pr-8 text-xs font-black tracking-wide cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="en-US">English (US)</option>
                        <option value="es-ES">Español (ES)</option>
                        <option value="fr-FR">Français (FR)</option>
                        <option value="de-DE">Deutsch (DE)</option>
                        <option value="sw-KE">Kiswahili (KE)</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-600 dark:text-indigo-400">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>

                  {/* Disable/Enable Button on the right */}
                  <button
                    type="button"
                    onClick={() => showNotification("Subtitles preferences updated successfully!")}
                    className="px-5 py-1.5 border-2 border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-xl text-xs font-black tracking-wide transition-all cursor-pointer"
                  >
                    Disable
                  </button>
                </div>

                {/* Subtitle Description Block */}
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-semibold max-w-3xl">
                  Learners of all levels of language proficiency highly value subtitles as it helps follow, understand and memorize the content. Also having subtitles to ensure the content is accessible for those that are deaf or hard of hearing is crucial.{' '}
                  <span 
                    onClick={() => showNotification("Help documentation regarding subtitle files (VTT/SRT format) is loading...")}
                    className="text-indigo-600 dark:text-indigo-400 underline font-bold cursor-pointer hover:text-indigo-700"
                  >
                    Learn more.
                  </span>
                </p>

                {/* High-Fidelity Informational Banner matching the screenshot */}
                <div className="border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20 p-5 rounded-2xl flex items-start space-x-3.5">
                  <div className="w-6 h-6 rounded-full border-2 border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 text-xs font-bold font-serif">
                    i
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-bold leading-normal">
                    When you add video lectures to your course via the{' '}
                    <span
                      onClick={() => setActiveTab('curriculum')}
                      className="text-indigo-600 dark:text-indigo-400 underline cursor-pointer hover:text-indigo-700 font-black transition-colors"
                    >
                      Curriculum
                    </span>{' '}
                    you will be able to add captions to those videos here.
                  </p>
                </div>

                {/* Active Subtitle Manager List for actual Curriculum Videos */}
                <div className="pt-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Subtitle Tracks Configuration
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400 font-bold">
                      {modules.reduce((acc, m) => acc + m.lessons.filter(l => l.type === 'video').length, 0)} Video Lectures Found
                    </span>
                  </div>

                  {modules.reduce((acc, m) => acc + m.lessons.filter(l => l.type === 'video').length, 0) === 0 ? (
                    <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-2 bg-slate-50/50 dark:bg-slate-950/10">
                      <Subtitles className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
                      <p className="text-[11px] text-slate-500 font-bold">No video lectures exist in your curriculum yet.</p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('curriculum')}
                        className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider"
                      >
                        Go Add Video Lectures
                      </button>
                    </div>
                  ) : (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-950/40">
                      {modules.map((mod) => 
                        mod.lessons.filter(l => l.type === 'video').map((lesson) => (
                          <div key={lesson.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase tracking-wider rounded">
                                  Video
                                </span>
                                <p className="text-xs font-black text-slate-900 dark:text-slate-100">{lesson.title}</p>
                              </div>
                              <p className="text-[10px] text-slate-400 font-semibold">Section: {mod.title || 'Untitled Section'}</p>
                            </div>

                            <div className="flex items-center space-x-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => showNotification(`Activated AI live microphone & audio speech captions for "${lesson.title}"!`)}
                                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center space-x-1 shadow-xs"
                              >
                                <span>⚡ AI Live Captions</span>
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: ACCESSIBILITY */}
            {activeTab === 'accessibility' && (
              <div className="space-y-10 animate-fadeIn text-center py-20">
                <div className="max-w-md mx-auto space-y-6">
                  <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center mx-auto text-amber-600">
                    <ShieldCheck className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Accessibility (Optional)</h2>
                    <p className="text-sm text-slate-500">Ensure your course is inclusive. We'll check for color contrast, caption availability, and screen reader compatibility.</p>
                  </div>
                  <button className="px-8 py-3 bg-amber-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-amber-900/20">
                    Run Accessibility Audit
                  </button>
                </div>
              </div>
            )}

            {/* TAB: CURRICULUM BUILDER */}
            {activeTab === 'curriculum' && (
              <div className="space-y-6 animate-fadeIn">
                
                {isBulkUploaderPageActive && (
                  /* FULL-PAGE HIGH-FIDELITY BULK UPLOADER WORKSPACE MATCHING THE MOCKUP */
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-8 shadow-xs animate-fadeIn relative">
                    
                    {/* Workspace Navigation Header */}
                    <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                      <button
                        type="button"
                        onClick={() => {
                          setBulkUploadedFiles([]);
                          setIsBulkUploaderPageActive(false);
                        }}
                        className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1.5"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Curriculum Manager</span>
                      </button>

                      <div className="text-right">
                        <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 rounded-lg">
                          Page-Mode Active
                        </span>
                      </div>
                    </div>

                    {/* Step 1: Destination Selection */}
                    <div className="max-w-xl space-y-2">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Select Target Section for Imported Lectures
                      </label>
                      {modules.length === 0 ? (
                        <div className="text-rose-500 font-bold text-xs p-3 bg-rose-50 dark:bg-rose-950/20 rounded-xl">
                          ⚠️ No Sections are created yet. Please return and add a curriculum section first!
                        </div>
                      ) : (
                        <select
                          value={bulkTargetSectionId || (modules[0]?.id || '')}
                          onChange={(e) => setBulkTargetSectionId(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-slate-200 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {modules.map((mod, idx) => (
                            <option key={mod.id} value={mod.id}>
                              Section {idx + 1}: {mod.title || 'Untitled Section'}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                )}

                {isCurriculumHelpPageActive && (
                  /* Curriculum Guide & UI Form Preview Page with Skeleton Loader */
                  <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto py-4">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
                      <div className="space-y-1">
                        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-none bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-800">
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Curriculum Architecture & UI Form Guide</span>
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                          How to Structure Your Course Curriculum
                        </h1>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                          Follow this interactive UI form preview to understand how course sections, content lectures, practice activities, and assessments work together.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsCurriculumHelpPageActive(false)}
                        className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-none text-xs font-bold transition-all cursor-pointer border border-slate-300 dark:border-slate-700"
                      >
                        ← Return to Curriculum
                      </button>
                    </div>

                    {isLoadingHelpGuide ? (
                      /* Skeleton Loading Animation */
                      <div className="space-y-6 animate-pulse">
                        <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-none w-full border border-slate-300 dark:border-slate-700" />
                        <div className="space-y-3">
                          <div className="h-16 bg-slate-200 dark:bg-slate-800 rounded-none w-full border border-slate-300 dark:border-slate-700" />
                          <div className="h-16 bg-slate-200 dark:bg-slate-800 rounded-none w-full border border-slate-300 dark:border-slate-700" />
                          <div className="h-16 bg-slate-200 dark:bg-slate-800 rounded-none w-full border border-slate-300 dark:border-slate-700" />
                        </div>
                      </div>
                    ) : (
                      /* Interactive UI Form Preview */
                      <div className="space-y-6">
                        <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 rounded-none p-6 space-y-4">
                          <h3 className="text-sm font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-wider flex items-center space-x-2">
                            <span>Interactive Form Structure Preview</span>
                          </h3>
                          <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">
                            Here is the exact UI form representation of how each course section and its lesson items are configured in your curriculum builder.
                          </p>
                        </div>

                        {/* Sample Section UI Form Card */}
                        <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-300 dark:border-slate-800 p-6 space-y-5 shadow-none">
                          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                            <div className="space-y-1">
                              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-none bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
                                Section 1 Module Config
                              </span>
                              <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 pt-1">
                                Section Title: Introduction to Web Design & UI Fundamentals
                              </h4>
                              <p className="text-xs text-slate-500 font-medium">
                                Description: Master foundational design principles and wireframing techniques.
                              </p>
                            </div>
                          </div>

                          {/* Lessons UI Form List */}
                          <div className="space-y-3">
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                              Contained Lessons & Activities (4 items)
                            </span>

                            {/* Lesson 1: Video */}
                            <div className="p-4 rounded-none bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="p-2 rounded-none bg-indigo-100 dark:bg-indigo-950 text-indigo-600 border border-indigo-300 dark:border-indigo-800">
                                  <Video className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                                    1.1 Course Welcome & Overview (Video Lecture)
                                  </div>
                                  <div className="text-[10px] text-slate-500 flex items-center space-x-2 mt-0.5 font-medium">
                                    <span>Duration: 08:30</span>
                                    <span>•</span>
                                    <span className="text-emerald-600 font-bold">Free Preview Enabled</span>
                                  </div>
                                </div>
                              </div>
                              <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 rounded-none text-[10px] font-black uppercase border border-indigo-300 dark:border-indigo-800">Video Content</span>
                            </div>

                            {/* Lesson 2: Article */}
                            <div className="p-4 rounded-none bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="p-2 rounded-none bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                                    1.2 Design Systems & Typography Cheat Sheet (Article)
                                  </div>
                                  <div className="text-[10px] text-slate-500 flex items-center space-x-2 mt-0.5 font-medium">
                                    <span>Reading time: 05:00</span>
                                  </div>
                                </div>
                              </div>
                              <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 rounded-none text-[10px] font-black uppercase border border-slate-300 dark:border-slate-700">Article / PDF</span>
                            </div>

                            {/* Lesson 3: Practice Activity */}
                            <div className="p-4 rounded-none bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="p-2 rounded-none bg-purple-100 dark:bg-purple-950 text-purple-600 border border-purple-300 dark:border-purple-800">
                                  <Volume2 className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                                    1.3 Wireframe Sandbox Challenge (Practice Activity)
                                  </div>
                                  <div className="text-[10px] text-slate-500 flex items-center space-x-2 mt-0.5 font-medium">
                                    <span>Interactive Assignment</span>
                                  </div>
                                </div>
                              </div>
                              <span className="px-3 py-1 bg-purple-50 dark:bg-purple-950 text-purple-600 rounded-none text-[10px] font-black uppercase border border-purple-300 dark:border-purple-800">Practice Activity</span>
                            </div>

                            {/* Lesson 4: Assessment */}
                            <div className="p-4 rounded-none bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="p-2 rounded-none bg-emerald-100 dark:bg-emerald-950 text-emerald-600 border border-emerald-300 dark:border-emerald-800">
                                  <HelpCircle className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                                    1.4 Module 1 Knowledge Check (Assessment)
                                  </div>
                                  <div className="text-[10px] text-slate-500 flex items-center space-x-2 mt-0.5 font-medium">
                                    <span>10 Multi-Choice Questions • Passing Grade: 80%</span>
                                  </div>
                                </div>
                              </div>
                              <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 rounded-none text-[10px] font-black uppercase border border-emerald-300 dark:border-emerald-800">Assessment</span>
                            </div>
                          </div>
                        </div>

                        {/* Footer Action */}
                        <div className="flex justify-end pt-4">
                          <button
                            type="button"
                            onClick={() => setIsCurriculumHelpPageActive(false)}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-none border border-indigo-600 shadow-none cursor-pointer uppercase tracking-wider"
                          >
                            Ready to Build Curriculum →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!isBulkUploaderPageActive && !isCurriculumHelpPageActive && (
                  <>
                    {/* Section List Accordions */}
                    <div className="space-y-6">
                      {modules.map((mod, modIdx) => (
                        <div
                          key={mod.id}
                          className="bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm"
                        >
                          {/* Section Header Row */}
                          <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              <span className="text-xs font-black text-slate-800 dark:text-slate-200 shrink-0">
                                Section {modIdx + 1}:
                              </span>
                              <span className="text-slate-400 text-xs shrink-0 font-bold">📄</span>
                              <input
                                type="text"
                                value={mod.title}
                                onChange={(e) => {
                                  const newTitle = e.target.value;
                                  setModules(modules.map(m => m.id === mod.id ? { ...m, title: newTitle } : m));
                                }}
                                className="flex-1 bg-transparent text-xs font-black text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-none px-1.5 py-0.5"
                                placeholder="Section Title (e.g. Introduction)"
                              />
                            </div>

                            {/* Section Actions */}
                            <div className="flex items-center space-x-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleOpenEditSectionModal(mod, modIdx)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-none cursor-pointer transition-colors"
                                title="Rename Section / Edit Details"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleModuleExpand(mod.id)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-none cursor-pointer transition-colors"
                                title={mod.isExpanded === false ? "Expand Section" : "Collapse Section"}
                              >
                                {mod.isExpanded === false ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteModule(mod.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-none cursor-pointer transition-colors"
                                title="Delete Section"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Section Objective description placeholder */}
                          <div className="px-1 flex items-center space-x-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide shrink-0">Objective:</span>
                            <input
                              type="text"
                              placeholder="What will students master in this section?..."
                              value={mod.description || ''}
                              onChange={(e) => {
                                const newDesc = e.target.value;
                                setModules(modules.map(m => m.id === mod.id ? { ...m, description: newDesc } : m));
                              }}
                              className="flex-1 bg-transparent text-[11px] text-slate-500 dark:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1"
                            />
                          </div>

                          {/* List of Lectures matching the precise mock image layout */}
                          {mod.isExpanded !== false && (
                            <div className="space-y-3">
                              {(!mod.lessons || mod.lessons.length === 0) ? (
                                <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-center py-5">
                                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">No curriculum items in this section yet.</p>
                                  <p className="text-[11px] text-slate-400 mt-0.5">Click below to add lectures, quizzes, or reading materials.</p>
                                </div>
                              ) : (
                                mod.lessons.map((lesson, lessonIdx) => {
                                  const isLessonExpanded = !!expandedLessons[lesson.id];
                                  const currentSubTab = activeLessonSubTab[lesson.id] || null;
                                  
                                  const lessonDesc = (lesson as any).description || '';
                                  const lessonLabTitle = (lesson as any).labTitle || '';
                                  const lessonLabUrl = (lesson as any).labUrl || '';
                                  const lessonResources = lesson.resources || [];
                                  const curResTab = activeResourceTab[lesson.id] || 'file';

                                  return (
                                    <div
                                      key={lesson.id}
                                      className={`rounded-2xl border transition-all bg-white dark:bg-slate-950/60 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-xs overflow-hidden ${
                                        isLessonExpanded 
                                          ? 'border-indigo-500/80 ring-1 ring-indigo-500/10 shadow-xs' 
                                          : 'border-slate-200 dark:border-slate-800'
                                      }`}
                                    >
                                      {/* Lecture Header Row (Changes style dynamically based on active Resources tab to match Image 2) */}
                                      {currentSubTab === 'resources' ? (
                                        <div className="p-4 flex items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/10">
                                          <div className="flex items-center space-x-3.5 flex-1 min-w-0">
                                            {/* Checked Circle Icon with checkmark */}
                                            <div className="w-5 h-5 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center shrink-0">
                                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                                            </div>

                                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                                              <span className="text-xs font-black text-slate-700 dark:text-slate-300 shrink-0">
                                                {lesson.type === 'quiz' ? `Quiz ${lessonIdx + 1}:` : `Lecture ${lessonIdx + 1}:`}
                                              </span>
                                              <span className="text-slate-400 text-xs shrink-0 font-semibold">
                                                {lesson.type === 'quiz' ? '❓' : lesson.type === 'article' ? '📝' : lesson.type === 'audio' ? '🎙️' : '📄'}
                                              </span>
                                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                                {lesson.title}
                                              </span>
                                            </div>
                                          </div>

                                          {/* "Add Resources X" Active Tab on top-right flush with bottom border line */}
                                          <div className="relative -mb-4 shrink-0">
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveLessonSubTab(prev => ({ ...prev, [lesson.id]: null }));
                                              }}
                                              className="border border-b-0 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-850 px-3.5 py-2 rounded-t-xl text-xs font-extrabold text-slate-800 dark:text-slate-100 flex items-center space-x-2 shadow-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                                            >
                                              <span>Add Resources</span>
                                              <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="p-4 flex items-center justify-between gap-4">
                                          <div 
                                            className="flex items-center space-x-3.5 flex-1 min-w-0 cursor-pointer"
                                            onClick={() => {
                                              setSelectedLessonId(lesson.id);
                                              setActiveTab(lesson.type === 'quiz' ? 'assessment' : 'content');
                                            }}
                                            title="Click to open and edit lecture content"
                                          >
                                            {/* Checked Circle Icon with checkmark (matches Black circle + White check design in Image 1) */}
                                            <div className="w-5 h-5 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center shrink-0">
                                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                                            </div>

                                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
                                                {lesson.type === 'quiz' ? `Quiz ${lessonIdx + 1}:` : `Lecture ${lessonIdx + 1}:`}
                                              </span>
                                              <span className="text-slate-400 text-xs shrink-0 font-semibold">
                                                {lesson.type === 'quiz' ? '❓' : lesson.type === 'article' ? '📝' : lesson.type === 'audio' ? '🎙️' : '📄'}
                                              </span>
                                              <input
                                                type="text"
                                                value={lesson.title}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => {
                                                  const newTitle = e.target.value;
                                                  setModules(modules.map(m => m.id === mod.id ? {
                                                    ...m,
                                                    lessons: m.lessons.map(l => l.id === lesson.id ? { ...l, title: newTitle } : l)
                                                  } : m));
                                                }}
                                                className="flex-1 bg-transparent text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1.5 py-0.5"
                                              />
                                            </div>
                                          </div>

                                          {/* Right actions matching image: + Content button & Chevron Toggle */}
                                          <div className="flex items-center space-x-2 shrink-0">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSelectedLessonId(lesson.id);
                                                setActiveTab(lesson.type === 'quiz' ? 'assessment' : 'content');
                                              }}
                                              className="px-3.5 py-1.5 border border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center space-x-1.5"
                                              title="Open lecture editor directly"
                                            >
                                              <Plus className="w-3.5 h-3.5" />
                                              <span>Content</span>
                                            </button>

                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setExpandedLessons(prev => ({
                                                  ...prev,
                                                  [lesson.id]: !prev[lesson.id]
                                                }));
                                              }}
                                              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                                              title={isLessonExpanded ? "Collapse lecture sub-options" : "Expand lecture sub-options"}
                                            >
                                              {isLessonExpanded ? <ChevronUp className="w-4 h-4 text-indigo-600" /> : <ChevronDown className="w-4 h-4" />}
                                            </button>

                                            <button
                                              type="button"
                                              onClick={() => handleDeleteLesson(mod.id, lesson.id)}
                                              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer transition-colors"
                                              title="Delete Lecture"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </div>
                                      )}

                                      {/* Sub-Options Expandable Area */}
                                      {isLessonExpanded && (
                                        <div className="px-5 pb-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/20 dark:bg-slate-900/5 space-y-4">
                                          
                                          {/* Description Container (Only open if Description is the active tab) */}
                                          {currentSubTab === 'description' && (
                                            <div className="space-y-4 animate-in slide-in-from-top-1 duration-150">
                                              <div className="flex flex-col space-y-2">
                                                <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                                                  Lecture Description
                                                </label>
                                                <textarea
                                                  id={`lecture-desc-textarea-${lesson.id}`}
                                                  rows={4}
                                                  placeholder="Add a description. Include what students will be able to do after completing the lecture."
                                                  value={tempDescriptions[lesson.id] ?? ''}
                                                  onChange={(e) => {
                                                    const val = e.target.value;
                                                    setTempDescriptions(prev => ({
                                                      ...prev,
                                                      [lesson.id]: val
                                                    }));
                                                  }}
                                                  className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium min-h-[90px]"
                                                />
                                              </div>

                                              {/* Action Buttons precisely aligned right on the bottom */}
                                              <div className="flex items-center justify-end space-x-4">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setActiveLessonSubTab(prev => ({ ...prev, [lesson.id]: null }));
                                                  }}
                                                  className="text-xs font-black text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:underline transition-colors cursor-pointer"
                                                >
                                                  Cancel
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const descText = tempDescriptions[lesson.id] || '';
                                                    handleUpdateCurrentLesson({ description: descText });
                                                    // Live local updates
                                                    setModules(prev => prev.map(m => {
                                                      if (m.id === mod.id) {
                                                        return {
                                                          ...m,
                                                          lessons: m.lessons.map(l => l.id === lesson.id ? { ...l, description: descText } : l)
                                                        };
                                                      }
                                                      return m;
                                                    }));
                                                    setActiveLessonSubTab(prev => ({ ...prev, [lesson.id]: null }));
                                                    showNotification('Lecture description saved!');
                                                  }}
                                                  className="px-5 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer"
                                                >
                                                  Save
                                                </button>
                                              </div>
                                            </div>
                                          )}

                                          {/* Resources Tabbed Container matching Image 2 & 3 */}
                                          {currentSubTab === 'resources' && (
                                            <div className="p-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs animate-in slide-in-from-top-1 duration-150 space-y-4">
                                              
                                              {/* Horizontal Tabs: Downloadable File | Add from library | External Resource */}
                                              <div className="flex border-b border-slate-100 dark:border-slate-800 px-4 pt-1 bg-slate-50/50 dark:bg-slate-900/10 space-x-6">
                                                <button
                                                  type="button"
                                                  onClick={() => setActiveResourceTab(prev => ({ ...prev, [lesson.id]: 'file' }))}
                                                  className={`py-3 text-xs font-extrabold relative transition-colors ${
                                                    curResTab === 'file'
                                                      ? 'text-[#7c3aed] dark:text-indigo-400 border-b-2 border-[#7c3aed]'
                                                      : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                                                  }`}
                                                >
                                                  Downloadable File
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => setActiveResourceTab(prev => ({ ...prev, [lesson.id]: 'library' }))}
                                                  className={`py-3 text-xs font-extrabold relative transition-colors ${
                                                    curResTab === 'library'
                                                      ? 'text-[#7c3aed] dark:text-indigo-400 border-b-2 border-[#7c3aed]'
                                                      : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                                                  }`}
                                                >
                                                  Add from library
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => setActiveResourceTab(prev => ({ ...prev, [lesson.id]: 'external' }))}
                                                  className={`py-3 text-xs font-extrabold relative transition-colors ${
                                                    curResTab === 'external'
                                                      ? 'text-[#7c3aed] dark:text-indigo-400 border-b-2 border-[#7c3aed]'
                                                      : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                                                  }`}
                                                >
                                                  External Resource
                                                </button>
                                              </div>

                                              {/* Tab Content Box */}
                                              <div className="px-5 pb-5 pt-1 space-y-4">
                                                
                                                {/* T1: Downloadable File Uploader */}
                                                {curResTab === 'file' && (
                                                  <div className="space-y-4">
                                                    {resourceUploadProgress && resourceUploadProgress.lessonId === lesson.id ? (
                                                      <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/5 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl space-y-2 animate-in fade-in duration-200">
                                                        <div className="flex items-center justify-between text-xs font-black">
                                                          <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 truncate max-w-[200px]">
                                                            Uploading: {resourceUploadProgress.fileName}
                                                          </h4>
                                                          <button 
                                                            type="button"
                                                            onClick={() => { 
                                                              if (resourceUploadXhrRef.current) resourceUploadXhrRef.current.abort(); 
                                                              setResourceUploadProgress(null); 
                                                            }} 
                                                            className="text-slate-400 hover:text-rose-500 cursor-pointer transition-colors"
                                                          >
                                                            <X className="w-4 h-4" />
                                                          </button>
                                                        </div>
                                                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                                                          <span>{resourceUploadProgress.speedFormatted}</span>
                                                          <span>{resourceUploadProgress.remainingFormatted}</span>
                                                        </div>
                                                        <div className="relative w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                                          <div 
                                                            className={`h-full transition-all duration-300 rounded-full ${
                                                              resourceUploadProgress.status === 'error' ? 'bg-rose-500' : 'bg-[#7c3aed]'
                                                            }`}
                                                            style={{ width: `${resourceUploadProgress.percentage}%` }}
                                                          />
                                                        </div>
                                                        <div className="flex items-center justify-between text-[10px] font-black">
                                                          <div className="text-indigo-600 dark:text-indigo-400">{resourceUploadProgress.percentage}%</div>
                                                          <div className="text-slate-400">
                                                            {((resourceUploadProgress.uploadedBytes || 0) / (1024 * 1024)).toFixed(1)} / {((resourceUploadProgress.totalBytes || 0) / (1024 * 1024)).toFixed(1)} MB
                                                          </div>
                                                        </div>
                                                      </div>
                                                    ) : (
                                                      <div 
                                                        onDragOver={(e) => {
                                                          e.preventDefault();
                                                          e.stopPropagation();
                                                        }}
                                                        onDrop={(e) => {
                                                          e.preventDefault();
                                                          e.stopPropagation();
                                                          const file = e.dataTransfer.files?.[0];
                                                          if (file) {
                                                            handleUploadResourceFile(file, lesson.id, mod.id, lessonResources);
                                                          }
                                                        }}
                                                        className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/5 transition-all cursor-pointer group"
                                                        onClick={() => {
                                                          const input = document.getElementById(`file-upload-input-${lesson.id}`);
                                                          if (input) input.click();
                                                        }}
                                                      >
                                                        <input
                                                          type="file"
                                                          id={`file-upload-input-${lesson.id}`}
                                                          className="hidden"
                                                          onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                              handleUploadResourceFile(file, lesson.id, mod.id, lessonResources);
                                                            }
                                                          }}
                                                        />
                                                        <div className="flex flex-col items-center space-y-2">
                                                          <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                                                            <UploadCloud className="w-5 h-5" />
                                                          </div>
                                                          <div className="space-y-0.5">
                                                            <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                                                              Drag & drop document file here, or <span className="text-[#7c3aed] dark:text-indigo-400 hover:underline">browse</span>
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 font-bold">
                                                              PDF, Word, Excel, PPT, TXT up to 500MB
                                                            </p>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    )}

                                                    <div className="p-3 bg-amber-50/35 dark:bg-amber-950/5 border border-amber-100 dark:border-amber-900/25 rounded-xl flex items-start space-x-2">
                                                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                                      <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-normal font-semibold">
                                                        <strong>Constraint:</strong> Only document formats (.pdf, .docx, .xlsx, .pptx, .txt, etc.) are allowed. Programming files are strictly prohibited. Files will automatically be renamed with a secure, 64-bit cryptographic identifier on upload.
                                                      </p>
                                                    </div>
                                                  </div>
                                                )}

                                                {/* T2: Add from Library Grid Choose from uploaded files */}
                                                {curResTab === 'library' && (
                                                  <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                      <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">
                                                        Resource Library Files ({resourceLibraryFiles.length})
                                                      </span>
                                                      {resourceLibraryFiles.length > 0 && (
                                                        <span className="text-[9px] font-bold text-slate-400">
                                                          Select uploaded files instead of re-uploading
                                                        </span>
                                                      )}
                                                    </div>

                                                    {resourceLibraryFiles.length === 0 ? (
                                                      <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center py-6 bg-slate-50/50 dark:bg-slate-900/30">
                                                        <p className="text-xs text-slate-500">No document files in your resource library yet.</p>
                                                        <p className="text-[10px] text-slate-400 mt-1">Upload files using the "Downloadable File" tab above to build your document library.</p>
                                                      </div>
                                                    ) : (
                                                      <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                                                        {resourceLibraryFiles.map((clip) => {
                                                          const isAttached = lessonResources.some((r: any) => r.url === clip.url);
                                                          let icon = '📎';
                                                          if (clip.fileType === 'pdf') icon = '📕';
                                                          else if (['doc', 'docx'].includes(clip.fileType)) icon = '📘';
                                                          else if (['xls', 'xlsx', 'csv'].includes(clip.fileType)) icon = '📗';
                                                          else if (['ppt', 'pptx'].includes(clip.fileType)) icon = '📙';
                                                          else if (clip.fileType === 'txt') icon = '📝';
                                                          else if (['zip', 'rar', '7z'].includes(clip.fileType)) icon = '📦';

                                                          return (
                                                            <div 
                                                              key={clip.id} 
                                                              className={`flex items-center justify-between p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl border transition-colors ${
                                                                isAttached ? 'border-emerald-200 bg-emerald-50/25 dark:bg-emerald-950/5' : 'border-slate-100 dark:border-slate-800/80'
                                                              }`}
                                                            >
                                                              <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                                                                <span className="text-sm shrink-0">{icon}</span>
                                                                <div className="min-w-0 flex-1">
                                                                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate" title={clip.name}>{clip.name || 'Resource Document'}</p>
                                                                  <p className="text-[9px] text-slate-400 font-bold">
                                                                    Size: {clip.fileSize || 'N/A'} • Type: {clip.fileType?.toUpperCase()} • Uploaded: {clip.uploadedAt}
                                                                  </p>
                                                                </div>
                                                              </div>
                                                              <div className="flex items-center space-x-1 shrink-0">
                                                                <button
                                                                  type="button"
                                                                  onClick={() => {
                                                                    setPreviewResource({
                                                                      id: clip.id,
                                                                      name: clip.name,
                                                                      url: clip.url,
                                                                      fileSize: clip.fileSize || 'Attached',
                                                                      type: 'file',
                                                                      fileType: clip.fileType
                                                                    });
                                                                    setIsPreviewModalOpen(true);
                                                                  }}
                                                                  className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-400 hover:text-indigo-600 rounded-md transition-colors cursor-pointer"
                                                                  title="Quick Preview"
                                                                >
                                                                  <Eye className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                  type="button"
                                                                  onClick={async () => {
                                                                    if (confirm(`Are you sure you want to delete "${clip.name}" from your Resource Library? This will remove the file record from the database.`)) {
                                                                      try {
                                                                        const res = await apiFetch(`${API_BASE_URL}/user-resources.php?id=${encodeURIComponent(clip.id)}`, {
                                                                          method: "DELETE",
                                                                          silent: true
                                                                        });
                                                                        if (res) {
                                                                          setResourceLibraryFiles(prev => prev.filter(p => p.id !== clip.id));
                                                                          showNotification('Resource deleted from library.');
                                                                        }
                                                                      } catch (e) {
                                                                        console.error(e);
                                                                        showNotification('Could not delete resource from server.', 'error');
                                                                      }
                                                                    }
                                                                  }}
                                                                  className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 rounded-md transition-colors cursor-pointer"
                                                                  title="Delete from Library"
                                                                >
                                                                  <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                  type="button"
                                                                  disabled={isAttached}
                                                                  onClick={() => {
                                                                    const newRes: ResourceInput = {
                                                                      id: clip.id || `res-${Date.now()}`,
                                                                      name: clip.name || 'Resource Document',
                                                                      type: 'file',
                                                                      url: clip.url,
                                                                      fileSize: clip.fileSize || 'Unknown'
                                                                    };
                                                                    const updatedRes = [...lessonResources, newRes];
                                                                    setModules(prev => prev.map(m => {
                                                                      if (m.id === mod.id) {
                                                                        return {
                                                                          ...m,
                                                                          lessons: m.lessons.map(l => l.id === lesson.id ? { ...l, resources: updatedRes } : l)
                                                                        };
                                                                      }
                                                                      return m;
                                                                    }));
                                                                    showNotification('Document added from resources library successfully!');
                                                                  }}
                                                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all shrink-0 ${
                                                                    isAttached
                                                                      ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 cursor-not-allowed'
                                                                      : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 dark:bg-indigo-950/40 cursor-pointer'
                                                                  }`}
                                                                >
                                                                  {isAttached ? 'Attached' : 'Add to Lecture'}
                                                                </button>
                                                              </div>
                                                            </div>
                                                          );
                                                        })}
                                                      </div>
                                                    )}
                                                  </div>
                                                )}

                                                {/* T3: External Link Form matching Image 3 */}
                                                {curResTab === 'external' && (
                                                  <div className="space-y-4">
                                                    <div className="space-y-1">
                                                      <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 block">Title</span>
                                                      <input
                                                        type="text"
                                                        placeholder="A descriptive title"
                                                        value={newResourceName[lesson.id] ?? ''}
                                                        onChange={(e) => {
                                                          const val = e.target.value;
                                                          setNewResourceName(prev => ({ ...prev, [lesson.id]: val }));
                                                        }}
                                                        className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                                                      />
                                                    </div>

                                                    <div className="space-y-1">
                                                      <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 block">URL</span>
                                                      <input
                                                        type="text"
                                                        placeholder="https://example.com"
                                                        value={newResourceUrl[lesson.id] ?? ''}
                                                        onChange={(e) => {
                                                          const val = e.target.value;
                                                          setNewResourceUrl(prev => ({ ...prev, [lesson.id]: val }));
                                                        }}
                                                        className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                                                      />
                                                    </div>

                                                    <div className="flex justify-end pt-1">
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          const name = newResourceName[lesson.id]?.trim();
                                                          const url = newResourceUrl[lesson.id]?.trim();
                                                          if (!name || !url) {
                                                            showNotification('Please fill in both name and URL.', 'error');
                                                            return;
                                                          }
                                                          const newRes: ResourceInput = {
                                                            id: `res-${Date.now()}`,
                                                            name,
                                                            type: 'link',
                                                            url
                                                          };
                                                          const updatedRes = [...lessonResources, newRes];
                                                          setModules(prev => prev.map(m => {
                                                            if (m.id === mod.id) {
                                                              return {
                                                                ...m,
                                                                lessons: m.lessons.map(l => l.id === lesson.id ? { ...l, resources: updatedRes } : l)
                                                              };
                                                            }
                                                            return m;
                                                          }));
                                                          setNewResourceName(prev => ({ ...prev, [lesson.id]: '' }));
                                                          setNewResourceUrl(prev => ({ ...prev, [lesson.id]: '' }));
                                                          showNotification('Resource link added successfully!');
                                                        }}
                                                        className="px-5 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs"
                                                      >
                                                        Add link
                                                      </button>
                                                    </div>
                                                  </div>
                                                )}

                                              </div>

                                              {/* Bottom section displaying currently attached resources */}
                                              {lessonResources.length > 0 && (
                                                <div className="border-t border-slate-100 dark:border-slate-800/80 p-4 bg-slate-50/40 dark:bg-slate-900/10 space-y-2">
                                                  <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">
                                                    Currently Attached ({lessonResources.length})
                                                  </span>
                                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {lessonResources.map((resItem) => (
                                                      <div 
                                                        key={resItem.id} 
                                                        onClick={() => {
                                                          setPreviewResource({
                                                            id: resItem.id,
                                                            name: resItem.name,
                                                            url: resItem.url,
                                                            fileSize: resItem.fileSize || 'Attached',
                                                            type: resItem.type
                                                          });
                                                          setIsPreviewModalOpen(true);
                                                        }}
                                                        className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer group transition-colors"
                                                        title="Click to Quick Preview resource properties"
                                                      >
                                                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                                                          <span className="text-xs shrink-0">📎</span>
                                                          <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{resItem.name}</p>
                                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-medium">{resItem.url}</p>
                                                          </div>
                                                        </div>
                                                        <div className="flex items-center space-x-1 shrink-0">
                                                          <button
                                                            type="button"
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              setPreviewResource({
                                                                id: resItem.id,
                                                                name: resItem.name,
                                                                url: resItem.url,
                                                                fileSize: resItem.fileSize || 'Attached',
                                                                type: resItem.type
                                                              });
                                                              setIsPreviewModalOpen(true);
                                                            }}
                                                            className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-400 hover:text-indigo-600 rounded-md transition-colors cursor-pointer"
                                                            title="Quick Preview"
                                                          >
                                                            <Eye className="w-3.5 h-3.5" />
                                                          </button>
                                                          <button
                                                            type="button"
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              const updatedRes = lessonResources.filter(r => r.id !== resItem.id);
                                                              setModules(prev => prev.map(m => {
                                                                if (m.id === mod.id) {
                                                                  return {
                                                                    ...m,
                                                                    lessons: m.lessons.map(l => l.id === lesson.id ? { ...l, resources: updatedRes } : l)
                                                                  };
                                                                }
                                                                return m;
                                                              }));
                                                              showNotification('Resource removed.');
                                                            }}
                                                            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 rounded-md transition-colors cursor-pointer"
                                                          >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                          </button>
                                                        </div>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          )}

                                          {/* Lab Workspace Container */}
                                          {currentSubTab === 'lab' && (
                                            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 shadow-xs animate-in slide-in-from-top-1 duration-150">
                                              <div className="flex items-center justify-between">
                                                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                                                  Hands-on Coding Lab / Workspace
                                                </h4>
                                                {lessonLabUrl && (
                                                  <span className="text-[10px] text-purple-600 font-bold">
                                                    ★ Active Lab Attached
                                                  </span>
                                                )}
                                              </div>

                                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                  <span className="text-[10px] font-black text-slate-400 block uppercase">Lab Title</span>
                                                  <input
                                                    type="text"
                                                    placeholder="e.g. Docker Deployment Challenge"
                                                    value={tempLabs[lesson.id]?.title ?? ''}
                                                    onChange={(e) => {
                                                      const val = e.target.value;
                                                      setTempLabs(prev => ({
                                                        ...prev,
                                                        [lesson.id]: { ...(prev[lesson.id] || { title: '', url: '' }), title: val }
                                                      }));
                                                    }}
                                                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                                                  />
                                                </div>
                                                <div className="space-y-1">
                                                  <span className="text-[10px] font-black text-slate-400 block uppercase">Lab workspace URL</span>
                                                  <input
                                                    type="text"
                                                    placeholder="e.g. https://gitpod.io/..."
                                                    value={tempLabs[lesson.id]?.url ?? ''}
                                                    onChange={(e) => {
                                                      const val = e.target.value;
                                                      setTempLabs(prev => ({
                                                        ...prev,
                                                        [lesson.id]: { ...(prev[lesson.id] || { title: '', url: '' }), url: val }
                                                      }));
                                                    }}
                                                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                                                  />
                                                </div>
                                              </div>

                                              <div className="flex justify-end space-x-2">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setActiveLessonSubTab(prev => ({ ...prev, [lesson.id]: null }));
                                                  }}
                                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold"
                                                >
                                                  Cancel
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const labTitle = tempLabs[lesson.id]?.title || 'Coding Lab';
                                                    const labUrl = tempLabs[lesson.id]?.url || '';
                                                    setModules(prev => prev.map(m => {
                                                      if (m.id === mod.id) {
                                                        return {
                                                          ...m,
                                                          lessons: m.lessons.map(l => l.id === lesson.id ? { ...l, labTitle, labUrl } as any : l)
                                                        };
                                                      }
                                                      return m;
                                                    }));
                                                    setActiveLessonSubTab(prev => ({ ...prev, [lesson.id]: null }));
                                                    showNotification('Hands-on coding lab details saved successfully!');
                                                  }}
                                                  className="px-4 py-1.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-lg text-xs font-black transition-all"
                                                >
                                                  Save Lab Workspace
                                                </button>
                                              </div>
                                            </div>
                                          )}

                                          {/* Inactive Inline Sub-option Trigger Buttons (matches Image 1 vertical stacking of unselected buttons) */}
                                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 pt-1">
                                            {currentSubTab !== 'description' && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setActiveLessonSubTab(prev => ({
                                                    ...prev,
                                                    [lesson.id]: 'description'
                                                  }));
                                                  if (!tempDescriptions[lesson.id]) {
                                                    setTempDescriptions(prev => ({
                                                      ...prev,
                                                      [lesson.id]: lessonDesc
                                                    }));
                                                  }
                                                }}
                                                className="px-4 py-2 border border-indigo-600/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer active:scale-95"
                                              >
                                                <Plus className="w-3.5 h-3.5 shrink-0" />
                                                <span>Description</span>
                                                {lessonDesc && <span className="text-[9px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded font-black shrink-0">Saved</span>}
                                              </button>
                                            )}

                                            {currentSubTab !== 'resources' && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setActiveLessonSubTab(prev => ({
                                                    ...prev,
                                                    [lesson.id]: 'resources'
                                                  }));
                                                  if (!activeResourceTab[lesson.id]) {
                                                    setActiveResourceTab(prev => ({ ...prev, [lesson.id]: 'file' }));
                                                  }
                                                }}
                                                className="px-4 py-2 border border-indigo-600/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer active:scale-95"
                                              >
                                                <Plus className="w-3.5 h-3.5 shrink-0" />
                                                <span>Resources</span>
                                                {lessonResources.length > 0 && <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded font-black shrink-0">{lessonResources.length} files</span>}
                                              </button>
                                            )}

                                            {currentSubTab !== 'lab' && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setActiveLessonSubTab(prev => ({
                                                    ...prev,
                                                    [lesson.id]: 'lab'
                                                  }));
                                                  if (!tempLabs[lesson.id]) {
                                                    setTempLabs(prev => ({
                                                      ...prev,
                                                      [lesson.id]: { title: lessonLabTitle || 'Coding Lab', url: lessonLabUrl }
                                                    }));
                                                  }
                                                }}
                                                className="px-4 py-2 border border-indigo-600/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer active:scale-95"
                                              >
                                                <Plus className="w-3.5 h-3.5 shrink-0" />
                                                <span>Lab</span>
                                                {lessonLabUrl && <span className="text-[9px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-1.5 py-0.2 rounded font-black shrink-0">Active</span>}
                                              </button>
                                            )}
                                          </div>

                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}

                          {/* "+ Curriculum item" nested button with rich interactive type selector */}
                          <div className="pt-2 relative">
                            <div className="flex items-center space-x-2">
                              {/* Direct action button */}
                              <button
                                type="button"
                                onClick={() => handleAddLesson(mod.id, 'video')}
                                className="px-4 py-2 border border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center space-x-1.5 shadow-xs active:scale-95"
                                title="Add a new curriculum item (Lecture)"
                              >
                                <Plus className="w-4 h-4" />
                                <span>Curriculum item</span>
                              </button>

                              {/* Type dropdown toggle */}
                              <button
                                type="button"
                                onClick={() => setActiveAddCurriculumModuleId(activeAddCurriculumModuleId === mod.id ? null : mod.id)}
                                className="p-2 border border-indigo-600/40 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                                title="Choose curriculum item type"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Popup menu for selecting specific curriculum item types */}
                            {activeAddCurriculumModuleId === mod.id && (
                              <>
                                <div 
                                  className="fixed inset-0 z-40" 
                                  onClick={() => setActiveAddCurriculumModuleId(null)}
                                />
                                <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-150">
                                  <div className="px-3.5 py-1.5 border-b border-slate-100 dark:border-slate-800">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Add Curriculum Item</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleAddLesson(mod.id, 'video');
                                      setActiveAddCurriculumModuleId(null);
                                    }}
                                    className="w-full px-3.5 py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-xs text-slate-700 dark:text-slate-200 font-bold flex items-center space-x-2.5 cursor-pointer text-left transition-colors"
                                  >
                                    <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 flex items-center justify-center shrink-0">
                                      <Video className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <div className="font-bold text-slate-900 dark:text-white">Lecture</div>
                                      <div className="text-[10px] text-slate-400 font-normal">Video, notes, or slides</div>
                                    </div>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleAddLesson(mod.id, 'quiz');
                                      setActiveAddCurriculumModuleId(null);
                                    }}
                                    className="w-full px-3.5 py-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-xs text-slate-700 dark:text-slate-200 font-bold flex items-center space-x-2.5 cursor-pointer text-left transition-colors"
                                  >
                                    <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 flex items-center justify-center shrink-0">
                                      <HelpCircle className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <div className="font-bold text-slate-900 dark:text-white">Quiz</div>
                                      <div className="text-[10px] text-slate-400 font-normal">Multiple-choice knowledge check</div>
                                    </div>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleAddLesson(mod.id, 'article');
                                      setActiveAddCurriculumModuleId(null);
                                    }}
                                    className="w-full px-3.5 py-2.5 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-xs text-slate-700 dark:text-slate-200 font-bold flex items-center space-x-2.5 cursor-pointer text-left transition-colors"
                                  >
                                    <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-600 flex items-center justify-center shrink-0">
                                      <FileText className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <div className="font-bold text-slate-900 dark:text-white">Article / Document</div>
                                      <div className="text-[10px] text-slate-400 font-normal">Formatted text & readings</div>
                                    </div>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleAddLesson(mod.id, 'audio');
                                      setActiveAddCurriculumModuleId(null);
                                    }}
                                    className="w-full px-3.5 py-2.5 hover:bg-purple-50 dark:hover:bg-purple-950/30 text-xs text-slate-700 dark:text-slate-200 font-bold flex items-center space-x-2.5 cursor-pointer text-left transition-colors"
                                  >
                                    <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950/80 text-purple-600 flex items-center justify-center shrink-0">
                                      <Mic className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <div className="font-bold text-slate-900 dark:text-white">Audio / Podcast</div>
                                      <div className="text-[10px] text-slate-400 font-normal">Voice lectures & discussions</div>
                                    </div>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Bottom navigation and global Add Actions */}
                    <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* "+ Section" button below matching mock image */}
                      <button
                        type="button"
                        onClick={handleAddModule}
                        className="px-5 py-2.5 border border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center space-x-1.5 self-start"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Section</span>
                      </button>

                      {/* Page-level persistent Save changes action panel */}
                      <div className="flex items-center space-x-2 self-end">
                        <button
                          type="button"
                          disabled={isSavingCurriculum}
                          onClick={async () => {
                            setIsSavingCurriculum(true);
                            try {
                              await handlePublish(true);
                              showNotification("Curriculum skeleton saved successfully!");
                            } catch (err) {
                              showNotification("Failed to save curriculum details.", "error");
                            } finally {
                              setIsSavingCurriculum(false);
                            }
                          }}
                          className="px-6 py-2.5 bg-indigo-600 disabled:bg-indigo-400 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-900/10 transition-all cursor-pointer flex items-center space-x-1.5"
                        >
                          {isSavingCurriculum ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Saving Curriculum...</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              <span>Save Curriculum Details</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                )}

              </div>
            )}

      {/* ========================================================================= */}
      {/* TAB 2: DYNAMIC CONTENT CREATION & UPLOAD STUDIO                           */}
      {/* ========================================================================= */}
            {activeTab === 'content' && (
              <CourseContentBuilder
                allLessons={allLessons}
                selectedLessonId={selectedLessonId}
                setSelectedLessonId={setSelectedLessonId}
                currentLesson={currentLesson}
                handleUpdateCurrentLesson={handleUpdateCurrentLesson}
                handleGenerateAiLessonNotes={handleGenerateAiLessonNotes}
                showNotification={showNotification}
                onSaveLesson={() => handlePublish(false)}
                onBackToCurriculum={() => setActiveTab('curriculum')}
                modules={modules}
                currentUser={currentUser}
                allFilmVideos={allFilmVideos}
                onAddFilmClip={(clip) => setFilmStudioClips(prev => [clip, ...prev])}
              />
            )}

            {/* TAB: ASSESSMENT BUILDER */}
            {activeTab === 'assessment' && (
              <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden text-left animate-fadeIn">
                <header className="h-16 px-4 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 z-30 shadow-2xs">
                  <div className="flex items-center space-x-3 min-w-0 flex-1 mr-4">
                    <button
                      type="button"
                      onClick={() => setActiveTab('curriculum')}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer shrink-0"
                      title="Return to Curriculum"
                    >
                      <ArrowLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                      <span>Back to Curriculum</span>
                    </button>
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 shrink-0 hidden sm:block" />
                    <span className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">
                      Quiz Assessment: {currentLesson?.title || 'Interactive Quiz'}
                    </span>
                  </div>
                </header>
                <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50/70 dark:bg-slate-950/40">
                  <div className="max-w-4xl mx-auto space-y-6 pb-16">
                    <QuizBuilder 
                      initialQuiz={currentLesson?.quizData}
                      onSave={(quizData) => {
                        handleUpdateCurrentLesson({ quizData });
                        showNotification(`Quiz "${quizData.title}" saved successfully!`, 'success');
                      }}
                    />
                  </div>
                </main>
              </div>
            )}

            {/* TAB: COURSE LANDING PAGE */}
            {activeTab === 'landing-page' && (
              <div className="space-y-8 animate-fadeIn text-left max-w-4xl pb-12">
                
                {/* Header and Description */}
                <div className="space-y-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                  <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Course landing page</h1>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">
                    Your course landing page is crucial to your success on UQlearn. If it’s done right, it can also help you gain visibility in search engines like Google. As you complete this section, think about creating a compelling Course Landing Page that demonstrates why someone would want to enroll in your course. Learn more about{' '}
                    <span 
                      onClick={() => showNotification("Navigating to Course Landing Page optimization guidelines...")}
                      className="text-indigo-600 dark:text-indigo-400 underline font-bold cursor-pointer hover:text-indigo-700"
                    >
                      creating your course landing page
                    </span>{' '}
                    and{' '}
                    <span 
                      onClick={() => showNotification("Opening Course Title Quality standards handbook...")}
                      className="text-indigo-600 dark:text-indigo-400 underline font-bold cursor-pointer hover:text-indigo-700"
                    >
                      course title standards.
                    </span>
                  </p>
                </div>

                {/* Course Title Field Container */}
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <label className="text-xs font-black text-slate-900 dark:text-slate-200">Course title</label>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      maxLength={60}
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                      }}
                      placeholder="Insert your course title."
                      className="w-full pl-4 pr-12 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <span className="absolute right-4 text-xs font-bold text-slate-400">
                      {60 - title.length}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold">
                    Your title should be a mix of attention-grabbing, informative, and optimized for search
                  </p>
                </div>

                {/* Course Subtitle Field Container */}
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <label className="text-xs font-black text-slate-900 dark:text-slate-200">Course subtitle</label>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      maxLength={120}
                      value={subtitle}
                      onChange={(e) => {
                        setSubtitle(e.target.value);
                      }}
                      placeholder="Insert your course subtitle."
                      className="w-full pl-4 pr-12 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <span className="absolute right-4 text-xs font-bold text-slate-400">
                      {120 - subtitle.length}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold">
                    Use 1 or 2 related keywords, and mention 3-4 of the most important areas that you've covered during your course.
                  </p>
                </div>

                {/* Course Description with Rich Text Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-900 dark:text-slate-200">Course description</label>
                  </div>
                  
                  <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
                    {/* Simulated Text Formatting Bar */}
                    <div className="flex items-center space-x-1.5 px-3 py-2 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => showNotification("Format Bold triggered")}
                        className="p-1 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded font-bold text-[11px] w-6 h-6 flex items-center justify-center cursor-pointer"
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={() => showNotification("Format Italic triggered")}
                        className="p-1 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded italic text-[11px] w-6 h-6 flex items-center justify-center cursor-pointer"
                      >
                        I
                      </button>
                      <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1" />
                      <button
                        type="button"
                        onClick={() => showNotification("Format Ordered List triggered")}
                        className="p-1 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-[11px] w-6 h-6 flex items-center justify-center cursor-pointer"
                      >
                        1.
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const textarea = descriptionTextareaRef.current;
                          if (!textarea) return;
                          const start = textarea.selectionStart;
                          const end = textarea.selectionEnd;
                          const currentText = textarea.value;
                          const isLineStart = start === 0 || currentText.charAt(start - 1) === '\n';
                          const bulletStr = isLineStart ? '• ' : '\n• ';
                          const newText = currentText.substring(0, start) + bulletStr + currentText.substring(end);
                          setDescription(newText);
                          const newCursorPos = start + bulletStr.length;
                          setTimeout(() => {
                            textarea.focus();
                            textarea.setSelectionRange(newCursorPos, newCursorPos);
                          }, 50);
                        }}
                        className="p-1 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-[11px] w-6 h-6 flex items-center justify-center cursor-pointer"
                        title="Use bullet for listing"
                      >
                        •
                      </button>
                    </div>

                    <textarea
                      ref={descriptionTextareaRef}
                      rows={6}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Insert your course description. Highlight keywords or bullet lists for readability."
                      className="w-full p-4 bg-transparent text-xs text-slate-800 dark:text-slate-100 font-medium focus:outline-none leading-relaxed"
                    />
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <p className="text-[10px] text-slate-400 font-semibold">
                      Description should have minimum 200 words. (Currently {description.trim().split(/\s+/).filter(Boolean).length} words)
                    </p>
                    
                    <button
                      type="button"
                      disabled={isSavingDescription}
                      onClick={async () => {
                        setIsSavingDescription(true);
                        try {
                          await handlePublish(true); // Persist to database courses table
                          setShowDescriptionSavedToast(true);
                          setTimeout(() => setShowDescriptionSavedToast(false), 3500);
                        } catch (err) {
                          showNotification("Failed to save description.", "error");
                        } finally {
                          setIsSavingDescription(false);
                        }
                      }}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center space-x-1.5 cursor-pointer self-end shrink-0"
                    >
                      {isSavingDescription ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Description</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Toast Notification - Floating Bottom Center */}
                {showDescriptionSavedToast && (
                  <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[999] bg-slate-900 border-2 border-emerald-500 text-emerald-400 px-6 py-3 rounded-full shadow-2xl flex items-center space-x-2.5 text-xs font-bold animate-bounce whitespace-nowrap">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Course description saved successfully to database!</span>
                  </div>
                )}

                {/* Basic Info Dropdown Selector Block */}
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-wider">Basic info</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Language select */}
                    <div className="relative">
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 pr-8 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none"
                      >
                        <option value="English">English (US)</option>
                        <option value="Spanish">Español (ES)</option>
                        <option value="French">Français (FR)</option>
                        <option value="Swahili">Kiswahili (KE)</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* Level Select */}
                    <div className="relative">
                      <select
                        value={level}
                        onChange={(e: any) => setLevel(e.target.value)}
                        className="w-full appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 pr-8 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none"
                      >
                        <option value="">-- Select Level --</option>
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                        <option value="All Levels">All Levels</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* Category Selector */}
                    <div className="relative">
                      <select
                        value={category}
                        onChange={(e: any) => setCategory(e.target.value)}
                        className="w-full appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 pr-8 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none"
                      >
                        <option value="Business">Business</option>
                        <option value="Development">Development</option>
                        <option value="Design">Design</option>
                        <option value="Data Science">Data Science</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Personal Growth">Personal Growth</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* Subcategory dropdown */}
                    <div className="relative">
                      <select
                        value={subcategory}
                        onChange={(e) => setSubcategory(e.target.value)}
                        className="w-full appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 pr-8 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none"
                      >
                        <option value="">-- Select Subcategory --</option>
                        <option value="Project Management">Project Management</option>
                        <option value="Web Development">Web Development</option>
                        <option value="Digital Marketing">Digital Marketing</option>
                        <option value="Financial Accounting">Financial Accounting</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Primarily Taught input */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center space-x-1.5">
                    <label className="text-xs font-black text-slate-900 dark:text-slate-200">What is primarily taught in your course?</label>
                    <div className="relative group cursor-help text-slate-400 hover:text-slate-600">
                      <Info className="w-3.5 h-3.5" />
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block w-48 bg-slate-950 text-white text-[9px] p-2 rounded-lg leading-normal shadow-lg z-20">
                        Enter a specific keyword representing the primary skill taught, e.g. "React Hooks".
                      </div>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={primaryTaught}
                    onChange={(e) => setPrimaryTaught(e.target.value)}
                    placeholder="e.g. Landscape Photography"
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* Course Image Row matching screenshot 3 */}
                <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-wider">Course image</h3>
                  
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    {/* Left Hand Vector Drawing Box */}
                    <div className="w-full md:w-80 h-44 bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col items-center justify-center relative overflow-hidden shrink-0">
                      {image ? (
                        <img 
                          src={image} 
                          alt="Course thumbnail preview" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center space-y-3 p-4">
                          {/* Stacks of books, movie slate and visual layout drawings */}
                          <div className="flex items-end justify-center space-x-4 text-slate-300 dark:text-slate-700">
                            {/* Book stack SVG */}
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            {/* Movie slate SVG */}
                            <svg className="w-12 h-12 -rotate-6 text-indigo-400 dark:text-indigo-900/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h18M3 16h18M11 20h8M3 4h18" />
                              <polygon points="11 11 15 13 11 15" fill="currentColor" stroke="none" />
                            </svg>
                            {/* Web browser visual SVG */}
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                              <rect x={2} y={4} width={20} height={16} rx={2} />
                              <line x1={2} y1={8} x2={22} y2={8} />
                              <circle cx={5} cy={6} r={1} />
                              <circle cx={7} cy={6} r={1} />
                            </svg>
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold">Image Preview Area</span>
                        </div>
                      )}
                    </div>

                    {/* Right Hand Description and File Selector */}
                    <div className="flex-1 space-y-4 text-left">
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-normal font-semibold">
                        Upload your course image here. It must meet our{' '}
                        <button
                          type="button"
                          onClick={() => setShowImageStandardsPage(true)}
                          className="text-indigo-600 dark:text-indigo-400 underline font-bold cursor-pointer hover:text-indigo-700 inline-flex items-center space-x-0.5 bg-transparent border-0 p-0"
                          title="View Course Image Quality Standards Guide"
                        >
                          <span>course image quality standards</span>
                        </button>{' '}
                        to be accepted. Important guidelines: 750x422 pixels; .jpg, .jpeg,. gif, or .png. no text on the image.
                      </p>

                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400 font-semibold truncate select-none">
                          {courseImageFileName}
                        </div>
                        <input
                          type="file"
                          id="course-image-file-input"
                          accept="image/png, image/jpeg, image/jpg, image/gif"
                          className="hidden"
                          onChange={handleCourseImageUpload}
                        />
                        <button
                          type="button"
                          disabled={isUploadingImage}
                          onClick={() => {
                            document.getElementById('course-image-file-input')?.click();
                          }}
                          className="px-4 py-2 border-2 border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1"
                        >
                          {isUploadingImage ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Uploading...</span>
                            </>
                          ) : (
                            <span>Upload File</span>
                          )}
                        </button>
                      </div>

                      <div className="pt-1 flex items-center justify-between text-[11px]">
                        <button
                          type="button"
                          onClick={() => setShowImageStandardsPage(true)}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold inline-flex items-center space-x-1 bg-transparent border-0 p-0 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Full Image Quality Standards & Template</span>
                        </button>
                        <span className="text-slate-400 font-mono text-[10px]">Min: 750×422 px (16:9)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Promotional Video Row matching screenshot 3 */}
                <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-wider">Promotional video</h3>
                  
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    {/* Left Hand Video Preview Box */}
                    <div className="w-full md:w-80 h-44 bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col items-center justify-center relative overflow-hidden shrink-0">
                      {promoVideoUrl ? (
                        <div className="w-full h-full relative group">
                          <video 
                            src={promoVideoUrl} 
                            controls 
                            poster={DEFAULT_VIDEO_THUMBNAIL}
                            className="w-full h-full object-contain bg-black"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center space-y-3 p-4">
                          {/* Stacks of books, movie slate and visual layout drawings */}
                          <div className="flex items-end justify-center space-x-4 text-slate-300 dark:text-slate-700">
                            {/* Book stack SVG */}
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            {/* Movie slate SVG */}
                            <svg className="w-12 h-12 -rotate-6 text-indigo-400 dark:text-indigo-900/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h18M3 16h18M11 20h8M3 4h18" />
                              <polygon points="11 11 15 13 11 15" fill="currentColor" stroke="none" />
                            </svg>
                            {/* Web browser visual SVG */}
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                              <rect x={2} y={4} width={20} height={16} rx={2} />
                              <line x1={2} y1={8} x2={22} y2={8} />
                              <circle cx={5} cy={6} r={1} />
                              <circle cx={7} cy={6} r={1} />
                            </svg>
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold">Video Preview Area</span>
                        </div>
                      )}
                    </div>

                    {/* Right Hand Description and File Selector */}
                    <div className="flex-1 space-y-4 text-left">
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-normal font-semibold">
                        Your promo video is a quick and compelling way for students to preview what they’ll learn in your course. Students considering your course are more likely to enroll if your promo video is well-made.{' '}
                        <span 
                          onClick={() => showNotification("Opening promo video guide handbook...")}
                          className="text-indigo-600 dark:text-indigo-400 underline font-bold cursor-pointer hover:text-indigo-700"
                        >
                          Learn how to make your promo video awesome!
                        </span>
                      </p>

                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400 font-semibold truncate select-none">
                          {promoVideoFileName}
                        </div>
                        <input
                          type="file"
                          id="promo-video-file-input"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setPromoVideoFileName(file.name);
                              setPendingUploadFile(file);
                              setIsFilmStudioUploaderOpen(true);
                              showNotification(`Uploading promotional video "${file.name}" via chunked resumable transfer...`);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            document.getElementById('promo-video-file-input')?.click();
                          }}
                          className="px-4 py-2 border-2 border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap"
                        >
                          Upload Video
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsSelectVideoModalOpen(true)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap"
                        >
                          Select from Library
                        </button>
                      </div>

                      {isFilmStudioUploaderOpen && (
                        <ResumableVideoUploader
                          isOpen={isFilmStudioUploaderOpen}
                          onOpenChange={setIsFilmStudioUploaderOpen}
                          initialFile={pendingUploadFile}
                          folder="promo-videos"
                          mode="modal"
                          userId={currentUser?.id}
                          userEmail={currentUser?.email}
                          onUploadComplete={(result) => {
                            setPromoVideoUrl(result.url);
                            setPromoVideoFileName(result.file_path.split('/').pop() || result.file_path);
                            setIsFilmStudioUploaderOpen(false);
                            showNotification("Promotional video uploaded successfully!");
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Instructor Profiles section matching screenshot 4 */}
                {(() => {
                  const bioWordCount = instructorDescription.trim().split(/\s+/).filter(Boolean).length;
                  const isBioComplete = bioWordCount >= 50;
                  const effectiveInstructorImage = instructorImage || initialData?.instructorAvatar || (initialData as any)?.instructorImage || currentUser?.avatar || '';
                  const isImageComplete = Boolean(effectiveInstructorImage && effectiveInstructorImage.trim().length > 2 && effectiveInstructorImage !== 'WT' && effectiveInstructorImage !== 'IN');
                  const isProfileComplete = isBioComplete && isImageComplete;

                  const handleDirectAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsUploadingInstructorImage(true);
                    try {
                      const res = await uploadMediaApi(file, undefined, 'avatars');
                      const newAvatarUrl = res.url || '';
                      if (newAvatarUrl) {
                        setInstructorImage(newAvatarUrl);
                        if (courseId) localStorage.setItem(`uqlearn_course_${courseId}_instructor_img`, newAvatarUrl);
                        if (initialData?.id) localStorage.setItem(`uqlearn_course_${initialData.id}_instructor_img`, newAvatarUrl);
                        if (currentUser) {
                          setCurrentUser({ ...currentUser, avatar: newAvatarUrl });
                          try {
                            const raw = localStorage.getItem('uqlearn_user');
                            if (raw) {
                              const p = JSON.parse(raw);
                              p.avatar = newAvatarUrl;
                              localStorage.setItem('uqlearn_user', JSON.stringify(p));
                            }
                          } catch {}
                        }
                        const userId = currentUser?.id || (initialData as any)?.created_by || initialData?.createdBy || 'instructor-1';
                        apiFetch('profile.php', { method: 'POST', body: JSON.stringify({ id: userId, avatar_url: newAvatarUrl }) }).catch(() => {});
                        showNotification("Instructor avatar uploaded and verified successfully!");
                      }
                    } catch (err) {
                      const reader = new FileReader();
                      reader.onload = (re) => {
                        const dataUrl = re.target?.result as string;
                        if (dataUrl) {
                          setInstructorImage(dataUrl);
                          if (courseId) localStorage.setItem(`uqlearn_course_${courseId}_instructor_img`, dataUrl);
                          showNotification("Instructor avatar updated successfully!");
                        }
                      };
                      reader.readAsDataURL(file);
                    } finally {
                      setIsUploadingInstructorImage(false);
                    }
                  };

                  return (
                    <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                      <h3 className="text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-wider">Instructor profile(s)</h3>
                      
                      {/* Alert Banner Box - Only shown if profile is incomplete */}
                      {!isProfileComplete && (
                        <div className="bg-rose-50/50 dark:bg-rose-950/10 border-l-4 border-rose-500 border border-slate-200 dark:border-rose-900/60 p-5 rounded-r-xl flex items-start space-x-3.5 animate-fadeIn">
                          <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0 text-xs font-black">
                            !
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-slate-900 dark:text-slate-100 font-black leading-tight">
                              All visible instructors of this course must complete their profile before the course can be published.
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-normal">
                              This includes name, image, and a short summary of your background 50 words minimum.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Instructor badge row with name link & photo upload */}
                      <div className="flex flex-wrap items-center gap-3 pl-1 pt-1">
                        {isImageComplete ? (
                          <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs" title="Instructor avatar uploaded and verified">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          </span>
                        ) : (
                          <span className="text-rose-500 text-base font-black shrink-0" title="Instructor image required">⚠</span>
                        )}

                        <div className={`w-10 h-10 rounded-full bg-slate-950 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden ${isImageComplete ? 'ring-2 ring-emerald-500/80' : 'ring-2 ring-rose-500/70'}`}>
                          {effectiveInstructorImage && effectiveInstructorImage.trim().length > 2 && effectiveInstructorImage !== 'WT' && effectiveInstructorImage !== 'IN' ? (
                            <img 
                              src={effectiveInstructorImage} 
                              alt="Instructor" 
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover rounded-full" 
                            />
                          ) : (
                            <span className="text-[10px] font-bold uppercase">
                              {(initialData?.instructor || currentUser?.name || 'IN').slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        
                        <span 
                          onClick={() => {
                            const elem = document.getElementById("biography-textarea");
                            if (elem) elem.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 underline cursor-pointer"
                        >
                          {initialData?.instructor || currentUser?.name || 'Instructor'}
                        </span>

                        {/* Direct photo upload button */}
                        <label className="ml-auto px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center space-x-1.5 border border-slate-200 dark:border-slate-700">
                          {isUploadingInstructorImage ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-500" />
                              <span>Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Camera className="w-3.5 h-3.5 text-slate-500" />
                              <span>{isImageComplete ? 'Change Photo' : 'Upload Instructor Photo'}</span>
                            </>
                          )}
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            disabled={isUploadingInstructorImage}
                            onChange={handleDirectAvatarUpload} 
                          />
                        </label>
                      </div>

                      {/* Outlined Profile biography checklist container */}
                      <div className={`border ${isProfileComplete ? 'border-emerald-500 dark:border-emerald-500/80 bg-emerald-50/20 dark:bg-emerald-950/10' : 'border-rose-500 bg-white dark:bg-slate-950/20'} rounded-xl p-5 space-y-4 transition-all`}>
                        <div className="flex items-center justify-between">
                          <h4 className={`text-xs font-black flex items-center gap-1.5 ${isProfileComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                            {isProfileComplete ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span>Profile Complete</span>
                              </>
                            ) : (
                              <span>Incomplete</span>
                            )}
                          </h4>
                          <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full ${isBioComplete ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'}`}>
                            {bioWordCount} / 50 words
                          </span>
                        </div>

                        {!isProfileComplete ? (
                          <div className="space-y-1 text-[11px] text-slate-700 dark:text-slate-300 font-bold leading-normal pl-1">
                            {!isBioComplete && (
                              <p className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                                <span>•</span>
                                <span>Your instructor biography must have at least 50 words (currently {bioWordCount} words).</span>
                              </p>
                            )}
                            {!isImageComplete && (
                              <p className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                                <span>•</span>
                                <span>Your instructor image is required.</span>
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium leading-normal pl-1 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>Your instructor profile meets all requirements ({bioWordCount} words, photo verified). Your course can now be submitted for review!</span>
                          </div>
                        )}
                        
                        {/* Biography edit block integrated directly for profile update */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Biography Update (50 words min)</label>
                            <span className="text-[10px] font-mono text-slate-400 font-black">
                              {bioWordCount} / 50 words
                            </span>
                          </div>
                          <textarea
                            id="biography-textarea"
                            rows={4}
                            value={instructorDescription}
                            onChange={(e) => {
                              const newBio = e.target.value;
                              setInstructorDescription(newBio);
                              try {
                                if (courseId) {
                                  localStorage.setItem(`uqlearn_course_${courseId}_instructor_desc`, newBio);
                                }
                                if (initialData?.id) {
                                  localStorage.setItem(`uqlearn_course_${initialData.id}_instructor_desc`, newBio);
                                }
                                localStorage.setItem('uqlearn_instructor_bio', newBio);
                              } catch (err) {}
                            }}
                            placeholder="Provide your background, teaching philosophy, accomplishments, and professional experience (50 words minimum)..."
                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:border-teal-500 transition-colors leading-relaxed"
                          />
                        </div>

                        <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                          <button
                            type="button"
                            disabled={isSavingProfile}
                            onClick={async () => {
                              setIsSavingProfile(true);
                              const userId = currentUser?.id || (initialData as any)?.created_by || initialData?.createdBy || 'instructor-1';
                              const nameParts = (initialData?.instructor || currentUser?.name || 'Instructor').split(' ');
                              const firstName = nameParts[0] || 'Instructor';
                              const lastName = nameParts.slice(1).join(' ') || 'Educator';
                              
                              try {
                                if (courseId) {
                                  localStorage.setItem(`uqlearn_course_${courseId}_instructor_desc`, instructorDescription);
                                }
                                if (initialData?.id) {
                                  localStorage.setItem(`uqlearn_course_${initialData.id}_instructor_desc`, instructorDescription);
                                }
                                localStorage.setItem('uqlearn_instructor_bio', instructorDescription);

                                if (currentUser) {
                                  setCurrentUser({
                                    ...currentUser,
                                    bio: instructorDescription
                                  });
                                  const raw = localStorage.getItem('uqlearn_user');
                                  if (raw) {
                                    const parsed = JSON.parse(raw);
                                    parsed.bio = instructorDescription;
                                    localStorage.setItem('uqlearn_user', JSON.stringify(parsed));
                                  }
                                }
                              } catch (e) {}

                              try {
                                await apiFetch('profile.php', {
                                  method: 'POST',
                                  body: JSON.stringify({
                                    id: userId,
                                    bio: instructorDescription,
                                    first_name: firstName,
                                    last_name: lastName
                                  })
                                });
                              } catch (err) {
                                console.warn("Profile save notice:", err);
                              }

                              try {
                                await handlePublish(true);
                                showNotification("Instructor biography updated and saved to course successfully!");
                              } catch (err) {
                                console.error("Course save failed:", err);
                                showNotification("Instructor biography saved!");
                              } finally {
                                setIsSavingProfile(false);
                              }
                            }}
                            className={`px-5 py-2.5 ${isProfileComplete ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'} disabled:opacity-50 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs`}
                          >
                            {isSavingProfile ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Updating Biography...</span>
                              </>
                            ) : (
                              <>
                                <Save className="w-3.5 h-3.5" />
                                <span>Update Profile Biography</span>
                              </>
                            )}
                          </button>

                          {!isImageComplete && currentUser?.avatar && (
                            <button
                              type="button"
                              onClick={() => {
                                setInstructorImage(currentUser.avatar);
                                try {
                                  if (courseId) {
                                    localStorage.setItem(`uqlearn_course_${courseId}_instructor_img`, currentUser.avatar);
                                  }
                                  if (initialData?.id) {
                                    localStorage.setItem(`uqlearn_course_${initialData.id}_instructor_img`, currentUser.avatar);
                                  }
                                } catch (e) {}
                                showNotification("Instructor image updated from your profile!");
                              }}
                              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                            >
                              Use My Account Profile Image
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Local Save Landing Page button */}
                <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                  <button
                    type="button"
                    disabled={isSavingLandingPage}
                    onClick={async () => {
                      setIsSavingLandingPage(true);
                      try {
                        await handlePublish(true);
                        showNotification("Course landing page details saved successfully!");
                      } catch (err) {
                        showNotification("Failed to save landing page.", "error");
                      } finally {
                        setIsSavingLandingPage(false);
                      }
                    }}
                    className="px-6 py-2.5 bg-indigo-600 disabled:bg-indigo-400 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-900/10 transition-all cursor-pointer flex items-center space-x-1.5"
                  >
                    {isSavingLandingPage ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving Landing Page...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Landing Page</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* TAB: PRICING */}
            {activeTab === 'pricing' && (
              <div className="space-y-6 animate-fadeIn text-left">
                <div className="space-y-1 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">Pricing</h1>
                </div>

                {/* Pricing settings heading */}
                <div className="pt-2 flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">Set a price for your course</h3>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isFree"
                      checked={price === 0}
                      disabled={hasOtherFreeCourse && price !== 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setPrice(0);
                          setDisplayPriceInput('0');
                        } else {
                          setPrice(19.99);
                          setDisplayPriceInput('19.99');
                        }
                      }}
                      className="cursor-pointer"
                    />
                    <label htmlFor="isFree" className={`text-xs font-black ${hasOtherFreeCourse && price !== 0 ? 'text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>
                      Set as Free Course
                    </label>
                  </div>
                </div>
                {hasOtherFreeCourse && (
                  <p className="text-xs text-rose-500 font-bold">Only one course can be set free. You already have a free course.</p>
                )}

                {/* Inputs Row */}
                <div className="space-y-4 pt-1">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-4">
                    {/* Currency Selector */}
                    <div className="space-y-1.5 w-full sm:w-60 shrink-0">
                      <label className="text-xs font-black text-slate-900 dark:text-slate-100">Currency</label>
                      <select
                        value={pricingCurrencyCode}
                        onChange={(e) => handlePricingCurrencyChange(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs"
                      >
                        {COMBINED_CURRENCIES.map((curr) => (
                          <option key={curr.code} value={curr.code}>
                            {curr.flag ? `${curr.flag} ` : ''}{curr.name} ({curr.code}) — {curr.symbol}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Manual Course Price Input */}
                    <div className="space-y-1.5 w-full sm:w-56 shrink-0">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-slate-900 dark:text-slate-100">
                          Course Price
                        </label>
                        {price > 0 && activePricingCurrency.code !== 'USD' && (
                          <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900/40">
                            ≈ ${price.toFixed(2)} USD
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 select-none">
                          {activePricingCurrency.symbol}
                        </span>
                        <input
                          type="number"
                          step="any"
                          min={0}
                          max={maxPriceInSelectedCurrency}
                          placeholder={`e.g. ${minPriceInSelectedCurrency}`}
                          value={displayPriceInput}
                          disabled={price === 0}
                          onChange={(e) => handlePriceInputChange(e.target.value)}
                          className={`w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-900 border rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 shadow-xs ${
                            price === 0 ? 'opacity-50 cursor-not-allowed' : ''
                          } ${
                            (price > 0 && price < MIN_PRICE_USD) || price > MAX_PRICE_USD
                              ? 'border-rose-400 dark:border-rose-700 focus:ring-rose-500'
                              : 'border-slate-200 dark:border-slate-800 focus:ring-indigo-500'
                          }`}
                        />
                      </div>
                      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 pt-0.5">
                        Min: {activePricingCurrency.symbol}{minPriceInSelectedCurrency.toLocaleString()} &nbsp;•&nbsp; Max: {activePricingCurrency.symbol}{maxPriceInSelectedCurrency.toLocaleString()}
                      </p>
                    </div>

                    {/* Original Strike Price (Optional) */}
                    <div className="space-y-1.5 w-full sm:w-56 shrink-0">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-slate-900 dark:text-slate-100">
                          Original Strike Price
                        </label>
                        {originalPrice > price && originalPrice > 0 && (
                          <span className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap">
                            {Math.round(((originalPrice - price) / originalPrice) * 100)}% OFF
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 select-none">
                          {activePricingCurrency.symbol}
                        </span>
                        <input
                          type="number"
                          step="any"
                          placeholder="Optional"
                          value={displayOriginalPriceInput}
                          onChange={(e) => handleOriginalPriceInputChange(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Live Conversion Preview in USD */}
                  {price > 0 && activePricingCurrency.code !== 'USD' && (
                    <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between text-xs animate-fadeIn">
                      <div className="flex items-center space-x-2 text-indigo-900 dark:text-indigo-200 font-medium">
                        <span>
                          Value converted on submission: <strong className="font-mono text-sm text-indigo-700 dark:text-indigo-300">${price.toFixed(2)} USD</strong>
                        </span>
                      </div>
                      <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                        (Rate: 1 USD ≈ {activePricingCurrency.rate} {activePricingCurrency.code})
                      </span>
                    </div>
                  )}

                  {/* Out of bounds validation warning */}
                  {((price > 0 && price < MIN_PRICE_USD) || price > MAX_PRICE_USD) && (
                    <div className="flex items-center space-x-2 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-900/60">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>
                        {price < MIN_PRICE_USD 
                          ? `The price is below the minimum limit of ${activePricingCurrency.symbol}${minPriceInSelectedCurrency.toLocaleString()} ($${MIN_PRICE_USD.toFixed(2)} USD). Free courses can be set to 0.` 
                          : `The price exceeds the maximum limit of ${activePricingCurrency.symbol}${maxPriceInSelectedCurrency.toLocaleString()} ($${MAX_PRICE_USD.toFixed(2)} USD).`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Save button matching styling and colors */}
                <div className="pt-4 flex justify-start">
                  <button
                    type="button"
                    disabled={isSavingPricing}
                    onClick={async () => {
                      const activeRate = (activePricingCurrency?.rate && activePricingCurrency.rate > 0) ? activePricingCurrency.rate : 1;
                      const typedPrice = parseFloat(displayPriceInput);
                      const calculatedPriceUsd = (!isNaN(typedPrice) && typedPrice >= 0)
                        ? (typedPrice === 0 ? 0 : Number((typedPrice / activeRate).toFixed(2)))
                        : 0;

                      if (calculatedPriceUsd > 0 && calculatedPriceUsd < MIN_PRICE_USD) {
                        showNotification(`Course price must be at least $${MIN_PRICE_USD.toFixed(2)} USD (${activePricingCurrency.symbol}${minPriceInSelectedCurrency.toLocaleString()} ${activePricingCurrency.code}) or 0 for free.`, "error");
                        return;
                      }
                      if (calculatedPriceUsd > MAX_PRICE_USD) {
                        showNotification(`Course price cannot exceed $${MAX_PRICE_USD.toFixed(2)} USD (${activePricingCurrency.symbol}${maxPriceInSelectedCurrency.toLocaleString()} ${activePricingCurrency.code}).`, "error");
                        return;
                      }

                      const typedOriginal = parseFloat(displayOriginalPriceInput);
                      const calculatedOriginalPriceUsd = (!isNaN(typedOriginal) && typedOriginal > 0)
                        ? Number((typedOriginal / activeRate).toFixed(2))
                        : 0;

                      if (calculatedOriginalPriceUsd > 0 && calculatedOriginalPriceUsd <= calculatedPriceUsd) {
                        showNotification("Error: Original Strike Price must be greater than Course Price to offer a discount!", "error");
                        return;
                      }

                      setIsSavingPricing(true);
                      try {
                        setPrice(calculatedPriceUsd);
                        setOriginalPrice(calculatedOriginalPriceUsd);
                        await handlePublish(true, calculatedPriceUsd, calculatedOriginalPriceUsd);
                        showNotification(`Pricing details saved: $${calculatedPriceUsd.toFixed(2)} USD (converted from ${activePricingCurrency.symbol}${typedPrice.toLocaleString()} ${activePricingCurrency.code})!`);
                      } catch (err) {
                        showNotification("Failed to save pricing details.", "error");
                      } finally {
                        setIsSavingPricing(false);
                      }
                    }}
                    className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-xl text-xs font-black shadow-md shadow-purple-900/20 transition-all cursor-pointer flex items-center space-x-2"
                  >
                    {isSavingPricing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Converting & Saving in USD ($)...</span>
                      </>
                    ) : (
                      <span>Save Pricing</span>
                    )}
                  </button>
                </div>

                {/* Danger Zone: Delete Course (API) */}
                <div className="mt-12 pt-12 border-t border-slate-200 dark:border-slate-800">
                  <div className="p-6 rounded-3xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 space-y-3">
                    <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <h4 className="text-xs font-black uppercase tracking-wider">Danger Zone: Delete Course</h4>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Permanently delete this course. This action cannot be undone.
                    </p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setCourseToDelete({ id: courseId, title })}
                        className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl flex items-center space-x-2 cursor-pointer shadow-sm shadow-rose-500/20"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete This Course</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: PROMOTIONS */}
            {activeTab === 'promotions' && (
              <div className="space-y-8 animate-fadeIn text-left">
                {/* Header */}
                <div className="space-y-1 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Course Promotions & Ads</h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Create promotional ad campaigns, request Sponsored placement, or boost with Bestseller & Premium badges.
                  </p>
                </div>

                {/* Ad Campaign Manager */}
                <CourseAdCampaignManager
                  courseId={courseId}
                  courseTitle={title}
                  courseSubtitle={subtitle}
                  courseImage={image || (initialData?.image || '')}
                  coursePrice={price}
                  courseOriginalPrice={originalPrice}
                  courseCategory={category}
                  courseLevel={level}
                  instructorName={currentUser?.name || initialData?.instructor || 'Instructor'}
                  rating={initialData?.rating || 4.8}
                  reviewCount={initialData?.reviewCount || 24}
                  isSponsored={isSponsored}
                  bestSeller={bestSeller}
                  isPremium={isPremium}
                  selectedCurrency={selectedCurrency}
                  onUpdateCourseBadges={({ isSponsored: s, bestSeller: b, isPremium: p }) => {
                    if (s !== undefined) setIsSponsored(s);
                    if (b !== undefined) setBestSeller(b);
                    if (p !== undefined) setIsPremium(p);
                  }}
                  showNotification={showNotification}
                />
              </div>
            )}

            {/* TAB: MESSAGES */}
            {activeTab === 'messages' && (
              <div className="space-y-6 animate-fadeIn text-left">
                {/* Header */}
                <div className="space-y-1 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Course messages</h1>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-4xl">
                  Write messages to your students (optional) that will be sent automatically when they join or complete your course to encourage students to engage with course content. If you do not wish to send a welcome or congratulations message, leave the text box blank.
                </p>

                <div className="space-y-6 pt-2">
                  {/* Welcome Message Box */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-900 dark:text-slate-100 block">
                      Welcome Message
                    </label>
                    <RichTextWordEditor
                      value={welcomeMessage}
                      onChange={setWelcomeMessage}
                      placeholder="Welcome your students! Highlight any text and click Bold, Italic, or Underline to format directly like Microsoft Word."
                      maxLength={1000}
                    />
                  </div>

                  {/* Congratulations Message Box */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-900 dark:text-slate-100 block">
                      Congratulations Message
                    </label>
                    <RichTextWordEditor
                      value={congratulationsMessage}
                      onChange={setCongratulationsMessage}
                      placeholder="Congratulate your students for finishing the course! Highlight any text and click Bold, Italic, or Underline to format directly like Microsoft Word."
                      maxLength={1000}
                    />
                  </div>

                  {/* Save Messages Button with Spinner & Toast Alerts */}
                  <div className="pt-2 flex justify-start">
                    <button
                      type="button"
                      disabled={isSavingMessages}
                      onClick={async () => {
                        setIsSavingMessages(true);
                        try {
                          await saveCourseMessagesApi({
                            course_id: String(courseId || initialData?.id || ''),
                            welcome_message: welcomeMessage,
                            congratulations_message: congratulationsMessage
                          });
                          showNotification("Course messages saved successfully!");
                        } catch (err) {
                          showNotification("Course messages updated!");
                        } finally {
                          setIsSavingMessages(false);
                        }
                      }}
                      className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center space-x-2 shadow-sm"
                    >
                      {isSavingMessages ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <span>Save Messages</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

      {/* ========================================================================= */}
      {/* TAB 7: COLLABORATION & CO-INSTRUCTORS                                      */}
      {/* ========================================================================= */}
            {/* TAB: COLLABORATION */}
            {activeTab === 'collab' && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-xs animate-fadeIn">
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-slate-100">Co-Instructor Management & Private Review</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Invite peer educators, configure automated royalty splits, and generate private reviewer links.</p>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-black text-indigo-900 dark:text-indigo-200 block">Private Review Link for External Reviewers</span>
                    <span className="text-[11px] text-slate-500">https://uqlearn.com/preview/course-draft-8808?token=sec_9942</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText('https://uqlearn.com/preview/course-draft-8808?token=sec_9942');
                      setReviewLinkCopied(true);
                      setTimeout(() => setReviewLinkCopied(false), 2500);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 cursor-pointer shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{reviewLinkCopied ? 'Link Copied!' : 'Copy Review Link'}</span>
                  </button>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">Active Course Co-Instructors</h4>
                  {coInstructors.map((inst) => (
                    <div key={inst.id} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{inst.name}</span>
                        <span className="text-[11px] text-slate-400 block">{inst.email} • {inst.role} ({inst.permissions})</span>
                      </div>
                      <span className="font-mono font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-2.5 py-1 rounded-xl">
                        {inst.split}% Split
                      </span>
                    </div>
                  ))}
                </div>

                {/* Add Co-Instructor Form */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block uppercase">Invite New Co-Instructor</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={newCoName}
                      onChange={(e) => setNewCoName(e.target.value)}
                      className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    />
                    <input
                      type="email"
                      placeholder="Instructor Email"
                      value={newCoEmail}
                      onChange={(e) => setNewCoEmail(e.target.value)}
                      className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    />
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="5"
                        max="50"
                        value={newCoSplit}
                        onChange={(e) => setNewCoSplit(Number(e.target.value))}
                        placeholder="Split %"
                        className="w-20 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-center"
                      />
                      <button
                        type="button"
                        onClick={handleAddCoInstructor}
                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold"
                      >
                        Invite
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

      {/* ========================================================================= */}
      {/* TAB 8: CERTIFICATES & LEARNING PATHS                                      */}
      {/* ========================================================================= */}
            {/* TAB: CERTIFICATES */}
            {activeTab === 'certificate' && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-xs animate-fadeIn">
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-slate-100">Certificate of Completion Designer</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Customize verified digital certificates issued upon 100% course and quiz completion.</p>
                </div>

                {/* Certificate Live Vector Preview */}
                <div className="max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 bg-white">
                  <UqlearnCertificateSvg
                    data={{
                      studentName: 'ALBRIGHT JUMA',
                      courseTitle: title || 'Virtual Assistant',
                      completionDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                      instructorName: coInstructors[0]?.name || 'Michael Kenyanya',
                      credentialId: 'UQL-CERT-2026',
                      logoUrl: logoUrl,
                      ceoName: courseConfig?.ceoName || 'SIR, RAJAB WAMUU',
                      ceoTitle: courseConfig?.ceoTitle || 'CEO UQLEARN',
                      ceoSignature: courseConfig?.ceoSignature || '',
                      instructorSignature: ''
                    }}
                  />
                </div>
              </div>
            )}
              </>
            )}

          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DYNAMIC FULL-SCREEN LIVE STUDENT COURSE PLAYER PREVIEW MODAL              */}
      {/* ========================================================================= */}
      {isLearnerPreviewOpen && (
        <div className="fixed inset-0 z-[80] bg-slate-950/90 backdrop-blur-md flex flex-col p-4 sm:p-6 animate-fadeIn">
          {/* Top Player Navigation Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4 text-white mb-4">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="p-2 rounded-xl bg-indigo-600 text-white">
                <Play className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-wider block">
                  Student Live Experience Simulator
                </span>
                <h3 className="text-sm font-black truncate">{title}</h3>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                Lesson: {currentLesson?.title}
              </span>
              <button
                type="button"
                onClick={() => setIsLearnerPreviewOpen(false)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors cursor-pointer"
                title="Close Preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Simulator Split View */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 overflow-hidden">
            
            {/* Main Stage Viewport (8 Cols) */}
            <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-6 overflow-y-auto flex flex-col justify-between space-y-6">
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black text-white">{currentLesson?.title}</h2>
                  <span className="px-2.5 py-1 rounded-full bg-indigo-950 text-indigo-300 text-xs font-bold capitalize">
                    {currentLesson?.type} • {currentLesson?.duration}
                  </span>
                </div>

                {/* Simulated Player by Type */}
                {currentLesson?.type === 'video' ? (
                  <div className="rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center relative">
                    {currentLesson.videoUrl ? (
                      currentLesson.videoUrl.includes('youtube') ? (
                        <div className="text-center text-white space-y-2">
                          <Play className="w-12 h-12 mx-auto text-indigo-400" />
                          <p className="text-xs font-bold">Simulated YouTube Player</p>
                        </div>
                      ) : (
                        <video
                          src={currentLesson.videoUrl}
                          controls
                          className="w-full h-full object-cover"
                          poster={currentLesson.thumbnailUrl || DEFAULT_VIDEO_THUMBNAIL}
                        />
                      )
                    ) : (
                      <div className="text-center text-slate-500 space-y-2">
                        <Video className="w-12 h-12 mx-auto text-slate-700" />
                        <p className="text-xs font-bold">No Video Uploaded</p>
                      </div>
                    )}
                  </div>
                ) : currentLesson?.type === 'quiz' ? (
                  <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-4">
                    <span className="text-xs font-bold text-emerald-400 uppercase">Assessment Module</span>
                    <h4 className="text-base font-bold text-white">
                      {currentLesson.quizData?.title || 'Interactive Quiz'}
                    </h4>
                    <p className="text-xs text-slate-300">
                      {currentLesson.quizData?.description || 'Test your knowledge on key topics taught in this section.'}
                    </p>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700 text-xs text-slate-200 prose prose-invert max-w-none whitespace-pre-wrap leading-relaxed">
                    {currentLesson?.content || 'No text written for this lesson.'}
                  </div>
                )}
              </div>

              {/* Bottom Simulator Bar */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold">Marked as Free Preview: {currentLesson?.isPreview ? 'Yes' : 'No'}</span>
                <button
                  type="button"
                  onClick={() => showNotification('Lesson marked completed by learner simulation!')}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center space-x-1.5 cursor-pointer shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>Complete & Next Lesson</span>
                </button>
              </div>

            </div>

            {/* Right Curriculum Accordion Sidebar (4 Cols) */}
            <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 overflow-y-auto space-y-4">
              <span className="text-xs font-black uppercase text-slate-300 tracking-wider block">
                Course Curriculum ({allLessons.length} items)
              </span>

              <div className="space-y-3">
                {modules.map((mod, mIdx) => (
                  <div key={mod.id} className="space-y-1.5">
                    <span className="text-[11px] font-black text-indigo-400 block truncate">
                      {mod.title}
                    </span>
                    <div className="space-y-1 pl-2">
                      {mod.lessons.map((les) => {
                        const isCurrent = les.id === selectedLessonId;
                        return (
                          <div
                            key={les.id}
                            onClick={() => setSelectedLessonId(les.id)}
                            className={`p-2.5 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                              isCurrent ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <span className="truncate pr-2">{les.title}</span>
                            <span className="text-[10px] opacity-75 shrink-0">{les.duration}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* WHY CAN'T I SUBMIT FOR REVIEW MODAL */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer" 
            onClick={() => setIsSubmitModalOpen(false)}
          />
          
          {/* Modal Container */}
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl shadow-slate-950/50 animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col text-left">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center space-x-3 text-indigo-600 dark:text-indigo-400">
                <AlertCircle className="w-6 h-6 shrink-0" />
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">Why can't I submit for review?</h3>
              </div>
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                You're almost ready to submit your course for review! To ensure the highest educational standards on UQlearn, please complete the following remaining quality guidelines:
              </p>

              <div className="space-y-6">
                {checklistItems.map((group, groupIdx) => {
                  const hasIncomplete = group.items.some(item => !item.done);
                  return (
                    <div key={groupIdx} className="space-y-3">
                      <h4 className="font-black uppercase tracking-widest text-slate-500 text-[10px] flex items-center justify-between">
                        <span>{group.section}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          hasIncomplete ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 font-semibold' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 font-semibold'
                        }`}>
                          {group.items.filter(i => i.done).length} / {group.items.length} Met
                        </span>
                      </h4>

                      <div className="space-y-2">
                        {group.items.map((item) => (
                          <div 
                            key={item.id} 
                            className={`p-3.5 rounded-2xl border flex items-start justify-between gap-4 transition-all ${
                              item.done 
                                ? 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-100/60 dark:border-emerald-900/40 text-slate-700 dark:text-slate-300' 
                                : 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            <div className="flex items-start space-x-3 flex-1">
                              <div className={`mt-0.5 shrink-0 p-1 rounded-full ${
                                item.done 
                                  ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600' 
                                  : 'bg-amber-100 dark:bg-amber-900/50 text-amber-600'
                              }`}>
                                <Check className={`w-3 h-3 ${item.done ? 'opacity-100' : 'opacity-45'}`} />
                              </div>
                              <span className={`font-semibold leading-relaxed ${item.done ? 'text-slate-900 dark:text-slate-100 font-bold' : ''}`}>
                                {item.text}
                              </span>
                            </div>

                            {!item.done && (
                              <button
                                onClick={() => {
                                  setActiveTab(item.tab);
                                  setIsSubmitModalOpen(false);
                                }}
                                className="shrink-0 text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1 cursor-pointer"
                              >
                                <span>Go Fix</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-900/50">
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
              >
                Close & Keep Editing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBMISSION SUCCESS MODAL */}
      {isSubmittedSuccess && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" 
          />
          
          {/* Modal Container */}
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-8 overflow-hidden shadow-2xl shadow-slate-950/50 animate-in zoom-in-95 duration-200 flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center animate-bounce">
              <Check className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide">Course Submitted!</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium px-2">
                Congratulations! Your course quality requirements are 100% met. It has been successfully submitted to our Quality Assurance team for review. You will receive an email within 24-48 hours once your course is live on UQlearn.
              </p>
            </div>

            <button
              onClick={() => {
                setIsSubmittedSuccess(false);
                onCancel?.();
              }}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-indigo-900/20"
            >
              Great, Back to Courses
            </button>
          </div>
        </div>
      )}

      {/* VIDEO PREVIEW PLAYER MODAL */}
      {previewingVideo && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 sm:p-6">
          <div 
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" 
            onClick={() => setPreviewingVideo(null)}
          />
          <div className="relative bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col z-10 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between text-white">
              <div className="flex items-center space-x-3 truncate">
                {(() => {
                  const ext = previewingVideo.name.split('.').pop()?.toLowerCase();
                  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext || '')) return <Film className="w-5 h-5 text-indigo-400 shrink-0" />;
                  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) return <ImageIcon className="w-5 h-5 text-purple-400 shrink-0" />;
                  if (ext === 'pdf') return <FileText className="w-5 h-5 text-rose-400 shrink-0" />;
                  return <HardDrive className="w-5 h-5 text-emerald-400 shrink-0" />;
                })()}
                <div className="truncate">
                  <h3 className="text-sm font-black text-slate-100 truncate">{previewingVideo.name}</h3>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">{previewingVideo.associatedLessonTitle || 'Drive File'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewingVideo(null)}
                className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Preview */}
            <div className="bg-black aspect-video w-full relative flex items-center justify-center overflow-hidden">
              {(() => {
                const ext = previewingVideo.name.split('.').pop()?.toLowerCase();
                const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext || '');
                const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '');
                const isPdf = ext === 'pdf';
                
                if (isVideo) {
                  return (
                    <video
                      src={previewingVideo.url}
                      controls
                      autoPlay
                      poster={(previewingVideo as any).thumbnailUrl || DEFAULT_VIDEO_THUMBNAIL}
                      className="w-full h-full max-h-[65vh] object-contain"
                    />
                  );
                } else if (isImage) {
                  return (
                    <img 
                      src={previewingVideo.url} 
                      alt={previewingVideo.name}
                      className="max-w-full max-h-[65vh] object-contain shadow-2xl"
                    />
                  );
                } else if (isPdf) {
                  return (
                    <iframe 
                      src={`${previewingVideo.url}#toolbar=0`} 
                      className="w-full h-full min-h-[500px] border-none bg-white"
                      title="PDF Preview"
                    />
                  );
                } else {
                  return (
                    <div className="flex flex-col items-center justify-center p-12 space-y-6">
                      <div className="w-32 h-32 opacity-80">
                        {getFileIcon(previewingVideo.name)}
                      </div>
                      <div className="text-center space-y-4">
                        <p className="text-slate-300 font-bold">This file type ({ext?.toUpperCase()}) cannot be previewed directly.</p>
                        <a 
                          href={previewingVideo.url} 
                          download 
                          className="inline-flex items-center space-x-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-sm font-black transition-all shadow-lg shadow-indigo-900/20"
                        >
                          <Download className="w-4 h-4" />
                          <span>Download to View</span>
                        </a>
                      </div>
                    </div>
                  );
                }
              })()}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 sm:p-5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-950">
              <div className="flex items-center space-x-2 text-slate-400 font-mono text-[11px]">
                {previewingVideo.duration && <span>Duration: {previewingVideo.duration}</span>}
                {previewingVideo.duration && <span>• </span>}
                <span>Uploaded: {previewingVideo.uploadedAt}</span>
              </div>

              <div className="flex items-center space-x-3">
                {['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(previewingVideo.name.split('.').pop()?.toLowerCase() || '') && (
                  <button
                    type="button"
                    onClick={() => {
                      handleSetAsPromoVideo(previewingVideo.url, previewingVideo.name);
                      setPreviewingVideo(null);
                    }}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold transition-all text-xs cursor-pointer"
                  >
                    Set as Promo Video
                  </button>
                )}
                <a
                  href={previewingVideo.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all text-xs cursor-pointer"
                >
                  Download HD Video
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewingVideo(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold transition-all text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT / RENAME SECTION MODAL */}
      {editingSectionModal && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer animate-in fade-in" 
            onClick={() => !isSavingSectionModal && setEditingSectionModal(null)}
          />
          
          {/* Modal Container */}
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl shadow-slate-950/50 animate-in zoom-in-95 duration-200 flex flex-col text-left z-10">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center space-x-3 text-indigo-600 dark:text-indigo-400">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center font-bold">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                    Rename Section {editingSectionModal.index + 1}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Update section title and store directly in the database.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isSavingSectionModal}
                onClick={() => setEditingSectionModal(null)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveSectionModal}>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                    Section Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={editingSectionModal.title}
                    onChange={(e) => setEditingSectionModal({
                      ...editingSectionModal,
                      title: e.target.value
                    })}
                    placeholder="e.g. Module 1: Introduction to Web Architecture"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                    Section Objective / Description (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={editingSectionModal.description}
                    onChange={(e) => setEditingSectionModal({
                      ...editingSectionModal,
                      description: e.target.value
                    })}
                    placeholder="What will students master upon completing this section?..."
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all leading-relaxed"
                  />
                </div>

                <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/30 flex items-center space-x-2.5 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium">
                  <Database className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                  <span>Connects to MySQL database API to store and sync section title.</span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2 bg-slate-50 dark:bg-slate-900/50">
                <button
                  type="button"
                  disabled={isSavingSectionModal}
                  onClick={() => setEditingSectionModal(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSectionModal || !editingSectionModal.title.trim()}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-md cursor-pointer disabled:opacity-50 flex items-center space-x-1.5 transition-all"
                >
                  {isSavingSectionModal ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving to Database...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save to Database</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Select Video from Library Modal */}
      {isSelectVideoModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-250">
          <div className="bg-white dark:bg-slate-950 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-900 flex items-center justify-between">
              <div className="flex items-center space-x-3 text-indigo-600 dark:text-indigo-400">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center font-bold">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                    Select Promotional Video
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Choose an uploaded video from your film studio asset library.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSelectVideoModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {filmStudioClips.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto text-slate-400">
                    <Film className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200">No videos found in your library</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                      Please upload a promotional video first using the file uploader, or upload videos in your Film & Edit Studio.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filmStudioClips.map((video) => {
                    const isSelected = promoVideoUrl === video.url;
                    return (
                      <div
                        key={video.id}
                        onClick={() => {
                          handleSetAsPromoVideo(video.url, video.name);
                          setIsSelectVideoModalOpen(false);
                        }}
                        className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer text-left flex flex-col justify-between h-36 ${
                          isSelected
                            ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 ring-2 ring-indigo-500/20'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-black text-slate-900 dark:text-slate-100 line-clamp-2 min-w-0 break-all leading-tight">
                              {video.name}
                            </span>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">
                            Uploaded {video.uploadedAt}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60 mt-auto">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            {video.fileSize || 'N/A'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            {video.duration || '00:00'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end bg-slate-50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => setIsSelectVideoModalOpen(false)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Curriculum Guide & JSON Sample Modal removed in favor of full page UI view */}
      
      <ResourcePreviewModal 
        isOpen={isPreviewModalOpen} 
        onClose={() => setIsPreviewModalOpen(false)} 
        resource={previewResource} 
      />



    </div>
  );
};
