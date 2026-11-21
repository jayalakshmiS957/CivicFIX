/**
 * CivicResolve Scoring & Spatial Intelligence Engine
 * Dual Priority System, Spatial Haversine, Text Token Overlap, and SLA Rules
 */

/**
 * Calculate great-circle distance between two GPS coordinates using the Haversine formula.
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} Distance in meters
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371000; // Earth radius in meters

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Tokenize and normalize text for lexical comparison
 * @param {string} text
 * @returns {Set<string>}
 */
function tokenize(text) {
  if (!text) return new Set();
  const STOP_WORDS = new Set([
    'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'in', 'of', 'for', 'to',
    'near', 'road', 'street', 'with', 'from', 'by', 'as', 'it', 'this', 'that'
  ]);

  const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const tokens = clean
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  return new Set(tokens);
}

/**
 * Calculate Jaccard token overlap similarity between two text snippets (0.0 to 1.0)
 * @param {string} text1
 * @param {string} text2
 * @returns {number}
 */
export function calculateTextSimilarity(text1, text2) {
  const set1 = tokenize(text1);
  const set2 = tokenize(text2);

  if (set1.size === 0 || set2.size === 0) return 0;

  let intersection = 0;
  for (const token of set1) {
    if (set2.has(token)) {
      intersection += 1;
    }
  }

  const union = new Set([...set1, ...set2]).size;
  return union === 0 ? 0 : parseFloat((intersection / union).toFixed(3));
}

/**
 * Check if a new report is a likely duplicate of existing open issues
 * Criteria: Same category, within 200m radius, and token overlap score > 0.2
 * @param {object} params
 * @param {string} params.title
 * @param {string} params.description
 * @param {string} params.category
 * @param {number} params.latitude
 * @param {number} params.longitude
 * @param {Array<object>} params.openIssues
 * @returns {Array<{ issue: object, distanceMeters: number, similarityScore: number }>}
 */
export function findPotentialDuplicates({ title, description, category, latitude, longitude, openIssues = [] }) {
  const newText = `${title || ''} ${description || ''}`;
  const duplicates = [];

  for (const issue of openIssues) {
    if (issue.status === 'Resolved') continue;

    // Must be in the same civic category
    if (issue.category.toLowerCase() !== category.toLowerCase()) continue;

    const lat = issue.location?.latitude;
    const lng = issue.location?.longitude;
    if (!lat || !lng) continue;

    const distance = haversineDistance(latitude, longitude, lat, lng);
    if (distance <= 200) {
      const existingText = `${issue.title || ''} ${issue.description || ''}`;
      const sim = calculateTextSimilarity(newText, existingText);

      // Either close proximity with keyword overlap, or identical landmark location
      if (sim >= 0.15 || distance <= 40) {
        duplicates.push({
          issue,
          distanceMeters: distance,
          similarityScore: sim,
        });
      }
    }
  }

  return duplicates.sort((a, b) => b.similarityScore - a.similarityScore);
}

/**
 * Find all issues within a given radius in kilometers
 * @param {number} centerLat
 * @param {number} centerLng
 * @param {number} radiusKm
 * @param {Array<object>} issues
 */
export function findNearbyIssues(centerLat, centerLng, radiusKm, issues = []) {
  const radiusMeters = radiusKm * 1000;
  const nearby = [];

  for (const issue of issues) {
    const lat = issue.location?.latitude;
    const lng = issue.location?.longitude;
    if (!lat || !lng) continue;

    const dist = haversineDistance(centerLat, centerLng, lat, lng);
    if (dist <= radiusMeters) {
      nearby.push({
        ...issue,
        distanceMeters: dist,
        distanceKm: parseFloat((dist / 1000).toFixed(2)),
      });
    }
  }

  return nearby.sort((a, b) => a.distanceMeters - b.distanceMeters);
}

/**
 * Normalise community support count into a 0-100 Community Impact Score (C)
 * Logarithmic scale: 50 supports approaches ~100 to prevent mass popularity dominance.
 * Formula: C = min(100, round((ln(1 + supports) / ln(51)) * 100))
 * @param {number} supportsCount
 * @returns {number} Score between 0 and 100
 */
export function calculateCommunityImpactScore(supportsCount = 0) {
  const n = Math.max(0, parseInt(supportsCount, 10) || 0);
  if (n === 0) return 0;
  // Natural log scaling capped at 50 supports = 100 score
  const score = Math.round((Math.log(1 + n) / Math.log(51)) * 100);
  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate age / days-unresolved score (T) (0-100)
 * 7 days unresolved = 70 score, capped at 100.
 * @param {string} createdAt
 * @param {string} [resolvedAt]
 * @returns {{ daysUnresolved: number, T: number }}
 */
export function calculateAgingScore(createdAt, resolvedAt = null) {
  const start = new Date(createdAt).getTime();
  const end = resolvedAt ? new Date(resolvedAt).getTime() : Date.now();
  const diffDays = Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
  const roundedDays = parseFloat(diffDays.toFixed(1));

  // 10 points per day unresolved, max 100
  const T = Math.min(100, Math.round(roundedDays * 10));
  return { daysUnresolved: roundedDays, T };
}

/**
 * Combined Planning Score S
 * Formula: S = 0.35*A + 0.25*C + 0.25*P + 0.15*T
 * where:
 *   A = AI severity score (0-100)
 *   C = Community impact score (0-100)
 *   P = Public safety impact score (0-100)
 *   T = Days-unresolved score (0-100)
 *
 * SAFETY OVERRIDE: Any issue with Safety Priority = Critical is pinned to top of admin queue
 * with an "Immediate escalation" flag regardless of S.
 *
 * @param {object} params
 * @param {number} params.A AI Severity (0-100)
 * @param {number} params.C Community Impact (0-100)
 * @param {number} params.P Public Safety Impact (0-100)
 * @param {number} params.T Days-unresolved score (0-100)
 * @param {string} [params.safetyPriority] 'Critical'|'High'|'Medium'|'Low'
 * @returns {{ S: number, A: number, C: number, P: number, T: number, impactLabel: string, isSafetyEscalated: boolean }}
 */
export function calculateCombinedPlanningScore({ A = 50, C = 0, P = 50, T = 10, safetyPriority = 'Medium' }) {
  // Clamp all inputs to 0-100
  const cleanA = Math.max(0, Math.min(100, Math.round(A)));
  const cleanC = Math.max(0, Math.min(100, Math.round(C)));
  const cleanP = Math.max(0, Math.min(100, Math.round(P)));
  const cleanT = Math.max(0, Math.min(100, Math.round(T)));

  // S = 0.35*A + 0.25*C + 0.25*P + 0.15*T
  const rawS = 0.35 * cleanA + 0.25 * cleanC + 0.25 * cleanP + 0.15 * cleanT;
  const S = parseFloat(rawS.toFixed(1));

  let impactLabel = 'Low Impact';
  if (S >= 80) impactLabel = 'Very High Impact';
  else if (S >= 65) impactLabel = 'High Impact';
  else if (S >= 45) impactLabel = 'Moderate Impact';

  // Safety Override: Critical safety priority pins to the top
  const isSafetyEscalated = safetyPriority === 'Critical';

  return {
    S,
    A: cleanA,
    C: cleanC,
    P: cleanP,
    T: cleanT,
    impactLabel,
    isSafetyEscalated,
  };
}

/**
 * Computes Civic Trust Score (0-100) for an issue
 * Evaluates evidence confidence from 5 distinct dimensions:
 * 1. Image uploaded (+25)
 * 2. Image matches description (+25 if true, +0 if false/null)
 * 3. Geolocation capture method (GPS: +20, manual pin/search: +10)
 * 4. Duplicate/corroborating reports nearby (+15)
 * 5. Community supporters count (up to +15)
 *
 * @param {object} params
 * @returns {{ score: number, breakdown: Array<{ factor: string, points: number, max: number, status: string }> }}
 */
export function calculateCivicTrustScore({
  hasImage = false,
  imageMatchesDescription = null,
  isGpsCaptured = false,
  corroboratingCount = 0,
  supportsCount = 0,
}) {
  const breakdown = [];

  // Factor 1: Image presence
  const imgPts = hasImage ? 25 : 0;
  breakdown.push({
    factor: 'Visual Evidence Attached',
    points: imgPts,
    max: 25,
    status: hasImage ? 'Photo uploaded (+25)' : 'No image attached (0)',
  });

  // Factor 2: AI Visual Alignment
  let alignPts = 0;
  if (imageMatchesDescription === true) alignPts = 25;
  else if (imageMatchesDescription === false) alignPts = 0;
  else alignPts = hasImage ? 15 : 0; // neutral
  breakdown.push({
    factor: 'Visual & Text Alignment',
    points: alignPts,
    max: 25,
    status: imageMatchesDescription === true
      ? 'Photo confirmed to match description (+25)'
      : imageMatchesDescription === false
      ? 'Photo does not match text (0)'
      : hasImage ? 'Unverified visual alignment (+15)' : 'No photo to verify (0)',
  });

  // Factor 3: Geolocation Accuracy
  const geoPts = isGpsCaptured ? 20 : 10;
  breakdown.push({
    factor: 'Location Telemetry',
    points: geoPts,
    max: 20,
    status: isGpsCaptured ? 'Direct GPS sensor capture (+20)' : 'Manual map pin / search (+10)',
  });

  // Factor 4: Ground Corroboration
  const corrPts = corroboratingCount > 0 ? 15 : 5;
  breakdown.push({
    factor: 'Spatial Corroboration',
    points: corrPts,
    max: 15,
    status: corroboratingCount > 0
      ? `${corroboratingCount} nearby ground reports corroborate (+15)`
      : 'Sole report in immediate radius (+5)',
  });

  // Factor 5: Citizen Support
  const suppPts = Math.min(15, (parseInt(supportsCount, 10) || 0) * 3);
  breakdown.push({
    factor: 'Community Endorsement',
    points: suppPts,
    max: 15,
    status: `${supportsCount} verified citizen supports (+${suppPts})`,
  });

  const totalScore = breakdown.reduce((sum, item) => sum + item.points, 0);

  return {
    score: Math.min(100, Math.max(0, totalScore)),
    breakdown,
  };
}

/**
 * Check if issue is overdue based on Department SLA targets:
 * - Critical: 24 hours
 * - High: 72 hours
 * - Medium: 7 days (168 hours)
 * - Low: 14 days (336 hours)
 *
 * @param {object} issue
 * @returns {{ isOverdue: boolean, hoursElapsed: number, slaHours: number, overdueHours: number }}
 */
export function checkSlaStatus(issue) {
  if (issue.status === 'Resolved') {
    return { isOverdue: false, hoursElapsed: 0, slaHours: 0, overdueHours: 0 };
  }

  const SLA_MAP = {
    Critical: 24,
    High: 72,
    Medium: 168,
    Low: 336,
  };

  const slaHours = SLA_MAP[issue.priority] || 168;
  const created = new Date(issue.createdAt).getTime();
  const hoursElapsed = Math.max(0, (Date.now() - created) / (1000 * 60 * 60));

  const isOverdue = hoursElapsed > slaHours;
  const overdueHours = isOverdue ? Math.round(hoursElapsed - slaHours) : 0;

  return {
    isOverdue,
    hoursElapsed: Math.round(hoursElapsed),
    slaHours,
    overdueHours,
  };
}
