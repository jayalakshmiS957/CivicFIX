process.env.NODE_ENV = 'test';

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isValidStatusTransition } from '../server/validators/issueValidator.js';

describe('Civic Issue Status Transition Guard Suite', () => {
  it('should permit forward progression from Reported to In Progress and Resolved', () => {
    assert.strictEqual(isValidStatusTransition('Reported', 'In Progress'), true);
    assert.strictEqual(isValidStatusTransition('Reported', 'Resolved'), true);
  });

  it('should permit In Progress to transition to Resolved or roll back to Reported', () => {
    assert.strictEqual(isValidStatusTransition('In Progress', 'Resolved'), true);
    assert.strictEqual(isValidStatusTransition('In Progress', 'Reported'), true);
  });

  it('should allow Resolved issues to be re-opened into In Progress when unresolved', () => {
    assert.strictEqual(isValidStatusTransition('Resolved', 'In Progress'), true);
  });

  it('should permit Pending Review transitions to and from relevant states', () => {
    assert.strictEqual(isValidStatusTransition('In Progress', 'Pending Review'), true);
    assert.strictEqual(isValidStatusTransition('Pending Review', 'Resolved'), true);
    assert.strictEqual(isValidStatusTransition('Pending Review', 'Reopened'), true);
    assert.strictEqual(isValidStatusTransition('Pending Review', 'In Progress'), true);
  });

  it('should disallow invalid transitions and unknown status terms', () => {
    assert.strictEqual(isValidStatusTransition('Resolved', 'Reported'), false);
    assert.strictEqual(isValidStatusTransition('Reported', 'Archived'), false);
    assert.strictEqual(isValidStatusTransition('UnknownStatus', 'Resolved'), false);
  });
});
