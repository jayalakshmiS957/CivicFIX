import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { issuesApi } from '../lib/api.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { formatDate } from '../lib/utils.js';
import PriorityBadge from '../components/PriorityBadge.jsx';
import StatusChip from '../components/StatusChip.jsx';
import { ChartBoundary, StatusStepper } from '../components/charts/index.js';
import {
  FolderOpen,
  PlusCircle,
  Clock,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Building,
} from 'lucide-react';

export default function MyComplaintsPage() {
  const { user, isAdmin } = useAuth();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    async function loadUserIssues() {
      if (!user) return;
      try {
        setLoading(true);
        const res = await issuesApi.getAll({ reporterId: user.id });
        if (res.issues) {
          setIssues(res.issues);
        }
      } catch (err) {
        console.warn('Failed to fetch user issues:', err);
      } finally {
        setLoading(false);
      }
    }
    loadUserIssues();
  }, [user]);

  const filtered = issues.filter((i) => {
    if (statusFilter === 'All') return true;
    return i.status.toLowerCase() === statusFilter.toLowerCase();
  });

  const resolvedCount = issues.filter((i) => i.status === 'Resolved').length;
  const inProgressCount = issues.filter((i) => i.status === 'In Progress').length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium font-heading text-[#202124]">
            My Civic Complaints
          </h1>
          <p className="text-xs text-[#5F6368] mt-1">
            Track real-time resolution progress and department updates for your submissions.
          </p>
        </div>

        {!isAdmin && (
          <Link
            to="/report"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-control text-sm font-medium text-white bg-[#188038] hover:bg-[#137333] shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Report New Issue</span>
          </Link>
        )}
      </div>

      {/* Citizen Personal Impact Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-card bg-white border border-[#DADCE0] shadow-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#E6F4EA] text-[#188038] flex items-center justify-center font-medium">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-medium font-mono-numbers text-[#202124]">
              {issues.length}
            </div>
            <div className="text-xs text-[#5F6368]">Total Submitted</div>
          </div>
        </div>

        <div className="p-4 rounded-card bg-white border border-[#DADCE0] shadow-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#FEF7E0] text-[#B06000] flex items-center justify-center font-medium">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-medium font-mono-numbers text-[#202124]">
              {inProgressCount}
            </div>
            <div className="text-xs text-[#5F6368]">Under Action</div>
          </div>
        </div>

        <div className="p-4 rounded-card bg-white border border-[#DADCE0] shadow-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#E6F4EA] text-[#1E8E3E] flex items-center justify-center font-medium">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-medium font-mono-numbers text-[#202124]">
              {resolvedCount}
            </div>
            <div className="text-xs text-[#5F6368]">Verified Resolved</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#DADCE0] pb-2 text-xs font-medium">
        {['All', 'Reported', 'In Progress', 'Resolved'].map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-3 py-1.5 rounded-control transition-colors ${
              statusFilter === tab
                ? 'bg-[#E6F4EA] text-[#188038]'
                : 'text-[#5F6368] hover:bg-[#F8F9FA]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Issue List Cards */}
      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="w-8 h-8 text-[#188038] animate-spin mx-auto mb-2" />
          <p className="text-xs text-[#5F6368]">Loading your complaints...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-card p-12 text-center border border-[#DADCE0] space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#F1F3F4] text-[#5F6368] flex items-center justify-center mx-auto">
            <FolderOpen className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-medium font-heading text-[#202124]">
            No complaints found
          </h2>
          <p className="text-xs text-[#5F6368] max-w-sm mx-auto">
            You haven't reported any civic issues matching "{statusFilter}". Notice an issue in your street? Submit a quick report today.
          </p>
          {!isAdmin && (
            <Link
              to="/report"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-control text-xs font-medium text-white bg-[#188038] hover:bg-[#137333]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Report an Issue</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-card p-5 border border-[#DADCE0] shadow-card hover:border-[#188038] transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono-numbers font-medium text-xs text-[#188038]">
                    {item.id}
                  </span>
                  <div className="flex items-center gap-2">
                    <PriorityBadge priority={item.priority} size="sm" />
                    <StatusChip status={item.status} size="sm" />
                  </div>
                </div>

                <h3 className="text-base font-medium text-[#202124] line-clamp-1">
                  {item.title}
                </h3>

                <p className="text-xs text-[#5F6368] line-clamp-2 leading-relaxed">
                  {item.description}
                </p>

                <div className="flex items-center gap-2 text-[11px] text-[#5F6368]">
                  <Building className="w-3.5 h-3.5 text-[#5F6368] shrink-0" />
                  <span className="truncate">{item.department}</span>
                </div>

                {item.status === 'In Progress' && (
                  <div className="text-[11px] text-[#188038] font-medium flex items-center gap-1">
                    <span>Handled by {item.handledBy?.crew || 'Municipal Repair Crew'} · {item.location?.locality || 'Coimbatore'}</span>
                  </div>
                )}

                <ChartBoundary>
                  <StatusStepper status={item.status} />
                </ChartBoundary>
              </div>

              <div className="mt-4 pt-3 border-t border-[#DADCE0] flex items-center justify-between text-[11px]">
                <span className="font-mono-numbers text-[#5F6368]">
                  {formatDate(item.createdAt)}
                </span>
                <Link
                  to={`/issue/${item.id}`}
                  className="font-medium text-[#188038] hover:underline flex items-center gap-1"
                >
                  <span>Track Status</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
