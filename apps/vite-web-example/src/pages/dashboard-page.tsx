import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, ShoppingCart, Users, TrendingUp } from 'lucide-react';

/**
 * Dashboard Page - Overview of the TableCraft demo
 */
export function DashboardPage() {
  const features = [
    {
      icon: Package,
      title: 'Schema-Driven Tables',
      description: 'Auto-generate UI from backend metadata with zero configuration',
      color: 'text-blue-500',
    },
    {
      icon: ShoppingCart,
      title: 'Server-Side Everything',
      description: 'Filtering, sorting, pagination all handled by the backend engine',
      color: 'text-green-500',
    },
    {
      icon: Users,
      title: 'Type-Safe Client',
      description: 'Full TypeScript support with auto-completion and type inference',
      color: 'text-purple-500',
    },
    {
      icon: TrendingUp,
      title: 'Production Ready',
      description: 'Built on battle-tested libraries: Drizzle, Hono, TanStack Table',
      color: 'text-orange-500',
    },
  ];

  const techStack = [
    { name: 'Frontend', items: ['React 19', 'Vite', 'TanStack Table', 'Shadcn UI', 'Tailwind CSS'] },
    { name: 'Backend', items: ['Hono.js', 'Drizzle ORM', 'PostgreSQL', 'Bun Runtime'] },
    { name: 'Architecture', items: ['Monorepo (Turborepo)', 'TypeScript', 'ESLint', 'Workspace Protocol'] },
  ];

  return (
    <div className="container mx-auto py-10 space-y-8">
      {/* Hero Section */}
      <div className="space-y-4">
        <h1 className="text-5xl font-bold tracking-tight">
          Welcome to TableCraft
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl">
          A complete example of building data-rich applications with TableCraft Engine. 
          This demo showcases auto-generated tables, server-side operations, and type-safe API integration.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start space-x-4">
                  <div className={`p-2 rounded-lg bg-secondary ${feature.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* Quick Start */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Start Guide</CardTitle>
          <CardDescription>
            Follow these steps to explore the demo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <Badge variant="outline" className="mt-0.5">1</Badge>
              <div>
                <p className="font-medium">Explore the Products Table</p>
                <p className="text-sm text-muted-foreground">
                  Navigate to the Products page to see server-side filtering, sorting, and search in action.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Badge variant="outline" className="mt-0.5">2</Badge>
              <div>
                <p className="font-medium">Check the Orders Page</p>
                <p className="text-sm text-muted-foreground">
                  View how TableCraft handles relationships and joins with related data.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Badge variant="outline" className="mt-0.5">3</Badge>
              <div>
                <p className="font-medium">Try the Users Management</p>
                <p className="text-sm text-muted-foreground">
                  See role-based column visibility and advanced filtering capabilities.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Badge variant="outline" className="mt-0.5">4</Badge>
              <div>
                <p className="font-medium">Inspect the Network Tab</p>
                <p className="text-sm text-muted-foreground">
                  Open DevTools to see how the frontend communicates with the Hono backend API.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tech Stack */}
      <Card>
        <CardHeader>
          <CardTitle>Technology Stack</CardTitle>
          <CardDescription>
            This demo is built with modern, production-ready tools
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {techStack.map((category, index) => (
              <div key={index} className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  {category.name}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {category.items.map((item, i) => (
                    <Badge key={i} variant="secondary">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* API Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle>Available API Endpoints</CardTitle>
          <CardDescription>
            The Hono backend serves these TableCraft-powered endpoints
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="font-mono text-sm">
              <Badge variant="outline" className="mr-2">GET</Badge>
              <code className="text-blue-600">/api/engine/products</code>
              <span className="text-muted-foreground ml-2">— Query products with filters</span>
            </div>
            <div className="font-mono text-sm">
              <Badge variant="outline" className="mr-2">GET</Badge>
              <code className="text-blue-600">/api/engine/products/_meta</code>
              <span className="text-muted-foreground ml-2">— Get table metadata</span>
            </div>
            <div className="font-mono text-sm">
              <Badge variant="outline" className="mr-2">GET</Badge>
              <code className="text-blue-600">/api/engine/orders</code>
              <span className="text-muted-foreground ml-2">— Query orders with relationships</span>
            </div>
            <div className="font-mono text-sm">
              <Badge variant="outline" className="mr-2">GET</Badge>
              <code className="text-blue-600">/api/engine/users</code>
              <span className="text-muted-foreground ml-2">— Query users with role-based access</span>
            </div>
            <div className="font-mono text-sm">
              <Badge variant="outline" className="mr-2">GET</Badge>
              <code className="text-blue-600">/api/engine/tenants</code>
              <span className="text-muted-foreground ml-2">— Multi-tenant data isolation</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Architecture Overview */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">1. Backend Configuration</h3>
            <p className="text-sm text-muted-foreground">
              The Hono backend uses TableCraft Engine configs to define table schemas, 
              relationships, filters, and access control rules.
            </p>
            <pre className="mt-2 p-3 bg-secondary rounded-md text-xs overflow-x-auto">
              <code>{`// apps/hono-example/src/routes/engine/configs/products.ts
export const productsConfig = {
  columns: ['id', 'name', 'price', 'category'],
  filters: [{ field: 'category', operator: 'eq' }],
  search: ['name', 'description'],
  defaultSort: ['-createdAt'],
};`}</code>
            </pre>
          </div>

          <div>
            <h3 className="font-semibold mb-2">2. Frontend Integration</h3>
            <p className="text-sm text-muted-foreground">
              The React frontend uses the TableCraft adapter to connect to the backend. 
              It fetches metadata and auto-generates the entire table UI.
            </p>
            <pre className="mt-2 p-3 bg-secondary rounded-md text-xs overflow-x-auto">
              <code>{`// Frontend code
const adapter = createTableCraftAdapter({
  baseUrl: '/api/engine',
  table: 'products',
});

<DataTable adapter={adapter} />`}</code>
            </pre>
          </div>

          <div>
            <h3 className="font-semibold mb-2">3. Zero Manual Configuration</h3>
            <p className="text-sm text-muted-foreground">
              The DataTable component automatically:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc list-inside">
              <li>Fetches column definitions from <code>/api/engine/products/_meta</code></li>
              <li>Generates filter controls based on column types</li>
              <li>Sets up sorting for sortable columns</li>
              <li>Handles pagination with the backend</li>
              <li>Syncs all state to the URL for shareability</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}