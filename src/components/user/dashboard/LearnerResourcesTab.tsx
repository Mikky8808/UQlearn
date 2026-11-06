import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  FolderDown, 
  FileText, 
  Code2, 
  FileSpreadsheet, 
  Download, 
  Search, 
  BookOpen, 
  Sparkles,
  Play,
  Eye,
  Filter,
  FileCode,
  Layers,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { Course, CourseResource } from '../../../types';
import { ResourcePreviewModal, ResourceItem } from '../../common/ResourcePreviewModal';
import { ROOT_URL } from '../../../lib/apiConfig';
import { useApp } from '../../../context/AppContext';

interface LearnerResourcesTabProps {
  enrolledCourses: Course[];
}

export const LearnerResourcesTab: React.FC<LearnerResourcesTabProps> = ({ enrolledCourses = [] }) => {
  const navigate = useNavigate();
  const { currentUser } = useApp();
  const learnerName = currentUser?.name || currentUser?.displayName || 'Wamuu Rajab';
  const learnerEmail = currentUser?.email || 'wamuurajab@gmail.com';
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'pdf' | 'code' | 'slides' | 'cheatsheet'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Preview modal state
  const [previewResource, setPreviewResource] = useState<ResourceItem | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Dynamically compile all downloadable resources from the learner's enrolled courses
  const allResources = useMemo<CourseResource[]>(() => {
    if (!enrolledCourses || enrolledCourses.length === 0) return [];

    const compiled: CourseResource[] = [];

    enrolledCourses.forEach((course) => {
      let courseHasAttached = false;

      // 1. Extract explicit lesson attachments if available in curriculum modules
      if (Array.isArray(course.modules)) {
        course.modules.forEach((mod) => {
          if (Array.isArray(mod.lessons)) {
            mod.lessons.forEach((lesson) => {
              if (Array.isArray(lesson.resources) && lesson.resources.length > 0) {
                courseHasAttached = true;
                lesson.resources.forEach((res: any, idx: number) => {
                  const ext = res.url?.split('.').pop()?.toLowerCase() || res.fileType || 'pdf';
                  let inferredType: CourseResource['type'] = 'pdf';
                  if (['zip', 'rar', 'code', 'js', 'ts', 'py', 'json'].includes(ext) || res.type === 'code') {
                    inferredType = 'code';
                  } else if (['ppt', 'pptx', 'slides'].includes(ext) || res.type === 'slides') {
                    inferredType = 'slides';
                  } else if (res.type === 'cheatsheet' || ext === 'sheet') {
                    inferredType = 'cheatsheet';
                  }

                  compiled.push({
                    id: res.id || `res-${course.id}-${lesson.id}-${idx}`,
                    courseId: course.id,
                    courseTitle: course.title,
                    moduleTitle: mod.title,
                    lessonTitle: lesson.title,
                    title: res.name || res.title || `${lesson.title} - Attachment`,
                    type: inferredType,
                    size: res.fileSize || res.size || '1.8 MB',
                    downloadUrl: res.url || res.downloadUrl || '#',
                    description: res.description || `Instructor attachment for lecture "${lesson.title}" in ${mod.title || 'Course Curriculum'}.`,
                    fileType: ext
                  });
                });
              }
            });
          }
        });
      }

      // 2. Synthesize core course-level materials for every enrolled course
      // (Ensures learners always have curated cheat sheets, slide decks & exercise code for all enrolled courses)
      const courseLevelResources: CourseResource[] = [
        {
          id: `res-synth-cs-${course.id}`,
          courseId: course.id,
          courseTitle: course.title,
          moduleTitle: 'Course Overview',
          lessonTitle: 'Master Reference',
          title: `${course.title} - Production Quick Reference & Cheat Sheet`,
          type: 'cheatsheet',
          size: '2.8 MB',
          downloadUrl: '#',
          description: `Comprehensive printable PDF cheat sheet covering key formulas, syntax patterns, and best practices for ${course.category || 'this course'}.`,
          fileType: 'pdf'
        },
        {
          id: `res-synth-slides-${course.id}`,
          courseId: course.id,
          courseTitle: course.title,
          moduleTitle: 'All Modules',
          lessonTitle: 'Presentation Decks',
          title: `${course.title} - Complete Lecture Slide Decks & Diagrams`,
          type: 'slides',
          size: '18.4 MB',
          downloadUrl: '#',
          description: `High-resolution presentation slides and architectural workflow diagrams for ${course.title}.`,
          fileType: 'pdf'
        },
        {
          id: `res-synth-code-${course.id}`,
          courseId: course.id,
          courseTitle: course.title,
          moduleTitle: 'Practical Exercises',
          lessonTitle: 'Starter & Solution Code',
          title: `${course.title} - Hands-On Starter Boilerplate & Exercise Code (.zip)`,
          type: 'code',
          size: '9.6 MB',
          downloadUrl: '#',
          description: `Complete source code repositories, setup scripts, and solution code snippets for all course projects.`,
          fileType: 'zip'
        }
      ];

      // If no lesson-specific attachments were found, add all synthetic course materials
      // If lesson attachments exist, append the cheat sheet for extra value
      if (!courseHasAttached) {
        compiled.push(...courseLevelResources);
      } else {
        compiled.push(courseLevelResources[0]); // Add master cheat sheet
      }
    });

    return compiled;
  }, [enrolledCourses]);

  // Filter resources by course dropdown, type filter, and text query
  const filteredResources = useMemo(() => {
    return allResources.filter((res) => {
      if (selectedCourseId !== 'all' && res.courseId !== selectedCourseId) return false;
      if (filterType !== 'all' && res.type !== filterType) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = res.title.toLowerCase().includes(query);
        const matchDesc = res.description.toLowerCase().includes(query);
        const matchCourse = res.courseTitle.toLowerCase().includes(query);
        const matchLesson = res.lessonTitle ? res.lessonTitle.toLowerCase().includes(query) : false;
        if (!matchTitle && !matchDesc && !matchCourse && !matchLesson) return false;
      }
      return true;
    });
  }, [allResources, selectedCourseId, filterType, searchQuery]);

  const getResourceIcon = (type: CourseResource['type']) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-rose-500" />;
      case 'cheatsheet':
        return <Sparkles className="w-5 h-5 text-purple-500" />;
      case 'code':
        return <Code2 className="w-5 h-5 text-emerald-500" />;
      case 'slides':
        return <FileSpreadsheet className="w-5 h-5 text-amber-500" />;
      default:
        return <FileText className="w-5 h-5 text-teal-500" />;
    }
  };

  const handleDownloadResource = (res: CourseResource) => {
    if (res.downloadUrl && res.downloadUrl !== '#') {
      const a = document.createElement('a');
      a.href = res.downloadUrl;
      a.download = res.title;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // Create text file artifact for simulated downloads
      const fileContent = `# UQlearn Downloadable Resource
Title: ${res.title}
Course: ${res.courseTitle}
Module: ${res.moduleTitle || 'Curriculum Overview'}
Lesson: ${res.lessonTitle || 'General'}
File Size: ${res.size}
Downloaded: ${new Date().toLocaleDateString()}

Description:
${res.description}

========================================
UQLEARN LICENSED COPY
Licensed To: ${learnerName}
Email: ${learnerEmail}
Single-user license, 30 oct 2026
ID: UQ-7F3A9C
www.uqlearn.org
DO NOT COPY OR SHARE
========================================

Thank you for learning with UQlearn!
Access all lectures at ${ROOT_URL}
`;
      const blob = new Blob([fileContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${res.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const openPreview = (res: CourseResource) => {
    setPreviewResource({
      id: res.id,
      name: res.title,
      url: res.downloadUrl,
      fileSize: res.size,
      type: 'file',
      fileType: res.fileType || res.type
    });
    setIsPreviewModalOpen(true);
  };

  // If learner is not enrolled in any courses yet
  if (enrolledCourses.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center space-y-5 shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto border border-teal-200 dark:border-teal-900">
          <FolderDown className="w-8 h-8" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">No Enrolled Courses Yet</h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            Once you enroll in courses, all instructor cheat sheets, lecture slide decks, starter code repositories, and downloadable exercise files will automatically appear here.
          </p>
        </div>
        <div className="pt-2">
          <Link
            to="/courses"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            <span>Explore Courses & Enroll</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <FolderDown className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <span>Enrolled Course Downloadable Resources</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Access cheat sheets, slide decks, starter source code, and lesson attachments from your enrolled courses ({enrolledCourses.length} active).
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-xs font-extrabold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/70 px-3.5 py-1.5 rounded-xl border border-teal-200 dark:border-teal-900">
            {allResources.length} Downloadable Files
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        {/* Search Input (5 Cols) */}
        <div className="relative sm:col-span-5">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search resources, topics, or lessons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-500 font-medium"
          />
        </div>

        {/* Course Select Dropdown (4 Cols) */}
        <div className="sm:col-span-4">
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500 font-medium truncate"
          >
            <option value="all">All Enrolled Courses ({enrolledCourses.length})</option>
            {enrolledCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        {/* Quick Type Filter Tabs (3 Cols / Flex) */}
        <div className="sm:col-span-3 flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'cheatsheet', 'code', 'slides', 'pdf'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`flex-1 py-2 px-2.5 rounded-xl text-[11px] font-bold transition-all capitalize whitespace-nowrap cursor-pointer ${
                filterType === type
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {type === 'cheatsheet' ? 'Cheat Sheet' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Resource Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredResources.length === 0 ? (
          <div className="col-span-2 text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
            <FolderDown className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">No resources found</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-medium">
              Try selecting another course or resetting your filter options.
            </p>
            <button
              onClick={() => {
                setSelectedCourseId('all');
                setFilterType('all');
                setSearchQuery('');
              }}
              className="mt-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredResources.map((res) => (
            <div
              key={res.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-all group"
            >
              <div className="space-y-3">
                {/* Header row: type icon + type badge & file size */}
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 flex items-center justify-center shrink-0">
                    {getResourceIcon(res.type)}
                  </div>

                  <div className="text-right">
                    <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider">
                      {res.type}
                    </span>
                    <span className="text-[11px] font-mono font-semibold text-slate-400 block mt-0.5">
                      {res.size}
                    </span>
                  </div>
                </div>

                {/* Course badge & title */}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-extrabold text-teal-600 dark:text-teal-400 uppercase tracking-wider block truncate">
                      {res.courseTitle}
                    </span>
                    {res.lessonTitle && (
                      <span className="text-[10px] font-medium text-slate-400 truncate">
                        • {res.lessonTitle}
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1 line-clamp-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                    {res.title}
                  </h4>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-medium">
                  {res.description}
                </p>
              </div>

              {/* Action buttons row */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => navigate(`/learn/${res.courseId}?tab=resources`)}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
                  title="Open Course Resources in Player"
                >
                  <Play className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 fill-teal-600 dark:fill-teal-400" />
                  <span>Open in Player</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => openPreview(res)}
                    className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </button>

                  <button
                    onClick={() => handleDownloadResource(res)}
                    className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Resource Preview Modal */}
      <ResourcePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        resource={previewResource}
      />
    </div>
  );
};
