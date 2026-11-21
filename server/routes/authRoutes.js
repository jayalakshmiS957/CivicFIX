import express from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { usersRepo } from '../repositories/usersRepo.js';
import { validateRegisterInput, validateLoginInput, validateMobileInput } from '../validators/authValidator.js';
import {
  generateAndSendOtp,
  verifyOtp,
  maskMobile,
  normalizeIndianMobile,
} from '../services/otpService.js';
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
    secure: config.nodeEnv === 'production' || Boolean(process.env.VERCEL),
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

/**
 * POST /api/auth/send-otp
 * Request OTP verification code for mobile number (Rate-limited, public)
 */
router.post('/send-otp', authLimiter, async (req, res) => {
  try {
    const { mobile, purpose = 'verification' } = req.body || {};
    const validation = validateMobileInput(mobile);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const result = await generateAndSendOtp(validation.mobile, purpose);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    return res.json({
      success: true,
      message: result.message,
      mobileMasked: result.mobileMasked,
      demoCode: result.demoCode,
    });
  } catch (err) {
    console.error('[AuthRoutes send-otp Error]', err);
    return res.status(500).json({ success: false, error: 'Failed to send OTP. Please try again.' });
  }
});

/**
 * POST /api/auth/verify-otp
 * Verify mobile OTP code (Rate-limited, public)
 */
router.post('/verify-otp', authLimiter, async (req, res) => {
  try {
    const { mobile, code } = req.body || {};
    const validation = validateMobileInput(mobile);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    if (!code || String(code).trim().length !== 6) {
      return res.status(400).json({ success: false, error: 'Please enter a 6-digit verification code.' });
    }

    const result = verifyOtp(validation.mobile, code);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    return res.json({
      success: true,
      message: 'OTP verified successfully.',
      verified: true,
    });
  } catch (err) {
    console.error('[AuthRoutes verify-otp Error]', err);
    return res.status(500).json({ success: false, error: 'Failed to verify OTP. Please try again.' });
  }
});

/**
 * POST /api/auth/register
 * Register a new citizen account with optional mobile & OTP verification
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

    // If mobile was provided with registration, verify OTP if passed
    if (data.mobile && req.body.otp) {
      const otpRes = verifyOtp(data.mobile, req.body.otp);
      if (!otpRes.success) {
        return res.status(400).json({ success: false, error: otpRes.error });
      }
    }

    const newUser = await usersRepo.create({
      name: data.name,
      email: data.email,
      password: data.password,
      mobile: data.mobile || null,
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
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        mobile: newUser.mobile ? maskMobile(newUser.mobile) : null,
        role: newUser.role,
      },
    });
  } catch (err) {
    console.error('[AuthRoutes register Error]', err);
    return res.status(500).json({ success: false, error: 'An internal server error occurred. Please try again later.' });
  }
});

/**
 * POST /api/auth/login
 * Log in as citizen.
 * - Rejects admin logins with 403 & friendly link to /admin/login
 * - Skips OTP for seeded demo citizens (citizen1 & citizen2) for zero disruption
 * - Requires OTP for regular citizens
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

    // If an administrator account attempts to log in via /login, reject with friendly 403
    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        isAdminAccount: true,
        error: 'Administrator account detected. Please use the Administrator Portal at /admin/login.',
      });
    }

    const isSeededCitizen =
      user.email.toLowerCase() === 'citizen1@civicresolve.gov' ||
      user.email.toLowerCase() === 'citizen2@civicresolve.gov';

    // Seeded demo citizens skip OTP verification completely (1-step login)
    if (!isSeededCitizen) {
      const citizenMobile = user.mobile || '9876543210';
      const inputOtp = req.body.otp;

      if (!inputOtp) {
        // Send / prepare OTP for regular citizen login
        const otpGen = await generateAndSendOtp(citizenMobile, 'login');
        return res.json({
          success: true,
          requiresOtp: true,
          mobileMasked: maskMobile(citizenMobile),
          demoCode: otpGen.demoCode || '123456',
          message: 'Please enter the 6-digit OTP sent to your registered mobile.',
        });
      }

      // Verify submitted OTP
      const otpVerify = verifyOtp(citizenMobile, inputOtp);
      if (!otpVerify.success) {
        return res.status(400).json({
          success: false,
          error: otpVerify.error,
        });
      }
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
        mobile: user.mobile ? maskMobile(user.mobile) : null,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('[AuthRoutes login Error]', err);
    return res.status(500).json({ success: false, error: 'An internal server error occurred. Please try again later.' });
  }
});

/**
 * POST /api/auth/admin-login
 * Dedicated Administrator Login endpoint.
 * - Rejects citizen accounts with friendly 403
 * - Requires password + demo OTP (code 123456)
 */
router.post('/admin-login', authLimiter, async (req, res) => {
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
        error: 'Incorrect administrator email or password',
      });
    }

    const match = await usersRepo.verifyPassword(data.password, user.passwordHash);
    if (!match) {
      return res.status(401).json({
        success: false,
        error: 'Incorrect administrator email or password',
      });
    }

    // If a citizen account tries to log in via /admin/login, reject with friendly 403
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied: Administrator accounts only. Citizens please use citizen sign in.',
      });
    }

    const inputOtp = req.body.otp;
    // Admin login requires password + OTP
    if (!inputOtp) {
      return res.json({
        success: true,
        requiresOtp: true,
        demoCode: '123456',
        message: 'Admin 2-step verification: please enter OTP 123456.',
      });
    }

    if (String(inputOtp).trim() !== '123456') {
      return res.status(400).json({
        success: false,
        error: 'Invalid admin verification OTP. In demo mode, please enter 123456.',
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
      message: 'Administrator authentication successful.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('[AuthRoutes admin-login Error]', err);
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
    secure: config.nodeEnv === 'production' || Boolean(process.env.VERCEL),
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
    user: {
      ...req.user,
      mobile: req.user.mobile ? maskMobile(req.user.mobile) : null,
    },
  });
});

export default router;
