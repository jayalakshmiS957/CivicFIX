process.env.NODE_ENV = 'test';

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { classifyWithKeywords } from '../server/services/keywordClassifier.js';

describe('Keyword Fallback Classifier Test Suite', () => {
  it('should categorize live electrical wire as Public Safety with Critical priority', () => {
    const result = classifyWithKeywords({
      title: 'Exposed live wire dangling over road',
      description: 'An electric cable is sparking and hanging low near a bus stop.',
      locationText: 'Gandhipuram bus stop',
    });

    assert.strictEqual(result.category, 'Public Safety');
    assert.strictEqual(result.priority, 'Critical');
    assert.strictEqual(result.department, 'Electricity Board / Street Lighting Division');
    assert.strictEqual(result.aiSource, 'fallback');
    assert.ok(result.severity_score >= 80);
    assert.ok(result.safety_impact_score >= 90);
    assert.strictEqual(result.aiNotice, 'Smart analysis unavailable, standard rules applied');
  });

  it('should categorize deep pothole as Roads & Potholes and route to Public Works Department', () => {
    const result = classifyWithKeywords({
      title: 'Deep crater pothole on main road',
      description: 'Massive pothole crater causing traffic slowdown and two-wheeler skids.',
      locationText: 'DB Road, RS Puram',
    });

    assert.strictEqual(result.category, 'Roads & Potholes');
    assert.strictEqual(result.department, 'Public Works Department');
    assert.strictEqual(result.aiSource, 'fallback');
    assert.ok(result.priority === 'High' || result.priority === 'Medium');
  });

  it('should classify open manhole as Drainage & Sewage with Critical priority', () => {
    const result = classifyWithKeywords({
      title: 'Open manhole cavity on street',
      description: 'Stormwater drain manhole cover is completely missing on dark road.',
    });

    assert.strictEqual(result.category, 'Drainage & Sewage');
    assert.strictEqual(result.priority, 'Critical');
    assert.strictEqual(result.department, 'Water Supply & Drainage Board');
  });

  it('should detect accessibility impact when sidewalk or wheelchair transit is mentioned', () => {
    const result = classifyWithKeywords({
      title: 'Broken paver blocks on sidewalk',
      description: 'Uprooted tiles blocking wheelchair ramp and elderly pedestrian walking path.',
    });

    assert.strictEqual(result.affects_accessibility, true);
  });
});
