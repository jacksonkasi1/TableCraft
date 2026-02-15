import { describe, it, expect } from 'vitest';
import { toDbValue } from '../src/utils/operators';

describe('operators', () => {
  describe('toDbValue', () => {
    it('should convert ISO date string to Date object', () => {
      const result = toDbValue('2024-01-15T10:30:00.000Z');
      expect(result).toBeInstanceOf(Date);
    });

    it('should convert date-only string to Date object', () => {
      const result = toDbValue('2024-01-15');
      expect(result).toBeInstanceOf(Date);
    });

    it('should not convert non-date strings', () => {
      const result = toDbValue('hello world');
      expect(result).toBe('hello world');
    });

    it('should not convert numbers', () => {
      const result = toDbValue(123);
      expect(result).toBe(123);
    });

    it('should convert date strings in arrays', () => {
      const result = toDbValue(['2024-01-15T00:00:00Z', '2024-01-20T00:00:00Z']);
      expect(Array.isArray(result)).toBe(true);
      expect((result as Date[])[0]).toBeInstanceOf(Date);
      expect((result as Date[])[1]).toBeInstanceOf(Date);
    });

    it('should handle mixed arrays', () => {
      const result = toDbValue(['2024-01-15', 'hello', 123]);
      expect(Array.isArray(result)).toBe(true);
      expect((result as unknown[])[0]).toBeInstanceOf(Date);
      expect((result as unknown[])[1]).toBe('hello');
      expect((result as unknown[])[2]).toBe(123);
    });

    it('should handle null and undefined', () => {
      expect(toDbValue(null)).toBe(null);
      expect(toDbValue(undefined)).toBe(undefined);
    });

    it('should handle boolean values', () => {
      expect(toDbValue(true)).toBe(true);
      expect(toDbValue(false)).toBe(false);
    });
  });
});