/**
 * CivicResolve Server-Wide Constants & Configuration Limits
 * Centralized single source of truth for magic numbers, timeouts, thresholds, and SLA hours.
 */

/**
 * Service Level Agreement (SLA) resolution targets by priority level in hours.
 */
export const SLA_HOURS = Object.freeze({
  Critical: 24,
  High: 72,
  Medium: 168, // 7 days
  Low: 336,    // 14 days
});

/**
 * Dual priority planning formula weights (S = 0.35*A + 0.25*C + 0.25*P + 0.15*T).
 */
export const SCORING_WEIGHTS = Object.freeze({
  SEVERITY_AI: 0.35,
  COMMUNITY_IMPACT: 0.25,
  LOCATION_PRIORITY: 0.25,
  TIME_AGING: 0.15,
});

/**
 * Spatial duplicate detection and proximity thresholds.
 */
export const SPATIAL_THRESHOLDS = Object.freeze({
  DUPLICATE_RADIUS_METERS: 200,
  IDENTICAL_LANDMARK_RADIUS_METERS: 40,
  TEXT_SIMILARITY_MIN_SCORE: 0.15,
  EARTH_RADIUS_METERS: 6371000,
});

/**
 * Security, file upload, and body parser boundaries.
 */
export const SECURITY_LIMITS = Object.freeze({
  PAYLOAD_MAX_SIZE: '1mb',
  UPLOAD_MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024, // 5 MB
  ALLOWED_IMAGE_MIME_TYPES: Object.freeze(['image/jpeg', 'image/png', 'image/webp']),
  ALLOWED_IMAGE_EXTENSIONS: Object.freeze(['.jpg', '.jpeg', '.png', '.webp']),
});

/**
 * Rate limiting thresholds (window in ms, maximum requests).
 */
export const RATE_LIMITS = Object.freeze({
  GLOBAL_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  GLOBAL_MAX_REQUESTS: 100,
  AUTH_WINDOW_MS: 15 * 60 * 1000,   // 15 minutes
  AUTH_MAX_REQUESTS: 10,
  AI_WINDOW_MS: 15 * 60 * 1000,     // 15 minutes
  AI_MAX_REQUESTS: 15,
  SUPPORT_WINDOW_MS: 15 * 60 * 1000,// 15 minutes
  SUPPORT_MAX_REQUESTS: 60,
});

/**
 * One-Time Password (OTP) verification boundaries.
 */
export const OTP_CONFIG = Object.freeze({
  EXPIRY_MS: 5 * 60 * 1000,   // 5 minutes
  RESEND_COOLDOWN_MS: 30 * 1000, // 30 seconds
  MAX_ATTEMPTS: 3,
  CODE_LENGTH: 6,
  DEMO_CODE: '123456',
});

/**
 * Form field validation string lengths.
 */
export const VALIDATION_LIMITS = Object.freeze({
  TITLE_MIN_LENGTH: 5,
  TITLE_MAX_LENGTH: 100,
  DESCRIPTION_MIN_LENGTH: 20,
  DESCRIPTION_MAX_LENGTH: 1000,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 80,
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_MAX_LENGTH: 100,
  EMAIL_MAX_LENGTH: 255,
});

/**
 * Civic complaint valid priority tiers.
 */
export const VALID_PRIORITIES = Object.freeze(['Critical', 'High', 'Medium', 'Low']);

/**
 * Civic complaint valid life-cycle statuses.
 */
export const VALID_STATUSES = Object.freeze([
  'Reported',
  'Pending Review',
  'In Progress',
  'Resolved',
  'Reopened',
]);
