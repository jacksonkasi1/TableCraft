import { Routes, Route, Link, useLocation } from "react-router-dom";
import { ProductsPage } from "@/pages/products-page";
import { ProductsAxiosPage } from "@/pages/products-axios-page";
import { OrdersPage } from "@/pages/orders-page";
import { Orders2Page } from "@/pages/orders2-page";
import { UsersPage } from "@/pages/users-page";
import { DashboardPage } from "@/pages/dashboard-page";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Package, ShoppingCart, Users, LayoutDashboard, Github, Cable, Filter } from "lucide-react";
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
    { to: "/users", label: "Users", icon: Users },
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
                  <Github className="h-[1.2rem] w-[1.2rem]" />
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
            <Route path="/users" element={<UsersPage />} />
          </Routes>
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;
