import { normalizeIndianMobile } from '../services/otpService.js';

/**
 * Sanitizes plain string input to prevent XSS and strip control characters.
 * @param {string} str
 * @returns {string}
 */
export const sanitizeText = (str) => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[<>]/g, '') // strip dangerous bracket characters
    .trim();
};

/**
 * Validates a standalone mobile number input
 * @param {string} mobile
 * @returns {{ isValid: boolean, error: string|null, mobile: string|null }}
 */
export const validateMobileInput = (mobile) => {
  const normalized = normalizeIndianMobile(mobile);
  if (!normalized) {
    return {
      isValid: false,
      error: 'Please provide a valid 10-digit Indian mobile number.',
      mobile: null,
    };
  }
  return {
    isValid: true,
    error: null,
    mobile: normalized,
  };
};

/**
 * Validates registration input
 * @param {Record<string, any>} [body={}]
 * @returns {{ isValid: boolean, errors: Record<string, string>, data: { name: string, email: string, password: string, mobile: string|null } }}
 */
export const validateRegisterInput = (body = {}) => {
  const errors = {};

  const name = sanitizeText(body.name);
  const email = sanitizeText(body.email).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';

  if (!name || name.length < 2 || name.length > 80) {
    errors.name = 'Full name must be between 2 and 80 characters.';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email) || email.length > 255) {
    errors.email = 'Please provide a valid email address.';
  }

  if (!password || password.length < 6 || password.length > 100) {
    errors.password = 'Password must be at least 6 characters long.';
  }

  let normalizedMobile = null;
  if (body.mobile !== undefined && body.mobile !== null && String(body.mobile).trim() !== '') {
    normalizedMobile = normalizeIndianMobile(String(body.mobile));
    if (!normalizedMobile) {
      errors.mobile = 'Please provide a valid 10-digit Indian mobile number.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data: {
      name,
      email,
      password,
      mobile: normalizedMobile,
    },
  };
};

/**
 * Validates login input
 * @param {Record<string, any>} [body={}]
 * @returns {{ isValid: boolean, errors: Record<string, string>, data: { email: string, password: string } }}
 */
export const validateLoginInput = (body = {}) => {
  const errors = {};

  const email = sanitizeText(body.email).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email) {
    errors.email = 'Email address is required.';
  }

  if (!password) {
    errors.password = 'Password is required.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data: { email, password },
  };
};
