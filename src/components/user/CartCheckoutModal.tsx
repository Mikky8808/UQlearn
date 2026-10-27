import React, { useState, useEffect } from 'react';
import { X, Lock, ShoppingCart, RefreshCw, CheckCircle2, ArrowRight, Tag, Star, BadgeCheck } from 'lucide-react';
import { Course } from '../../types';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { fetchRecentlyViewedApi, normalizeCourse } from '../../lib/apiConfig';
import { CourseCard } from '../common/CourseCard';

interface CartCheckoutModalProps {
  cart: Course[];
  onClose: () => void;
  onRemoveFromCart: (courseId: string) => void;
  onCheckoutComplete: (purchasedCourses: Course[]) => void;
}

export const CartCheckoutModal: React.FC<CartCheckoutModalProps> = ({
  cart,
  onClose,
  onRemoveFromCart,
  onCheckoutComplete,
}) => {
  const { courses, enrolledCourses, addToCart, formatPrice, getDiscountPercentage, currentUser, enrollCourse, clearCart } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);
  const [savedForLater, setSavedForLater] = useState<Course[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [showCouponInput, setShowCouponInput] = useState(false);

  const totalAmountUsd = cart.reduce((acc, c) => acc + (Number(c.price) || 0), 0);
  const originalTotalUsd = cart.reduce((acc, c) => acc + (Number(c.originalPrice) || Number(c.price) || 0), 0);
  const isCartFree = cart.length > 0 && (totalAmountUsd <= 0 || cart.every(c => !c.price || Number(c.price) === 0));
  
  const discountAmount = Math.max(0, originalTotalUsd - totalAmountUsd);
  const overallDiscountPercent = originalTotalUsd > totalAmountUsd ? Math.round((discountAmount / originalTotalUsd) * 100) : 0;

  const totalAmount = isCartFree ? 'Free' : formatPrice(totalAmountUsd);
  const totalKes = totalAmountUsd < 100 ? Math.round(totalAmountUsd * 130) : totalAmountUsd;
  const formattedAmountKes = totalKes.toFixed(2);

  // Fetch recently viewed courses from API
  const loadRecentlyViewed = async () => {
    try {
      const uid = currentUser?.id || 'guest';
      const ids = await fetchRecentlyViewedApi(uid);
      setRecentlyViewedIds(Array.isArray(ids) ? ids : []);
    } catch {
      setRecentlyViewedIds([]);
    }
  };

  useEffect(() => {
    loadRecentlyViewed();

    const handleUpdate = () => {
      loadRecentlyViewed();
    };

    window.addEventListener('uq:recently-viewed-updated', handleUpdate);
    return () => {
      window.removeEventListener('uq:recently-viewed-updated', handleUpdate);
    };
  }, [currentUser?.id]);

  // Compute recently viewed courses that are not already in cart or enrolled
  const genuineRecentCourses: Course[] = recentlyViewedIds
    .map(id => courses.find(c => String(c.id) === String(id)))
    .filter((c): c is Course => Boolean(c))
    .filter(c => !cart.some(ci => String(ci.id) === String(c.id)))
    .filter(c => !enrolledCourses.some(ec => String(ec.id) === String(c.id)));

  // Complement with popular courses if recent views are few
  const fallbackRecommendations: Course[] = courses
    .filter(c => !cart.some(ci => String(ci.id) === String(c.id)))
    .filter(c => !enrolledCourses.some(ec => String(ec.id) === String(c.id)))
    .filter(c => !genuineRecentCourses.some(rc => String(rc.id) === String(c.id)))
    .slice(0, Math.max(0, 8 - genuineRecentCourses.length));

  const crossSellCourses = [...genuineRecentCourses, ...fallbackRecommendations].slice(0, 8);

  // Direct Free Enrollment: enroll immediately without payment
  const handleFreeEnrollment = () => {
    if (loading) return;
    setLoading(true);

    try {
      cart.forEach((c) => {
        enrollCourse(c);
      });

      if (onCheckoutComplete) {
        onCheckoutComplete(cart);
      } else {
        clearCart();
      }

      setTimeout(() => {
        setLoading(false);
        onClose();
        if (cart.length > 0) {
          navigate(`/learn/${cart[0].id}`);
        } else {
          navigate('/dashboard');
        }
      }, 350);
    } catch {
      setLoading(false);
    }
  };

  // Redirect to /checkout
  const handleProceedToPayment = () => {
    if (loading) return;
    setLoading(true);

    setTimeout(() => {
      onClose();
      if (!currentUser) {
        navigate('/login?redirect=/checkout');
        return;
      }
      navigate('/checkout');
    }, 350);
  };

  const handleSaveForLater = (course: Course) => {
    onRemoveFromCart(course.id);
    if (!savedForLater.some(s => s.id === course.id)) {
      setSavedForLater(prev => [...prev, course]);
    }
  };

  const handleMoveToCart = (course: Course) => {
    setSavedForLater(prev => prev.filter(s => s.id !== course.id));
    addToCart(course);
  };

  const handleViewCourse = (courseId: string) => {
    onClose();
    navigate(`/course/${courseId}`);
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (couponCode.trim()) {
      setCouponApplied(true);
      setShowCouponInput(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 w-full h-full bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col overflow-y-auto animate-in fade-in duration-200 font-sans">
      
      {/* Top Bar with Close Button */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 pt-6 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-teal-600 dark:text-teal-400 font-extrabold text-sm tracking-wide uppercase">
          <ShoppingCart className="w-5 h-5" />
          <span>UQ Learn Checkout</span>
        </div>
        <button
          onClick={onClose}
          disabled={loading}
          aria-label="Close cart modal"
          className="p-2.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-6 sm:py-8 space-y-10 flex-1">
        
        {/* Main Header */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Shopping Cart
          </h1>
          <div className="mt-3 pt-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 border-b-2 border-slate-900 dark:border-white pb-3 inline-block">
              {cart.length} {cart.length === 1 ? 'Course in Cart' : 'Courses in Cart'}
            </span>
          </div>
        </div>

        {/* Two-Column Grid: Left (Cart Items) & Right (Checkout Sidebar) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Left Column: Cart Items List */}
          <div className="lg:col-span-8 space-y-6">
            {cart.length === 0 ? (
              <div className="py-12 text-center space-y-4 bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8">
                <div className="w-16 h-16 mx-auto rounded-full bg-slate-200/60 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                  <ShoppingCart className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-200">Your cart is currently empty</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Explore our top courses below and level up your skills today.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Explore Catalog
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {cart.map((rawCourse) => {
                  const course = normalizeCourse(rawCourse);
                  const courseIsFree = !course.price || Number(course.price) === 0;
                  const isBestseller = Boolean(course.bestSeller || course.bestseller);
                  const isPremium = Boolean(course.isPremium);
                  const originalPrice = Number(course.originalPrice) || 0;
                  const currentPrice = Number(course.price) || 0;
                  const hasDiscount = originalPrice > currentPrice;
                  const ratingNum = typeof course.rating === 'number' && course.rating > 0 ? course.rating : null;
                  const reviewsNum = typeof course.reviewCount === 'number' && course.reviewCount > 0 ? course.reviewCount : null;

                  return (
                    <div key={course.id} className="py-5 flex flex-col sm:flex-row items-start justify-between gap-4 group">
                      {/* Course Image & Main Info */}
                      <div className="flex items-start space-x-4 min-w-0 flex-1">
                        <img 
                          src={course.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80'} 
                          alt={course.title} 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80';
                          }}
                          referrerPolicy="no-referrer"
                          onClick={() => handleViewCourse(course.id)}
                          className="w-28 sm:w-36 aspect-[16/9] rounded-lg object-cover flex-shrink-0 cursor-pointer shadow-xs group-hover:opacity-95 transition-opacity" 
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <h3 
                            onClick={() => handleViewCourse(course.id)}
                            className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100 line-clamp-2 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer transition-colors leading-snug"
                            title={course.title}
                          >
                            {course.title}
                          </h3>
                          {course.instructor && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                              By {course.instructor}
                            </p>
                          )}
                          
                          {/* Rating & Badges */}
                          <div className="flex items-center gap-2 flex-wrap pt-0.5">
                            {isBestseller && (
                              <span className="bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 font-black text-[10px] px-2 py-0.5 rounded tracking-tight">
                                Bestseller
                              </span>
                            )}
                            {ratingNum !== null && (
                              <div className="flex items-center space-x-1 text-xs font-bold text-amber-500">
                                <span>{ratingNum.toFixed(1)}</span>
                                <div className="flex items-center">
                                  {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                                  ))}
                                </div>
                                {reviewsNum !== null && (
                                  <span className="text-slate-400 font-normal">({reviewsNum.toLocaleString()} ratings)</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Real Module / Level details if available */}
                          {course.modules && course.modules.length > 0 && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                              {course.modules.length} {course.modules.length === 1 ? 'module' : 'modules'} • All Levels
                            </p>
                          )}

                          {/* Premium Tag */}
                          {isPremium && (
                            <div className="pt-1">
                              <span className="bg-purple-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded inline-flex items-center gap-1 shadow-2xs">
                                <BadgeCheck className="w-3 h-3" />
                                <span>Premium</span>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions (Remove & Save for Later) */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 text-xs border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
                        <div className="flex sm:flex-col items-center sm:items-end gap-2">
                          <button
                            onClick={() => onRemoveFromCart(course.id)}
                            disabled={loading}
                            className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-bold cursor-pointer disabled:opacity-50 transition-colors"
                          >
                            Remove
                          </button>
                          <button
                            onClick={() => handleSaveForLater(course)}
                            disabled={loading}
                            className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-bold cursor-pointer disabled:opacity-50 transition-colors"
                          >
                            Save for Later
                          </button>
                        </div>

                        {/* Price Display */}
                        <div className="text-right pt-1">
                          <div className="text-lg font-black text-purple-700 dark:text-purple-400 flex items-center justify-end gap-1">
                            <span>{courseIsFree ? 'Free' : formatPrice(currentPrice)}</span>
                            {!courseIsFree && <Tag className="w-3.5 h-3.5 fill-purple-700 text-purple-700 dark:fill-purple-400 dark:text-purple-400" />}
                          </div>
                          {!courseIsFree && hasDiscount && (
                            <div className="text-xs text-slate-400 line-through font-medium">
                              {formatPrice(originalPrice)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Saved For Later Section */}
            {savedForLater.length > 0 && (
              <div className="pt-8 border-t border-slate-200 dark:border-slate-800 space-y-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Saved for later ({savedForLater.length})
                </h3>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {savedForLater.map((course) => (
                    <div key={course.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <img 
                          src={course.image} 
                          alt={course.title} 
                          className="w-16 h-12 rounded object-cover flex-shrink-0" 
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 line-clamp-1">{course.title}</h4>
                          <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">{formatPrice(course.price)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleMoveToCart(course)}
                        className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-bold cursor-pointer"
                      >
                        Move to Cart
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Checkout Summary Sidebar */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 sticky top-6">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total:</span>
              <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                {totalAmount}
              </div>
              {!isCartFree && originalTotalUsd > totalAmountUsd && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-sm text-slate-400 line-through font-medium">
                    {formatPrice(originalTotalUsd)}
                  </span>
                  {overallDiscountPercent > 0 && (
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      {overallDiscountPercent}% off
                    </span>
                  )}
                </div>
              )}
              {isCartFree ? (
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 pt-1">
                  100% Free • No Payment Required
                </p>
              ) : (
                <p className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 pt-1">
                  KES {formattedAmountKes}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            {cart.length > 0 && (
              <div className="space-y-3 pt-2">
                {isCartFree ? (
                  <button
                    onClick={handleFreeEnrollment}
                    disabled={loading}
                    className={`w-full py-3.5 px-6 text-white font-black text-base rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                      loading
                        ? 'bg-purple-600/80 cursor-wait'
                        : 'bg-purple-600 hover:bg-purple-700 active:scale-[0.99]'
                    }`}
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Enrolling...</span>
                      </>
                    ) : (
                      <>
                        <span>Enroll Free (No Payment Needed)</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleProceedToPayment}
                    disabled={loading}
                    className={`w-full py-3.5 px-6 text-white font-black text-base rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                      loading
                        ? 'bg-purple-600/80 cursor-wait'
                        : 'bg-purple-600 hover:bg-purple-700 active:scale-[0.99]'
                    }`}
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <span>Proceed to Checkout</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                )}

                <p className="text-[11px] text-slate-400 text-center font-medium">
                  You won't be charged yet
                </p>
              </div>
            )}

            {/* Coupon Section */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              {couponApplied ? (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Coupon "{couponCode}" Applied!</span>
                  </div>
                  <button onClick={() => setCouponApplied(false)} className="text-slate-400 hover:text-slate-600 text-[10px] uppercase font-bold">Remove</button>
                </div>
              ) : showCouponInput ? (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Enter Coupon Code"
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 text-white font-bold text-xs rounded-xl hover:bg-purple-700 transition-colors cursor-pointer"
                  >
                    Apply
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCouponInput(true)}
                  className="w-full py-3 border border-purple-600 dark:border-purple-500 text-purple-600 dark:text-purple-400 font-bold text-sm rounded-xl hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors text-center cursor-pointer"
                >
                  Apply Coupon
                </button>
              )}
            </div>

          </div>

        </div>

        {/* Bottom Section: "You might also like" Recommendations (Homepage CourseCard UI) */}
        {crossSellCourses.length > 0 && (
          <div className="pt-12 border-t border-slate-200 dark:border-slate-800 space-y-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              You might also like
            </h2>

            <div className="flex items-stretch overflow-x-auto gap-5 pb-4 scroll-smooth snap-x no-scrollbar">
              {crossSellCourses.map((c) => {
                const normalized = normalizeCourse(c);
                return (
                  <CourseCard
                    key={c.id}
                    course={normalized}
                    formatPrice={formatPrice}
                    getDiscountPercentage={getDiscountPercentage}
                    navigate={(to) => {
                      onClose();
                      navigate(to);
                    }}
                    className="w-[260px] sm:w-[280px] min-w-[260px] sm:min-w-[280px] shrink-0 snap-start"
                  />
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
