import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { issuesRepo } from '../repositories/issuesRepo.js';
import { checkSlaStatus } from '../services/scoringService.js';

const router = express.Router();

// 30-second in-memory cache
let trendsCache = null;
let cacheTime = 0;
const CACHE_TTL_MS = 30 * 1000;

function matchLocality(issue, targetLocality) {
  const locality = (issue.location?.locality || '').toLowerCase().trim();
  const address = (issue.location?.address || '').toLowerCase();
  const target = (targetLocality || '').toLowerCase().trim();

  if (target === 'other' || target === 'other areas') {
    const isStandard = ['gandhipuram', 'rs puram', 'peelamedu'].some(
      (std) => locality.includes(std) || address.includes(std)
    );
    return !isStandard;
  }

  return locality.includes(target) || address.includes(target);
}

/**
 * Computes 10-day trends, locality priority matrix, and SLA compliance metrics.
 * @returns {Promise<{ days: Array<{date: string, reported: number, resolved: number}>, byLocalityPriority: Array<object>, slaCompliancePercent: number, overdueCount: number }>}
 */
export async function computeTrends() {
  const issues = await issuesRepo.getAll();

  // 1. Last 10 days (anchored to latest issue date if outside current 10-day window)
  const days = [];
  let now = new Date();
  if (issues.length > 0) {
    const timestamps = issues
      .map((i) => new Date(i.createdAt).getTime())
      .filter((t) => !isNaN(t));
    if (timestamps.length > 0) {
      const maxTime = Math.max(...timestamps);
      const diffDays = (now.getTime() - maxTime) / (1000 * 60 * 60 * 24);
      if (diffDays > 9 || diffDays < 0) {
        now = new Date(maxTime);
      }
    }
  }
  for (let i = 9; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    days.push({
      date: dateStr,
      reported: 0,
      resolved: 0,
    });
  }

  issues.forEach((iss) => {
    // Reported on date
    if (iss.createdAt) {
      const cDate = new Date(iss.createdAt).toISOString().slice(0, 10);
      const dayItem = days.find((d) => d.date === cDate);
      if (dayItem) dayItem.reported += 1;
    }

    // Resolved on date
    if (iss.status === 'Resolved') {
      const resEvent = (iss.timeline || []).find((t) => t.status === 'Resolved');
      const rTimestamp = resEvent?.timestamp || iss.updatedAt || iss.createdAt;
      if (rTimestamp) {
        const rDate = new Date(rTimestamp).toISOString().slice(0, 10);
        const dayItem = days.find((d) => d.date === rDate);
        if (dayItem) dayItem.resolved += 1;
      }
    }
  });

  // 2. byLocalityPriority for Gandhipuram, RS Puram, Peelamedu, Other areas
  const LOCALITIES = ['Gandhipuram', 'RS Puram', 'Peelamedu', 'Other areas'];
  const byLocalityPriority = LOCALITIES.map((loc) => {
    const entry = {
      locality: loc,
      Critical: 0,
      High: 0,
      Medium: 0,
      Low: 0,
    };
    issues.forEach((iss) => {
      if (matchLocality(iss, loc)) {
        const prio = iss.priority || 'Medium';
        if (entry[prio] !== undefined) {
          entry[prio] += 1;
        }
      }
    });
    return entry;
  });

  // 3. SLA Compliance and Overdue Count
  let overdueCount = 0;
  issues.forEach((iss) => {
    if (iss.status !== 'Resolved') {
      const sla = checkSlaStatus(iss);
      if (sla && sla.isOverdue) {
        overdueCount += 1;
      }
    }
  });

  const total = issues.length || 1;
  const compliantCount = Math.max(0, total - overdueCount);
  const slaCompliancePercent = Math.round((compliantCount / total) * 100);

  return {
    days,
    byLocalityPriority,
    slaCompliancePercent,
    overdueCount,
  };
}

async function handleGetTrends(_req, res) {
  try {
    const now = Date.now();
    if (trendsCache && now - cacheTime < CACHE_TTL_MS) {
      return res.json({ success: true, ...trendsCache });
    }

    const data = await computeTrends();
    trendsCache = data;
    cacheTime = now;

    return res.json({ success: true, ...data });
  } catch (err) {
    console.error('[TrendRoutes Error]', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to compute trend analytics',
    });
  }
}

/**
 * Clears the 30-second in-memory trends cache (primarily for tests).
 */
export function clearTrendsCache() {
  trendsCache = null;
  cacheTime = 0;
}

router.get('/', requireAuth, handleGetTrends);
router.get('/trends', requireAuth, handleGetTrends);

export default router;
