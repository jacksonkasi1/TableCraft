import { defineTable } from '@tablecraft/engine';
import * as s from '@/db/schema';

// 2. Users — Hide, Search, Transform
export const users = defineTable(s.users)
  // Hide internal fields
  .hide('tenantId')
  // Search specific fields
  .search('email', 'role')
  // Inline transform (run in JS after fetch)
  .transform('email', (val) => (val as string).toLowerCase())
  .transform('role', (val) => (val as string).toUpperCase())
  // Default sort
  .sort('-createdAt');
