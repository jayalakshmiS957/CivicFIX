import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { departmentsApi } from '../lib/api.js';
import { useToast } from '../hooks/useToast.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { ALLOWED_LOCATIONS } from '../lib/constants.js';
import PriorityBadge from '../components/PriorityBadge.jsx';
import StatusChip from '../components/StatusChip.jsx';
import { ChartBoundary, StackedBarChart } from '../components/charts/index.js';
import {
  Building2,
  Phone,
  Clock,
  MapPin,
  Users,
  Search,
  Filter,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Loader2,
  Wrench,
  Trash2,
  Zap,
  Droplets,
  ShieldCheck,
  Briefcase,
  ExternalLink,
  Navigation,
  X,
} from 'lucide-react';

const SAMPLE_LOCATIONS = [
  { name: 'Gandhipuram', lat: 11.0168, lng: 76.9673 },
  { name: 'RS Puram', lat: 11.0089, lng: 76.9463 },
  { name: 'Peelamedu', lat: 11.0284, lng: 77.0016 },
];

const LOCATION_OPTIONS = ['All Coimbatore', 'Gandhipuram', 'RS Puram', 'Peelamedu'];

/**
 * Great-circle distance between two GPS coordinates in kilometers
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Returns initials from a full name (e.g. "Er. R. Sundaralingam" -> "RS")
 */
function getInitials(name) {
  if (!name) return 'DO';
  const clean = name.replace(/^(Er\.|Dr\.|Thiru|Smt\.)\s*/i, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Map department to an appropriate icon
 */
function getDepartmentIcon(deptId) {
  switch (deptId) {
    case 'dept-pwd':
      return Wrench;
    case 'dept-swm':
      return Trash2;
    case 'dept-eb':
      return Zap;
    case 'dept-wsdb':
      return Droplets;
    case 'dept-mse':
      return ShieldCheck;
    default:
      return Briefcase;
  }
}

export default function DepartmentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const locationParam = searchParams.get('location') || 'All Coimbatore';

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [selectedPriority, setSelectedPriority] = useState('All');

  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const selectedLocation = useMemo(() => {
    const found = LOCATION_OPTIONS.find(
      (opt) => opt.toLowerCase() === locationParam.toLowerCase()
    );
    return found || 'All Coimbatore';
  }, [locationParam]);

  const updateLocation = (newLoc) => {
    const nextParams = new URLSearchParams(searchParams);
    if (!newLoc || newLoc === 'All Coimbatore' || newLoc === 'All') {
      nextParams.delete('location');
    } else {
      nextParams.set('location', newLoc);
    }
    setSearchParams(nextParams);
  };

  // Fetch departments data whenever location query changes
  useEffect(() => {
    let isMounted = true;
    async function fetchDepartments() {
      try {
        setLoading(true);
        setError('');
        const res = await departmentsApi.getAll({
          location: selectedLocation === 'All Coimbatore' ? '' : selectedLocation,
        });
        if (isMounted) {
          if (res && res.departments) {
            setDepartments(res.departments);
          } else {
            setError('Failed to load departments directory.');
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Error connecting to departments service.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    fetchDepartments();
    return () => {
      isMounted = false;
    };
  }, [selectedLocation]);

  // Use device GPS to find nearest of the 3 Coimbatore sample locations
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.', 'info');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        let closest = SAMPLE_LOCATIONS[0].name;
        let minDistance = Infinity;

        SAMPLE_LOCATIONS.forEach((loc) => {
          const d = haversineDistance(latitude, longitude, loc.lat, loc.lng);
          if (d < minDistance) {
            minDistance = d;
            closest = loc.name;
          }
        });

        updateLocation(closest);
        showToast(
          `Detected nearest Coimbatore ward: ${closest} (~${minDistance.toFixed(1)} km)`,
          'success'
        );
        setLocating(false);
      },
      (_err) => {
        setLocating(false);
        showToast('Location permission denied or unavailable.', 'info');
      },
      { timeout: 8000 }
    );
  };

  // Compute aggregate stats across all 6 departments for current location
  const summaryStats = useMemo(() => {
    let totalIssues = 0;
    let openCount = 0;
    let inProgressCount = 0;
    let resolvedCount = 0;
    let overdueCount = 0;

    departments.forEach((d) => {
      const w = d.workload || {};
      totalIssues += w.total || 0;
      openCount += w.open || 0;
      inProgressCount += w.inProgress || 0;
      resolvedCount += w.resolved || 0;
      overdueCount += w.overdue || 0;
    });

    return { totalIssues, openCount, inProgressCount, resolvedCount, overdueCount };
  }, [departments]);

  // Filter departments and their active issues
  const filteredDepartments = useMemo(() => {
    const q = deferredSearchQuery.toLowerCase().trim();

    const result = departments.map((dept) => {
      // Filter issues by priority
      let issues = dept.currentIssues || [];
      if (selectedPriority !== 'All') {
        issues = issues.filter((i) => i.priority === selectedPriority);
      }

      // If user typed in search box, check department info and issue contents
      if (q) {
        const matchesDept =
          dept.name.toLowerCase().includes(q) ||
          dept.shortName.toLowerCase().includes(q) ||
          dept.zone.toLowerCase().includes(q) ||
          dept.officeName.toLowerCase().includes(q) ||
          dept.categories.some((c) => c.toLowerCase().includes(q)) ||
          dept.head?.name?.toLowerCase().includes(q) ||
          dept.officers?.some(
            (o) => o.name.toLowerCase().includes(q) || (o.zone && o.zone.toLowerCase().includes(q))
          );

        if (!matchesDept) {
          issues = issues.filter(
            (i) =>
              i.id.toLowerCase().includes(q) ||
              i.title.toLowerCase().includes(q) ||
              i.locality.toLowerCase().includes(q)
          );
        }
      }

      return {
        ...dept,
        filteredIssues: issues,
      };
    });

    // If location is selected, list departments with active work first,
    // followed by departments that have zero work in that area
    if (selectedLocation !== 'All Coimbatore') {
      result.sort((a, b) => {
        const aWork = (a.filteredIssues?.length || 0) > 0 ? 1 : 0;
        const bWork = (b.filteredIssues?.length || 0) > 0 ? 1 : 0;
        return bWork - aWork;
      });
    }

    return result;
  }, [departments, deferredSearchQuery, selectedPriority, selectedLocation]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Page Header */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#E6F4EA] text-[#188038] border border-[#188038]/30 mb-2">
              <Building2 className="w-3.5 h-3.5" />
              <span>Coimbatore City Municipal Corporation</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-medium font-heading text-[#202124]">
              Municipal Departments & Directory
            </h1>
            <p className="text-sm text-[#5F6368] mt-1 max-w-3xl">
              Live municipal division workloads, responsible field teams, and assigned civic issues triaged by CivicResolve AI across Coimbatore wards.
            </p>
          </div>

          {!isAdmin && (
            <Link
              to="/report"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-control text-sm font-medium text-white bg-[#188038] hover:bg-[#137333] transition-colors shadow-xs"
            >
              <span>Report Civic Issue</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* Aggregate Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4">
          <div className="p-3.5 rounded-card bg-white border border-[#DADCE0] shadow-card">
            <span className="text-[11px] text-[#5F6368] uppercase tracking-wider block">Departments</span>
            <span className="text-xl font-medium font-mono-numbers text-[#202124]">
              {departments.length || 6}
            </span>
          </div>

          <div className="p-3.5 rounded-card bg-white border border-[#DADCE0] shadow-card">
            <span className="text-[11px] text-[#5F6368] uppercase tracking-wider block">Total Workload</span>
            <span className="text-xl font-medium font-mono-numbers text-[#202124]">
              {summaryStats.totalIssues}
            </span>
          </div>

          <div className="p-3.5 rounded-card bg-white border border-[#DADCE0] shadow-card">
            <span className="text-[11px] text-[#B06000] uppercase tracking-wider block">In Progress</span>
            <span className="text-xl font-medium font-mono-numbers text-[#B06000]">
              {summaryStats.inProgressCount}
            </span>
          </div>

          <div className="p-3.5 rounded-card bg-white border border-[#DADCE0] shadow-card">
            <span className="text-[11px] text-[#1E8E3E] uppercase tracking-wider block">Resolved</span>
            <span className="text-xl font-medium font-mono-numbers text-[#1E8E3E]">
              {summaryStats.resolvedCount}
            </span>
          </div>

          <div className="p-3.5 rounded-card bg-white border border-[#DADCE0] shadow-card">
            <span className="text-[11px] text-[#D93025] uppercase tracking-wider block">SLA Overdue</span>
            <span className="text-xl font-medium font-mono-numbers text-[#D93025]">
              {summaryStats.overdueCount}
            </span>
          </div>
        </div>
      </div>

      {/* 1. Location Selector Strip (Top of Page above Search Box) */}
      <div className="bg-white rounded-card p-4 border border-[#DADCE0] shadow-card space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#188038]" />
            <label
              htmlFor="location-selector"
              className="text-xs font-medium text-[#202124] uppercase tracking-wider"
            >
              Choose your location:
            </label>
          </div>

          {/* Optional: Use My Current Location Button */}
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={locating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-medium text-[#188038] bg-[#E6F4EA] hover:bg-[#CDE8D4] transition-colors self-start sm:self-auto disabled:opacity-60"
            title="Detect closest ward using device GPS"
            aria-label="Use my current location"
          >
            {locating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Navigation className="w-3.5 h-3.5" />
            )}
            <span>Use my current location</span>
          </button>
        </div>

        {/* Desktop Segmented Buttons */}
        <div
          role="group"
          aria-label="Choose your location"
          className="hidden md:flex items-center p-1 bg-[#F1F3F4] rounded-lg border border-[#DADCE0] gap-1"
        >
          {LOCATION_OPTIONS.map((loc) => {
            const isSelected = selectedLocation.toLowerCase() === loc.toLowerCase();
            return (
              <button
                key={loc}
                type="button"
                onClick={() => updateLocation(loc)}
                aria-pressed={isSelected}
                className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-all text-center ${
                  isSelected
                    ? 'bg-white text-[#188038] shadow-xs font-semibold'
                    : 'text-[#5F6368] hover:text-[#202124] hover:bg-[#E8EAED]'
                }`}
              >
                {loc}
              </button>
            );
          })}
        </div>

        {/* Mobile Dropdown */}
        <div className="md:hidden">
          <select
            id="location-selector"
            value={selectedLocation}
            onChange={(e) => updateLocation(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-control border border-[#DADCE0] bg-white text-[#202124] focus:outline-none focus:border-[#188038] focus:ring-1 focus:ring-[#188038]"
            aria-label="Choose your location"
          >
            {LOCATION_OPTIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Location Active Notice & Link to Map */}
      {selectedLocation !== 'All Coimbatore' && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg bg-[#E6F4EA] border border-[#188038]/30">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#188038]" />
            <span className="text-sm font-medium text-[#202124]">
              Showing: <strong className="text-[#188038]">{selectedLocation} ward</strong>
            </span>
            <button
              type="button"
              onClick={() => updateLocation('All Coimbatore')}
              className="inline-flex items-center gap-1 text-xs text-[#188038] hover:underline font-medium ml-2 px-2 py-0.5 rounded bg-white border border-[#188038]/20"
              title="Reset location filter to all Coimbatore"
            >
              <X className="w-3 h-3" />
              <span>Clear location</span>
            </button>
          </div>

          <Link
            to={`/map?location=${encodeURIComponent(selectedLocation)}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#188038] hover:text-[#137333] hover:underline"
            title={`View map centered on ${selectedLocation}`}
          >
            <span>Issues in this area</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="bg-white rounded-card p-4 border border-[#DADCE0] shadow-card flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <label htmlFor="dept-search" className="sr-only">
            Search departments, officers, zones, or issue IDs
          </label>
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5F6368]" />
          <input
            id="dept-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${
              selectedLocation !== 'All Coimbatore' ? selectedLocation + ' ' : ''
            }departments, categories, officers, or issues...`}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-control border border-[#DADCE0] bg-white text-[#202124] focus:outline-none focus:border-[#188038] focus:ring-1 focus:ring-[#188038]"
          />
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="w-4 h-4 text-[#5F6368]" />
          <label htmlFor="priority-filter" className="text-xs font-medium text-[#202124]">
            Issue Priority:
          </label>
          <select
            id="priority-filter"
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-2 text-xs rounded-control border border-[#DADCE0] bg-white text-[#202124] focus:outline-none focus:border-[#188038] focus:ring-1 focus:ring-[#188038]"
          >
            <option value="All">All Priorities</option>
            <option value="Critical">Critical Only</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 text-[#188038] animate-spin mx-auto mb-3" />
          <p className="text-sm text-[#5F6368]">
            Loading municipal departments and {selectedLocation} workloads...
          </p>
        </div>
      )}

      {error && !loading && (
        <div className="p-6 rounded-card bg-[#FCE8E6] border border-[#D93025]/30 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-[#D93025] mx-auto" />
          <p className="text-sm text-[#D93025] font-medium">{error}</p>
        </div>
      )}

      {/* Department Workload Stacked Bar Visualization */}
      {!loading && !error && departments.length > 0 && (
        <ChartBoundary title="Department Workload Breakdown">
          <StackedBarChart
            departments={departments}
            selectedLocation={selectedLocation}
            title="Department Workload Breakdown"
            loading={loading}
          />
        </ChartBoundary>
      )}

      {/* Departments Cards Grid */}
      {!loading && !error && (
        <div className="space-y-8">
          {filteredDepartments.map((dept) => {
            const IconComponent = getDepartmentIcon(dept.id);
            const workload = dept.workload || {};
            const activeIssues = dept.filteredIssues || [];
            const hasActiveWork = activeIssues.length > 0;

            return (
              <section
                key={dept.id}
                aria-labelledby={`dept-${dept.id}-title`}
                className={`bg-white rounded-card border shadow-card overflow-hidden transition-all hover:border-[#188038]/40 ${
                  !hasActiveWork && selectedLocation !== 'All Coimbatore'
                    ? 'border-[#DADCE0] opacity-90'
                    : 'border-[#DADCE0]'
                }`}
              >
                {/* Department Header Banner */}
                <div className="p-6 border-b border-[#DADCE0] bg-[#F8F9FA]/60">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#E6F4EA] text-[#188038] flex items-center justify-center shrink-0 shadow-xs">
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2
                            id={`dept-${dept.id}-title`}
                            className="text-xl font-medium font-heading text-[#202124]"
                          >
                            {dept.name}
                          </h2>
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono-numbers font-medium bg-[#E6F4EA] text-[#188038]">
                            {dept.shortName}
                          </span>
                          {selectedLocation !== 'All Coimbatore' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]">
                              {selectedLocation} Ward
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#5F6368] leading-relaxed max-w-2xl">
                          {dept.description}
                        </p>
                      </div>
                    </div>

                    {/* Handled Categories Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
                      <span className="text-[11px] font-medium text-[#5F6368] mr-1 block sm:inline">
                        Categories:
                      </span>
                      {dept.categories.map((cat) => (
                        <span
                          key={cat}
                          className="px-2.5 py-0.5 rounded-full text-xs bg-white border border-[#DADCE0] text-[#202124] shadow-2xs font-medium"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Workload Metric Chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-[#DADCE0]">
                    <div className="p-2.5 rounded-lg bg-white border border-[#DADCE0] flex items-center justify-between">
                      <span className="text-xs text-[#5F6368] font-medium">Open Reports</span>
                      <span className="text-sm font-medium font-mono-numbers text-[#202124]">
                        {workload.open || 0}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-[#DADCE0] flex items-center justify-between">
                      <span className="text-xs text-[#B06000] font-medium">In Progress</span>
                      <span className="text-sm font-medium font-mono-numbers text-[#B06000]">
                        {workload.inProgress || 0}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-[#DADCE0] flex items-center justify-between">
                      <span className="text-xs text-[#1E8E3E] font-medium">Resolved</span>
                      <span className="text-sm font-medium font-mono-numbers text-[#1E8E3E]">
                        {workload.resolved || 0}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-[#DADCE0] flex items-center justify-between">
                      <span className="text-xs text-[#D93025] font-medium">Overdue SLA</span>
                      <span className="text-sm font-medium font-mono-numbers text-[#D93025]">
                        {workload.overdue || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Body: Work List & Directory Split */}
                <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left Column (7 cols): Currently Working On List */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium font-heading text-[#202124] flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-[#188038]" />
                        <span>Currently Working On</span>
                      </h3>
                      <span className="text-xs font-mono-numbers text-[#5F6368]">
                        {activeIssues.length} active {activeIssues.length === 1 ? 'task' : 'tasks'}
                      </span>
                    </div>

                    {activeIssues.length === 0 ? (
                      <div className="p-6 rounded-lg border border-dashed border-[#DADCE0] bg-[#F8F9FA] text-center space-y-1 text-xs text-[#5F6368]">
                        <p className="font-medium text-[#202124]">
                          {selectedLocation !== 'All Coimbatore'
                            ? `No active issues in ${selectedLocation} right now`
                            : 'No active tasks in progress'}
                        </p>
                        <p>
                          {selectedLocation !== 'All Coimbatore'
                            ? `No open or in-progress civic reports currently assigned to this department in ${selectedLocation}.`
                            : 'No open or in-progress civic reports currently assigned to this department matching filters.'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activeIssues.map((issue) => (
                          <Link
                            key={issue.id}
                            to={`/issue/${issue.id}`}
                            className="group block p-3.5 rounded-lg border border-[#DADCE0] bg-white hover:border-[#188038] hover:bg-[#F8F9FA]/50 transition-all shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#188038]"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-1 min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono-numbers font-medium text-xs text-[#188038]">
                                    {issue.id}
                                  </span>
                                  <PriorityBadge priority={issue.priority} />
                                  <StatusChip status={issue.status} size="sm" />
                                </div>
                                <h4 className="text-xs font-medium text-[#202124] group-hover:text-[#188038] transition-colors truncate">
                                  {issue.title}
                                </h4>
                              </div>
                              <ArrowRight className="w-4 h-4 text-[#DADCE0] group-hover:text-[#188038] group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                            </div>

                            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-2.5 pt-2 border-t border-[#DADCE0] text-[11px] text-[#5F6368]">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-[#188038]" />
                                <span>{issue.locality}</span>
                              </span>
                              {issue.crew && (
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3 text-[#5F6368]" />
                                  <span>Crew: {issue.crew}</span>
                                </span>
                              )}
                              {issue.planningScore !== null && issue.planningScore !== undefined && (
                                <span className="font-mono-numbers text-[10px] bg-[#F1F3F4] px-1.5 py-0.5 rounded text-[#202124]">
                                  Score: {Math.round(issue.planningScore)}
                                </span>
                              )}
                              {issue.status === 'In Progress' && (
                                <div className="w-full text-[11px] text-[#188038] font-medium pt-1">
                                  Handled by {issue.handledBy?.crew || issue.crew || 'Municipal Repair Squad'} · {issue.locality || issue.location?.locality || 'Coimbatore'}
                                </div>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Column (5 cols): Municipal Office & Zonal Team */}
                  <div className="lg:col-span-5 space-y-6 lg:border-l lg:border-[#DADCE0] lg:pl-8">
                    {/* Municipal Office Details */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium font-heading text-[#202124] flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#188038]" />
                        <span>
                          {selectedLocation !== 'All Coimbatore'
                            ? `${selectedLocation} Ward Office`
                            : 'Municipal Office'}
                        </span>
                      </h3>

                      <div className="p-3.5 rounded-lg bg-[#F8F9FA] border border-[#DADCE0] text-xs space-y-2">
                        <div className="font-medium text-[#202124]">{dept.officeName}</div>

                        <div className="flex items-start gap-2 text-[#5F6368]">
                          <MapPin className="w-3.5 h-3.5 text-[#188038] shrink-0 mt-0.5" />
                          <span>{dept.address}</span>
                        </div>

                        <div className="flex items-center gap-2 text-[#5F6368]">
                          <Clock className="w-3.5 h-3.5 text-[#188038] shrink-0" />
                          <span>{dept.officeHours}</span>
                        </div>

                        <div className="flex items-center gap-2 text-[#5F6368] pt-1 border-t border-[#DADCE0]">
                          <Phone className="w-3.5 h-3.5 text-[#188038] shrink-0" />
                          <span className="font-mono-numbers font-medium text-[#202124]">
                            {dept.phone}
                          </span>
                          <span className="text-[#DADCE0]">|</span>
                          <span className="text-[#5F6368]">{dept.email}</span>
                        </div>
                      </div>
                    </div>

                    {/* Department Head & Field Officers */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium font-heading text-[#202124] flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#188038]" />
                        <span>
                          {selectedLocation !== 'All Coimbatore'
                            ? `${selectedLocation} Ward Officers`
                            : 'Zonal Leadership & Field Officers'}
                        </span>
                      </h3>

                      {/* Department Head / Zone Officer */}
                      {dept.head && (
                        <div className="p-3 rounded-lg bg-white border border-[#DADCE0] flex items-center gap-3 shadow-2xs">
                          <div className="w-9 h-9 rounded-full bg-[#188038] text-white flex items-center justify-center font-medium text-xs shrink-0 shadow-xs">
                            {getInitials(dept.head.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-[#202124] truncate">
                              {dept.head.name}
                            </div>
                            <div className="text-[11px] text-[#5F6368] truncate">
                              {dept.head.role}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#E6F4EA] text-[#188038] shrink-0">
                            {dept.head.zone || selectedLocation}
                          </span>
                        </div>
                      )}

                      {/* 3 Field Officers */}
                      <div className="space-y-2">
                        {dept.officers?.map((officer, oIdx) => (
                          <div
                            key={oIdx}
                            className="p-2.5 rounded-lg bg-[#F8F9FA] border border-[#DADCE0] flex items-center gap-2.5 text-xs"
                          >
                            <div className="w-7 h-7 rounded-full bg-[#DADCE0] text-[#202124] flex items-center justify-center font-medium text-[11px] shrink-0">
                              {getInitials(officer.name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-[#202124] truncate">
                                {officer.name}
                              </div>
                              <div className="text-[10px] text-[#5F6368] truncate">
                                {officer.role}
                              </div>
                            </div>
                            <span className="text-[10px] font-medium text-[#5F6368] bg-white px-2 py-0.5 rounded border border-[#DADCE0] shrink-0">
                              {officer.zone || selectedLocation}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Demonstration Note at Bottom */}
      <footer className="pt-6 border-t border-[#DADCE0] text-center text-xs text-[#5F6368] space-y-1">
        <p className="font-medium text-[#202124]">
          Sample directory data for demonstration purposes.
        </p>
        <p className="text-[11px] text-[#5F6368]">
          CivicResolve platform simulation. All municipal personnel designations, telephone numbers, and zonal assignments are fictional representations created for platform evaluation.
        </p>
      </footer>
    </div>
  );
}
