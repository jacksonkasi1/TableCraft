/**
 * Database dialect detection and feature gating.
 * Prevents PostgreSQL-only features from silently failing on MySQL/SQLite.
 */

export type Dialect = 'postgresql' | 'mysql' | 'sqlite' | 'unknown';

/**
 * Auto-detect dialect from a Drizzle database instance.
 */
export function detectDialect(db: any): Dialect {
  // Drizzle instances have internal markers we can check
  const constructor = db?.constructor?.name?.toLowerCase() ?? '';

  if (constructor.includes('pg') || constructor.includes('postgres') || constructor.includes('neon')) {
    return 'postgresql';
  }
  if (constructor.includes('mysql') || constructor.includes('planetscale')) {
    return 'mysql';
  }
  if (constructor.includes('sqlite') || constructor.includes('libsql') || constructor.includes('turso') || constructor.includes('d1')) {
    return 'sqlite';
  }

  // Check for dialect property that some Drizzle instances expose
  if (db?.dialect?.name) {
    const name = db.dialect.name.toLowerCase();
    if (name.includes('pg')) return 'postgresql';
    if (name.includes('mysql')) return 'mysql';
    if (name.includes('sqlite')) return 'sqlite';
  }

  return 'unknown';
}

/**
 * Feature support matrix per dialect.
 */
const FEATURES: Record<string, Set<Dialect>> = {
  ilike: new Set(['postgresql']),
  fullTextSearch: new Set(['postgresql']),
  recursiveCTE: new Set(['postgresql', 'sqlite']),
  returning: new Set(['postgresql', 'sqlite']),
  lateral: new Set(['postgresql']),
  distinct: new Set(['postgresql', 'mysql', 'sqlite']),
  estimatedCount: new Set(['postgresql']),
};

export function supportsFeature(dialect: Dialect, feature: string): boolean {
  const supported = FEATURES[feature];
  if (!supported) return true; // unknown features assumed supported
  if (dialect === 'unknown') return true; // don't block unknown dialects
  return supported.has(dialect);
}

/**
 * Returns LIKE or ILIKE based on dialect.
 * MySQL/SQLite: LIKE is case-insensitive by default.
 * PostgreSQL: needs ILIKE for case-insensitive.
 */
export function getCaseInsensitiveLike(dialect: Dialect): 'like' | 'ilike' {
  return dialect === 'postgresql' ? 'ilike' : 'like';
}
