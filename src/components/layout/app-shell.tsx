"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { 
  Activity, 
  LayoutDashboard, 
  Menu, 
  Moon, 
  Package, 
  Pill, 
  Settings, 
  Sun, 
  Users, 
  X, 
  ReceiptText, 
  TrendingUp, 
  ShoppingCart, 
  UserCheck, 
  CreditCard,
  UserCircle
} from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/layout/user-menu";

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Medicines", href: "/medicines", icon: Pill },
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Customer Bills", href: "/sales", icon: ReceiptText },
  { label: "Payments", href: "/payments", icon: CreditCard },
  { label: "Profit", href: "/profit", icon: TrendingUp },
  { label: "Purchases Bills", href: "/purchases", icon: ShoppingCart },
  { label: "Suppliers/Wholesalers", href: "/suppliers", icon: UserCheck },
  { label: "Profile", href: "/profile", icon: UserCircle },
];

type ShellUser = { name: string; email: string; role: { name: string } };

export function AppShell({ children, user }: { children: React.ReactNode; user: ShellUser }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();

  // Route change hone par mobile sidebar auto-close ho jaye
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Active state matching function (Parent + Child routes support)
  const isRouteActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/" || pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background md:flex">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <button 
          aria-label="Close navigation" 
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs md:hidden" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 -translate-x-full flex-col border-r bg-surface transition-transform duration-200 ease-in-out md:static md:translate-x-0", 
          sidebarOpen && "translate-x-0"
        )}
      >
        {/* Brand Logo */}
        <div className="flex h-20 items-center justify-between border-b px-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="rounded-lg bg-primary p-2 text-primary-foreground shadow-xs">
              <Pill className="size-5" />
            </span>
            <div>
              <p className="font-semibold tracking-tight text-foreground">Medica</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Management
              </p>
            </div>
          </Link>
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden" 
            aria-label="Close navigation" 
            onClick={() => setSidebarOpen(false)}
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label="Main navigation">
          {navigation.map(({ label, href, icon: Icon }) => {
            const active = isRouteActive(href);
            return (
              <Link 
                key={label} 
                href={href} 
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active 
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className={cn("size-[18px]", active ? "text-primary-foreground" : "text-muted-foreground")} />
                {label}
              </Link>
            );
          })}

          {/* Super Admin / Admin User Management Link
          {(user.role.name === "SUPER_ADMIN" || user.role.name === "ADMIN") && (
            <Link 
              href="/users" 
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isRouteActive("/users") 
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Users className={cn("size-[18px]", isRouteActive("/users") ? "text-primary-foreground" : "text-muted-foreground")} />
              Users
            </Link>
          )} */}
        </nav>

        {/* Footer Area with Settings and User Identity */}
        <div className="space-y-3 border-t p-4">
          <Link 
            href="/settings" 
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isRouteActive("/settings") 
                ? "bg-primary text-primary-foreground font-semibold shadow-xs" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Settings className={cn("size-[18px]", isRouteActive("/settings") ? "text-primary-foreground" : "text-muted-foreground")} />
            Settings
          </Link>

          <div className="flex items-center gap-3 rounded-xl bg-muted/60 p-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
              {user.name ? user.name.slice(0, 2).toUpperCase() : "MS"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.name || "Main store"}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="min-w-0 flex-1">
        <header className="app-shell-header flex h-20 items-center justify-between border-b bg-surface/80 px-4 backdrop-blur-md md:px-8">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden" 
              aria-label="Open navigation" 
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="size-5" />
            </Button>

            {/* Breadcrumb Navigation */}
            <nav aria-label="Breadcrumb" className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
              <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
              {pathname !== "/dashboard" && pathname !== "/" && (
                <>
                  <span>/</span>
                  <span className="font-medium capitalize text-foreground">
                    {pathname.slice(1).replaceAll("-", " ")}
                  </span>
                </>
              )}
            </nav>
          </div>

          {/* Top-Right Profile Header */}
          <div className="ml-auto flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              aria-label="Toggle color theme" 
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            >
              {resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <span className="hidden items-center gap-2 border-l pl-4 text-xs font-medium text-muted-foreground sm:flex">
              <Activity className="size-3 text-emerald-500" /> System ready
            </span>
            <UserMenu name={user.name} email={user.email} role={user.role.name} />
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}