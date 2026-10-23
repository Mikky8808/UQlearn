import React, { useState } from 'react';
import { Star, X } from 'lucide-react';
import { apiFetch, API_BASE_URL } from '../../../lib/apiConfig';
import { Course } from '../../../types';

interface CourseRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessNext: () => void;
  course: Course;
  studentId: string;
  studentName: string;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Awful, not recommended',
  2: 'Poor, not what I expected',
  3: 'Average, could be better',
  4: 'Good, what I expected',
  5: 'Amazing, above expectation',
};

export const CourseRatingModal: React.FC<CourseRatingModalProps> = ({
  isOpen,
  onClose,
  onSuccessNext,
  course,
  studentId,
  studentName,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentDisplayRating = hoverRating || rating || 5;
  const currentLabel = RATING_LABELS[currentDisplayRating] || 'Amazing, above expectation';

  const handleSubmitRating = async () => {
    setIsSubmitting(true);
    try {
      // Save locally
      localStorage.setItem(`uqlearn_course_rating_${course.id}`, String(rating));

      // Post to backend
      await apiFetch(`${API_BASE_URL}/course-ratings.php`, {
        method: 'POST',
        body: JSON.stringify({
          studentId,
          studentName,
          courseId: course.id,
          rating
        }),
        silent: true
      }, 0);
    } catch (e) {
      console.warn('Rating submit error:', e);
    } finally {
      setIsSubmitting(false);
      onSuccessNext();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-[340px] sm:max-w-[380px] bg-[#1c1d1f] text-white rounded-2xl shadow-2xl p-6 sm:p-7 border border-slate-800/80 flex flex-col items-center text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white mb-6 pr-4 leading-snug">
          Based on what you've seen so far, how would you rate this course?
        </h2>

        {/* Rating Sentiment text */}
        <div className="text-xs sm:text-sm font-medium text-slate-300 mb-5 min-h-[20px] transition-all">
          {currentLabel}
        </div>

        {/* Star Rating Group */}
        <div className="flex items-center justify-center space-x-2 sm:space-x-2.5 mb-6">
          {[1, 2, 3, 4, 5].map((star) => {
            const isFilled = star <= currentDisplayRating;
            return (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 focus:outline-none transition-transform hover:scale-110 cursor-pointer"
                title={`${star} star`}
              >
                <Star
                  className={`w-9 h-9 sm:w-10 sm:h-10 transition-colors ${
                    isFilled
                      ? 'fill-[#d29033] text-[#d29033]'
                      : 'text-slate-600 fill-transparent stroke-slate-500'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Track Slider / Indicator below stars matching design */}
        <div className="w-full px-2 mb-8">
          <div className="relative w-full h-3.5 bg-[#8b8422]/90 rounded-full flex items-center justify-between px-2.5 shadow-inner">
            {[1, 2, 3, 4, 5].map((dot) => (
              <div
                key={dot}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  dot <= currentDisplayRating ? 'bg-[#1c1d1f]/70' : 'bg-white/40'
                }`}
              />
            ))}
            {/* End marker line */}
            <div className="absolute right-0 top-[-3px] bottom-[-3px] w-1 bg-white/90 rounded-full shadow" />
          </div>
        </div>

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={handleSubmitRating}
          disabled={isSubmitting}
          className="w-full py-3 sm:py-3.5 px-4 bg-white hover:bg-slate-100 text-slate-950 font-bold rounded-lg transition-colors cursor-pointer text-sm sm:text-base shadow-md disabled:opacity-50 flex items-center justify-center space-x-2"
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin inline-block" />
              <span>Submitting...</span>
            </>
          ) : (
            <span>Submit</span>
          )}
        </button>

        {/* Secondary "Maybe later" Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="mt-4 text-xs sm:text-sm font-bold text-purple-400 hover:text-purple-300 transition-colors cursor-pointer hover:underline disabled:opacity-50"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
};
