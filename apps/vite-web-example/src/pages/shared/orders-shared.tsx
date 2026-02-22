import { defineColumnOverrides } from '@tablecraft/table';
import { Badge } from '../../components/ui/badge';
import type { OrdersRow } from '../../generated';

export const ALL = '__all__';

export const STATUS_OPTIONS = [
  { value: ALL, label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const ROLE_OPTIONS = [
  { value: ALL, label: 'All roles' },
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
  { value: 'viewer', label: 'Viewer' },
];

export const STATUS_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending:    'secondary',
  processing: 'outline',
  shipped:    'default',
  delivered:  'default',
  cancelled:  'destructive',
};

export const columnOverrides = defineColumnOverrides<OrdersRow>()({
  status: ({ value }) => {
    const v = String(value ?? '');
    return (
      <Badge variant={STATUS_BADGE_VARIANT[v] ?? 'secondary'}>
        {v}
      </Badge>
    );
  },
  total: ({ value }) => (
    <span className="font-mono">${Number(value ?? 0).toFixed(2)}</span>
  ),
  vatAmount: ({ value }) => (
    <span className="font-mono text-muted-foreground">${Number(value ?? 0).toFixed(2)}</span>
  ),
  role: ({ value }) => (
    <Badge variant="outline">{String(value ?? '')}</Badge>
  ),
});