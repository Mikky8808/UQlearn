import React, { useState, useEffect } from 'react';
import { 
  GripVertical, 
  Layers, 
  Video, 
  FileText, 
  HelpCircle, 
  Volume2, 
  FileCode, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  CheckCircle2, 
  Save, 
  RotateCcw, 
  Eye, 
  Clock, 
  Search,
  Sparkles,
  Copy,
  FolderOpen,
  X,
  RefreshCw,
  Settings,
  ChevronRight,
  BookOpen,
  MoreVertical
} from 'lucide-react';

const LessonActionsMenu: React.FC<{
  lesson: OrganizerLesson;
  modIdx: number;
  lesIdx: number;
  moveLesson: (mIdx: number, lIdx: number, dir: 'up' | 'down') => void;
  handleDeleteLesson: (mIdx: number, lId: string) => void;
  onManageLesson?: (mId: string, lId: string) => void;
  modId: string;
  lessonsLength: number;
}> = ({ lesson, modIdx, lesIdx, moveLesson, handleDeleteLesson, onManageLesson, modId, lessonsLength }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-none transition-colors"
      >
        <MoreVertical className="w-4 h-4 text-slate-500" />
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl z-20 rounded-none">
          <button onClick={() => {onManageLesson && onManageLesson(modId, lesson.id); setIsOpen(false)}} className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800">Edit</button>
          <button onClick={() => {moveLesson(modIdx, lesIdx, 'up'); setIsOpen(false)}} disabled={lesIdx === 0} className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30">Move Up</button>
          <button onClick={() => {moveLesson(modIdx, lesIdx, 'down'); setIsOpen(false)}} disabled={lesIdx === lessonsLength - 1} className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30">Move Down</button>
          <button onClick={() => {handleDeleteLesson(modIdx, lesson.id); setIsOpen(false)}} className="w-full text-left px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40">Delete</button>
        </div>
      )}
    </div>
  );
};
import { upsertModuleApi, deleteModuleOrLessonApi, fetchCourseModulesApi, API_ENDPOINTS, apiFetch } from '../../../lib/apiConfig';

export interface OrganizerLesson {
  id: string;
  title: string;
  duration: string;
  type: 'video' | 'article' | 'quiz' | 'audio' | 'scorm';
  isPreview?: boolean;
  content?: string;
  resources?: any[];
}

export interface OrganizerModule {
  id: string;
  title: string;
  description?: string;
  isExpanded?: boolean;
  lessons: OrganizerLesson[];
}

interface CurriculumOrganizerProps {
  courseId?: string;
  initialModules?: OrganizerModule[];
  onSave?: (modules: OrganizerModule[]) => void;
  onManageModule?: (moduleId: string) => void;
  onManageLesson?: (moduleId: string, lessonId: string) => void;
  onCancel?: () => void;
}

export const CurriculumOrganizer: React.FC<CurriculumOrganizerProps> = ({
  courseId,
  initialModules,
  onSave,
  onManageModule,
  onManageLesson,
  onCancel
}) => {
  const [modules, setModules] = useState<OrganizerModule[]>(initialModules || []);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (courseId && (!initialModules || initialModules.length === 0)) {
      loadCurriculum();
    } else if (initialModules) {
      setModules(initialModules);
    }
  }, [courseId, initialModules]);

  const loadCurriculum = async () => {
    if (!courseId) return;
    setIsLoading(true);
    try {
      const data = await fetchCourseModulesApi(courseId);
      if (data) {
        setModules(data.map((m: any) => ({
          ...m,
          isExpanded: true,
          lessons: (m.lessons || []).map((l: any) => {
            let parsedResources = l.resources;
            if (typeof parsedResources === 'string') {
              try {
                parsedResources = JSON.parse(parsedResources);
              } catch (e) {
                parsedResources = [];
              }
            }
            return {
              ...l,
              resources: Array.isArray(parsedResources) ? parsedResources : []
            };
          })
        })));
      }
    } catch (err) {
      console.error('Failed to load curriculum:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveReorder = async (updatedModules: OrganizerModule[]) => {
    if (!courseId) return;
    
    try {
      // 1. Prepare module reorder data
      const moduleItems = updatedModules.map((m, idx) => ({
        id: m.id,
        order_index: idx
      }));

      // 2. Prepare lesson reorder data (within each module)
      const lessonItems: {id: string, module_id: string, order_index: number}[] = [];
      updatedModules.forEach(m => {
        m.lessons.forEach((l, idx) => {
          lessonItems.push({
            id: l.id,
            module_id: m.id,
            order_index: idx
          });
        });
      });

      // Call reorder API for modules
      await apiFetch(API_ENDPOINTS.COURSE_MODULES, {
        method: 'POST',
        body: JSON.stringify({
          action: 'reorder',
          type: 'module',
          items: moduleItems
        })
      });

      // Call reorder API for lessons
      await apiFetch(API_ENDPOINTS.COURSE_MODULES, {
        method: 'POST',
        body: JSON.stringify({
          action: 'reorder',
          type: 'lesson',
          items: lessonItems
        })
      });

      showNotification('Curriculum order saved successfully.', 'success');
    } catch (err) {
      console.error('Reorder save failed:', err);
      showNotification('Failed to sync order.', 'error');
    }
  };

  const [historyStack, setHistoryStack] = useState<OrganizerModule[][]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);

  // Add Module Modal State
  const [isAddModuleModalOpen, setIsAddModuleModalOpen] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleDescription, setNewModuleDescription] = useState('');
  const [isSavingModule, setIsSavingModule] = useState(false);

  // Module Deletion State
  const [moduleToDelete, setModuleToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDeletingModule, setIsDeletingModule] = useState(false);

  // Drag-and-drop state
  const [draggedModuleIndex, setDraggedModuleIndex] = useState<number | null>(null);
  const [draggedLessonInfo, setDraggedLessonInfo] = useState<{ moduleIndex: number; lessonIndex: number } | null>(null);
  const [dragOverModuleIndex, setDragOverModuleIndex] = useState<number | null>(null);
  const [dragOverLessonInfo, setDragOverLessonInfo] = useState<{ moduleIndex: number; lessonIndex: number } | null>(null);

  const showNotification = (msg: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const pushHistory = () => {
    setHistoryStack(prev => [...prev.slice(-10), JSON.parse(JSON.stringify(modules))]);
  };

  const handleUndo = () => {
    if (historyStack.length === 0) return;
    const previous = historyStack[historyStack.length - 1];
    setHistoryStack(prev => prev.slice(0, prev.length - 1));
    setModules(previous);
    showNotification('Last reorder action undone.', 'info');
  };

  // Section Drag & Drop
  const handleModuleDragStart = (index: number) => {
    setDraggedModuleIndex(index);
    setDraggedLessonInfo(null);
  };

  const handleModuleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedModuleIndex !== null && draggedModuleIndex !== index) {
      setDragOverModuleIndex(index);
    }
  };

  const handleModuleDrop = (targetIndex: number) => {
    if (draggedModuleIndex === null || draggedModuleIndex === targetIndex) {
      setDraggedModuleIndex(null);
      setDragOverModuleIndex(null);
      return;
    }

    pushHistory();
    const updated = [...modules];
    const [moved] = updated.splice(draggedModuleIndex, 1);
    updated.splice(targetIndex, 0, moved);
    setModules(updated);
    setDraggedModuleIndex(null);
    setDragOverModuleIndex(null);
    saveReorder(updated);
    showNotification(`Reordered section to position ${targetIndex + 1}.`);
  };

  // Lesson Drag & Drop (within or across sections)
  const handleLessonDragStart = (e: React.DragEvent, moduleIndex: number, lessonIndex: number) => {
    e.stopPropagation();
    setDraggedLessonInfo({ moduleIndex, lessonIndex });
    setDraggedModuleIndex(null);
  };

  const handleLessonDragOver = (e: React.DragEvent, moduleIndex: number, lessonIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverLessonInfo({ moduleIndex, lessonIndex });
  };

  const handleLessonDrop = (e: React.DragEvent, targetModuleIndex: number, targetLessonIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedLessonInfo) return;
    const { moduleIndex: srcModIdx, lessonIndex: srcLesIdx } = draggedLessonInfo;

    if (srcModIdx === targetModuleIndex && srcLesIdx === targetLessonIndex) {
      setDraggedLessonInfo(null);
      setDragOverLessonInfo(null);
      return;
    }

    pushHistory();
    const updated = [...modules];
    const srcLessons = [...updated[srcModIdx].lessons];
    const [movedLesson] = srcLessons.splice(srcLesIdx, 1);
    updated[srcModIdx] = { ...updated[srcModIdx], lessons: srcLessons };

    const targetLessons = [...updated[targetModuleIndex].lessons];
    targetLessons.splice(targetLessonIndex, 0, movedLesson);
    updated[targetModuleIndex] = { ...updated[targetModuleIndex], lessons: targetLessons };

    setModules(updated);
    setDraggedLessonInfo(null);
    setDragOverLessonInfo(null);
    saveReorder(updated);
    showNotification(`Moved lesson "${movedLesson.title}"!`);
  };

  // Button-based Micro Reordering (Accessibility & precise adjustments)
  const moveModule = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= modules.length) return;
    pushHistory();
    const updated = [...modules];
    const [moved] = updated.splice(index, 1);
    updated.splice(target, 0, moved);
    setModules(updated);
    showNotification(`Section moved ${direction}.`);
  };

  const moveLesson = (modIndex: number, lesIndex: number, direction: 'up' | 'down') => {
    const lessons = modules[modIndex].lessons;
    const target = direction === 'up' ? lesIndex - 1 : lesIndex + 1;
    if (target < 0 || target >= lessons.length) return;
    pushHistory();
    const updated = [...modules];
    const curLessons = [...updated[modIndex].lessons];
    const [moved] = curLessons.splice(lesIndex, 1);
    curLessons.splice(target, 0, moved);
    updated[modIndex] = { ...updated[modIndex], lessons: curLessons };
    setModules(updated);
    showNotification(`Lesson moved ${direction}.`);
  };

  const toggleModuleExpand = (id: string) => {
    setModules(modules.map(m => m.id === id ? { ...m, isExpanded: !m.isExpanded } : m));
  };

  const handleAddModule = () => {
    setNewModuleTitle(`Section ${modules.length + 1}: New Curriculum Section`);
    setNewModuleDescription('');
    setIsAddModuleModalOpen(true);
  };

  const handleSaveNewModule = async () => {
    if (!newModuleTitle.trim()) {
      showNotification('Section title is required.', 'error');
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
        pushHistory();
        const newMod: OrganizerModule = {
          id: res.data.id || `sec-${Date.now()}`,
          title: moduleData.title,
          description: moduleData.description,
          isExpanded: true,
          lessons: []
        };
        
        setModules([...modules, newMod]);
        setIsAddModuleModalOpen(false);
        showNotification('New section added successfully!');
      } else {
        showNotification(res.message || 'Failed to save section.', 'error');
      }
    } catch (err) {
      console.error('Error saving module:', err);
      showNotification('An error occurred while saving the section.', 'error');
    } finally {
      setIsSavingModule(false);
    }
  };

  const handleAddLesson = async (modIndex: number, type: 'video' | 'article' | 'quiz' | 'audio' | 'scorm' = 'video') => {
    pushHistory();
    const newLesson: OrganizerLesson = {
      id: `les-${Date.now()}`,
      title: `Lecture ${modules[modIndex].lessons.length + 1}: New Topic`,
      duration: '12:00',
      type: type as any,
      isPreview: false
    };

    if (courseId) {
      setIsSavingCurriculum(true);
      try {
        const res = await apiFetch(API_ENDPOINTS.COURSE_MODULES, {
          method: 'POST',
          body: JSON.stringify({
            action: 'upsert_lesson',
            module_id: modules[modIndex].id,
            ...newLesson,
            order_index: modules[modIndex].lessons.length
          })
        });
        if (res.success && res.data?.id) {
          newLesson.id = res.data.id;
        }
      } catch (err) {
        console.error('Failed to save lesson:', err);
      } finally {
        setIsSavingCurriculum(false);
      }
    }

    const updated = [...modules];
    updated[modIndex] = {
      ...updated[modIndex],
      lessons: [...updated[modIndex].lessons, newLesson]
    };
    setModules(updated);
    showNotification(`Added new ${type} lesson.`);
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
      showNotification('At least one section must remain in curriculum.', 'info');
      setModuleToDelete(null);
      return;
    }

    setIsDeletingModule(true);
    try {
      pushHistory();
      setModules(modules.filter(m => m.id !== moduleToDelete.id));
      if (courseId && !moduleToDelete.id.startsWith('sec-')) {
        await deleteModuleOrLessonApi('module', moduleToDelete.id);
      }
      showNotification('Section removed successfully.');
      setModuleToDelete(null);
    } catch (err) {
      console.error('Error deleting module:', err);
      showNotification('Error removing section.', 'error');
    } finally {
      setIsDeletingModule(false);
    }
  };

  const handleDeleteLesson = async (modIndex: number, lessonId: string) => {
    const lesson = modules[modIndex].lessons.find(l => l.id === lessonId);
    if (courseId) {
      const confirmDelete = window.confirm(`Are you sure you want to delete lesson "${lesson?.title}"?`);
      if (!confirmDelete) return;
    }

    pushHistory();
    const updated = [...modules];
    updated[modIndex] = {
      ...updated[modIndex],
      lessons: updated[modIndex].lessons.filter(l => l.id !== lessonId)
    };
    setModules(updated);

    if (courseId) {
      setIsSavingCurriculum(true);
      try {
        await deleteModuleOrLessonApi('lesson', lessonId);
        showNotification('Lesson removed successfully.');
      } catch (err) {
        console.error('Failed to delete lesson:', err);
      } finally {
        setIsSavingCurriculum(false);
      }
    } else {
      showNotification('Lesson removed.');
    }
  };

  const [isSavingCurriculum, setIsSavingCurriculum] = useState(false);
  const handleSaveCurriculum = async () => {
    setIsSavingCurriculum(true);
    if (onSave) onSave(modules);
    
    if (courseId) {
      try {
        for (let i = 0; i < modules.length; i++) {
          const mod = modules[i];
          await upsertModuleApi({
            id: mod.id,
            course_id: courseId,
            title: mod.title,
            description: mod.description,
            order_index: i,
            lessons: mod.lessons.map((l, lIdx) => ({
              ...l,
              order_index: lIdx
            }))
          });
        }
        showNotification('Curriculum structure saved successfully!');
      } catch (err) {
        console.error('Failed to save curriculum to API:', err);
        showNotification('Error saving curriculum.', 'error');
      }
    } else {
      showNotification('Curriculum order saved locally!');
    }
    
    setIsSavingCurriculum(false);
  };

  // Calculation stats
  const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const totalQuizzes = modules.reduce((acc, m) => acc + m.lessons.filter(l => l.type === 'quiz').length, 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fadeIn">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl flex items-center space-x-3 text-xs font-bold shadow-2xl transition-all ${
          notification.type === 'success' 
            ? 'bg-emerald-600 text-white' 
            : notification.type === 'error' 
              ? 'bg-rose-600 text-white' 
              : 'bg-indigo-600 text-white'
        }`}>
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Action Buttons */}
          <div className="flex items-center space-x-2 shrink-0">
            {historyStack.length > 0 && (
              <button
                type="button"
                onClick={handleUndo}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-none text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                title="Undo last reorder"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Undo</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleAddModule}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-none text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Section</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDocsModalOpen(true)}
              className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-none text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer border border-indigo-200 dark:border-indigo-800"
              title="View Curriculum Guidelines & Sample Section"
            >
              <BookOpen className="w-4 h-4" />
              <span>Docs & Samples</span>
            </button>

            <button
              type="button"
              onClick={handleSaveCurriculum}
            disabled={isSavingCurriculum}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-none text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Order</span>
            </button>
          </div>
        </div>

        {/* Overview Badges & Search Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-3 py-1 rounded-none bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
              {modules.length} Sections
            </span>
            <span className="px-3 py-1 rounded-none bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold">
              {totalLessons} Total Lectures
            </span>
            <span className="px-3 py-1 rounded-none bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold">
              {totalQuizzes} Assessments
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search lessons to locate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>


      {/* LIST-BASED DRAG & DROP CURRICULUM SECTIONS */}
      <div className="space-y-4">
        {modules.map((mod, modIdx) => {
          const isDraggingThisModule = draggedModuleIndex === modIdx;
          const isDragOverThisModule = dragOverModuleIndex === modIdx;

          // Filter lessons if searching
          const filteredLessons = searchQuery.trim()
            ? mod.lessons.filter(l => l.title.toLowerCase().includes(searchQuery.toLowerCase()))
            : mod.lessons;

          return (
            <div
              key={mod.id}
              draggable
              onDragStart={() => handleModuleDragStart(modIdx)}
              onDragOver={(e) => handleModuleDragOver(e, modIdx)}
              onDrop={() => handleModuleDrop(modIdx)}
              className={`bg-white dark:bg-slate-900 rounded-none border transition-all overflow-hidden ${
                isDraggingThisModule
                  ? 'opacity-40 border-indigo-400 scale-[0.99] shadow-inner'
                  : isDragOverThisModule
                  ? 'border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-900'
                  : 'border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Section Header with Drag Handle */}
              <div className="p-4 sm:p-5 bg-slate-50/90 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {/* Grip Handle for Section Reorder */}
                  <div 
                    className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-grab active:cursor-grabbing rounded-none hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    title="Drag to reorder section"
                  >
                    <GripVertical className="w-5 h-5" />
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleModuleExpand(mod.id)}
                    className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 rounded-none cursor-pointer"
                  >
                    {mod.isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-none bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                        Section {modIdx + 1}
                      </span>
                      <input
                        type="text"
                        value={mod.title}
                        onChange={(e) => {
                          const newTitle = e.target.value;
                          setModules(modules.map(m => m.id === mod.id ? { ...m, title: newTitle } : m));
                        }}
                        className="font-black text-sm text-slate-900 dark:text-slate-100 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-none px-1 flex-1"
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 block px-1 mt-0.5">
                      {mod.lessons.length} Lectures • {mod.description || 'No section description'}
                    </span>
                  </div>
                </div>

                {/* Section Quick Controls */}
                <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                  <button
                    type="button"
                    onClick={() => onManageModule && onManageModule(mod.id)}
                    className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-none text-[10px] font-black uppercase tracking-wider flex items-center space-x-1.5 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-all cursor-pointer mr-0 sm:mr-2"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Manage</span>
                  </button>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => moveModule(modIdx, 'up')}
                      disabled={modIdx === 0}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 disabled:opacity-30 rounded-none"
                      title="Move Section Up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveModule(modIdx, 'down')}
                      disabled={modIdx === modules.length - 1}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 disabled:opacity-30 rounded-none"
                      title="Move Section Down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>

                    <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

                    <button
                      type="button"
                      onClick={() => handleDeleteModule(mod.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-none transition-colors"
                      title="Delete Section"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>


              {/* Collapsible Lessons List with Drag & Drop */}
              {mod.isExpanded && (
                <div className="p-4 sm:p-6 space-y-2">
                  {filteredLessons.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400 border border-dashed rounded-2xl">
                      No lessons in this section matching your search.
                    </div>
                  ) : (
                    filteredLessons.map((lesson, lesIdx) => {
                      const isDraggingThisLesson = 
                        draggedLessonInfo?.moduleIndex === modIdx && 
                        draggedLessonInfo?.lessonIndex === lesIdx;
                      
                      const isDragOverThisLesson =
                        dragOverLessonInfo?.moduleIndex === modIdx &&
                        dragOverLessonInfo?.lessonIndex === lesIdx;

                      return (
                        <div
                          key={lesson.id}
                          draggable
                          onDragStart={(e) => handleLessonDragStart(e, modIdx, lesIdx)}
                          onDragOver={(e) => handleLessonDragOver(e, modIdx, lesIdx)}
                          onDrop={(e) => handleLessonDrop(e, modIdx, lesIdx)}
                          className={`p-4 rounded-none bg-slate-50 dark:bg-slate-800/60 border flex flex-col gap-3 transition-all ${
                            isDraggingThisLesson
                              ? 'opacity-30 border-indigo-400 bg-indigo-50/50'
                              : isDragOverThisLesson
                              ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/50 ring-2 ring-indigo-300'
                              : 'border-slate-200/80 dark:border-slate-700/60 hover:border-indigo-200 dark:hover:border-indigo-800'
                          }`}
                        >
                          <div className="flex flex-col gap-3">
                            {/* Top Row: Handle, Icon, Title */}
                            <div className="flex items-center gap-3">
                              <div 
                                className="p-1 mt-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-grab active:cursor-grabbing rounded-none hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                title="Drag to reorder"
                              >
                                <GripVertical className="w-4 h-4" />
                              </div>

                              <div className="p-2 rounded-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-indigo-600 shrink-0">
                                {lesson.type === 'video' ? <Video className="w-4 h-4 text-indigo-500" /> :
                                 lesson.type === 'quiz' ? <HelpCircle className="w-4 h-4 text-emerald-500" /> :
                                 lesson.type === 'audio' ? <Volume2 className="w-4 h-4 text-purple-500" /> :
                                 <FileText className="w-4 h-4 text-slate-500" />}
                              </div>

                              <div className="flex-1 min-w-0">
                                <input
                                  type="text"
                                  value={lesson.title}
                                  onChange={(e) => {
                                    const updatedTitle = e.target.value;
                                    const updated = [...modules];
                                    updated[modIdx].lessons[lesIdx].title = updatedTitle;
                                    setModules(updated);
                                  }}
                                  className="w-full bg-transparent font-black text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-none px-1"
                                />
                              </div>
                            </div>
                            
                            {/* Action Menu Row */}
                            <div className="flex justify-end">
                              <LessonActionsMenu
                                lesson={lesson}
                                modIdx={modIdx}
                                lesIdx={lesIdx}
                                moveLesson={moveLesson}
                                handleDeleteLesson={handleDeleteLesson}
                                onManageLesson={onManageLesson}
                                modId={mod.id}
                                lessonsLength={mod.lessons.length}
                              />
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 pl-11">
                            <span className="capitalize font-semibold text-slate-600 dark:text-slate-400">{lesson.type}</span>
                            <span className="font-mono">{lesson.duration}</span>
                            {lesson.isPreview && (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">Free Preview</span>
                            )}
                          </div>

                          {/* Resources */}
                          {lesson.resources && lesson.resources.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pl-11">
                              {lesson.resources.map((res: any, rIdx: number) => {
                                const fileType = res.fileType || res.type || res.name?.split('.').pop()?.toLowerCase() || 'link';
                                let icon = '📎';
                                if (fileType === 'pdf') icon = '📕';
                                else if (['doc', 'docx'].includes(fileType)) icon = '📘';
                                else if (['xls', 'xlsx', 'csv'].includes(fileType)) icon = '📗';
                                else if (['zip', 'rar', '7z'].includes(fileType)) icon = '📦';
                                
                                return (
                                  <span 
                                    key={res.id || rIdx}
                                    className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-none bg-emerald-50 dark:bg-emerald-950/40 text-[9px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-100/60 dark:border-emerald-900/40"
                                  >
                                    <span>{icon}</span>
                                    <span className="truncate max-w-[110px]" title={res.name}>{res.name}</span>
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          {/* Content Action Button */}
                          <button
                            type="button"
                            onClick={() => onManageLesson && onManageLesson(mod.id, lesson.id)}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-none text-xs font-black uppercase tracking-wider transition-all cursor-pointer min-h-[44px] flex items-center justify-center"
                          >
                            Edit Content
                          </button>
                        </div>

                      );
                    })
                  )}

                  {/* Dynamic Add Content, Practice Activity, and Assessment Buttons */}
                  <div className="pt-3 flex flex-wrap items-center gap-2 border-t border-slate-200/60 dark:border-slate-800/80 mt-3">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider mr-1">Add to section:</span>
                    <button
                      type="button"
                      onClick={() => handleAddLesson(modIdx, 'video')}
                      className="px-4 py-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded-full text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer min-h-[40px]"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>+ Video Content</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddLesson(modIdx, 'article')}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 rounded-full text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer min-h-[40px]"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>+ Article / Reading</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddLesson(modIdx, 'audio')}
                      className="px-4 py-2 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 hover:bg-purple-100 rounded-full text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer min-h-[40px]"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>+ Practice Activity</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddLesson(modIdx, 'quiz')}
                      className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 rounded-full text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer min-h-[40px]"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>+ Assessment / Quiz</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Floating Save Action Bar */}
      <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
        <div className="text-xs text-slate-500">
          Tip: You can drag lessons between different sections to reorganize topics effortlessly.
        </div>
        <div className="flex items-center space-x-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSaveCurriculum}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Save & Apply Curriculum Order</span>
          </button>
        </div>
      </div>

      {/* Add Module Modal */}
      {isAddModuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                    Add New Section
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setIsAddModuleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Section Title
                </label>
                <input
                  type="text"
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                  placeholder="e.g. Section 1: Introduction to Web Design"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Description (Optional)
                </label>
                <textarea
                  value={newModuleDescription}
                  onChange={(e) => setNewModuleDescription(e.target.value)}
                  placeholder="Briefly describe what learners will learn in this section..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAddModuleModalOpen(false)}
                disabled={isSavingModule}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-black text-xs rounded-2xl cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNewModule}
                disabled={isSavingModule || !newModuleTitle.trim()}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-2xl cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2 shadow-lg shadow-indigo-900/20"
              >
                {isSavingModule ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Section</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Module Deletion Confirmation Modal */}
      {moduleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black">Remove Curriculum Section?</h3>
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
              Are you sure you want to remove <span className="font-bold text-slate-900 dark:text-slate-100">"{moduleToDelete.title}"</span>? 
              This will also remove all associated lessons. This action cannot be undone.
            </p>
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setModuleToDelete(null)}
                disabled={isDeletingModule}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-black text-xs rounded-2xl cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteModule}
                disabled={isDeletingModule}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-2xl cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2 shadow-lg shadow-rose-900/20"
              >
                {isDeletingModule ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <span>Remove Section</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Curriculum Documentation & Samples Modal */}
      {isDocsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                    Curriculum Design & Guidelines
                  </h3>
                  <p className="text-xs text-slate-500">Best practices and interactive sample section layout</p>
                </div>
              </div>
              <button
                onClick={() => setIsDocsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-6 text-xs text-slate-600 dark:text-slate-300">
              <div className="space-y-2">
                <h4 className="font-black text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wide">
                  Core Principle: One Learning Objective Per Section
                </h4>
                <p className="leading-relaxed">
                  Organize your course into logical sections (modules). Each section should focus on mastering a single, specific learning objective. Learners progress faster and retain knowledge better when material is chunked into focused milestones.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-2">
                  <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-bold">
                    <Video className="w-4 h-4" />
                    <span>1. Content & Lectures</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 leading-normal">
                    Deliver core concepts via concise HD video lectures (5–12 mins) paired with rich article readings and cheat sheets.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 space-y-2">
                  <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 font-bold">
                    <Volume2 className="w-4 h-4" />
                    <span>2. Practice Activities</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 leading-normal">
                    Engage learners with hands-on exercises, coding challenges, worksheets, or guided application tasks.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-black text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wide">
                  Sample Section & Lesson Layout
                </h4>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 font-mono">
                  <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 font-black">
                    <span>Section 1: Foundations & Setup</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">4 Items</span>
                  </div>
                  <div className="space-y-2 pl-2 border-l-2 border-indigo-500 text-[11px] text-slate-700 dark:text-slate-300">
                    <div className="flex items-center justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
                      <span className="flex items-center space-x-2 font-bold"><Video className="w-3.5 h-3.5 text-indigo-500" /><span>1.1 Welcome & Overview (Video)</span></span>
                      <span className="text-emerald-600 font-bold">Free Preview</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
                      <span className="flex items-center space-x-2"><FileText className="w-3.5 h-3.5 text-slate-500" /><span>1.2 Environment Setup Guide (Article)</span></span>
                      <span>05:00</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
                      <span className="flex items-center space-x-2"><Volume2 className="w-3.5 h-3.5 text-purple-500" /><span>1.3 Hands-on Practice Exercise</span></span>
                      <span>15:00</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="flex items-center space-x-2 font-bold"><HelpCircle className="w-3.5 h-3.5 text-emerald-500" /><span>1.4 Module 1 Assessment Quiz</span></span>
                      <span>10 Qs</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsDocsModalOpen(false)}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-md cursor-pointer"
              >
                Got It, Close Docs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
