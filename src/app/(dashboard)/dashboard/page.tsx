import { 
  Activity, 
  ArrowUpRight, 
  ClipboardList, 
  PackageCheck, 
  ReceiptText, 
  ShieldCheck, 
  TrendingUp, 
  AlertTriangle, 
  CalendarX, 
  Plus, 
  Box,
  Package,
  Layers,
  IndianRupee,
  type LucideIcon 
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppShell } from "@/components/layout/app-shell";
import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { getDashboardSummary } from "@/server/services/dashboard.service";
import Link from "next/link";

export default async function Home() {
  const user = await requirePermission(PERMISSIONS.dashboardView);
  const summary = await getDashboardSummary();

  // 1. Dynamic Financial Calculations (Sales, Purchase & Net Profit)
  const todaySales = summary?.todaySalesValue ?? 0;
  const todayPurchase = summary?.todayPurchaseValue ?? 0;
  
  // Profit calculation (Agar Backend se summary.todayProfitValue nahi aa raha toh calculate kar lenge)
  const todayProfit = summary?.todayProfitValue !== undefined && summary?.todayProfitValue !== 0 
    ? summary.todayProfitValue 
    : (todaySales - todayPurchase);

  const isProfitPositive = todayProfit >= 0;

  // 2. Activities Data
  const activities = summary?.recentActivities ?? [];

  // Current Date Formatting
  const currentDateFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-[1440px] space-y-8 p-4 md:p-6">
        {/* Database Connection Alert */}
        {!summary?.databaseAvailable && (
          <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-xs flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-600 shrink-0" />
            <span>Database connection unavailable. Dashboard values are temporary placeholders. Check your MongoDB connection and DATABASE_URL.</span>
          </div>
        )}

        {/* Header Section */}
        <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-primary">
              {currentDateFormatted}
            </p>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Welcome back, {user.name || "Team"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your store operations and real-time inventory performance.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/inventory"><Box className="mr-2 size-4" /> Manage Inventory</Link>
            </Button>
            <Button asChild>
              <Link href="/sales/new"><Plus className="mr-2 size-4" /> Create Sale</Link>
            </Button>
          </div>
        </section>

        {/* Store Banner */}
        <section className="relative overflow-hidden rounded-2xl border bg-surface shadow-sm">
          <img 
            src="https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=1400&q=85" 
            alt="Organized pharmacy shelves" 
            className="h-40 w-full object-cover md:h-48" 
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
          <div className="absolute inset-y-0 left-0 flex max-w-xl flex-col justify-center px-6 text-white md:px-8">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-teal-300">
              <ShieldCheck className="size-4" /> Care-Ready Operations
            </span>
            <h2 className="mt-1.5 text-2xl font-bold tracking-tight md:text-3xl">
              Keep Every Medicine Accounted For.
            </h2>
            <p className="mt-1 text-xs md:text-sm text-white/80">
              Monitor batch stock, strip-wise estimation, loose tablets, and sales profit from one space.
            </p>
          </div>
        </section>

        {/* Financial Highlights (Sales, Purchase & Profit Cards) */}
        <div>
          <h2 className="text-lg font-semibold tracking-tight mb-3">Today's Financial Overview</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            
            {/* Sales Card */}
            <Card className="shadow-xs border-emerald-100 bg-emerald-50/20">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Today's Sales</p>
                  <p className="text-2xl font-bold mt-1 text-emerald-950">₹{todaySales.toFixed(2)}</p>
                  <p className="text-xs text-emerald-700 font-medium mt-0.5">
                    {summary?.todaySalesCount ?? 0} sale(s) today
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-100 text-emerald-700">
                  <ReceiptText className="size-6" />
                </div>
              </CardContent>
            </Card>

            {/* Purchase Card */}
            <Card className="shadow-xs border-blue-100 bg-blue-50/20">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Today's Purchase</p>
                  <p className="text-2xl font-bold mt-1 text-blue-950">₹{todayPurchase.toFixed(2)}</p>
                  <p className="text-xs text-blue-700 font-medium mt-0.5">
                    {summary?.todayPurchaseCount ?? 0} purchase(s) today
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-blue-100 text-blue-700">
                  <PackageCheck className="size-6" />
                </div>
              </CardContent>
            </Card>

            {/* Profit Card (Corrected Profit Display) */}
            <Card className="shadow-xs border-indigo-100 bg-indigo-50/20">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Today's Profit</p>
                  <p className={`text-2xl font-bold mt-1 ${isProfitPositive ? "text-emerald-700" : "text-rose-700"}`}>
                    ₹{todayProfit.toFixed(2)}
                  </p>
                  <p className="text-xs text-indigo-700 font-medium mt-0.5 flex items-center gap-1">
                    <TrendingUp className="size-3" /> Margin calculated dynamically
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${isProfitPositive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                  <IndianRupee className="size-6" />
                </div>
              </CardContent>
            </Card>

          </div>
        </div>

        {/* Stock summary uses the same package/loose-unit totals as Inventory. */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-lg bg-blue-50 p-3 text-blue-600"><Package className="size-6" /></div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Total Stock</p>
                <p className="mt-0.5 text-2xl font-bold">{summary?.totalStockCount ?? 0} Items</p>
                <p className="text-[11px] font-medium text-muted-foreground">({summary?.currentStock ?? 0} Total Loose Units)</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-lg bg-emerald-50 p-3 text-emerald-600"><Layers className="size-6" /></div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Stock Value</p>
                <p className="mt-0.5 text-2xl font-bold">₹{(summary?.stockValue ?? 0).toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className={`shadow-sm ${(summary?.lowStockCount ?? 0) > 0 ? "border-amber-300 bg-amber-50/30" : ""}`}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-lg bg-amber-50 p-3 text-amber-600"><AlertTriangle className="size-6" /></div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Low Stock Alerts</p>
                <p className="mt-0.5 text-2xl font-bold">{summary?.lowStockCount ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className={`shadow-sm ${(summary?.expiredCount ?? 0) + (summary?.nearExpiryCount ?? 0) > 0 ? "border-rose-300 bg-rose-50/30" : ""}`}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-lg bg-rose-50 p-3 text-rose-600"><CalendarX className="size-6" /></div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Expired / Near Expiry</p>
                <p className="mt-0.5 text-2xl font-bold">{summary?.expiredCount ?? 0} / {summary?.nearExpiryCount ?? 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lower Section: Table Layout for Recent Activity & Quick Actions */}
        <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          
          {/* Table UI for Recent Activity */}
          <Card className="shadow-sm border-border">
            <CardHeader className="flex-row items-center justify-between border-b bg-muted/20 pb-4">
              <div>
                <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
                <CardDescription>Live events from your store operations.</CardDescription>
              </div>
              <Button variant="ghost" size="icon" aria-label="Open recent activity" asChild>
                <Link href="/activity"><ArrowUpRight className="size-4" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {activities.length === 0 ? (
                <div className="flex min-h-48 flex-col items-center justify-center p-6 text-center">
                  <Activity className="size-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">No activity to display yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/40 text-xs uppercase font-semibold text-muted-foreground">
                        <th className="py-3 px-4">Activity Title</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4 text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {activities.map((act: any, index: number) => (
                        <tr key={`${act.time}-${act.title}-${index}`} className="hover:bg-muted/10 transition-colors">
                          <td className="py-3 px-4 font-semibold text-foreground">
                            {act.title}
                          </td>
                          <td className="py-3 px-4 text-xs text-muted-foreground">
                            {act.description}
                          </td>
                          <td className="py-3 px-4 text-right text-xs font-mono text-muted-foreground">
                            {new Date(act.time).toLocaleString([], {
                              dateStyle: "short",
                              timeStyle: "short"
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
              <CardDescription>Common store workflows and shortcuts.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 grid gap-3">
              <Button variant="outline" className="justify-start h-11" asChild>
                <Link href="/inventory">
                  <PackageCheck className="size-4 mr-2 text-primary" /> Add Inventory Item
                </Link>
              </Button>
              <Button variant="outline" className="justify-start h-11" asChild>
                <Link href="/sales/new">
                  <ReceiptText className="size-4 mr-2 text-emerald-600" /> Create Sale
                </Link>
              </Button>
              <Button variant="outline" className="justify-start h-11" asChild>
                <Link href="/suppliers">
                  <ClipboardList className="size-4 mr-2 text-blue-600" /> Review Suppliers
                </Link>
              </Button>
            </CardContent>
          </Card>

        </section>
      </div>
    </AppShell>
  );
}