import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Package, Code2, Zap } from 'lucide-react';

export function DashboardPage() {
  return (
    <div className="p-8 space-y-8">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">TableCraft</h1>
        <p className="text-lg text-muted-foreground">
          Schema-driven data tables with zero configuration
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/products">
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-lg">Products</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Custom columns, cell renderers, row actions
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/products-axios">
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="h-5 w-5 text-purple-500" />
                <CardTitle className="text-lg">Axios Example</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Using axios instance with interceptors
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/orders">
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-green-500" />
                <CardTitle className="text-lg">Orders</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Zero-config auto-generated columns
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Start</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="p-4 bg-muted rounded-md text-sm overflow-x-auto">
            <code>{`import { DataTable, createTableCraftAdapter } from '@tablecraft/table';

const adapter = createTableCraftAdapter({
  baseUrl: '/api/engine',
  table: 'products',
});

<DataTable adapter={adapter} />  // That's it!`}</code>
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Auto-generated columns</Badge>
            <Badge variant="secondary">Server-side filtering</Badge>
            <Badge variant="secondary">Server-side sorting</Badge>
            <Badge variant="secondary">Server-side pagination</Badge>
            <Badge variant="secondary">URL state sync</Badge>
            <Badge variant="secondary">Column resizing</Badge>
            <Badge variant="secondary">Column visibility</Badge>
            <Badge variant="secondary">Export (CSV/JSON)</Badge>
            <Badge variant="secondary">Date filtering</Badge>
            <Badge variant="secondary">Type-safe</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <Link to="/products">
          <Button>
            View Examples <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
        <a href="https://github.com/jacksonkasi1/TableCraft" target="_blank" rel="noopener noreferrer">
          <Button variant="outline">GitHub</Button>
        </a>
      </div>
    </div>
  );
}
