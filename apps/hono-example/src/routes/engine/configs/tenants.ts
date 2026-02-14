import { defineTable } from '@tablecraft/engine';
import * as s from '@/db/schema';

// 1. Simple — zero config (introspects everything)
// Shows all columns, default pagination
export const tenants = defineTable(s.tenants);
