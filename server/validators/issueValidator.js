import { sanitizeText } from './authValidator.js';
import { VALID_CATEGORIES, VALID_PRIORITIES, VALID_DEPARTMENTS } from '../services/geminiSchema.js';

/**
 * Validates new issue report payload
 * @param {object} body
 * @returns {{ isValid: boolean, errors: Record<string, string>, data: object }}
 */
export const validateIssueInput = (body = {}) => {
  const errors = {};

  const title = sanitizeText(body.title);
  const description = sanitizeText(body.description);
  let category = body.category ? sanitizeText(body.category) : 'Let AI decide';

  // Title length: 5 to 100 characters
  if (!title || title.length < 5 || title.length > 100) {
    errors.title = 'Title must be between 5 and 100 characters.';
  }

  // Description length: 20 to 1000 characters
  if (!description || description.length < 20 || description.length > 1000) {
    errors.description = 'Description must be between 20 and 1000 characters.';
  }

  // Category validation
  if (category !== 'Let AI decide' && !VALID_CATEGORIES.includes(category)) {
    category = 'Let AI decide';
  }

  // Location validation
  const lat = parseFloat(body.latitude ?? body.location?.latitude);
  const lng = parseFloat(body.longitude ?? body.location?.longitude);

  if (Number.isNaN(lat) || lat < -90 || lat > 90) {
    errors.latitude = 'A valid latitude coordinate between -90 and 90 is required.';
  }

  if (Number.isNaN(lng) || lng < -180 || lng > 180) {
    errors.longitude = 'A valid longitude coordinate between -180 and 180 is required.';
  }

  const address = sanitizeText(body.address ?? body.location?.address ?? '');
  const locality = sanitizeText(body.locality ?? body.location?.locality ?? 'Coimbatore');
  const landmark = sanitizeText(body.landmark ?? body.location?.landmark ?? '');

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data: {
      title,
      description,
      category,
      location: {
        latitude: lat,
        longitude: lng,
        address,
        locality,
        landmark,
      },
    },
  };
};

/**
 * Validates status update transition
 * Supports Stage B 'Reopened' lifecycle when citizens flag 'Still a problem'
 * @param {string} currentStatus
 * @param {string} nextStatus
 * @returns {boolean}
 */
export const isValidStatusTransition = (currentStatus, nextStatus) => {
  const allowed = {
    Reported: ['In Progress', 'Pending Review', 'Resolved'],
    'In Progress': ['Pending Review', 'Resolved', 'Reported', 'Reopened'],
    'Pending Review': ['Resolved', 'In Progress', 'Reopened'],
    Resolved: ['In Progress', 'Reopened', 'Pending Review'], // Citizen or admin reopens if defect persists
    Reopened: ['In Progress', 'Pending Review', 'Resolved'], // Crew resumes repair or completes re-work
  };
  return Boolean(allowed[currentStatus]?.includes(nextStatus));
};

/**
 * Validates admin override payload
 * @param {object} body
 * @returns {{ isValid: boolean, errors: Record<string, string>, data: object }}
 */
export const validateAdminOverride = (body = {}) => {
  const errors = {};
  const data = {};

  if (body.category !== undefined) {
    if (!VALID_CATEGORIES.includes(body.category)) {
      errors.category = `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`;
    } else {
      data.category = body.category;
    }
  }

  if (body.priority !== undefined) {
    if (!VALID_PRIORITIES.includes(body.priority)) {
      errors.priority = `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`;
    } else {
      data.priority = body.priority;
    }
  }

  if (body.department !== undefined) {
    if (!VALID_DEPARTMENTS.includes(body.department)) {
      errors.department = `Invalid department. Must be one of: ${VALID_DEPARTMENTS.join(', ')}`;
    } else {
      data.department = body.department;
    }
  }

  if (body.adminNotes !== undefined) {
    data.adminNotes = sanitizeText(body.adminNotes);
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data,
  };
};
