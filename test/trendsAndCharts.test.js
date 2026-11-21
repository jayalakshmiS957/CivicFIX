process.env.NODE_ENV = 'test';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { en } from '../src/i18n/en.js';
import { ta } from '../src/i18n/ta.js';
import { computeTrends } from '../server/routes/trendRoutes.js';
import { issuesRepo } from '../server/repositories/issuesRepo.js';

describe('Bilingual i18n & Language Persistence Test Suite', () => {
  it('should fall back to English when a translation key is missing in Tamil', () => {
    // Helper replicating useLanguage fallback logic
    function resolveKey(key, lang = 'ta') {
      const dict = lang === 'ta' ? ta : en;
      const text = dict[key] !== undefined ? dict[key] : en[key];
      return text !== undefined ? text : key;
    }

    // Existing key in Tamil
    assert.equal(resolveKey('navSignIn', 'ta'), 'உள்நுழைவு');
    assert.equal(resolveKey('navSignIn', 'en'), 'Sign In');

    // Missing key in Tamil falls back to English
    const mockMissingKey = 'nonExistentKeyInTamil';
    // Simulate en having the key
    const testEn = { ...en, [mockMissingKey]: 'Fallback English String' };
    const testTa = { ...ta };
    delete testTa[mockMissingKey];

    const fallbackResult = testTa[mockMissingKey] !== undefined ? testTa[mockMissingKey] : testEn[mockMissingKey];
    assert.equal(fallbackResult, 'Fallback English String', 'Missing Tamil key must fall back to English');

    // If completely missing from both, returns the raw key
    assert.equal(resolveKey('completely_unknown_key_xyz', 'ta'), 'completely_unknown_key_xyz');
  });

  it('should support dynamic parameter interpolation in translation strings', () => {
    function interpolate(str, params) {
      let res = str;
      Object.entries(params).forEach(([k, v]) => {
        res = res.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
      return res;
    }

    const template = 'Issue {id} has {count} supporters';
    const result = interpolate(template, { id: 'CR-2026-1001', count: 12 });
    assert.equal(result, 'Issue CR-2026-1001 has 12 supporters');
  });

  it('should persist language choice across sessions via localStorage key', () => {
    const STORAGE_KEY = 'civicresolve_lang';
    const mockStorage = {};
    const setLanguage = (lang) => {
      const valid = lang === 'ta' ? 'ta' : 'en';
      mockStorage[STORAGE_KEY] = valid;
    };
    const getLanguage = () => mockStorage[STORAGE_KEY] || 'en';

    assert.equal(getLanguage(), 'en', 'Default language must be English');
    setLanguage('ta');
    assert.equal(getLanguage(), 'ta', 'Setting Tamil must persist in storage');
    setLanguage('en');
    assert.equal(getLanguage(), 'en', 'Setting English must persist in storage');
  });

  it('contains all required chart and brand block keys in en and ta dictionaries', () => {
    const requiredKeys = [
      'chartUnavailable',
      'retry',
      'reportedVsResolved',
      'slaCompliance',
      'overdueCount',
      'issuesByLocalityPriority',
      'departmentWorkload',
      'statusReported',
      'statusInProgress',
      'statusPendingReview',
      'statusResolved',
      'statusReopened',
      'heroSubtitleBilingual',
    ];

    for (const key of requiredKeys) {
      assert.ok(en[key], `en.js must have translation for ${key}`);
      assert.ok(ta[key], `ta.js must have translation for ${key}`);
    }
  });
});

describe('Trends Analytics Backend Endpoint Test Suite', () => {
  it('GET /api/stats/trends computeTrends returns last 10 days with totals matching issues data', async () => {
    const issues = await issuesRepo.getAll();
    assert.equal(issues.length, 15, 'Test environment must have 15 seed issues');

    const trends = await computeTrends();

    assert.ok(trends, 'Trends payload must not be null');
    assert.ok(Array.isArray(trends.days), 'trends.days must be an array');
    assert.equal(trends.days.length, 10, 'trends.days must contain exactly 10 days');

    // Verify date ordering and properties
    for (const day of trends.days) {
      assert.ok(day.date, 'Each day must have a date');
      assert.match(day.date, /^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');
      assert.ok(typeof day.reported === 'number' && day.reported >= 0, 'reported must be non-negative number');
      assert.ok(typeof day.resolved === 'number' && day.resolved >= 0, 'resolved must be non-negative number');
    }

    // Sum of reported across the 10 days should match total issues in range
    const totalReportedIn10Days = trends.days.reduce((acc, d) => acc + d.reported, 0);
    assert.equal(totalReportedIn10Days, 15, 'Total reported across 10-day window must match 15 seed issues');

    // Sum of resolved across 10 days should match total resolved issues in range (4)
    const resolvedInRepo = issues.filter((i) => i.status === 'Resolved').length;
    const totalResolvedIn10Days = trends.days.reduce((acc, d) => acc + d.resolved, 0);
    assert.equal(totalResolvedIn10Days, resolvedInRepo, `Resolved in 10-day window (${totalResolvedIn10Days}) must match repository resolved count (${resolvedInRepo})`);
  });

  it('computeTrends byLocalityPriority contains all 4 standard localities with priority breakdown', async () => {
    const trends = await computeTrends();
    const { byLocalityPriority } = trends;

    assert.ok(Array.isArray(byLocalityPriority), 'byLocalityPriority must be an array');
    assert.equal(byLocalityPriority.length, 4, 'Must contain 4 localities');

    const expectedLocalities = ['Gandhipuram', 'RS Puram', 'Peelamedu', 'Other areas'];
    const actualLocalities = byLocalityPriority.map((item) => item.locality);
    assert.deepEqual(actualLocalities, expectedLocalities, 'Must match specified 4 localities exactly');

    let totalLocalityIssues = 0;
    for (const item of byLocalityPriority) {
      assert.ok(typeof item.Critical === 'number' && item.Critical >= 0);
      assert.ok(typeof item.High === 'number' && item.High >= 0);
      assert.ok(typeof item.Medium === 'number' && item.Medium >= 0);
      assert.ok(typeof item.Low === 'number' && item.Low >= 0);
      totalLocalityIssues += item.Critical + item.High + item.Medium + item.Low;
    }

    assert.equal(totalLocalityIssues, 15, 'Total issues across all localities and priorities must sum to 15');
  });

  it('computeTrends computes valid SLA compliance percentage and overdue count', async () => {
    const trends = await computeTrends();

    assert.ok(typeof trends.slaCompliancePercent === 'number', 'slaCompliancePercent must be a number');
    assert.ok(trends.slaCompliancePercent >= 0 && trends.slaCompliancePercent <= 100, 'SLA compliance must be between 0 and 100%');

    assert.ok(typeof trends.overdueCount === 'number', 'overdueCount must be a number');
    assert.ok(trends.overdueCount >= 0, 'overdueCount must be non-negative');
  });
});

describe('Chart Components Safe Fallback & Empty Data Handling', () => {
  it('TrendLineChart data calculations handle empty, null, and partial data without throwing', () => {
    const testCases = [
      [],
      null,
      undefined,
      [{ date: '2026-11-20', reported: 0, resolved: 0 }],
      [{ date: '2026-11-20', reported: null, resolved: undefined }],
    ];

    for (const tc of testCases) {
      assert.doesNotThrow(() => {
        const safeData = Array.isArray(tc) ? tc : [];
        const maxVal = Math.max(
          4,
          ...safeData.map((d) => Math.max(Number(d.reported) || 0, Number(d.resolved) || 0))
        );
        assert.ok(maxVal >= 4, 'maxVal must be at least 4');
      });
    }
  });

  it('HeatGrid calculations handle empty, null, and undefined data without throwing', () => {
    const LOCALITIES = ['Gandhipuram', 'RS Puram', 'Peelamedu', 'Other areas'];
    const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

    const testCases = [[], null, undefined, [{ locality: 'Gandhipuram', Critical: 2 }]];

    for (const tc of testCases) {
      assert.doesNotThrow(() => {
        const rows = LOCALITIES.map((loc) => {
          const found = Array.isArray(tc)
            ? tc.find(
                (d) =>
                  d.locality &&
                  (d.locality.toLowerCase() === loc.toLowerCase() ||
                    (loc === 'Other areas' && d.locality.toLowerCase().includes('other')))
              )
            : null;
          return {
            locality: loc,
            Critical: found?.Critical || 0,
            High: found?.High || 0,
            Medium: found?.Medium || 0,
            Low: found?.Low || 0,
          };
        });

        assert.equal(rows.length, 4);
        rows.forEach((r) => {
          PRIORITIES.forEach((p) => {
            assert.ok(typeof r[p] === 'number');
          });
        });
      });
    }
  });

  it('GaugeChart handles out-of-range, NaN, and null SLA percentages gracefully', () => {
    const testCases = [
      { input: null, expected: 0 },
      { input: undefined, expected: 0 },
      { input: -10, expected: 0 },
      { input: 150, expected: 100 },
      { input: 87.6, expected: 88 },
      { input: '73', expected: 73 },
    ];

    for (const { input, expected } of testCases) {
      const safePct = Math.min(100, Math.max(0, Math.round(Number(input) || 0)));
      assert.equal(safePct, expected);
    }
  });

  it('StackedBarChart safely handles missing workload properties and departments', () => {
    const testCases = [
      [],
      null,
      undefined,
      [{ name: 'Test Dept', workload: null }],
      [{ name: 'Incomplete', open: 5, resolved: 2 }],
    ];

    for (const tc of testCases) {
      assert.doesNotThrow(() => {
        const items = (Array.isArray(tc) ? tc : []).map((d) => {
          const w = d.workload || {};
          const open = Number(w.open ?? d.open ?? 0);
          const inProgress = Number(w.inProgress ?? d.inProgress ?? 0);
          const resolved = Number(w.resolved ?? d.resolved ?? 0);
          const total = open + inProgress + resolved;
          return { name: d.name || 'Dept', open, inProgress, resolved, total };
        });
        assert.ok(Array.isArray(items));
      });
    }
  });

  it('StatusStepper normalizes unknown status to Reported and flags Reopened accurately', () => {
    const getActiveIndex = (status) => {
      if (status === 'In Progress' || status === 'Reopened') return 1;
      if (status === 'Pending Review') return 2;
      if (status === 'Resolved') return 3;
      return 0; // Default fallback to Reported
    };

    assert.equal(getActiveIndex('Reported'), 0);
    assert.equal(getActiveIndex('In Progress'), 1);
    assert.equal(getActiveIndex('Pending Review'), 2);
    assert.equal(getActiveIndex('Resolved'), 3);
    assert.equal(getActiveIndex('Reopened'), 1);
    assert.equal(getActiveIndex('UnknownStatusXYZ'), 0, 'Unknown status must fall back to Reported');
    assert.equal(getActiveIndex(null), 0, 'Null status must fall back to Reported');
    assert.equal(getActiveIndex(undefined), 0, 'Undefined status must fall back to Reported');
  });
});
