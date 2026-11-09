import { QueryFailedError } from 'typeorm';
import { describe, expect, it } from 'vitest';

import { isUniqueViolation } from './is-unique-violation.js';

describe('isUniqueViolation', () => {
  const violation = (constraint: string) =>
    new QueryFailedError(
      'INSERT',
      [],
      Object.assign(new Error('duplicate key'), { code: '23505', constraint }),
    );

  it('should match any unique violation without an index name', () => {
    expect(isUniqueViolation(violation('UQ_a'))).toBe(true);
  });

  it('should match only the given index', () => {
    expect(isUniqueViolation(violation('UQ_a'), 'UQ_a')).toBe(true);
    expect(isUniqueViolation(violation('UQ_b'), 'UQ_a')).toBe(false);
  });

  it('should ignore other errors', () => {
    expect(isUniqueViolation(new Error('boom'))).toBe(false);
  });
});
