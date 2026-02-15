import type { TableMetadata, CodegenOptions } from './types.js';

export async function fetchMetadata(
  baseUrl: string,
  headers?: Record<string, string>
): Promise<TableMetadata[]> {
  const normalizedUrl = baseUrl.replace(/\/$/, '');

  try {
    const response = await fetch(`${normalizedUrl}/_tables`, {
      headers: {
        Accept: 'application/json',
        ...headers,
      },
    });

    if (response.ok) {
      const tableNames = await response.json() as string[];
      const metas = await Promise.all(
        tableNames.map(name => fetchTableMetadata(normalizedUrl, name, headers))
      );
      return metas.filter((m): m is TableMetadata => m !== null);
    }

    console.error(`Failed to fetch table list: ${response.status}`);
    return [];
  } catch (error) {
    console.error('Error fetching table list:', error);
    return [];
  }
}

export async function fetchTableMetadata(
  baseUrl: string,
  tableName: string,
  headers?: Record<string, string>
): Promise<TableMetadata | null> {
  const normalizedUrl = baseUrl.replace(/\/$/, '');
  
  try {
    const response = await fetch(`${normalizedUrl}/${tableName}/_meta`, {
      headers: {
        Accept: 'application/json',
        ...headers,
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch metadata for table '${tableName}': ${response.status}`);
      return null;
    }

    return (await response.json()) as TableMetadata;
  } catch (error) {
    console.error(`Error fetching metadata for table '${tableName}':`, error);
    return null;
  }
}

export async function fetchAllTables(
  options: CodegenOptions
): Promise<TableMetadata[]> {
  const { url, headers, tables } = options;
  
  if (tables && tables.length > 0) {
    const metas = await Promise.all(
      tables.map(name => fetchTableMetadata(url, name, headers))
    );
    return metas.filter((m): m is TableMetadata => m !== null);
  }

  return fetchMetadata(url, headers);
}