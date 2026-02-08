import { TableConfig, TableDefinition } from '@tablecraft/engine';

export const productConfig: TableDefinition = {
  name: 'products',
  base: 'products',
  columns: [
    { name: 'id', type: 'number', hidden: false, sortable: true, filterable: true },
    { name: 'name', type: 'string', hidden: false, sortable: true, filterable: true, label: 'Product Name' },
    { name: 'price', type: 'number', hidden: false, sortable: true, filterable: true },
    { name: 'category', type: 'string', hidden: false, sortable: true, filterable: true },
    { name: 'isArchived', type: 'boolean', hidden: true, filterable: true }, // Hidden but filterable
    { name: 'tags', type: 'json', hidden: false, filterable: false },
  ],
  filters: [
    { field: 'category', operator: 'eq', type: 'dynamic' },
    { field: 'price', operator: 'gte', type: 'dynamic', label: 'Min Price' },
    { field: 'price', operator: 'lte', type: 'dynamic', label: 'Max Price' },
    // Static filter: Only show active products by default
    { field: 'isArchived', operator: 'eq', value: false, type: 'static' }
  ],
  search: {
    enabled: true,
    fields: ['name', 'description', 'category']
  },
  defaultSort: [{ field: 'name', order: 'asc' }],
  pagination: {
    enabled: true,
    defaultPageSize: 10
  }
};

export const orderConfig: TableDefinition = {
  name: 'orders',
  base: 'orders',
  columns: [
    { name: 'id', type: 'number', hidden: false, sortable: true },
    { name: 'status', type: 'string', hidden: false, filterable: true },
    { name: 'total', type: 'number', hidden: false, sortable: true },
    { name: 'createdAt', type: 'date', hidden: false, sortable: true },
    // Joined columns
    { name: 'userEmail', field: 'users.email', type: 'string', hidden: false, label: 'Customer' },
    { name: 'itemCount', type: 'number', hidden: false, label: 'Items' }
  ],
  joins: [
    {
      table: 'users',
      alias: 'u',
      type: 'left',
      on: 'orders.user_id = users.id'
    }
  ],
  subqueries: [
    {
      alias: 'itemCount',
      table: 'orderItems',
      type: 'count',
      filter: 'order_items.order_id = orders.id'
    }
  ],
  softDelete: {
    enabled: true,
    field: 'deletedAt'
  },
  aggregations: [
    { alias: 'totalRevenue', type: 'sum', field: 'total' },
    { alias: 'avgOrderValue', type: 'avg', field: 'total' }
  ]
};

export const configs = [productConfig, orderConfig];
