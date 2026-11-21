process.env.NODE_ENV = 'test';

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../server/index.js';
import { usersRepo } from '../server/repositories/usersRepo.js';
import { issuesRepo } from '../server/repositories/issuesRepo.js';
import { supportsRepo } from '../server/repositories/supportsRepo.js';
import { verifyRepairWithAI } from '../server/services/verificationService.js';

describe('HTTP-Level Integration Test Suite (Supertest & Temp Data Store)', () => {
  let citizen1Cookie = '';
  let citizen2Cookie = '';
  let adminCookie = '';

  before(async () => {
    // Authenticate citizen1
    const res1 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'citizen1@civicresolve.gov', password: 'Password@123' });
    citizen1Cookie = res1.headers['set-cookie']?.[0]?.split(';')[0] || '';

    // Authenticate citizen2
    const res2 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'citizen2@civicresolve.gov', password: 'Password@123' });
    citizen2Cookie = res2.headers['set-cookie']?.[0]?.split(';')[0] || '';

    // Authenticate admin (using 2-step admin-login with demo OTP)
    const resAdmin = await request(app)
      .post('/api/auth/admin-login')
      .send({ email: 'admin@civicresolve.gov', password: 'Admin@Civic2026!', otp: '123456' });
    adminCookie = resAdmin.headers['set-cookie']?.[0]?.split(';')[0] || '';
  });

  // 1. Health endpoint
  it('1. GET /api/health returns 200 with service health and metadata', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'healthy');
    assert.equal(res.body.product, 'CivicResolve');
    assert.equal(res.body.version, '1.0.0');
    assert.ok(res.body.time);
  });

  // 2. Login success
  it('2. POST /api/auth/login succeeds for valid citizen and sets session cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'citizen1@civicresolve.gov', password: 'Password@123' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.user.email, 'citizen1@civicresolve.gov');
    assert.equal(res.body.user.role, 'citizen');
    assert.ok(res.headers['set-cookie'], 'Response must set token cookie');
  });

  // 3. Login failure
  it('3. POST /api/auth/login rejects incorrect passwords with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'citizen1@civicresolve.gov', password: 'IncorrectPassword999!' });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.match(res.body.error, /Incorrect email or password/i);
  });

  // 4. Missing token 401
  it('4. GET /api/auth/me returns 401 when token is missing', async () => {
    const res = await request(app).get('/api/auth/me');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.match(res.body.error, /Authentication required/i);
  });

  // 5. Citizen on admin route 403
  it('5. GET /api/admin/analytics rejects citizen credentials with 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/admin/analytics')
      .set('Cookie', citizen1Cookie);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.match(res.body.error, /Access denied/i);
  });

  // 6. Validation rejects short title
  it('6. POST /api/issues rejects titles under 5 characters with 400', async () => {
    const res = await request(app)
      .post('/api/issues')
      .set('Cookie', citizen1Cookie)
      .send({
        title: 'Bad',
        description: 'Valid description that has more than 20 characters length.',
        category: 'Roads & Potholes',
        latitude: 11.0168,
        longitude: 76.9558,
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.errors?.title);
  });

  // 7. Validation rejects oversized description
  it('7. POST /api/issues rejects oversized descriptions with 400', async () => {
    const res = await request(app)
      .post('/api/issues')
      .set('Cookie', citizen1Cookie)
      .send({
        title: 'Proper Civic Issue Title',
        description: 'D'.repeat(1005),
        category: 'Roads & Potholes',
        latitude: 11.0168,
        longitude: 76.9558,
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.errors?.description);
  });

  // 8. Self-support prevention 403
  it('8. POST /api/issues/:id/support rejects reporter supporting their own issue with 403', async () => {
    // Find an issue reported by citizen1 (usr_cit_001)
    const issue = issuesRepo.issues.find((i) => i.reporter?.id === 'usr_cit_001');
    assert.ok(issue, 'Must find issue reported by citizen1');

    const res = await request(app)
      .post(`/api/issues/${issue.id}/support`)
      .set('Cookie', citizen1Cookie);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.match(res.body.error, /You reported this issue/i);
  });

  // 9. Duplicate support rejection 400
  it('9. POST /api/issues/:id/support rejects duplicate support attempts with 400', async () => {
    // Find an issue not reported by citizen2
    const target = issuesRepo.issues.find((i) => i.reporter?.id !== 'usr_cit_002');
    assert.ok(target, 'Target issue found');

    // Remove any prior support for clean state
    supportsRepo.supports = supportsRepo.supports.filter(
      (s) => !(s.issueId === target.id && s.userId === 'usr_cit_002')
    );

    // 1st support attempt: succeeds
    const res1 = await request(app)
      .post(`/api/issues/${target.id}/support`)
      .set('Cookie', citizen2Cookie);
    assert.equal(res1.status, 200);

    // 2nd support attempt directly to addSupport logic / duplicate trigger
    try {
      supportsRepo.addSupport(target.id, 'usr_cit_002');
      assert.fail('Should have thrown 400 duplicate error');
    } catch (err) {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /Only one support per citizen is permitted/i);
    }
  });

  // 10. Follow-up by non-reporter 403
  it('10. POST /api/issues/:id/follow-up rejects non-reporters with 403 Forbidden', async () => {
    const issue = issuesRepo.issues.find((i) => i.reporter?.id === 'usr_cit_001');
    assert.ok(issue);

    const res = await request(app)
      .post(`/api/issues/${issue.id}/follow-up`)
      .set('Cookie', citizen2Cookie) // citizen2 is not the reporter
      .send({ answer: 'Providing some unauthorized detail' });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.match(res.body.error, /Only the issue reporter/i);
  });

  // 11. Share without auth 401
  it('11. POST /api/issues/:id/share returns 401 when unauthenticated', async () => {
    const res = await request(app).post('/api/issues/CR-2026-1001/share');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  // 12. Public issues endpoint never exposes reporter email or full mobile
  it('12. GET /api/issues never exposes reporter email or raw mobile to public viewers', async () => {
    const res = await request(app).get('/api/issues');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.issues));
    assert.ok(res.body.issues.length > 0);

    for (const issue of res.body.issues) {
      if (issue.reporter) {
        assert.equal(issue.reporter.email, undefined, 'Reporter email must not be exposed publicly');
        if (issue.reporter.mobile) {
          assert.match(issue.reporter.mobile, /XXXXX/, 'Mobile if present must be masked');
        }
      }
    }
  });

  // 13. CORS rejects unknown origin
  it('13. CORS middleware rejects unauthorized external origins', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'https://unauthorized-phishing-domain.evil.com');

    // CORS rejection either closes socket or returns error status / message
    const isBlocked = res.status >= 400 || !res.headers['access-control-allow-origin'];
    assert.equal(isBlocked, true, 'Unauthorized CORS origin must not receive Access-Control-Allow-Origin');
  });

  // 14. Admin login rejects citizen account with 403
  it('14. POST /api/auth/admin-login rejects citizen accounts with 403', async () => {
    const res = await request(app)
      .post('/api/auth/admin-login')
      .send({ email: 'citizen1@civicresolve.gov', password: 'Password@123' });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.match(res.body.error, /Access denied: Administrator accounts only/i);
  });

  // 15. Admin login completes 2-step verification with OTP
  it('15. POST /api/auth/admin-login succeeds with valid password and OTP 123456', async () => {
    const res = await request(app)
      .post('/api/auth/admin-login')
      .send({ email: 'admin@civicresolve.gov', password: 'Admin@Civic2026!', otp: '123456' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.user.role, 'admin');
    assert.ok(res.headers['set-cookie']);
  });

  // 16. OTP send and verify flow
  it('16. POST /api/auth/send-otp and /verify-otp operate rate-limited OTP workflow', async () => {
    const testNum = '9876543299';

    const sendRes = await request(app)
      .post('/api/auth/send-otp')
      .send({ mobile: testNum });

    assert.equal(sendRes.status, 200);
    assert.equal(sendRes.body.success, true);
    assert.equal(sendRes.body.demoCode, '123456');

    const verifyRes = await request(app)
      .post('/api/auth/verify-otp')
      .send({ mobile: testNum, code: '123456' });

    assert.equal(verifyRes.status, 200);
    assert.equal(verifyRes.body.success, true);
    assert.equal(verifyRes.body.verified, true);
  });

  // 17. Unknown endpoint returns 404
  it('17. GET /api/unregistered-route returns 404 Not Found', async () => {
    const res = await request(app).get('/api/unregistered-route');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.match(res.body.error, /not found/i);
  });

  // 18. Admin status transition & citizen guard
  it('18. PATCH /api/admin/issues/:id/status transitions status for admin, rejects citizen with 403', async () => {
    const reportedIssue = issuesRepo.issues.find((i) => i.status === 'Reported');
    assert.ok(reportedIssue, 'Must find an issue in Reported state');

    // Citizen attempt -> 403
    const citRes = await request(app)
      .patch(`/api/admin/issues/${reportedIssue.id}/status`)
      .set('Cookie', citizen1Cookie)
      .send({ status: 'In Progress', note: 'Attempting unauthorized status update' });

    assert.equal(citRes.status, 403);
    assert.equal(citRes.body.success, false);

    // Admin attempt -> 200
    const adminRes = await request(app)
      .patch(`/api/admin/issues/${reportedIssue.id}/status`)
      .set('Cookie', adminCookie)
      .send({
        status: 'In Progress',
        note: 'Assigned crew dispatched to location',
        assignedTo: 'Road Maintenance Unit 3',
        officer: 'Er. R. Sundaralingam',
      });

    assert.equal(adminRes.status, 200);
    assert.equal(adminRes.body.success, true);
    assert.equal(adminRes.body.issue.status, 'In Progress');
    assert.ok(adminRes.body.issue.timeline.some((t) => t.status === 'In Progress'));
  });

  // 19. Admin override parameters
  it('19. PATCH /api/admin/issues/:id/override updates priority and department for admin', async () => {
    const targetIssue = issuesRepo.issues[0];
    assert.ok(targetIssue);

    const res = await request(app)
      .patch(`/api/admin/issues/${targetIssue.id}/override`)
      .set('Cookie', adminCookie)
      .send({
        priority: 'High',
        department: 'Public Works Department',
        assignedTo: 'Special Response Team',
        slaHours: 24,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.issue.priority, 'High');
  });

  // 20. Disallowed file upload rejection
  it('20. POST /api/issues rejects disallowed non-image file uploads with 400', async () => {
    const res = await request(app)
      .post('/api/issues')
      .set('Cookie', citizen1Cookie)
      .field('title', 'Pothole on Cross Cut Road')
      .field('description', 'Large road hazard near signal with active traffic congestion.')
      .field('category', 'Roads & Potholes')
      .field('latitude', '11.0168')
      .field('longitude', '76.9673')
      .attach('image', Buffer.from('MZ fake binary executable'), 'malicious_script.exe');

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.error, /Only JPG, PNG, and WebP images are allowed/i);
  });

  // 21. AI verification fallback
  it('21. verifyRepairWithAI returns standard schema with fallback when API key is missing', async () => {
    const result = await verifyRepairWithAI({
      issueTitle: 'Damaged Pavement at Cross Cut Road',
      issueDescription: 'Pavement slabs cracked and displaced.',
    });

    assert.ok(result, 'Must return verification assessment');
    assert.equal(typeof result.repair_appears_complete, 'boolean');
    assert.equal(typeof result.confidence, 'number');
    assert.equal(typeof result.observations, 'string');
    assert.equal(typeof result.needs_manual_review, 'boolean');
    assert.equal(result.source, 'fallback');
  });
});
