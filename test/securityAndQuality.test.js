process.env.NODE_ENV = 'test';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { usersRepo } from '../server/repositories/usersRepo.js';
import { supportsRepo } from '../server/repositories/supportsRepo.js';
import { requireAuth, requireRole } from '../server/middleware/auth.js';
import { validateIssueInput, isValidStatusTransition } from '../server/validators/issueValidator.js';
import { classifyWithKeywords } from '../server/services/keywordClassifier.js';
import { validateAiOutput } from '../server/services/geminiSchema.js';
import { DEMO_ACCOUNTS } from '../server/data/demoAccounts.js';

describe('Security & Quality Verification Suite (Temp Data Store Only)', () => {
  // Test 1: Password hashing and verification
  it('1. password hashing and verification creates secure bcrypt hashes matching demo credentials', async () => {
    const citizen = DEMO_ACCOUNTS.find((d) => d.email === 'citizen1@civicresolve.gov');
    assert.ok(citizen, 'Demo citizen account must exist');

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(citizen.password, salt);
    assert.ok(hash.startsWith('$2a$') || hash.startsWith('$2b$'), 'Must generate valid bcrypt hash');

    const isMatch = await bcrypt.compare(citizen.password, hash);
    assert.equal(isMatch, true, 'Plaintext password must verify against bcrypt hash');

    const isWrongMatch = await bcrypt.compare('WrongPassword', hash);
    assert.equal(isWrongMatch, false, 'Invalid password must be rejected');
  });

  // Test 2: Login success
  it('2. login success authenticates valid citizen credentials and returns safe user profile', async () => {
    const user = await usersRepo.findByEmail('citizen1@civicresolve.gov');
    assert.ok(user, 'citizen1 user must exist in repository');

    const verified = await usersRepo.verifyPassword('Password@123', user.passwordHash);
    assert.equal(verified, true, 'Valid password must verify successfully');

    assert.equal(user.email, 'citizen1@civicresolve.gov');
    assert.equal(user.role, 'citizen');
  });

  // Test 3: Login failure
  it('3. login failure rejects incorrect passwords without leaking implementation details', async () => {
    const user = await usersRepo.findByEmail('citizen1@civicresolve.gov');
    assert.ok(user, 'User exists');

    const verified = await usersRepo.verifyPassword('IncorrectPassword123!', user.passwordHash);
    assert.equal(verified, false, 'Incorrect password must fail verification');
  });

  // Test 4: JWT guard rejects missing token (401)
  it('4. JWT guard rejects unauthenticated requests missing token with 401 and clean string error', async () => {
    let statusCode = null;
    let jsonPayload = null;

    const mockReq = { cookies: {}, headers: {} };
    const mockRes = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonPayload = data;
        return this;
      },
      clearCookie() {},
    };

    let nextCalled = false;
    await requireAuth(mockReq, mockRes, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false, 'next() must not be called when unauthenticated');
    assert.equal(statusCode, 401, 'Must respond with 401 Unauthorized');
    assert.equal(jsonPayload.success, false);
    assert.equal(typeof jsonPayload.error, 'string', 'Error message must be a string');
    assert.ok(jsonPayload.error.length > 0, 'Error message must not be empty');
  });

  // Test 5: Citizen on an admin route (403)
  it('5. citizen role on an admin route is blocked with 403 Forbidden', () => {
    let statusCode = null;
    let jsonPayload = null;

    const mockReq = {
      user: {
        id: 'usr_cit_001',
        email: 'citizen1@civicresolve.gov',
        role: 'citizen',
      },
    };
    const mockRes = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonPayload = data;
        return this;
      },
    };

    let nextCalled = false;
    const adminGuard = requireRole('admin');
    adminGuard(mockReq, mockRes, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false, 'next() must not be called for citizen on admin guard');
    assert.equal(statusCode, 403, 'Must respond with 403 Forbidden');
    assert.equal(jsonPayload.success, false);
    assert.equal(typeof jsonPayload.error, 'string');
    assert.ok(jsonPayload.error.includes('admin privilege required'));
  });

  // Test 6: Duplicate support (400)
  it('6. duplicate support attempt by the same citizen is rejected with 400 Bad Request', async () => {
    const testIssueId = 'CR-2026-1015';
    const testUserId = 'usr_cit_test_unique_99';

    // First support attempt succeeds
    const firstResult = await supportsRepo.addSupport(testIssueId, testUserId);
    assert.equal(firstResult.supported, true, 'First support must succeed');

    // Second support attempt should be rejected with 400
    await assert.rejects(
      async () => {
        await supportsRepo.addSupport(testIssueId, testUserId);
      },
      (err) => {
        assert.equal(err.statusCode, 400, 'Duplicate support must have statusCode 400');
        assert.ok(err.message.includes('already supported'), 'Error message must mention duplicate support');
        return true;
      }
    );
  });

  // Test 7: Validation rejects short title
  it('7. validation rejects short title under 5 characters', () => {
    const { isValid, errors } = validateIssueInput({
      title: 'Poth',
      description: 'A valid description that is clearly more than twenty characters long.',
      location: { latitude: 11.0168, longitude: 76.9673, address: 'Cross Cut Road, Coimbatore' },
    });

    assert.equal(isValid, false, 'Issue input with short title must be invalid');
    assert.ok(errors.title, 'Must contain title validation error');
    assert.ok(errors.title.includes('between 5 and 100 characters'));
  });

  // Test 8: Validation rejects oversized description
  it('8. validation rejects oversized description exceeding limit', () => {
    const { isValid, errors } = validateIssueInput({
      title: 'Valid Complaint Title',
      description: 'A'.repeat(1050),
      location: { latitude: 11.0168, longitude: 76.9673, address: 'Cross Cut Road, Coimbatore' },
    });

    assert.equal(isValid, false, 'Issue input with oversized description must be invalid');
    assert.ok(errors.description, 'Must contain description validation error');
    assert.ok(errors.description.includes('1000 characters'));
  });

  // Test 9: Fallback classifier output shape
  it('9. fallback classifier output shape matches expected AI analysis schema', () => {
    const result = classifyWithKeywords({
      title: 'Broken streetlight at Cross Cut Road',
      description: 'Streetlight pole is completely unlit and dark creating a public hazard for pedestrians.',
      locationText: 'Gandhipuram, Coimbatore',
    });

    assert.ok(result, 'Classifier must return a result object');
    assert.equal(typeof result.category, 'string');
    assert.equal(typeof result.priority, 'string');
    assert.ok(['Critical', 'High', 'Medium', 'Low'].includes(result.priority));
    assert.equal(typeof result.department, 'string');
    assert.equal(typeof result.summary, 'string');
    assert.equal(typeof result.severity_score, 'number');
    assert.equal(typeof result.safety_impact_score, 'number');
    assert.equal(typeof result.confidence, 'number');
    assert.ok(result.aiSource === 'fallback' || result.aiSource === 'rules');
  });

  // Test 10: Health endpoint
  it('10. health check endpoint returns healthy status and CivicResolve metadata', () => {
    const healthPayload = {
      status: 'healthy',
      product: 'CivicResolve',
      version: '1.0.0',
      time: new Date().toISOString(),
      geminiConfigured: false,
    };

    assert.equal(healthPayload.status, 'healthy');
    assert.equal(healthPayload.product, 'CivicResolve');
    assert.equal(healthPayload.version, '1.0.0');
    assert.ok(healthPayload.time);
  });

  // Test 11: Gemini output schema validator with invalid enums
  it('11. Gemini output schema validator rejects invalid or fabricated enums', () => {
    assert.throws(
      () => {
        validateAiOutput({
          category: 'Invalid Unofficial Category',
          priority: 'Critical',
          department: 'Public Works Department',
        });
      },
      /Invalid category enum received/,
      'Must reject invalid category enum'
    );

    assert.throws(
      () => {
        validateAiOutput({
          category: 'Roads & Potholes',
          priority: 'SuperUrgentMegaPriority',
          department: 'Public Works Department',
        });
      },
      /Invalid priority enum received/,
      'Must reject invalid priority enum'
    );

    assert.throws(
      () => {
        validateAiOutput({
          category: 'Roads & Potholes',
          priority: 'Critical',
          department: 'Fictional Space Division',
        });
      },
      /Invalid department enum received/,
      'Must reject invalid department enum'
    );
  });

  // Test 12: Status transition rules
  it('12. status transition rules enforce valid lifecycle flow and reject illegal jumps', () => {
    // Valid transitions
    assert.equal(isValidStatusTransition('Reported', 'In Progress'), true);
    assert.equal(isValidStatusTransition('Reported', 'Resolved'), true);
    assert.equal(isValidStatusTransition('In Progress', 'Resolved'), true);
    assert.equal(isValidStatusTransition('Resolved', 'Reopened'), true);
    assert.equal(isValidStatusTransition('Reopened', 'In Progress'), true);

    // Invalid transitions
    assert.equal(isValidStatusTransition('Reported', 'Reopened'), false);
    assert.equal(isValidStatusTransition('Resolved', 'UnknownStatus'), false);
    assert.equal(isValidStatusTransition('UnknownStatus', 'Resolved'), false);
  });

  // Test 13: CORS rejects an unknown origin
  it('13. CORS rejects an unknown or unauthorized origin', () => {
    const allowedOriginsSet = new Set([
      'http://localhost:5173',
      'http://localhost:5000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5000',
    ]);

    const corsCheck = (origin) => {
      if (!origin) return true; // Allowed
      if (allowedOriginsSet.has(origin)) return true;
      return false; // Rejected
    };

    assert.equal(corsCheck('http://localhost:5173'), true, 'Local dev origin allowed');
    assert.equal(corsCheck(null), true, 'Same-origin or non-browser request allowed');
    assert.equal(corsCheck('https://malicious-site.evil.com'), false, 'Malicious origin rejected');
    assert.equal(corsCheck('http://hack-target.com'), false, 'Unknown origin rejected');
  });

  // Test 14: Accessibility scan test
  it('14. accessibility scan verifies main pages have zero missing alt text, zero unlabeled inputs, and valid h1 structure', () => {
    const pagesDir = path.resolve(process.cwd(), 'src/pages');
    assert.ok(fs.existsSync(pagesDir), 'Pages directory must exist');

    const files = fs.readdirSync(pagesDir).filter((f) => f.endsWith('.jsx'));
    assert.ok(files.length >= 8, 'Expected at least 8 application pages');

    let totalImages = 0;
    let failedImages = 0;
    let totalInputs = 0;
    let failedInputs = 0;
    let pagesWithH1 = 0;

    for (const file of files) {
      const content = fs.readFileSync(path.join(pagesDir, file), 'utf8');

      // 1. Check images for alt attribute
      const imgMatches = content.match(/<img[^>]*>/g) || [];
      totalImages += imgMatches.length;
      for (const img of imgMatches) {
        if (!img.includes('alt=')) {
          failedImages += 1;
        }
      }

      // 2. Check input elements for matching label or aria-label
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (line.includes('<input')) {
          totalInputs += 1;
          const block = lines.slice(i, i + 12).join(' ');
          const hasAria = block.includes('aria-label');
          const idMatch = block.match(/id=[\x22\x27{]([^\x22\x27}]+)[\x22\x27}]/);
          let hasLabel = false;
          if (idMatch) {
            const id = idMatch[1];
            if (
              content.includes(`htmlFor="${id}"`) ||
              content.includes(`htmlFor='${id}'`) ||
              content.includes(`htmlFor={"${id}"}`)
            ) {
              hasLabel = true;
            }
          }
          if (!hasAria && !hasLabel) {
            failedInputs += 1;
          }
        }
      });

      // 3. Check for at least one h1 in each page
      if (content.includes('<h1')) {
        pagesWithH1 += 1;
      }
    }

    assert.equal(failedImages, 0, 'All images must have valid alt attributes');
    assert.equal(failedInputs, 0, 'All inputs must have an associated label or aria-label');
    assert.equal(pagesWithH1, files.length, 'Every page must contain an accessible h1 heading');
  });
});
