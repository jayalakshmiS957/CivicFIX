process.env.NODE_ENV = 'test';

import { describe, it } from 'node:test';
import assert from 'node:assert';
import bcrypt from 'bcryptjs';
import { validateRegisterInput, validateLoginInput } from '../server/validators/authValidator.js';
import { requireRole } from '../server/middleware/auth.js';

describe('Auth Validation & Role Guard Test Suite', () => {
  it('should validate clean citizen registration data', () => {
    const input = {
      name: 'Priya Sundaram',
      email: 'priya.sundaram@gmail.com',
      password: 'StrongPassword123!',
    };

    const { isValid, errors, data } = validateRegisterInput(input);
    assert.strictEqual(isValid, true);
    assert.strictEqual(Object.keys(errors).length, 0);
    assert.strictEqual(data.email, 'priya.sundaram@gmail.com');
  });

  it('should reject invalid email formats and short passwords', () => {
    const badInput = {
      name: 'P',
      email: 'not-an-email',
      password: '123',
    };

    const { isValid, errors } = validateRegisterInput(badInput);
    assert.strictEqual(isValid, false);
    assert.ok(errors.name);
    assert.ok(errors.email);
    assert.ok(errors.password);
  });

  it('should validate and verify bcrypt hashed passwords accurately', async () => {
    const plainText = 'SecureCitizenPassword2026';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(plainText, salt);

    const matches = await bcrypt.compare(plainText, hash);
    const mismatches = await bcrypt.compare('WrongPassword', hash);

    assert.strictEqual(matches, true);
    assert.strictEqual(mismatches, false);
  });

  it('should block non-admin users with 403 Forbidden when accessing admin guards', () => {
    const guard = requireRole('admin');

    const citizenReq = {
      user: { id: 'usr_1', role: 'citizen', name: 'Citizen User' },
    };

    let statusCode = null;
    let jsonResponse = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(payload) {
        jsonResponse = payload;
        return this;
      },
    };

    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    guard(citizenReq, res, next);
    assert.strictEqual(nextCalled, false, 'Next should not be called for citizen role');
    assert.strictEqual(statusCode, 403);
    assert.strictEqual(jsonResponse.success, false);
    assert.ok(jsonResponse.error.includes('admin'));

    // Test with admin role
    const adminReq = {
      user: { id: 'usr_admin', role: 'admin', name: 'Admin User' },
    };
    nextCalled = false;
    guard(adminReq, res, next);
    assert.strictEqual(nextCalled, true, 'Next should be called for admin role');
  });

  it('should sanitize reporter info on public endpoints for non-admins', () => {
    // Helper function matching the route implementation
    const sanitizeReporter = (reporter, user) => {
      if (user && user.role === 'admin') return reporter;
      const firstName = reporter?.name ? reporter.name.trim().split(/\s+/)[0] : 'Citizen';
      return { id: reporter.id, name: firstName };
    };

    const fullReporter = {
      id: 'usr_cit_001',
      name: 'Karthik Subramanian',
      email: 'karthik@example.com',
    };

    // Anonymous caller
    const anonResult = sanitizeReporter(fullReporter, null);
    assert.strictEqual(anonResult.name, 'Karthik');
    assert.strictEqual(anonResult.email, undefined);

    // Citizen caller
    const citResult = sanitizeReporter(fullReporter, { id: 'usr_cit_002', role: 'citizen' });
    assert.strictEqual(citResult.name, 'Karthik');
    assert.strictEqual(citResult.email, undefined);

    // Admin caller retains full information
    const adminResult = sanitizeReporter(fullReporter, { id: 'usr_adm_001', role: 'admin' });
    assert.strictEqual(adminResult.name, 'Karthik Subramanian');
    assert.strictEqual(adminResult.email, 'karthik@example.com');
  });

  it('should expose demo accounts from single source of truth and verify credentials', async () => {
    const { DEMO_ACCOUNTS } = await import('../server/data/demoAccounts.js');
    const { usersRepo } = await import('../server/repositories/usersRepo.js');

    assert.strictEqual(DEMO_ACCOUNTS.length, 3);
    const emails = DEMO_ACCOUNTS.map((a) => a.email);
    assert.ok(emails.includes('citizen1@civicresolve.gov'));
    assert.ok(emails.includes('citizen2@civicresolve.gov'));
    assert.ok(emails.includes('admin@civicresolve.gov'));

    for (const demo of DEMO_ACCOUNTS) {
      const user = await usersRepo.findByEmail(demo.email);
      assert.ok(user, `User ${demo.email} should exist in usersRepo`);
      assert.strictEqual(user.id, demo.id);
      assert.strictEqual(user.role, demo.role);
      const passValid = await usersRepo.verifyPassword(demo.password, user.passwordHash);
      assert.strictEqual(passValid, true, `Password for ${demo.email} should match bcrypt hash`);
    }
  });

  it('should return session expired message when auth token verification fails', async () => {
    const { requireAuth } = await import('../server/middleware/auth.js');
    const expiredReq = {
      cookies: { token: 'invalid_expired_token' },
      headers: {},
    };

    let statusCode = null;
    let jsonResponse = null;
    let clearedCookie = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(payload) {
        jsonResponse = payload;
        return this;
      },
      clearCookie(name) {
        clearedCookie = name;
      },
    };

    let nextCalled = false;
    await requireAuth(expiredReq, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(statusCode, 401);
    assert.strictEqual(clearedCookie, 'token');
    assert.strictEqual(jsonResponse.error, 'Your session expired, please sign in again');
  });
});
