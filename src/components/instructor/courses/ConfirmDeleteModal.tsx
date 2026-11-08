import React from 'react';
import { X } from 'lucide-react';

export interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Please confirm',
  message = 'You are about to remove a curriculum item. Are you sure you want to continue?'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-2xs transition-opacity animate-in fade-in duration-150"
      />

      {/* Modal Dialog Positioned Centered */}
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div 
          className="w-full max-w-md transform overflow-hidden rounded-3xl bg-white dark:bg-slate-900 p-6 text-left align-middle shadow-2xl border border-slate-100 dark:border-slate-800 transition-all animate-in zoom-in-95 duration-150 relative z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              {title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <p className="text-xs text-slate-600 dark:text-slate-300 my-4 leading-relaxed font-normal">
            {message}
          </p>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-[#6D28D9] dark:text-indigo-400 hover:underline transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-6 py-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer active:scale-95"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
