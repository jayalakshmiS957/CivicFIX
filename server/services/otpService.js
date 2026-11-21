import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Normalizes an Indian mobile number.
 * Accepts formats like:
 * - 9876543210
 * - +91 9876543210
 * - 91-9876543210
 * - 09876543210
 * Returns clean 10-digit string or null if invalid.
 * @param {string} mobileStr
 * @returns {string|null}
 */
export function normalizeIndianMobile(mobileStr) {
  if (typeof mobileStr !== 'string') return null;
  const digits = mobileStr.replace(/\D/g, '');

  // 10 digits starting with 6, 7, 8, or 9
  if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
    return digits;
  }
  // 12 digits starting with 91 followed by 6-9
  if (digits.length === 12 && digits.startsWith('91') && /^[6-9]\d{9}$/.test(digits.slice(2))) {
    return digits.slice(2);
  }
  // 11 digits starting with 0 followed by 6-9
  if (digits.length === 11 && digits.startsWith('0') && /^[6-9]\d{9}$/.test(digits.slice(1))) {
    return digits.slice(1);
  }
  return null;
}

/**
 * Masks an Indian mobile number for UI privacy (e.g. 98XXXXX210).
 * @param {string} mobileStr
 * @returns {string}
 */
export function maskMobile(mobileStr) {
  const normalized = normalizeIndianMobile(mobileStr) || String(mobileStr || '').replace(/\D/g, '');
  if (normalized.length >= 10) {
    const clean = normalized.slice(-10);
    return `${clean.slice(0, 2)}XXXXX${clean.slice(-3)}`;
  }
  if (normalized.length > 4) {
    return `${normalized.slice(0, 2)}XXXX${normalized.slice(-2)}`;
  }
  return 'XXXXXXXXXX';
}

/**
 * Provider hook for sending SMS.
 * In demo mode (default OTP_MODE !== 'production'), this is a no-op so real providers can be plugged in later.
 * @param {string} mobile
 * @param {string} code
 * @returns {Promise<{ sent: boolean, demo?: boolean }>}
 */
export async function sendSms(mobile, code) {
  if (process.env.OTP_MODE === 'production' && process.env.SMS_PROVIDER_API_KEY) {
    // Production provider integration hook (e.g. Twilio, MSG91, AWS SNS)
    // Dispatch real SMS payload here.
    return { sent: true };
  }
  // In demo mode, no real SMS is dispatched
  return { sent: true, demo: true };
}

// In-memory OTP storage
const otpStore = new Map();

// Optional Vercel /tmp persistence backup
const VERCEL_OTP_FILE = path.join('/tmp', 'civic_otps.json');

function saveToVercelTmp() {
  if (!process.env.VERCEL) return;
  try {
    const obj = {};
    for (const [key, value] of otpStore.entries()) {
      obj[key] = value;
    }
    fs.writeFileSync(VERCEL_OTP_FILE, JSON.stringify(obj), 'utf-8');
  } catch {
    // Graceful fallback to memory
  }
}

function loadFromVercelTmp(mobile) {
  if (!process.env.VERCEL) return null;
  try {
    if (fs.existsSync(VERCEL_OTP_FILE)) {
      const data = JSON.parse(fs.readFileSync(VERCEL_OTP_FILE, 'utf-8'));
      if (data[mobile]) {
        otpStore.set(mobile, data[mobile]);
        return data[mobile];
      }
    }
  } catch {
    // Fall back to memory
  }
  return null;
}

/**
 * Generates and stores OTP for a normalized mobile number.
 * Enforces a 30s resend timer and 5-minute expiry.
 * In demo mode (default), generates '123456'.
 * @param {string} mobile
 * @param {string} [purpose='verification']
 * @returns {Promise<{ success: boolean, message?: string, error?: string, mobileMasked?: string, demoCode?: string }>}
 */
export async function generateAndSendOtp(mobile, purpose = 'verification') {
  const normalized = normalizeIndianMobile(mobile);
  if (!normalized) {
    return {
      success: false,
      error: 'Please provide a valid 10-digit Indian mobile number.',
    };
  }

  const existing = otpStore.get(normalized) || loadFromVercelTmp(normalized);
  const now = Date.now();

  // Enforce 30s resend cooldown
  if (existing && existing.lastSentAt && now - existing.lastSentAt < 30 * 1000) {
    const waitSec = Math.ceil((30 * 1000 - (now - existing.lastSentAt)) / 1000);
    return {
      success: false,
      error: `Please wait ${waitSec}s before requesting a new OTP.`,
    };
  }

  const isProduction = process.env.OTP_MODE === 'production';
  const code = isProduction ? Math.floor(100000 + Math.random() * 900000).toString() : '123456';
  const hashedOtp = crypto.createHash('sha256').update(code).digest('hex');

  const record = {
    hashedOtp,
    expiresAt: now + 5 * 60 * 1000, // 5 minutes expiry
    attempts: 0,
    lastSentAt: now,
    purpose,
  };

  otpStore.set(normalized, record);
  saveToVercelTmp();

  await sendSms(normalized, code);

  return {
    success: true,
    message: 'OTP sent successfully.',
    mobileMasked: maskMobile(normalized),
    demoCode: isProduction ? undefined : code,
  };
}

/**
 * Verifies OTP for a normalized mobile number.
 * Enforces 5-minute expiry and 3-attempt limit.
 * @param {string} mobile
 * @param {string} code
 * @returns {{ success: boolean, verified?: boolean, error?: string }}
 */
export function verifyOtp(mobile, code) {
  const normalized = normalizeIndianMobile(mobile);
  if (!normalized) {
    return {
      success: false,
      error: 'Please provide a valid 10-digit Indian mobile number.',
    };
  }

  const record = otpStore.get(normalized) || loadFromVercelTmp(normalized);
  if (!record) {
    return {
      success: false,
      error: 'No active OTP found. Please request a new OTP.',
    };
  }

  const now = Date.now();

  // Expiry check
  if (now > record.expiresAt) {
    otpStore.delete(normalized);
    saveToVercelTmp();
    return {
      success: false,
      error: 'OTP has expired. Please request a new OTP.',
    };
  }

  // Attempt limit check
  if (record.attempts >= 3) {
    otpStore.delete(normalized);
    saveToVercelTmp();
    return {
      success: false,
      error: 'Maximum verification attempts exceeded. Please request a new OTP.',
    };
  }

  const inputHash = crypto.createHash('sha256').update(String(code || '').trim()).digest('hex');

  if (inputHash !== record.hashedOtp) {
    record.attempts += 1;
    saveToVercelTmp();

    if (record.attempts >= 3) {
      otpStore.delete(normalized);
      saveToVercelTmp();
      return {
        success: false,
        error: 'Maximum verification attempts exceeded. Please request a new OTP.',
      };
    }

    const remaining = 3 - record.attempts;
    return {
      success: false,
      error: `Invalid OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
    };
  }

  // Verification successful: consume OTP
  otpStore.delete(normalized);
  saveToVercelTmp();

  return {
    success: true,
    verified: true,
  };
}

// Helpers for testing
export function clearOtpStore() {
  otpStore.clear();
}

export function __getOtpRecord(mobile) {
  const normalized = normalizeIndianMobile(mobile);
  return otpStore.get(normalized);
}

export function __setOtpRecord(mobile, record) {
  const normalized = normalizeIndianMobile(mobile);
  otpStore.set(normalized, record);
}
