import { TableConfig } from '../types/table';

/**
 * Generates an OpenAPI 3.0 spec object from a TableConfig.
 */
export function generateOpenApiSpec(config: TableConfig): Record<string, unknown> {
  const properties: Record<string, unknown> = {};

  for (const col of config.columns) {
    if (col.hidden) continue;
    properties[col.name] = {
      type: mapTypeToOpenApi(col.type),
      ...(col.label && { description: col.label }),
    };
  }

  const filterParams: Record<string, unknown>[] = [];

  if (config.filters) {
    for (const f of config.filters) {
      if (f.type === 'static') continue;
      filterParams.push({
        name: `filter[${f.field}]`,
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: f.label ?? `Filter by ${f.field}`,
      });
    }
  }

  const parameters: Record<string, unknown>[] = [
    { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
    {
      name: 'pageSize',
      in: 'query',
      required: false,
      schema: {
        type: 'integer',
        default: config.pagination?.defaultPageSize ?? 10,
        maximum: config.pagination?.maxPageSize ?? 100,
      },
    },
    {
      name: 'cursor',
      in: 'query',
      required: false,
      schema: { type: 'string' },
      description: 'Opaque cursor for cursor-based pagination. When provided, page/pageSize are ignored.',
    },
    { name: 'sort', in: 'query', required: false, schema: { type: 'string' }, description: 'Comma-separated fields. Prefix with - for desc.' },
    {
      name: 'select',
      in: 'query',
      required: false,
      schema: { type: 'string' },
      description: 'Comma-separated list of fields to include in the response.',
    },
    {
      name: 'distinct',
      in: 'query',
      required: false,
      schema: { type: 'boolean' },
      description: 'When true, applies SELECT DISTINCT to the query.',
    },
    ...filterParams,
  ];

  if (config.search?.enabled) {
    parameters.push({
      name: 'search',
      in: 'query',
      required: false,
      schema: { type: 'string' },
      description: `Search across: ${config.search.fields.join(', ')}`,
    });
  }

  if (config.export?.enabled) {
    parameters.push({
      name: 'export',
      in: 'query',
      required: false,
      schema: { type: 'string', enum: config.export.formats },
    });
  }

  const spec = {
    openapi: '3.0.3',
    info: {
      title: `${config.name} API`,
      version: '1.0.0',
    },
    paths: {
      [`/api/${config.name}`]: {
        get: {
          summary: `List ${config.name}`,
          operationId: `list${capitalise(config.name)}`,
          parameters,
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties,
                        },
                      },
                      meta: {
                        type: 'object',
                        properties: {
                          total: { type: 'integer', nullable: true },
                          page: { type: 'integer' },
                          pageSize: { type: 'integer' },
                          totalPages: { type: 'integer', nullable: true },
                          nextCursor: { type: 'string', nullable: true, description: 'Cursor for the next page (cursor-based pagination only).' },
                          countMode: { type: 'string', enum: ['exact', 'estimated', 'none'], description: 'How the total row count was computed.' },
                        },
                      },
                      ...(config.aggregations && config.aggregations.length > 0
                        ? {
                            aggregations: {
                              type: 'object',
                              properties: Object.fromEntries(
                                config.aggregations.map((a) => [a.alias, { type: 'number' }])
                              ),
                            },
                          }
                        : {}),
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  if (config.access) {
    const getSec = (spec.paths as any)[`/api/${config.name}`].get;
    getSec.security = [{ bearerAuth: [] }];
    (spec as any).components = {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    };
  }

  return spec;
}

function mapTypeToOpenApi(type: string): string {
  switch (type) {
    case 'number': return 'number';
    case 'boolean': return 'boolean';
    case 'date': return 'string';
    case 'json': return 'object';
    case 'uuid': return 'string';
    default: return 'string';
  }
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
