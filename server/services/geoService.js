/**
 * CivicResolve Spatial & Proximity Intelligence Service
 * Great-circle distance (Haversine), tokenization, text similarity, and duplicate report matching.
 */

import { SPATIAL_THRESHOLDS } from '../constants.js';

/**
 * Calculate great-circle distance between two GPS coordinates using the Haversine formula.
 * @param {number} lat1 - Latitude of first point in decimal degrees
 * @param {number} lon1 - Longitude of first point in decimal degrees
 * @param {number} lat2 - Latitude of second point in decimal degrees
 * @param {number} lon2 - Longitude of second point in decimal degrees
 * @returns {number} Distance in rounded meters
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = SPATIAL_THRESHOLDS.EARTH_RADIUS_METERS;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Tokenize and normalize text for lexical comparison.
 * Filters common English stop words and punctuation.
 * @param {string} text - Raw input text snippet
 * @returns {Set<string>} Clean token set
 */
export function tokenize(text) {
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
 * Calculate Jaccard token overlap similarity between two text snippets (0.0 to 1.0).
 * @param {string} text1 - First text snippet
 * @param {string} text2 - Second text snippet
 * @returns {number} Similarity score bounded between 0.0 and 1.0
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
 * Check if a new report is a likely duplicate of existing open issues.
 * Criteria: Same category, within duplicate radius (200m), and token overlap score > 0.15,
 * or identical landmark location (<= 40m).
 * @param {object} params
 * @param {string} params.title - New issue title
 * @param {string} params.description - New issue description
 * @param {string} params.category - New issue civic category
 * @param {number} params.latitude - New issue GPS latitude
 * @param {number} params.longitude - New issue GPS longitude
 * @param {Array<any>} [params.openIssues] - List of active non-resolved complaints
 * @returns {Array<{ issue: any, distanceMeters: number, similarityScore: number }>} Sorted duplicate matches
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
    if (distance <= SPATIAL_THRESHOLDS.DUPLICATE_RADIUS_METERS) {
      const existingText = `${issue.title || ''} ${issue.description || ''}`;
      const sim = calculateTextSimilarity(newText, existingText);

      // Either close proximity with keyword overlap, or identical landmark location
      if (sim >= SPATIAL_THRESHOLDS.TEXT_SIMILARITY_MIN_SCORE || distance <= SPATIAL_THRESHOLDS.IDENTICAL_LANDMARK_RADIUS_METERS) {
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
 * Find all issues within a given radius in kilometers.
 * @param {number} centerLat - Search center GPS latitude
 * @param {number} centerLng - Search center GPS longitude
 * @param {number} radiusKm - Search radius in kilometers
 * @param {Array<any>} [issues] - Issues collection to query
 * @returns {Array<any>} Enriched issues with distanceMeters and distanceKm
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
