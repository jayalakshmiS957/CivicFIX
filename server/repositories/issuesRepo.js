import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import { INITIAL_COIMBATORE_ISSUES } from './seedData.js';
import { supportsRepo } from './supportsRepo.js';
import { notificationsRepo } from './notificationsRepo.js';
import { usersRepo } from './usersRepo.js';
import { DEPARTMENTS_DIRECTORY } from '../data/departmentsDirectory.js';
import {
  calculateCommunityImpactScore,
  calculateAgingScore,
  calculateCombinedPlanningScore,
  calculateCivicTrustScore,
  findPotentialDuplicates,
  findNearbyIssues,
  checkSlaStatus,
} from '../services/scoringService.js';

/**
 * Computes handledBy object containing team, officer, office, and locality details
 * from the departments directory and workAssignment.
 */
export function computeHandledBy(issue) {
  if (!issue) return null;

  const deptName = issue.department || 'Public Works Department';
  const category = issue.category || 'Other';
  const locality = issue.location?.locality || 'Coimbatore';
  const landmark = issue.location?.landmark || '';

  const deptEntry =
    DEPARTMENTS_DIRECTORY.find(
      (d) =>
        (d.name && d.name.toLowerCase() === deptName.toLowerCase()) ||
        (d.shortName && d.shortName.toLowerCase() === deptName.toLowerCase()) ||
        (d.categories && d.categories.includes(category))
    ) || DEPARTMENTS_DIRECTORY[0];

  let locKey = Object.keys(deptEntry.locations || {}).find(
    (k) => k.toLowerCase() === locality.toLowerCase() || locality.toLowerCase().includes(k.toLowerCase())
  );
  if (!locKey) {
    const addr = (issue.location?.address || '').toLowerCase();
    locKey = Object.keys(deptEntry.locations || {}).find((k) => addr.includes(k.toLowerCase())) || 'Gandhipuram';
  }

  const locData = deptEntry.locations?.[locKey] || deptEntry.locations?.Gandhipuram || {};

  let officerName =
    issue.workAssignment?.officer?.name ||
    issue.workAssignment?.officerName ||
    issue.workAssignment?.officer;
  let officerRole =
    issue.workAssignment?.officer?.role ||
    issue.workAssignment?.officerRole;

  if (!officerName || typeof officerName !== 'string') {
    if (locData.zoneOfficer) {
      officerName = locData.zoneOfficer.name;
      officerRole = locData.zoneOfficer.role;
    } else if (locData.officers && locData.officers.length > 0) {
      officerName = locData.officers[0].name;
      officerRole = locData.officers[0].role;
    } else if (deptEntry.head) {
      officerName = deptEntry.head.name;
      officerRole = deptEntry.head.role;
    } else {
      officerName = 'Er. K. Natarajan (Fictional)';
      officerRole = 'Ward Executive Officer';
    }
  }
  if (!officerRole) {
    officerRole = locData.zoneOfficer?.role || 'Ward Field Officer';
  }

  let crew = issue.workAssignment?.assignedTo || issue.workAssignment?.crew;
  if (!crew) {
    const short = deptEntry.shortName || 'PWD';
    const locLabel = locKey || locality || 'Gandhipuram';
    if (category.includes('Road') || category.includes('Pothole')) {
      crew = `${short} ${locLabel} Road Repair Crew`;
    } else if (category.includes('Garbage') || category.includes('Sanitation')) {
      crew = `${short} ${locLabel} Rapid Sanitation Team`;
    } else if (category.includes('Light')) {
      crew = `${short} ${locLabel} Streetlight Operations Crew`;
    } else if (category.includes('Water')) {
      crew = `${short} ${locLabel} Pipe Maintenance Squad`;
    } else if (category.includes('Drainage') || category.includes('Sewage')) {
      crew = `${short} ${locLabel} Drainage Clearing Unit`;
    } else {
      crew = `${short} ${locLabel} Civic Response Squad`;
    }
  }

  const officeName = locData.officeName || deptEntry.officeName || `${locKey} Ward Municipal Office`;
  const address = locData.address || deptEntry.address || `${locKey}, Coimbatore - 641001`;
  const hours = locData.officeHours || deptEntry.officeHours || 'Mon-Sat 10:00 AM to 5:45 PM';
  const phone = locData.phone || deptEntry.phone || '0422-XXXX100';

  const assignedAt = issue.workAssignment?.assignedAt || issue.createdAt;
  const note = issue.workAssignment?.notes || issue.adminNotes || '';

  return {
    department: deptEntry.name,
    category,
    crew,
    officer: {
      name: officerName,
      role: officerRole,
    },
    office: {
      name: officeName,
      address,
      hours,
      phone,
    },
    locality: locKey || locality,
    landmark,
    assignedAt,
    note,
  };
}

class IssuesRepository {
  constructor() {
    this.filePath = path.join(config.paths.data, 'issues.json');
    this.issues = [];
    this.nextCounter = 1016;
    this.init();
  }

  init() {
    try {
      if (!fs.existsSync(config.paths.data)) {
        fs.mkdirSync(config.paths.data, { recursive: true });
      }

      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.issues = JSON.parse(raw);
        const numbers = this.issues
          .map((i) => {
            const match = i.id && i.id.match(/^CR-2026-(\d+)$/);
            return match ? parseInt(match[1], 10) : 0;
          })
          .filter(Boolean);
        if (numbers.length > 0) {
          this.nextCounter = Math.max(...numbers) + 1;
        }
      } else {
        this.issues = [...INITIAL_COIMBATORE_ISSUES];
        this.persist();
      }
    } catch (err) {
      console.warn('[IssuesRepo] Error reading issues.json, resetting to seed data:', err.message);
      this.issues = [...INITIAL_COIMBATORE_ISSUES];
      this.persist();
    }
    this.ensureSeedIssues();
  }

  ensureSeedIssues() {
    let modified = false;
    if (!Array.isArray(this.issues)) this.issues = [];
    for (const seed of INITIAL_COIMBATORE_ISSUES) {
      if (!this.issues.some((i) => i.id === seed.id)) {
        this.issues.push({ ...seed });
        modified = true;
      }
    }
    if (modified) {
      this.persist();
    }
  }

  persist() {
    try {
      if (!fs.existsSync(config.paths.data)) {
        fs.mkdirSync(config.paths.data, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.issues, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[IssuesRepo] Failed to persist issues to file (keeping data in memory):', err.message);
    }
  }

  generateTrackingId() {
    const id = `CR-2026-${String(this.nextCounter).padStart(4, '0')}`;
    this.nextCounter += 1;
    return id;
  }

  /**
   * Enriches an issue with dynamic scores (CivicVoice, Dual Priority, Trust, SLA)
   * @param {object} issue
   * @param {string} [currentUserId]
   */
  enrichIssue(issue, currentUserId = null) {
    if (!issue) return null;

    const supportsCount = supportsRepo.getSupportsCount(issue.id);
    const sharesCount = supportsRepo.getSharesCount(issue.id);
    const isSupportedByMe = currentUserId ? supportsRepo.hasSupported(issue.id, currentUserId) : false;

    // 1. Community Impact Score (C: 0-100 logarithmic)
    const communityImpact = calculateCommunityImpactScore(supportsCount);

    // 2. Days Unresolved Score (T: 0-100)
    const resolvedEvent = issue.timeline?.find((t) => t.status === 'Resolved');
    const { daysUnresolved, T } = calculateAgingScore(issue.createdAt, resolvedEvent?.timestamp);

    // 3. Combined Planning Score S = 0.35*A + 0.25*C + 0.25*P + 0.15*T
    const A = issue.aiAnalysis?.severity_score ?? 50;
    const P = issue.aiAnalysis?.safety_impact_score ?? 50;
    const planningScoreResult = calculateCombinedPlanningScore({
      A,
      C: communityImpact,
      P,
      T,
      safetyPriority: issue.priority,
    });

    // 4. Civic Trust Score (0-100)
    const trustScore = calculateCivicTrustScore({
      hasImage: Boolean(issue.imageUrl),
      imageMatchesDescription: issue.aiAnalysis?.image_matches_description,
      isGpsCaptured: issue.locationCaptureMethod === 'gps',
      corroboratingCount: 0,
      supportsCount,
    });

    // 5. Department SLA Overdue status
    const slaStatus = checkSlaStatus(issue);

    // 6. Computed Handled By Directory & Assignment Object
    const handledBy = computeHandledBy(issue);

    return {
      ...issue,
      handledBy,
      supportsCount,
      sharesCount,
      isSupportedByMe,
      communityImpact,
      daysUnresolved,
      planningScore: planningScoreResult.S,
      planningBreakdown: {
        ...planningScoreResult,
        combinedScore: planningScoreResult.S,
        severityScore: planningScoreResult.A,
        communityImpactScore: planningScoreResult.C,
        safetyImpactScore: planningScoreResult.P,
        daysUnresolvedScore: planningScoreResult.T,
        impactBand: planningScoreResult.impactLabel,
      },
      trustScore,
      slaStatus,
    };
  }

  /**
   * Get all issues with filters, search, and dual-priority sorting
   */
  async getAll(filters = {}, currentUserId = null) {
    let result = this.issues.map((i) => this.enrichIssue(i, currentUserId));

    if (filters.status && filters.status !== 'All') {
      result = result.filter((i) => i.status.toLowerCase() === filters.status.toLowerCase());
    }

    if (filters.category && filters.category !== 'All') {
      result = result.filter((i) => i.category.toLowerCase() === filters.category.toLowerCase());
    }

    if (filters.priority && filters.priority !== 'All') {
      result = result.filter((i) => i.priority.toLowerCase() === filters.priority.toLowerCase());
    }

    if (filters.location && filters.location !== 'All' && filters.location !== 'All Locations') {
      const locTarget = filters.location.toLowerCase().trim();
      if (locTarget === 'other' || locTarget === 'other areas') {
        const stdList = ['gandhipuram', 'rs puram', 'peelamedu'];
        result = result.filter((i) => {
          const loc = (i.location?.locality || '').toLowerCase();
          const addr = (i.location?.address || '').toLowerCase();
          return !stdList.some((std) => loc.includes(std) || addr.includes(std));
        });
      } else {
        result = result.filter((i) => {
          const loc = (i.location?.locality || '').toLowerCase();
          const addr = (i.location?.address || '').toLowerCase();
          return loc.includes(locTarget) || addr.includes(locTarget);
        });
      }
    }

    if (filters.reporterId) {
      result = result.filter((i) => i.reporter && i.reporter.id === filters.reporterId);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        (i) =>
          (i.title && i.title.toLowerCase().includes(q)) ||
          (i.id && i.id.toLowerCase().includes(q)) ||
          (i.location?.locality && i.location.locality.toLowerCase().includes(q)) ||
          (i.department && i.department.toLowerCase().includes(q)) ||
          (i.description && i.description.toLowerCase().includes(q))
      );
    }

    // Dual Priority Sort:
    // SAFETY OVERRIDE: Any issue with Safety Priority = Critical is pinned to the top of the queue
    // with an "Immediate escalation" flag, regardless of S.
    if (filters.sort === 'criticalFirst' || !filters.sort) {
      result.sort((a, b) => {
        // Critical safety priority pins to the top
        if (a.priority === 'Critical' && b.priority !== 'Critical') return -1;
        if (b.priority === 'Critical' && a.priority !== 'Critical') return 1;

        // Otherwise sort by Combined Planning Score S descending
        const getScoreVal = (item) =>
          typeof item.planningScore === 'object' && item.planningScore !== null
            ? item.planningScore.S || 0
            : Number(item.planningScore) || 0;
        const sDiff = getScoreVal(b) - getScoreVal(a);
        if (sDiff !== 0) return sDiff;

        // Fallback to recency
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    } else if (filters.sort === 'newest') {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (filters.sort === 'oldest') {
      result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (filters.sort === 'location') {
      result.sort((a, b) => {
        const aLoc = (a.location?.locality || a.location?.address || '').toLowerCase();
        const bLoc = (b.location?.locality || b.location?.address || '').toLowerCase();
        return aLoc.localeCompare(bLoc);
      });
    } else if (filters.sort === 'mostSupported') {
      result.sort((a, b) => (b.supportsCount || 0) - (a.supportsCount || 0));
    }

    return result;
  }

  async getById(id, currentUserId = null) {
    if (!id) return null;
    const issue = this.issues.find((i) => i.id === id);
    if (!issue) return null;
    return this.enrichIssue(issue, currentUserId);
  }

  /**
   * Find open potential duplicates within 200m using Haversine & token overlap
   */
  async checkDuplicates(params) {
    return findPotentialDuplicates({
      title: params.title,
      description: params.description,
      category: params.category,
      latitude: params.latitude,
      longitude: params.longitude,
      openIssues: this.issues,
    });
  }

  /**
   * Find nearby issues within a specific radius in kilometers
   */
  async getNearby(lat, lng, radiusKm = 1.0, currentUserId = null) {
    const nearby = findNearbyIssues(lat, lng, radiusKm, this.issues);
    return nearby.map((i) => this.enrichIssue(i, currentUserId));
  }

  async create(data) {
    const trackingId = this.generateTrackingId();
    const now = new Date().toISOString();

    const newIssue = {
      id: trackingId,
      title: data.title.trim(),
      description: data.description.trim(),
      category: data.category,
      priority: data.priority,
      status: 'Reported',
      department: data.department,
      secondaryDepartment: data.secondaryDepartment || null,
      location: {
        latitude: parseFloat(data.location.latitude),
        longitude: parseFloat(data.location.longitude),
        address: data.location.address || '',
        locality: data.location.locality || 'Coimbatore',
        landmark: data.location.landmark || '',
      },
      locationCaptureMethod: data.locationCaptureMethod || 'manual',
      imageUrl: data.imageUrl || null,
      reporter: {
        id: data.reporter.id,
        name: data.reporter.name,
        email: data.reporter.email,
      },
      aiAnalysis: data.aiAnalysis,
      workAssignment: null,
      verification: null,
      timeline: [
        {
          status: 'Reported',
          timestamp: now,
          author: data.reporter.name,
          note: 'Civic issue successfully submitted and categorized.',
        },
      ],
      adminNotes: '',
      createdAt: now,
      updatedAt: now,
    };

    this.issues.unshift(newIssue);
    this.persist();
    return this.enrichIssue(newIssue, data.reporter.id);
  }

  async update(id, updates, currentUserId = null) {
    const index = this.issues.findIndex((i) => i.id === id);
    if (index === -1) return null;

    const current = this.issues[index];
    const updated = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.issues[index] = updated;
    this.persist();
    return this.enrichIssue(updated, currentUserId);
  }

  async appendCitizenAnswer(id, answer, user) {
    const issue = await this.getById(id);
    if (!issue) return null;

    const trimmedAnswer = answer.trim();
    const updatedDesc = `${issue.description}\n\n[Citizen Update - ${new Date().toLocaleDateString()}]: ${trimmedAnswer}`;

    const timelineEntry = {
      status: issue.status,
      timestamp: new Date().toISOString(),
      author: user.name || 'Citizen',
      note: `Added additional detail: "${trimmedAnswer.slice(0, 100)}${trimmedAnswer.length > 100 ? '...' : ''}"`,
    };

    const updatedTimeline = [...issue.timeline, timelineEntry];

    return this.update(id, {
      description: updatedDesc,
      timeline: updatedTimeline,
    }, user.id);
  }

  async updateStatus(id, newStatus, adminNote = '', authorName = 'Municipal Admin', assignmentOverrides = {}) {
    const issue = await this.getById(id);
    if (!issue) return null;

    const now = new Date().toISOString();
    let noteText = adminNote.trim() || `Status updated from ${issue.status} to ${newStatus}`;

    const computed = computeHandledBy({
      ...issue,
      workAssignment: {
        ...(issue.workAssignment || {}),
        ...(assignmentOverrides || {}),
      },
    });

    const isTransitionToInProgress = newStatus === 'In Progress';
    let assignedWorkObj = issue.workAssignment;

    if (isTransitionToInProgress) {
      const crewName = assignmentOverrides.assignedTo?.trim() || issue.workAssignment?.assignedTo || computed.crew;
      const officerObj = assignmentOverrides.officer
        ? (typeof assignmentOverrides.officer === 'string' ? { name: assignmentOverrides.officer, role: computed.officer.role } : assignmentOverrides.officer)
        : (issue.workAssignment?.officer || computed.officer);
      const locality = issue.location?.locality || computed.locality || 'Gandhipuram';

      assignedWorkObj = {
        assignedTo: crewName,
        crew: crewName,
        officer: officerObj,
        officerName: officerObj.name,
        officerRole: officerObj.role,
        scheduledDate: assignmentOverrides.scheduledDate || issue.workAssignment?.scheduledDate || '',
        notes: adminNote.trim() || issue.workAssignment?.notes || 'Dispatched for active field resolution.',
        assignedAt: now,
      };

      noteText = `Team: ${crewName} · Officer: ${officerObj.name} · ${locality} ward office. ${adminNote.trim() || 'Work commenced.'}`.trim();
    }

    const newTimeline = [
      ...issue.timeline,
      {
        status: newStatus,
        timestamp: now,
        author: authorName,
        note: noteText,
        ...(isTransitionToInProgress
          ? {
              handledBy: {
                crew: assignedWorkObj.assignedTo,
                officer: assignedWorkObj.officer,
                locality: computed.locality,
              },
            }
          : {}),
      },
    ];

    notificationsRepo.create({
      userId: issue.reporter.id,
      issueId: issue.id,
      title: `Status Update: ${newStatus}`,
      message: `Your complaint (${issue.id}) is now marked as "${newStatus}". Note: ${noteText.slice(0, 80)}`,
    });

    return this.update(id, {
      status: newStatus,
      adminNotes: adminNote ? adminNote.trim() : issue.adminNotes,
      workAssignment: assignedWorkObj,
      timeline: newTimeline,
    });
  }

  /**
   * Reopen an issue when citizen indicates 'Still a problem'
   */
  async reopenIssue(id, citizenNote, user = {}) {
    const issue = await this.getById(id);
    if (!issue) return null;

    const noteString = typeof citizenNote === 'string' ? citizenNote : (citizenNote?.note || '');
    const authorName = (typeof citizenNote === 'object' && citizenNote?.author) || user?.name || 'Citizen Inspector';
    const now = new Date().toISOString();
    const noteText = noteString.trim()
      ? `Citizen feedback: ${noteString.trim()}`
      : 'Citizen inspected location and flagged that the civic defect persists.';

    const newTimeline = [
      ...issue.timeline,
      {
        status: 'Reopened',
        timestamp: now,
        author: authorName,
        note: noteText,
      },
    ];

    const adminUsers = await usersRepo.findByRole('admin');
    if (adminUsers && adminUsers.length > 0) {
      for (const admin of adminUsers) {
        notificationsRepo.create({
          userId: admin.id,
          issueId: issue.id,
          title: `Complaint Reopened (${issue.id})`,
          message: `Citizen reported repair incomplete: "${noteText.slice(0, 80)}"`,
        });
      }
    } else {
      notificationsRepo.create({
        userId: 'usr_admin_001',
        issueId: issue.id,
        title: `Complaint Reopened (${issue.id})`,
        message: `Citizen reported repair incomplete: "${noteText.slice(0, 80)}"`,
      });
    }

    return this.update(id, {
      status: 'Reopened',
      reopenedCount: (issue.reopenedCount || 0) + 1,
      timeline: newTimeline,
    }, user.id);
  }

  /**
   * Record departmental work crew assignment
   */
  async recordWorkAssignment(id, assignment, authorName = 'Municipal Admin') {
    const issue = await this.getById(id);
    if (!issue) return null;

    const computed = computeHandledBy({
      ...issue,
      workAssignment: {
        ...(issue.workAssignment || {}),
        assignedTo: assignment.assignedTo,
        officer: assignment.officer,
      },
    });

    const crewName = assignment.assignedTo?.trim() || computed.crew;
    const officerObj = assignment.officer
      ? (typeof assignment.officer === 'string' ? { name: assignment.officer, role: computed.officer.role } : assignment.officer)
      : (issue.workAssignment?.officer || computed.officer);
    const locality = issue.location?.locality || computed.locality || 'Gandhipuram';

    const now = new Date().toISOString();
    const noteText = assignment.notes?.trim() || 'Dispatch confirmed.';
    const timelineNote = `Team: ${crewName} · Officer: ${officerObj.name} · ${locality} ward office. Notes: ${noteText}`;

    const newTimeline = [
      ...issue.timeline,
      {
        status: 'In Progress',
        timestamp: now,
        author: authorName,
        note: timelineNote,
        handledBy: {
          crew: crewName,
          officer: officerObj,
          locality,
        },
      },
    ];

    return this.update(id, {
      status: 'In Progress',
      workAssignment: {
        assignedTo: crewName,
        crew: crewName,
        officer: officerObj,
        officerName: officerObj.name,
        officerRole: officerObj.role,
        scheduledDate: assignment.scheduledDate || issue.workAssignment?.scheduledDate || '',
        notes: noteText,
        assignedAt: now,
      },
      timeline: newTimeline,
    });
  }

  /**
   * Record AI Resolution Verification with after photo.
   * Sets status to 'Pending Review'. Only an admin action sets Resolved.
   * Flags confidence < 0.7 as needs manual review.
   */
  async recordVerification(id, verificationData, authorName = 'Municipal Admin') {
    const issue = await this.getById(id);
    if (!issue) return null;

    const now = new Date().toISOString();
    const needsManualReview = typeof verificationData.confidence === 'number' && verificationData.confidence < 0.7;

    const note = `AI Resolution Verification: ${
      verificationData.repair_appears_complete ? 'Repair appears visually complete' : 'Repair flagged incomplete'
    } (Confidence: ${Math.round((verificationData.confidence || 0) * 100)}%). Status set to Pending Review.${
      needsManualReview ? ' [Flagged: Needs Manual Review]' : ''
    } ${verificationData.observations || ''}`.trim();

    const newTimeline = [
      ...issue.timeline,
      {
        status: 'Pending Review',
        timestamp: now,
        author: authorName,
        note,
      },
    ];

    return this.update(id, {
      status: 'Pending Review',
      verification: {
        ...verificationData,
        needsManualReview,
        verifiedAt: now,
      },
      timeline: newTimeline,
    });
  }

  async overrideAiAnalysis(id, overrides, authorName = 'Municipal Admin') {
    const issue = await this.getById(id);
    if (!issue) return null;

    const now = new Date().toISOString();
    const changedFields = [];

    if (overrides.category && overrides.category !== issue.category) {
      changedFields.push(`Category -> ${overrides.category}`);
    }
    if (overrides.priority && overrides.priority !== issue.priority) {
      changedFields.push(`Priority -> ${overrides.priority}`);
    }
    if (overrides.department && overrides.department !== issue.department) {
      changedFields.push(`Department -> ${overrides.department}`);
    }

    const note = changedFields.length > 0
      ? `Overridden by admin: ${changedFields.join(', ')}`
      : 'Issue details updated by admin.';

    const newTimeline = [
      ...issue.timeline,
      {
        status: issue.status,
        timestamp: now,
        author: authorName,
        note,
      },
    ];

    return this.update(id, {
      category: overrides.category || issue.category,
      priority: overrides.priority || issue.priority,
      department: overrides.department || issue.department,
      adminNotes: overrides.adminNotes !== undefined ? overrides.adminNotes : issue.adminNotes,
      timeline: newTimeline,
    });
  }

  async delete(id) {
    const index = this.issues.findIndex((i) => i.id === id);
    if (index === -1) return false;
    this.issues.splice(index, 1);
    this.persist();
    return true;
  }

  async getDepartmentAnalytics() {
    const deptStats = {};

    for (const issue of this.issues) {
      const dept = issue.department || 'General Administration';
      if (!deptStats[dept]) {
        deptStats[dept] = {
          department: dept,
          totalAssigned: 0,
          pending: 0,
          resolved: 0,
          reopenedCount: 0,
          ackHoursTotal: 0,
          ackCount: 0,
          resolveHoursTotal: 0,
          resolveCount: 0,
        };
      }

      const d = deptStats[dept];
      d.totalAssigned += 1;
      if (issue.status === 'Resolved') d.resolved += 1;
      else d.pending += 1;

      const hasReopened = issue.timeline?.some((t) => t.status === 'Reopened');
      if (hasReopened) d.reopenedCount += 1;

      const reportedEvent = issue.timeline?.find((t) => t.status === 'Reported');
      const inProgressEvent = issue.timeline?.find((t) => t.status === 'In Progress');
      if (reportedEvent && inProgressEvent) {
        const diff = (new Date(inProgressEvent.timestamp) - new Date(reportedEvent.timestamp)) / (1000 * 60 * 60);
        if (diff >= 0) {
          d.ackHoursTotal += diff;
          d.ackCount += 1;
        }
      }

      const resolvedEvent = [...(issue.timeline || [])].reverse().find((t) => t.status === 'Resolved');
      if (reportedEvent && resolvedEvent) {
        const diff = (new Date(resolvedEvent.timestamp) - new Date(reportedEvent.timestamp)) / (1000 * 60 * 60);
        if (diff >= 0) {
          d.resolveHoursTotal += diff;
          d.resolveCount += 1;
        }
      }
    }

    return Object.values(deptStats).map((d) => ({
      department: d.department,
      totalAssigned: d.totalAssigned,
      pending: d.pending,
      resolved: d.resolved,
      reopenedCount: d.reopenedCount,
      avgAckHours: d.ackCount > 0 ? parseFloat((d.ackHoursTotal / d.ackCount).toFixed(1)) : 4.5,
      avgResolveHours: d.resolveCount > 0 ? parseFloat((d.resolveHoursTotal / d.resolveCount).toFixed(1)) : 28.0,
      slaComplianceRate: d.totalAssigned > 0 ? Math.round(((d.totalAssigned - d.reopenedCount) / d.totalAssigned) * 100) : 100,
    }));
  }

  async getLocalityAnalytics() {
    const locStats = {};

    for (const issue of this.issues) {
      const locality = issue.location?.locality || 'Coimbatore Central';
      if (!locStats[locality]) {
        locStats[locality] = {
          locality,
          total: 0,
          pending: 0,
          resolved: 0,
          resolveHoursTotal: 0,
          resolveCount: 0,
          latitude: issue.location?.latitude || 11.0168,
          longitude: issue.location?.longitude || 76.9673,
        };
      }

      const l = locStats[locality];
      l.total += 1;
      if (issue.status === 'Resolved') l.resolved += 1;
      else l.pending += 1;

      const reportedEvent = issue.timeline?.find((t) => t.status === 'Reported');
      const resolvedEvent = [...(issue.timeline || [])].reverse().find((t) => t.status === 'Resolved');
      if (reportedEvent && resolvedEvent) {
        const diff = (new Date(resolvedEvent.timestamp) - new Date(reportedEvent.timestamp)) / (1000 * 60 * 60);
        if (diff >= 0) {
          l.resolveHoursTotal += diff;
          l.resolveCount += 1;
        }
      }
    }

    return Object.values(locStats)
      .map((l) => ({
        locality: l.locality,
        total: l.total,
        pending: l.pending,
        resolved: l.resolved,
        avgResolveHours: l.resolveCount > 0 ? parseFloat((l.resolveHoursTotal / l.resolveCount).toFixed(1)) : 24.0,
        latitude: l.latitude,
        longitude: l.longitude,
      }))
      .sort((a, b) => b.pending - a.pending);
  }

  async getStats(currentUserId = null) {
    const total = this.issues.length;
    let reported = 0;
    let inProgress = 0;
    let resolved = 0;
    let reopened = 0;
    let pendingReview = 0;

    const byCategory = {};
    const byPriority = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    const departmentsSet = new Set();

    let totalResolutionHours = 0;
    let resolvedCountWithTimestamps = 0;

    for (const issue of this.issues) {
      if (issue.status === 'Reported') reported += 1;
      else if (issue.status === 'In Progress') inProgress += 1;
      else if (issue.status === 'Resolved') resolved += 1;
      else if (issue.status === 'Reopened') reopened += 1;
      else if (issue.status === 'Pending Review') pendingReview += 1;

      byCategory[issue.category] = (byCategory[issue.category] || 0) + 1;

      if (byPriority[issue.priority] !== undefined) {
        byPriority[issue.priority] += 1;
      }

      if (issue.department) departmentsSet.add(issue.department);

      if (issue.status === 'Resolved' && issue.timeline) {
        const reportedEvent = issue.timeline.find((t) => t.status === 'Reported');
        const resolvedEvent = [...issue.timeline].reverse().find((t) => t.status === 'Resolved');
        if (reportedEvent && resolvedEvent) {
          const diffMs = new Date(resolvedEvent.timestamp) - new Date(reportedEvent.timestamp);
          const hours = diffMs / (1000 * 60 * 60);
          if (hours >= 0) {
            totalResolutionHours += hours;
            resolvedCountWithTimestamps += 1;
          }
        }
      }
    }

    const avgResolutionHours = resolvedCountWithTimestamps > 0
      ? Math.round(totalResolutionHours / resolvedCountWithTimestamps)
      : 32;

    return {
      total,
      reported,
      inProgress,
      resolved,
      reopened,
      pendingReview,
      resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
      avgResolutionHours,
      activeDepartments: departmentsSet.size,
      byCategory,
      byPriority,
    };
  }
}

export const issuesRepo = new IssuesRepository();
