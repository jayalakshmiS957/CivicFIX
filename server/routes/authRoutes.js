import express from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { usersRepo } from '../repositories/usersRepo.js';
import { validateRegisterInput, validateLoginInput } from '../validators/authValidator.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { requireAuth } from '../middleware/auth.js';
import { DEMO_ACCOUNTS } from '../data/demoAccounts.js';

const router = express.Router();

/**
 * GET /api/auth/demo-accounts
 * Return demo accounts for quick sign-in
 */
router.get('/demo-accounts', (req, res) => {
  return res.json({
    success: true,
    accounts: DEMO_ACCOUNTS.map(({ id, name, email, role, password, description }) => ({
      id,
      name,
      email,
      role,
      password,
      description,
    })),
  });
});

// Helper: Sets HTTP-only secure cookie
const sendAuthCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

/**
 * POST /api/auth/register
 * Register a new citizen account
 */
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { isValid, errors, data } = validateRegisterInput(req.body);
    if (!isValid) {
      const firstError = Object.values(errors).find((v) => typeof v === 'string') || 'Invalid registration details.';
      return res.status(400).json({ success: false, error: firstError, errors });
    }

    const existing = await usersRepo.findByEmail(data.email);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email address already exists. Please log in.',
      });
    }

    const newUser = await usersRepo.create({
      name: data.name,
      email: data.email,
      password: data.password,
      role: 'citizen',
    });

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    sendAuthCookie(res, token);

    return res.status(201).json({
      success: true,
      message: 'Citizen account registered successfully.',
      user: newUser,
    });
  } catch (err) {
    console.error('[AuthRoutes register Error]', err);
    return res.status(500).json({ success: false, error: 'An internal server error occurred. Please try again later.' });
  }
});

/**
 * POST /api/auth/login
 * Log in as citizen or admin
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { isValid, errors, data } = validateLoginInput(req.body);
    if (!isValid) {
      const firstError = Object.values(errors).find((v) => typeof v === 'string') || 'Invalid email or password format.';
      return res.status(400).json({ success: false, error: firstError, errors });
    }

    const user = await usersRepo.findByEmail(data.email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Incorrect email or password',
      });
    }

    const match = await usersRepo.verifyPassword(data.password, user.passwordHash);
    if (!match) {
      return res.status(401).json({
        success: false,
        error: 'Incorrect email or password',
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    sendAuthCookie(res, token);

    return res.json({
      success: true,
      message: 'Authentication successful.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('[AuthRoutes login Error]', err);
    return res.status(500).json({ success: false, error: 'An internal server error occurred. Please try again later.' });
  }
});

/**
 * POST /api/auth/logout
 * Clear session cookie
 */
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
  });
  return res.json({ success: true, message: 'Logged out successfully.' });
});

/**
 * GET /api/auth/me
 * Get current session profile
 */
router.get('/me', requireAuth, (req, res) => {
  return res.json({
    success: true,
    user: req.user,
  });
});

export default router;
