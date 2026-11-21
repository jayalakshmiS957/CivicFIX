import rateLimit from 'express-rate-limit';

/**
 * Standard API rate limiter: 200 requests per 15 minutes
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP address. Please try again after 15 minutes.',
  },
});

/**
 * Stricter rate limiter for authentication routes: 20 attempts per 15 minutes
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many attempts, try again in a few minutes',
  },
});

/**
 * Stricter rate limiter for Gemini AI analysis / issue submission: 15 submissions per 15 minutes
 */
export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Issue submission limit reached for this session. Please try again shortly.',
  },
});

/**
 * Rate limiter for CivicVoice support and share actions: 60 actions per 15 minutes
 */
export const supportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many support actions. Please wait a moment before trying again.',
  },
});
