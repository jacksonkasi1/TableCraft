import { TableConfig } from '../types/table';
import { EngineContext } from '../types/engine';

/**
 * Filters columns based on the requesting user's roles.
 * Columns with `visibleTo` are only shown to users with matching roles.
 * Columns without `visibleTo` are visible to everyone.
 *
 * Returns a new config with hidden columns updated.
 */
export function applyRoleBasedVisibility(
  config: TableConfig,
  context: EngineContext
): TableConfig {
  const userRoles = context.user?.roles ?? [];

  const columns = config.columns.map((col) => {
    const visibleTo = (col as any).visibleTo as string[] | undefined;

    // No restriction — keep as-is
    if (!visibleTo || visibleTo.length === 0) return col;

    // Check if user has any of the required roles
    const canSee = userRoles.some((role) => visibleTo.includes(role));

    if (canSee) return col;

    // User can't see this column — mark as hidden
    return { ...col, hidden: true };
  });

  return { ...config, columns };
}
