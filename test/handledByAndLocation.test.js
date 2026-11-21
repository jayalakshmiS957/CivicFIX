process.env.NODE_ENV = 'test';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { issuesRepo, computeHandledBy } from '../server/repositories/issuesRepo.js';
import issueRoutes from '../server/routes/issueRoutes.js';

describe('HandledBy, Location Filtering, and Admin Route Guard Test Suite', () => {
  it('computeHandledBy derives structured department, crew, officer, and office data', () => {
    const mockIssue = {
      id: 'CR-2026-TEST',
      department: 'Public Works Department',
      status: 'In Progress',
      location: {
        locality: 'Gandhipuram',
        address: 'Cross Cut Road, Gandhipuram',
        landmark: 'Near City Bus Stand',
      },
      createdAt: '2026-03-01T10:00:00Z',
    };

    const handled = computeHandledBy(mockIssue);
    assert.ok(handled, 'handledBy should not be null');
    assert.equal(handled.department, 'Public Works Department');
    assert.ok(handled.crew.includes('PWD') || handled.crew.includes('Public Works'), 'crew should name department or short name');
    assert.ok(handled.officer.name.includes('(Fictional)'), 'officer name must be flagged fictional');
    assert.ok(handled.office.name, 'office name should be present');
    assert.ok(handled.office.address, 'office address should be present');
    assert.ok(handled.office.hours, 'office hours should be present');
    assert.ok(handled.office.phone.startsWith('0422-'), 'phone placeholder format must match 0422-');
    assert.equal(handled.locality, 'Gandhipuram');
    assert.equal(handled.landmark, 'Near City Bus Stand');
  });

  it('all enriched issues in repository include handledBy object', async () => {
    const issues = await issuesRepo.getAll();
    assert.ok(issues.length > 0, 'Repository should contain issues');

    for (const issue of issues) {
      assert.ok(issue.handledBy, `Issue ${issue.id} must have handledBy attached`);
      assert.ok(issue.handledBy.crew, `Issue ${issue.id} must have a crew`);
      assert.ok(issue.handledBy.officer?.name, `Issue ${issue.id} must have an officer name`);
      assert.ok(issue.handledBy.officer.name.includes('(Fictional)'), 'Officer must be fictional');
    }
  });

  it('filters issues by locality properly for Gandhipuram, RS Puram, and Other areas', async () => {
    const allIssues = await issuesRepo.getAll();
    const gandhipuramIssues = await issuesRepo.getAll({ location: 'Gandhipuram' });
    const rsPuramIssues = await issuesRepo.getAll({ location: 'RS Puram' });
    const otherIssues = await issuesRepo.getAll({ location: 'Other areas' });

    assert.ok(gandhipuramIssues.length > 0, 'Should find Gandhipuram issues');
    assert.ok(rsPuramIssues.length > 0, 'Should find RS Puram issues');

    // Gandhipuram issues must match Gandhipuram
    for (const issue of gandhipuramIssues) {
      const loc = (issue.location?.locality || '') + ' ' + (issue.location?.address || '');
      assert.match(loc.toLowerCase(), /gandhipuram/i);
    }

    // RS Puram issues must match RS Puram
    for (const issue of rsPuramIssues) {
      const loc = (issue.location?.locality || '') + ' ' + (issue.location?.address || '');
      assert.match(loc.toLowerCase(), /rs puram/i);
    }

    // Other areas issues must not contain Gandhipuram, RS Puram, or Peelamedu
    for (const issue of otherIssues) {
      const loc = ((issue.location?.locality || '') + ' ' + (issue.location?.address || '')).toLowerCase();
      assert.equal(loc.includes('gandhipuram'), false);
      assert.equal(loc.includes('rs puram'), false);
      assert.equal(loc.includes('peelamedu'), false);
    }
  });

  it('sorts issues alphabetically by location (A-Z)', async () => {
    const sorted = await issuesRepo.getAll({ sort: 'location' });
    assert.ok(sorted.length > 1, 'Should have multiple issues to verify sort');

    for (let i = 0; i < sorted.length - 1; i++) {
      const locA = (sorted[i].location?.locality || '').toLowerCase();
      const locB = (sorted[i + 1].location?.locality || '').toLowerCase();
      assert.ok(locA.localeCompare(locB) <= 0, `Expected ${locA} to come before or equal to ${locB}`);
    }
  });

  it('POST /api/issues rejects reports submitted by admin users with 403 Forbidden', async () => {
    // Find POST / handler in issueRoutes stack
    const postRouteLayer = issueRoutes.stack.find(
      (layer) => layer.route && layer.route.path === '/' && layer.route.methods.post
    );
    assert.ok(postRouteLayer, 'POST / route must exist on issueRoutes');

    let statusCode = null;
    let responseData = null;

    const mockReq = {
      user: { id: 'adm-1', role: 'admin', name: 'Command Center Admin' },
      body: {
        title: 'Admin trying to report',
        description: 'This should be blocked',
      },
    };

    const mockRes = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      },
    };

    // The route has [requireAuth, requireLimiter, handler]
    // The handler itself performs the admin check
    const handlers = postRouteLayer.route.stack;
    const finalHandler = handlers[handlers.length - 1].handle;

    await finalHandler(mockReq, mockRes);

    assert.equal(statusCode, 403, 'Must return 403 Forbidden for admin');
    assert.match(responseData.error, /Admins manage complaints and cannot file reports/i);
  });
});
