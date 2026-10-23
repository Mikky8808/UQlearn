import React, { useState } from 'react';
import { 
  X, 
  ShieldAlert, 
  CheckCircle2, 
  DollarSign, 
  FileText, 
  AlertTriangle, 
  Lock, 
  Scale,
  ExternalLink
} from 'lucide-react';
import { apiFetch } from '../../lib/apiConfig';
import { appealService } from '../../services/appeal-service';
import { useApp } from '../../context/AppContext';
import { currencyUtils } from '../../utils/currencyUtils';

export interface ReviewAppealModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: {
    id: string;
    student_name?: string;
    course_id?: string;
    course_title?: string;
    rating?: number;
    feedback?: string;
    created_at?: string;
  } | null;
  onAppealSubmitted: (reviewId: string, appealData: any) => void;
}

export const ReviewAppealModal: React.FC<ReviewAppealModalProps> = ({
  isOpen,
  onClose,
  review,
  onAppealSubmitted,
}) => {
  const { selectedCurrency } = useApp();
  const effectiveCurrencyCode = selectedCurrency?.code || (typeof localStorage !== 'undefined' ? (localStorage.getItem('uqlearn_system_currency') || 'KES') : 'KES');
  const effectiveCurrencyRate = selectedCurrency?.rate;
  const effectiveCurrencySymbol = selectedCurrency?.symbol;

  const appealFeeText = currencyUtils.getAppealFeeFormatted(
    effectiveCurrencyCode,
    effectiveCurrencyRate,
    effectiveCurrencySymbol
  );
  const appealFeeAmount = currencyUtils.getAppealFeeAmount(
    effectiveCurrencyCode,
    effectiveCurrencyRate
  );
  const appealFeeCurrency = effectiveCurrencyCode;

  const [selectedClause, setSelectedClause] = useState<string>('3.1');
  const [evidenceText, setEvidenceText] = useState<string>('');
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !review) return null;

  const clauses = [
    { id: '3.1', label: 'Clause 3.1: Spam, advertising, or content unrelated to the course' },
    { id: '3.2', label: 'Clause 3.2: Profanity, hate speech, harassment, or threats' },
    { id: '3.3', label: 'Clause 3.3: Contains personal data belonging to instructor or third party' },
    { id: '3.4', label: 'Clause 3.4: Demonstrably false in statement of fact (not opinion)' },
    { id: '3.5', label: 'Clause 3.5: Submitted by non-verified learner' },
    { id: '3.6', label: 'Clause 3.6: Submitted in exchange for compensation or under duress' },
    { id: '3.7', label: 'Clause 3.7: Submitted by a competitor or conflict of interest' },
  ];

  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!acceptedTerms) {
      setErrorMessage('You must accept the Review Integrity & Instructor Appeal Policy terms to proceed.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Execute appeal submission: deducts dynamic fee from course earnings & logs transaction
      const record = await appealService.submitAppeal({
        review_id: review.id,
        course_id: review.course_id,
        course_title: review.course_title,
        student_name: review.student_name,
        rating: review.rating,
        feedback: review.feedback,
        clause: clauses.find(c => c.id === selectedClause)?.label || selectedClause,
        evidence: evidenceText,
        fee_amount: appealFeeAmount,
        currency: appealFeeCurrency
      });

      onAppealSubmitted(review.id, {
        clause: selectedClause,
        evidence: evidenceText,
        fee_amount: appealFeeAmount,
        currency: appealFeeCurrency,
        status: 'under_appeal'
      });
      onClose();
    } catch (err: any) {
      console.warn('Appeal submission error:', err);
      onAppealSubmitted(review.id, {
        clause: selectedClause,
        evidence: evidenceText,
        fee_amount: appealFeeAmount,
        currency: appealFeeCurrency,
        status: 'under_appeal'
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 my-8 max-h-[90vh] flex flex-col justify-between">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-200 dark:border-amber-800">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase mb-1">
                <span>{appealFeeText} ({selectedCurrency?.code === 'USD' ? 'Flat Admin Fee' : '$0.55 USD'}) Administrative Appeal Fee</span>
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
                Hide Feedback & Submit Official Review Appeal
              </h2>
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

        {/* Scrollable Modal Content Body */}
        <div className="space-y-6 overflow-y-auto pr-1 flex-1">
          
          {/* Target Review Highlight */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>Review ID: #{review.id}</span>
              <span>Learner: <strong className="text-slate-800 dark:text-slate-200">{review.student_name || 'Learner'}</strong></span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 italic bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
              {review.feedback && review.feedback.trim() ? review.feedback.trim() : 'no feedback'}
            </p>
          </div>

          {/* Form */}
          <form id="review-appeal-form" onSubmit={handleSubmitAppeal} className="space-y-5">
            
            {/* Clause Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                1. Select Policy Violation Clause (Section 3)
              </label>
              <select
                value={selectedClause}
                onChange={(e) => setSelectedClause(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                {clauses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Evidence Text Input */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                2. Supporting Evidence & Explanation
              </label>
              <textarea
                value={evidenceText}
                onChange={(e) => setEvidenceText(e.target.value)}
                placeholder="Provide specific details or evidence showing how this review violates the chosen Section 3 clause..."
                rows={3}
                className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-rose-500"
              />
            </div>

            {/* Full Review Integrity Policy Scrollable Text Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  3. Review Integrity & Instructor Appeal Policy
                </label>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center space-x-1">
                  <span>{appealFeeText} Flat Payment Policy</span>
                </span>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 max-h-48 overflow-y-auto space-y-3 font-sans">
                <h4 className="font-bold text-slate-900 dark:text-slate-100">Review Integrity & Instructor Appeal Policy</h4>
                
                <div>
                  <h5 className="font-bold text-slate-800 dark:text-slate-200">1. Purpose</h5>
                  <p>These terms govern how learner reviews are collected, displayed, and disputed. They exist to protect the integrity of reviews for prospective learners while giving instructors a fair, documented process to challenge reviews that violate this policy. Negative reviews are a normal and protected part of the learning marketplace. Removal happens only when a review violates a specific clause in Section 3.</p>
                </div>

                <div>
                  <h5 className="font-bold text-slate-800 dark:text-slate-200">2. Definitions</h5>
                  <p><strong>Review</strong> – any rating, comment, or feedback submitted by a learner. <strong>Instructor</strong> – course creator. <strong>Reviewer</strong> – independent staff investigating appeals. <strong>Appeal</strong> – formal investigation request under Section 3.</p>
                </div>

                <div>
                  <h5 className="font-bold text-slate-800 dark:text-slate-200">3. What may be removed</h5>
                  <p>Spam, advertising, profanity, hate speech, harassment, threats, personal data, demonstrably false statement of fact (not opinion), non-verified learner submission, submitted in exchange for compensation/duress, or competitor conflict of interest.</p>
                </div>

                <div>
                  <h5 className="font-bold text-slate-800 dark:text-slate-200">4. What will NOT be removed</h5>
                  <p>Negative opinions, criticism of teaching style/workload/pace, low ratings with no comment, or reviews the instructor disagrees with.</p>
                </div>

                <div>
                  <h5 className="font-bold text-slate-800 dark:text-slate-200">5. Instructor Appeal Process</h5>
                  <p>Instructor submits appeal citing Section 3 clause with evidence. The review remains under investigation by an independent reviewer.</p>
                </div>

                <div>
                  <h5 className="font-bold text-slate-800 dark:text-slate-200">6. Appeal Fee ({appealFeeText} Flat Payment)</h5>
                  <p>A non-refundable {appealFeeText} ({selectedCurrency?.code === 'USD' ? '$0.55' : '$0.55 USD'}) flat administrative fee covers reviewer time. It is deducted from course earnings upon submission and does not guarantee removal or influence outcome.</p>
                </div>

                <div>
                  <h5 className="font-bold text-slate-800 dark:text-slate-200">7. Learner's Right to Respond</h5>
                  <p>Learners whose reviews are removed receive written notice citing the specific clause and have a right to appeal within [X] days.</p>
                </div>

                <div>
                  <h5 className="font-bold text-slate-800 dark:text-slate-200">8. Transparency</h5>
                  <p>Annual removal metrics published. Instructors cannot directly edit, delete, hide, or unpublish reviews without formal appeal.</p>
                </div>

                <div>
                  <h5 className="font-bold text-slate-800 dark:text-slate-200">9. No Retaliation</h5>
                  <p>Instructors may not retaliate against learners. Retaliation is grounds for immediate instructor suspension.</p>
                </div>

                <div>
                  <h5 className="font-bold text-slate-800 dark:text-slate-200">10. Record Keeping</h5>
                  <p>All appeals, evidence, decisions, fee records, and learner responses recorded for audit purposes.</p>
                </div>

                <div>
                  <h5 className="font-bold text-slate-800 dark:text-slate-200">11. Governing Law</h5>
                  <p>Governed by applicable consumer protection laws and statutory rights.</p>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-bold flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Agreement Checkbox */}
            <label className="flex items-start space-x-3 p-3.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="w-4 h-4 mt-0.5 text-rose-600 focus:ring-rose-500 rounded border-slate-300 dark:border-slate-600"
              />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                I have read, understood, and accept the Review Integrity & Instructor Appeal Policy and agree to the non-refundable {appealFeeText} ({selectedCurrency?.code === 'USD' ? '$0.55' : '$0.55 USD'}) flat administrative fee for processing this appeal.
              </span>
            </label>

          </form>
        </div>

        {/* Modal Footer Actions */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="submit"
            form="review-appeal-form"
            disabled={isSubmitting || !acceptedTerms}
            className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{isSubmitting ? 'Processing Appeal...' : `Submit Appeal & Charge ${appealFeeText}`}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
