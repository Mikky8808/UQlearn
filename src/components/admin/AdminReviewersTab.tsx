import React, { useState, useEffect } from 'react';
import { 
  getReviewers, 
  fetchReviewersFromApi,
  addReviewer, 
  updateReviewerStatus, 
  updateReviewer, 
  deleteReviewer, 
  ReviewerAccount 
} from '../../lib/reviewerService';
import { useApp } from '../../context/AppContext';
import { 
  ShieldCheck, 
  UserPlus, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Edit3, 
  Trash2, 
  Lock, 
  Unlock, 
  Clock,
  ArrowLeft,
  Check,
  Eye,
  User,
  ExternalLink,
  ShieldAlert,
  Globe,
  Award,
  BookOpen,
  Calendar,
  Activity,
  FileText
} from 'lucide-react';

export const AdminReviewersTab: React.FC = () => {
  const { categories } = useApp();
  const [reviewers, setReviewers] = useState<ReviewerAccount[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'suspended' | 'pending'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'reviewer' | 'senior_reviewer' | 'category_lead' | 'admin'>('all');
  const [affiliationFilter, setAffiliationFilter] = useState<'all' | 'staff' | 'hdr' | 'alumni' | 'external'>('all');
  
  // View mode instead of modal: 'list' | 'add' | 'edit' | 'details'
  const [viewMode, setViewMode] = useState<'list' | 'add' | 'edit' | 'details'>('list');
  const [selectedReviewer, setSelectedReviewer] = useState<ReviewerAccount | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formSpecialization, setFormSpecialization] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formStatus, setFormStatus] = useState<'approved' | 'suspended' | 'pending'>('approved');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Advanced Form fields
  const [formRole, setFormRole] = useState<'reviewer' | 'senior_reviewer' | 'category_lead' | 'admin'>('reviewer');
  const [formPermissions, setFormPermissions] = useState<string[]>(['publish', 'approve']);
  const [formUqAffiliation, setFormUqAffiliation] = useState<'staff' | 'hdr' | 'alumni' | 'external' | 'unknown'>('unknown');
  const [formCredentialUrl, setFormCredentialUrl] = useState('');
  const [formBio, setFormBio] = useState('');
  const [formTimezone, setFormTimezone] = useState('Africa/Nairobi');
  const [formAccessExpiresAt, setFormAccessExpiresAt] = useState('');
  const [formStatusReason, setFormStatusReason] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formSource, setFormSource] = useState<'invite' | 'application' | 'import'>('invite');
  const [formEmailVerified, setFormEmailVerified] = useState(false);

  // Load reviewers on mount
  useEffect(() => {
    setReviewers(getReviewers());
    fetchReviewersFromApi().then(data => {
      if (Array.isArray(data) && data.length > 0) {
        setReviewers(data);
      }
    });
  }, []);

  const refreshList = async () => {
    setReviewers(getReviewers());
    const latest = await fetchReviewersFromApi();
    setReviewers(latest);
  };

  const handleOpenAddPage = () => {
    setSelectedReviewer(null);
    setFormName('');
    setFormEmail('');
    setFormTitle('Course Quality Evaluator');
    setFormSpecialization('All Categories');
    setFormPhone('');
    setFormStatus('approved');
    setSelectedCategories(['Development', 'Design']);
    setFormError('');
    
    // Set advanced fields defaults
    setFormRole('reviewer');
    setFormPermissions(['publish', 'approve']);
    setFormUqAffiliation('unknown');
    setFormCredentialUrl('');
    setFormBio('');
    setFormTimezone('Africa/Nairobi');
    setFormAccessExpiresAt('');
    setFormStatusReason('');
    setFormNotes('');
    setFormSource('invite');
    setFormEmailVerified(false);

    setViewMode('add');
  };

  const handleOpenEditPage = (rev: ReviewerAccount) => {
    setSelectedReviewer(rev);
    setFormName(rev.name);
    setFormEmail(rev.email);
    setFormTitle(rev.title || '');
    setFormSpecialization(rev.specialization || '');
    setFormPhone(rev.phone || '');
    setFormStatus(rev.status);
    setSelectedCategories(rev.categories || ['All Categories']);
    setFormError('');

    // Setup advanced fields
    setFormRole(rev.role || 'reviewer');
    setFormPermissions(rev.permissions || ['publish', 'approve']);
    setFormUqAffiliation(rev.uq_affiliation || 'unknown');
    setFormCredentialUrl(rev.credential_url || '');
    setFormBio(rev.bio || '');
    setFormTimezone(rev.timezone || 'Africa/Nairobi');
    setFormAccessExpiresAt(rev.access_expires_at ? rev.access_expires_at.split('T')[0] : '');
    setFormStatusReason(rev.status_reason || '');
    setFormNotes(rev.notes || '');
    setFormSource(rev.source || 'invite');
    setFormEmailVerified(!!rev.email_verified);

    setViewMode('edit');
  };

  const handleViewDetails = (rev: ReviewerAccount) => {
    setSelectedReviewer(rev);
    setViewMode('details');
  };

  const handleSaveReviewer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Please enter the reviewer name.');
      return;
    }
    if (!formEmail.trim() || !formEmail.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const formattedExpiry = formAccessExpiresAt ? new Date(formAccessExpiresAt).toISOString() : undefined;

      const reviewerData = {
        name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        title: formTitle.trim(),
        specialization: formSpecialization.trim(),
        phone: formPhone.trim(),
        status: formStatus,
        categories: selectedCategories,
        addedBy: 'Admin Console',
        
        role: formRole,
        permissions: formPermissions,
        uq_affiliation: formUqAffiliation,
        credential_url: formCredentialUrl.trim(),
        bio: formBio.trim(),
        timezone: formTimezone,
        access_expires_at: formattedExpiry,
        status_reason: formStatusReason.trim(),
        notes: formNotes.trim(),
        source: formSource,
        email_verified: formEmailVerified
      };

      if (viewMode === 'edit' && selectedReviewer) {
        await updateReviewer(selectedReviewer.id, reviewerData);
      } else {
        await addReviewer(reviewerData);
      }

      setViewMode('list');
      refreshList();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit reviewer profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (rev: ReviewerAccount, newStatus: 'approved' | 'suspended') => {
    const reason = newStatus === 'suspended' ? window.prompt('Specify suspension reason (optional):') || 'Suspended by Administrator' : '';
    await updateReviewerStatus(rev.id, newStatus, reason, 'Super Admin');
    refreshList();
  };

  const handleDelete = async (rev: ReviewerAccount) => {
    if (window.confirm(`Are you sure you want to soft-delete reviewer ${rev.name}? This preserves historical review work while blocking account access.`)) {
      await deleteReviewer(rev.id);
      refreshList();
    }
  };

  const togglePermission = (perm: string) => {
    if (formPermissions.includes(perm)) {
      setFormPermissions(formPermissions.filter(p => p !== perm));
    } else {
      setFormPermissions([...formPermissions, perm]);
    }
  };

  const toggleCategorySelection = (catName: string) => {
    if (selectedCategories.includes(catName)) {
      setSelectedCategories(selectedCategories.filter(c => c !== catName));
    } else {
      setSelectedCategories([...selectedCategories, catName]);
    }
  };

  // Filters application
  const filteredReviewers = reviewers.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (roleFilter !== 'all' && r.role !== roleFilter) return false;
    if (affiliationFilter !== 'all' && r.uq_affiliation !== affiliationFilter) return false;
    
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      return (
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        (r.title || '').toLowerCase().includes(q) ||
        (r.specialization || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalCount = reviewers.length;
  const approvedCount = reviewers.filter(r => r.status === 'approved').length;
  const suspendedCount = reviewers.filter(r => r.status === 'suspended').length;
  const pendingCount = reviewers.filter(r => r.status === 'pending').length;

  // View: DETAILS PAGE
  if (viewMode === 'details' && selectedReviewer) {
    const rev = selectedReviewer;
    return (
      <div className="space-y-4 pb-12">
        {/* Detail Header with Back Navigation */}
        <div className="bg-slate-900 border border-slate-800 rounded-none p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setViewMode('list')}
              className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-none border border-slate-700 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-sm font-bold uppercase tracking-wider text-white">
                Reviewer Profile Dossier
              </h1>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Detailed authorization, verification states, and moderation workload statistics.
              </p>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => handleOpenEditPage(rev)}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-none transition-colors border border-purple-500"
            >
              Edit Dossier
            </button>
            <button
              onClick={() => setViewMode('list')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold rounded-none border border-slate-700 transition-colors"
            >
              Close Folder
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Column 1: Identity & Badges */}
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-none p-5 text-center space-y-4 relative overflow-hidden shadow-md">
              <div className="w-20 h-20 rounded-none bg-purple-600 text-white font-black text-2xl flex items-center justify-center mx-auto border border-purple-400 shadow-xl">
                {rev.avatar ? (
                  <img src={rev.avatar} alt={rev.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{rev.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              
              <div>
                <h2 className="text-base font-black text-white">{rev.name}</h2>
                <p className="text-xs text-purple-400 font-bold mt-0.5">{rev.title}</p>
                <p className="text-[10px] text-slate-500 font-mono mt-1">{rev.email}</p>
              </div>

              {/* Status badges */}
              <div className="flex flex-wrap justify-center gap-1.5 pt-2">
                <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-none border ${
                  rev.status === 'approved' 
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
                    : rev.status === 'suspended'
                    ? 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                    : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                }`}>
                  Status: {rev.status}
                </span>
              </div>
            </div>
          </div>

          {/* Column 2: Scope & Stats */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Workload and Performance Data */}
            <div className="bg-slate-900 border border-slate-800 rounded-none p-5 space-y-4 shadow-md">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center justify-between">
                <span>Moderation Stats & SLA Tracking</span>
                <Activity className="w-4.5 h-4.5 text-purple-400" />
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-none">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Submissions</p>
                  <p className="text-xl font-black text-purple-400 mt-1">{rev.reviews_submitted || 0}</p>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-none">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Published</p>
                  <p className="text-xl font-black text-emerald-400 mt-1">{rev.reviews_published || 0}</p>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-none">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Login Count</p>
                  <p className="text-xl font-black text-white mt-1">{rev.login_count || 0}</p>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-none">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Response Time</p>
                  <p className="text-xs font-black text-slate-300 mt-2.5">SLA: 48 hrs</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">First Onboarded:</span>
                  <span className="font-semibold text-slate-300">{new Date(rev.addedAt).toLocaleString()} by {rev.addedBy}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Last Active Portal Session:</span>
                  <span className="font-semibold text-slate-300">
                    {rev.lastLoginAt ? new Date(rev.lastLoginAt).toLocaleString() : 'Never logged in yet'}
                  </span>
                </div>
              </div>
            </div>

            {/* Scope / Categories */}
            <div className="bg-slate-900 border border-slate-800 rounded-none p-5 space-y-4 shadow-md">
              <div>
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Assigned Moderation Scope Categories
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {(rev.categories || ['All Categories']).map((cat, i) => (
                    <span key={i} className="px-2.5 py-1 bg-slate-950 border border-slate-800 text-xs font-bold text-purple-300 rounded-none">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>

              {rev.status === 'suspended' && rev.status_reason && (
                <div className="p-3 bg-rose-950/40 border border-rose-500/30 text-rose-300 rounded-none text-xs space-y-1">
                  <p className="font-black flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>Suspension Audit Cause Logged:</span>
                  </p>
                  <p className="font-mono text-[11px]">"{rev.status_reason}"</p>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    );
  }

  // View: ADD OR EDIT PAGE
  if (viewMode === 'add' || viewMode === 'edit') {
    return (
      <div className="space-y-4 pb-12">
        
        {/* Sub-page Header with Back Navigation */}
        <div className="bg-slate-900 border border-slate-800 rounded-none p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-none border border-slate-700 transition-colors cursor-pointer flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-sm font-bold uppercase tracking-wider text-white">
                {viewMode === 'add' ? 'Authorize New Course Reviewer' : 'Edit Authorized Course Reviewer'}
              </h1>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Reviewers authorized here gain exclusive portal access to review submitted curriculum modules.
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className="text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancel & Return
          </button>
        </div>

        {/* Form Container (Pure Sharp Edges - Full Width Page Layout) */}
        <div className="bg-slate-900 border border-slate-800 rounded-none p-6 space-y-6 w-full shadow-2xl">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-xs font-bold uppercase text-purple-400 tracking-widest">
              Reviewer Identity & Security Configurations
            </h2>
          </div>

          {formError && (
            <div className="p-3 bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs rounded-none flex items-center space-x-2">
              <AlertTriangle className="w-4.5 h-4.5 text-rose-400 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSaveReviewer} className="space-y-6">
            
            {/* Section 1: Core Information */}
            <div className="space-y-4">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-850 pb-1">
                1. Account Credentials & Contact
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Reviewer Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Dr. Sarah Jenkins"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-none text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Reviewer Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    disabled={viewMode === 'edit'}
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="sarah.jenkins@gmail.com"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-none text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-all font-mono disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Phone Contact Number
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="e.g. +61 7 3365 1111"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-none text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Title / Platform Role Name
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Senior Course Auditor"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-none text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Expert Specialization Field
                  </label>
                  <input
                    type="text"
                    value={formSpecialization}
                    onChange={(e) => setFormSpecialization(e.target.value)}
                    placeholder="e.g. Fullstack Software Engineering"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-none text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Assigned Course Categories for Moderation Scoping */}
            <div className="space-y-4">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-850 pb-1">
                2. Assigned Course Categories for Moderation Scoping
              </h3>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Select Scope Categories
                </label>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-950 border border-slate-800 rounded-none">
                  {['Development', 'Design', 'Data Science', 'Business', 'Marketing', 'Personal Growth', 'All Categories'].map((cat) => {
                    const isSelected = selectedCategories.includes(cat);
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => toggleCategorySelection(cat)}
                        className={`px-3 py-1.5 rounded-none text-[10px] font-bold transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-purple-600 text-white border-purple-400'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-850">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold rounded-none border border-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-none shadow-md transition-all cursor-pointer border border-purple-500 disabled:opacity-50 flex items-center space-x-2"
              >
                <span>{isSubmitting ? 'Saving to Database...' : (viewMode === 'add' ? 'Authorize Reviewer Account' : 'Save Changes')}</span>
              </button>
            </div>

          </form>
        </div>

      </div>
    );
  }

  // List View (The Table)
  return (
    <div className="space-y-4 pb-12">
      
      {/* Control Bar & Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        
        <div className="flex items-center space-x-3">
          <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0" />
          <h1 className="text-base font-bold text-white tracking-wide uppercase">
            Course Reviewers Directory
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 ml-auto">
          {/* Search Input */}
          <div className="relative min-w-[200px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-all"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500 cursor-pointer"
          >
            <option value="all">All Statuses ({totalCount})</option>
            <option value="approved">Approved ({approvedCount})</option>
            <option value="suspended">Suspended ({suspendedCount})</option>
            <option value="pending">Pending ({pendingCount})</option>
          </select>

          {/* Add Reviewer Button */}
          <button
            onClick={handleOpenAddPage}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-2 cursor-pointer border border-purple-500/40"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Reviewer</span>
          </button>
        </div>

      </div>

      {/* Reviewers Table Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {filteredReviewers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <ShieldCheck className="w-8 h-8 text-purple-400 mx-auto animate-pulse" />
            <p className="text-xs font-bold text-white">No reviewers found matching criteria.</p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Click "Add New Reviewer" to authorize a course reviewer email address to the system.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Reviewer Profile</th>
                  <th className="py-3.5 px-4">Authorized Email</th>
                  <th className="py-3.5 px-4">Assigned Categories</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/60">
                {filteredReviewers.map((rev) => (
                  <tr key={rev.id} className="hover:bg-purple-950/10 transition-colors">
                    
                    {/* Name, role badge & Affiliation */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-none bg-purple-600 text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0 border border-purple-400/30">
                          {rev.avatar ? (
                            <img src={rev.avatar} alt={rev.name} className="w-full h-full object-cover rounded-none" />
                          ) : (
                            <span>{rev.name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-bold text-white">{rev.name}</p>
                            <span className="px-1.5 py-0.2 bg-purple-950 border border-purple-800 text-[8px] text-purple-300 rounded-none uppercase font-black">
                              {rev.role.replace('_', ' ')}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 block">
                            {rev.title || 'Course Reviewer'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3.5 px-4 font-mono text-purple-300 font-semibold whitespace-nowrap">
                      {rev.email}
                    </td>

                    {/* Assigned Scope Categories */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {(rev.categories || ['All Categories']).map((cat, i) => (
                          <span key={i} className="bg-slate-800 text-slate-300 text-[9px] font-bold px-2 py-0.5 rounded-none border border-slate-700/50">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {rev.status === 'approved' ? (
                        <span className="inline-flex items-center space-x-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-none text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Approved & Active</span>
                        </span>
                      ) : rev.status === 'suspended' ? (
                        <span className="inline-flex items-center space-x-1 bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-none text-[10px] font-bold">
                          <Lock className="w-3 h-3 text-rose-400" />
                          <span>Suspended</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-none text-[10px] font-bold">
                          <Clock className="w-3 h-3 text-amber-400 animate-pulse" />
                          <span>Pending Approval</span>
                        </span>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-2">
                        
                        {/* View Profile Dossier */}
                        <button
                          onClick={() => handleViewDetails(rev)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] font-bold rounded-none transition-all flex items-center space-x-1 cursor-pointer"
                          title="View Profile Dossier"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Details</span>
                        </button>

                        {/* Approve/Activate or Suspend Toggle */}
                        {rev.status === 'approved' ? (
                          <button
                            onClick={() => handleToggleStatus(rev, 'suspended')}
                            className="px-2 py-1 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-[10px] font-bold rounded-none transition-all flex items-center space-x-1 cursor-pointer"
                            title="Suspend Reviewer Access"
                          >
                            <Lock className="w-2.5 h-2.5" />
                            <span>Suspend</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(rev, 'approved')}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-none shadow-sm transition-all flex items-center space-x-1 cursor-pointer border border-emerald-500/35"
                            title="Approve Reviewer Access"
                          >
                            <Unlock className="w-2.5 h-2.5" />
                            <span>Approve</span>
                          </button>
                        )}

                        {/* Edit Button */}
                        <button
                          onClick={() => handleOpenEditPage(rev)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-none transition-colors border border-slate-700 cursor-pointer"
                          title="Edit Reviewer Details"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDelete(rev)}
                          className="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 rounded-none transition-colors cursor-pointer border border-rose-500/30"
                          title="Soft Delete Reviewer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>

                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
