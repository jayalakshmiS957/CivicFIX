import React, { useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage.jsx';

/**
 * StackedBarChart
 * Visualizes department workload (Open, In Progress, Resolved) as horizontal stacked bars.
 */
export function StackedBarChart({
  departments = [],
  selectedLocation = 'All Coimbatore',
  title,
  loading = false,
  onSegmentClick,
  className = '',
}) {
  const { t } = useLanguage();
  const [hoveredSegment, setHoveredSegment] = useState(null);

  if (loading) {
    return (
      <div
        className={`bg-white border border-[#DADCE0] rounded-xl p-5 shadow-xs animate-pulse ${className}`}
        aria-label={t('chartLoading')}
      >
        <div className="h-4 w-48 bg-[#E8EAED] rounded-sm mb-4"></div>
        <div className="space-y-3">
          <div className="h-6 bg-[#F1F3F4] rounded-sm"></div>
          <div className="h-6 bg-[#F1F3F4] rounded-sm"></div>
          <div className="h-6 bg-[#F1F3F4] rounded-sm"></div>
        </div>
      </div>
    );
  }

  const items = (Array.isArray(departments) ? departments : []).map((d) => {
    const w = d.workload || {};
    const open = Number(w.open ?? d.open ?? 0);
    const inProgress = Number(w.inProgress ?? d.inProgress ?? 0);
    const resolved = Number(w.resolved ?? d.resolved ?? 0);
    const total = open + inProgress + resolved;

    return {
      id: d.id || d.name,
      name: d.shortName || d.name || 'Department',
      fullName: d.name || d.shortName || 'Department',
      open,
      inProgress,
      resolved,
      total,
    };
  });

  const maxTotal = Math.max(1, ...items.map((i) => i.total));

  if (items.length === 0) {
    return (
      <div
        className={`bg-white border border-[#DADCE0] rounded-xl p-6 text-center shadow-xs ${className}`}
      >
        <h4 className="text-sm font-semibold text-[#202124] mb-1">
          {title || t('departmentWorkload')}
        </h4>
        <p className="text-xs text-[#5F6368] py-6">{t('chartEmpty')}</p>
      </div>
    );
  }

  const handleSegmentClick = (item, status) => {
    if (typeof onSegmentClick === 'function') {
      onSegmentClick({ department: item, status });
      return;
    }
    // Navigate to admin complaints queue filtered by department and status
    const targetStatus = status === 'Open' ? 'Reported' : status;
    const url = `/admin?status=${encodeURIComponent(targetStatus)}#complaints-queue`;
    window.location.href = url;
  };

  return (
    <div
      className={`bg-white border border-[#DADCE0] rounded-xl p-4 sm:p-5 shadow-xs overflow-hidden ${className}`}
      role="region"
      aria-label={title || t('departmentWorkload')}
    >
      <style>{`
        @keyframes drawBarWidth {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        .stacked-bar-fill {
          transform-origin: left;
          animation: drawBarWidth 500ms cubic-bezier(0.2, 0, 0, 1) forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .stacked-bar-fill {
            animation: none;
            transform: none;
          }
        }
      `}</style>

      {/* Header and Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[#202124]">
            {title || t('departmentWorkload')}
          </h3>
          <p className="text-xs text-[#5F6368] mt-0.5">
            {selectedLocation ? `${selectedLocation} · ` : ''}
            {t('workloadDistribution', 'Workload status per division')}
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs font-medium text-[#3C4043]" aria-hidden="true">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F9AB00] inline-block"></span>
            <span>{t('chartOpen', 'Open')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#81C995] inline-block"></span>
            <span>{t('statusInProgress')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#188038] inline-block"></span>
            <span>{t('statusResolved')}</span>
          </div>
        </div>
      </div>

      {/* Department Stacked Bars */}
      <div className="space-y-3.5">
        {items.map((item) => {
          const openPct = item.total > 0 ? (item.open / item.total) * 100 : 0;
          const inProgressPct = item.total > 0 ? (item.inProgress / item.total) * 100 : 0;
          const resolvedPct = item.total > 0 ? (item.resolved / item.total) * 100 : 0;

          return (
            <div key={item.id} className="space-y-1">
              {/* Row Label */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[#202124] truncate max-w-[200px] sm:max-w-xs" title={item.fullName}>
                  {item.name}
                </span>
                <span className="text-[11px] font-mono text-[#5F6368]">
                  {item.total} {t('issues', 'issues')}
                </span>
              </div>

              {/* Progress Bar Container */}
              <div
                className="w-full h-4 bg-[#F1F3F4] rounded-full overflow-hidden flex relative"
                role="progressbar"
                aria-valuenow={item.resolved}
                aria-valuemin={0}
                aria-valuemax={item.total}
                aria-label={`${item.name} workload`}
              >
                {item.total === 0 ? (
                  <div className="w-full h-full bg-[#F1F3F4] text-[10px] text-[#9AA0A6] flex items-center justify-center italic">
                    0 issues
                  </div>
                ) : (
                  <>
                    {/* Open segment */}
                    {item.open > 0 && (
                      <button
                        type="button"
                        onClick={() => handleSegmentClick(item, 'Open')}
                        onMouseEnter={() => setHoveredSegment(`${item.id}-open`)}
                        onMouseLeave={() => setHoveredSegment(null)}
                        style={{ width: `${openPct}%` }}
                        className="h-full bg-[#F9AB00] hover:brightness-110 transition-all stacked-bar-fill relative group cursor-pointer"
                        title={`${item.name} - Open: ${item.open}`}
                        aria-label={`${item.name}: ${item.open} open`}
                      />
                    )}

                    {/* In Progress segment */}
                    {item.inProgress > 0 && (
                      <button
                        type="button"
                        onClick={() => handleSegmentClick(item, 'In Progress')}
                        onMouseEnter={() => setHoveredSegment(`${item.id}-inp`)}
                        onMouseLeave={() => setHoveredSegment(null)}
                        style={{ width: `${inProgressPct}%` }}
                        className="h-full bg-[#81C995] hover:brightness-110 transition-all stacked-bar-fill relative group cursor-pointer"
                        title={`${item.name} - In Progress: ${item.inProgress}`}
                        aria-label={`${item.name}: ${item.inProgress} in progress`}
                      />
                    )}

                    {/* Resolved segment */}
                    {item.resolved > 0 && (
                      <button
                        type="button"
                        onClick={() => handleSegmentClick(item, 'Resolved')}
                        onMouseEnter={() => setHoveredSegment(`${item.id}-res`)}
                        onMouseLeave={() => setHoveredSegment(null)}
                        style={{ width: `${resolvedPct}%` }}
                        className="h-full bg-[#188038] hover:brightness-110 transition-all stacked-bar-fill relative group cursor-pointer"
                        title={`${item.name} - Resolved: ${item.resolved}`}
                        aria-label={`${item.name}: ${item.resolved} resolved`}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Screen Reader Table */}
      <table className="sr-only">
        <caption>{title || t('departmentWorkload')}</caption>
        <thead>
          <tr>
            <th scope="col">Department</th>
            <th scope="col">Open</th>
            <th scope="col">In Progress</th>
            <th scope="col">Resolved</th>
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={`sr-${i.id}`}>
              <th scope="row">{i.fullName}</th>
              <td>{i.open}</td>
              <td>{i.inProgress}</td>
              <td>{i.resolved}</td>
              <td>{i.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default StackedBarChart;
