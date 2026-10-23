import React, { useState } from 'react';
import { 
  X, 
  Star, 
  User, 
  BookOpen, 
  Calendar, 
  Trash2, 
  EyeOff, 
  Scale, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { ReviewAppealModal } from './ReviewAppealModal';
import { useApp } from '../../context/AppContext';
import { currencyUtils } from '../../utils/currencyUtils';

export interface ReviewDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: {
    id: string;
    student_name?: string;
    student_id?: string;
    course_id?: string;
    course_title?: string;
    rating?: number;
    feedback?: string;
    created_at?: string;
    status?: string;
    appeal_clause?: string;
  } | null;
  onDeleteReview?: (reviewId: string, studentName: string) => void;
  onAppealSubmitted?: (reviewId: string, appealData: any) => void;
}

export const ReviewDetailModal: React.FC<ReviewDetailModalProps> = ({
  isOpen,
  onClose,
  review,
  onDeleteReview,
  onAppealSubmitted,
}) => {
  const { selectedCurrency } = useApp();
  const [appealModalOpen, setAppealModalOpen] = useState(false);

  if (!isOpen || !review) return null;

  const appealFeeText = currencyUtils.getAppealFeeFormatted(
    selectedCurrency?.code,
    selectedCurrency?.rate,
    selectedCurrency?.symbol
  );

  const ratingNum = Number(review.rating) || 5;
  const sentimentText = ratingNum >= 4 ? 'Positive' : 'Constructive';
  const sentimentColor = ratingNum >= 4 
    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' 
    : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800';

  const hasFeedback = Boolean(review.feedback && review.feedback.trim());
  const feedbackText = hasFeedback ? review.feedback.trim() : 'no feedback';

  const isAppealed = review.status === 'appealed_pending_review' || Boolean(review.appeal_clause);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
        <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6">
          
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-indigo-600 text-white font-black flex items-center justify-center text-sm shadow-md shrink-0">
                {(review.student_name || 'L').charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                  {review.student_name || 'Learner Evaluation'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Learner Review Details
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Details Grid */}
          <div className="space-y-4 text-xs">
            
            {/* Status Badge */}
            {isAppealed ? (
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span className="font-bold">
                  Appealed under {review.appeal_clause || 'Section 3'} ($0.55 fee paid) – Under Independent Review
                </span>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="font-bold text-slate-500">Review Status:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-black uppercase">
                  Published Live
                </span>
              </div>
            )}

            {/* Course Title */}
            {review.course_title && (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400">Enrolled Course</span>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {review.course_title}
                </p>
              </div>
            )}

            {/* Rating Stars & Sentiment */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400">Rating Score</span>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-4 h-4 ${
                        s <= ratingNum
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-200 dark:text-slate-700 fill-transparent'
                      }`}
                    />
                  ))}
                  <span className="ml-1.5 font-black text-slate-900 dark:text-slate-100">{ratingNum}.0 / 5.0</span>
                </div>
              </div>

              <span className={`px-3 py-1 text-[10px] font-black rounded-md uppercase tracking-wider ${sentimentColor}`}>
                {sentimentText}
              </span>
            </div>

            {/* Submitted Date */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-md border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400">Date Submitted</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {review.created_at ? new Date(review.created_at).toLocaleString() : 'Recently'}
              </span>
            </div>

            {/* Full Written Feedback */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase text-slate-400">Full Written Feedback</span>
              <p className={`p-4 rounded-md border border-slate-200 dark:border-slate-800 leading-relaxed text-xs ${
                hasFeedback 
                  ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium' 
                  : 'bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-500 italic'
              }`}>
                {feedbackText}
              </p>
            </div>

          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2.5">
            {onDeleteReview && (
              <button
                type="button"
                onClick={() => {
                  onDeleteReview(review.id, review.student_name || 'Learner');
                  onClose();
                }}
                className="px-4 py-2.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-300 font-bold text-xs rounded-md transition-all cursor-pointer border border-rose-200 dark:border-rose-800 flex items-center space-x-1.5"
                title="Delete this review"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Review</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setAppealModalOpen(true)}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-md shadow-md transition-all cursor-pointer flex items-center space-x-1.5"
            >
              <Scale className="w-4 h-4" />
              <span>Hide Feedback / Appeal ({appealFeeText})</span>
            </button>
          </div>

        </div>
      </div>

      {/* Nested Appeal Policy Modal */}
      <ReviewAppealModal
        isOpen={appealModalOpen}
        onClose={() => setAppealModalOpen(false)}
        review={review}
        onAppealSubmitted={(id, data) => {
          if (onAppealSubmitted) {
            onAppealSubmitted(id, data);
          }
          setAppealModalOpen(false);
          onClose();
        }}
      />
    </>
  );
};
