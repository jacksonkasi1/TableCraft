import { defineTable } from '@tablecraft/engine';
import * as s from '@/db/schema';

// 3. Products — Search All, Filter, Sort, Page Size
export const products = defineTable(s.products)
  // Auto-detect all text columns for search (name, description, category)
  .searchAll()
  // Allow filtering on these
  .filter('category', 'price', 'isArchived')
  // Static filter: only show unarchived by default (can be overridden? No, static is fixed in builder logic usually, but let's see)
  .staticFilter('isArchived', 'eq', false)
  // Sort by price desc by default
  .sort('-price')
  // Use estimated count for better performance on large tables
  .countMode('estimated')
  // Smaller page size
  .pageSize(5, { max: 50 });
