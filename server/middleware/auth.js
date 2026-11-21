import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { usersRepo } from '../repositories/usersRepo.js';

/**
 * Extract token from HTTP-only cookie or Authorization header.
 * @param {import('express').Request} req
 * @returns {string|null}
 */
const extractToken = (req) => {
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
};

/**
 * Middleware: Verifies authentication token and attaches user to request.
 * Returns 401 if unauthenticated.
 */
export const requireAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please sign in to continue.',
      });
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await usersRepo.findById(decoded.id);

    if (!user) {
      res.clearCookie('token', {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.nodeEnv === 'production' || Boolean(process.env.VERCEL),
      });
      return res.status(401).json({
        success: false,
        error: 'Your session expired, please sign in again',
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    next();
  } catch (err) {
    res.clearCookie('token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.nodeEnv === 'production' || Boolean(process.env.VERCEL),
    });
    return res.status(401).json({
      success: false,
      error: 'Your session expired, please sign in again',
    });
  }
};

/**
 * Middleware: Enforces specific role access (e.g., 'admin').
 * @param {'admin'|'citizen'} role
 */
export const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
      });
    }
    if (req.user.role !== role) {
      return res.status(403).json({
        success: false,
        error: `Access denied. ${role} privilege required.`,
      });
    }
    next();
  };
};

/**
 * Middleware: Attaches user if valid token exists, but does not block if unauthenticated.
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (token) {
      const decoded = jwt.verify(token, config.jwtSecret);
      const user = await usersRepo.findById(decoded.id);
      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      }
    }
  } catch {
    // Ignore invalid tokens for optional auth
  }
  next();
};
