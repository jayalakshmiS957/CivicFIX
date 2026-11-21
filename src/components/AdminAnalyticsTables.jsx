import React from 'react';
import { Building, TrendingUp, AlertTriangle } from 'lucide-react';

export default function AdminAnalyticsTables({
  departmentAnalytics = [],
  localityAnalytics = [],
  overdueIssues = [],
}) {
  return (
    <div className="space-y-8 animate-in fade-in">
      {/* 1. Overdue SLA Alerts Banner */}
      {overdueIssues.length > 0 && (
        <div className="p-4 rounded-card bg-[#FCE8E6] border border-[#D93025]/30 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#D93025] uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-[#D93025]" />
            <span>Overdue SLA Escalation Alerts ({overdueIssues.length} Complaints)</span>
          </div>
          <p className="text-xs text-[#5F6368]">
            The following issues have exceeded municipal SLA targets (Critical: 24h, High: 72h, Medium: 7d) without resolution:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {overdueIssues.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-lg bg-white border border-[#D93025]/20 text-xs flex items-center justify-between"
              >
                <div>
                  <div className="font-mono-numbers font-medium text-[#D93025]">{item.id}</div>
                  <div className="text-[11px] text-[#5F6368] truncate max-w-[170px]">{item.title}</div>
                </div>
                <div className="text-right">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#FCE8E6] text-[#D93025]">
                    +{item.slaStatus?.overdueHours}h Overdue
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Department Accountability Table */}
      <div className="bg-white rounded-card border border-[#DADCE0] shadow-card overflow-hidden">
        <div className="p-4 border-b border-[#DADCE0] bg-[#F8F9FA] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-[#188038]" />
            <h3 className="text-sm font-medium font-heading text-[#202124]">
              Department Accountability & SLA Matrix
            </h3>
          </div>
          <span className="text-xs text-[#5F6368] font-mono-numbers">
            {departmentAnalytics.length} Departments Tracked
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" aria-label="Department Accountability Table">
            <thead className="bg-[#F8F9FA] text-[#5F6368] font-medium border-b border-[#DADCE0]">
              <tr>
                <th scope="col" className="py-3 px-4">Municipal Department</th>
                <th scope="col" className="py-3 px-4 text-center">Assigned</th>
                <th scope="col" className="py-3 px-4 text-center">Pending</th>
                <th scope="col" className="py-3 px-4 text-center">Avg Acknowledge</th>
                <th scope="col" className="py-3 px-4 text-center">Avg Resolution</th>
                <th scope="col" className="py-3 px-4 text-center">Reopened Count</th>
                <th scope="col" className="py-3 px-4 text-right">SLA Compliance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DADCE0]">
              {departmentAnalytics.map((dept) => (
                <tr key={dept.department} className="hover:bg-[#F8F9FA] transition-colors">
                  <td className="py-3 px-4 font-medium text-[#202124]">
                    {dept.department}
                  </td>
                  <td className="py-3 px-4 text-center font-mono-numbers text-[#202124]">
                    {dept.totalAssigned}
                  </td>
                  <td className="py-3 px-4 text-center font-mono-numbers text-[#B06000] font-medium">
                    {dept.pending}
                  </td>
                  <td className="py-3 px-4 text-center font-mono-numbers text-[#5F6368]">
                    {dept.avgAckHours}h
                  </td>
                  <td className="py-3 px-4 text-center font-mono-numbers text-[#5F6368]">
                    {dept.avgResolveHours}h
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`font-mono-numbers px-2 py-0.5 rounded text-xs font-medium ${
                        dept.reopenedCount > 0
                          ? 'bg-[#FCE8E6] text-[#D93025]'
                          : 'bg-[#F1F3F4] text-[#5F6368]'
                      }`}
                    >
                      {dept.reopenedCount}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-mono-numbers font-medium text-[#1E8E3E]">
                      {dept.slaComplianceRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Ward / Locality Comparison Table */}
      <div className="bg-white rounded-card border border-[#DADCE0] shadow-card overflow-hidden">
        <div className="p-4 border-b border-[#DADCE0] bg-[#F8F9FA] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#188038]" />
            <h3 className="text-sm font-medium font-heading text-[#202124]">
              Ward & Locality Comparative Registry
            </h3>
          </div>
          <span className="text-xs text-[#5F6368] font-mono-numbers">
            {localityAnalytics.length} Localities
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" aria-label="Ward Comparison Table">
            <thead className="bg-[#F8F9FA] text-[#5F6368] font-medium border-b border-[#DADCE0]">
              <tr>
                <th scope="col" className="py-3 px-4">Locality / Ward</th>
                <th scope="col" className="py-3 px-4 text-center">Total Complaints</th>
                <th scope="col" className="py-3 px-4 text-center">Active Pending</th>
                <th scope="col" className="py-3 px-4 text-center">Resolved</th>
                <th scope="col" className="py-3 px-4 text-right">Avg Resolution Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DADCE0]">
              {localityAnalytics.map((loc) => (
                <tr key={loc.locality} className="hover:bg-[#F8F9FA] transition-colors">
                  <td className="py-3 px-4 font-medium text-[#202124]">
                    {loc.locality}
                  </td>
                  <td className="py-3 px-4 text-center font-mono-numbers text-[#202124]">
                    {loc.total}
                  </td>
                  <td className="py-3 px-4 text-center font-mono-numbers font-medium text-[#B06000]">
                    {loc.pending}
                  </td>
                  <td className="py-3 px-4 text-center font-mono-numbers font-medium text-[#1E8E3E]">
                    {loc.resolved}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-numbers text-[#5F6368]">
                    {loc.avgResolveHours}h
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
