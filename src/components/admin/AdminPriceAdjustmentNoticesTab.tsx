import React, { useState, useMemo } from 'react';
import { 
  Tag, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter, 
  Send, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  ArrowRight, 
  BookOpen, 
  User, 
  Check, 
  X, 
  ShieldAlert, 
  Sparkles, 
  AlertCircle,
  TrendingDown,
  Info,
  Calendar,
  ExternalLink,
  Sliders,
  Mail
} from 'lucide-react';
import { useApp, InstructorNotification } from '../../context/AppContext';
import { Course } from '../../types';

interface AdminPriceAdjustmentNoticesTabProps {
  onManageCourse?: (course: Course) => void;
  onNavigateToCatalog?: () => void;
}

export const AdminPriceAdjustmentNoticesTab: React.FC<AdminPriceAdjustmentNoticesTabProps> = ({
  onManageCourse,
  onNavigateToCatalog
}) => {
  const { 
    courses, 
    instructorNotifications, 
    sendInstructorNotification, 
    updateInstructorNotification, 
    deleteInstructorNotification, 
    resendPriceAdjustmentNotice, 
    resolvePriceAdjustment,
    courseConfig,
    formatPrice 
  } = useApp();

  // Filter only notifications of type 'price_adjustment'
  const priceNotices = useMemo(() => {
    return (instructorNotifications || []).filter(n => n.type === 'price_adjustment');
  }, [instructorNotifications]);

  // States
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'declined' | 'dismissed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'price-high' | 'discount-high'>('newest');
  const [expandedNoticeId, setExpandedNoticeId] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string>('');

  // Flag New Overpriced Course Modal State
  const [isFlagModalOpen, setIsFlagModalOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [customSuggestedPrice, setCustomSuggestedPrice] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');

  const showNotification = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(''), 4000);
  };

  // Metrics Calculations
  const metrics = useMemo(() => {
    const total = priceNotices.length;
    const pending = priceNotices.filter(n => !n.status || n.status === 'pending').length;
    const accepted = priceNotices.filter(n => n.status === 'accepted').length;
    const declined = priceNotices.filter(n => n.status === 'declined').length;
    const dismissed = priceNotices.filter(n => n.status === 'dismissed').length;

    let totalReductionAmount = 0;
    let validReductions = 0;
    priceNotices.forEach(n => {
      if (n.currentPrice && n.suggestedPrice && n.currentPrice > n.suggestedPrice) {
        totalReductionAmount += (n.currentPrice - n.suggestedPrice);
        validReductions += 1;
      }
    });

    const avgReduction = validReductions > 0 ? totalReductionAmount / validReductions : 0;

    return { total, pending, accepted, declined, dismissed, avgReduction };
  }, [priceNotices]);

  // Filtered and Sorted list
  const filteredNotices = useMemo(() => {
    return priceNotices
      .filter(n => {
        // Status filter
        if (statusFilter === 'pending') {
          return !n.status || n.status === 'pending';
        }
        if (statusFilter !== 'all') {
          return n.status === statusFilter;
        }
        return true;
      })
      .filter(n => {
        // Search filter
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          n.courseTitle.toLowerCase().includes(q) ||
          (n.instructorName && n.instructorName.toLowerCase().includes(q)) ||
          (n.flagReason && n.flagReason.toLowerCase().includes(q)) ||
          n.message.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'price-high') {
          return (b.currentPrice || 0) - (a.currentPrice || 0);
        }
        if (sortBy === 'discount-high') {
          const diffA = (a.currentPrice || 0) - (a.suggestedPrice || 0);
          const diffB = (b.currentPrice || 0) - (b.suggestedPrice || 0);
          return diffB - diffA;
        }
        // newest first default
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [priceNotices, statusFilter, searchQuery, sortBy]);

  // Action: Open Manage Course
  const handleOpenCourseManage = (courseId: string) => {
    const targetCourse = courses.find(c => c.id === courseId);
    if (targetCourse && onManageCourse) {
      onManageCourse(targetCourse);
    } else if (targetCourse) {
      showNotification(`Opening management view for "${targetCourse.title}".`);
    } else {
      showNotification(`Course reference #${courseId} not found in current catalog.`);
    }
  };

  // Action: Send Reminder to Instructor
  const handleResendReminder = (noticeId: string, instructorName?: string) => {
    resendPriceAdjustmentNotice(noticeId);
    showNotification(`Follow-up reminder sent to ${instructorName || 'the instructor'}.`);
  };

  // Action: Simulate Instructor Accepting Suggested Price
  const handleSimulateAcceptance = async (notice: InstructorNotification) => {
    await resolvePriceAdjustment(notice.id, 'accept');
    showNotification(`Price adjustment accepted! Course price updated to $${notice.suggestedPrice?.toFixed(2)}.`);
  };

  // Action: Dismiss Request
  const handleDismissNotice = async (noticeId: string) => {
    await resolvePriceAdjustment(noticeId, 'dismiss');
    showNotification('Price adjustment request dismissed by administrator.');
  };

  // Action: Delete Notice
  const handleDeleteNotice = (noticeId: string) => {
    if (window.confirm('Are you sure you want to delete this price adjustment record?')) {
      deleteInstructorNotification(noticeId);
      showNotification('Price notification deleted from audit registry.');
    }
  };

  // Handle Select Course in Flag Modal
  const handleCourseSelectChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    const selected = courses.find(c => c.id === courseId);
    if (selected) {
      // Recommend 25-35% price reduction
      const rec = Math.max(19.99, Math.round(selected.price * 0.65 * 100) / 100);
      setCustomSuggestedPrice(rec.toFixed(2));
      setCustomReason(`Market benchmark audit: Current price ($${selected.price}) exceeds platform category median`);
      setCustomMessage(
        `Hello ${selected.instructor},\n\nOur platform curriculum moderation team conducted a pricing audit of "${selected.title}".\n\nThe current listing price ($${selected.price}) is higher than standard marketplace benchmarks for this topic and length. We recommend adjusting the price to approximately $${rec.toFixed(2)} to improve learner enrollment conversion rates and qualify for marketplace promotional placements.\n\nYou can update your price directly in your Instructor Studio under Course Settings.`
      );
    }
  };

  // Dispatch New Flag Notice
  const handleDispatchNewFlagNotice = (e: React.FormEvent) => {
    e.preventDefault();
    const course = courses.find(c => c.id === selectedCourseId);
    if (!course) return;

    const suggested = parseFloat(customSuggestedPrice) || Math.round(course.price * 0.7);

    sendInstructorNotification({
      courseId: course.id,
      courseTitle: course.title,
      courseThumbnail: course.thumbnail || (course as any).image,
      instructorName: course.instructor,
      instructorEmail: (course as any).instructorEmail || `${course.instructor.toLowerCase().replace(/\s+/g, '.')}@uqlearn.org`,
      category: course.category,
      type: 'price_adjustment',
      title: `Price Adjustment Notice: ${course.title}`,
      message: customMessage,
      currentPrice: course.price,
      suggestedPrice: suggested,
      flagReason: customReason || 'Flagged as overpriced by marketplace administrator',
      status: 'pending'
    });

    setIsFlagModalOpen(false);
    setSelectedCourseId('');
    setCustomSuggestedPrice('');
    setCustomReason('');
    setCustomMessage('');
    showNotification(`Overpriced course notice dispatched to instructor ${course.instructor}.`);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Toast alert */}
      {actionSuccessMsg && (
        <div className="fixed top-20 right-6 z-50 p-4 bg-slate-900 text-white border border-rose-500 rounded-2xl shadow-2xl flex items-center space-x-3 text-xs font-bold animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Main Header */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-amber-500/10 via-rose-500/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 text-amber-700 dark:text-amber-300 text-xs font-black uppercase tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Price Governance & Overpricing Audit</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Pending Price Adjustment Requests
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Track, audit, and follow up on official price adjustment requests sent to instructors whose courses were flagged as overpriced relative to platform benchmarks to ensure learner value.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsFlagModalOpen(true)}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shadow-md shadow-rose-600/20 cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Flag Course as Overpriced</span>
            </button>
            {onNavigateToCatalog && (
              <button
                onClick={onNavigateToCatalog}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center space-x-2 transition-colors cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>Browse Course Catalog</span>
              </button>
            )}
          </div>
        </div>

        {/* Policy Notice Box */}
        <div className="mt-6 p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 flex items-start space-x-3 text-xs text-amber-900 dark:text-amber-200">
          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block">Platform Instructor Pricing Policy</span>
            <p className="text-[11px] text-amber-800 dark:text-amber-300/90 leading-normal">
              Under UQlearn instructor terms, administrators do not unilaterally overwrite course prices. Flagged overpriced courses trigger an automated formal recommendation sent directly to the instructor's Studio alert center. Courses remain published or under price audit review until the instructor updates their listing or responds.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Pending */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pending Instructor Review
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-amber-600 dark:text-amber-400">
              {metrics.pending}
            </span>
            <span className="text-xs font-bold text-slate-500">Awaiting Action</span>
          </div>
          <div className="flex items-center space-x-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span>Instructors alerted in Studio</span>
          </div>
        </div>

        {/* Metric 2: Total Flagged */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Overpriced Flags
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-900 dark:text-slate-100">
              {metrics.total}
            </span>
            <span className="text-xs font-bold text-slate-500">Audit Notices</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Across all course categories
          </p>
        </div>

        {/* Metric 3: Accepted & Lowered */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Prices Successfully Lowered
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {metrics.accepted}
            </span>
            <span className="text-xs font-bold text-slate-500">Resolved</span>
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1">
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            <span>Market conversion improved</span>
          </p>
        </div>

        {/* Metric 4: Average Discount */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Avg Suggested Reduction
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
              ${metrics.avgReduction.toFixed(2)}
            </span>
            <span className="text-xs font-bold text-slate-500">per course</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Projected ~42% cart lift
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Status Filter Buttons */}
          <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              All Notices ({priceNotices.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 shrink-0 cursor-pointer ${
                statusFilter === 'pending'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Response ({metrics.pending})</span>
            </button>
            <button
              onClick={() => setStatusFilter('accepted')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 shrink-0 cursor-pointer ${
                statusFilter === 'accepted'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Prices Lowered ({metrics.accepted})</span>
            </button>
            <button
              onClick={() => setStatusFilter('dismissed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer ${
                statusFilter === 'dismissed'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Dismissed ({metrics.dismissed})
            </button>
          </div>

          {/* Search and Sort */}
          <div className="flex items-center space-x-2 w-full md:w-auto shrink-0">
            <div className="relative flex-1 md:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search course, instructor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="newest">Newest Sent</option>
              <option value="price-high">Highest Current Price</option>
              <option value="discount-high">Largest Price Cut</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notices Notification List */}
      <div className="space-y-4">
        {filteredNotices.length > 0 ? (
          filteredNotices.map((notice) => {
            const isPending = !notice.status || notice.status === 'pending';
            const isAccepted = notice.status === 'accepted';
            const isDismissed = notice.status === 'dismissed';
            const isDeclined = notice.status === 'declined';
            const isExpanded = expandedNoticeId === notice.id;

            const reduction = (notice.currentPrice && notice.suggestedPrice)
              ? notice.currentPrice - notice.suggestedPrice
              : 0;
            const reductionPercent = (notice.currentPrice && reduction > 0)
              ? Math.round((reduction / notice.currentPrice) * 100)
              : 0;

            const matchedCourse = courses.find(c => c.id === notice.courseId);

            return (
              <div 
                key={notice.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs ${
                  isPending 
                    ? 'border-amber-200 dark:border-amber-900/60 ring-1 ring-amber-500/10'
                    : isAccepted
                    ? 'border-emerald-200 dark:border-emerald-900/50'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Notice Top Banner */}
                <div className={`px-5 py-2.5 border-b flex flex-wrap items-center justify-between gap-2 text-xs ${
                  isPending
                    ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/40 text-amber-900 dark:text-amber-200'
                    : isAccepted
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                      isPending
                        ? 'bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200'
                        : isAccepted
                        ? 'bg-emerald-200/80 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}>
                      {isPending ? 'Pending Instructor Action' : isAccepted ? 'Resolved · Price Lowered' : isDeclined ? 'Declined' : 'Dismissed'}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500">
                      Dispatched {new Date(notice.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {notice.reminderSentAt && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded">
                        Reminder sent {new Date(notice.reminderSentAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 text-[11px]">
                    <span className="text-slate-500">Course ID:</span>
                    <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-700 dark:text-slate-300">
                      {notice.courseId}
                    </code>
                  </div>
                </div>

                {/* Main Body */}
                <div className="p-5 sm:p-6 space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Course and Instructor Details */}
                    <div className="flex items-start space-x-4 min-w-0">
                      <div className="w-16 h-12 sm:w-20 sm:h-14 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 relative">
                        {notice.courseThumbnail || matchedCourse?.thumbnail || matchedCourse?.image ? (
                          <img 
                            src={notice.courseThumbnail || matchedCourse?.thumbnail || matchedCourse?.image} 
                            alt={notice.courseTitle}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <BookOpen className="w-6 h-6" />
                          </div>
                        )}
                        <span className="absolute bottom-1 right-1 px-1 py-0.2 bg-slate-900/90 text-white text-[9px] font-bold rounded">
                          {notice.category || matchedCourse?.category || 'General'}
                        </span>
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 truncate">
                            {notice.courseTitle}
                          </h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center space-x-1 font-medium">
                            <User className="w-3.5 h-3.5 text-rose-500" />
                            <span>Instructor: <strong className="text-slate-700 dark:text-slate-200">{notice.instructorName || 'Platform Instructor'}</strong></span>
                          </span>
                          {notice.instructorEmail && (
                            <span className="text-[11px] text-slate-400 font-mono">
                              ({notice.instructorEmail})
                            </span>
                          )}
                        </div>
                        {notice.flagReason && (
                          <div className="mt-1 flex items-center space-x-1.5 text-xs text-rose-600 dark:text-rose-400 font-bold">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>{notice.flagReason}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Price Differential Box */}
                    <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 shrink-0">
                      {/* Current Price */}
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Price</span>
                        <span className="text-sm font-black text-rose-600 dark:text-rose-400 line-through">
                          ${notice.currentPrice?.toFixed(2) || '0.00'}
                        </span>
                      </div>

                      <ArrowRight className="w-4 h-4 text-slate-400" />

                      {/* Suggested Price */}
                      <div>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Recommended</span>
                        <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                          ${notice.suggestedPrice?.toFixed(2) || '0.00'}
                        </span>
                      </div>

                      {/* Reduction Tag */}
                      {reductionPercent > 0 && (
                        <div className="ml-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-black">
                          -{reductionPercent}%
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notice Message Preview / Accordion */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setExpandedNoticeId(isExpanded ? null : notice.id)}
                        className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 flex items-center space-x-1 cursor-pointer"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>{isExpanded ? 'Hide Notice Letter' : 'View Full Notice Sent to Instructor'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      <span className="text-[11px] text-slate-400">
                        Status: <strong className={isPending ? 'text-amber-500' : isAccepted ? 'text-emerald-500' : 'text-slate-400'}>
                          {isPending ? 'Pending Response' : isAccepted ? 'Price Accepted' : notice.status}
                        </strong>
                      </span>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed animate-fadeIn">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-500">
                          <span>SUBJECT: {notice.title}</span>
                          <span>DELIVERED VIA INSTRUCTOR NOTIFICATIONS CENTER</span>
                        </div>
                        {notice.message}
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Manage Course Action */}
                      <button
                        onClick={() => handleOpenCourseManage(notice.courseId)}
                        className="px-3 py-1.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                        title="Open course management page to inspect content, lessons, and badges"
                      >
                        <Sliders className="w-3.5 h-3.5 text-rose-400" />
                        <span>Manage Course</span>
                      </button>

                      {/* Resend Reminder */}
                      {isPending && (
                        <button
                          onClick={() => handleResendReminder(notice.id, notice.instructorName)}
                          className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                          title="Dispatch a follow-up reminder ping to instructor studio"
                        >
                          <Send className="w-3.5 h-3.5 text-amber-600" />
                          <span>Send Follow-Up Reminder</span>
                        </button>
                      )}

                      {/* Simulate Instructor Acceptance */}
                      {isPending && (
                        <button
                          onClick={() => handleSimulateAcceptance(notice)}
                          className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                          title="Simulate instructor accepting the suggested price and apply price reduction immediately"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Simulate Acceptance (Apply ${notice.suggestedPrice?.toFixed(2)})</span>
                        </button>
                      )}

                      {/* Dismiss Flag */}
                      {isPending && (
                        <button
                          onClick={() => handleDismissNotice(notice.id)}
                          className="px-3 py-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                          title="Dismiss notice if no further action is required"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Dismiss Flag</span>
                        </button>
                      )}
                    </div>

                    {/* Delete Record */}
                    <button
                      onClick={() => handleDeleteNotice(notice.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                      title="Delete price notice record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          /* Empty State */
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-3xl flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                No Price Adjustment Requests Found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {searchQuery || statusFilter !== 'all'
                  ? 'No price adjustment notices match your current search and status filter criteria.'
                  : 'All published course prices currently align with platform pricing guidelines and category benchmarks.'}
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              {(searchQuery || statusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
              <button
                onClick={() => setIsFlagModalOpen(true)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 cursor-pointer shadow-md"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Flag Course as Overpriced</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Flag Course as Overpriced */}
      {isFlagModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-scaleUp">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
                    Flag Course as Overpriced
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Dispatch an official price adjustment recommendation to the instructor.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFlagModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDispatchNewFlagNotice} className="space-y-4 text-xs">
              {/* Select Course */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Select Course to Audit & Flag *
                </label>
                <select
                  required
                  value={selectedCourseId}
                  onChange={(e) => handleCourseSelectChange(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="">-- Choose a course from catalog --</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.title} (${c.price}) · {c.instructor}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCourseId && (
                <>
                  {/* Current vs Suggested Price */}
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Current Course Price</span>
                      <span className="text-sm font-black text-rose-600 dark:text-rose-400">
                        ${courses.find(c => c.id === selectedCourseId)?.price?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-emerald-600 uppercase block">Recommended Price ($) *</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={customSuggestedPrice}
                        onChange={(e) => setCustomSuggestedPrice(e.target.value)}
                        className="w-full mt-1 px-2.5 py-1 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-lg font-black text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                        placeholder="e.g. 59.99"
                      />
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block">
                      Audit Reason / Benchmark Violation *
                    </label>
                    <input
                      type="text"
                      required
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="e.g. Price exceeds category median benchmark by +85%"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  {/* Letter to Instructor */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block">
                      Official Recommendation Letter (Delivered to Instructor) *
                    </label>
                    <textarea
                      rows={5}
                      required
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500 leading-relaxed"
                    />
                  </div>
                </>
              )}

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsFlagModalOpen(false)}
                  className="px-4 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedCourseId}
                  className={`px-5 py-2.5 rounded-xl font-bold text-white flex items-center space-x-2 shadow-md cursor-pointer ${
                    selectedCourseId
                      ? 'bg-rose-600 hover:bg-rose-500'
                      : 'bg-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  <span>Dispatch Price Notice</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
