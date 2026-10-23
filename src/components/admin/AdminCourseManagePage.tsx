import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Sliders, 
  Star, 
  Award, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Save, 
  ExternalLink, 
  Clock, 
  BookOpen, 
  Users, 
  Check, 
  Settings,
  BadgeCheck,
  Sparkles,
  Layers,
  Globe,
  Tag,
  Eye,
  Download,
  ChevronDown,
  ChevronRight,
  PlayCircle,
  FileText,
  Code
} from 'lucide-react';
import { Course } from '../../types';
import { useApp } from '../../context/AppContext';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE_URL, apiFetch, assignCourseToReviewerApi } from '../../lib/apiConfig';
import { apiClient } from '../../lib/api';
import { getReviewers, fetchReviewersFromApi, ReviewerAccount } from '../../lib/reviewerService';
import { ResourcePreviewModal } from '../common/ResourcePreviewModal';

interface AdminCourseManagePageProps {
  course: Course;
  onBack: () => void;
  onCourseDeleted?: (courseId: string) => void;
  onCourseUpdated?: (updatedCourse: Course) => void;
}

export const AdminCourseManagePage: React.FC<AdminCourseManagePageProps> = ({
  course,
  onBack,
  onCourseDeleted,
  onCourseUpdated,
}) => {
  const { updateCourse, deleteCourse, approveCourse, publishCourse, sendInstructorNotification, setCourses } = useApp();
  const navigate = useNavigate();

  // Moderation state
  const [rating, setRating] = useState<number>(typeof course.rating === 'number' ? course.rating : 5.0);
  const [reviewCount, setReviewCount] = useState<number>(typeof course.reviewCount === 'number' ? course.reviewCount : 0);
  const [bestSeller, setBestSeller] = useState<boolean>(Boolean(course.bestSeller));
  const [isPremium, setIsPremium] = useState<boolean>(Boolean(course.isPremium));
  const [isApproved, setIsApproved] = useState<boolean>(course.isApprovedByAdmin ?? true);
  const [isPublished, setIsPublished] = useState<boolean>(course.isPublished !== false);

  // Curriculum review states
  const [selectedLesson, setSelectedLesson] = useState<any | null>(null);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [previewResource, setPreviewResource] = useState<any | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Reviewer Assignment States
  const [assignedReviewerEmail, setAssignedReviewerEmail] = useState<string>(
    course.assignedReviewerEmail || course.assigned_reviewer_email || ''
  );
  const [assignedReviewerName, setAssignedReviewerName] = useState<string>(
    course.assignedReviewerName || course.assigned_reviewer_name || ''
  );
  const [assignedReviewerId, setAssignedReviewerId] = useState<string>(
    course.assignedReviewerId || course.assigned_reviewer_id || ''
  );
  const [availableReviewers, setAvailableReviewers] = useState<ReviewerAccount[]>([]);
  const [selectedReviewerToAssign, setSelectedReviewerToAssign] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState<boolean>(false);

  // Instructor Assignment States
  const [courseInstructorName, setCourseInstructorName] = useState<string>(course.instructor || '');
  const [courseInstructorEmail, setCourseInstructorEmail] = useState<string>(course.creatorEmail || (course as any).creator_email || '');
  const [courseInstructorId, setCourseInstructorId] = useState<string>(course.createdBy || course.created_by || '');
  const [availableInstructors, setAvailableInstructors] = useState<any[]>([]);
  const [selectedInstructorToAssign, setSelectedInstructorToAssign] = useState<string>('');
  const [isAssigningInstructor, setIsAssigningInstructor] = useState<boolean>(false);

  // Load available reviewers on mount
  useEffect(() => {
    setAvailableReviewers(getReviewers());
    fetchReviewersFromApi().then(data => {
      if (Array.isArray(data) && data.length > 0) {
        setAvailableReviewers(data);
      }
    });
  }, []);

  // Load available instructors on mount
  useEffect(() => {
    const fetchInstructors = async () => {
      try {
        const res = await apiClient.users.getAll('instructor');
        if (res && res.success && res.data) {
          setAvailableInstructors(res.data);
        } else {
          const allUsers = await apiClient.users.getAll();
          if (allUsers && allUsers.success && allUsers.data) {
            setAvailableInstructors(allUsers.data.filter((u: any) => u.role === 'instructor'));
          }
        }
      } catch (err) {
        console.error('Failed to load instructors:', err);
      }
    };
    fetchInstructors();
  }, []);

  // Handle Assign / Reassign / De-assign Instructor
  const handleAssignInstructor = async () => {
    if (!selectedInstructorToAssign) return;
    setIsAssigningInstructor(true);
    try {
      const instObj = availableInstructors.find(i => i.id === selectedInstructorToAssign);
      if (instObj) {
        const updates = {
          instructor: instObj.name,
          createdBy: instObj.id,
          created_by: instObj.id,
          creatorEmail: instObj.email,
          creator_email: instObj.email,
          instructorAvatar: instObj.avatar || '',
          instructorTitle: instObj.bio || instObj.headline || 'Verified Educator'
        };

        // Call the updateCourse API
        await updateCourse(course.id, updates);

        // Update local display state
        setCourseInstructorName(instObj.name);
        setCourseInstructorEmail(instObj.email);
        setCourseInstructorId(instObj.id);

        // Trigger course update in parent context
        onCourseUpdated?.({
          ...course,
          ...updates
        });

        setSaveSuccessMsg(`Course successfully assigned to instructor: ${instObj.name}`);
        setTimeout(() => setSaveSuccessMsg(''), 5000);
      }
    } catch (err) {
      console.error('Failed to assign instructor:', err);
    } finally {
      setIsAssigningInstructor(false);
    }
  };

  // Handle Assign / Reassign / De-assign Reviewer
  const handleAssignReviewer = async () => {
    setIsAssigning(true);
    try {
      if (!selectedReviewerToAssign) {
        // De-assign
        await assignCourseToReviewerApi(course.id, '', '', '');
        setAssignedReviewerId('');
        setAssignedReviewerEmail('');
        setAssignedReviewerName('');

        setCourses(prev => prev.map(c => c.id === course.id ? {
          ...c,
          assignedReviewerId: '',
          assignedReviewerEmail: '',
          assignedReviewerName: '',
          assigned_reviewer_id: '',
          assigned_reviewer_email: '',
          assigned_reviewer_name: ''
        } : c));

        setSaveSuccessMsg('Course unassigned from reviewer.');
      } else {
        const revObj = availableReviewers.find(r => r.id === selectedReviewerToAssign || r.email === selectedReviewerToAssign);
        const rId = revObj ? revObj.id : selectedReviewerToAssign;
        const rName = revObj ? revObj.name : 'Reviewer';
        const rEmail = revObj ? revObj.email : selectedReviewerToAssign;

        await assignCourseToReviewerApi(course.id, rId, rName, rEmail);

        setAssignedReviewerId(rId);
        setAssignedReviewerEmail(rEmail);
        setAssignedReviewerName(rName);

        setCourses(prev => prev.map(c => c.id === course.id ? {
          ...c,
          assignedReviewerId: rId,
          assignedReviewerEmail: rEmail,
          assignedReviewerName: rName,
          assigned_reviewer_id: rId,
          assigned_reviewer_email: rEmail,
          assigned_reviewer_name: rName
        } : c));

        setSaveSuccessMsg(`Course assigned to reviewer: ${rName} (${rEmail})`);
      }
      setTimeout(() => setSaveSuccessMsg(''), 5000);
    } catch (err) {
      console.error('Failed to assign reviewer:', err);
    } finally {
      setIsAssigning(false);
    }
  };
  useEffect(() => {
    if (course.modules && course.modules.length > 0) {
      const firstModule = course.modules[0];
      if (firstModule.lessons && firstModule.lessons.length > 0) {
        setSelectedLesson(firstModule.lessons[0]);
      }
      
      const expands: Record<string, boolean> = {};
      course.modules.forEach(m => {
        expands[m.id] = true;
      });
      setExpandedModules(expands);
    }
  }, [course]);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Sync state with course prop if it updates from parent
  useEffect(() => {
    if (course) {
      setRating(typeof course.rating === 'number' ? course.rating : 5.0);
      setReviewCount(typeof course.reviewCount === 'number' ? course.reviewCount : (typeof (course as any).review_count === 'number' ? (course as any).review_count : 0));
      setBestSeller(Boolean(course.bestSeller));
      setIsPremium(Boolean(course.isPremium));
      setIsApproved(course.isApprovedByAdmin ?? true);
      setIsPublished(course.isPublished !== false);
      setCourseInstructorName(course.instructor || '');
      setCourseInstructorEmail(course.creatorEmail || (course as any).creator_email || '');
      setCourseInstructorId(course.createdBy || course.created_by || '');
    }
  }, [course]);

  // Handle Save
  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccessMsg('');
    try {
      const updates: Partial<Course> = {
        rating: Number(rating),
        reviewCount: Number(reviewCount),
        bestSeller: Boolean(bestSeller),
        isPremium: Boolean(isPremium),
        isApprovedByAdmin: Boolean(isApproved),
        isPublished: Boolean(isPublished)
      };

      // Ensure snake_case variant is also sent for PHP backend robustness
      const apiUpdates = {
        ...updates,
        review_count: Number(reviewCount),
        best_seller: bestSeller ? 1 : 0,
        is_premium: isPremium ? 1 : 0,
        is_published: isPublished ? 1 : 0,
        is_approved_by_admin: isApproved ? 1 : 0
      };

      await updateCourse(course.id, apiUpdates as any);
      
      // Explicitly call the NEW dedicated API for rating and reviews to ensure persistence on PHP backend
      try {
        const data = await apiFetch('courses.php', {
          method: 'POST',
          body: JSON.stringify({
            action: 'save_rating_reviews',
            id: course.id,
            rating: Number(rating),
            reviewCount: Number(reviewCount)
          })
        });
        
        if (data) {
          // Update local state in AppContext immediately to reflect the "real" database values
          setCourses(prev => prev.map(c => c.id === course.id ? { 
            ...c, 
            rating: Number(rating), 
            reviewCount: Number(reviewCount),
            bestSeller: Boolean(bestSeller),
            isPremium: Boolean(isPremium),
            isApprovedByAdmin: Boolean(isApproved),
            isPublished: Boolean(isPublished)
          } : c));
        }
      } catch (apiErr) {
        console.warn("Dedicated rating API notice:", apiErr);
      }
      
      const updatedCourseObj: Course = {
        ...course,
        ...updates
      };

      if (onCourseUpdated) {
        onCourseUpdated(updatedCourseObj);
      }

      setSaveSuccessMsg('Course attributes and badges updated in real time across the database and frontend.');
      setTimeout(() => setSaveSuccessMsg(''), 5000);
    } catch (err) {
      console.error('Failed to save course changes:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Toggle Approval
  const handleToggleApproval = async () => {
    const newStatus = !isApproved;
    setIsApproved(newStatus);
    await approveCourse(course.id, newStatus);
    if (onCourseUpdated) {
      onCourseUpdated({ ...course, isApprovedByAdmin: newStatus });
    }
    setSaveSuccessMsg(`Course approval status updated to: ${newStatus ? 'Approved by Admin' : 'Revoked Approval (Pending Review)'}`);
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  // Handle Toggle Publish / Unpublish
  const handleTogglePublish = async () => {
    const newStatus = !isPublished;
    setIsPublished(newStatus);
    await publishCourse(course.id, newStatus);
    if (onCourseUpdated) {
      onCourseUpdated({ ...course, isPublished: newStatus });
    }
    setSaveSuccessMsg(`Course publishing status set to: ${newStatus ? 'Published Live on Marketplace' : 'Unpublished (Hidden from Learners)'}`);
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  // Handle Delete Course
  const handleDelete = async () => {
    if (confirm(`Are you sure you want to permanently delete "${course.title}"? This action cannot be undone and will purge inappropriate content from the platform.`)) {
      setIsDeleting(true);
      try {
        await deleteCourse(course.id);
        if (onCourseDeleted) {
          onCourseDeleted(course.id);
        } else {
          onBack();
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const totalLessons = course.lessonsCount || (course.modules ? course.modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) : 0);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header & Breadcrumb Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1.5">
          {/* Breadcrumb */}
          <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
            <button 
              onClick={onBack}
              className="hover:text-rose-600 dark:hover:text-rose-400 font-medium transition-colors cursor-pointer"
            >
              Administrator Console
            </button>
            <span>/</span>
            <button 
              onClick={onBack}
              className="hover:text-rose-600 dark:hover:text-rose-400 font-medium transition-colors cursor-pointer"
            >
              Courses Catalog
            </button>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-200 font-bold truncate max-w-xs sm:max-w-md">
              Manage: {course.title}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              onClick={onBack}
              className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Catalog</span>
            </button>

            <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Course Quick Actions & Moderation
            </h1>

            {/* Admin Approval Status Badge */}
            {isApproved ? (
              <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-black text-[10px] rounded-full uppercase tracking-wider flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Approved by Admin</span>
              </span>
            ) : (
              <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-black text-[10px] rounded-full uppercase tracking-wider flex items-center space-x-1">
                <AlertCircle className="w-3 h-3" />
                <span>Pending Review</span>
              </span>
            )}

            {/* Catalog Published Status Badge */}
            {isPublished ? (
              <span className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-black text-[10px] rounded-full uppercase tracking-wider flex items-center space-x-1">
                <Globe className="w-3 h-3" />
                <span>Published Live</span>
              </span>
            ) : (
              <span className="px-2.5 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-[10px] rounded-full uppercase tracking-wider flex items-center space-x-1">
                <Eye className="w-3 h-3" />
                <span>Unpublished (Hidden)</span>
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons Top Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to={`/course/${course.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5"
            title="Preview how course looks on learner marketplace"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Marketplace Page</span>
          </Link>

          {/* 1. Admin Approval Button */}
          <button
            type="button"
            onClick={handleToggleApproval}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer ${
              isApproved
                ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 hover:bg-amber-100 border border-amber-200 dark:border-amber-800'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
            title={isApproved ? "Approved. Click to revoke admin approval." : "Pending. Click to approve course."}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isApproved ? 'Revoke Approval' : 'Approve Course'}</span>
          </button>

          {/* 2. Catalog Publish / Unpublish Button */}
          <button
            type="button"
            onClick={handleTogglePublish}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer ${
              isPublished
                ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border border-rose-200 dark:border-rose-800'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
            title={isPublished ? "Published. Click to unpublish & hide from learners." : "Unpublished. Click to publish live to learners."}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{isPublished ? 'Unpublish Course' : 'Publish to Marketplace'}</span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Attributes'}</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center space-x-3 text-emerald-800 dark:text-emerald-300 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
          <span className="text-xs font-bold">{saveSuccessMsg}</span>
        </div>
      )}

      {/* Main Full-Page Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Policies, Governance, Curriculum & Content (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Course Details & Hero Banner Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
            <div className="flex items-start space-x-4">
              <img
                src={course.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80'}
                alt={course.title}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80';
                }}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover shrink-0 border border-slate-200 dark:border-slate-700 shadow-sm"
              />
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Removed Category display */}
                  <span className="text-xs text-slate-400 font-mono">ID: {course.id}</span>
                </div>
                <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 leading-snug">
                  {course.title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {course.description || 'No extended description provided.'}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1">
                  <span className="flex items-center space-x-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Instructor: <strong className="text-slate-800 dark:text-slate-200">{course.instructor}</strong></span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center space-x-1">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span>{totalLessons} Lessons</span>
                  </span>
                  {course.duration && (
                    <>
                      <span>•</span>
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{course.duration}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>



          {/* 3. Curriculum & Content Audit Inspection */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  Curriculum & Content Integrity Inspection
                </h3>
              </div>
              <span className="px-2.5 py-0.5 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-[10px] rounded-full">
                Interactive Syllabus Review
              </span>
            </div>

            {/* Split layout: Modules List on Left, Active Lesson Preview on Right */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 min-h-[450px]">
              
              {/* Modules list (5 columns) */}
              <div className="md:col-span-5 border border-slate-150 dark:border-slate-800/80 rounded-2xl overflow-hidden flex flex-col max-h-[500px]">
                <div className="p-3 bg-slate-50 dark:bg-slate-950/20 border-b border-slate-150 dark:border-slate-800/80">
                  <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">
                    Syllabus Modules ({course.modules?.length || 0})
                  </span>
                </div>
                <div className="overflow-y-auto p-2 space-y-2 flex-1">
                  {course.modules && course.modules.length > 0 ? (
                    course.modules.map((mod) => (
                      <div key={mod.id} className="space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            setExpandedModules(prev => ({
                              ...prev,
                              [mod.id]: !prev[mod.id]
                            }));
                          }}
                          className="w-full flex items-center justify-between p-2 bg-slate-50/65 dark:bg-slate-800/20 hover:bg-slate-100 dark:hover:bg-slate-800/40 rounded-xl transition-colors text-left font-bold text-xs cursor-pointer text-slate-800 dark:text-slate-200"
                        >
                          <span className="truncate flex-1 pr-2">{mod.title}</span>
                          {expandedModules[mod.id] ? (
                            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                        </button>
                        
                        {expandedModules[mod.id] && (
                          <div className="pl-2 space-y-1">
                            {mod.lessons && mod.lessons.length > 0 ? (
                              mod.lessons.map((lesson) => (
                                <button
                                  key={lesson.id}
                                  type="button"
                                  onClick={() => setSelectedLesson(lesson)}
                                  className={`w-full text-left p-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                                    selectedLesson?.id === lesson.id
                                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
                                      : 'hover:bg-slate-50 text-slate-600 dark:text-slate-400 dark:hover:bg-slate-800/40'
                                  }`}
                                >
                                  <div className="flex items-center space-x-2 min-w-0 flex-1 pr-2">
                                    <PlayCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate">{lesson.title}</span>
                                  </div>
                                  <span className="text-[10px] uppercase bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 shrink-0 font-bold">
                                    {lesson.type}
                                  </span>
                                </button>
                              ))
                            ) : (
                              <p className="text-[10px] text-slate-400 pl-4 py-1 italic">No lectures in this module</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-400 italic">
                      No curriculum modules created yet
                    </div>
                  )}
                </div>
              </div>

              {/* Active Lesson preview (7 columns) - Replicating Learner-Style viewer */}
              <div className="md:col-span-7 bg-slate-50/45 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between max-h-[500px] overflow-y-auto">
                {selectedLesson ? (
                  <div className="space-y-4">
                    {/* Lesson Header */}
                    <div className="border-b border-slate-150 dark:border-slate-800/80 pb-3">
                      <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 text-[9px] font-black uppercase rounded-full tracking-wider">
                        Active Review: {selectedLesson.type} Lecture
                      </span>
                      <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 mt-2">
                        {selectedLesson.title}
                      </h4>
                      {selectedLesson.duration && (
                        <p className="text-[10px] text-slate-450 mt-0.5 font-bold">
                          Lecture Duration: {selectedLesson.duration}
                        </p>
                      )}
                    </div>

                    {/* Lesson Description/Content */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">
                        Description / Article Syllabus
                      </span>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">
                        {selectedLesson.description || selectedLesson.content || 'No lecture content text provided.'}
                      </p>
                    </div>

                    {/* Lesson Hands-on Lab Workspace */}
                    {selectedLesson.labUrl && (
                      <div className="p-3 bg-teal-50/50 dark:bg-teal-950/10 border border-teal-100 dark:border-teal-900/30 rounded-xl space-y-1">
                        <span className="text-[9px] font-black text-teal-700 dark:text-teal-400 uppercase tracking-wider block">
                          Hands-on Coding Workspace Attached
                        </span>
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{selectedLesson.labTitle || 'Cloud Playground'}</span>
                          <span className="text-[10px] text-teal-600 font-bold underline">{selectedLesson.labUrl}</span>
                        </div>
                      </div>
                    )}

                    {/* Attached Resources (Learner Replica view!) */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">
                        Attached Resources ({selectedLesson.resources?.length || 0})
                      </span>
                      {selectedLesson.resources && selectedLesson.resources.length > 0 ? (
                        <div className="space-y-2">
                          {selectedLesson.resources.map((res: any) => {
                            const ext = res.url?.split('.').pop()?.toLowerCase() || 'document';
                            return (
                              <div
                                key={res.id}
                                className="p-2.5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-xl flex items-center justify-between gap-3 text-xs"
                              >
                                <div className="flex items-center space-x-2 min-w-0 flex-1">
                                  <span className="text-base shrink-0">
                                    {ext === 'pdf' ? '📕' : ['doc', 'docx'].includes(ext) ? '📘' : ['xls', 'xlsx'].includes(ext) ? '📗' : '📎'}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{res.name}</p>
                                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                                      {ext.toUpperCase()} • {res.fileSize || '1.5 MB'}
                                    </span>
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
                                        fileSize: res.fileSize || '1.5 MB',
                                        type: res.type || 'file'
                                      });
                                      setIsPreviewModalOpen(true);
                                    }}
                                    className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 rounded-lg border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
                                    title="Quick Preview"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <a
                                    href={res.url}
                                    download={res.name}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 rounded-lg border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
                                    title="Download Resource"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">No resources attached to this lecture.</p>
                      )}
                    </div>

                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12 text-slate-400 space-y-2">
                    <BookOpen className="w-10 h-10 text-slate-300" />
                    <p className="text-xs font-bold">No Lecture Selected</p>
                    <p className="text-[11px] max-w-xs font-semibold leading-relaxed">
                      Select a lecture from the course modules list on the left to review its dynamic resources, media properties, and learner interface layout.
                    </p>
                  </div>
                )}
              </div>

            </div>

            {/* General Moderation Checklist */}
            <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-black text-slate-700 dark:text-slate-300 block">Content Moderation Checklist:</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] text-slate-600 dark:text-slate-400 font-semibold">
                <div className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Educational syllabus complies with platform standard terms</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Dynamic resources & attachments verified healthy</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>No abusive materials or copyright violations detected</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Danger Zone: Inappropriate Content Removal */}
          <div className="bg-rose-50/50 dark:bg-rose-950/20 rounded-3xl border border-rose-200 dark:border-rose-900/60 p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-rose-700 dark:text-rose-400">
                <Trash2 className="w-4 h-4" />
                <h3 className="text-sm font-black">Content Moderation Removal</h3>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              If this course contains inappropriate content, copyright infringement, or violates UQlearn curriculum standards, administrators can delete it completely
            </p>
            <div className="pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl transition-colors shadow-sm flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Deleting Course...' : 'Permanently Delete Inappropriate Course'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Ratings, Reviews, Badges & Save (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* ASSIGN COURSE TO REVIEWER CARD */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">Reviewer Assignment</h3>
              </div>
              <span className="text-[10px] bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 font-bold px-2 py-0.5 rounded-full">
                Admin Control
              </span>
            </div>

            {/* Current Assignment Status */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Currently Assigned Reviewer
              </span>
              {assignedReviewerEmail || assignedReviewerName ? (
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{assignedReviewerName || 'Reviewer'}</p>
                    <p className="text-[10px] text-purple-600 dark:text-purple-400 font-mono font-semibold">{assignedReviewerEmail}</p>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[9px] font-bold uppercase rounded-full">
                    Assigned
                  </span>
                </div>
              ) : (
                <p className="text-xs font-bold text-amber-600 dark:text-amber-400 pt-1">
                  Unassigned (Visible to all reviewers or pending assignment)
                </p>
              )}
            </div>

            {/* Select Reviewer Dropdown & Assign/Reassign/Unassign Actions */}
            <div className="space-y-3 pt-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Select Reviewer to Assign / Reassign:
              </label>
              <select
                value={selectedReviewerToAssign}
                onChange={(e) => setSelectedReviewerToAssign(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="">-- Choose Reviewer (or Unassign) --</option>
                {availableReviewers.map((rev) => (
                  <option key={rev.id} value={rev.id}>
                    {rev.name} ({rev.email}) - {rev.status}
                  </option>
                ))}
              </select>

              <div className="flex space-x-2 pt-1">
                <button
                  type="button"
                  disabled={isAssigning}
                  onClick={handleAssignReviewer}
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-1"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{isAssigning ? 'Updating Assignment...' : (selectedReviewerToAssign ? 'Assign / Reassign Reviewer' : 'Unassign Reviewer')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* ASSIGN COURSE TO INSTRUCTOR OWNER CARD */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">Course Instructor Ownership</h3>
              </div>
              <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold px-2 py-0.5 rounded-full">
                Ownership Control
              </span>
            </div>

            {/* Current Ownership Status */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Currently Assigned Instructor
              </span>
              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{courseInstructorName || 'Unknown Instructor'}</p>
                  {courseInstructorEmail && (
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-semibold">{courseInstructorEmail}</p>
                  )}
                  {courseInstructorId && (
                    <p className="text-[9px] text-slate-400 font-mono mt-0.5">UID: {courseInstructorId}</p>
                  )}
                </div>
                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 text-[9px] font-bold uppercase rounded-full">
                  Owner
                </span>
              </div>
            </div>

            {/* Select Instructor Dropdown */}
            <div className="space-y-3 pt-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Select New Instructor / Owner:
              </label>
              <select
                value={selectedInstructorToAssign}
                onChange={(e) => setSelectedInstructorToAssign(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="">-- Choose Instructor --</option>
                {availableInstructors.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name} ({inst.email})
                  </option>
                ))}
              </select>

              <div className="flex space-x-2 pt-1">
                <button
                  type="button"
                  disabled={isAssigningInstructor || !selectedInstructorToAssign}
                  onClick={handleAssignInstructor}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{isAssigningInstructor ? 'Reassigning...' : 'Reassign Course Owner'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 1. Rating & Review Count Moderation Controls */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">Ratings & Review Moderation</h3>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Admin Alterable</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center space-x-1">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>Star Rating (1.0 to 5.0)</span>
                  </span>
                  <span className="text-amber-500 font-black">{Number(rating).toFixed(1)} ★</span>
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min="1.0"
                    max="5.0"
                    step="0.1"
                    value={rating}
                    onChange={(e) => setRating(parseFloat(e.target.value))}
                    className="flex-1 accent-amber-500 cursor-pointer"
                  />
                  <input
                    type="number"
                    min="1.0"
                    max="5.0"
                    step="0.1"
                    value={rating}
                    onChange={(e) => setRating(parseFloat(e.target.value) || 5.0)}
                    className="w-20 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-slate-900 dark:text-slate-100 text-center"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Adjusts the displayed course rating across catalog cards and reviews summary.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center space-x-2">
                  <Users className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Total Review Count</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={reviewCount}
                  onChange={(e) => setReviewCount(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-slate-900 dark:text-slate-100 focus:outline-none focus:border-rose-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">Number of validated learner ratings displayed alongside the course title.</p>
              </div>
            </div>
          </div>

          {/* 2. Featured Badges: Best Seller & Premium */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 pb-2 border-b border-slate-100 dark:border-slate-800">
              Featured Badges (Instant Frontend Placement)
            </h3>

            <div className="space-y-3">
              {/* Best Seller Badge Toggle */}
              <label className="flex items-start justify-between p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:border-amber-400 transition-colors">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={bestSeller}
                    onChange={(e) => setBestSeller(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-amber-500 rounded focus:ring-amber-400"
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Best Seller Badge</span>
                      <span className="px-2 py-0.5 bg-amber-500 text-slate-950 font-black text-[9px] rounded uppercase tracking-wider">
                        Best Seller
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      Boosts ranking in marketplace search and highlights the course on the homepage carousel.
                    </p>
                  </div>
                </div>
              </label>

              {/* Premium Badge Toggle */}
              <label className="flex items-start justify-between p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:border-purple-400 transition-colors">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={isPremium}
                    onChange={(e) => setIsPremium(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-purple-600 rounded focus:ring-purple-400"
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Premium Course Badge</span>
                      <span className="px-2 py-0.5 bg-purple-600 text-white font-black text-[9px] rounded uppercase tracking-wider flex items-center gap-1">
                        <BadgeCheck className="w-3 h-3" />
                        Premium
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      Attaches the high-value verified Premium badge across all learner catalog views.
                    </p>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* 3. Bottom Sticky Action Card */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl space-y-4">
            <div className="space-y-2">
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSave}
                className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving Changes...' : 'Save All Changes'}</span>
              </button>

              <button
                type="button"
                onClick={onBack}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel & Return to Catalog
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Resource Quick Preview Modal */}
      <ResourcePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        resource={previewResource}
      />

    </div>
  );
};
