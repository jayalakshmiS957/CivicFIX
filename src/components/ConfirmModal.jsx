import React, { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = false,
  onConfirm,
  onCancel,
}) {
  const confirmButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      confirmButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 transition-opacity animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <div className="bg-white rounded-card max-w-md w-full p-6 shadow-card border border-[#DADCE0] space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                isDanger
                  ? 'bg-[#FCE8E6] text-[#D93025]'
                  : 'bg-[#FEF7E0] text-[#B06000]'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3
              id="modal-title"
              className="text-lg font-medium font-heading text-[#202124]"
            >
              {title}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="text-[#5F6368] hover:text-[#202124] p-1 rounded-md"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p id="modal-description" className="text-sm text-[#5F6368] leading-relaxed">
          {message}
        </p>

        <div className="flex items-center justify-end gap-3 pt-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-control text-sm font-medium text-[#202124] bg-white border border-[#DADCE0] hover:bg-[#F8F9FA] transition-colors"
          >
            {cancelText}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-control text-sm font-medium text-white shadow-sm transition-colors ${
              isDanger
                ? 'bg-[#D93025] hover:bg-[#B82218] focus:ring-2 focus:ring-red-500'
                : 'bg-[#188038] hover:bg-[#137333] focus:ring-2 focus:ring-[#188038]'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
