process.env.NODE_ENV = 'test';

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  validateAiOutput,
  VALID_CATEGORIES,
  VALID_DEPARTMENTS,
  VALID_PRIORITIES,
} from '../server/services/geminiSchema.js';

describe('Gemini Output Schema Validator Test Suite', () => {
  it('should validate and normalize a conforming mock Gemini response', () => {
    const mockGeminiOutput = {
      category: 'Water Supply & Leakage',
      damage_detected: 'Fractured municipal distribution main spurting potable water',
      severity_score: 85,
      safety_impact_score: 75,
      priority: 'High',
      priority_reason: 'Major loss of potable water and road base saturation.',
      department: 'Water Supply & Drainage Board',
      secondary_department: 'Public Works Department',
      summary: 'Main line burst causing flooded street.',
      affects_accessibility: true,
      follow_up_questions: ['Is the water muddy or clear?'],
      image_matches_description: true,
      confidence: 0.94,
    };

    const validated = validateAiOutput(mockGeminiOutput);
    assert.strictEqual(validated.category, 'Water Supply & Leakage');
    assert.strictEqual(validated.priority, 'High');
    assert.strictEqual(validated.department, 'Water Supply & Drainage Board');
    assert.strictEqual(validated.severity_score, 85);
    assert.strictEqual(validated.safety_impact_score, 75);
    assert.strictEqual(validated.affects_accessibility, true);
    assert.strictEqual(validated.image_matches_description, true);
    assert.strictEqual(validated.confidence, 0.94);
  });

  it('should reject invalid or fabricated category enum', () => {
    const invalidMock = {
      category: 'Unicorn Sighting',
      priority: 'Critical',
      department: 'Public Works Department',
      damage_detected: 'None',
      summary: 'Invalid',
    };

    assert.throws(
      () => validateAiOutput(invalidMock),
      /Invalid category enum received/
    );
  });

  it('should reject invalid priority level', () => {
    const invalidMock = {
      category: 'Roads & Potholes',
      priority: 'Ultra-Urgent-Emergency',
      department: 'Public Works Department',
      damage_detected: 'Crack',
      summary: 'Invalid priority',
    };

    assert.throws(
      () => validateAiOutput(invalidMock),
      /Invalid priority enum received/
    );
  });

  it('should clamp out-of-range numeric scores to 0-100 range', () => {
    const unconstrainedMock = {
      category: 'Roads & Potholes',
      priority: 'Low',
      department: 'Public Works Department',
      damage_detected: 'Minor crack',
      severity_score: 150, // Out of bounds
      safety_impact_score: -30, // Out of bounds
      summary: 'Test clamping',
      affects_accessibility: false,
      follow_up_questions: [],
      confidence: 1.5,
    };

    const validated = validateAiOutput(unconstrainedMock);
    assert.strictEqual(validated.severity_score, 100);
    assert.strictEqual(validated.safety_impact_score, 0);
    assert.strictEqual(validated.confidence, 1.0);
  });

  it('should limit follow-up questions to at most 2 items', () => {
    const verboseMock = {
      category: 'Roads & Potholes',
      priority: 'Medium',
      department: 'Public Works Department',
      damage_detected: 'Pothole',
      summary: 'Road crack',
      affects_accessibility: false,
      follow_up_questions: ['Question 1?', 'Question 2?', 'Question 3?', 'Question 4?'],
      confidence: 0.9,
    };

    const validated = validateAiOutput(verboseMock);
    assert.strictEqual(validated.follow_up_questions.length, 2);
  });
});
