import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';
import { issuesApi, adminApi, statsApi } from '../lib/api.js';
import { CATEGORIES, DEPARTMENTS, PRIORITIES, STATUSES } from '../lib/constants.js';
import { formatDate } from '../lib/utils.js';
import PriorityBadge from '../components/PriorityBadge.jsx';
import StatusChip from '../components/StatusChip.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import TrustScoreBadge from '../components/TrustScoreBadge.jsx';
import AdminAnalyticsTables from '../components/AdminAnalyticsTables.jsx';
import { StatusDonutChart, CategoryBarChart, PriorityBarChart } from '../components/SVGCharts.jsx';
import { ChartBoundary, TrendLineChart, HeatGrid, GaugeChart } from '../components/charts/index.js';
import {
  LayoutDashboard,
  Search,
  CheckCircle2,
  Clock,
  AlertOctagon,
  Building,
  Edit,
  Trash2,
  RefreshCw,
  ExternalLink,
  Loader2,
  X,
  Check,
  TrendingUp,
  Sparkles,
  UploadCloud,
  Wrench,
  ShieldAlert,
  Info,
  Filter,
} from 'lucide-react';

export function matchIssueLocation(issue, locFilter) {
  if (!locFilter || locFilter === 'All' || locFilter === 'All Locations') return true;
  const locality = (issue.location?.locality || '').toLowerCase().trim();
  const address = (issue.location?.address || '').toLowerCase();
  const target = locFilter.toLowerCase().trim();

  if (target === 'other' || target === 'other areas') {
    const isStandard = ['gandhipuram', 'rs puram', 'peelamedu'].some(
      (std) => locality.includes(std) || address.includes(std)
    );
    return !isStandard;
  }

  return locality.includes(target) || address.includes(target);
}

export function getSuggestedCrewsAndOfficers(deptName, locality) {
  const dept = (deptName || 'Public Works Department').trim();
  const loc = (locality || 'Gandhipuram').trim();

  const suggestedCrews = [
    `${dept} ${loc} Response Squad`,
    `${dept} ${loc} Rapid Repair Unit`,
    `${dept} ${loc} Field Maintenance Team`,
    `${dept} Zonal Heavy Work Crew`,
  ];

  const suggestedOfficers = [
    { name: `Er. K. Natarajan (Fictional)`, role: `Ward Executive Officer (${loc})` },
    { name: `S. Kavin Kumar (Fictional)`, role: `Assistant Executive Engineer (${loc})` },
    { name: `M. Preethi Varma (Fictional)`, role: `Zonal Technical Inspector (${loc})` },
    { name: `V. Rajesh Kannan (Fictional)`, role: `Field Operations Lead (${loc})` },
  ];

  return { suggestedCrews, suggestedOfficers };
}

export default function AdminDashboardPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [issues, setIssues] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState(null);
  const [loadingTrends, setLoadingTrends] = useState(true);

  // Table filters & sort synced with URL query string
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') || searchParams.get('q') || '';
  const statusFilter = searchParams.get('status') || 'All';
  const categoryFilter = searchParams.get('category') || 'All';
  const priorityFilter = searchParams.get('priority') || 'All';
  const locationFilter = searchParams.get('location') || 'All';
  const sortOrder = searchParams.get('sort') || 'criticalFirst';

  const updateFilters = (newFilters) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(newFilters).forEach(([key, val]) => {
      if (!val || val === 'All' || val === 'All Locations' || (typeof val === 'string' && val.trim() === '')) {
        nextParams.delete(key);
        if (key === 'search') nextParams.delete('q');
      } else {
        nextParams.set(key, val);
      }
    });
    setSearchParams(nextParams, { replace: true });
  };

  const clearAllFilters = () => {
    const nextParams = new URLSearchParams();
    if (sortOrder && sortOrder !== 'criticalFirst') {
      nextParams.set('sort', sortOrder);
    }
    setSearchParams(nextParams, { replace: true });
  };

  const scrollToQueue = () => {
    setTimeout(() => {
      document.getElementById('complaints-queue')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const hasActiveFilters =
    statusFilter !== 'All' ||
    categoryFilter !== 'All' ||
    priorityFilter !== 'All' ||
    (locationFilter !== 'All' && locationFilter !== 'All Locations') ||
    Boolean(search.trim());

  // Top Tabs: 'queue' | 'analytics'
  const [activeTab, setActiveTab] = useState('queue');

  // Action Modals State
  const [statusModalIssue, setStatusModalIssue] = useState(null);
  const [newStatus, setNewStatus] = useState('In Progress');
  const [adminNote, setAdminNote] = useState('');
  const [statusAssignedTo, setStatusAssignedTo] = useState('');
  const [statusOfficer, setStatusOfficer] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  const [overrideModalIssue, setOverrideModalIssue] = useState(null);
  const [overrideCategory, setOverrideCategory] = useState('');
  const [overridePriority, setOverridePriority] = useState('');
  const [overrideDepartment, setOverrideDepartment] = useState('');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);

  const [deleteConfirmIssue, setDeleteConfirmIssue] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Work Crew Assignment Modal State
  const [workModalIssue, setWorkModalIssue] = useState(null);
  const [workAssignedTo, setWorkAssignedTo] = useState('');
  const [workOfficer, setWorkOfficer] = useState('');
  const [workScheduledDate, setWorkScheduledDate] = useState('');
  const [workNotes, setWorkNotes] = useState('');
  const [workSubmitting, setWorkSubmitting] = useState(false);

  // Repair Verification Modal State
  const [verifyModalIssue, setVerifyModalIssue] = useState(null);
  const [afterPhotoFile, setAfterPhotoFile] = useState(null);
  const [afterPhotoPreview, setAfterPhotoPreview] = useState(null);
  const [verifyNotes, setVerifyNotes] = useState('');
  const [verifySubmitting, setVerifySubmitting] = useState(false);

  // Helper to open Work Modal with defaults
  const openWorkModal = (issue) => {
    setWorkModalIssue(issue);
    const { suggestedCrews, suggestedOfficers } = getSuggestedCrewsAndOfficers(issue.department, issue.location?.locality);
    setWorkAssignedTo(issue.workAssignment?.assignedTo || issue.handledBy?.crew || suggestedCrews[0]);
    setWorkOfficer(issue.workAssignment?.officerName || issue.workAssignment?.officer?.name || issue.handledBy?.officer?.name || suggestedOfficers[0].name);
    setWorkScheduledDate(issue.workAssignment?.scheduledDate || new Date().toISOString().split('T')[0]);
    setWorkNotes(issue.workAssignment?.notes || '');
  };

  // Helper to open Status Modal with defaults
  const openStatusModal = (issue) => {
    setStatusModalIssue(issue);
    setNewStatus(issue.status);
    setAdminNote('');
    const { suggestedCrews, suggestedOfficers } = getSuggestedCrewsAndOfficers(issue.department, issue.location?.locality);
    setStatusAssignedTo(issue.workAssignment?.assignedTo || issue.handledBy?.crew || suggestedCrews[0]);
    setStatusOfficer(issue.workAssignment?.officerName || issue.workAssignment?.officer?.name || issue.handledBy?.officer?.name || suggestedOfficers[0].name);
  };

  // Check Admin Role
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      showToast('Admin access required. Please sign in with admin credentials.', 'error');
      navigate('/login');
    }
  }, [authLoading, user, isAdmin, navigate]);

  // Load issues and stats
  const refreshData = async () => {
    try {
      setLoading(true);
      setLoadingTrends(true);
      const [issuesRes, statsRes, trendsRes] = await Promise.all([
        issuesApi.getAll({ sort: sortOrder }),
        statsApi.getStats(),
        statsApi.getTrends().catch(() => null),
      ]);
      if (issuesRes.issues) setIssues(issuesRes.issues);
      if (statsRes.stats) setStats(statsRes.stats);
      if (trendsRes?.days) setTrendData(trendsRes);
    } catch {
      showToast('Failed to load administrative dashboard data.', 'error');
    } finally {
      setLoading(false);
      setLoadingTrends(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      refreshData();
    }
  }, [isAdmin, sortOrder]);

  // Analytics Computation for Department & Ward tables and SLAs
  const { departmentAnalytics, localityAnalytics, overdueIssues } = useMemo(() => {
    const deptMap = {};
    const locMap = {};
    const overdueList = [];

    const now = Date.now();

    issues.forEach((iss) => {
      // Department
      const dept = iss.department || 'General Administration';
      if (!deptMap[dept]) {
        deptMap[dept] = {
          department: dept,
          totalAssigned: 0,
          pending: 0,
          resolved: 0,
          totalResolveHours: 0,
          reopenedCount: 0,
        };
      }
      deptMap[dept].totalAssigned += 1;
      if (iss.status === 'Resolved') {
        deptMap[dept].resolved += 1;
        const created = new Date(iss.createdAt).getTime();
        const resStep = (iss.timeline || []).find((t) => t.status === 'Resolved');
        if (resStep) {
          const diff = Math.max(1, (new Date(resStep.timestamp).getTime() - created) / (1000 * 3600));
          deptMap[dept].totalResolveHours += diff;
        } else {
          deptMap[dept].totalResolveHours += 24;
        }
      } else {
        deptMap[dept].pending += 1;
      }
      if (iss.status === 'Reopened' || (iss.timeline || []).some((t) => t.status === 'Reopened')) {
        deptMap[dept].reopenedCount += 1;
      }

      // Locality
      const loc = iss.location?.locality || 'Central Ward';
      if (!locMap[loc]) {
        locMap[loc] = {
          locality: loc,
          total: 0,
          pending: 0,
          resolved: 0,
          totalResolveHours: 0,
        };
      }
      locMap[loc].total += 1;
      if (iss.status === 'Resolved') {
        locMap[loc].resolved += 1;
      } else {
        locMap[loc].pending += 1;
      }

      // Overdue check
      if (iss.status !== 'Resolved') {
        const createdTime = new Date(iss.createdAt).getTime();
        const ageHours = (now - createdTime) / (1000 * 3600);
        let slaLimit = 7 * 24;
        if (iss.priority === 'Critical') slaLimit = 24;
        else if (iss.priority === 'High') slaLimit = 72;

        if (ageHours > slaLimit) {
          overdueList.push({
            ...iss,
            slaStatus: {
              isOverdue: true,
              overdueHours: Math.round(ageHours - slaLimit),
            },
          });
        }
      }
    });

    const deptList = Object.values(deptMap).map((d) => ({
      ...d,
      avgAckHours: 2,
      avgResolveHours: d.resolved > 0 ? Math.round(d.totalResolveHours / d.resolved) : 24,
      slaComplianceRate: d.totalAssigned > 0 ? Math.round(((d.totalAssigned - d.reopenedCount) / d.totalAssigned) * 100) : 100,
    }));

    const locList = Object.values(locMap).map((l) => ({
      ...l,
      avgResolveHours: 28,
    })).sort((a, b) => b.pending - a.pending);

    return {
      departmentAnalytics: deptList,
      localityAnalytics: locList,
      overdueIssues: overdueList,
    };
  }, [issues]);

  // Full dataset location counts
  const locationCounts = useMemo(() => {
    let gandhipuram = 0;
    let rsPuram = 0;
    let peelamedu = 0;
    let other = 0;

    issues.forEach((iss) => {
      const loc = (iss.location?.locality || '').toLowerCase().trim();
      const addr = (iss.location?.address || '').toLowerCase();
      if (loc.includes('gandhipuram') || addr.includes('gandhipuram')) {
        gandhipuram += 1;
      } else if (loc.includes('rs puram') || addr.includes('rs puram')) {
        rsPuram += 1;
      } else if (loc.includes('peelamedu') || addr.includes('peelamedu')) {
        peelamedu += 1;
      } else {
        other += 1;
      }
    });

    return {
      all: issues.length,
      gandhipuram,
      rsPuram,
      peelamedu,
      other,
    };
  }, [issues]);

  // Location summary strip data (open issues and critical counts for 3 wards)
  const locationStripData = useMemo(() => {
    const getCounts = (locName) => {
      const matching = issues.filter((iss) => matchIssueLocation(iss, locName));
      const openCount = matching.filter((iss) => iss.status !== 'Resolved').length;
      const criticalCount = matching.filter((iss) => iss.priority === 'Critical').length;
      return { total: matching.length, openCount, criticalCount };
    };

    return [
      { name: 'Gandhipuram', ...getCounts('Gandhipuram') },
      { name: 'RS Puram', ...getCounts('RS Puram') },
      { name: 'Peelamedu', ...getCounts('Peelamedu') },
    ];
  }, [issues]);

  // Effective stats: derive from full dataset unless location is selected, in which case update to that location's numbers
  const effectiveStats = useMemo(() => {
    if (locationFilter === 'All' || locationFilter === 'All Locations') {
      return stats;
    }
    const locIssues = issues.filter((iss) => matchIssueLocation(iss, locationFilter));
    let reported = 0;
    let inProgress = 0;
    let resolved = 0;
    let reopened = 0;
    let pendingReview = 0;
    const byCategory = {};
    const byPriority = { Critical: 0, High: 0, Medium: 0, Low: 0 };

    locIssues.forEach((iss) => {
      if (iss.status === 'Reported') reported += 1;
      else if (iss.status === 'In Progress') inProgress += 1;
      else if (iss.status === 'Resolved') resolved += 1;
      else if (iss.status === 'Reopened') reopened += 1;
      else if (iss.status === 'Pending Review') pendingReview += 1;

      byCategory[iss.category] = (byCategory[iss.category] || 0) + 1;
      if (byPriority[iss.priority] !== undefined) {
        byPriority[iss.priority] += 1;
      }
    });

    return {
      total: locIssues.length,
      reported,
      inProgress,
      resolved,
      reopened,
      pendingReview,
      byCategory,
      byPriority,
    };
  }, [issues, stats, locationFilter]);

  // Filtered and Sorted issues (Critical Safety Priority ALWAYS pinned to top)
  const filteredIssues = useMemo(() => {
    const list = issues.filter((issue) => {
      if (statusFilter !== 'All') {
        const sf = statusFilter.toLowerCase();
        const issStatus = (issue.status || '').toLowerCase();
        // Status rule: In Progress tile includes Pending Review; Reported includes Reopened
        const matchesStatus =
          issStatus === sf ||
          (sf === 'in progress' && issStatus === 'pending review') ||
          (sf === 'reported' && issStatus === 'reopened');
        if (!matchesStatus) {
          return false;
        }
      }
      if (categoryFilter !== 'All' && (issue.category || '').toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }
      if (priorityFilter !== 'All' && (issue.priority || '').toLowerCase() !== priorityFilter.toLowerCase()) {
        return false;
      }
      if (!matchIssueLocation(issue, locationFilter)) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const text = `${issue.title || ''} ${issue.id || ''} ${issue.location?.locality || ''} ${issue.department || ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      // Pin Critical safety priority to the very top regardless of S
      const aCrit = a.priority === 'Critical' ? 1 : 0;
      const bCrit = b.priority === 'Critical' ? 1 : 0;
      if (aCrit !== bCrit) return bCrit - aCrit;

      if (sortOrder === 'criticalFirst') {
        const getScore = (item) =>
          typeof item.planningScore === 'object' && item.planningScore !== null
            ? (item.planningScore.S ?? 0)
            : (item.planningScore ?? (item.planningBreakdown?.combinedScore ?? 0));
        const aScore = getScore(a);
        const bScore = getScore(b);
        return bScore - aScore;
      }
      if (sortOrder === 'location') {
        const aLoc = (a.location?.locality || a.location?.address || '').toLowerCase();
        const bLoc = (b.location?.locality || b.location?.address || '').toLowerCase();
        return aLoc.localeCompare(bLoc);
      }
      if (sortOrder === 'newest') {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      if (sortOrder === 'oldest') {
        return new Date(a.createdAt) - new Date(b.createdAt);
      }
      return 0;
    });

    return list;
  }, [issues, statusFilter, categoryFilter, priorityFilter, locationFilter, search, sortOrder]);

  // Handle Status Update Submit
  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!statusModalIssue) return;

    setStatusSubmitting(true);
    try {
      const extra =
        newStatus === 'In Progress'
          ? {
              assignedTo: statusAssignedTo,
              officer: statusOfficer,
            }
          : {};
      const res = await adminApi.updateStatus(statusModalIssue.id, newStatus, adminNote, extra);
      showToast(`Issue ${statusModalIssue.id} transitioned to ${newStatus}.`, 'success');
      setIssues((prev) =>
        prev.map((i) => (i.id === statusModalIssue.id ? res.issue : i))
      );
      setStatusModalIssue(null);
      setAdminNote('');
      const statsRes = await statsApi.getStats();
      if (statsRes.stats) setStats(statsRes.stats);
    } catch (err) {
      showToast(err.message || 'Status transition failed.', 'error');
    } finally {
      setStatusSubmitting(false);
    }
  };

  // Open Override Modal
  const openOverrideModal = (issue) => {
    setOverrideModalIssue(issue);
    setOverrideCategory(issue.category);
    setOverridePriority(issue.priority);
    setOverrideDepartment(issue.department);
    setOverrideNotes(issue.adminNotes || '');
  };

  // Handle Override Submit
  const handleOverrideSubmit = async (e) => {
    e.preventDefault();
    if (!overrideModalIssue) return;

    setOverrideSubmitting(true);
    try {
      const res = await adminApi.overrideIssue(overrideModalIssue.id, {
        category: overrideCategory,
        priority: overridePriority,
        department: overrideDepartment,
        notes: overrideNotes,
      });
      showToast(`Administrative overrides recorded for ${overrideModalIssue.id}.`, 'success');
      setIssues((prev) =>
        prev.map((i) => (i.id === overrideModalIssue.id ? res.issue : i))
      );
      setOverrideModalIssue(null);
      const statsRes = await statsApi.getStats();
      if (statsRes.stats) setStats(statsRes.stats);
    } catch (err) {
      showToast(err.message || 'Failed to apply overrides.', 'error');
    } finally {
      setOverrideSubmitting(false);
    }
  };

  // Handle Work Order Assignment
  const handleAssignWorkSubmit = async (e) => {
    e.preventDefault();
    if (!workModalIssue) return;

    setWorkSubmitting(true);
    try {
      const res = await adminApi.assignWork(workModalIssue.id, {
        assignedTo: workAssignedTo,
        officer: workOfficer,
        scheduledDate: workScheduledDate,
        notes: workNotes,
      });
      showToast(`Work crew successfully assigned for ${workModalIssue.id}.`, 'success');
      setIssues((prev) =>
        prev.map((i) => (i.id === workModalIssue.id ? res.issue : i))
      );
      setWorkModalIssue(null);
      setWorkAssignedTo('');
      setWorkOfficer('');
      setWorkScheduledDate('');
      setWorkNotes('');
    } catch (err) {
      showToast(err.message || 'Failed to assign work order.', 'error');
    } finally {
      setWorkSubmitting(false);
    }
  };

  // Handle Repair Verification Submit
  const handleVerifyRepairSubmit = async (e) => {
    e.preventDefault();
    if (!verifyModalIssue || !afterPhotoFile) return;

    setVerifySubmitting(true);
    try {
      const formData = new FormData();
      formData.append('image', afterPhotoFile);
      if (verifyNotes) formData.append('notes', verifyNotes);

      const res = await adminApi.verifyResolution(verifyModalIssue.id, formData);
      showToast(`AI verification complete. Issue set to ${res.issue?.status || 'Pending Review'}.`, 'success');
      setIssues((prev) =>
        prev.map((i) => (i.id === verifyModalIssue.id ? res.issue : i))
      );
      setVerifyModalIssue(null);
      setAfterPhotoFile(null);
      setAfterPhotoPreview(null);
      setVerifyNotes('');
      const statsRes = await statsApi.getStats();
      if (statsRes.stats) setStats(statsRes.stats);
    } catch (err) {
      showToast(err.message || 'Verification analysis failed.', 'error');
    } finally {
      setVerifySubmitting(false);
    }
  };

  // Handle Delete Confirm
  const handleDeleteConfirm = async () => {
    if (!deleteConfirmIssue) return;
    setDeleteSubmitting(true);
    try {
      await adminApi.deleteIssue(deleteConfirmIssue.id);
      showToast(`Complaint ${deleteConfirmIssue.id} deleted.`, 'info');
      setIssues((prev) => prev.filter((i) => i.id !== deleteConfirmIssue.id));
      setDeleteConfirmIssue(null);
      const statsRes = await statsApi.getStats();
      if (statsRes.stats) setStats(statsRes.stats);
    } catch (err) {
      showToast(err.message || 'Delete operation failed.', 'error');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#DADCE0]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#D93025] text-white">
              ADMIN CONTROL PANEL
            </span>
            <span className="text-xs text-[#5F6368]">
              Coimbatore Municipal Command Center
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-medium font-heading text-[#202124] mt-1">
            Municipal Triage & Dispatch
          </h1>
        </div>

        <button
          onClick={refreshData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-control text-xs font-medium text-[#202124] bg-white border border-[#DADCE0] hover:bg-[#F8F9FA] shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Admin Control Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-[#DADCE0] pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('queue')}
          className={`flex items-center gap-2 px-4 py-2 rounded-control text-xs font-medium transition-colors ${
            activeTab === 'queue'
              ? 'bg-[#188038] text-white shadow-xs'
              : 'text-[#5F6368] hover:bg-[#F8F9FA]'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Complaints Queue ({filteredIssues.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-4 py-2 rounded-control text-xs font-medium transition-colors ${
            activeTab === 'analytics'
              ? 'bg-[#188038] text-white shadow-xs'
              : 'text-[#5F6368] hover:bg-[#F8F9FA]'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Department Accountability & SLAs</span>
        </button>
      </div>

      {activeTab === 'analytics' ? (
        <AdminAnalyticsTables
          departmentAnalytics={departmentAnalytics}
          localityAnalytics={localityAnalytics}
          overdueIssues={overdueIssues}
        />
      ) : (
        <>
          {/* Summary Stat Cards (Interactive Filter Tiles) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Reported Tile */}
            <button
              type="button"
              onClick={() => {
                updateFilters({ status: 'All', category: 'All', priority: 'All', search: '' });
                scrollToQueue();
              }}
              aria-label={`Show all ${effectiveStats?.total || issues.length} issues`}
              title="Click to clear filters and show all issues (includes Reported and Reopened)"
              className={`p-4 rounded-card border text-left transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#188038] ${
                !hasActiveFilters
                  ? 'bg-white border-[#188038] ring-2 ring-[#188038]/30 shadow-sm'
                  : 'bg-white border-[#DADCE0] shadow-card hover:border-[#188038]/40'
              }`}
            >
              <div className="flex items-center justify-between text-[#5F6368] text-xs">
                <span className="font-medium">Total Reported</span>
                <LayoutDashboard className="w-4 h-4 text-[#188038]" />
              </div>
              <div className="text-2xl sm:text-3xl font-medium font-mono-numbers text-[#202124] mt-2">
                {effectiveStats?.total || issues.length}
              </div>
              <div className="text-[11px] text-[#5F6368] mt-1 truncate">
                {!hasActiveFilters ? 'Viewing full queue' : 'Click to reset all'}
              </div>
            </button>

            {/* Critical Priority Tile */}
            <button
              type="button"
              onClick={() => {
                updateFilters({ priority: priorityFilter === 'Critical' ? 'All' : 'Critical' });
                scrollToQueue();
              }}
              aria-label={`Show ${effectiveStats?.byPriority?.Critical || 0} critical issues`}
              title={`Show ${effectiveStats?.byPriority?.Critical || 0} critical priority issues`}
              className={`p-4 rounded-card border text-left transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#D93025] ${
                priorityFilter === 'Critical'
                  ? 'bg-[#FCE8E6] border-[#D93025] ring-2 ring-[#D93025] shadow-sm'
                  : 'bg-[#FCE8E6]/60 border-[#D93025]/30 hover:bg-[#FCE8E6] shadow-card'
              }`}
            >
              <div className="flex items-center justify-between text-[#D93025] text-xs font-medium">
                <span>Critical Priority</span>
                <AlertOctagon className="w-4 h-4 text-[#D93025]" />
              </div>
              <div className="text-2xl sm:text-3xl font-medium font-mono-numbers text-[#D93025] mt-2">
                {effectiveStats?.byPriority?.Critical || 0}
              </div>
              <div className="text-[11px] text-[#D93025] mt-1 truncate font-medium">
                {priorityFilter === 'Critical' ? 'Filtered to Critical' : 'Click to filter'}
              </div>
            </button>

            {/* In Progress Work Tile */}
            <button
              type="button"
              onClick={() => {
                updateFilters({ status: statusFilter === 'In Progress' ? 'All' : 'In Progress' });
                scrollToQueue();
              }}
              aria-label={`Show ${(effectiveStats?.inProgress || 0) + (effectiveStats?.pendingReview || 0)} in progress issues`}
              title="Status rule: In Progress tile includes Pending Review; Reported includes Reopened"
              className={`p-4 rounded-card border text-left transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#F9AB00] ${
                statusFilter === 'In Progress'
                  ? 'bg-[#FEF7E0] border-[#F9AB00] ring-2 ring-[#F9AB00] shadow-sm'
                  : 'bg-[#FEF7E0]/60 border-[#F9AB00]/30 hover:bg-[#FEF7E0] shadow-card'
              }`}
            >
              <div className="flex items-center justify-between text-[#B06000] text-xs font-medium">
                <span>In Progress Work</span>
                <Clock className="w-4 h-4 text-[#F9AB00]" />
              </div>
              <div className="text-2xl sm:text-3xl font-medium font-mono-numbers text-[#B06000] mt-2">
                {(effectiveStats?.inProgress || 0) + (effectiveStats?.pendingReview || 0)}
              </div>
              <div className="text-[11px] text-[#B06000] mt-1 truncate font-medium">
                {statusFilter === 'In Progress' ? 'Filtered to In Progress' : 'Click to filter'}
              </div>
            </button>

            {/* Verified Resolved Tile */}
            <button
              type="button"
              onClick={() => {
                updateFilters({ status: statusFilter === 'Resolved' ? 'All' : 'Resolved' });
                scrollToQueue();
              }}
              aria-label={`Show ${effectiveStats?.resolved || 0} resolved issues`}
              title={`Show ${effectiveStats?.resolved || 0} verified resolved issues`}
              className={`p-4 rounded-card border text-left transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1E8E3E] ${
                statusFilter === 'Resolved'
                  ? 'bg-[#E6F4EA] border-[#1E8E3E] ring-2 ring-[#1E8E3E] shadow-sm'
                  : 'bg-[#E6F4EA]/60 border-[#1E8E3E]/30 hover:bg-[#E6F4EA] shadow-card'
              }`}
            >
              <div className="flex items-center justify-between text-[#1E8E3E] text-xs font-medium">
                <span>Verified Resolved</span>
                <CheckCircle2 className="w-4 h-4 text-[#1E8E3E]" />
              </div>
              <div className="text-2xl sm:text-3xl font-medium font-mono-numbers text-[#1E8E3E] mt-2">
                {effectiveStats?.resolved || 0}
              </div>
              <div className="text-[11px] text-[#1E8E3E] mt-1 truncate font-medium">
                {statusFilter === 'Resolved' ? 'Filtered to Resolved' : 'Click to filter'}
              </div>
            </button>
          </div>

          {/* SVG Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatusDonutChart
              stats={effectiveStats}
              selectedStatus={statusFilter}
              onSelectStatus={(status) => {
                updateFilters({ status });
                scrollToQueue();
              }}
            />
            <CategoryBarChart
              byCategory={effectiveStats?.byCategory}
              total={effectiveStats?.total}
              selectedCategory={categoryFilter}
              onSelectCategory={(category) => {
                updateFilters({ category });
                scrollToQueue();
              }}
            />
            <PriorityBarChart
              byPriority={effectiveStats?.byPriority}
              total={effectiveStats?.total}
              selectedPriority={priorityFilter}
              onSelectPriority={(priority) => {
                updateFilters({ priority });
                scrollToQueue();
              }}
            />
          </div>

          {/* Location Summary Strip (Gandhipuram, RS Puram, Peelamedu) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#5F6368]">
              <span className="font-medium flex items-center gap-1.5 text-[#202124]">
                <MapPin className="w-4 h-4 text-[#188038]" />
                Zonal Command Quick Filter
              </span>
              <span className="text-[11px]">Click a ward card to isolate complaints</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {locationStripData.map((loc) => {
                const isSelected = locationFilter.toLowerCase() === loc.name.toLowerCase();
                return (
                  <button
                    key={loc.name}
                    type="button"
                    onClick={() => {
                      updateFilters({ location: isSelected ? 'All' : loc.name });
                      scrollToQueue();
                    }}
                    aria-pressed={isSelected}
                    aria-label={`Filter by ${loc.name}: ${loc.openCount} open, ${loc.criticalCount} critical`}
                    className={`p-3.5 rounded-card border text-left transition-all hover:-translate-y-0.5 hover:shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#188038] ${
                      isSelected
                        ? 'bg-[#E6F4EA] border-[#188038] ring-2 ring-[#188038]/40 shadow-xs'
                        : 'bg-white border-[#DADCE0] hover:border-[#188038]/40 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-medium text-[#202124]">
                        <Building className={`w-3.5 h-3.5 ${isSelected ? 'text-[#188038]' : 'text-[#5F6368]'}`} />
                        <span>{loc.name} Ward</span>
                      </div>
                      <span className="text-[11px] font-mono-numbers px-1.5 py-0.5 rounded bg-[#F1F3F4] text-[#5F6368]">
                        {loc.total} total
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className="text-[#5F6368]">
                        Open Work: <strong className="font-mono-numbers text-[#202124]">{loc.openCount}</strong>
                      </span>
                      {loc.criticalCount > 0 ? (
                        <span className="text-[#D93025] font-medium flex items-center gap-1">
                          <AlertOctagon className="w-3 h-3 text-[#D93025]" />
                          {loc.criticalCount} Critical
                        </span>
                      ) : (
                        <span className="text-[#1E8E3E] text-[11px]">0 Critical</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Trends, Locality Heat Grid & SLA Compliance Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 my-6">
            <div className="lg:col-span-5">
              <ChartBoundary title="Reported vs Resolved (last 10 days)">
                <TrendLineChart
                  data={trendData?.days || []}
                  loading={loadingTrends}
                  title="Reported vs Resolved (last 10 days)"
                />
              </ChartBoundary>
            </div>
            <div className="lg:col-span-4">
              <ChartBoundary title="Issues by Locality & Priority">
                <HeatGrid
                  data={trendData?.byLocalityPriority || []}
                  loading={loadingTrends}
                  title="Issues by Locality & Priority"
                  onCellClick={({ locality, priority }) => {
                    updateFilters({
                      location: locality === 'Other areas' ? 'Other' : locality,
                      priority,
                    });
                    scrollToQueue();
                  }}
                />
              </ChartBoundary>
            </div>
            <div className="lg:col-span-3">
              <ChartBoundary title="SLA Compliance">
                <GaugeChart
                  slaCompliancePercent={trendData?.slaCompliancePercent ?? 73}
                  overdueCount={trendData?.overdueCount ?? 0}
                  loading={loadingTrends}
                  title="SLA Compliance"
                />
              </ChartBoundary>
            </div>
          </div>

          {/* Issues Queue Table Section */}
          <div id="complaints-queue" className="bg-white rounded-card border border-[#DADCE0] shadow-card overflow-hidden">
            {/* Table Filters & Sort Bar */}
            <div className="p-4 border-b border-[#DADCE0] bg-[#F8F9FA] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium font-heading text-[#202124]">
                  Complaints Queue
                </span>
                <span className="text-xs font-mono-numbers px-2 py-0.5 rounded-full bg-[#F1F3F4] text-[#5F6368]">
                  {filteredIssues.length}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Search */}
                <div className="relative min-w-[180px] flex-1 sm:flex-none">
                  <input
                    id="admin-queue-search"
                    aria-label="Search complaints queue by title, ID, or ward"
                    type="text"
                    value={search}
                    onChange={(e) => updateFilters({ search: e.target.value })}
                    placeholder="Search title, ID, ward..."
                    className="w-full pl-7 pr-3 py-1.5 rounded-control border border-[#DADCE0] bg-white text-[#202124] focus:border-[#188038] outline-none"
                  />
                  <Search className="w-3.5 h-3.5 text-[#5F6368] absolute left-2 top-2 pointer-events-none" />
                </div>

                {/* Location Filter */}
                <select
                  aria-label="Filter by location"
                  value={locationFilter}
                  onChange={(e) => updateFilters({ location: e.target.value })}
                  className="py-1.5 px-2 rounded-control border border-[#DADCE0] bg-white text-[#202124]"
                >
                  <option value="All">All Locations ({locationCounts.all})</option>
                  <option value="Gandhipuram">Gandhipuram ({locationCounts.gandhipuram})</option>
                  <option value="RS Puram">RS Puram ({locationCounts.rsPuram})</option>
                  <option value="Peelamedu">Peelamedu ({locationCounts.peelamedu})</option>
                  <option value="Other areas">Other areas ({locationCounts.other})</option>
                </select>

                {/* Status */}
                <select
                  value={statusFilter}
                  onChange={(e) => updateFilters({ status: e.target.value })}
                  className="py-1.5 px-2 rounded-control border border-[#DADCE0] bg-white text-[#202124]"
                >
                  <option value="All">All Statuses</option>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                {/* Priority */}
                <select
                  value={priorityFilter}
                  onChange={(e) => updateFilters({ priority: e.target.value })}
                  className="py-1.5 px-2 rounded-control border border-[#DADCE0] bg-white text-[#202124]"
                >
                  <option value="All">All Priorities</option>
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>

                {/* Category */}
                <select
                  value={categoryFilter}
                  onChange={(e) => updateFilters({ category: e.target.value })}
                  className="py-1.5 px-2 rounded-control border border-[#DADCE0] bg-white text-[#202124]"
                >
                  <option value="All">All Categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                {/* Sort Order */}
                <select
                  value={sortOrder}
                  onChange={(e) => updateFilters({ sort: e.target.value })}
                  className="py-1.5 px-2 rounded-control border border-[#DADCE0] bg-white text-[#202124] font-medium"
                >
                  <option value="criticalFirst">Sort: Highest Impact S</option>
                  <option value="location">Sort: Location (A-Z)</option>
                  <option value="newest">Sort: Newest Submissions</option>
                  <option value="oldest">Sort: Oldest First</option>
                </select>
              </div>
            </div>

            {/* Active Filters Bar */}
            <div className="px-4 py-2.5 bg-[#F8F9FA]/80 border-b border-[#DADCE0] flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[#5F6368] font-medium flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-[#5F6368]" />
                  Active Filters:
                </span>

                {locationFilter !== 'All' && locationFilter !== 'All Locations' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]">
                    <span>Location: {locationFilter}</span>
                    <button
                      type="button"
                      onClick={() => updateFilters({ location: 'All' })}
                      className="p-0.5 hover:bg-[#137333]/20 rounded-full focus:outline-none cursor-pointer"
                      aria-label="Remove location filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {statusFilter !== 'All' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#E6F4EA] text-[#188038] border border-[#188038]/30">
                    <span>Status: {statusFilter}</span>
                    <button
                      type="button"
                      onClick={() => updateFilters({ status: 'All' })}
                      className="p-0.5 hover:bg-[#188038]/20 rounded-full focus:outline-none cursor-pointer"
                      aria-label="Remove status filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {priorityFilter !== 'All' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#FCE8E6] text-[#D93025] border border-[#D93025]/30">
                    <span>Priority: {priorityFilter}</span>
                    <button
                      type="button"
                      onClick={() => updateFilters({ priority: 'All' })}
                      className="p-0.5 hover:bg-[#D93025]/20 rounded-full focus:outline-none cursor-pointer"
                      aria-label="Remove priority filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {categoryFilter !== 'All' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#FEF7E0] text-[#B06000] border border-[#F9AB00]/40">
                    <span>Category: {categoryFilter}</span>
                    <button
                      type="button"
                      onClick={() => updateFilters({ category: 'All' })}
                      className="p-0.5 hover:bg-[#F9AB00]/20 rounded-full focus:outline-none cursor-pointer"
                      aria-label="Remove category filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {search.trim() && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white text-[#202124] border border-[#DADCE0]">
                    <span>Search: "{search.trim()}"</span>
                    <button
                      type="button"
                      onClick={() => updateFilters({ search: '' })}
                      className="p-0.5 hover:bg-[#F1F3F4] rounded-full focus:outline-none cursor-pointer"
                      aria-label="Remove search filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="text-xs text-[#188038] hover:underline font-medium ml-1 focus:outline-none cursor-pointer"
                  >
                    Clear all
                  </button>
                ) : (
                  <span className="text-[11px] text-[#5F6368] italic">None (showing full queue)</span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-[#5F6368]">
                <span className="font-mono-numbers font-medium text-[#202124]">
                  Showing {filteredIssues.length} of {issues.length} issues
                </span>
                <span
                  title="Status rule: In Progress tile includes Pending Review; Reported includes Reopened"
                  className="cursor-help text-[#5F6368] hover:text-[#202124] inline-flex items-center gap-0.5"
                  aria-label="Status rule: In Progress tile includes Pending Review; Reported includes Reopened"
                >
                  <Info className="w-3.5 h-3.5 text-[#5F6368]" />
                </span>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="overflow-x-auto hidden lg:block">
              <table className="w-full text-left text-xs" aria-label="Administrative Issues Queue">
                <thead className="bg-[#F8F9FA] text-[#5F6368] font-medium border-b border-[#DADCE0]">
                  <tr>
                    <th scope="col" className="py-3 px-4">Tracking ID</th>
                    <th scope="col" className="py-3 px-4">Complaint & Location</th>
                    <th scope="col" className="py-3 px-4">Safety Priority</th>
                    <th scope="col" className="py-3 px-4">Planning Score S</th>
                    <th scope="col" className="py-3 px-4">Status</th>
                    <th scope="col" className="py-3 px-4">Department & Work Crew</th>
                    <th scope="col" className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DADCE0]">
                  {filteredIssues.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#5F6368]">
                        <div className="max-w-xs mx-auto space-y-3">
                          <p className="text-sm font-medium text-[#202124]">
                            No issues match these filters
                          </p>
                          <p className="text-xs text-[#5F6368]">
                            Try clearing your search query or adjusting active filter chips.
                          </p>
                          <button
                            type="button"
                            onClick={clearAllFilters}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-control text-xs font-medium text-white bg-[#188038] hover:bg-[#137333] transition-colors shadow-xs cursor-pointer"
                          >
                            Clear all
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredIssues.map((issue) => {
                      const isCriticalOverride = issue.priority === 'Critical';
                      const scoreS =
                        typeof issue.planningScore === 'object' && issue.planningScore !== null
                          ? (issue.planningScore.S ?? '—')
                          : (issue.planningScore ?? (issue.planningBreakdown?.combinedScore ?? '—'));
                      const breakdown = issue.planningBreakdown;

                      return (
                        <tr
                          key={issue.id}
                          className={`transition-colors ${
                            isCriticalOverride ? 'bg-[#FCE8E6]/40 hover:bg-[#FCE8E6]/60' : 'hover:bg-[#F8F9FA]'
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono-numbers font-medium text-[#188038]">
                            <div className="flex items-center gap-1.5">
                              {isCriticalOverride && (
                                <span title="Immediate Safety Escalation - Pinned First">
                                  <ShieldAlert className="w-3.5 h-3.5 text-[#D93025]" />
                                </span>
                              )}
                              <span>{issue.id}</span>
                            </div>
                            <span className="text-[10px] text-[#5F6368] block">
                              {formatDate(issue.createdAt)}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 max-w-[220px]">
                            <div className="font-medium text-[#202124] truncate">
                              {issue.title}
                            </div>
                            <div className="text-[11px] text-[#5F6368] truncate flex items-center gap-1 mt-0.5">
                              <span>{issue.location?.locality || 'Coimbatore'}</span>
                              <span className="text-[#DADCE0]">•</span>
                              <span>{issue.category}</span>
                            </div>
                            {issue.trustScore !== undefined && (
                              <div className="mt-1">
                                <TrustScoreBadge trustScore={issue.trustScore} />
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <PriorityBadge priority={issue.priority} size="sm" />
                          </td>

                          <td className="py-3.5 px-4 font-mono-numbers">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium text-[#202124]">
                                {scoreS}
                              </span>
                              <span className="text-[10px] text-[#5F6368]">/100</span>
                            </div>
                            {breakdown && (
                              <div
                                className="text-[10px] text-[#5F6368] truncate max-w-[170px]"
                                title={`A=${breakdown.severityScore} C=${breakdown.communityImpactScore} P=${breakdown.safetyImpactScore} T=${breakdown.daysUnresolvedScore}`}
                              >
                                S=0.35A+0.25C+0.25P+0.15T
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <StatusChip status={issue.status} size="sm" />
                          </td>

                          <td className="py-3.5 px-4 max-w-[180px] text-[#202124]">
                            <div className="truncate font-medium">{issue.department}</div>
                            {issue.status === 'Reported' ? (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#F1F3F4] text-[#5F6368] border border-[#DADCE0]">
                                  Unassigned
                                </span>
                                <button
                                  type="button"
                                  onClick={() => openWorkModal(issue)}
                                  className="text-[10px] text-[#188038] hover:underline font-medium cursor-pointer"
                                >
                                  Assign
                                </button>
                              </div>
                            ) : (
                              <div className="text-[10px] text-[#5F6368] space-y-0.5 mt-0.5">
                                <span className="text-[#1E8E3E] font-medium block truncate">
                                  Crew: {issue.workAssignment?.assignedTo || issue.handledBy?.crew || 'Municipal Squad'}
                                </span>
                                <span className="block truncate text-[#5F6368]">
                                  Officer: {issue.workAssignment?.officerName || issue.workAssignment?.officer?.name || issue.handledBy?.officer?.name || 'Zonal Officer'}
                                </span>
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Assign Crew Button */}
                              <button
                                onClick={() => openWorkModal(issue)}
                                className="p-1.5 rounded text-xs font-medium text-[#202124] hover:bg-[#F1F3F4] border border-[#DADCE0] transition-colors"
                                title="Assign Work Crew"
                              >
                                <Wrench className="w-3.5 h-3.5 text-[#5F6368]" />
                              </button>

                              {/* AI Verify Button */}
                              <button
                                onClick={() => {
                                  setVerifyModalIssue(issue);
                                  setAfterPhotoFile(null);
                                  setAfterPhotoPreview(null);
                                  setVerifyNotes('');
                                }}
                                className="p-1.5 rounded text-xs font-medium text-[#188038] hover:bg-[#E6F4EA] border border-[#DADCE0] transition-colors"
                                title="AI Resolution Verification (Before/After Gemini)"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-[#188038]" />
                              </button>

                              {/* Update Status Button */}
                              <button
                                onClick={() => openStatusModal(issue)}
                                className="px-2 py-1 rounded text-xs font-medium text-[#202124] bg-white border border-[#DADCE0] hover:bg-[#F8F9FA] transition-colors"
                                title="Update Status & Log Audit Note"
                              >
                                Status
                              </button>

                              {/* Override Button */}
                              <button
                                onClick={() => openOverrideModal(issue)}
                                className="p-1.5 rounded text-[#5F6368] hover:text-[#202124] hover:bg-[#F1F3F4] border border-[#DADCE0]"
                                title="Manual Override (Department, Category, Priority)"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() => setDeleteConfirmIssue(issue)}
                                className="p-1.5 rounded text-[#5F6368] hover:text-[#D93025] hover:bg-[#FCE8E6] border border-[#DADCE0]"
                                title="Delete Complaint"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              <Link
                                to={`/issue/${issue.id}`}
                                target="_blank"
                                className="p-1.5 rounded text-[#5F6368] hover:text-[#188038] hover:bg-[#E6F4EA] border border-[#DADCE0]"
                                title="View Public Page"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Responsive Cards */}
            <div className="block lg:hidden divide-y divide-[#DADCE0] p-3 space-y-3">
              {filteredIssues.length === 0 ? (
                <div className="py-12 text-center p-4">
                  <div className="max-w-xs mx-auto space-y-3">
                    <p className="text-sm font-medium text-[#202124]">
                      No issues match these filters
                    </p>
                    <p className="text-xs text-[#5F6368]">
                      Try clearing your search query or adjusting active filter chips.
                    </p>
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-control text-xs font-medium text-white bg-[#188038] hover:bg-[#137333] transition-colors shadow-xs cursor-pointer"
                    >
                      Clear all
                    </button>
                  </div>
                </div>
              ) : (
                filteredIssues.map((issue) => (
                <div key={issue.id} className="pt-3 first:pt-0 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono-numbers font-medium text-[#188038]">
                      {issue.id}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <PriorityBadge priority={issue.priority} size="sm" />
                      <StatusChip status={issue.status} size="sm" />
                    </div>
                  </div>

                  <h4 className="font-medium text-sm text-[#202124]">
                    {issue.title}
                  </h4>

                  <div className="flex items-center justify-between text-[11px] text-[#5F6368]">
                    <span>{issue.location?.locality} • {issue.department}</span>
                    <span className="font-mono-numbers font-medium text-[#202124]">
                      S = {typeof issue.planningScore === 'object' && issue.planningScore !== null
                        ? (issue.planningScore.S ?? '—')
                        : (issue.planningScore ?? (issue.planningBreakdown?.combinedScore ?? '—'))}
                    </span>
                  </div>

                  {issue.status === 'Reported' ? (
                    <div className="flex items-center gap-2 text-[11px] pt-1">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#F1F3F4] text-[#5F6368] border border-[#DADCE0]">
                        Unassigned
                      </span>
                      <button
                        type="button"
                        onClick={() => openWorkModal(issue)}
                        className="text-[11px] text-[#188038] hover:underline font-medium cursor-pointer"
                      >
                        Assign crew
                      </button>
                    </div>
                  ) : (
                    <div className="text-[11px] text-[#5F6368] flex items-center gap-1.5 truncate pt-0.5">
                      <span className="text-[#1E8E3E] font-medium truncate">
                        {issue.workAssignment?.assignedTo || issue.handledBy?.crew || 'Municipal Squad'}
                      </span>
                      <span>•</span>
                      <span className="truncate">
                        {issue.workAssignment?.officerName || issue.workAssignment?.officer?.name || issue.handledBy?.officer?.name || 'Zonal Officer'}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-end gap-1.5 pt-2 border-t border-[#DADCE0]">
                    <button
                      onClick={() => openWorkModal(issue)}
                      className="px-2.5 py-1 rounded text-xs font-medium border border-[#DADCE0] bg-white text-[#202124]"
                    >
                      Crew
                    </button>
                    <button
                      onClick={() => {
                        setVerifyModalIssue(issue);
                        setAfterPhotoFile(null);
                        setAfterPhotoPreview(null);
                        setVerifyNotes('');
                      }}
                      className="px-2.5 py-1 rounded text-xs font-medium border border-[#DADCE0] bg-[#E6F4EA] text-[#188038]"
                    >
                      AI Verify
                    </button>
                    <button
                      onClick={() => openStatusModal(issue)}
                      className="px-2.5 py-1 rounded text-xs font-medium border border-[#DADCE0] bg-white text-[#202124]"
                    >
                      Status
                    </button>
                    <button
                      onClick={() => openOverrideModal(issue)}
                      className="p-1 rounded border border-[#DADCE0] text-[#5F6368]"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmIssue(issue)}
                      className="p-1 rounded border border-[#DADCE0] text-[#D93025]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
            </div>
          </div>
        </>
      )}

      {/* Modal 1: Status Change Dialog */}
      {statusModalIssue && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
        >
          <div className="bg-white rounded-card max-w-md w-full p-6 shadow-card border border-[#DADCE0] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium font-heading text-[#202124]">
                Update Status ({statusModalIssue.id})
              </h3>
              <button
                onClick={() => setStatusModalIssue(null)}
                className="text-[#5F6368] hover:text-[#202124]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStatusSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-[#202124] mb-1">
                  Target Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-control border border-[#DADCE0] bg-white text-[#202124]"
                >
                  <option value="Reported">Reported</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Pending Review">Pending Review</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Reopened">Reopened</option>
                </select>
              </div>

              {newStatus === 'In Progress' && (
                <div className="space-y-3 p-3 bg-[#F8F9FA] rounded-control border border-[#DADCE0]">
                  <div className="text-[11px] font-medium text-[#202124]">
                    Dispatch & Work Assignment
                  </div>
                  <div>
                    <label className="block font-medium text-[#202124] mb-1">
                      Assigned Crew / Team <span className="text-[#D93025]">*</span>
                    </label>
                    <select
                      value={statusAssignedTo}
                      onChange={(e) => setStatusAssignedTo(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-control border border-[#DADCE0] bg-white text-[#202124]"
                    >
                      {getSuggestedCrewsAndOfficers(statusModalIssue.department, statusModalIssue.location?.locality).suggestedCrews.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-[#202124] mb-1">
                      Officer in Charge <span className="text-[#D93025]">*</span>
                    </label>
                    <select
                      value={statusOfficer}
                      onChange={(e) => setStatusOfficer(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-control border border-[#DADCE0] bg-white text-[#202124]"
                    >
                      {getSuggestedCrewsAndOfficers(statusModalIssue.department, statusModalIssue.location?.locality).suggestedOfficers.map((o) => (
                        <option key={o.name} value={o.name}>{o.name} — {o.role}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-medium text-[#202124] mb-1">
                  Administrative Note (Logged to audit timeline)
                </label>
                <textarea
                  rows={3}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="e.g. Work crew dispatched with bitumen patch mix..."
                  required
                  className="w-full px-3 py-2 rounded-control border border-[#DADCE0] bg-white text-[#202124] outline-none focus:border-[#188038]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStatusModalIssue(null)}
                  className="px-4 py-2 rounded-control text-[#5F6368] bg-white border border-[#DADCE0] hover:bg-[#F8F9FA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={statusSubmitting}
                  className="px-4 py-2 rounded-control text-white bg-[#188038] hover:bg-[#137333] flex items-center gap-1.5 font-medium"
                >
                  {statusSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Status</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Admin Override Dialog */}
      {overrideModalIssue && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
        >
          <div className="bg-white rounded-card max-w-lg w-full p-6 shadow-card border border-[#DADCE0] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-medium font-heading text-[#202124]">
                  Override AI Classification
                </h3>
                <p className="text-[11px] text-[#5F6368]">
                  Modifications will be stamped in audit history as "overridden by admin".
                </p>
              </div>
              <button
                onClick={() => setOverrideModalIssue(null)}
                className="text-[#5F6368] hover:text-[#202124]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOverrideSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-[#202124] mb-1">
                  Category
                </label>
                <select
                  value={overrideCategory}
                  onChange={(e) => setOverrideCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-control border border-[#DADCE0] bg-white text-[#202124]"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#202124] mb-1">
                  Urgency Priority
                </label>
                <select
                  value={overridePriority}
                  onChange={(e) => setOverridePriority(e.target.value)}
                  className="w-full px-3 py-2 rounded-control border border-[#DADCE0] bg-white text-[#202124]"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#202124] mb-1">
                  Assign Municipal Department
                </label>
                <select
                  value={overrideDepartment}
                  onChange={(e) => setOverrideDepartment(e.target.value)}
                  className="w-full px-3 py-2 rounded-control border border-[#DADCE0] bg-white text-[#202124]"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#202124] mb-1">
                  Administrative Override Notes
                </label>
                <textarea
                  rows={2}
                  value={overrideNotes}
                  onChange={(e) => setOverrideNotes(e.target.value)}
                  placeholder="Reason for manual reassignment..."
                  className="w-full px-3 py-2 rounded-control border border-[#DADCE0] bg-white text-[#202124] outline-none focus:border-[#188038]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOverrideModalIssue(null)}
                  className="px-4 py-2 rounded-control text-[#5F6368] bg-white border border-[#DADCE0] hover:bg-[#F8F9FA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={overrideSubmitting}
                  className="px-4 py-2 rounded-control text-white bg-[#188038] hover:bg-[#137333] font-medium"
                >
                  {overrideSubmitting ? 'Saving...' : 'Apply Overrides'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Accessible Confirm Deletion Dialog */}
      <ConfirmModal
        isOpen={Boolean(deleteConfirmIssue)}
        title="Permanently Delete Issue"
        message={`Are you sure you want to permanently delete complaint ${deleteConfirmIssue?.id}? This action removes it from the public registry and cannot be reversed.`}
        confirmText={deleteSubmitting ? 'Deleting...' : 'Delete Permanently'}
        isDanger={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirmIssue(null)}
      />

      {/* Modal 4: Work Crew Assignment Dialog */}
      {workModalIssue && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
        >
          <div className="bg-white rounded-card max-w-md w-full p-6 shadow-card border border-[#DADCE0] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-medium font-heading text-[#202124] flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-[#188038]" />
                  <span>Assign Work Crew ({workModalIssue.id})</span>
                </h3>
                <p className="text-[11px] text-[#5F6368]">
                  Assign ground contractor or municipal squad to commence repairs.
                </p>
              </div>
              <button
                onClick={() => setWorkModalIssue(null)}
                className="text-[#5F6368] hover:text-[#202124]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignWorkSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-[#202124] mb-1">
                  Assigned Crew / Contractor Unit <span className="text-[#D93025]">*</span>
                </label>
                <select
                  value={workAssignedTo}
                  onChange={(e) => setWorkAssignedTo(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-control border border-[#DADCE0] bg-white text-[#202124] outline-none focus:border-[#188038]"
                >
                  {getSuggestedCrewsAndOfficers(workModalIssue.department, workModalIssue.location?.locality).suggestedCrews.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#202124] mb-1">
                  Officer in Charge <span className="text-[#D93025]">*</span>
                </label>
                <select
                  value={workOfficer}
                  onChange={(e) => setWorkOfficer(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-control border border-[#DADCE0] bg-white text-[#202124] outline-none focus:border-[#188038]"
                >
                  {getSuggestedCrewsAndOfficers(workModalIssue.department, workModalIssue.location?.locality).suggestedOfficers.map((o) => (
                    <option key={o.name} value={o.name}>{o.name} — {o.role}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="work-scheduled-date" className="block font-medium text-[#202124] mb-1">
                  Scheduled Start Date
                </label>
                <input
                  id="work-scheduled-date"
                  type="date"
                  value={workScheduledDate}
                  onChange={(e) => setWorkScheduledDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-control border border-[#DADCE0] bg-white text-[#202124]"
                />
              </div>

              <div>
                <label className="block font-medium text-[#202124] mb-1">
                  Work Order Directives
                </label>
                <textarea
                  rows={2}
                  value={workNotes}
                  onChange={(e) => setWorkNotes(e.target.value)}
                  placeholder="Material specs, traffic diversion, asphalt volume..."
                  className="w-full px-3 py-2 rounded-control border border-[#DADCE0] bg-white text-[#202124] outline-none focus:border-[#188038]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWorkModalIssue(null)}
                  className="px-4 py-2 rounded-control text-[#5F6368] bg-white border border-[#DADCE0] hover:bg-[#F8F9FA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={workSubmitting}
                  className="px-4 py-2 rounded-control text-white bg-[#188038] hover:bg-[#137333] font-medium flex items-center gap-1.5"
                >
                  {workSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Assign Work</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 5: AI Resolution Verification Dialog (Before/After Gemini Analysis) */}
      {verifyModalIssue && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
        >
          <div className="bg-white rounded-card max-w-lg w-full p-6 shadow-card border border-[#DADCE0] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-medium font-heading text-[#202124] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#188038]" />
                  <span>AI Resolution Verification ({verifyModalIssue.id})</span>
                </h3>
                <p className="text-[11px] text-[#5F6368]">
                  Notice: <strong className="text-[#202124]">AI assistance, not proof.</strong> Upload ground crew repair photo.
                </p>
              </div>
              <button
                onClick={() => setVerifyModalIssue(null)}
                className="text-[#5F6368] hover:text-[#202124]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleVerifyRepairSubmit} className="space-y-4 text-xs">
              {verifyModalIssue.imageUrl && (
                <div>
                  <span className="block font-medium text-[#202124] mb-1">
                    Initial Report Photo (Before)
                  </span>
                  <div className="h-24 w-40 rounded-lg overflow-hidden bg-[#F8F9FA] border border-[#DADCE0]">
                    <img
                      src={verifyModalIssue.imageUrl}
                      alt="Before repair"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-medium text-[#202124] mb-1">
                  Upload "After Repair" Completion Photo <span className="text-[#D93025]">*</span>
                </label>
                {afterPhotoPreview ? (
                  <div className="relative inline-block rounded-lg overflow-hidden border border-[#DADCE0] shadow-sm">
                    <img
                      src={afterPhotoPreview}
                      alt="After repair preview"
                      className="w-48 h-28 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setAfterPhotoFile(null);
                        setAfterPhotoPreview(null);
                      }}
                      className="absolute top-1 right-1 p-1 rounded-full bg-[#D93025] text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="after-photo-upload"
                    className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-[#DADCE0] rounded-lg cursor-pointer hover:border-[#188038]"
                  >
                    <UploadCloud className="w-6 h-6 text-[#5F6368] mb-1" />
                    <span className="font-medium text-[#188038]">Click to select after-repair photo</span>
                    <input
                      id="after-photo-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setAfterPhotoFile(file);
                        const r = new FileReader();
                        r.onload = () => setAfterPhotoPreview(r.result);
                        r.readAsDataURL(file);
                      }}
                      className="sr-only"
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="block font-medium text-[#202124] mb-1">
                  Crew Completion Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  placeholder="e.g. 50 kg bitumen applied, compacted with roller, road reopened..."
                  className="w-full px-3 py-2 rounded-control border border-[#DADCE0] bg-white text-[#202124] outline-none focus:border-[#188038]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVerifyModalIssue(null)}
                  className="px-4 py-2 rounded-control text-[#5F6368] bg-white border border-[#DADCE0] hover:bg-[#F8F9FA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifySubmitting || !afterPhotoFile}
                  className="px-4 py-2 rounded-control text-white bg-[#188038] hover:bg-[#137333] font-medium flex items-center gap-1.5 disabled:opacity-50"
                >
                  {verifySubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>Verify with Gemini</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
