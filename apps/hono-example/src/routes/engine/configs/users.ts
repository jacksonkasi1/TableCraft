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
  // Add a dynamic custom filter
  .where(async (ctx, { eq, or, ilike }, table) => {
    // The query parser coerces 'true' string to boolean true
    const isSpecial = ctx.query.filters?.is_special?.value === true;
    if (isSpecial) {
      // Find admins OR anyone whose email has "demo"
      return or(
        eq(table.role, 'admin'),
        ilike(table.email, '%demo%')
      );
    }
  })
  // Default sort
  .sort('-createdAt');
