import React, { useState, useEffect } from 'react';
import { Star, X } from 'lucide-react';
import { apiFetch } from '../../../lib/apiConfig';
import { Course } from '../../../types';

interface CourseRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessNext: () => void;
  course: Course;
  studentId: string;
  studentName: string;
}

const RATING_DESCRIPTIONS = [
  '1 Star - Poor',
  '2 Stars - Fair',
  '3 Stars - Good',
  '4 Stars - Very Good',
  '5 Stars - Outstanding & Masterclass!'
];

export const CourseRatingModal: React.FC<CourseRatingModalProps> = ({
  isOpen,
  onClose,
  onSuccessNext,
  course,
  studentId,
  studentName,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [ratingHover, setRatingHover] = useState<number>(0);
  const [reviewText, setReviewText] = useState<string>('');
  const [isEditingReview, setIsEditingReview] = useState<boolean>(false);
  const [hasExistingReview, setHasExistingReview] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (course?.id) {
      try {
        const savedRating = localStorage.getItem(`uqlearn_course_rating_${course.id}`);
        const savedReview = localStorage.getItem(`uqlearn_course_review_${course.id}`);
        if (savedRating) {
          const val = parseInt(savedRating, 10);
          if (!isNaN(val) && val >= 1 && val <= 5) {
            setRating(val);
            setHasExistingReview(true);
          }
        } else {
          setRating(5);
          setHasExistingReview(false);
        }
        if (savedReview) {
          setReviewText(savedReview);
          setHasExistingReview(true);
        } else {
          setReviewText('');
        }
        setIsEditingReview(false);
      } catch {
        setRating(5);
      }
    }
  }, [course?.id, isOpen]);

  if (!isOpen) return null;

  const currentDisplayRating = ratingHover || rating || 5;

  const handleSubmitRating = async () => {
    setIsSubmitting(true);
    const ratingValue = rating || 5;

    try {
      // 1. Save locally for instant reactivity across dashboard & player
      localStorage.setItem(`uqlearn_course_rating_${course.id}`, String(ratingValue));
      if (reviewText) {
        localStorage.setItem(`uqlearn_course_review_${course.id}`, reviewText);
      }

      // 2. Submit to the database via centralized API
      await apiFetch('course-ratings.php', {
        method: 'POST',
        body: JSON.stringify({
          studentId: studentId || 'current-user',
          studentName: studentName || 'Learner',
          courseId: course.id,
          rating: ratingValue,
          feedback: reviewText
        })
      });
    } catch (err) {
      console.warn('Could not submit rating via API:', err);
    } finally {
      setIsSubmitting(false);
      onSuccessNext();
    }
  };

  const isReadOnly = hasExistingReview && !isEditingReview;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative space-y-5 text-left">
        {/* Header matching dashboard */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400">
              Course Rating & Feedback
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1">
              {course.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rating Content matching dashboard */}
        <div className="text-center space-y-3 py-2">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            How would you rate your experience with this course?
          </p>

          <div className="flex items-center justify-center space-x-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setRatingHover(star)}
                onMouseLeave={() => setRatingHover(0)}
                onClick={() => setRating(star)}
                className="p-1 transition-transform hover:scale-125 cursor-pointer"
                title={`${star} star`}
              >
                <Star
                  className={`w-8 h-8 ${
                    star <= currentDisplayRating
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-300 dark:text-slate-600'
                  }`}
                />
              </button>
            ))}
          </div>

          <p className="text-xs text-amber-600 dark:text-amber-400 font-bold min-h-[1.25rem]">
            {currentDisplayRating > 0
              ? RATING_DESCRIPTIONS[currentDisplayRating - 1]
              : 'Click stars to select rating'}
          </p>

          {/* Review Text Feedback Input */}
          <div className="pt-2 text-left space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {isReadOnly
                  ? 'Your Submitted Review (Read-only):'
                  : 'Write your review comment (Optional):'}
              </label>
              {isReadOnly && (
                <button
                  type="button"
                  onClick={() => setIsEditingReview(true)}
                  className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                >
                  Edit Review
                </button>
              )}
            </div>
            <textarea
              value={reviewText}
              readOnly={isReadOnly}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder={
                isReadOnly
                  ? 'No written comment was provided.'
                  : 'Share details of your experience with this course...'
              }
              rows={3}
              className={`w-full p-2.5 text-xs rounded-xl border transition-colors ${
                isReadOnly
                  ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-medium cursor-not-allowed select-none'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder-slate-400'
              }`}
            />
          </div>
        </div>

        {/* Actions matching dashboard */}
        <div className="flex justify-end space-x-3 pt-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmitRating}
            className="px-6 py-2.5 bg-[#8a2be2] hover:bg-purple-600 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md cursor-pointer transition-all disabled:opacity-50 flex items-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                <span>Submitting...</span>
              </>
            ) : (
              <span>Submit Rating</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
