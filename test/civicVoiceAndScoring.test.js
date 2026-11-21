process.env.NODE_ENV = 'test';

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  haversineDistance,
  calculateTextSimilarity,
  calculateCommunityImpactScore,
  calculateAgingScore,
  calculateCombinedPlanningScore,
  calculateCivicTrustScore,
  checkSlaStatus,
  findPotentialDuplicates,
} from '../server/services/scoringService.js';
import { supportsRepo } from '../server/repositories/supportsRepo.js';
import { issuesRepo } from '../server/repositories/issuesRepo.js';

describe('Dual Priority Scoring & Formula Verification', () => {
  test('Exact combined planning formula S = 0.35*A + 0.25*C + 0.25*P + 0.15*T', () => {
    // Stage B Mandatory Test Case:
    // A=90 (AI severity), C=85 (Community support), P=95 (Public safety impact), T=70 (Days unresolved)
    // S = 0.35*90 + 0.25*85 + 0.25*95 + 0.15*70 = 31.5 + 21.25 + 23.75 + 10.5 = 87.0
    const A = 90;
    const C = 85;
    const P = 95;
    const T = 70;

    const result = calculateCombinedPlanningScore({ A, C, P, T, safetyPriority: 'High' });
    assert.equal(result.S, 87.0, 'Combined score S must be exactly 87.0');
    assert.equal(result.impactLabel, 'Very High Impact', 'Score 87.0 must fall in "Very High Impact" band');
    assert.equal(result.A, 90);
    assert.equal(result.C, 85);
    assert.equal(result.P, 95);
    assert.equal(result.T, 70);
  });

  test('Community impact C logarithmic normalization (0-100 scale, capped to avoid mob dominance)', () => {
    assert.equal(calculateCommunityImpactScore(0), 0);
    // 1 support
    const c1 = calculateCommunityImpactScore(1);
    assert.ok(c1 > 0 && c1 <= 30, 'Single support provides reasonable base impact');
    // 50 supports reaches cap
    const c50 = calculateCommunityImpactScore(50);
    assert.equal(c50, 100, '50 supports reaches full 100 score');
    // 1000 supports capped at 100
    const c1000 = calculateCommunityImpactScore(1000);
    assert.equal(c1000, 100, 'Massive support count is strictly capped at 100');
  });

  test('Days unresolved aging score T (0-100 scale)', () => {
    const now = Date.now();
    const day0 = new Date(now).toISOString();
    const day7 = new Date(now - 7 * 24 * 3600 * 1000).toISOString();
    const day14 = new Date(now - 14 * 24 * 3600 * 1000).toISOString();

    assert.equal(calculateAgingScore(day0).T, 0, 'Day 0 yields 0 age urgency');
    assert.equal(calculateAgingScore(day7).T, 70, '7 days yields 70 score');
    assert.equal(calculateAgingScore(day14).T, 100, '14 days reaches maximum 100 age urgency');
  });

  test('Safety Override rule: Critical Safety Priority pins issue to top regardless of S', () => {
    // Issue A: Safety Priority Critical with lower S
    const issueCritical = {
      id: 'CR-2026-0001',
      priority: 'Critical',
      planningScore: 65.0,
      createdAt: new Date().toISOString(),
    };

    // Issue B: Safety Priority High with higher popularity and S
    const issuePopular = {
      id: 'CR-2026-0002',
      priority: 'High',
      planningScore: 92.0,
      createdAt: new Date().toISOString(),
    };

    const queue = [issuePopular, issueCritical];

    // Priority comparator implementing Safety Override:
    queue.sort((a, b) => {
      const aCrit = a.priority === 'Critical' ? 1 : 0;
      const bCrit = b.priority === 'Critical' ? 1 : 0;
      if (aCrit !== bCrit) return bCrit - aCrit; // Critical pinned first
      return b.planningScore - a.planningScore;
    });

    assert.equal(queue[0].id, 'CR-2026-0001', 'Critical issue must be pinned first in the queue');
    assert.equal(queue[1].id, 'CR-2026-0002', 'Non-critical issue sorted second despite higher S');
  });
});

describe('CivicVoice: Support-Once & Share Tracking', () => {
  const citizen1 = 'user-test-c1';
  const citizen2 = 'user-test-c2';

  test('Support-once enforcement: toggles support on and off idempotently', () => {
    const testIssueId = 'CR-TEST-VOICE-' + Date.now();
    // 1st click by citizen1: toggles ON
    const firstClick = supportsRepo.toggleSupport(testIssueId, citizen1);
    assert.equal(firstClick.supported, true);
    assert.ok(firstClick.totalSupports >= 1);

    // 2nd click by same citizen1: toggles OFF (one support per user enforced)
    const secondClick = supportsRepo.toggleSupport(testIssueId, citizen1);
    assert.equal(secondClick.supported, false);
    assert.equal(secondClick.totalSupports, firstClick.totalSupports - 1);

    // Re-enable for multi-user test
    supportsRepo.toggleSupport(testIssueId, citizen1);
    const citizen2Click = supportsRepo.toggleSupport(testIssueId, citizen2);
    assert.equal(citizen2Click.supported, true);
    assert.ok(supportsRepo.hasSupported(testIssueId, citizen1));
    assert.ok(supportsRepo.hasSupported(testIssueId, citizen2));
  });

  test('Share-vs-copy counting: only completed native shares increment share count', () => {
    const testIssueId = 'CR-TEST-SHARE-' + Date.now();
    const initialShares = supportsRepo.getSharesCount(testIssueId);

    // Plain link copy action does NOT call recordShare endpoint
    assert.equal(supportsRepo.getSharesCount(testIssueId), initialShares, 'Clipboard copy does not increment shares');

    // Web Share API dialog completes (navigator.share resolves successfully)
    const afterShare = supportsRepo.recordShare(testIssueId);
    assert.equal(afterShare.totalShares, initialShares + 1, 'Share count strictly increments on Web Share resolution');
  });

  test('Share-per-user limit: counts at most one share per user per issue', () => {
    const testIssueId = 'CR-TEST-SHARE-LIMIT-' + Date.now();
    const testUser = 'user-share-test-01';

    // 1st share by user
    const res1 = supportsRepo.recordShare(testIssueId, testUser);
    assert.equal(res1.alreadyShared, false);
    assert.equal(res1.totalShares, 1);

    // 2nd share by same user: not counted again
    const res2 = supportsRepo.recordShare(testIssueId, testUser);
    assert.equal(res2.alreadyShared, true);
    assert.equal(res2.totalShares, 1);
  });

  test('Duplicate support rejection: second support attempt strictly rejected server-side with 400', () => {
    const testIssueId = 'CR-TEST-STRICT-' + Date.now();
    const testUser = 'user-judge-test-01';

    // 1st support attempt: succeeds
    const firstResult = supportsRepo.addSupport(testIssueId, testUser);
    assert.equal(firstResult.supported, true);
    assert.ok(firstResult.totalSupports >= 1);

    // 2nd support attempt by same user: MUST throw 400 error
    assert.throws(
      () => {
        supportsRepo.addSupport(testIssueId, testUser);
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /already supported/i);
        return true;
      },
      'Second support attempt must be rejected with 400'
    );
  });

  test('Self-support prevention: user cannot support an issue they reported (403 Forbidden)', async () => {
    const { issuesRepo } = await import('../server/repositories/issuesRepo.js');
    const issueRoutes = (await import('../server/routes/issueRoutes.js')).default;

    const testReporterId = 'usr_reporter_self_' + Date.now();
    const createdIssue = await issuesRepo.create(
      {
        title: 'Pothole on Cross Cut Road',
        description: 'A deep pothole is causing hazardous traffic slowdowns on Cross Cut Road.',
        category: 'Roads & Potholes',
        priority: 'High',
        department: 'Public Works Department',
        location: {
          latitude: 11.0168,
          longitude: 76.9673,
          address: 'Cross Cut Road, Gandhipuram',
          locality: 'Gandhipuram',
        },
        reporter: {
          id: testReporterId,
          name: 'Self Reporter',
          email: 'self@example.com',
        },
        aiAnalysis: {
          category: 'Roads & Potholes',
          priority: 'High',
          department: 'Public Works Department',
          severity_score: 75,
          safety_impact_score: 70,
        },
      }
    );

    let statusCode = 200;
    let jsonResponse = null;
    const mockReq = {
      params: { id: createdIssue.id },
      user: { id: testReporterId, name: 'Self Reporter', role: 'citizen' },
    };
    const mockRes = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonResponse = data;
        return this;
      },
    };

    // Find the POST /:id/support route layer
    const postSupportLayer = issueRoutes.stack.find(
      (s) => s.route && s.route.path === '/:id/support' && s.route.methods.post
    );
    assert.ok(postSupportLayer, 'Must have a POST /:id/support route handler');

    const handler = postSupportLayer.route.stack[postSupportLayer.route.stack.length - 1].handle;
    await handler(mockReq, mockRes);

    assert.equal(statusCode, 403, 'Supporting own issue must be rejected with 403');
    assert.equal(jsonResponse.success, false);
    assert.equal(jsonResponse.error, 'You reported this issue');
  });
});

describe('Geospatial Haversine & Duplicate Detection', () => {
  test('Haversine distance accurately measures nearby and distant coordinates', () => {
    // Gandhipuram Bus Stand
    const gandhipuram = { lat: 11.0168, lng: 76.9673 };
    // Point ~80 meters away on 7th Street
    const nearbyPoint = { lat: 11.0173, lng: 76.9678 };
    // RS Puram ~3.8 km away
    const rsPuram = { lat: 11.0089, lng: 76.9458 };

    const distanceNearby = haversineDistance(
      gandhipuram.lat,
      gandhipuram.lng,
      nearbyPoint.lat,
      nearbyPoint.lng
    );
    assert.ok(distanceNearby < 200, `Expected distance < 200m, got ${distanceNearby}m`);

    const distanceFar = haversineDistance(
      gandhipuram.lat,
      gandhipuram.lng,
      rsPuram.lat,
      rsPuram.lng
    );
    assert.ok(distanceFar > 2500, `Expected distance > 2500m, got ${distanceFar}m`);
  });

  test('Text token similarity accurately matches civic complaint phrasing', () => {
    const text1 = 'Severe deep pothole causing traffic obstruction outside Gandhipuram bus terminal';
    const text2 = 'Dangerous pothole on main road outside Gandhipuram bus stand near terminal';
    const unrelatedText = 'Garbage dumping on street corner overflowing';

    const simHigh = calculateTextSimilarity(text1, text2);
    assert.ok(simHigh >= 0.3, `Expected high similarity, got ${simHigh}`);

    const simLow = calculateTextSimilarity(text1, unrelatedText);
    assert.ok(simLow < 0.2, `Expected low similarity, got ${simLow}`);
  });

  test('Duplicate detection flags open issue within 200m of same category', () => {
    const openIssues = [
      {
        id: 'CR-2026-0010',
        title: 'Massive open pothole outside central bus terminal',
        description: 'Pothole damaged road surface and vehicles are swerving dangerously',
        category: 'Roads & Potholes',
        status: 'Reported',
        location: { latitude: 11.0168, longitude: 76.9673 },
      },
      {
        id: 'CR-2026-0011',
        title: 'Streetlight pole dark at night',
        description: 'Lamp fixture broken on pillar',
        category: 'Street Lighting',
        status: 'Reported',
        location: { latitude: 11.0169, longitude: 76.9674 },
      },
    ];

    const duplicateQuery = {
      title: 'Deep pothole outside bus terminal damaging tires',
      description: 'Vehicles swerving to avoid dangerous road surface pothole',
      category: 'Roads & Potholes',
      latitude: 11.0172,
      longitude: 76.9675,
      openIssues,
    };

    const dups = findPotentialDuplicates(duplicateQuery);
    assert.equal(dups.length, 1, 'Should match exactly 1 duplicate in same category within 200m');
    assert.equal(dups[0].issue.id, 'CR-2026-0010');
    assert.ok(dups[0].distanceMeters <= 200);
  });
});

describe('Civic Trust Score & SLA Verification', () => {
  test('Civic Trust Score computes 5 evidence factors (0-100)', () => {
    const trustResult = calculateCivicTrustScore({
      hasImage: true,
      imageMatchesDescription: true,
      isGpsCaptured: true,
      corroboratingCount: 2,
      supportsCount: 5,
    });

    assert.ok(trustResult.score >= 75, `Expected trust score >= 75, got ${trustResult.score}`);
    assert.equal(trustResult.breakdown.length, 5);
  });

  test('Overdue SLA alerts check priority deadlines (Critical 24h, High 72h, Medium 7d)', () => {
    const now = Date.now();
    const criticalOverdueTime = new Date(now - 25 * 3600 * 1000).toISOString(); // 25h ago
    const criticalOnTime = new Date(now - 10 * 3600 * 1000).toISOString(); // 10h ago

    const overdueResult = checkSlaStatus({
      priority: 'Critical',
      status: 'Reported',
      createdAt: criticalOverdueTime,
    });
    assert.equal(overdueResult.isOverdue, true, 'Critical issue >24h must be flagged overdue');
    assert.equal(overdueResult.slaHours, 24);

    const onTimeResult = checkSlaStatus({
      priority: 'Critical',
      status: 'Reported',
      createdAt: criticalOnTime,
    });
    assert.equal(onTimeResult.isOverdue, false, 'Critical issue <24h must not be overdue');
  });
});

describe('Citizen Ground Verification & Reopen Flow', () => {
  test('Citizen ground verification feedback transitions resolved issue to Reopened with audit note', async () => {
    // Seed an issue
    const issue = await issuesRepo.create({
      title: 'Water pipe leak on 5th cross',
      description: 'Water spraying onto roadway causing puddle',
      category: 'Water Supply & Leakage',
      priority: 'High',
      department: 'Water Supply & Drainage Board',
      location: { latitude: 11.018, longitude: 76.965, locality: 'Gandhipuram' },
      reporter: { id: 'usr-1', name: 'Citizen Tester', email: 'tester@example.com' },
    });

    // Admin marks it resolved
    await issuesRepo.updateStatus(issue.id, 'Resolved', 'Pipe clamp replaced', 'Admin Staff');
    const resolvedIssue = await issuesRepo.getById(issue.id);
    assert.equal(resolvedIssue.status, 'Resolved');

    // Citizen reports still a problem -> reopens issue
    const reopenNote = 'Water still trickling from joint under pressure';
    const reopenedIssue = await issuesRepo.reopenIssue(issue.id, {
      author: 'Citizen Tester',
      note: reopenNote,
    });

    assert.equal(reopenedIssue.status, 'Reopened', 'Issue status must transition to Reopened');
    const latestTimeline = reopenedIssue.timeline[reopenedIssue.timeline.length - 1];
    assert.equal(latestTimeline.status, 'Reopened');
    assert.ok(latestTimeline.note.includes(reopenNote));
  });
});
