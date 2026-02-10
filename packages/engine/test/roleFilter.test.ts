import { describe, it, expect } from 'vitest';
import { applyRoleBasedVisibility } from '../src/core/roleFilter';
import { TableConfig } from '../src/types/table';

const config: TableConfig = {
  name: 'employees',
  base: 'employees',
  columns: [
    { name: 'id', type: 'uuid', hidden: false, sortable: true, filterable: true },
    { name: 'name', type: 'string', hidden: false, sortable: true, filterable: true },
    { name: 'email', type: 'string', hidden: false, sortable: true, filterable: true },
    { name: 'salary', type: 'number', hidden: false, sortable: true, filterable: true,
      visibleTo: ['admin', 'hr'] } as any,
    { name: 'ssn', type: 'string', hidden: false, sortable: false, filterable: false,
      visibleTo: ['admin'] } as any,
    { name: 'notes', type: 'string', hidden: false, sortable: false, filterable: false },
  ],
};

describe('applyRoleBasedVisibility', () => {
  it('should show all unrestricted columns to everyone', () => {
    const result = applyRoleBasedVisibility(config, { user: { id: '1', roles: [] } });
    expect(result.columns.find(c => c.name === 'name')!.hidden).toBe(false);
    expect(result.columns.find(c => c.name === 'email')!.hidden).toBe(false);
    expect(result.columns.find(c => c.name === 'notes')!.hidden).toBe(false);
  });

  it('should hide salary from non-admin/hr', () => {
    const result = applyRoleBasedVisibility(config, { user: { id: '1', roles: ['viewer'] } });
    expect(result.columns.find(c => c.name === 'salary')!.hidden).toBe(true);
  });

  it('should show salary to admin', () => {
    const result = applyRoleBasedVisibility(config, { user: { id: '1', roles: ['admin'] } });
    expect(result.columns.find(c => c.name === 'salary')!.hidden).toBe(false);
  });

  it('should show salary to hr', () => {
    const result = applyRoleBasedVisibility(config, { user: { id: '1', roles: ['hr'] } });
    expect(result.columns.find(c => c.name === 'salary')!.hidden).toBe(false);
  });

  it('should show ssn only to admin', () => {
    const hrResult = applyRoleBasedVisibility(config, { user: { id: '1', roles: ['hr'] } });
    expect(hrResult.columns.find(c => c.name === 'ssn')!.hidden).toBe(true);

    const adminResult = applyRoleBasedVisibility(config, { user: { id: '1', roles: ['admin'] } });
    expect(adminResult.columns.find(c => c.name === 'ssn')!.hidden).toBe(false);
  });

  it('should hide restricted columns when no context', () => {
    const result = applyRoleBasedVisibility(config, {});
    expect(result.columns.find(c => c.name === 'salary')!.hidden).toBe(true);
    expect(result.columns.find(c => c.name === 'ssn')!.hidden).toBe(true);
  });

  it('should not mutate original config', () => {
    const result = applyRoleBasedVisibility(config, { user: { id: '1', roles: [] } });
    expect(config.columns.find(c => c.name === 'salary')!.hidden).toBe(false); // original unchanged
    expect(result.columns.find(c => c.name === 'salary')!.hidden).toBe(true); // copy changed
  });
});
