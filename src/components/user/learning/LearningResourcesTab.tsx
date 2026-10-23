import React, { useState } from 'react';
import { ROOT_URL } from '../../../lib/apiConfig';
import { 
  FolderDown, 
  Download, 
  FileText, 
  Code, 
  ExternalLink, 
  FileCode, 
  BookOpen, 
  Layers,
  Eye
} from 'lucide-react';
import { Course, Lesson } from '../../../types';
import { ResourcePreviewModal } from '../../common/ResourcePreviewModal';

interface LearningResourcesTabProps {
  course: Course;
  currentLesson: Lesson;
}

export const LearningResourcesTab: React.FC<LearningResourcesTabProps> = ({
  course,
  currentLesson
}) => {
  const [previewResource, setPreviewResource] = useState<any | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Check if currentLesson has dynamic attached resources
  const hasAttachedResources = Array.isArray(currentLesson.resources) && currentLesson.resources.length > 0;

  // Static fallback resources if no real files are attached
  const staticFallbackResources = [
    {
      id: 'res-1',
      name: `${currentLesson.title} - Source Code & Starter Files`,
      type: 'code',
      fileSize: '2.4 MB',
      url: '#',
      description: 'Contains complete boilerplates, solution code snippets, and configuration files.',
      fileType: 'zip'
    },
    {
      id: 'res-2',
      name: 'Full Course Architecture Diagrams & Presentation Slides',
      type: 'slides',
      fileSize: '14.8 MB',
      url: '#',
      description: 'Comprehensive high-resolution presentation decks and architecture workflows.',
      fileType: 'pdf'
    },
    {
      id: 'res-3',
      name: 'Quick Reference Guide & Syntax Cheatsheet',
      type: 'cheatsheet',
      fileSize: '850 KB',
      url: '#',
      description: 'Printable PDF cheatsheet with key formulas, shortcuts, and command references.',
      fileType: 'pdf'
    }
  ];

  // Map dynamic attached resources to expected shape
  const activeResources = hasAttachedResources
    ? (currentLesson.resources || []).map((res: any) => {
        const ext = res.url?.split('.').pop()?.toLowerCase() || 'pdf';
        return {
          id: res.id || `res-${Math.random()}`,
          name: res.name || 'Resource Document',
          type: res.type || 'file',
          fileSize: res.fileSize || '1.5 MB',
          url: res.url || '#',
          description: res.type === 'link' 
            ? `External link attachment supporting the lecture.` 
            : `Instructor uploaded ${ext.toUpperCase()} resource document.`,
          fileType: ext
        };
      })
    : staticFallbackResources;

  const handleDownload = (res: any) => {
    if (!res.url || res.url === '#') {
      // Generate a quick downloadable text file for default stubs
      const textContent = `# ${res.name}\nCourse: ${course.title}\nLecture: ${currentLesson.title}\nInstructor: ${course.instructor}\nResource Size: ${res.fileSize}\n\nDescription:\n${res.description}\n\nVisit ${ROOT_URL} for more lectures.`;
      const blob = new Blob([textContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${res.name.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // Create a direct secure download link
      const a = document.createElement('a');
      a.href = res.url;
      a.download = res.name;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-xs transition-colors">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <FolderDown className="w-4 h-4 text-indigo-600" />
            <span>Lecture Resources & Attachments</span>
            <span className="text-xs font-bold text-slate-400">({activeResources.length})</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
            {hasAttachedResources 
              ? 'Real-time instructor files attached to this lecture module. Preview or download below.' 
              : 'Download course templates, companion slides, and reference cheat sheets.'}
          </p>
        </div>
      </div>

      {/* Resource cards list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeResources.map((res: any) => {
          let typeColor = 'bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-500/30';
          let icon = <FileText className="w-5 h-5" />;

          const ext = res.fileType || '';
          if (ext === 'pdf') {
            typeColor = 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30';
          } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
            typeColor = 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30';
            icon = <Layers className="w-5 h-5" />;
          } else if (['doc', 'docx'].includes(ext)) {
            typeColor = 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30';
          } else if (['ppt', 'pptx'].includes(ext)) {
            typeColor = 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30';
            icon = <FileCode className="w-5 h-5" />;
          } else if (res.type === 'code' || ext === 'zip') {
            typeColor = 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30';
            icon = <Code className="w-5 h-5" />;
          }

          return (
            <div
              key={res.id}
              onClick={() => {
                if (res.url && res.url !== '#') {
                  setPreviewResource(res);
                  setIsPreviewModalOpen(true);
                }
              }}
              className={`p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl transition-all flex flex-col justify-between gap-4 shadow-xs group ${
                res.url && res.url !== '#' ? 'hover:border-indigo-300 dark:hover:border-indigo-800 hover:shadow-xs cursor-pointer' : ''
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-xl border ${typeColor} flex items-center justify-center`}>
                    {icon}
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-lg">
                    {res.fileSize}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {res.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed font-semibold line-clamp-2">
                    {res.description}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {ext ? ext.toUpperCase() : 'DOCUMENT'}
                </span>
                
                <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                  {res.url && res.url !== '#' && (
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewResource(res);
                        setIsPreviewModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDownload(res)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 hover:text-slate-950 dark:text-slate-200 dark:hover:text-white border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* External official docs hint */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400 font-semibold">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span>Need official documentation and additional API references?</span>
        </div>
        <a
          href={ROOT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold flex items-center gap-1 shrink-0"
        >
          <span>UQlearn Library</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Preview Modal rendering */}
      <ResourcePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        resource={previewResource}
      />
    </div>
  );
};
