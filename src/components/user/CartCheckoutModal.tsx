import React, { useState } from 'react';
import { X, Lock, ShoppingCart, RefreshCw } from 'lucide-react';
import { Course } from '../../types';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';

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
}) => {
  const { formatPrice, currentUser } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const totalAmountUsd = cart.reduce((acc, c) => acc + c.price, 0);
  const totalAmount = formatPrice(totalAmountUsd);
  const totalKes = totalAmountUsd < 100 ? Math.round(totalAmountUsd * 130) : totalAmountUsd;
  const formattedAmountKes = (totalKes > 0 ? totalKes : 1).toFixed(2);

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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 relative animate-in fade-in zoom-in-95 duration-200 transition-colors">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Shopping Cart</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{cart.length} courses in your cart</p>
            </div>
          </div>

          {cart.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">Your cart is currently empty.</p>
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-teal-600 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-teal-500 cursor-pointer"
              >
                Explore Courses
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto pr-1">
                {cart.map((course) => (
                  <div key={course.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img 
                        src={course.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80'} 
                        alt={course.title} 
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80';
                        }}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-lg object-cover" 
                      />
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs line-clamp-1 max-w-[200px]">{course.title}</h4>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">{formatPrice(course.price)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveFromCart(course.id)}
                      disabled={loading}
                      className="text-xs text-rose-500 hover:text-rose-700 font-semibold cursor-pointer disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">Total Amount:</span>
                <div className="text-right">
                  <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{totalAmount}</div>
                  <div className="text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">KES {formattedAmountKes}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-3">
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

                <button
                  onClick={onClose}
                  disabled={loading}
                  className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue Exploring
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
