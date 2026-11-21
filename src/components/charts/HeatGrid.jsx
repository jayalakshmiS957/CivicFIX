import React from 'react';
import { useLanguage } from '../../hooks/useLanguage.jsx';

/**
 * HeatGrid
 * Matrix grid showing issue intensity by Locality and Priority.
 * Rows: Gandhipuram, RS Puram, Peelamedu, Other areas
 * Columns: Critical, High, Medium, Low
 * Intensity determined by count.
 * Cells link to /admin?location=...&priority=... or invoke onCellClick.
 */
export function HeatGrid({
  data = [],
  loading = false,
  title,
  onCellClick,
  className = '',
}) {
  const { t } = useLanguage();

  const LOCALITIES = ['Gandhipuram', 'RS Puram', 'Peelamedu', 'Other areas'];
  const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

  if (loading) {
    return (
      <div
        className={`bg-white border border-[#DADCE0] rounded-xl p-5 shadow-xs animate-pulse ${className}`}
        aria-label={t('chartLoading')}
      >
        <div className="h-4 w-48 bg-[#E8EAED] rounded-sm mb-4"></div>
        <div className="h-48 bg-[#F1F3F4] rounded-lg"></div>
      </div>
    );
  }

  // Ensure robust data structure
  const rows = LOCALITIES.map((loc) => {
    const found = Array.isArray(data)
      ? data.find(
          (d) =>
            d.locality &&
            (d.locality.toLowerCase() === loc.toLowerCase() ||
              (loc === 'Other areas' && d.locality.toLowerCase().includes('other')))
        )
      : null;

    return {
      locality: loc,
      Critical: found?.Critical || 0,
      High: found?.High || 0,
      Medium: found?.Medium || 0,
      Low: found?.Low || 0,
    };
  });

  // Calculate maximum count across all cells for intensity scaling
  let maxCount = 0;
  rows.forEach((r) => {
    PRIORITIES.forEach((p) => {
      if (r[p] > maxCount) maxCount = r[p];
    });
  });
  maxCount = Math.max(1, maxCount);

  // Intensity color styling
  const getCellStyle = (count, priority) => {
    if (count === 0) {
      return {
        bg: 'bg-[#F8FAF8]',
        text: 'text-[#9AA0A6]',
        border: 'border-[#F1F3F4]',
        hover: 'hover:bg-[#F1F3F4]',
      };
    }

    if (priority === 'Critical') {
      if (count >= 3) return { bg: 'bg-[#D93025]', text: 'text-white font-bold', border: 'border-[#C5221F]', hover: 'hover:opacity-90' };
      if (count >= 2) return { bg: 'bg-[#F28B82]', text: 'text-[#202124] font-semibold', border: 'border-[#EA4335]', hover: 'hover:opacity-90' };
      return { bg: 'bg-[#FCE8E6]', text: 'text-[#C5221F] font-medium', border: 'border-[#FAD2CF]', hover: 'hover:bg-[#FAD2CF]' };
    }

    if (priority === 'High') {
      if (count >= 3) return { bg: 'bg-[#F9AB00]', text: 'text-[#202124] font-bold', border: 'border-[#E37400]', hover: 'hover:opacity-90' };
      if (count >= 2) return { bg: 'bg-[#FDD663]', text: 'text-[#202124] font-semibold', border: 'border-[#F9AB00]', hover: 'hover:opacity-90' };
      return { bg: 'bg-[#FEF7E0]', text: 'text-[#B06000] font-medium', border: 'border-[#FEEFC3]', hover: 'hover:bg-[#FEEFC3]' };
    }

    // Medium & Low: Google green intensity
    const ratio = count / maxCount;
    if (ratio >= 0.7) {
      return { bg: 'bg-[#188038]', text: 'text-white font-bold', border: 'border-[#137333]', hover: 'hover:opacity-90' };
    }
    if (ratio >= 0.4) {
      return { bg: 'bg-[#81C995]', text: 'text-[#137333] font-semibold', border: 'border-[#5BB974]', hover: 'hover:opacity-90' };
    }
    return { bg: 'bg-[#E6F4EA]', text: 'text-[#137333] font-medium', border: 'border-[#CEEAD6]', hover: 'hover:bg-[#CEEAD6]' };
  };

  const handleCellClick = (locality, priority) => {
    if (typeof onCellClick === 'function') {
      onCellClick({ locality, priority });
      return;
    }
    const targetLoc = locality === 'Other areas' ? 'Other' : locality;
    const url = `/admin?location=${encodeURIComponent(targetLoc)}&priority=${encodeURIComponent(priority)}#complaints-queue`;
    window.location.href = url;
  };

  return (
    <div
      className={`bg-white border border-[#DADCE0] rounded-xl p-4 sm:p-5 shadow-xs overflow-hidden ${className}`}
      role="region"
      aria-label={title || t('issuesByLocalityPriority')}
    >
      <style>{`
        @keyframes scaleInCell {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
        .heat-cell-anim {
          animation: scaleInCell 450ms cubic-bezier(0.2, 0, 0, 1) forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .heat-cell-anim {
            animation: none;
            opacity: 1;
            transform: none;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-[#202124]">
            {title || t('issuesByLocalityPriority')}
          </h3>
          <p className="text-xs text-[#5F6368] mt-0.5">
            {t('heatGridSubtitle', 'Geographical cluster & priority matrix')}
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 text-[11px] text-[#5F6368]" aria-hidden="true">
          <span className="font-medium text-[#202124]">Intensity:</span>
          <span className="px-1.5 py-0.5 rounded-sm bg-[#F8FAF8] border border-[#DADCE0]">0</span>
          <span className="px-1.5 py-0.5 rounded-sm bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]">1-2</span>
          <span className="px-1.5 py-0.5 rounded-sm bg-[#81C995] text-white">3-4</span>
          <span className="px-1.5 py-0.5 rounded-sm bg-[#188038] text-white font-bold">5+</span>
        </div>
      </div>

      {/* Grid Table */}
      <div className="overflow-x-auto -mx-1 sm:mx-0">
        <table className="w-full border-collapse text-xs" role="grid" aria-label={t('issuesByLocalityPriority')}>
          <thead>
            <tr>
              <th scope="col" className="text-left font-medium text-[#5F6368] pb-2 pl-1 pr-2 w-28 sm:w-32">
                {t('chartLocality')}
              </th>
              {PRIORITIES.map((prio) => (
                <th
                  key={prio}
                  scope="col"
                  className="text-center font-medium text-[#5F6368] pb-2 px-1 sm:px-2"
                >
                  <span className="inline-block truncate max-w-[65px] sm:max-w-none">
                    {t(`chart${prio}`) || prio}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={row.locality}>
                <th
                  scope="row"
                  className="text-left font-medium text-[#202124] py-1.5 pl-1 pr-2 truncate max-w-[100px] sm:max-w-none"
                >
                  {row.locality}
                </th>
                {PRIORITIES.map((prio, colIdx) => {
                  const count = row[prio];
                  const style = getCellStyle(count, prio);
                  const delay = (rowIdx * 4 + colIdx) * 20;

                  return (
                    <td key={`${row.locality}-${prio}`} className="p-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleCellClick(row.locality, prio)}
                        className={`w-full py-2 rounded-lg border text-xs transition-all duration-150 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-[#188038] heat-cell-anim ${style.bg} ${style.text} ${style.border} ${style.hover}`}
                        style={{ animationDelay: `${delay}ms` }}
                        aria-label={`${row.locality}, ${prio}: ${count} ${t('issues', 'issues')}. ${t('viewFilteredIssues')}`}
                      >
                        {count}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Screen Reader Accessible Table */}
      <table className="sr-only">
        <caption>{title || t('issuesByLocalityPriority')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('chartLocality')}</th>
            {PRIORITIES.map((p) => (
              <th key={p} scope="col">{p}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`sr-${r.locality}`}>
              <th scope="row">{r.locality}</th>
              {PRIORITIES.map((p) => (
                <td key={`sr-${r.locality}-${p}`}>{r[p]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default HeatGrid;
