import { describe, it, expect } from 'vitest';
import { validateConfig, validateAgainstSchema } from '../../src/core/validator';
import { pgTable, text, integer } from 'drizzle-orm/pg-core';

describe('Configuration Validator', () => {
  
  describe('validateConfig (Zod)', () => {
    it('should validate a correct configuration', () => {
      const config = {
        name: 'users',
        base: 'users',
        columns: [
          { name: 'id', type: 'number' },
          { name: 'email', type: 'string' }
        ],
        filters: [
          { field: 'email', operator: 'eq' }
        ]
      };
      
      const result = validateConfig(config);
      expect(result).toBeDefined();
      expect(result.name).toBe('users');
      expect(result.columns).toHaveLength(2);
    });

    it('should throw on missing required fields', () => {
      const config = {
        // Missing 'base'
        name: 'users',
        columns: []
      };
      
      expect(() => validateConfig(config)).toThrow();
    });

    it('should throw on invalid column type', () => {
      const config = {
        name: 'users',
        base: 'users',
        columns: [
          { name: 'id', type: 'invalid_type' }
        ]
      };
      
      expect(() => validateConfig(config)).toThrow();
    });
  });

  describe('validateAgainstSchema (Drizzle)', () => {
    // Define a mock schema
    const users = pgTable('users', {
      id: integer('id').primaryKey(),
      name: text('name'),
      email: text('email')
    });

    const schema = { users };

    it('should pass when config matches schema', () => {
      const config = validateConfig({
        name: 'users',
        base: 'users',
        columns: [
          { name: 'id', type: 'number' },
          { name: 'email', type: 'string' }
        ]
      });

      expect(() => validateAgainstSchema(config, schema)).not.toThrow();
    });

    it('should fail when base table does not exist', () => {
      const config = validateConfig({
        name: 'posts',
        base: 'posts', // Does not exist in schema
        columns: []
      });

      expect(() => validateAgainstSchema(config, schema)).toThrow(/Base table 'posts' not found/);
    });

    it('should fail when column does not exist', () => {
      const config = validateConfig({
        name: 'users',
        base: 'users',
        columns: [
          { name: 'age', type: 'number' } // 'age' not in users table
        ]
      });

      expect(() => validateAgainstSchema(config, schema)).toThrow(/Column 'age' configured in 'users' does not exist in table 'users'/);
    });
  });
});
