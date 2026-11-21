import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { issuesApi } from '../lib/api.js';
import { CATEGORIES, PRIORITIES, STATUSES, COIMBATORE_CENTER } from '../lib/constants.js';
import { createCivicMarkerIcon } from '../lib/leafletIcons.js';
import PriorityBadge from '../components/PriorityBadge.jsx';
import StatusChip from '../components/StatusChip.jsx';
import CivicHeatmap, { RankedLocalityTable } from '../components/CivicHeatmap.jsx';
import {
  MapPin,
  Search,
  ExternalLink,
  Loader2,
  Info,
  Flame,
} from 'lucide-react';

const LOCATION_COORDS = {
  Gandhipuram: { lat: 11.0168, lng: 76.9673 },
  'RS Puram': { lat: 11.0089, lng: 76.9463 },
  Peelamedu: { lat: 11.0284, lng: 77.0016 },
};

function MapController({ selectedCoords }) {
  const map = useMap();
  useEffect(() => {
    if (selectedCoords) {
      map.flyTo([selectedCoords.lat, selectedCoords.lng], 15, { duration: 1.0 });
    }
  }, [selectedCoords, map]);
  return null;
}

export default function CivicMapPage() {
  const [searchParams] = useSearchParams();
  const locationParam = searchParams.get('location') || '';

  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');
  const [searchQuery, setSearchQuery] = useState(locationParam);

  // Selected coords for panning
  const [selectedIssue, setSelectedIssue] = useState(() => {
    if (locationParam && LOCATION_COORDS[locationParam]) {
      return LOCATION_COORDS[locationParam];
    }
    return null;
  });
  const [showLegend, setShowLegend] = useState(true);
  const [viewMode, setViewMode] = useState('pins'); // 'pins' | 'heatmap'
  const [sideTab, setSideTab] = useState('list'); // 'list' | 'localities'

  useEffect(() => {
    async function loadIssues() {
      try {
        setLoading(true);
        const res = await issuesApi.getAll();
        if (res.issues) {
          setIssues(res.issues);
        }
      } catch (err) {
        console.warn('Failed to load issues for map:', err);
      } finally {
        setLoading(false);
      }
    }
    loadIssues();
  }, []);

  const localityAnalytics = useMemo(() => {
    const locMap = {};
    issues.forEach((iss) => {
      const loc = iss.location?.locality || 'Central Ward';
      if (!locMap[loc]) {
        locMap[loc] = {
          locality: loc,
          total: 0,
          pending: 0,
          resolved: 0,
          totalResolveHours: 0,
          lats: [],
          lngs: [],
        };
      }
      locMap[loc].total += 1;
      if (iss.location?.latitude && iss.location?.longitude) {
        locMap[loc].lats.push(iss.location.latitude);
        locMap[loc].lngs.push(iss.location.longitude);
      }
      if (iss.status === 'Resolved') {
        locMap[loc].resolved += 1;
        const created = new Date(iss.createdAt).getTime();
        const resolvedStep = (iss.timeline || []).find((t) => t.status === 'Resolved');
        if (resolvedStep) {
          const resTime = new Date(resolvedStep.timestamp).getTime();
          locMap[loc].totalResolveHours += Math.max(1, (resTime - created) / (1000 * 3600));
        } else {
          locMap[loc].totalResolveHours += 24;
        }
      } else {
        locMap[loc].pending += 1;
      }
    });

    return Object.values(locMap)
      .map((entry) => {
        const avgLat = entry.lats.length > 0 ? entry.lats.reduce((a, b) => a + b, 0) / entry.lats.length : COIMBATORE_CENTER.lat;
        const avgLng = entry.lngs.length > 0 ? entry.lngs.reduce((a, b) => a + b, 0) / entry.lngs.length : COIMBATORE_CENTER.lng;
        const avgResolve = entry.resolved > 0 ? Math.round(entry.totalResolveHours / entry.resolved) : 0;
        return {
          locality: entry.locality,
          total: entry.total,
          pending: entry.pending,
          resolved: entry.resolved,
          avgResolveHours: avgResolve,
          latitude: avgLat,
          longitude: avgLng,
        };
      })
      .sort((a, b) => b.pending - a.pending);
  }, [issues]);

  const filteredIssues = useMemo(() => {
    return issues.filter((iss) => {
      if (selectedStatus !== 'All' && iss.status !== selectedStatus) return false;
      if (selectedCategory !== 'All' && iss.category !== selectedCategory) return false;
      if (selectedPriority !== 'All' && iss.priority !== selectedPriority) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = iss.title?.toLowerCase().includes(q);
        const matchLoc = iss.location?.locality?.toLowerCase().includes(q) || iss.location?.address?.toLowerCase().includes(q);
        const matchId = iss.id?.toLowerCase().includes(q);
        if (!matchTitle && !matchLoc && !matchId) return false;
      }
      return true;
    });
  }, [issues, selectedStatus, selectedCategory, selectedPriority, searchQuery]);

  const handleIssueSelect = (issue) => {
    if (!issue.location?.latitude || !issue.location?.longitude) return;
    setSelectedIssue({
      lat: issue.location.latitude,
      lng: issue.location.longitude,
      id: issue.id,
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Top Filter Bar */}
      <div className="bg-white border-b border-[#DADCE0] p-3 sm:px-6 z-30 shrink-0 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Title & Count */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E6F4EA] text-[#188038] flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-medium font-heading text-[#202124] leading-tight">
                Civic Map
              </h1>
              <p className="text-[11px] text-[#5F6368] font-mono-numbers">
                Showing {filteredIssues.length} of {issues.length} active complaints
              </p>
            </div>
          </div>

          {/* Filter Dropdowns and Search */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Search */}
            <div className="relative min-w-[160px] sm:w-48 flex-1 sm:flex-none">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search location or ID..."
                className="w-full pl-7 pr-3 py-1.5 text-xs rounded-control border border-[#DADCE0] bg-white text-[#202124] focus:border-[#188038] outline-none"
              />
              <Search className="w-3.5 h-3.5 text-[#5F6368] absolute left-2 top-2 pointer-events-none" />
            </div>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="py-1.5 px-2.5 rounded-control border border-[#DADCE0] bg-white text-[#202124]"
              aria-label="Filter by Status"
            >
              <option value="All">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="py-1.5 px-2.5 rounded-control border border-[#DADCE0] bg-white text-[#202124]"
              aria-label="Filter by Priority"
            >
              <option value="All">All Priorities</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="py-1.5 px-2.5 rounded-control border border-[#DADCE0] bg-white text-[#202124]"
              aria-label="Filter by Category"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* View Mode Toggle: Pins vs Civic Heatmap */}
            <div className="flex items-center rounded-control bg-[#F1F3F4] p-0.5 border border-[#DADCE0] ml-auto sm:ml-0">
              <button
                type="button"
                onClick={() => {
                  setViewMode('pins');
                  setSideTab('list');
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  viewMode === 'pins'
                    ? 'bg-white text-[#188038] shadow-xs'
                    : 'text-[#5F6368] hover:text-[#202124]'
                }`}
                aria-pressed={viewMode === 'pins'}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Pins</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('heatmap');
                  setSideTab('localities');
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  viewMode === 'heatmap'
                    ? 'bg-[#D93025] text-white shadow-xs'
                    : 'text-[#5F6368] hover:text-[#202124]'
                }`}
                aria-pressed={viewMode === 'heatmap'}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Civic Heatmap</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main View: Split Map and Accessible List */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Leaflet Map Pane */}
        <div className="flex-1 h-[50vh] md:h-full relative z-10">
          {loading ? (
            <div className="h-full flex items-center justify-center bg-[#F8F9FA]">
              <Loader2 className="w-8 h-8 text-[#188038] animate-spin" />
            </div>
          ) : (
            <MapContainer
              center={[COIMBATORE_CENTER.lat, COIMBATORE_CENTER.lng]}
              zoom={13}
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapController selectedCoords={selectedIssue} />

              {/* View Mode: Civic Heatmap Density Circles */}
              {viewMode === 'heatmap' && (
                <CivicHeatmap
                  localityAnalytics={localityAnalytics}
                  onSelectLocality={(loc) =>
                    setSelectedIssue({ lat: loc.latitude, lng: loc.longitude })
                  }
                />
              )}

              {/* View Mode: Pin Markers */}
              {viewMode === 'pins' &&
                filteredIssues.map((issue) => {
                  const lat = issue.location?.latitude;
                  const lng = issue.location?.longitude;
                  if (!lat || !lng) return null;

                  const markerIcon = createCivicMarkerIcon(issue.priority, issue.status);

                  return (
                    <Marker
                      key={issue.id}
                      position={[lat, lng]}
                      icon={markerIcon}
                    >
                      <Popup maxWidth={300} minWidth={240}>
                        <div className="p-1 space-y-2 text-xs">
                          {issue.imageUrl && (
                            <div className="h-28 rounded-md overflow-hidden bg-[#F8F9FA]">
                              <img
                                src={issue.imageUrl}
                                alt={issue.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono-numbers font-medium text-[#188038]">
                              {issue.id}
                            </span>
                            <PriorityBadge priority={issue.priority} size="sm" />
                          </div>
                          <h4 className="font-medium text-[#202124] text-sm leading-snug line-clamp-2">
                            {issue.title}
                          </h4>
                          <div className="flex items-center justify-between text-[11px] text-[#5F6368] pt-1 border-t border-[#DADCE0]">
                            <StatusChip status={issue.status} size="sm" />
                            <span className="truncate max-w-[110px]">{issue.location?.locality}</span>
                          </div>
                          <Link
                            to={`/issue/${issue.id}`}
                            className="mt-2 block w-full py-1.5 px-3 text-center text-xs font-medium text-white bg-[#188038] hover:bg-[#137333] rounded-control transition-colors"
                          >
                            View Full Details &rarr;
                          </Link>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
            </MapContainer>
          )}

          {/* Interactive Accessible Legend Overlay */}
          <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md rounded-card p-3 border border-[#DADCE0] shadow-card text-xs max-w-xs transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium font-heading text-[#202124] flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#188038]" />
                <span>{viewMode === 'heatmap' ? 'Heatmap Density' : 'Map Legend'}</span>
              </span>
              <button
                onClick={() => setShowLegend(!showLegend)}
                className="text-[#5F6368] hover:text-[#202124] text-[11px]"
              >
                {showLegend ? 'Hide' : 'Show'}
              </button>
            </div>

            {showLegend && (
              viewMode === 'heatmap' ? (
                <div className="space-y-1.5 text-[11px] text-[#5F6368]">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#D93025] opacity-80" />
                    <span><strong>Critical Hotspot</strong> (4+ unresolved)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#E8710A] opacity-80" />
                    <span><strong>High Concentration</strong> (2-3 unresolved)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#188038] opacity-80" />
                    <span><strong>Moderate Density</strong> (1 unresolved)</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 text-[11px] text-[#5F6368]">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-sm bg-[#D93025] flex items-center justify-center text-white text-[9px] font-bold">!</span>
                    <span><strong>Critical</strong> (Red Octagon)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rotate-45 bg-[#E8710A] shrink-0" />
                    <span><strong>High</strong> (Orange Diamond)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#188038]" />
                    <span><strong>Medium</strong> (Blue Circle)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#1E8E3E] flex items-center justify-center text-white text-[9px] font-bold">&#10003;</span>
                    <span><strong>Resolved</strong> (Green Shield)</span>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Accessible Side Pane */}
        <div className="w-full md:w-96 h-[50vh] md:h-full bg-white border-t md:border-t-0 md:border-l border-[#DADCE0] flex flex-col z-20">
          <div className="p-2 border-b border-[#DADCE0] bg-[#F8F9FA] flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSideTab('list')}
                className={`px-3 py-1.5 rounded-control text-xs font-medium transition-colors ${
                  sideTab === 'list'
                    ? 'bg-white text-[#188038] shadow-xs'
                    : 'text-[#5F6368] hover:text-[#202124]'
                }`}
              >
                Complaints ({filteredIssues.length})
              </button>
              <button
                type="button"
                onClick={() => setSideTab('localities')}
                className={`px-3 py-1.5 rounded-control text-xs font-medium transition-colors ${
                  sideTab === 'localities'
                    ? 'bg-white text-[#188038] shadow-xs'
                    : 'text-[#5F6368] hover:text-[#202124]'
                }`}
              >
                Ranked Wards ({localityAnalytics.length})
              </button>
            </div>
          </div>

          {sideTab === 'localities' ? (
            <div className="flex-1 overflow-y-auto p-2">
              <RankedLocalityTable
                localityAnalytics={localityAnalytics}
                onSelectLocality={(loc) => setSelectedIssue({ lat: loc.latitude, lng: loc.longitude })}
              />
            </div>
          ) : (
            <div
              className="flex-1 overflow-y-auto divide-y divide-[#DADCE0] p-2 space-y-1"
              role="list"
              aria-label="List of civic issues on map"
            >
              {filteredIssues.length === 0 ? (
                <div className="p-8 text-center text-[#5F6368] text-xs">
                  No civic issues match the selected filter criteria.
                </div>
              ) : (
                filteredIssues.map((issue) => (
                  <div
                    key={issue.id}
                    onClick={() => handleIssueSelect(issue)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-[#F8F9FA] ${
                      selectedIssue?.id === issue.id
                        ? 'bg-[#E6F4EA] border border-[#188038]/40'
                        : ''
                    }`}
                    role="listitem"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') handleIssueSelect(issue);
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono-numbers font-medium text-xs text-[#188038]">
                        {issue.id}
                      </span>
                      <PriorityBadge priority={issue.priority} size="sm" />
                    </div>

                    <h3 className="text-xs font-medium text-[#202124] line-clamp-1">
                      {issue.title}
                    </h3>

                    <p className="text-[11px] text-[#5F6368] truncate mt-0.5">
                      {issue.location?.locality} • {issue.department}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <StatusChip status={issue.status} size="sm" />
                      <Link
                        to={`/issue/${issue.id}`}
                        className="text-[#188038] font-medium hover:underline inline-flex items-center gap-1"
                      >
                        <span>Details</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
