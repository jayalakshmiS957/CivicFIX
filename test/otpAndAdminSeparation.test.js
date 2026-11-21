process.env.NODE_ENV = 'test';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateAndSendOtp,
  verifyOtp,
  normalizeIndianMobile,
  maskMobile,
  clearOtpStore,
  __setOtpRecord,
} from '../server/services/otpService.js';
import { usersRepo } from '../server/repositories/usersRepo.js';
import authRoutes from '../server/routes/authRoutes.js';

describe('OTP Verification & Admin Separation Test Suite', () => {
  beforeEach(() => {
    clearOtpStore();
  });

  // 1. Mobile normalization and privacy masking
  it('1. mobile normalization and privacy masking handles Indian numbers safely', () => {
    const rawNumbers = [
      '9876543210',
      '+91 9876543210',
      '91-9876543210',
      '09876543210',
    ];

    for (const raw of rawNumbers) {
      const normalized = normalizeIndianMobile(raw);
      assert.equal(normalized, '9876543210', `Expected ${raw} to normalize to 9876543210`);
      const masked = maskMobile(normalized);
      assert.equal(masked, '98XXXXX210', `Expected 98XXXXX210 but got ${masked}`);
    }

    assert.equal(normalizeIndianMobile('12345'), null, 'Short numbers must be rejected');
    assert.equal(normalizeIndianMobile('5876543210'), null, 'Numbers not starting with 6-9 must be rejected');
  });

  // 2. OTP generation and verification
  it('2. OTP generation, successful verification, and demo mode code return', async () => {
    const res = await generateAndSendOtp('+91 9876543210', 'registration');
    assert.equal(res.success, true);
    assert.equal(res.demoCode, '123456');
    assert.equal(res.mobileMasked, '98XXXXX210');

    // Verify successfully with the demo code
    const verifyRes = verifyOtp('9876543210', '123456');
    assert.equal(verifyRes.success, true);
    assert.equal(verifyRes.verified, true);

    // After success, OTP is consumed (cannot be reused)
    const secondTry = verifyOtp('9876543210', '123456');
    assert.equal(secondTry.success, false);
    assert.match(secondTry.error, /No active OTP/i);
  });

  // 3. OTP 3-attempt limit
  it('3. OTP enforces maximum 3 verification attempts before invalidating', async () => {
    await generateAndSendOtp('9876543210', 'login');

    // Attempt 1: wrong code
    const att1 = verifyOtp('9876543210', '000000');
    assert.equal(att1.success, false);
    assert.match(att1.error, /2 attempts remaining/i);

    // Attempt 2: wrong code
    const att2 = verifyOtp('9876543210', '111111');
    assert.equal(att2.success, false);
    assert.match(att2.error, /1 attempt remaining/i);

    // Attempt 3: wrong code -> maximum attempts reached and OTP deleted
    const att3 = verifyOtp('9876543210', '222222');
    assert.equal(att3.success, false);
    assert.match(att3.error, /Maximum verification attempts exceeded/i);

    // Next attempt: no active OTP exists
    const att4 = verifyOtp('9876543210', '123456');
    assert.equal(att4.success, false);
    assert.match(att4.error, /No active OTP found/i);
  });

  // 4. OTP expiry (5 minutes)
  it('4. OTP rejects expired verification attempts after 5 minutes', async () => {
    await generateAndSendOtp('9876543210', 'verification');

    // Simulate expired OTP record (expiresAt in the past)
    __setOtpRecord('9876543210', {
      hashedOtp: 'some_hash',
      expiresAt: Date.now() - 5000, // Expired 5 seconds ago
      attempts: 0,
      lastSentAt: Date.now() - 10000,
    });

    const verifyRes = verifyOtp('9876543210', '123456');
    assert.equal(verifyRes.success, false);
    assert.match(verifyRes.error, /OTP has expired/i);
  });

  // 5. 30s resend cooldown
  it('5. OTP resend enforces 30-second throttle cooldown', async () => {
    const res1 = await generateAndSendOtp('9876543210', 'verification');
    assert.equal(res1.success, true);

    // Immediate second attempt within 30s
    const res2 = await generateAndSendOtp('9876543210', 'verification');
    assert.equal(res2.success, false);
    assert.match(res2.error, /Please wait \d+s before requesting a new OTP/i);
  });

  // 6. Seeded demo citizen logins skip OTP (1-step login)
  it('6. seeded demo citizen logins (citizen1 & citizen2) skip OTP and authenticate immediately', async () => {
    const testCitizens = ['citizen1@civicresolve.gov', 'citizen2@civicresolve.gov'];

    for (const email of testCitizens) {
      let statusCode = 200;
      let responseBody = null;

      const req = {
        body: { email, password: 'Password@123' },
      };
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          responseBody = data;
          return this;
        },
        cookie() {},
      };

      // Call route handler directly from the router stack
      const loginRoute = authRoutes.stack.find(
        (layer) => layer.route && layer.route.path === '/login' && layer.route.methods.post
      );
      assert.ok(loginRoute, 'Must find POST /login route');

      // The last handle in the route stack is the route controller
      const handler = loginRoute.route.stack[loginRoute.route.stack.length - 1].handle;
      await handler(req, res);

      assert.equal(statusCode, 200);
      assert.equal(responseBody.success, true);
      assert.equal(responseBody.requiresOtp, undefined, 'Seeded citizen must NOT require OTP');
      assert.equal(responseBody.user.email.toLowerCase(), email);
      assert.equal(responseBody.user.role, 'citizen');
    }
  });

  // 7. Non-seeded citizens require OTP verification on login
  it('7. non-seeded citizen login requires OTP verification step', async () => {
    // Create a regular citizen user
    const regularEmail = `citizen_test_${Date.now()}@example.com`;
    await usersRepo.create({
      name: 'Regular Citizen',
      email: regularEmail,
      password: 'StrongPassword123!',
      mobile: '9876543210',
      role: 'citizen',
    });

    const loginRoute = authRoutes.stack.find(
      (layer) => layer.route && layer.route.path === '/login' && layer.route.methods.post
    );
    const handler = loginRoute.route.stack[loginRoute.route.stack.length - 1].handle;

    // Step 1: Submit email & password without OTP
    let statusCode = 200;
    let responseBody = null;
    const req1 = { body: { email: regularEmail, password: 'StrongPassword123!' } };
    const res1 = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseBody = data;
        return this;
      },
      cookie() {},
    };

    await handler(req1, res1);
    assert.equal(statusCode, 200);
    assert.equal(responseBody.success, true);
    assert.equal(responseBody.requiresOtp, true, 'Regular citizen must require OTP');
    assert.equal(responseBody.demoCode, '123456');

    // Step 2: Submit with valid OTP
    const req2 = { body: { email: regularEmail, password: 'StrongPassword123!', otp: '123456' } };
    const res2 = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseBody = data;
        return this;
      },
      cookie() {},
    };

    await handler(req2, res2);
    assert.equal(statusCode, 200);
    assert.equal(responseBody.success, true);
    assert.equal(responseBody.user.email.toLowerCase(), regularEmail);
  });

  // 8. Admin login page rejects citizen accounts with 403
  it('8. /admin/login rejects citizen accounts with 403 Forbidden', async () => {
    const adminLoginRoute = authRoutes.stack.find(
      (layer) => layer.route && layer.route.path === '/admin-login' && layer.route.methods.post
    );
    assert.ok(adminLoginRoute, 'Must find POST /admin-login route');
    const handler = adminLoginRoute.route.stack[adminLoginRoute.route.stack.length - 1].handle;

    let statusCode = null;
    let responseBody = null;
    const req = {
      body: {
        email: 'citizen1@civicresolve.gov',
        password: 'Password@123',
      },
    };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseBody = data;
        return this;
      },
      cookie() {},
    };

    await handler(req, res);

    assert.equal(statusCode, 403, 'Must return 403 Forbidden for citizen account');
    assert.equal(responseBody.success, false);
    assert.match(responseBody.error, /Access denied: Administrator accounts only/i);
  });

  // 9. Citizen login page detects administrator accounts with 403 and portal link
  it('9. citizen /login rejects administrator accounts with 403 and directs to /admin/login', async () => {
    const loginRoute = authRoutes.stack.find(
      (layer) => layer.route && layer.route.path === '/login' && layer.route.methods.post
    );
    const handler = loginRoute.route.stack[loginRoute.route.stack.length - 1].handle;

    let statusCode = null;
    let responseBody = null;
    const req = {
      body: {
        email: 'admin@civicresolve.gov',
        password: 'Admin@Civic2026!',
      },
    };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseBody = data;
        return this;
      },
      cookie() {},
    };

    await handler(req, res);

    assert.equal(statusCode, 403, 'Must return 403 Forbidden for admin account on citizen login');
    assert.equal(responseBody.success, false);
    assert.equal(responseBody.isAdminAccount, true);
    assert.match(responseBody.error, /Administrator account detected/i);
  });

  // 10. Admin login completes 2-step verification with OTP
  it('10. /admin/login completes 2-step verification with demo OTP 123456', async () => {
    const adminLoginRoute = authRoutes.stack.find(
      (layer) => layer.route && layer.route.path === '/admin-login' && layer.route.methods.post
    );
    const handler = adminLoginRoute.route.stack[adminLoginRoute.route.stack.length - 1].handle;

    // Step 1: Password only
    let statusCode = null;
    let responseBody = null;
    const req1 = {
      body: { email: 'admin@civicresolve.gov', password: 'Admin@Civic2026!' },
    };
    const res1 = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseBody = data;
        return this;
      },
      cookie() {},
    };
    await handler(req1, res1);
    assert.equal(responseBody.requiresOtp, true);
    assert.equal(responseBody.demoCode, '123456');

    // Step 2: Password + OTP
    const req2 = {
      body: { email: 'admin@civicresolve.gov', password: 'Admin@Civic2026!', otp: '123456' },
    };
    const res2 = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseBody = data;
        return this;
      },
      cookie() {},
    };
    await handler(req2, res2);
    assert.equal(responseBody.success, true);
    assert.equal(responseBody.user.role, 'admin');
    assert.equal(responseBody.user.email, 'admin@civicresolve.gov');
  });
});
