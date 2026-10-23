import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FolderDown, 
  FileText, 
  Code2, 
  FileSpreadsheet, 
  Download, 
  ExternalLink, 
  Search, 
  BookOpen, 
  CheckCircle2,
  Sparkles,
  Play
} from 'lucide-react';
import { Course, CourseResource } from '../../../types';

interface LearnerResourcesTabProps {
  enrolledCourses: Course[];
}

export const LearnerResourcesTab: React.FC<LearnerResourcesTabProps> = ({ enrolledCourses }) => {
  const navigate = useNavigate();
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'pdf' | 'code' | 'slides' | 'cheatsheet'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Resources library
  const resources: CourseResource[] = [
    {
      id: 'res-1',
      courseId: enrolledCourses[0]?.id || 'c-1',
      courseTitle: enrolledCourses[0]?.title || 'Full-Stack Web Development',
      title: 'Full-Stack Architecture Cheat Sheet (React 19, Next.js, Node & PostgreSQL)',
      type: 'cheatsheet',
      size: '3.4 MB',
      downloadUrl: '#',
      description: 'Comprehensive 12-page PDF reference summarizing REST endpoints, React hooks, Prisma models, and Redis caching.'
    },
    {
      id: 'res-2',
      courseId: enrolledCourses[0]?.id || 'c-1',
      courseTitle: enrolledCourses[0]?.title || 'Full-Stack Web Development',
      title: 'Complete Starter Boilerplate Repo & Docker Compose File',
      type: 'code',
      size: '12.8 MB',
      downloadUrl: '#',
      description: 'Preconfigured TypeScript monorepo with Tailwind, Vite, ESLint, and production multi-stage Dockerfiles.'
    },
    {
      id: 'res-3',
      courseId: enrolledCourses[0]?.id || 'c-1',
      courseTitle: enrolledCourses[0]?.title || 'Full-Stack Web Development',
      title: 'Modules 1-6 Lecture Slides & Presentation Decks',
      type: 'slides',
      size: '24.1 MB',
      downloadUrl: '#',
      description: 'High-resolution PDF slide decks covering modern web protocols, JWT authentication flows, and SQL normalization.'
    },
    {
      id: 'res-4',
      courseId: 'c-2',
      courseTitle: 'Python & Data Science Masterclass',
      title: 'Pandas & NumPy Quick Reference Guide',
      type: 'cheatsheet',
      size: '2.1 MB',
      downloadUrl: '#',
      description: 'Essential syntax guide for data wrangling, grouping, vectorization, and datetime parsing.'
    },
    {
      id: 'res-5',
      courseId: 'c-2',
      courseTitle: 'Python & Data Science Masterclass',
      title: 'Jupyter Notebook Exercises with Solutions (.ipynb)',
      type: 'code',
      size: '8.7 MB',
      downloadUrl: '#',
      description: 'Interactive coding challenges covering data visualization with Seaborn, Scikit-Learn regression, and random forests.'
    }
  ];

  const filteredResources = resources.filter(res => {
    if (selectedCourseId !== 'all' && res.courseId !== selectedCourseId) return false;
    if (filterType !== 'all' && res.type !== filterType) return false;
    if (searchQuery.trim()) {
      const match = res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    res.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    res.courseTitle.toLowerCase().includes(searchQuery.toLowerCase());
      if (!match) return false;
    }
    return true;
  });

  const getResourceIcon = (type: CourseResource['type']) => {
    switch (type) {
      case 'pdf':
      case 'cheatsheet':
        return <FileText className="w-6 h-6 text-rose-500" />;
      case 'code':
        return <Code2 className="w-6 h-6 text-indigo-500" />;
      case 'slides':
        return <FileSpreadsheet className="w-6 h-6 text-amber-500" />;
    }
  };

  const handleDownloadMock = (title: string) => {
    // Generate a simple downloadable file artifact
    const blob = new Blob([`UQlearn Resource: ${title}\nDownloaded from learner dashboard.`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <FolderDown className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <span>Course Downloadable Materials & Resources</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Access instructor-provided cheat sheets, slide decks, GitHub project repositories, and exercise files.
          </p>
        </div>

        <div className="text-xs font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-3.5 py-1.5 rounded-xl border border-teal-200 dark:border-teal-900">
          {resources.length} Total Files Available
        </div>
      </div>

      {/* Filter and Search */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search downloads & files..."
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
            <option value="all">All Enrolled Courses</option>
            {enrolledCourses.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>

        <div className="flex space-x-1 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'cheatsheet', 'code', 'slides'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`flex-1 py-1.5 px-2.5 rounded-xl text-[11px] font-bold transition-all capitalize whitespace-nowrap cursor-pointer ${
                filterType === type
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Resource Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredResources.length === 0 ? (
          <div className="col-span-2 text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
            <FolderDown className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">No resources found</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Try changing your course selector or search query.
            </p>
          </div>
        ) : (
          filteredResources.map((res) => (
            <div
              key={res.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-all"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 flex items-center justify-center shrink-0">
                    {getResourceIcon(res.type)}
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase">
                      {res.type}
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">{res.size}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider block">
                    {res.courseTitle}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5 line-clamp-2">
                    {res.title}
                  </h4>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {res.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => navigate(`/learn/${res.courseId}?tab=resources`)}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
                  title="Open Course Resources in Player"
                >
                  <Play className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 fill-teal-600 dark:fill-teal-400" />
                  <span>Open in Player</span>
                </button>

                <button
                  onClick={() => handleDownloadMock(res.title)}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
