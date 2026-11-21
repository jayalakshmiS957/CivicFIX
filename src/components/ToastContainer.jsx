import React from 'react';
import { useToast } from '../hooks/useToast.jsx';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="System notifications"
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((t) => {
        let containerStyle = 'bg-white text-[#202124] border-[#DADCE0] shadow-lg';
        let icon = <Info className="w-5 h-5 text-[#188038] shrink-0" />;

        if (t.type === 'success') {
          containerStyle = 'bg-white text-[#137333] border-[#CEEAD6] shadow-lg';
          icon = <CheckCircle2 className="w-5 h-5 text-[#1E8E3E] shrink-0" />;
        } else if (t.type === 'error') {
          containerStyle = 'bg-white text-[#C5221F] border-[#FAD2CF] shadow-lg';
          icon = <AlertCircle className="w-5 h-5 text-[#D93025] shrink-0" />;
        } else if (t.type === 'warning') {
          containerStyle = 'bg-white text-[#B06000] border-[#FEEFC3] shadow-lg';
          icon = <AlertTriangle className="w-5 h-5 text-[#E37400] shrink-0" />;
        } else {
          containerStyle = 'bg-white text-[#188038] border-[#CDE8D4] shadow-lg';
          icon = <Info className="w-5 h-5 text-[#188038] shrink-0" />;
        }

        return (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-200 transform translate-y-0 ${containerStyle}`}
          >
            {icon}
            <div className="flex-1 text-xs sm:text-sm font-medium leading-snug break-words">
              {t.message}
            </div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="text-[#5F6368] hover:text-[#202124] transition-colors p-1 rounded-md focus:outline-none focus:ring-1 focus:ring-[#188038]"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
