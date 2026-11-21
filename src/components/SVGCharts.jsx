import React from 'react';

/**
 * Accessible SVG Donut Chart for Civic Issue Status Breakdown
 */
export function StatusDonutChart({ stats, onSelectStatus, selectedStatus }) {
  const reported = stats?.reported || 0;
  const inProgress = (stats?.inProgress || 0) + (stats?.pendingReview || 0);
  const resolved = stats?.resolved || 0;
  const total = stats?.total || (reported + inProgress + resolved) || 1;

  const radius = 60;
  const circumference = 2 * Math.PI * radius;

  const pctReported = reported / total;
  const pctInProgress = inProgress / total;
  const pctResolved = resolved / total;

  const strokeReported = `${pctReported * circumference} ${circumference}`;
  const strokeInProgress = `${pctInProgress * circumference} ${circumference}`;
  const strokeResolved = `${pctResolved * circumference} ${circumference}`;

  const offsetReported = 0;
  const offsetInProgress = -(pctReported * circumference);
  const offsetResolved = -((pctReported + pctInProgress) * circumference);

  const pctReportedDisplay = Math.round(pctReported * 100 || 0);
  const pctInProgressDisplay = Math.round(pctInProgress * 100 || 0);
  const pctResolvedDisplay = Math.round(pctResolved * 100 || 0);

  const handleSelect = (status) => {
    if (onSelectStatus) {
      onSelectStatus(selectedStatus === status ? 'All' : status);
    }
  };

  return (
    <div className="bg-white rounded-card p-5 border border-[#DADCE0] shadow-card flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-medium font-heading text-[#202124]">
          Resolution Pipeline
        </h3>
        <span className="text-[11px] text-[#5F6368]">Click segment to filter</span>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
        <div className="relative w-40 h-40 shrink-0">
          <svg
            viewBox="0 0 160 160"
            className="w-full h-full transform -rotate-90"
            role="img"
            aria-label={`Donut chart: ${resolved} resolved, ${inProgress} in progress, ${reported} reported`}
          >
            {/* Background ring */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="transparent"
              stroke="#F1F3F4"
              strokeWidth="20"
            />
            {/* Resolved - Green */}
            {resolved > 0 && (
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="transparent"
                stroke="#1E8E3E"
                strokeWidth={selectedStatus === 'Resolved' ? '24' : '20'}
                strokeDasharray={strokeResolved}
                strokeDashoffset={offsetResolved}
                onClick={() => handleSelect('Resolved')}
                className="cursor-pointer transition-all duration-300 hover:opacity-80 focus:outline-none"
                tabIndex={0}
                role="button"
                aria-label={`Filter by Resolved: ${resolved} issues (${pctResolvedDisplay}%)`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelect('Resolved');
                  }
                }}
              >
                <title>{`Resolved: ${resolved} issues (${pctResolvedDisplay}%)`}</title>
              </circle>
            )}
            {/* In Progress - Amber */}
            {inProgress > 0 && (
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="transparent"
                stroke="#F9AB00"
                strokeWidth={selectedStatus === 'In Progress' ? '24' : '20'}
                strokeDasharray={strokeInProgress}
                strokeDashoffset={offsetInProgress}
                onClick={() => handleSelect('In Progress')}
                className="cursor-pointer transition-all duration-300 hover:opacity-80 focus:outline-none"
                tabIndex={0}
                role="button"
                aria-label={`Filter by In Progress: ${inProgress} issues (${pctInProgressDisplay}%)`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelect('In Progress');
                  }
                }}
              >
                <title>{`In Progress: ${inProgress} issues (${pctInProgressDisplay}%)`}</title>
              </circle>
            )}
            {/* Reported - Gray */}
            {reported > 0 && (
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="transparent"
                stroke="#5F6368"
                strokeWidth={selectedStatus === 'Reported' ? '24' : '20'}
                strokeDasharray={strokeReported}
                strokeDashoffset={offsetReported}
                onClick={() => handleSelect('Reported')}
                className="cursor-pointer transition-all duration-300 hover:opacity-80 focus:outline-none"
                tabIndex={0}
                role="button"
                aria-label={`Filter by Reported: ${reported} issues (${pctReportedDisplay}%)`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelect('Reported');
                  }
                }}
              >
                <title>{`Reported: ${reported} issues (${pctReportedDisplay}%)`}</title>
              </circle>
            )}
          </svg>
          <button
            type="button"
            onClick={() => handleSelect('All')}
            className="absolute inset-0 flex flex-col items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-[#188038]"
            title="Reset status filter to All"
            aria-label={`Total issues: ${stats?.total || 0}. Click to show all.`}
          >
            <span className="text-2xl font-medium font-mono-numbers text-[#202124]">
              {stats?.total || 0}
            </span>
            <span className="text-[11px] font-medium text-[#5F6368] uppercase tracking-wide">
              Total Issues
            </span>
          </button>
        </div>

        {/* Legend Rows */}
        <div className="space-y-2 text-xs w-full sm:w-auto">
          {/* Resolved Legend */}
          <button
            type="button"
            onClick={() => handleSelect('Resolved')}
            aria-pressed={selectedStatus === 'Resolved'}
            title={`Resolved: ${resolved} (${pctResolvedDisplay}%)`}
            className={`w-full flex items-center justify-between sm:justify-start gap-3 p-2 rounded-lg border transition-all text-left focus:outline-none focus:ring-2 focus:ring-[#188038] ${
              selectedStatus === 'Resolved'
                ? 'bg-[#E6F4EA] border-[#1E8E3E] ring-1 ring-[#1E8E3E]'
                : 'border-transparent hover:bg-[#F8F9FA]'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#1E8E3E] shrink-0" />
              <span className="text-[#202124] font-medium">Resolved</span>
            </div>
            <span className="font-mono-numbers font-medium text-[#202124]">
              {resolved} <span className="text-[#5F6368]">({pctResolvedDisplay}%)</span>
            </span>
          </button>

          {/* In Progress Legend */}
          <button
            type="button"
            onClick={() => handleSelect('In Progress')}
            aria-pressed={selectedStatus === 'In Progress'}
            title={`In Progress: ${inProgress} (${pctInProgressDisplay}%) - includes Pending Review`}
            className={`w-full flex items-center justify-between sm:justify-start gap-3 p-2 rounded-lg border transition-all text-left focus:outline-none focus:ring-2 focus:ring-[#188038] ${
              selectedStatus === 'In Progress'
                ? 'bg-[#FEF7E0] border-[#F9AB00] ring-1 ring-[#F9AB00]'
                : 'border-transparent hover:bg-[#F8F9FA]'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#F9AB00] shrink-0" />
              <span className="text-[#202124] font-medium">In Progress</span>
            </div>
            <span className="font-mono-numbers font-medium text-[#202124]">
              {inProgress} <span className="text-[#5F6368]">({pctInProgressDisplay}%)</span>
            </span>
          </button>

          {/* Reported Legend */}
          <button
            type="button"
            onClick={() => handleSelect('Reported')}
            aria-pressed={selectedStatus === 'Reported'}
            title={`Reported: ${reported} (${pctReportedDisplay}%) - includes Reopened`}
            className={`w-full flex items-center justify-between sm:justify-start gap-3 p-2 rounded-lg border transition-all text-left focus:outline-none focus:ring-2 focus:ring-[#188038] ${
              selectedStatus === 'Reported'
                ? 'bg-[#F1F3F4] border-[#5F6368] ring-1 ring-[#5F6368]'
                : 'border-transparent hover:bg-[#F8F9FA]'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#5F6368] shrink-0" />
              <span className="text-[#202124] font-medium">Reported</span>
            </div>
            <span className="font-mono-numbers font-medium text-[#202124]">
              {reported} <span className="text-[#5F6368]">({pctReportedDisplay}%)</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Category Breakdown Horizontal Bar Chart
 */
export function CategoryBarChart({
  byCategory = {},
  total = 1,
  onSelectCategory,
  selectedCategory,
}) {
  const categories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const maxVal = Math.max(...categories.map((c) => c[1]), 1);

  const handleSelect = (category) => {
    if (onSelectCategory) {
      onSelectCategory(selectedCategory === category ? 'All' : category);
    }
  };

  return (
    <div className="bg-white rounded-card p-5 border border-[#DADCE0] shadow-card flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-medium font-heading text-[#202124]">
          Issues by Category
        </h3>
        <span className="text-[11px] text-[#5F6368]">Click bar to filter</span>
      </div>

      <div className="space-y-2">
        {categories.map(([category, count]) => {
          const percentage = Math.round((count / (total || 1)) * 100);
          const barWidth = Math.round((count / maxVal) * 100);
          const isSelected = selectedCategory === category;

          return (
            <button
              key={category}
              type="button"
              onClick={() => handleSelect(category)}
              aria-pressed={isSelected}
              title={`${category}: ${count} issues (${percentage}%)`}
              className={`w-full text-left p-1.5 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#188038] group ${
                isSelected
                  ? 'bg-[#E6F4EA] border border-[#188038]/40 ring-1 ring-[#188038]'
                  : 'hover:bg-[#F8F9FA] border border-transparent'
              }`}
            >
              <div className="flex justify-between text-xs mb-1">
                <span
                  className={`font-medium truncate max-w-[200px] ${
                    isSelected ? 'text-[#188038] font-semibold' : 'text-[#202124]'
                  }`}
                >
                  {category}
                </span>
                <span className="font-mono-numbers text-[#5F6368] group-hover:text-[#202124]">
                  {count} <span className="text-[10px]">({percentage}%)</span>
                </span>
              </div>
              <div className="w-full bg-[#F1F3F4] rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    isSelected ? 'bg-[#137333]' : 'bg-[#188038] group-hover:bg-[#137333]'
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Priority Distribution Segmented Bar
 */
export function PriorityBarChart({
  byPriority = {},
  total = 1,
  onSelectPriority,
  selectedPriority,
}) {
  const crit = byPriority.Critical || 0;
  const high = byPriority.High || 0;
  const med = byPriority.Medium || 0;
  const low = byPriority.Low || 0;

  const pctCrit = (crit / (total || 1)) * 100;
  const pctHigh = (high / (total || 1)) * 100;
  const pctMed = (med / (total || 1)) * 100;
  const pctLow = (low / (total || 1)) * 100;

  const handleSelect = (priority) => {
    if (onSelectPriority) {
      onSelectPriority(selectedPriority === priority ? 'All' : priority);
    }
  };

  return (
    <div className="bg-white rounded-card p-5 border border-[#DADCE0] shadow-card flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-medium font-heading text-[#202124]">
            Priority Classification
          </h3>
          <span className="text-[11px] text-[#5F6368]">Click to filter</span>
        </div>
        <p className="text-xs text-[#5F6368] mb-4">
          AI urgency triage score distribution across active reports.
        </p>
      </div>

      {/* Segmented bar with clickable slices */}
      <div className="w-full h-5 rounded-full flex overflow-hidden bg-[#F1F3F4] shadow-inner p-0.5 gap-0.5">
        {crit > 0 && (
          <button
            type="button"
            onClick={() => handleSelect('Critical')}
            style={{ width: `${pctCrit}%` }}
            className={`h-full rounded-l-full bg-[#D93025] hover:opacity-90 transition-all focus:outline-none focus:ring-2 focus:ring-[#D93025] ${
              selectedPriority === 'Critical' ? 'ring-2 ring-white scale-y-110 shadow-sm' : ''
            }`}
            title={`Critical: ${crit} (${Math.round(pctCrit)}%)`}
            aria-label={`Filter by Critical: ${crit} issues`}
          />
        )}
        {high > 0 && (
          <button
            type="button"
            onClick={() => handleSelect('High')}
            style={{ width: `${pctHigh}%` }}
            className={`h-full bg-[#E8710A] hover:opacity-90 transition-all focus:outline-none focus:ring-2 focus:ring-[#E8710A] ${
              selectedPriority === 'High' ? 'ring-2 ring-white scale-y-110 shadow-sm' : ''
            }`}
            title={`High: ${high} (${Math.round(pctHigh)}%)`}
            aria-label={`Filter by High: ${high} issues`}
          />
        )}
        {med > 0 && (
          <button
            type="button"
            onClick={() => handleSelect('Medium')}
            style={{ width: `${pctMed}%` }}
            className={`h-full bg-[#F9AB00] hover:opacity-90 transition-all focus:outline-none focus:ring-2 focus:ring-[#F9AB00] ${
              selectedPriority === 'Medium' ? 'ring-2 ring-white scale-y-110 shadow-sm' : ''
            }`}
            title={`Medium: ${med} (${Math.round(pctMed)}%)`}
            aria-label={`Filter by Medium: ${med} issues`}
          />
        )}
        {low > 0 && (
          <button
            type="button"
            onClick={() => handleSelect('Low')}
            style={{ width: `${pctLow}%` }}
            className={`h-full rounded-r-full bg-[#1E8E3E] hover:opacity-90 transition-all focus:outline-none focus:ring-2 focus:ring-[#1E8E3E] ${
              selectedPriority === 'Low' ? 'ring-2 ring-white scale-y-110 shadow-sm' : ''
            }`}
            title={`Low: ${low} (${Math.round(pctLow)}%)`}
            aria-label={`Filter by Low: ${low} issues`}
          />
        )}
      </div>

      {/* Metric legend boxes (keyboard accessible buttons with hover lift) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 text-xs">
        {/* Critical */}
        <button
          type="button"
          onClick={() => handleSelect('Critical')}
          aria-pressed={selectedPriority === 'Critical'}
          title={`Critical Priority: ${crit} issues (${Math.round(pctCrit)}%)`}
          className={`p-2.5 rounded-lg border text-left transition-all hover:-translate-y-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#D93025] ${
            selectedPriority === 'Critical'
              ? 'bg-[#FCE8E6] border-[#D93025] ring-2 ring-[#D93025] shadow-sm font-semibold'
              : 'bg-[#FCE8E6]/60 border-[#D93025]/20 hover:bg-[#FCE8E6]'
          }`}
        >
          <div className="text-[#D93025] font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#D93025]" />
            Critical
          </div>
          <div className="text-lg font-mono-numbers font-medium text-[#202124] mt-0.5">
            {crit}
          </div>
        </button>

        {/* High */}
        <button
          type="button"
          onClick={() => handleSelect('High')}
          aria-pressed={selectedPriority === 'High'}
          title={`High Priority: ${high} issues (${Math.round(pctHigh)}%)`}
          className={`p-2.5 rounded-lg border text-left transition-all hover:-translate-y-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#E8710A] ${
            selectedPriority === 'High'
              ? 'bg-[#FEF7E0] border-[#E8710A] ring-2 ring-[#E8710A] shadow-sm font-semibold'
              : 'bg-[#FEF7E0]/60 border-[#E8710A]/20 hover:bg-[#FEF7E0]'
          }`}
        >
          <div className="text-[#E8710A] font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#E8710A]" />
            High
          </div>
          <div className="text-lg font-mono-numbers font-medium text-[#202124] mt-0.5">
            {high}
          </div>
        </button>

        {/* Medium */}
        <button
          type="button"
          onClick={() => handleSelect('Medium')}
          aria-pressed={selectedPriority === 'Medium'}
          title={`Medium Priority: ${med} issues (${Math.round(pctMed)}%)`}
          className={`p-2.5 rounded-lg border text-left transition-all hover:-translate-y-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#F9AB00] ${
            selectedPriority === 'Medium'
              ? 'bg-[#FEF7E0] border-[#F9AB00] ring-2 ring-[#F9AB00] shadow-sm font-semibold'
              : 'bg-[#FEF7E0]/40 border-[#F9AB00]/30 hover:bg-[#FEF7E0]'
          }`}
        >
          <div className="text-[#B06000] font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#F9AB00]" />
            Medium
          </div>
          <div className="text-lg font-mono-numbers font-medium text-[#202124] mt-0.5">
            {med}
          </div>
        </button>

        {/* Low */}
        <button
          type="button"
          onClick={() => handleSelect('Low')}
          aria-pressed={selectedPriority === 'Low'}
          title={`Low Priority: ${low} issues (${Math.round(pctLow)}%)`}
          className={`p-2.5 rounded-lg border text-left transition-all hover:-translate-y-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1E8E3E] ${
            selectedPriority === 'Low'
              ? 'bg-[#E6F4EA] border-[#1E8E3E] ring-2 ring-[#1E8E3E] shadow-sm font-semibold'
              : 'bg-[#E6F4EA]/60 border-[#1E8E3E]/20 hover:bg-[#E6F4EA]'
          }`}
        >
          <div className="text-[#1E8E3E] font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#1E8E3E]" />
            Low
          </div>
          <div className="text-lg font-mono-numbers font-medium text-[#202124] mt-0.5">
            {low}
          </div>
        </button>
      </div>
    </div>
  );
}
