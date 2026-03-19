import { defineTable } from '@tablecraft/engine';
import * as schema from './db/schema';

// 1. Tenants Configuration
export const tenantsConfig = defineTable(schema.tenants)
  .access({ roles: ['admin'] });

// 2. Users Configuration
export const usersConfig = defineTable(schema.users)
  .access({ roles: ['admin', 'member'] })
  .beforeQuery((params, context) => {
    // Row-level security: enforce tenant isolation
    if (context.tenantId) {
      params.filters = params.filters || {};
      params.filters['tenant_id'] = { operator: 'eq', value: context.tenantId };
    }
    return params;
  });

// 3. Products Configuration
export const productsConfig = defineTable(schema.products)
  .access({ roles: ['admin', 'member', 'viewer'] })
  .exportable('csv', 'json');

export const configs = [tenantsConfig, usersConfig, productsConfig];

