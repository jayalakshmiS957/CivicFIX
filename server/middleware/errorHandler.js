import { config } from '../config.js';

/**
 * Global Express Error Handler.
 * Ensures no stack traces or internal implementation leaks are sent to clients.
 */
export const errorHandler = (err, _req, res, _next) => {
  // Log error details internally on the server
  console.error('[CivicResolve Server Error]', err);

  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);

  if (statusCode >= 500) {
    return res.status(statusCode).json({
      success: false,
      error: 'An internal server error occurred. Please try again later.',
    });
  }

  // Return clean, safe error message for client errors (4xx)
  const rawMsg = err.userMessage || err.message;
  const errMsg = typeof rawMsg === 'string' && rawMsg.trim() && rawMsg !== '[object Object]' ? rawMsg : 'Request failed.';
  res.status(statusCode).json({
    success: false,
    error: errMsg,
  });
};

/**
 * 404 Route Handler for unmatched API routes
 */
export const notFoundHandler = (_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Requested API endpoint was not found.',
  });
};
