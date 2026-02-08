import { TableConfig } from '../types/table';
import { EngineContext } from '../types/engine';

/**
 * Checks if the requesting user has access based on config roles/permissions.
 * Shared logic that all adapters can import from the engine.
 */
export function checkAccess(config: TableConfig, context: EngineContext): boolean {
  if (!config.access) return true;

  const userRoles = context.user?.roles ?? [];
  const userPerms = context.user?.permissions ?? [];

  if (config.access.roles && config.access.roles.length > 0) {
    const hasRole = config.access.roles.some((r) => userRoles.includes(r));
    if (!hasRole) return false;
  }

  if (config.access.permissions && config.access.permissions.length > 0) {
    const hasPerm = config.access.permissions.some((p) => userPerms.includes(p));
    if (!hasPerm) return false;
  }

  return true;
}

/**
 * Shared response helper for export requests.
 */
export interface ExportMeta {
  contentType: string;
  filename: string;
}

export function getExportMeta(tableName: string, format: 'csv' | 'json'): ExportMeta {
  return {
    contentType: format === 'csv' ? 'text/csv; charset=utf-8' : 'application/json',
    filename: `${tableName}-${Date.now()}.${format}`,
  };
}
