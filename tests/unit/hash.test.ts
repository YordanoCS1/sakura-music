import { describe, it, expect } from 'vitest';
import { hashStr } from '../../src/utils/hash';

describe('hashStr', () => {
  it('returns consistent results for same input', () => {
    expect(hashStr('hello')).toBe(hashStr('hello'));
  });

  it('returns different results for different inputs', () => {
    expect(hashStr('abc')).not.toBe(hashStr('xyz'));
  });

  it('handles empty string', () => {
    expect(hashStr('')).toBe(0);
  });

  it('returns positive number', () => {
    expect(hashStr('anything')).toBeGreaterThanOrEqual(0);
    expect(hashStr('日本語')).toBeGreaterThanOrEqual(0);
  });

  it('handles special characters', () => {
    expect(hashStr('file-123_test.mp3')).toBeGreaterThan(0);
    expect(hashStr('Artist - Song (2024)')).toBeGreaterThan(0);
  });
});
