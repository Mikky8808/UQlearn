import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Info, X } from 'lucide-react';

export interface SponsoredLabelProps {
  /**
   * Optional custom label text (defaults to 'Sponsored')
   */
  text?: string;
  /**
   * Size variant
   */
  size?: 'xs' | 'sm' | 'md';
  /**
   * Show info icon
   */
  showInfoIcon?: boolean;
  /**
   * Additional custom CSS classes
   */
  className?: string;
  /**
   * Optional custom modal title
   */
  modalTitle?: string;
  /**
   * Optional custom modal description
   */
  modalDescription?: string;
}

/**
 * SponsoredLabel
 * Displays a clean 'Sponsored ⓘ' disclosure label. Clicking on the text or
 * info icon opens the information modal explaining sponsored courses on Uqlearn.
 * The modal is strictly dismissed ONLY by clicking the 'X' button or the 'Got it' button.
 */
export const SponsoredLabel: React.FC<SponsoredLabelProps> = ({
  text = 'Sponsored',
  size = 'xs',
  showInfoIcon = true,
  className = '',
  modalTitle = 'Sponsored courses',
  modalDescription = 'Sponsored courses are advertisements for courses sold by instructors of Uqlearn.',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const sizeClasses = {
    xs: 'text-[9px] sm:text-[10px] gap-1',
    sm: 'text-[10px] sm:text-[11px] gap-1',
    md: 'text-xs gap-1.5',
  }[size];

  const iconSizes = {
    xs: 'w-2.5 h-2.5 sm:w-3 sm:h-3',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
  }[size];

  const handleOpen = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(true);
  }, []);

  const handleClose = useCallback((e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsOpen(false);
  }, []);

  const modalContent = isOpen ? (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sponsored-modal-title"
      data-sponsored-modal="true"
      className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs select-none animate-in fade-in duration-150"
      onClick={(e) => {
        // Prevent background clicks from closing modal or leaking to parent elements
        e.preventDefault();
        e.stopPropagation();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
    >
      <div
        className="relative w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 text-left transition-all select-text cursor-default"
        onClick={(e) => {
          e.stopPropagation();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        {/* Header with Title and Close (X) Button */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <h3
            id="sponsored-modal-title"
            className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-snug"
          >
            {modalTitle}
          </h3>
          <button
            type="button"
            onClick={handleClose}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1.5 -mr-1.5 -mt-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5 stroke-[2]" />
          </button>
        </div>

        {/* Modal Description Body */}
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
          {modalDescription}
        </p>

        {/* Modal Footer / Got it Dismiss Button */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleClose}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        data-sponsored-label="true"
        onClick={handleOpen}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleOpen(e);
          }
        }}
        className={`inline-flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-normal tracking-tight select-none transition-colors cursor-pointer group focus:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 rounded-xs ${sizeClasses} ${className}`}
        title="Sponsored advertisement - Click for details"
        aria-label="Sponsored advertisement - Click for details"
      >
        <span className="leading-none group-hover:underline decoration-slate-400 underline-offset-2">
          {text}
        </span>
        {showInfoIcon && (
          <Info
            className={`${iconSizes} text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 shrink-0 stroke-[1.8]`}
            aria-hidden="true"
          />
        )}
      </button>

      {/* Render modal directly into document body to prevent z-index, event bubbling and overflow issues */}
      {typeof document !== 'undefined' && modalContent && createPortal(modalContent, document.body)}
    </>
  );
};

export default SponsoredLabel;
