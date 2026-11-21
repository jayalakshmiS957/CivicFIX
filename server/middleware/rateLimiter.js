import rateLimit from 'express-rate-limit';
import { RATE_LIMITS } from '../constants.js';

/**
 * Standard API rate limiter: 100 requests per 15 minutes globally.
 */
export const generalLimiter = rateLimit({
  windowMs: RATE_LIMITS.GLOBAL_WINDOW_MS,
  max: RATE_LIMITS.GLOBAL_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    error: 'Too many requests from this IP address. Please try again after 15 minutes.',
  },
});

/**
 * Stricter rate limiter for authentication & OTP routes: 10 attempts per 15 minutes.
 */
export const authLimiter = rateLimit({
  windowMs: RATE_LIMITS.AUTH_WINDOW_MS,
  max: RATE_LIMITS.AUTH_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    error: 'Too many attempts, try again in a few minutes',
  },
});

/**
 * Stricter rate limiter for Gemini AI analysis / issue submission: 15 submissions per 15 minutes.
 */
export const aiLimiter = rateLimit({
  windowMs: RATE_LIMITS.AI_WINDOW_MS,
  max: RATE_LIMITS.AI_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    error: 'Issue submission limit reached for this session. Please try again shortly.',
  },
});

/**
 * Rate limiter for CivicVoice support and share actions: 60 actions per 15 minutes.
 */
export const supportLimiter = rateLimit({
  windowMs: RATE_LIMITS.SUPPORT_WINDOW_MS,
  max: RATE_LIMITS.SUPPORT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    error: 'Too many support actions. Please wait a moment before trying again.',
  },
});
