import { describe, it, expect } from 'vitest';
import { pgTable, integer, text } from 'drizzle-orm/pg-core';
import { AggregationBuilder } from '../../src/core/aggregationBuilder';
import { TableConfig } from '../../src/types/table';

const users = pgTable('users', {
  id: integer('id').primaryKey(),
  age: integer('age'),
  score: integer('score'),
  name: text('name')
});

const schema = { users };

describe('AggregationBuilder', () => {
  const config: TableConfig = {
    name: 'users',
    base: 'users',
    columns: [
      { name: 'id', type: 'number', hidden: false, sortable: true, filterable: true },
      { name: 'age', type: 'number', hidden: false, sortable: true, filterable: true },
      { name: 'score', type: 'number', hidden: false, sortable: true, filterable: true },
      { name: 'name', type: 'string', hidden: false, sortable: true, filterable: true }
    ],
    aggregations: [
      { alias: 'totalScore', type: 'sum', field: 'score' },
      { alias: 'avgAge', type: 'avg', field: 'age' },
      { alias: 'userCount', type: 'count', field: 'id' },
      { alias: 'maxScore', type: 'max', field: 'score' },
      { alias: 'minAge', type: 'min', field: 'age' }
    ]
  };

  const builder = new AggregationBuilder(schema);

  describe('buildAggregations', () => {
    it('should build aggregation map', () => {
      const result = builder.buildAggregations(config);
      expect(result).toBeDefined();
      expect(Object.keys(result!)).toHaveLength(5);
      expect(result!['totalScore']).toBeDefined();
      expect(result!['avgAge']).toBeDefined();
    });

    it('should return undefined if no aggregations configured', () => {
      const noAggConfig: TableConfig = { ...config, aggregations: [] };
      const result = builder.buildAggregations(noAggConfig);
      expect(result).toBeUndefined();
    });

    it('should ignore aggregations on unknown columns', () => {
      const badConfig: TableConfig = {
        ...config,
        aggregations: [{ alias: 'x', type: 'sum', field: 'unknown' }]
      };
      const result = builder.buildAggregations(badConfig);
      expect(result).toBeUndefined();
    });
  });

  describe('buildAggregationSelect', () => {
    it('should always include _totalCount', () => {
      const result = builder.buildAggregationSelect({ ...config, aggregations: [] });
      expect(result._totalCount).toBeDefined();
    });

    it('should include configured aggregations', () => {
      const result = builder.buildAggregationSelect(config);
      expect(result.totalScore).toBeDefined();
      expect(result._totalCount).toBeDefined();
    });
  });
});
