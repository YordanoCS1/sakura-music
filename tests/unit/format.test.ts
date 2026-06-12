import { describe, it, expect } from 'vitest';
import { formatDuration, formatSize } from '../../src/utils/format';

describe('formatDuration', () => {
  it('formats seconds correctly', () => {
    expect(formatDuration(60)).toBe('1:00');
    expect(formatDuration(61)).toBe('1:01');
    expect(formatDuration(3661)).toBe('61:01');
  });

  it('pads single digit seconds', () => {
    expect(formatDuration(5)).toBe('0:05');
    expect(formatDuration(9)).toBe('0:09');
  });

  it('handles null and undefined', () => {
    expect(formatDuration(null)).toBe('--:--');
    expect(formatDuration(undefined as any)).toBe('--:--');
    expect(formatDuration(0)).toBe('--:--');
  });

  it('handles large values', () => {
    expect(formatDuration(3600)).toBe('60:00');
    expect(formatDuration(7265)).toBe('121:05');
  });
});

describe('formatSize', () => {
  it('formats bytes correctly', () => {
    expect(formatSize(0)).toBe('');
    expect(formatSize(500)).toBe('500 B');
    expect(formatSize(1024)).toBe('1 KB');
    expect(formatSize(1536)).toBe('1.5 KB');
  });

  it('formats larger units', () => {
    expect(formatSize(1024 * 1024)).toBe('1 MB');
    expect(formatSize(1024 * 1024 * 1024)).toBe('1 GB');
  });

  it('handles null and undefined', () => {
    expect(formatSize(null)).toBe('');
    expect(formatSize(undefined)).toBe('');
  });

  it('handles negative values', () => {
    expect(formatSize(-100)).toBe('');
  });
});
