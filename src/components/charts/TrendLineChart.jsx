import React, { useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage.jsx';

/**
 * TrendLineChart
 * SVG line chart showing reported vs resolved complaints over the last 10 days.
 * Features:
 * - Two line paths with area fills (#188038, #F9AB00)
 * - Interactive hover dots and tooltip
 * - Legend with color keys
 * - Visually hidden screen reader table
 * - Draw-in animation (<600ms) respecting prefers-reduced-motion
 * - Skeleton loading state and empty state
 */
export function TrendLineChart({ data = [], loading = false, title, className = '' }) {
  const { t } = useLanguage();
  const [hoverIndex, setHoverIndex] = useState(null);

  if (loading) {
    return (
      <div
        className={`bg-white border border-[#DADCE0] rounded-xl p-5 shadow-xs animate-pulse ${className}`}
        aria-label={t('chartLoading')}
      >
        <div className="h-4 w-48 bg-[#E8EAED] rounded-sm mb-4"></div>
        <div className="h-44 bg-[#F1F3F4] rounded-lg"></div>
      </div>
    );
  }

  const safeData = Array.isArray(data) ? data : [];

  if (safeData.length === 0) {
    return (
      <div
        className={`bg-white border border-[#DADCE0] rounded-xl p-6 text-center shadow-xs ${className}`}
      >
        <h4 className="text-sm font-semibold text-[#202124] mb-1">
          {title || t('reportedVsResolved')}
        </h4>
        <p className="text-xs text-[#5F6368] py-8">
          {t('chartEmpty')}
        </p>
      </div>
    );
  }

  // Dimensions
  const svgWidth = 500;
  const svgHeight = 220;
  const padLeft = 40;
  const padRight = 20;
  const padTop = 25;
  const padBottom = 35;
  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  const maxVal = Math.max(
    4,
    ...safeData.map((d) => Math.max(Number(d.reported) || 0, Number(d.resolved) || 0))
  );

  const getX = (idx) => padLeft + (idx / Math.max(1, safeData.length - 1)) * chartW;
  const getY = (val) => padTop + chartH - ((Number(val) || 0) / maxVal) * chartH;
  const baseY = padTop + chartH;

  // Build SVG paths
  const reportedPoints = safeData.map((d, i) => ({ x: getX(i), y: getY(d.reported), ...d }));
  const resolvedPoints = safeData.map((d, i) => ({ x: getX(i), y: getY(d.resolved), ...d }));

  const buildLinePath = (pts) =>
    pts.length > 0 ? pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') : '';

  const buildAreaPath = (pts) => {
    if (pts.length === 0) return '';
    const line = buildLinePath(pts);
    const lastX = pts[pts.length - 1].x.toFixed(1);
    const firstX = pts[0].x.toFixed(1);
    return `${line} L ${lastX} ${baseY.toFixed(1)} L ${firstX} ${baseY.toFixed(1)} Z`;
  };

  const reportedLine = buildLinePath(reportedPoints);
  const reportedArea = buildAreaPath(reportedPoints);
  const resolvedLine = buildLinePath(resolvedPoints);
  const resolvedArea = buildAreaPath(resolvedPoints);

  // Y-axis ticks (3 ticks: 0, Math.round(maxVal/2), maxVal)
  const yTicks = [0, Math.ceil(maxVal / 2), maxVal];

  const activePoint = hoverIndex !== null && safeData[hoverIndex] ? safeData[hoverIndex] : null;

  return (
    <div
      className={`bg-white border border-[#DADCE0] rounded-xl p-4 sm:p-5 shadow-xs overflow-hidden ${className}`}
      role="region"
      aria-label={title || t('reportedVsResolved')}
    >
      <style>{`
        @keyframes drawLine {
          from { stroke-dashoffset: 1000; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes fadeInArea {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .trend-line-anim {
          stroke-dasharray: 1000;
          animation: drawLine 550ms cubic-bezier(0.2, 0, 0, 1) forwards;
        }
        .trend-area-anim {
          animation: fadeInArea 500ms ease-out forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .trend-line-anim {
            animation: none;
            stroke-dashoffset: 0;
          }
          .trend-area-anim {
            animation: none;
            opacity: 1;
          }
        }
      `}</style>

      {/* Header and Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-[#202124]">
            {title || t('reportedVsResolved')}
          </h3>
          <p className="text-xs text-[#5F6368] mt-0.5">
            {t('last10DaysOverview', '10-day trend of reported issues and resolutions')}
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-medium text-[#3C4043]" aria-hidden="true">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#188038] inline-block"></span>
            <span>{t('chartReported')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#F9AB00] inline-block"></span>
            <span>{t('chartResolved')}</span>
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible select-none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="reportedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#188038" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#188038" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="resolvedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F9AB00" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#F9AB00" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines and Y labels */}
          {yTicks.map((tickVal) => {
            const yPos = getY(tickVal);
            return (
              <g key={`y-${tickVal}`}>
                <line
                  x1={padLeft}
                  y1={yPos}
                  x2={svgWidth - padRight}
                  y2={yPos}
                  stroke="#E8EAED"
                  strokeWidth="1"
                  strokeDasharray={tickVal === 0 ? 'none' : '3 3'}
                />
                <text
                  x={padLeft - 8}
                  y={yPos + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="#5F6368"
                  className="font-mono"
                >
                  {tickVal}
                </text>
              </g>
            );
          })}

          {/* Area Fills */}
          <path d={reportedArea} fill="url(#reportedGradient)" className="trend-area-anim" />
          <path d={resolvedArea} fill="url(#resolvedGradient)" className="trend-area-anim" />

          {/* Lines */}
          <path
            d={reportedLine}
            fill="none"
            stroke="#188038"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="trend-line-anim"
          />
          <path
            d={resolvedLine}
            fill="none"
            stroke="#F9AB00"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="trend-line-anim"
          />

          {/* X Axis Labels & Interactive columns */}
          {safeData.map((d, i) => {
            const x = getX(i);
            const dateStr = d.date ? d.date.slice(5) : '';
            const isHovered = hoverIndex === i;

            return (
              <g key={`col-${d.date || i}`}>
                {/* Vertical hover guide */}
                {isHovered && (
                  <line
                    x1={x}
                    y1={padTop}
                    x2={x}
                    y2={baseY}
                    stroke="#DADCE0"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                )}

                {/* X label */}
                <text
                  x={x}
                  y={baseY + 16}
                  textAnchor="middle"
                  fontSize="9.5"
                  fill={isHovered ? '#202124' : '#5F6368'}
                  fontWeight={isHovered ? '600' : 'normal'}
                >
                  {dateStr}
                </text>

                {/* Dots */}
                <circle
                  cx={x}
                  cy={getY(d.reported)}
                  r={isHovered ? 5 : 3.5}
                  fill="#FFFFFF"
                  stroke="#188038"
                  strokeWidth="2"
                  className="transition-all duration-150"
                />
                <circle
                  cx={x}
                  cy={getY(d.resolved)}
                  r={isHovered ? 5 : 3.5}
                  fill="#FFFFFF"
                  stroke="#F9AB00"
                  strokeWidth="2"
                  className="transition-all duration-150"
                />

                {/* Touch/hover area */}
                <rect
                  x={x - chartW / (safeData.length * 2)}
                  y={padTop}
                  width={chartW / safeData.length}
                  height={chartH + padBottom}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoverIndex(i)}
                  onMouseLeave={() => setHoverIndex(null)}
                  onTouchStart={() => setHoverIndex(i)}
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {activePoint && hoverIndex !== null && (
          <div
            className="absolute top-2 pointer-events-none bg-[#202124] text-white text-[11px] px-2.5 py-1.5 rounded-md shadow-md z-10 transition-transform duration-75"
            style={{
              left: `${Math.min(
                80,
                Math.max(5, (getX(hoverIndex) / svgWidth) * 100)
              )}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="font-semibold border-b border-gray-600 pb-0.5 mb-1 text-gray-200">
              {activePoint.date}
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#188038]"></span>
              <span>{t('chartReported')}: {activePoint.reported}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-[#F9AB00]"></span>
              <span>{t('chartResolved')}: {activePoint.resolved}</span>
            </div>
          </div>
        )}
      </div>

      {/* Screen Reader Accessible Data Table */}
      <table className="sr-only">
        <caption>{title || t('reportedVsResolved')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('chartDate')}</th>
            <th scope="col">{t('chartReported')}</th>
            <th scope="col">{t('chartResolved')}</th>
          </tr>
        </thead>
        <tbody>
          {safeData.map((d, i) => (
            <tr key={`sr-row-${d.date || i}`}>
              <td>{d.date}</td>
              <td>{d.reported}</td>
              <td>{d.resolved}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TrendLineChart;
