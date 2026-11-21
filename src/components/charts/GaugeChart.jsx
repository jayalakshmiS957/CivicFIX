import React from 'react';
import { useLanguage } from '../../hooks/useLanguage.jsx';

/**
 * GaugeChart
 * Semi-circular gauge showing SLA Compliance percentage and overdue complaint count.
 */
export function GaugeChart({
  slaCompliancePercent = 0,
  overdueCount = 0,
  title,
  loading = false,
  className = '',
}) {
  const { t } = useLanguage();

  if (loading) {
    return (
      <div
        className={`bg-white border border-[#DADCE0] rounded-xl p-5 shadow-xs animate-pulse ${className}`}
        aria-label={t('chartLoading')}
      >
        <div className="h-4 w-36 bg-[#E8EAED] rounded-sm mb-4"></div>
        <div className="h-44 bg-[#F1F3F4] rounded-lg"></div>
      </div>
    );
  }

  const safePct = Math.min(100, Math.max(0, Math.round(Number(slaCompliancePercent) || 0)));
  const safeOverdue = Math.max(0, Number(overdueCount) || 0);

  // SVG Geometry
  const radius = 75;
  const circumference = Math.PI * radius; // half circle length ~ 235.62
  const strokeOffset = circumference * (1 - safePct / 100);

  // Color scheme based on SLA percentage
  let progressColor = '#188038'; // green
  if (safePct < 70) {
    progressColor = '#D93025'; // red
  } else if (safePct < 85) {
    progressColor = '#F9AB00'; // amber
  }

  return (
    <div
      className={`bg-white border border-[#DADCE0] rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between overflow-hidden ${className}`}
      role="region"
      aria-label={title || t('slaCompliance')}
    >
      <style>{`
        @keyframes gaugeFill {
          from { stroke-dashoffset: 236; }
          to { stroke-dashoffset: ${strokeOffset}; }
        }
        .gauge-arc-anim {
          stroke-dasharray: 236;
          stroke-dashoffset: ${strokeOffset};
          animation: gaugeFill 550ms cubic-bezier(0.2, 0, 0, 1) forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .gauge-arc-anim {
            animation: none;
            stroke-dashoffset: ${strokeOffset};
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-[#202124]">
          {title || t('slaCompliance')}
        </h3>
        <span className="text-[11px] font-medium text-[#5F6368] bg-[#F1F3F4] px-2 py-0.5 rounded-full">
          {t('slaTarget', 'Target: 90%+')}
        </span>
      </div>

      {/* Semi-circular gauge SVG */}
      <div className="relative w-full max-w-[220px] mx-auto py-1 flex items-center justify-center">
        <svg
          viewBox="0 0 200 120"
          className="w-full h-auto overflow-visible select-none"
          aria-hidden="true"
        >
          {/* Background track */}
          <path
            d="M 25 105 A 75 75 0 0 1 175 105"
            fill="none"
            stroke="#E8EAED"
            strokeWidth="15"
            strokeLinecap="round"
          />

          {/* Progress arc */}
          <path
            d="M 25 105 A 75 75 0 0 1 175 105"
            fill="none"
            stroke={progressColor}
            strokeWidth="15"
            strokeLinecap="round"
            className="gauge-arc-anim"
          />

          {/* Center text */}
          <text
            x="100"
            y="92"
            textAnchor="middle"
            fontSize="30"
            fontWeight="bold"
            fill="#202124"
            className="font-sans"
          >
            {safePct}%
          </text>
          <text
            x="100"
            y="110"
            textAnchor="middle"
            fontSize="11"
            fill="#5F6368"
            className="font-medium"
          >
            {safePct >= 90 ? t('withinSla') : t('slaCompliance')}
          </text>
        </svg>
      </div>

      {/* Overdue Badge & Summary Footer */}
      <div className="mt-3 pt-3 border-t border-[#F1F3F4] flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-[#5F6368]">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              safeOverdue > 0 ? 'bg-[#D93025]' : 'bg-[#188038]'
            }`}
          ></span>
          <span>{t('overdueCount')}:</span>
        </div>

        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            safeOverdue > 0
              ? 'bg-[#FCE8E6] text-[#C5221F] border border-[#FAD2CF]'
              : 'bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]'
          }`}
        >
          {safeOverdue > 0 ? `${safeOverdue} ${t('overdueBadge')}` : `0 ${t('overdueBadge')}`}
        </span>
      </div>

      {/* Screen Reader Table */}
      <table className="sr-only">
        <caption>{title || t('slaCompliance')}</caption>
        <thead>
          <tr>
            <th scope="col">Metric</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>SLA Compliance Rate</td>
            <td>{safePct}%</td>
          </tr>
          <tr>
            <td>Overdue Complaints</td>
            <td>{safeOverdue}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default GaugeChart;
