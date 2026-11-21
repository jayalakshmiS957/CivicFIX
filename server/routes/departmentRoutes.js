import express from 'express';
import { DEPARTMENTS_DIRECTORY, ALLOWED_LOCATIONS } from '../data/departmentsDirectory.js';
import { issuesRepo } from '../repositories/issuesRepo.js';
import { checkSlaStatus } from '../services/scoringService.js';

const router = express.Router();

/**
 * Matches an issue against a selected location using locality, address, or landmark
 */
function issueMatchesLocation(issue, locationName) {
  if (!locationName) return true;
  const target = locationName.toLowerCase().replace(/[\s-]/g, '');
  const locality = (issue.location?.locality || '').toLowerCase().replace(/[\s-]/g, '');
  const address = (issue.location?.address || '').toLowerCase().replace(/[\s-]/g, '');
  const landmark = (issue.location?.landmark || '').toLowerCase().replace(/[\s-]/g, '');
  return locality.includes(target) || address.includes(target) || landmark.includes(target);
}

/**
 * GET /api/departments
 * Read-only public endpoint returning the 6 municipal departments directory
 * merged with live workload counts and active issues computed from the issues repository.
 * Supports ?location=<name> filter ('Gandhipuram', 'RS Puram', 'Peelamedu', or 'All Coimbatore').
 */
router.get('/', async (req, res) => {
  try {
    const rawLoc = req.query.location;
    let selectedLocation = null;

    if (rawLoc && typeof rawLoc === 'string' && rawLoc.trim()) {
      const trimmed = rawLoc.trim();
      const lower = trimmed.toLowerCase();
      if (lower !== 'all' && lower !== 'all coimbatore') {
        const matched = ALLOWED_LOCATIONS.find((l) => l.toLowerCase() === lower);
        if (!matched) {
          return res.status(400).json({
            success: false,
            error: `Invalid location "${trimmed}". Allowed locations are: ${ALLOWED_LOCATIONS.join(
              ', '
            )} or "All Coimbatore".`,
          });
        }
        selectedLocation = matched;
      }
    }

    const allIssues = await issuesRepo.getAll();
    const targetIssues = selectedLocation
      ? allIssues.filter((i) => issueMatchesLocation(i, selectedLocation))
      : allIssues;

    const departments = DEPARTMENTS_DIRECTORY.map((dept) => {
      // Find issues assigned to this department within target location scope
      const deptIssues = targetIssues.filter(
        (issue) => issue.department && issue.department.toLowerCase() === dept.name.toLowerCase()
      );

      const openCount = deptIssues.filter((i) => i.status === 'Reported').length;
      const inProgressCount = deptIssues.filter((i) => i.status === 'In Progress').length;
      const pendingReviewCount = deptIssues.filter((i) => i.status === 'Pending Review').length;
      const resolvedCount = deptIssues.filter((i) => i.status === 'Resolved').length;
      const reopenedCount = deptIssues.filter((i) => i.status === 'Reopened').length;

      // Overdue issues calculated from SLA rules
      const overdueCount = deptIssues.filter((i) => {
        if (i.status === 'Resolved') return false;
        if (i.slaStatus && typeof i.slaStatus.isOverdue === 'boolean') {
          return i.slaStatus.isOverdue;
        }
        return checkSlaStatus(i).isOverdue;
      }).length;

      // Currently working on: open, in-progress, pending review, and reopened issues
      const currentIssues = deptIssues
        .filter((i) => i.status !== 'Resolved')
        .sort((a, b) => {
          // Critical priority first
          if (a.priority === 'Critical' && b.priority !== 'Critical') return -1;
          if (b.priority === 'Critical' && a.priority !== 'Critical') return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        })
        .map((issue) => ({
          id: issue.id,
          title: issue.title,
          locality: issue.location?.locality || 'Coimbatore',
          priority: issue.priority || 'Medium',
          status: issue.status || 'Reported',
          createdAt: issue.createdAt,
          workAssignment: issue.workAssignment || issue.workOrder || null,
          crew:
            issue.workAssignment?.crew ||
            issue.workAssignment?.assignedTo ||
            issue.workOrder?.assignedTo ||
            null,
          planningScore:
            typeof issue.planningScore === 'object' && issue.planningScore !== null
              ? issue.planningScore?.S
              : (issue.planningScore ?? null),
        }));

      // If location selected, surface ward office and ward officers
      let deptInfo = { ...dept };
      if (selectedLocation && dept.locations && dept.locations[selectedLocation]) {
        const locData = dept.locations[selectedLocation];
        deptInfo = {
          ...dept,
          officeName: locData.officeName || dept.officeName,
          address: locData.address || dept.address,
          phone: locData.phone || dept.phone,
          officeHours: locData.officeHours || dept.officeHours,
          zone: selectedLocation,
          head: locData.zoneOfficer || dept.head,
          officers: locData.officers || dept.officers,
          zoneOfficer: locData.zoneOfficer || dept.head,
        };
      }

      return {
        ...deptInfo,
        selectedLocation: selectedLocation || 'All Coimbatore',
        workload: {
          total: deptIssues.length,
          open: openCount,
          inProgress: inProgressCount,
          pendingReview: pendingReviewCount,
          resolved: resolvedCount,
          reopened: reopenedCount,
          overdue: overdueCount,
        },
        currentIssues,
      };
    });

    // When location is selected, list departments with active work first,
    // followed by departments with no active issues in that area
    if (selectedLocation) {
      departments.sort((a, b) => {
        const aHasWork = a.workload.total > 0 ? 1 : 0;
        const bHasWork = b.workload.total > 0 ? 1 : 0;
        return bHasWork - aHasWork;
      });
    }

    return res.json({
      success: true,
      count: departments.length,
      location: selectedLocation || 'All Coimbatore',
      departments,
    });
  } catch (err) {
    console.error('[DepartmentRoutes GET / Error]', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve municipal departments directory.',
    });
  }
});

export default router;
