import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { issuesApi } from '../lib/api.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';
import { formatDate, copyToClipboard } from '../lib/utils.js';
import PriorityBadge from '../components/PriorityBadge.jsx';
import StatusChip from '../components/StatusChip.jsx';
import CivicVoiceActions from '../components/CivicVoiceActions.jsx';
import TrustScoreBadge from '../components/TrustScoreBadge.jsx';
import ResolutionVerificationCard from '../components/ResolutionVerificationCard.jsx';
import { createCivicMarkerIcon } from '../lib/leafletIcons.js';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import {
  ShieldAlert,
  MapPin,
  Building,
  Building2,
  User,
  Users,
  Check,
  Send,
  Loader2,
  Calendar,
  AlertCircle,
  Activity,
  ArrowLeft,
  Share2,
  HardHat,
  Clock,
  Phone,
  Info,
  ExternalLink,
} from 'lucide-react';

export default function ComplaintDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Follow-up answer state
  const [citizenNote, setCitizenNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  useEffect(() => {
    async function loadIssue() {
      try {
        setLoading(true);
        const res = await issuesApi.getById(id);
        if (res && res.issue) {
          setIssue(res.issue);
        } else {
          setError('Issue not found');
        }
      } catch (err) {
        setError(err.message || 'Failed to load complaint details.');
      } finally {
        setLoading(false);
      }
    }
    loadIssue();
  }, [id]);

  const handleCopyLink = async () => {
    const ok = await copyToClipboard(window.location.href);
    if (ok) {
      setCopied(true);
      showToast('Complaint link copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCitizenNoteSubmit = async (e) => {
    e.preventDefault();
    if (!citizenNote.trim()) return;

    setSubmittingNote(true);
    try {
      const res = await issuesApi.submitFollowUp(id, citizenNote.trim());
      if (res && res.issue) {
        setIssue(res.issue);
      }
      setCitizenNote('');
      showToast('Your update was appended to the issue audit timeline.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to submit comment.', 'error');
    } finally {
      setSubmittingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <Loader2 className="w-8 h-8 text-[#188038] animate-spin mx-auto mb-3" />
        <p className="text-sm text-[#5F6368]">Loading complaint details...</p>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-[#FCE8E6] text-[#D93025] flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-medium font-heading text-[#202124]">
          Complaint Not Found
        </h1>
        <p className="text-sm text-[#5F6368]">
          The requested complaint identifier "{id}" does not exist or may have been archived.
        </p>
        <Link
          to="/map"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-control text-sm font-medium text-white bg-[#188038] hover:bg-[#137333]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Civic Map</span>
        </Link>
      </div>
    );
  }

  const ai = issue.aiAnalysis || {};
  const lat = Number(issue.location?.latitude) || 11.0168;
  const lng = Number(issue.location?.longitude) || 76.9673;
  const priority = issue.priority || 'Medium';
  const status = issue.status || 'Reported';
  const markerIcon = createCivicMarkerIcon(priority, status);

  // Safe planning score computation
  const scoreS =
    typeof issue.planningScore === 'object' && issue.planningScore !== null
      ? (issue.planningScore.S ?? '—')
      : (issue.planningScore ?? (issue.planningBreakdown?.combinedScore ?? '—'));

  const scoreA =
    issue.planningBreakdown?.severityScore ??
    issue.planningBreakdown?.A ??
    (typeof issue.planningScore === 'object' ? issue.planningScore?.A : null) ??
    ai.severity_score ??
    50;

  const scoreC =
    issue.planningBreakdown?.communityImpactScore ??
    issue.planningBreakdown?.C ??
    (typeof issue.planningScore === 'object' ? issue.planningScore?.C : null) ??
    (typeof issue.communityImpact === 'number'
      ? issue.communityImpact
      : issue.communityImpact?.score ?? issue.communityImpactScore ?? 0);

  const scoreP =
    issue.planningBreakdown?.safetyImpactScore ??
    issue.planningBreakdown?.P ??
    (typeof issue.planningScore === 'object' ? issue.planningScore?.P : null) ??
    ai.safety_impact_score ??
    50;

  const scoreT =
    issue.planningBreakdown?.daysUnresolvedScore ??
    issue.planningBreakdown?.T ??
    (typeof issue.planningScore === 'object' ? issue.planningScore?.T : null) ??
    0;

  const impactBand =
    issue.planningBreakdown?.impactBand ??
    issue.planningBreakdown?.impactLabel ??
    (typeof issue.planningScore === 'object' ? issue.planningScore?.impactLabel : null) ??
    'Standard';

  const assignedCrew =
    issue.handledBy?.crew ||
    issue.workAssignment?.crew ||
    issue.workAssignment?.assignedTo ||
    issue.workOrder?.assignedTo ||
    null;

  const handledBy = issue.handledBy || {
    department: issue.department || 'Public Works Department',
    category: issue.category || 'Roads & Potholes',
    crew: assignedCrew || `${issue.department || 'PWD'} Road Repair Squad`,
    officer: {
      name: issue.workAssignment?.officer?.name || issue.workAssignment?.officerName || 'Er. K. Natarajan (Fictional)',
      role: issue.workAssignment?.officer?.role || issue.workAssignment?.officerRole || 'Ward Executive Engineer',
    },
    office: {
      name: `${issue.location?.locality || 'Gandhipuram'} Ward Municipal Office`,
      address: `${issue.location?.locality || 'Gandhipuram'}, Coimbatore - 641001`,
      hours: 'Mon-Sat 10:00 AM to 5:45 PM',
      phone: '0422-XXXX100',
    },
    locality: issue.location?.locality || 'Gandhipuram',
    landmark: issue.location?.landmark || '',
    assignedAt: issue.workAssignment?.assignedAt || issue.createdAt,
    note: issue.workAssignment?.notes || '',
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      {/* Top Breadcrumb & Share Nav */}
      <div className="flex items-center justify-between text-xs text-[#5F6368]">
        <Link to="/map" className="inline-flex items-center gap-1.5 text-[#188038] hover:underline font-medium">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Civic Map</span>
        </Link>
        <button
          onClick={handleCopyLink}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-control bg-white border border-[#DADCE0] text-[#202124] hover:bg-[#F8F9FA] transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-[#1E8E3E]" /> : <Share2 className="w-3.5 h-3.5" />}
          <span>Share Public Link</span>
        </button>
      </div>

      {/* Main Header Card */}
      <div className="bg-white rounded-card p-6 sm:p-8 border border-[#DADCE0] shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono-numbers font-medium text-lg text-[#188038]">
              {issue.id}
            </span>
            <span className="text-[#DADCE0]">|</span>
            <span className="text-xs font-medium text-[#5F6368]">
              {issue.category || 'Other'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <PriorityBadge priority={priority} size="md" />
            <StatusChip status={status} size="md" />
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-medium font-heading text-[#202124] leading-tight">
          {issue.title}
        </h1>

        <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs text-[#5F6368] border-t border-[#DADCE0] pt-3">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-[#5F6368]" />
            <span>Reporter: <strong className="text-[#202124]">{issue.reporter?.name || 'Citizen'}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-[#5F6368]" />
            <span>Assigned: <strong className="text-[#202124]">{issue.department || 'General Administration'}</strong></span>
          </div>
          {assignedCrew && (
            <div className="flex items-center gap-1.5">
              <HardHat className="w-3.5 h-3.5 text-[#188038]" />
              <span>Assigned Crew: <strong className="text-[#202124]">{assignedCrew}</strong></span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#5F6368]" />
            <span>Submitted: <strong className="text-[#202124] font-mono-numbers">{issue.createdAt ? formatDate(issue.createdAt) : 'Recently'}</strong></span>
          </div>
        </div>
      </div>

      {/* Handled By Municipal Team & Ward Office Card */}
      {status === 'Reported' ? (
        <div className="bg-[#F8F9FA] rounded-card p-5 border border-[#DADCE0] shadow-card flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#E6F4EA] text-[#188038] flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-medium font-heading text-[#202124]">
              Awaiting assignment to {issue.department || 'responsible municipal division'}
            </h3>
            <p className="text-xs text-[#5F6368] leading-relaxed">
              Report received and verified by CivicResolve AI. Municipal dispatch officers review open complaints to schedule field response crews based on priority triage.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-card p-6 border border-[#DADCE0] shadow-card space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#DADCE0]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E6F4EA] text-[#188038] flex items-center justify-center shrink-0">
                <HardHat className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-[#188038] block">
                  Responsible Municipal Unit
                </span>
                <h2 className="text-lg font-medium font-heading text-[#202124]">
                  Handled by: {handledBy.crew}
                </h2>
              </div>
            </div>
            <Link
              to={`/departments?location=${encodeURIComponent(handledBy.locality)}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#188038] hover:underline"
            >
              <span>View department page</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
            {/* Col 1: Division & Crew */}
            <div className="space-y-2">
              <span className="text-[11px] font-medium text-[#5F6368] uppercase tracking-wider block">
                Division & Field Team
              </span>
              <div className="space-y-1">
                <div className="font-medium text-[#202124] text-sm">{handledBy.department}</div>
                <div className="text-[#5F6368]">
                  Category: <span className="text-[#202124] font-medium">{handledBy.category}</span>
                </div>
                <div className="text-[#188038] font-medium flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-[#188038]" />
                  <span>Assigned Crew: {handledBy.crew}</span>
                </div>
                {handledBy.assignedAt && (
                  <div className="text-[11px] text-[#5F6368] font-mono-numbers">
                    Assigned on: {formatDate(handledBy.assignedAt)}
                  </div>
                )}
              </div>
            </div>

            {/* Col 2: Officer in Charge & Ward Office */}
            <div className="space-y-2">
              <span className="text-[11px] font-medium text-[#5F6368] uppercase tracking-wider block">
                Officer & Ward Office
              </span>
              <div className="space-y-1">
                <div className="font-medium text-[#202124]">{handledBy.officer.name}</div>
                <div className="text-[11px] text-[#5F6368]">{handledBy.officer.role}</div>
                <div className="pt-1.5 border-t border-[#DADCE0] text-[11px] space-y-0.5">
                  <div className="font-medium text-[#202124]">{handledBy.office.name}</div>
                  <div className="text-[#5F6368] truncate">{handledBy.office.address}</div>
                  <div className="text-[#5F6368] flex items-center gap-2">
                    <span>{handledBy.office.hours}</span>
                    <span>•</span>
                    <span className="font-mono-numbers">{handledBy.office.phone}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Col 3: Work Site & Work Order Directives */}
            <div className="space-y-2">
              <span className="text-[11px] font-medium text-[#5F6368] uppercase tracking-wider block">
                Work Site & Directives
              </span>
              <div className="space-y-1">
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#188038] shrink-0 mt-0.5" />
                  <a href="#location-map" className="text-[#188038] hover:underline font-medium">
                    {handledBy.locality}{handledBy.landmark ? ` • ${handledBy.landmark}` : ''}
                  </a>
                </div>
                {handledBy.note ? (
                  <p className="text-[11px] text-[#5F6368] bg-[#F8F9FA] p-2.5 rounded-lg border border-[#DADCE0] mt-1">
                    <strong>Work Note:</strong> {handledBy.note}
                  </p>
                ) : (
                  <p className="text-[11px] text-[#5F6368] italic">
                    Standard operating repair protocol initiated.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#DADCE0] flex items-center justify-between text-[11px] text-[#5F6368]">
            <span className="italic flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-[#5F6368]" />
              Sample directory data for demonstration purposes.
            </span>
            <span className="font-mono-numbers">
              Status: <strong className="text-[#202124]">{status}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Safety Override Notice if Critical */}
      {priority === 'Critical' && (
        <div className="flex items-center gap-3 p-4 rounded-card bg-[#FCE8E6] border-2 border-[#D93025] text-[#D93025]">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <div className="text-xs">
            <span className="font-semibold uppercase tracking-wider block">Immediate Escalation Flag</span>
            <span>Safety Priority is Critical. Pinned to the top of the municipal response queue with 24-hour SLA regardless of community vote volume.</span>
          </div>
        </div>
      )}

      {/* CivicVoice Community Actions & Impact Score */}
      <div className="bg-white rounded-card p-5 border border-[#DADCE0] shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CivicVoiceActions
            issueId={issue.id}
            reporterId={issue.reporter?.id}
            initialSupportsCount={issue.supportsCount ?? issue.supportCount ?? 0}
            communityImpactScore={
              typeof issue.communityImpact === 'number'
                ? issue.communityImpact
                : (issue.communityImpact?.score ?? issue.communityImpactScore ?? 0)
            }
            initialSharesCount={issue.sharesCount ?? 0}
            initialIsSupported={Boolean(issue.isSupportedByMe)}
            issueTitle={issue.title || ''}
            issueDescription={issue.description || ''}
          />
          {issue.trustScore !== undefined && (
            <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#DADCE0]">
              <span className="text-xs text-[#5F6368] font-medium">Verification Credibility:</span>
              <TrustScoreBadge trustScore={issue.trustScore} />
            </div>
          )}
        </div>
      </div>

      {/* Media and Location Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Photo Evidence Card */}
        <div className="bg-white rounded-card p-5 border border-[#DADCE0] shadow-card flex flex-col justify-between">
          <h3 className="text-sm font-medium font-heading text-[#202124] mb-3">
            Photographic Evidence
          </h3>
          {issue.imageUrl ? (
            <div className="rounded-lg overflow-hidden border border-[#DADCE0] aspect-video bg-[#F8F9FA]">
              <img
                src={issue.imageUrl}
                alt={`Photo evidence for ${issue.title}`}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="rounded-lg border-2 border-dashed border-[#DADCE0] p-8 text-center flex flex-col items-center justify-center text-[#5F6368] h-52">
              <ShieldAlert className="w-10 h-10 mb-2 opacity-40 text-[#5F6368]" />
              <p className="text-xs font-medium">No photo uploaded with report</p>
              <p className="text-[11px] text-[#5F6368] mt-0.5">
                Evaluated via detailed text description and geolocation data.
              </p>
            </div>
          )}
        </div>

        {/* Map Location Card */}
        <div className="bg-white rounded-card p-5 border border-[#DADCE0] shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium font-heading text-[#202124]">
              Incident Location
            </h3>
            <span className="text-xs font-mono-numbers text-[#5F6368]">
              {lat.toFixed(4)}, {lng.toFixed(4)}
            </span>
          </div>

          <div className="h-44 rounded-lg overflow-hidden border border-[#DADCE0]">
            <MapContainer
              center={[lat, lng]}
              zoom={15}
              scrollWheelZoom={false}
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[lat, lng]} icon={markerIcon}>
                <Popup>
                  <div className="text-xs">
                    <strong>{issue.id}</strong>
                    <p>{issue.location?.locality || 'Coimbatore'}</p>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          </div>

          <div className="text-xs text-[#5F6368] space-y-1 pt-1">
            <div className="flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#188038] shrink-0 mt-0.5" />
              <span><strong>Address:</strong> {issue.location?.address || 'Coimbatore street'}</span>
            </div>
            {issue.location?.landmark && (
              <p className="pl-5 text-[#5F6368]">
                Landmark: {issue.location.landmark} ({issue.location?.locality || 'Coimbatore'})
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Description & AI Intelligence Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Full Citizen Report Text */}
        <div className="md:col-span-2 bg-white rounded-card p-6 border border-[#DADCE0] shadow-card space-y-4">
          <h3 className="text-base font-medium font-heading text-[#202124]">
            Detailed Issue Report
          </h3>
          <p className="text-sm text-[#202124] leading-relaxed whitespace-pre-line">
            {issue.description}
          </p>

          {/* Add citizen update form */}
          <div className="pt-4 border-t border-[#DADCE0]">
            <h4 className="text-xs font-medium text-[#202124] uppercase tracking-wider mb-2">
              Citizen Clarification / Field Update
            </h4>
            <form onSubmit={handleCitizenNoteSubmit} className="flex gap-2">
              <input
                type="text"
                value={citizenNote}
                onChange={(e) => setCitizenNote(e.target.value)}
                placeholder="Append latest ground observations or landmark note..."
                className="flex-1 px-3 py-2 text-xs rounded-control border border-[#DADCE0] bg-white text-[#202124] focus:border-[#188038] focus:ring-1 focus:ring-[#188038] outline-none"
              />
              <button
                type="submit"
                disabled={submittingNote || !citizenNote.trim()}
                className="px-4 py-2 rounded-control text-xs font-medium text-white bg-[#188038] hover:bg-[#137333] disabled:opacity-50 flex items-center gap-1.5 transition-colors"
              >
                {submittingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Update</span>
              </button>
            </form>
          </div>
        </div>

        {/* AI Analysis Assessment Card */}
        <div className="bg-[#F8F9FA] rounded-card p-5 border border-[#DADCE0] shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium font-heading text-[#202124]">
              AI Analysis Matrix
            </h3>
            <span className="text-[10px] font-mono-numbers px-2 py-0.5 rounded bg-[#E6F4EA] text-[#188038]">
              {ai.aiSource === 'fallback' ? 'Rules' : 'Gemini 2.5'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2.5 rounded-lg bg-white border border-[#DADCE0]">
              <span className="text-[10px] text-[#5F6368] uppercase font-medium">Severity</span>
              <div className="text-xl font-medium font-mono-numbers text-[#202124]">
                {scoreA}<span className="text-xs text-[#5F6368]">/100</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-white border border-[#DADCE0]">
              <span className="text-[10px] text-[#5F6368] uppercase font-medium">Safety Impact</span>
              <div className="text-xl font-medium font-mono-numbers text-[#202124]">
                {scoreP}<span className="text-xs text-[#5F6368]">/100</span>
              </div>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-medium text-[#5F6368] uppercase tracking-wider block mb-1">
              Damage Detected
            </span>
            <p className="text-xs text-[#202124] leading-relaxed">
              {ai.damage_detected || 'Physical wear or civic hazard identified.'}
            </p>
          </div>

          <div>
            <span className="text-[11px] font-medium text-[#5F6368] uppercase tracking-wider block mb-1">
              Priority Reasoning
            </span>
            <p className="text-xs text-[#5F6368] leading-relaxed">
              {ai.priority_reason || 'Triaged according to standard municipal guidelines.'}
            </p>
          </div>

          {ai.affects_accessibility && (
            <div className="p-2.5 rounded-lg bg-[#FEF7E0] border border-[#F9AB00]/40 text-xs text-[#B06000] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#F9AB00] shrink-0" />
              <span>Direct accessibility obstruction for pedestrians or wheelchair users.</span>
            </div>
          )}

          {/* Dual Planning Score Formula breakdown */}
          <div className="pt-3 border-t border-[#DADCE0] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#202124] uppercase tracking-wider">
                Planning Score S
              </span>
              <span className="font-mono-numbers font-medium text-sm text-[#188038]">
                {scoreS} / 100
              </span>
            </div>
            <div className="text-[10px] text-[#5F6368] font-mono-numbers bg-white border border-[#DADCE0] p-2 rounded">
              S = 0.35·A({scoreA}) + 0.25·C({scoreC}) + 0.25·P({scoreP}) + 0.15·T({scoreT})
            </div>
            <span className="text-[10px] text-[#5F6368] block">
              Band: <strong className="text-[#202124]">{impactBand}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* AI Resolution Verification Card */}
      <ResolutionVerificationCard
        issue={issue}
        onIssueUpdated={(updated) => setIssue(updated)}
      />

      {/* Transparent Audit Timeline */}
      <div className="bg-white rounded-card p-6 border border-[#DADCE0] shadow-card space-y-6">
        <div>
          <h3 className="text-lg font-medium font-heading text-[#202124]">
            Status Audit Timeline
          </h3>
          <p className="text-xs text-[#5F6368] mt-0.5">
            Official chronological history from initial report to verified municipal completion.
          </p>
        </div>

        <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#DADCE0]">
          {(issue.timeline || []).map((step, idx) => {
            let dotColor = 'bg-[#5F6368]';
            if (step.status === 'In Progress') dotColor = 'bg-[#F9AB00] ring-4 ring-[#FEF7E0]';
            if (step.status === 'Resolved') dotColor = 'bg-[#1E8E3E] ring-4 ring-[#E6F4EA]';
            if (step.status === 'Pending Review') dotColor = 'bg-[#188038] ring-4 ring-[#E6F4EA]';
            if (step.status === 'Reopened') dotColor = 'bg-[#D93025] ring-4 ring-[#FCE8E6]';

            return (
              <div key={idx} className="relative">
                <span className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full ${dotColor}`} />
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusChip status={step.status || 'Reported'} size="sm" />
                    <span className="text-xs font-medium text-[#202124]">
                      {step.author || 'Municipal Staff'}
                    </span>
                    <span className="text-xs text-[#DADCE0]">•</span>
                    <span className="text-xs font-mono-numbers text-[#5F6368]">
                      {step.timestamp ? formatDate(step.timestamp) : 'Recently'}
                    </span>
                  </div>
                  {['In Progress', 'Pending Review', 'Resolved', 'Reopened'].includes(step.status) && (
                    <div className="text-[11px] text-[#188038] font-medium flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span>Team: {step.handledBy?.crew || handledBy.crew}</span>
                      <span className="text-[#DADCE0]">·</span>
                      <span>Officer: {step.handledBy?.officer?.name || handledBy.officer.name}</span>
                      <span className="text-[#DADCE0]">·</span>
                      <span>{step.handledBy?.locality || handledBy.locality} ward office</span>
                    </div>
                  )}
                  <p className="text-xs text-[#5F6368] leading-relaxed bg-[#F8F9FA] p-3 rounded-lg border border-[#DADCE0]">
                    {step.note || 'Status update logged.'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
