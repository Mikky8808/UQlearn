import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Sparkles, 
  ArrowUp, 
  ArrowDown, 
  ExternalLink, 
  Tag, 
  Eye, 
  EyeOff, 
  Star, 
  RotateCcw, 
  Database, 
  Copy, 
  CheckCircle2, 
  AlertTriangle,
  Layers,
  Code,
  Cpu,
  Palette,
  Briefcase,
  Megaphone,
  ShieldCheck,
  Laptop,
  Smartphone,
  LineChart,
  Globe,
  Rocket,
  Compass,
  BookOpen,
  Terminal,
  Target,
  FileText,
  Filter,
  RefreshCw,
  UploadCloud,
  Zap
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CourseCategory, Course } from '../../types';
import { syncCourseCategoriesApi, fetchCourseCategoriesApi, API_ENDPOINTS } from '../../lib/apiConfig';

interface AdminCourseCategoriesTabProps {
  courses: Course[];
  onSelectCategoryFilter?: (catName: string) => void;
}

// Icon dictionary for category icon selection
export const AVAILABLE_CATEGORY_ICONS = [
  { name: 'Code', icon: Code, label: 'Code & Software' },
  { name: 'Cpu', icon: Cpu, label: 'Data Science & AI' },
  { name: 'Palette', icon: Palette, label: 'Design & UI/UX' },
  { name: 'Briefcase', icon: Briefcase, label: 'Business & Management' },
  { name: 'Megaphone', icon: Megaphone, label: 'Marketing & SEO' },
  { name: 'Sparkles', icon: Sparkles, label: 'Personal Growth' },
  { name: 'ShieldCheck', icon: ShieldCheck, label: 'Cybersecurity' },
  { name: 'Database', icon: Database, label: 'Databases & Backend' },
  { name: 'Laptop', icon: Laptop, label: 'Computer Science' },
  { name: 'Smartphone', icon: Smartphone, label: 'Mobile Apps' },
  { name: 'LineChart', icon: LineChart, label: 'Finance & Analytics' },
  { name: 'Globe', icon: Globe, label: 'Languages & Web' },
  { name: 'Rocket', icon: Rocket, label: 'Startups & Scale' },
  { name: 'Terminal', icon: Terminal, label: 'DevOps & Cloud' },
  { name: 'Target', icon: Target, label: 'Career & Strategy' },
  { name: 'BookOpen', icon: BookOpen, label: 'General Academia' },
];

export const AVAILABLE_CATEGORY_COLORS = [
  { id: 'rose', name: 'Rose', bg: 'bg-rose-500', text: 'text-rose-500', badge: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800' },
  { id: 'teal', name: 'Teal', bg: 'bg-teal-500', text: 'text-teal-500', badge: 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800' },
  { id: 'purple', name: 'Purple', bg: 'bg-purple-500', text: 'text-purple-500', badge: 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
  { id: 'indigo', name: 'Indigo', bg: 'bg-indigo-500', text: 'text-indigo-500', badge: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' },
  { id: 'amber', name: 'Amber', bg: 'bg-amber-500', text: 'text-amber-500', badge: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  { id: 'emerald', name: 'Emerald', bg: 'bg-emerald-500', text: 'text-emerald-500', badge: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  { id: 'sky', name: 'Sky', bg: 'bg-sky-500', text: 'text-sky-500', badge: 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800' },
  { id: 'orange', name: 'Orange', bg: 'bg-orange-500', text: 'text-orange-500', badge: 'bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800' },
];

export const renderCategoryIcon = (iconName: string, className = "w-5 h-5") => {
  const match = AVAILABLE_CATEGORY_ICONS.find(i => i.name.toLowerCase() === (iconName || '').toLowerCase());
  if (match) {
    const IconComp = match.icon;
    return <IconComp className={className} />;
  }
  return <BookOpen className={className} />;
};

export const AdminCourseCategoriesTab: React.FC<AdminCourseCategoriesTabProps> = ({
  courses,
  onSelectCategoryFilter,
}) => {
  const { categories, addCategory, updateCategory, deleteCategory, reorderCategories } = useApp();

  const [view, setView] = useState<'list' | 'form'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'featured'>('all');
  const [selectedCategoryModal, setSelectedCategoryModal] = useState<CourseCategory | null>(null);
  const [viewingCategoryCourses, setViewingCategoryCourses] = useState<CourseCategory | null>(null);
  const [actionNotice, setActionNotice] = useState('');

  // Form states for Add/Edit Category
  const [formData, setFormData] = useState<{
    name: string;
    slug: string;
    description: string;
    icon: string;
    color: string;
    isFeatured: boolean;
    isActive: boolean;
    subCategoriesText: string;
  }>({
    name: '',
    slug: '',
    description: '',
    icon: 'Code',
    color: 'rose',
    isFeatured: true,
    isActive: true,
    subCategoriesText: ''
  });

  const showNotification = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(''), 3500);
  };

  // Map courses count by category name
  const coursesCountByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    courses.forEach(c => {
      const cat = c.category || 'Uncategorized';
      map[cat] = (map[cat] || 0) + 1;
    });
    return map;
  }, [courses]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories
      .filter(cat => {
        const matchesSearch = 
          cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          cat.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
          cat.description.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        if (filterStatus === 'active') return cat.isActive !== false;
        if (filterStatus === 'inactive') return cat.isActive === false;
        if (filterStatus === 'featured') return !!cat.isFeatured;
        return true;
      })
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [categories, searchQuery, filterStatus]);

  const handleOpenCreateModal = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      icon: 'Code',
      color: 'teal',
      isFeatured: true,
      isActive: true,
      subCategoriesText: ''
    });
    setSelectedCategoryModal(null);
    setView('form');
  };

  const handleOpenEditModal = (cat: CourseCategory) => {
    setFormData({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      icon: cat.icon || 'Code',
      color: cat.color || 'rose',
      isFeatured: cat.isFeatured ?? true,
      isActive: cat.isActive ?? true,
      subCategoriesText: (cat.subCategories || []).join(', ')
    });
    setSelectedCategoryModal(cat);
    setView('form');
  };

  const handleNameChange = (val: string) => {
    const slug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setFormData(prev => ({
      ...prev,
      name: val,
      slug: !selectedCategoryModal ? slug : prev.slug
    }));
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Please enter a valid category name.');
      return;
    }

    const subCats = formData.subCategoriesText
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    if (!selectedCategoryModal) {
      addCategory({
        name: formData.name.trim(),
        slug: formData.slug.trim() || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: formData.description.trim(),
        icon: formData.icon,
        color: formData.color,
        isFeatured: formData.isFeatured,
        isActive: formData.isActive,
        subCategories: subCats,
        sortOrder: categories.length + 1
      });
      showNotification(`Category "${formData.name}" created successfully!`);
    } else {
      updateCategory(selectedCategoryModal.id, {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        description: formData.description.trim(),
        icon: formData.icon,
        color: formData.color,
        isFeatured: formData.isFeatured,
        isActive: formData.isActive,
        subCategories: subCats
      });
      showNotification(`Category "${formData.name}" updated successfully!`);
    }

    setView('list');
    setSelectedCategoryModal(null);
  };

  const handleDeleteCategory = (cat: CourseCategory) => {
    const count = coursesCountByCategory[cat.name] || 0;
    if (count > 0) {
      const confirmMsg = `There are ${count} course(s) assigned to "${cat.name}". Deleting this category will mark them as unassigned in filters. Are you sure you want to delete this category?`;
      if (!confirm(confirmMsg)) return;
    } else {
      if (!confirm(`Are you sure you want to delete the category "${cat.name}"?`)) return;
    }

    deleteCategory(cat.id);
    showNotification(`Category "${cat.name}" has been deleted.`);
  };

  const handleMoveOrder = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= filteredCategories.length) return;

    const newOrder = [...categories];
    const itemA = filteredCategories[index];
    const itemB = filteredCategories[targetIndex];

    const idxA = newOrder.findIndex(c => c.id === itemA.id);
    const idxB = newOrder.findIndex(c => c.id === itemB.id);

    if (idxA !== -1 && idxB !== -1) {
      const temp = newOrder[idxA];
      newOrder[idxA] = newOrder[idxB];
      newOrder[idxB] = temp;
      reorderCategories(newOrder);
      showNotification('Category sort order updated.');
    }
  };

  const handleToggleFeatured = (cat: CourseCategory) => {
    updateCategory(cat.id, { isFeatured: !cat.isFeatured });
    showNotification(`"${cat.name}" is now ${!cat.isFeatured ? 'featured on home & discover' : 'unfeatured'}.`);
  };

  const handleToggleActive = (cat: CourseCategory) => {
    updateCategory(cat.id, { isActive: !cat.isActive });
    showNotification(`"${cat.name}" status set to ${!cat.isActive ? 'Active' : 'Hidden'}.`);
  };

  if (view === 'form') {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-8 max-w-4xl mx-auto">
          <button
            onClick={() => { setView('list'); setSelectedCategoryModal(null); }}
            className="mb-6 flex items-center space-x-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowUp className="w-4 h-4 -rotate-90" />
            <span>Back to Categories</span>
          </button>
          
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
              {selectedCategoryModal ? 'Edit Category' : 'Create New Category'}
            </h2>
            
            <form onSubmit={handleSaveCategory} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Category Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all dark:text-white"
                    placeholder="e.g. Software Development"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">URL Slug</label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all dark:text-white"
                    placeholder="e.g. software-development"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all dark:text-white min-h-[100px] resize-y"
                  placeholder="Describe this category and what learners will learn..."
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4 border-t border-slate-100 dark:border-slate-800">
                {/* Icon Selection */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center justify-between">
                    <span>Category Icon</span>
                    <span className="text-xs font-normal text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                      {AVAILABLE_CATEGORY_ICONS.length} available
                    </span>
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-8 lg:grid-cols-4 gap-2">
                    {AVAILABLE_CATEGORY_ICONS.map((ic) => (
                      <button
                        key={ic.name}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, icon: ic.name }))}
                        title={ic.label}
                        className={`p-3 flex justify-center items-center rounded-xl transition-all ${
                          formData.icon === ic.name 
                            ? 'bg-rose-50 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 ring-2 ring-rose-500 shadow-sm' 
                            : 'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                      >
                        <ic.icon className="w-5 h-5" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Selection */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center justify-between">
                    <span>Theme Color Accent</span>
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {AVAILABLE_CATEGORY_COLORS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, color: c.id }))}
                        title={c.name}
                        className={`p-3 flex justify-center items-center rounded-xl transition-all ${
                          formData.color === c.id 
                            ? 'bg-slate-100 dark:bg-slate-800 ring-2 ring-slate-900 dark:ring-white shadow-sm' 
                            : 'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full ${c.bg} shadow-sm border border-black/10`} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${
                  formData.isFeatured 
                    ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-900/10' 
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50'
                }`}>
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) => setFormData(prev => ({ ...prev, isFeatured: e.target.checked }))}
                    className="w-4 h-4 text-amber-500 border-slate-300 rounded focus:ring-amber-500 mr-3 cursor-pointer"
                  />
                  <div>
                    <span className="block text-sm font-bold text-slate-900 dark:text-white">Featured Category</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">Display prominently on the homepage</span>
                  </div>
                </label>

                <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${
                  formData.isActive 
                    ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10' 
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50'
                }`}>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="w-4 h-4 text-emerald-500 border-slate-300 rounded focus:ring-emerald-500 mr-3 cursor-pointer"
                  />
                  <div>
                    <span className="block text-sm font-bold text-slate-900 dark:text-white">Active (Visible)</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">Allow learners to browse this category</span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => { setView('list'); setSelectedCategoryModal(null); }}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-rose-600 dark:hover:bg-rose-500 rounded-xl transition-colors shadow-sm"
                >
                  {selectedCategoryModal ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {actionNotice && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center space-x-3 text-emerald-900 dark:text-emerald-200 shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <span className="text-xs font-bold">{actionNotice}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-200 dark:border-rose-800">
                <Layers className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                Course Categories Configuration
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
              Organize course taxonomy, create curriculum sectors, set featured homepage tracks, and customize icon badges across the platform.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center space-x-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Category</span>
            </button>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search category name, slug, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-rose-500 font-medium"
            />
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0 overflow-x-auto">
            {(['all', 'active', 'featured', 'inactive'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors cursor-pointer whitespace-nowrap ${
                  filterStatus === status
                    ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {status} ({
                  status === 'all' ? categories.length :
                  status === 'active' ? categories.filter(c => c.isActive !== false).length :
                  status === 'featured' ? categories.filter(c => c.isFeatured).length :
                  categories.filter(c => c.isActive === false).length
                })
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Categories Grid / Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCategories.map((cat, index) => {
          const courseCount = coursesCountByCategory[cat.name] || 0;
          const colorMeta = AVAILABLE_CATEGORY_COLORS.find(c => c.id === cat.color) || AVAILABLE_CATEGORY_COLORS[0];

          return (
            <div
              key={cat.id}
              className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all p-5 flex flex-col justify-between space-y-4 hover:shadow-md ${
                cat.isActive === false
                  ? 'border-slate-200 dark:border-slate-800 opacity-60'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="space-y-3">
                
                {/* Card Header: Icon + Name + Quick Badges */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-sm ${colorMeta.bg}`}>
                      {renderCategoryIcon(cat.icon, "w-5 h-5")}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base leading-tight">
                        {cat.name}
                      </h3>
                      <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                        /{cat.slug}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-1">
                    {cat.isFeatured && (
                      <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-md text-[10px] font-extrabold flex items-center space-x-1">
                        <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                        <span>Featured</span>
                      </span>
                    )}
                    {cat.isActive === false ? (
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-md text-[10px] font-bold">
                        Hidden
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 rounded-md text-[10px] font-bold">
                        Active
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed min-h-[32px]">
                  {cat.description || 'No description provided for this sector.'}
                </p>

                {/* Subcategories & Tags */}
                {cat.subCategories && cat.subCategories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {cat.subCategories.slice(0, 4).map((sub, sIdx) => (
                      <span
                        key={sIdx}
                        className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 text-[10px] font-semibold rounded-md flex items-center space-x-1"
                      >
                        <Tag className="w-2.5 h-2.5 opacity-60" />
                        <span>{sub}</span>
                      </span>
                    ))}
                    {cat.subCategories.length > 4 && (
                      <span className="px-1.5 py-0.5 text-slate-400 text-[10px] font-bold">
                        +{cat.subCategories.length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer: Course Count + Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => setViewingCategoryCourses(cat)}
                  className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 flex items-center space-x-1.5 cursor-pointer"
                  title="View courses in this category"
                >
                  <BookOpen className="w-3.5 h-3.5 text-rose-500" />
                  <span>{courseCount} Course{courseCount !== 1 ? 's' : ''}</span>
                </button>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleMoveOrder(index, 'up')}
                    disabled={index === 0}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 rounded-lg transition-colors cursor-pointer"
                    title="Move up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleMoveOrder(index, 'down')}
                    disabled={index === filteredCategories.length - 1}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 rounded-lg transition-colors cursor-pointer"
                    title="Move down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleToggleFeatured(cat)}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      cat.isFeatured
                        ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                    }`}
                    title={cat.isFeatured ? 'Remove from Featured' : 'Mark as Featured'}
                  >
                    <Star className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleToggleActive(cat)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                    title={cat.isActive !== false ? 'Hide Category' : 'Activate Category'}
                  >
                    {cat.isActive !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => handleOpenEditModal(cat)}
                    className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                    title="Edit Category"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteCategory(cat)}
                    className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                    title="Delete Category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {filteredCategories.length === 0 && (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <Layers className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">No Categories Found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No course categories matched your search criteria. Try modifying your filter or create a new category.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl hover:bg-rose-500 transition-colors inline-flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Category</span>
          </button>
        </div>
      )}

      {/* VIEW COURSES IN CATEGORY MODAL */}
      {viewingCategoryCourses && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col animate-fadeIn">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl">
                  {renderCategoryIcon(viewingCategoryCourses.icon, "w-5 h-5")}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                    Courses in "{viewingCategoryCourses.name}"
                  </h3>
                  <span className="text-xs text-slate-500">
                    {courses.filter(c => c.category === viewingCategoryCourses.name).length} total published/draft course(s)
                  </span>
                </div>
              </div>

              <button
                onClick={() => setViewingCategoryCourses(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 pr-1 space-y-2">
              {courses.filter(c => c.category === viewingCategoryCourses.name).map(course => (
                <div key={course.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <img 
                      src={course.image} 
                      alt={course.title} 
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80'; }}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0" 
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{course.title}</h4>
                      <p className="text-[11px] text-slate-500">Instructor: {course.instructor} • ${course.price} • {course.rating}★</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded-lg shrink-0">
                    Active
                  </span>
                </div>
              ))}

              {courses.filter(c => c.category === viewingCategoryCourses.name).length === 0 && (
                <div className="py-8 text-center text-xs text-slate-500">
                  No courses are currently assigned to "{viewingCategoryCourses.name}". Instructors can select this category when publishing new courses.
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setViewingCategoryCourses(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
