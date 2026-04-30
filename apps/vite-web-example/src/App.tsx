import { Routes, Route, Link, useLocation } from "react-router-dom";
import { ProductsPage } from "@/pages/products-page";
import { ProductsAxiosPage } from "@/pages/products-axios-page";
import { OrdersPage } from "@/pages/orders-page";
import { Orders2Page } from "@/pages/orders2-page";
import { Orders3Page } from "@/pages/orders3-page";
import { UsersPage } from "@/pages/users-page";
import { DashboardPage } from "@/pages/dashboard-page";
import { OrdersRestPage } from "@/pages/orders-rest-page";
import { OrdersSubRowPage } from "@/pages/orders-subrow-page";
import { EmployeesStaticPage } from "@/pages/employees-static-page";
import { EmployeesGroupingPage } from "@/pages/employees-grouping-page";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Package, ShoppingCart, Users, LayoutDashboard, Cable, Filter, Plug, Database } from "lucide-react";

const GithubIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.341-3.369-1.341-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
  </svg>
);
import { ThemeProvider } from "@/components/theme-provider";
import { ModeToggle } from "@/components/mode-toggle";

function App() {
  const location = useLocation();

  const navItems = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/products", label: "Products", icon: Package },
    { to: "/products-axios", label: "Axios", icon: Cable },
    { to: "/orders", label: "Orders", icon: ShoppingCart },
    { to: "/orders-advanced", label: "Orders (Filters)", icon: Filter },
    { to: "/orders-complex", label: "Orders (Complex)", icon: Filter },
    { to: "/orders-rest", label: "Orders (REST)", icon: Plug },
    { to: "/employees", label: "Employees (Static)", icon: Database },
    { to: "/users", label: "Users", icon: Users },
    { to: "/orders-subrow", label: "Sub-Rows", icon: Filter },
    { to: "/row-grouping", label: "Row Grouping", icon: Database },
  ];

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="border-b">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link to="/" className="flex items-center space-x-2">
                <h1 className="text-xl font-bold">TableCraft</h1>
              </Link>

              <nav className="flex items-center space-x-4">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.to;
                  return (
                    <Link key={item.to} to={item.to}>
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        size="sm"
                        className={cn(isActive && "bg-secondary")}
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        {item.label}
                      </Button>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <a
                href="https://github.com/jacksonkasi1/TableCraft"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="ghost" size="icon">
                  <GithubIcon className="h-[1.2rem] w-[1.2rem]" />
                  <span className="sr-only">GitHub</span>
                </Button>
              </a>
              <ModeToggle />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products-axios" element={<ProductsAxiosPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders-advanced" element={<Orders2Page />} />
            <Route path="/orders-complex" element={<Orders3Page />} />
            <Route path="/orders-rest" element={<OrdersRestPage />} />
            <Route path="/employees" element={<EmployeesStaticPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/orders-subrow" element={<OrdersSubRowPage />} />
            <Route path="/row-grouping" element={<EmployeesGroupingPage />} />
          </Routes>
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;
