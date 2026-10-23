import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Navbar } from './Navbar';
import { CategorySubNav } from './CategorySubNav';
import { LandingPage } from './LandingPage';
import { CourseCatalog } from './CourseCatalog';
import { CourseDetailPage } from './CourseDetailPage';
import { CourseEnrollmentPage } from './CourseEnrollmentPage';
import { SearchResults } from './SearchResults';
import { LearningPlayer } from './LearningPlayer';
import { LearnerDashboard } from './LearnerDashboard';
import { LoginPage } from './LoginPage';
import { InstructorLoginPage } from '../instructor/InstructorLoginPage';
import { AdminLoginPage } from '../admin/AdminLoginPage';
import { SignUpPage } from './SignUpPage';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import { RecommendationCustomizerPage } from './RecommendationCustomizerPage';
import { AccessibilityPage } from '../pages/AccessibilityPage';
import { PrivacyPolicyPage } from '../pages/PrivacyPolicyPage';
import { SitemapPage } from '../pages/SitemapPage';
import { TermsPage } from '../pages/TermsPage';
import { CourseImageStandardsPage } from '../pages/CourseImageStandardsPage';
import { CheckoutPage } from './CheckoutPage';
import { CartCheckoutModal } from './CartCheckoutModal';
import { CourseDetailModal } from './CourseDetailModal';
import { MainMultiLevelSidebar } from '../navigation/MainMultiLevelSidebar';
import { Course } from '../../types';
import { apiFetch } from '../../lib/apiConfig';

export function UserPortal() {
  const {
    courses,
    cart,
    enrolledCourses,
    currentUser,
    darkMode,
    toggleDarkMode,
    removeFromCart,
    enrollCourse,
    setCurrentUser,
    cartModalOpen,
    setCartModalOpen,
    selectedModalCourse,
    setSelectedModalCourse,
  } = useApp();

  const navigate = useNavigate();
  const [mainSidebarOpen, setMainSidebarOpen] = useState(false);

  // TikTok Pixel Base Code Injection
  useEffect(() => {
    const checkAndInjectTikTokPixel = async () => {
      try {
        let pixelId = '';
        if (currentUser?.id) {
          const res = await apiFetch(`tiktok-pixel.php?userId=${encodeURIComponent(currentUser.id)}`, { silent: true }).catch(() => null);
          if (res && res.success && res.pixelId) {
            pixelId = res.pixelId;
          }
        }

        if (pixelId && !document.getElementById('tiktok-pixel-script')) {
          const script = document.createElement('script');
          script.id = 'tiktok-pixel-script';
          script.type = 'text/javascript';
          script.innerHTML = `
            !function (w, d, t) {
              w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","close","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){ttq[t]=function(){ttq.push([t].concat(Array.prototype.slice.call(arguments)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq.methods[i],arr[i]);ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._since=null,ttq._i[e]._latency=null,ttq._i[e]._load=null,ttq._i[e]._instance=null,ttq._i[e]._loadTime=null,ttq._i[e]._latencyTime=null,ttq._i[e]._latencyTime=null,ttq._i[e]._loadTime=null,var a=d.createElement("script");a.type="text/javascript",a.async=!0,a.src=i+"?sdkid="+e+"&lib="+t;var n=d.createElement("script");a.parentNode.insertBefore(n,a)},ttq.load('${pixelId}'),ttq.page();
            }(window, document, 'ttq');
          `;
          document.head.appendChild(script);
        }
      } catch (e) {
        // Ignore
      }
    };

    checkAndInjectTikTokPixel();
  }, [currentUser?.id]);

  const handleCheckoutComplete = (purchasedCourses: Course[]) => {
    purchasedCourses.forEach(pc => {
      enrollCourse(pc);
    });
    setCartModalOpen(false);
  };

  return (
    <div className={darkMode ? 'dark bg-slate-950 text-slate-100 min-h-screen font-sans' : 'bg-slate-50 text-slate-900 min-h-screen font-sans'}>
      {/* Universal Multi-Level Sidebar Drawer */}
      <MainMultiLevelSidebar
        isOpen={mainSidebarOpen}
        onClose={() => setMainSidebarOpen(false)}
        currentUser={currentUser}
        onLogout={() => setCurrentUser(null)}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        cartCount={cart.length}
        onOpenCart={() => setCartModalOpen(true)}
        courses={courses}
      />

      {/* Universal Navbar */}
      <Navbar
        cartCount={cart.length}
        onOpenCart={() => setCartModalOpen(true)}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        currentUser={currentUser}
        onLogout={() => setCurrentUser(null)}
        courses={courses}
        onOpenMainSidebar={() => setMainSidebarOpen(true)}
      />

      {/* Category Sub-Navigation Bar - Hide if user is logged in */}
      {!currentUser && <CategorySubNav />}

      {/* Main Routed Content */}
      <main>
        <Routes>
          <Route path="/" element={<LandingPage courses={courses} />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="/courses" element={<CourseCatalog />} />
          <Route path="/course/:courseId" element={<CourseDetailPage />} />
          <Route path="/enroll/:courseId" element={<CourseEnrollmentPage />} />
          <Route path="/learn/:courseId" element={<LearningPlayer />} />
          <Route path="/dashboard" element={<LearnerDashboard />} />
          <Route path="/personalization" element={<RecommendationCustomizerPage />} />
          <Route path="/checkout" element={
            <CheckoutPage 
              cart={cart}
              onRemoveFromCart={(id) => removeFromCart(id)}
              onCheckoutComplete={handleCheckoutComplete}
            />
          } />
          <Route path="/my-learning" element={<Navigate to="/dashboard" replace />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/login/learner" element={<LoginPage />} />
          <Route path="/login/instructor" element={<InstructorLoginPage />} />
          <Route path="/instructor/login" element={<InstructorLoginPage />} />
          <Route path="/login/admin" element={<AdminLoginPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/register" element={<Navigate to="/signup" replace />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          {/* Legal & Accessibility Pages */}
          <Route path="/accessibility" element={<AccessibilityPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/sitemap" element={<SitemapPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/course-image-quality-standards" element={<CourseImageStandardsPage />} />
          <Route path="/guidelines/course-image-quality-standards" element={<CourseImageStandardsPage />} />
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Global Quick Course Detail Modal (if triggered via modal helper) */}
      {selectedModalCourse && (
        <CourseDetailModal
          course={selectedModalCourse}
          onClose={() => setSelectedModalCourse(null)}
          onAddToCart={(course) => {
            setSelectedModalCourse(null);
            setCartModalOpen(true);
          }}
          onEnrollNow={(course) => {
            enrollCourse(course);
            setSelectedModalCourse(null);
            navigate(`/learn/${course.id}`);
          }}
          isEnrolled={enrolledCourses.some(e => e.id === selectedModalCourse.id)}
          onStartLearning={(course) => {
            setSelectedModalCourse(null);
            navigate(`/learn/${course.id}`);
          }}
        />
      )}

      {/* Global Cart & Checkout Modal */}
      {cartModalOpen && (
        <CartCheckoutModal
          cart={cart}
          onClose={() => setCartModalOpen(false)}
          onRemoveFromCart={(courseId) => removeFromCart(courseId)}
          onCheckoutComplete={handleCheckoutComplete}
        />
      )}
    </div>
  );
}

export default UserPortal;
