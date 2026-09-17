"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Activity, BarChart3, ClipboardList, LayoutDashboard, Menu, Moon, Package, Pill, Settings, Sun, Truck, Users, X, ShoppingCart, FileBarChart, Layers3 } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/layout/user-menu";

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Medicines", href: "/medicines", icon: Pill },
  { label: "Categories", href: "/categories", icon: Layers3 },
  { label: "Manufacturers", href: "/manufacturers", icon: Layers3 },
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "Batches", href: "/batches", icon: Layers3 },
  { label: "Purchases", href: "/purchases", icon: ShoppingCart },
  { label: "Sales", href: "/sales", icon: BarChart3 },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Suppliers", href: "/suppliers", icon: Truck },
  { label: "Reports", href: "/reports", icon: FileBarChart },
];

type ShellUser = { name: string; email: string; role: { name: string } };

export function AppShell({ children, user }: { children: React.ReactNode; user: ShellUser }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  return <div className="min-h-screen bg-background md:flex">
    {sidebarOpen && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setSidebarOpen(false)} />}
    <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-64 -translate-x-full flex-col border-r bg-surface transition-transform md:static md:translate-x-0", sidebarOpen && "translate-x-0")}>
      <div className="flex h-20 items-center justify-between border-b px-6"><div className="flex items-center gap-3"><span className="rounded-lg bg-primary p-2 text-primary-foreground"><Pill className="size-5" /></span><div><p className="font-semibold tracking-tight">Medica</p><p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Management</p></div></div><Button variant="ghost" size="icon" className="md:hidden" aria-label="Close navigation" onClick={() => setSidebarOpen(false)}><X className="size-4" /></Button></div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label="Main navigation">{navigation.map(({ label, href, icon: Icon }) => <Link key={label} href={href} className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Icon className="size-[18px]" />{label}</Link>)}{(user.role.name === "SUPER_ADMIN" || user.role.name === "ADMIN") && <Link href="/users" className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Users className="size-[18px]" />Users</Link>}</nav>
      <div className="space-y-1 border-t p-4"><Link href="/settings" className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"><Settings className="size-[18px]" />Settings</Link><div className="mt-4 flex items-center gap-3 rounded-lg bg-muted p-3"><span className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">MS</span><div className="min-w-0"><p className="truncate text-sm font-semibold">Main store</p><p className="truncate text-xs text-muted-foreground">{user.email}</p></div></div></div>
    </aside>
    <div className="min-w-0 flex-1"><header className="flex h-20 items-center justify-between border-b bg-surface/80 px-4 backdrop-blur md:px-8"><div className="flex items-center gap-3"><Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><Menu className="size-5" /></Button><nav aria-label="Breadcrumb" className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex"><Link href="/dashboard">Dashboard</Link>{pathname !== "/dashboard" && <><span>/</span><span className="font-medium capitalize text-foreground">{pathname.slice(1).replaceAll("-", " ")}</span></>}</nav></div><div className="ml-auto flex items-center gap-3"><Button variant="ghost" size="icon" aria-label="Toggle color theme" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>{resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}</Button><span className="hidden items-center gap-2 border-l pl-4 text-xs font-medium text-muted-foreground sm:flex"><Activity className="size-3 text-primary" />System ready</span><UserMenu name={user.name} email={user.email} role={user.role.name} /></div></header><main className="p-4 md:p-8">{children}</main></div>
  </div>;
}
