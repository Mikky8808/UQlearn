import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { 
  BookOpen, 
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LearnerTabKey, LearnerSidebar } from '../navigation/LearnerSidebar';
import { LearnerLearningTab } from './dashboard/LearnerLearningTab';
import { PaymentHistory } from './PaymentHistory';
import { LearnerQnATab } from './dashboard/LearnerQnATab';
import { LearnerWishlistTab } from './dashboard/LearnerWishlistTab';
import { LearnerNotesTab } from './dashboard/LearnerNotesTab';
import { LearnerResourcesTab } from './dashboard/LearnerResourcesTab';
import { LearnerCertificatesTab } from './dashboard/LearnerCertificatesTab';
import { LearnerNotificationsTab } from './dashboard/LearnerNotificationsTab';
import { LearnerAccountTab } from './dashboard/LearnerAccountTab';

export const LearnerDashboard: React.FC = () => {
  const { enrolledCourses, courses, currentUser, addToCart, enrollCourse } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const tabParam = searchParams.get('tab') as LearnerTabKey;
  const [activeTab, setActiveTab] = useState<LearnerTabKey>(tabParam || 'learning');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Paystack & Payment Confirmation Banner State
  const paymentParam = searchParams.get('payment');
  const statusParam = searchParams.get('status');
  const paymentRef = searchParams.get('ref') || searchParams.get('reference') || '';
  const paymentAmount = searchParams.get('amount') || '';
  const paymentCurrency = searchParams.get('currency') || 'KES';
  const paymentMsg = searchParams.get('msg') || '';
  const [showPaymentBanner, setShowPaymentBanner] = useState<boolean>(() => {
    return paymentParam === 'success' || statusParam === 'confirmed';
  });
  const [showFailedBanner, setShowFailedBanner] = useState<boolean>(() => {
    return paymentParam === 'failed' || statusParam === 'failed';
  });

  useEffect(() => {
    const t = searchParams.get('tab') as LearnerTabKey;
    if (t) {
      setActiveTab(t);
    }
    if (searchParams.get('payment') === 'success' || searchParams.get('status') === 'confirmed') {
      setShowPaymentBanner(true);
    } else if (searchParams.get('payment') === 'failed' || searchParams.get('status') === 'failed') {
      setShowFailedBanner(true);
    }
  }, [searchParams]);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-16 transition-colors flex items-center justify-center">
        <div className="max-w-md w-full mx-auto px-4 text-center space-y-6">
          <div className="w-16 h-16 bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">Sign in to Access My Learning</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Access your enrolled courses, certifications, lesson notes, and instructor Q&A.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to="/login?redirect=/dashboard"
              className="w-full sm:w-auto px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
            >
              <span>Sign In with Email / Google</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/courses"
              className="w-full sm:w-auto px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-xs rounded-xl transition-all"
            >
              Browse Courses
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/10 to-slate-100 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-6 items-start relative">
          
          {/* Collapsible, Hover-Expandable Learner Sidebar */}
          <LearnerSidebar
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            enrolledCourses={enrolledCourses}
            currentUser={currentUser}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />

          {/* Active Tab Main content View Panel */}
          <div className="flex-1 min-w-0 w-full bg-white dark:bg-slate-900/30 p-5 sm:p-8 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-xs">
            {/* Paystack Payment Confirmed Success Banner */}
            {showPaymentBanner && (
              <div className="mb-6 p-4 sm:p-5 bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-teal-500/5 dark:from-teal-950/40 dark:via-emerald-950/30 dark:to-teal-950/20 border border-teal-500/30 dark:border-teal-500/40 rounded-2xl flex items-start justify-between shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-start space-x-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-teal-500 text-white flex items-center justify-center shrink-0 shadow-md">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight">
                        Payment Confirmed!
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                        <ShieldCheck className="w-3 h-3" />
                        Paystack Verified
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      Thank you! Your payment has been confirmed and your course enrollment has been successfully activated. You can begin learning below.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                      {paymentRef && (
                        <span className="px-2 py-0.5 rounded-md bg-white/70 dark:bg-slate-800/80 border border-teal-200/80 dark:border-teal-800 font-mono text-teal-800 dark:text-teal-300 font-semibold select-all">
                          Ref: {paymentRef}
                        </span>
                      )}
                      {paymentAmount && (
                        <span className="px-2 py-0.5 rounded-md bg-white/70 dark:bg-slate-800/80 border border-teal-200/80 dark:border-teal-800 font-bold text-teal-800 dark:text-teal-300">
                          Amount: {paymentCurrency} {paymentAmount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setShowPaymentBanner(false)} 
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-teal-100/50 dark:hover:bg-teal-950/50 transition-colors ml-2 shrink-0 cursor-pointer"
                  title="Dismiss notice"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Payment Failed / Unconfirmed Notice Banner */}
            {showFailedBanner && (
              <div className="mb-6 p-4 sm:p-5 bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-rose-500/5 dark:from-rose-950/40 dark:via-amber-950/30 dark:to-rose-950/20 border border-rose-500/30 dark:border-rose-500/40 rounded-2xl flex items-start justify-between shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-start space-x-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-md">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight">
                        Payment Status Notice
                      </h3>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {paymentMsg || 'The transaction could not be confirmed automatically. If funds were debited, our team will verify your reference shortly.'}
                    </p>
                    {paymentRef && (
                      <p className="text-[11px] font-mono text-rose-700 dark:text-rose-400 font-semibold pt-1 select-all">
                        Ref: {paymentRef}
                      </p>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => setShowFailedBanner(false)} 
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-rose-100/50 dark:hover:bg-rose-950/50 transition-colors ml-2 shrink-0 cursor-pointer"
                  title="Dismiss notice"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {activeTab === 'learning' && (
              <LearnerLearningTab enrolledCourses={enrolledCourses} allCourses={courses} />
            )}

            {activeTab === 'qna' && (
              <LearnerQnATab enrolledCourses={enrolledCourses} currentUser={currentUser} />
            )}

            {activeTab === 'wishlist' && (
              <LearnerWishlistTab 
                allCourses={courses} 
                onAddToCart={addToCart} 
                onEnrollCourse={enrollCourse} 
              />
            )}

            {activeTab === 'notes' && (
              <LearnerNotesTab enrolledCourses={enrolledCourses} />
            )}

            {activeTab === 'resources' && (
              <LearnerResourcesTab enrolledCourses={enrolledCourses} />
            )}

            {activeTab === 'certificates' && (
              <LearnerCertificatesTab currentUser={currentUser} />
            )}

            {activeTab === 'notifications' && (
              <LearnerNotificationsTab />
            )}

            {activeTab === 'account' && (
              <LearnerAccountTab currentUser={currentUser} />
            )}
            
            {activeTab === 'payments' && (
              <PaymentHistory />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
