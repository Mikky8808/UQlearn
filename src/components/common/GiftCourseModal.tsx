import React, { useState } from 'react';
import { X, Gift, Mail, User, Calendar, Copy, Check, Sparkles, Send, CheckCircle2 } from 'lucide-react';
import { Course } from '../../types';
import { useApp } from '../../context/AppContext';
import { resolveImageUrl } from '../../lib/branding';

export interface GiftCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course;
}

export const GiftCourseModal: React.FC<GiftCourseModalProps> = ({
  isOpen,
  onClose,
  course,
}) => {
  const { selectedCurrency, addToCart } = useApp();
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const giftCode = `GIFT-${course.id ? String(course.id).slice(0, 5).toUpperCase() : 'UQ'}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const giftUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/course/${course.id}?gift=${giftCode}` 
    : `https://uqlearn.org/course/${course.id}?gift=${giftCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(giftUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSubmitGift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail.trim()) return;

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setIsSuccess(true);
    }, 600);
  };

  const handleReset = () => {
    setIsSuccess(false);
    setRecipientName('');
    setRecipientEmail('');
    setSenderName('');
    setPersonalMessage('');
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs transition-opacity duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-none border border-slate-300 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden relative transition-all duration-150 ease-out font-sans text-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#1c1d1f] text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-purple-500/20 text-purple-400 rounded-none border border-purple-500/30">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">
                Gift this course
              </h2>
              <p className="text-xs text-slate-400">
                Share the gift of knowledge and learning with friends or family
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {isSuccess ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Gift Voucher Created!
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                  A gift email invitation for <span className="font-semibold text-slate-900 dark:text-white">"{course.title}"</span> has been scheduled for {recipientEmail || 'your recipient'}.
                </p>
              </div>

              {/* Shareable Gift Code Box */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-200 dark:border-slate-700 text-left space-y-2 mt-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Instant Gift Link
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={giftUrl}
                    className="w-full text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-3 py-2 text-slate-700 dark:text-slate-300 select-all"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-2 bg-[#a435f0] hover:bg-[#8710d8] text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 flex justify-center">
                <button
                  onClick={handleReset}
                  className="px-6 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-bold hover:bg-slate-800 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              
              {/* Course Mini Summary */}
              <div className="flex items-center gap-3.5 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <img 
                  src={resolveImageUrl(course.image, 'course')} 
                  alt={course.title} 
                  className="w-16 h-12 object-cover shrink-0 border border-slate-200 dark:border-slate-700" 
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                    {course.title}
                  </h4>
                  <p className="text-xs text-slate-500">
                    By {course.instructor || 'Lead Instructor'}
                  </p>
                  <span className="text-xs font-bold text-[#a435f0]">
                    {course.price ? `${selectedCurrency} ${course.price}` : 'Free Course'}
                  </span>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmitGift} className="space-y-4">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Recipient's name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input 
                        type="text"
                        placeholder="Alex Smith"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-none focus:outline-none focus:border-[#a435f0]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Recipient's email <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input 
                        type="email"
                        required
                        placeholder="alex@example.com"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-none focus:outline-none focus:border-[#a435f0]"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Your name (sender)
                    </label>
                    <input 
                      type="text"
                      placeholder="Your name"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-none focus:outline-none focus:border-[#a435f0]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Delivery date
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input 
                        type="date"
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-none focus:outline-none focus:border-[#a435f0]"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Personalized message (optional)
                  </label>
                  <textarea 
                    rows={3}
                    placeholder="Happy learning! I hope you enjoy this course as much as I did..."
                    value={personalMessage}
                    onChange={(e) => setPersonalMessage(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-none focus:outline-none focus:border-[#a435f0] resize-none"
                  />
                </div>

                {/* Instant Gift Link shortcut */}
                <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    <span className="text-xs text-purple-900 dark:text-purple-200 font-medium truncate">
                      Want to send a link directly yourself?
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="text-xs font-bold text-purple-700 dark:text-purple-300 hover:underline shrink-0 flex items-center gap-1"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Link Copied' : 'Copy Link'}</span>
                  </button>
                </div>

                {/* Submit button */}
                <div className="pt-2 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !recipientEmail.trim()}
                    className="px-6 py-2.5 bg-[#a435f0] hover:bg-[#8710d8] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider flex items-center space-x-2 transition-colors shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Scheduling...' : 'Proceed to Gift'}</span>
                  </button>
                </div>

              </form>

            </div>
          )}
        </div>

      </div>
    </div>
  );
};
