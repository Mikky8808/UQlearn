import React, { useState, useEffect } from 'react';
import { X, Lock, ShoppingCart, RefreshCw, CheckCircle2, Clock, Plus, ArrowRight, Sparkles } from 'lucide-react';
import { Course } from '../../types';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { fetchRecentlyViewedApi } from '../../lib/apiConfig';

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
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

  const totalAmountUsd = cart.reduce((acc, c) => acc + (Number(c.price) || 0), 0);
  const isCartFree = cart.length > 0 && (totalAmountUsd <= 0 || cart.every(c => !c.price || Number(c.price) === 0));
  const totalAmount = isCartFree ? 'Free' : formatPrice(totalAmountUsd);
  const totalKes = totalAmountUsd < 100 ? Math.round(totalAmountUsd * 130) : totalAmountUsd;
  const formattedAmountKes = totalKes.toFixed(2);

  // Fetch recently viewed courses from API and sync with local storage
  const loadRecentlyViewed = async () => {
    try {
      const uid = currentUser?.id || 'guest';
      const ids = await fetchRecentlyViewedApi(uid);
      setRecentlyViewedIds(Array.isArray(ids) ? ids : []);
    } catch {
      setRecentlyViewedIds([]);
    } finally {
      setLoadingRecent(false);
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

  // If user has viewed fewer than 2 items, complement with trending/popular recommendations
  const fallbackRecommendations: Course[] = courses
    .filter(c => !cart.some(ci => String(ci.id) === String(c.id)))
    .filter(c => !enrolledCourses.some(ec => String(ec.id) === String(c.id)))
    .filter(c => !genuineRecentCourses.some(rc => String(rc.id) === String(c.id)))
    .slice(0, Math.max(0, 3 - genuineRecentCourses.length));

  const crossSellCourses = [...genuineRecentCourses, ...fallbackRecommendations].slice(0, 4);
  const hasGenuineRecent = genuineRecentCourses.length > 0;

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

  // Redirect to /checkout with loading feedback and submission lock
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

  const handleQuickAdd = (course: Course) => {
    addToCart(course);
    setRecentlyAddedId(course.id);
    setTimeout(() => {
      setRecentlyAddedId(null);
    }, 1500);
  };

  const handleViewCourse = (courseId: string) => {
    onClose();
    navigate(`/course/${courseId}`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 relative animate-in fade-in zoom-in-95 duration-200 transition-colors max-h-[92vh] flex flex-col">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={loading}
          aria-label="Close cart drawer"
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Shopping Cart</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {cart.length} {cart.length === 1 ? 'course' : 'courses'} in your cart
            </p>
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-6">
          {cart.length === 0 ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Your cart is currently empty</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {crossSellCourses.length > 0 
                    ? 'Check out courses you recently viewed or pick from popular picks below:'
                    : 'Explore our catalog and find the next skill to level up your career.'}
                </p>
              </div>
            </div>
          ) : (
            /* Cart Items List */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>Selected Items</span>
                <span>{cart.length} item{cart.length === 1 ? '' : 's'}</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto pr-1">
                {cart.map((course) => {
                  const courseIsFree = !course.price || Number(course.price) === 0;
                  return (
                    <div key={course.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <img 
                          src={course.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80'} 
                          alt={course.title} 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80';
                          }}
                          referrerPolicy="no-referrer"
                          className="w-12 h-10 rounded-lg object-cover flex-shrink-0" 
                        />
                        <div className="min-w-0 flex-1">
                          <h4 
                            onClick={() => handleViewCourse(course.id)}
                            className="font-bold text-slate-800 dark:text-slate-200 text-xs line-clamp-1 hover:text-teal-600 dark:hover:text-teal-400 cursor-pointer transition-colors"
                            title={course.title}
                          >
                            {course.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[11px] font-semibold ${courseIsFree ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'}`}>
                              {courseIsFree ? 'Free' : formatPrice(course.price)}
                            </span>
                            {course.instructor && (
                              <span className="text-[10px] text-slate-400 line-clamp-1">
                                • {course.instructor}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => onRemoveFromCart(course.id)}
                        disabled={loading}
                        className="text-xs text-rose-500 hover:text-rose-700 font-semibold cursor-pointer disabled:opacity-50 flex-shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* RECENTLY VIEWED / CROSS-SELL SECTION */}
          {crossSellCourses.length > 0 && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  {hasGenuineRecent ? (
                    <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  )}
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    {hasGenuineRecent ? 'Recently Viewed' : 'Recommended For You'}
                  </h4>
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded-full font-bold">
                    {crossSellCourses.length}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  {hasGenuineRecent ? 'Pick up where you left off' : 'Learners also enrolled'}
                </span>
              </div>

              {/* Grid of recently viewed courses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {crossSellCourses.map((c) => {
                  const courseIsFree = !c.price || Number(c.price) === 0;
                  const originalPrice = Number(c.originalPrice) || 0;
                  const currentPrice = Number(c.price) || 0;
                  const discountPct = getDiscountPercentage(currentPrice, originalPrice);
                  const isJustAdded = recentlyAddedId === c.id;

                  return (
                    <div 
                      key={c.id} 
                      className="group flex flex-col justify-between p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-start gap-2.5">
                        <img 
                          src={c.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80'} 
                          alt={c.title} 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80';
                          }}
                          referrerPolicy="no-referrer"
                          onClick={() => handleViewCourse(c.id)}
                          className="w-14 h-12 rounded-lg object-cover flex-shrink-0 cursor-pointer shadow-xs group-hover:scale-102 transition-transform" 
                        />
                        <div className="min-w-0 flex-1">
                          <h5 
                            onClick={() => handleViewCourse(c.id)}
                            className="font-bold text-slate-800 dark:text-slate-200 text-xs line-clamp-1 cursor-pointer group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors"
                            title={c.title}
                          >
                            {c.title}
                          </h5>
                          {c.instructor && (
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                              {c.instructor}
                            </p>
                          )}
                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                            <span className={`text-xs font-black ${courseIsFree ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>
                              {courseIsFree ? 'Free' : formatPrice(c.price)}
                            </span>
                            {!courseIsFree && originalPrice > currentPrice && (
                              <span className="text-[10px] text-slate-400 line-through">
                                {formatPrice(originalPrice)}
                              </span>
                            )}
                            {!courseIsFree && discountPct > 0 && (
                              <span className="bg-rose-600 text-white font-bold text-[9px] px-1.5 py-0.5 rounded leading-none">
                                Save {discountPct}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-200/50 dark:border-slate-800/80 flex items-center justify-between gap-2">
                        <button
                          onClick={() => handleViewCourse(c.id)}
                          className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer flex items-center gap-0.5"
                        >
                          <span>Preview</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleQuickAdd(c)}
                          disabled={isJustAdded}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                            isJustAdded
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-teal-600 hover:bg-teal-500 text-white shadow-xs hover:shadow-sm'
                          }`}
                        >
                          {isJustAdded ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Added</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add to Cart</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer / Checkout Controls */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex-shrink-0 space-y-4">
          {cart.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">Total Amount:</span>
              <div className="text-right">
                <div className={`text-2xl font-black ${isCartFree ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>
                  {totalAmount}
                </div>
                {isCartFree ? (
                  <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    100% Free • No Payment Required
                  </div>
                ) : (
                  <div className="text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    KES {formattedAmountKes}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2.5">
            {cart.length > 0 ? (
              isCartFree ? (
                <button
                  onClick={handleFreeEnrollment}
                  disabled={loading}
                  className={`w-full py-3.5 text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 ${
                    loading
                      ? 'bg-emerald-600/85 cursor-wait shadow-emerald-600/10'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] shadow-emerald-600/25 hover:shadow-xl cursor-pointer'
                  }`}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Enrolling you now...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Enroll for Free (No Payment Needed)</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleProceedToPayment}
                  disabled={loading}
                  className={`w-full py-3.5 text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 ${
                    loading
                      ? 'bg-[#0ba4db]/85 cursor-wait shadow-[#0ba4db]/10'
                      : 'bg-[#0ba4db] hover:bg-[#0993c4] active:scale-[0.99] shadow-[#0ba4db]/20 hover:shadow-xl hover:shadow-[#0ba4db]/30 cursor-pointer'
                  }`}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Proceeding to Checkout...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Proceed to Payment</span>
                    </>
                  )}
                </button>
              )
            ) : null}

            <button
              onClick={onClose}
              disabled={loading}
              className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue Exploring
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
