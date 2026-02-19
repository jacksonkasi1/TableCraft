import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

export function DashboardPage() {
  return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-md space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-bold">TableCraft</h1>
          <p className="text-muted-foreground">Schema-driven data tables</p>
        </div>

        <div className="p-4 bg-muted rounded-md text-left text-sm font-mono overflow-x-auto">
          <code>{`<DataTable adapter={adapter} />`}</code>
        </div>

        <div className="flex justify-center flex-wrap gap-2">
          <Link to="/products" className="hover:underline">Products</Link>
          <span className="text-muted-foreground">·</span>
          <Link to="/products-axios" className="hover:underline">Axios</Link>
          <span className="text-muted-foreground">·</span>
          <Link to="/orders" className="hover:underline">Orders</Link>
          <span className="text-muted-foreground">·</span>
          <Link to="/users" className="hover:underline">Users</Link>
        </div>

        <div className="flex justify-center flex-wrap gap-2">
          <Badge variant="secondary">Auto columns</Badge>
          <Badge variant="secondary">Server-side</Badge>
          <Badge variant="secondary">Type-safe</Badge>
        </div>
      </div>
    </div>
  );
}
