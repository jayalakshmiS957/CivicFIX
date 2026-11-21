process.env.NODE_ENV = 'test';

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateIssueInput } from '../server/validators/issueValidator.js';

describe('Issue Validator Test Suite', () => {
  it('should accept valid issue payload with correct bounds', () => {
    const input = {
      title: 'Dangerous deep pothole on Avinashi Road',
      description: 'Vehicles are swerving across both lanes to avoid a crater that is roughly 15cm deep.',
      category: 'Roads & Potholes',
      latitude: 11.0248,
      longitude: 77.0028,
      address: 'Avinashi Road, Peelamedu',
      locality: 'Peelamedu',
      landmark: 'Near PSG Tech',
    };

    const { isValid, errors, data } = validateIssueInput(input);
    assert.strictEqual(isValid, true, 'Expected payload to be valid');
    assert.strictEqual(Object.keys(errors).length, 0);
    assert.strictEqual(data.title, input.title);
    assert.strictEqual(data.category, 'Roads & Potholes');
    assert.strictEqual(data.location.latitude, 11.0248);
  });

  it('should reject titles shorter than 5 characters or longer than 100 characters', () => {
    const shortTitle = validateIssueInput({
      title: 'Hole',
      description: 'This is a sufficiently long description exceeding twenty characters.',
      latitude: 11.0,
      longitude: 77.0,
    });
    assert.strictEqual(shortTitle.isValid, false);
    assert.ok(shortTitle.errors.title, 'Should flag short title');

    const longTitle = validateIssueInput({
      title: 'A'.repeat(101),
      description: 'This is a sufficiently long description exceeding twenty characters.',
      latitude: 11.0,
      longitude: 77.0,
    });
    assert.strictEqual(longTitle.isValid, false);
    assert.ok(longTitle.errors.title, 'Should flag long title');
  });

  it('should reject descriptions shorter than 20 characters', () => {
    const res = validateIssueInput({
      title: 'Valid Title Here',
      description: 'Too short text',
      latitude: 11.0,
      longitude: 77.0,
    });
    assert.strictEqual(res.isValid, false);
    assert.ok(res.errors.description);
  });

  it('should reject invalid latitude or longitude ranges', () => {
    const badLat = validateIssueInput({
      title: 'Valid Title Here',
      description: 'This is a sufficiently long description exceeding twenty characters.',
      latitude: 195.0, // Invalid latitude
      longitude: 77.0,
    });
    assert.strictEqual(badLat.isValid, false);
    assert.ok(badLat.errors.latitude);

    const badLng = validateIssueInput({
      title: 'Valid Title Here',
      description: 'This is a sufficiently long description exceeding twenty characters.',
      latitude: 11.0,
      longitude: -200.0, // Invalid longitude
    });
    assert.strictEqual(badLng.isValid, false);
    assert.ok(badLng.errors.longitude);
  });

  it('should sanitize HTML tags from title and description to prevent XSS', () => {
    const res = validateIssueInput({
      title: 'Dangerous <script>alert("xss")</script> Pothole',
      description: '<div>Heavy raw sewage is leaking onto the <img src=x onerror=alert(1)> sidewalk.</div>',
      latitude: 11.0,
      longitude: 77.0,
    });
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.data.title.includes('<script>'), false);
    assert.strictEqual(res.data.description.includes('<div>'), false);
    assert.strictEqual(res.data.description.includes('<img'), false);
  });
});
