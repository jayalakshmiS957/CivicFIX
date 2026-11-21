import React from 'react';
import { useLanguage } from '../../hooks/useLanguage.jsx';

/**
 * StatusStepper
 * 4-step horizontal progress tracker for complaint lifecycle:
 * Reported -> In Progress -> Pending Review -> Resolved
 * Handles 'Reopened' with an amber alert badge and falls back safely to 'Reported' if unknown.
 */
export function StatusStepper({ status = 'Reported', className = '' }) {
  const { t } = useLanguage();

  const STEPS = [
    { key: 'Reported', labelKey: 'statusReported', fallback: 'Reported' },
    { key: 'In Progress', labelKey: 'statusInProgress', fallback: 'In Progress' },
    { key: 'Pending Review', labelKey: 'statusPendingReview', fallback: 'Pending Review' },
    { key: 'Resolved', labelKey: 'statusResolved', fallback: 'Resolved' },
  ];

  const isReopened = status === 'Reopened';

  // Normalize status index. If Reopened, treat as 'In Progress' or 'Reported' along with badge
  let activeIndex = 0;
  if (status === 'In Progress' || isReopened) {
    activeIndex = 1;
  } else if (status === 'Pending Review') {
    activeIndex = 2;
  } else if (status === 'Resolved') {
    activeIndex = 3;
  } else {
    // Default fallback to 0 (Reported)
    activeIndex = 0;
  }

  return (
    <div
      className={`w-full py-2.5 px-1 overflow-hidden ${className}`}
      role="region"
      aria-label="Complaint progress status"
    >
      {/* Reopened Alert Badge if applicable */}
      {isReopened && (
        <div className="mb-2 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF7E0] text-[#B06000] border border-[#FEEFC3]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F9AB00] animate-pulse"></span>
            {t('statusReopened', 'Reopened')}
          </span>
          <span className="text-[11px] text-[#5F6368]">
            {t('reopenedNote', 'Investigation reopened')}
          </span>
        </div>
      )}

      {/* Horizontal Stepper */}
      <div className="relative flex items-center justify-between w-full">
        {/* Background Connecting Line */}
        <div
          className="absolute top-3 left-4 right-4 h-0.5 bg-[#E8EAED] -z-0"
          aria-hidden="true"
        />

        {/* Active Progress Line */}
        <div
          className="absolute top-3 left-4 h-0.5 bg-[#188038] -z-0 transition-all duration-300"
          style={{
            width: `${(activeIndex / (STEPS.length - 1)) * 100}%`,
            maxWidth: 'calc(100% - 2rem)',
          }}
          aria-hidden="true"
        />

        {/* Step Nodes */}
        {STEPS.map((step, idx) => {
          const isPassed = idx < activeIndex;
          const isCurrent = idx === activeIndex;
          const isFuture = idx > activeIndex;

          return (
            <div
              key={step.key}
              className="flex flex-col items-center relative z-10 select-none group"
              style={{ flex: 1 }}
            >
              {/* Step Circle */}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-200 ${
                  isPassed
                    ? 'bg-[#188038] text-white'
                    : isCurrent
                    ? 'bg-white border-2 border-[#188038] text-[#188038] ring-4 ring-[#E6F4EA]'
                    : 'bg-white border-2 border-[#DADCE0] text-[#9AA0A6]'
                }`}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`${t(step.labelKey, step.fallback)} ${
                  isPassed ? '(Completed)' : isCurrent ? '(Current)' : '(Upcoming)'
                }`}
              >
                {isPassed ? (
                  <svg
                    className="w-3.5 h-3.5 stroke-current"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>

              {/* Step Label */}
              <span
                className={`mt-1.5 text-[10px] sm:text-xs text-center leading-tight truncate max-w-[70px] sm:max-w-[90px] px-0.5 ${
                  isCurrent
                    ? 'font-semibold text-[#188038]'
                    : isPassed
                    ? 'font-medium text-[#202124]'
                    : 'text-[#5F6368]'
                }`}
                title={t(step.labelKey, step.fallback)}
              >
                {t(step.labelKey, step.fallback)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default StatusStepper;
