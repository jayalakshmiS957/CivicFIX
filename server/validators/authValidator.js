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
 * Validates registration input
 * @param {object} body
 * @returns {{ isValid: boolean, errors: Record<string, string>, data: object }}
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

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data: { name, email, password },
  };
};

/**
 * Validates login input
 * @param {object} body
 * @returns {{ isValid: boolean, errors: Record<string, string>, data: object }}
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
