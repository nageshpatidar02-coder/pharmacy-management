import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Filter,
  Receipt,
  RotateCcw,
  Search,
  Wallet,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { prisma } from "@/server/db/prisma";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    type?: string;
    method?: string;
    from?: string;
    to?: string;
  }> | {
    search?: string;
    type?: string;
    method?: string;
    from?: string;
    to?: string;
  };
}) {
  const user = await requirePermission(PERMISSIONS.salesView);

  // Safe resolution for Next.js 14 and Next.js 15
  const params = await Promise.resolve(searchParams);

  const search = params?.search || "";
  const typeFilter = params?.type || "";
  const methodFilter = (params?.method as "CASH" | "UPI" | "CARD" | "BANK" | "CREDIT" | undefined) || undefined;
  const fromDate = params?.from || "";
  const toDate = params?.to || "";

  // Date Range Filter Logic
  const dateFilter =
    fromDate || toDate
      ? {
          createdAt: {
            ...(fromDate ? { gte: new Date(`${fromDate}T00:00:00.000Z`) } : {}),
            ...(toDate ? { lte: new Date(`${toDate}T23:59:59.999Z`) } : {}),
          },
        }
      : {};

  // Concurrent Fetching Customer & Supplier Payments
  // Concurrent Fetching Customer & Supplier Payments (With Safety Cast)
  const [customerPayments, supplierPayments, walkInSales] = await Promise.all([
    typeFilter === "PURCHASE"
      ? []
      : prisma.customerPayment.findMany({
          where: {
            ...dateFilter,
            ...(methodFilter ? { method: methodFilter } : {}),
            ...(search
              ? {
                  OR: [
                    { customer: { name: { contains: search, mode: "insensitive" } } },
                    { sale: { invoiceNumber: { contains: search, mode: "insensitive" } } },
                  ],
                }
              : {}),
          },
          include: { customer: true, sale: true },
          orderBy: { createdAt: "desc" },
          take: 200,
        }),
    typeFilter === "SALE"
      ? []
      : prisma.supplierPayment.findMany({
          where: {
            ...dateFilter,
            ...(methodFilter ? { method: methodFilter } : {}),
            ...(search
              ? {
                  OR: [
                    { supplier: { businessName: { contains: search, mode: "insensitive" } } },
                    { purchase: { invoiceNumber: { contains: search, mode: "insensitive" } } },
                  ],
                }
              : {}),
          },
          include: { supplier: true, purchase: true },
          orderBy: { createdAt: "desc" },
          take: 200,
        }),
    typeFilter === "PURCHASE"
      ? []
      : prisma.sale.findMany({
          where: {
            customerId: null,
            paidAmount: { gt: 0 },
            ...dateFilter,
            ...(methodFilter ? { paymentMethod: methodFilter } : {}),
            ...(search ? { invoiceNumber: { contains: search, mode: "insensitive" } } : {}),
          },
          select: { id: true, invoiceNumber: true, paidAmount: true, paymentMethod: true, invoiceDate: true },
          orderBy: { invoiceDate: "desc" },
          take: 200,
        }),
  ]);
  // Merge and Sort Ledger Entries
  const entries = [
    ...customerPayments.map((payment) => ({
      id: `sale-${payment.id}`,
      kind: "SALE" as const,
      name: payment.customer?.name || "Walk-in Customer",
      invoice: payment.sale?.invoiceNumber ?? "Account Settlement",
      amount: payment.amount,
      method: payment.method,
      date: payment.createdAt,
    })),
    ...supplierPayments.map((payment) => ({
      id: `purchase-${payment.id}`,
      kind: "PURCHASE" as const,
      name: payment.supplier?.businessName || "Wholesaler Account",
      invoice: payment.purchase?.invoiceNumber ?? "Supplier Payment",
      amount: payment.amount,
      method: payment.method,
      date: payment.createdAt,
    })),
    ...walkInSales.map((sale) => ({
      id: `walk-in-sale-${sale.id}`,
      kind: "SALE" as const,
      name: "Walk-in Customer",
      invoice: sale.invoiceNumber,
      amount: sale.paidAmount,
      method: sale.paymentMethod,
      date: sale.invoiceDate,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  // Metrics Calculations
  const totalSales = entries
    .filter((e) => e.kind === "SALE")
    .reduce((sum, e) => sum + e.amount, 0);

  const totalPurchases = entries
    .filter((e) => e.kind === "PURCHASE")
    .reduce((sum, e) => sum + e.amount, 0);

  const netCashMovement = totalSales - totalPurchases;

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
        
        {/* Page Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary">
              Finance & Ledger
            </p>
            <h1 className="text-3xl font-bold tracking-tight">Payment Ledger</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Track customer Collections (+ IN) and wholesaler Payments (- OUT) in real-time.
            </p>
          </div>
        </div>

        {/* Overview Financial Metrics Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/10">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 uppercase tracking-wide">
                  Customer Collections
                </span>
                <div className="rounded-full bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                  <ArrowDownLeft className="size-5" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                +₹{totalSales.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Inflow from Sales</p>
            </CardContent>
          </Card>

          <Card className="border-rose-200 bg-rose-50/40 dark:bg-rose-950/10">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-800 dark:text-rose-400 uppercase tracking-wide">
                  Wholesaler Payments
                </span>
                <div className="rounded-full bg-rose-100 p-2 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300">
                  <ArrowUpRight className="size-5" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-rose-700 dark:text-rose-400">
                -₹{totalPurchases.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Outflow for Purchases</p>
            </CardContent>
          </Card>

          <Card className={netCashMovement >= 0 ? "border-emerald-200 bg-card" : "border-rose-200 bg-card"}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Net Cash Movement
                </span>
                <div className="rounded-full bg-primary/10 p-2 text-primary">
                  <Wallet className="size-5" />
                </div>
              </div>
              <p className={`mt-3 text-2xl font-bold ${netCashMovement >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
                {netCashMovement >= 0 ? "+" : ""}₹
                {netCashMovement.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Net Balance in Selected Period</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Toolbar */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 items-end">
              
              {/* Search Bar */}
              <div className="lg:col-span-2">
                <label className="text-xs font-medium mb-1 block">Search Party / Invoice</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    name="search"
                    defaultValue={search}
                    placeholder="Customer, wholesaler, bill..."
                    className="pl-9 bg-background"
                  />
                </div>
              </div>

              {/* Type Filter */}
              <div>
                <label className="text-xs font-medium mb-1 block">Transaction Type</label>
                <select
                  name="type"
                  defaultValue={typeFilter}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">All Transactions</option>
                  <option value="SALE">Customer Collections (+)</option>
                  <option value="PURCHASE">Wholesaler Payments (-)</option>
                </select>
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-xs font-medium mb-1 block">Payment Method</label>
                <select
                  name="method"
                  defaultValue={methodFilter ?? ""}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">All Methods</option>
                  {["CASH", "UPI", "CARD", "BANK", "CREDIT"].map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              {/* From Date */}
              <div>
                <label className="text-xs font-medium mb-1 block">From Date</label>
                <Input name="from" type="date" defaultValue={fromDate} className="bg-background" />
              </div>

              {/* To Date */}
              <div>
                <label className="text-xs font-medium mb-1 block">To Date</label>
                <Input name="to" type="date" defaultValue={toDate} className="bg-background" />
              </div>

              {/* Submit & Reset Buttons */}
              <div className="sm:col-span-2 lg:col-span-6 flex items-center justify-end gap-2 pt-2 border-t">
                <Link href="/payments">
                  <Button type="button" className="h-9 px-3 border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground text-xs gap-1 font-medium rounded-md inline-flex items-center justify-center">
                    <RotateCcw className="size-3.5" /> Reset Filters
                  </Button>
                </Link>
                <Button type="submit" size="sm" className="gap-1 min-w-25">
                  <Filter className="size-3.5" /> Filter Ledger
                </Button>
              </div>

            </form>
          </CardContent>
        </Card>

        {/* Ledger Table */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Receipt className="size-5 text-primary" /> Payment Transactions
            </CardTitle>
            <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-mono font-semibold text-foreground">
              {entries.length} Entries Found
            </span>
          </CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Receipt className="size-12 text-muted-foreground/30 mb-3" />
                <p className="text-base font-semibold">No payment entries found</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Try adjusting your search criteria, dates, or payment methods in the filter above.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <th className="py-3 px-4">Flow Type</th>
                      <th className="py-3 px-4">Party / Business Name</th>
                      <th className="py-3 px-4">Invoice / Reference</th>
                      <th className="py-3 px-4">Mode</th>
                      <th className="py-3 px-4 text-right">Amount (₹)</th>
                      <th className="py-3 px-4 text-right">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {entries.map((entry) => {
                      const isSale = entry.kind === "SALE";
                      return (
                        <tr key={entry.id} className="hover:bg-muted/20 transition-colors">
                          
                          {/* Flow Type Badge */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                isSale
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                  : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                              }`}
                            >
                              {isSale ? (
                                <>
                                  <ArrowDownLeft className="size-3.5 text-emerald-600" /> SALE (+ IN)
                                </>
                              ) : (
                                <>
                                  <ArrowUpRight className="size-3.5 text-rose-600" /> PURCHASE (- OUT)
                                </>
                              )}
                            </span>
                          </td>

                          {/* Party Name */}
                          <td className="py-3.5 px-4 font-semibold text-foreground">
                            {entry.name}
                          </td>

                          {/* Invoice Reference */}
                          <td className="py-3.5 px-4 text-xs font-mono text-muted-foreground">
                            {entry.invoice}
                          </td>

                          {/* Payment Method Badge */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border bg-secondary/50 text-xs font-medium">
                              <CreditCard className="size-3 text-muted-foreground" />
                              {entry.method}
                            </span>
                          </td>

                          {/* Amount */}
                          <td
                            className={`py-3.5 px-4 text-right font-bold text-base ${
                              isSale
                                ? "text-emerald-700 dark:text-emerald-400"
                                : "text-rose-700 dark:text-rose-400"
                            }`}
                          >
                            {isSale ? "+" : "-"}₹
                            {entry.amount.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </td>

                          {/* Date */}
                          <td className="py-3.5 px-4 text-right text-xs text-muted-foreground">
                            {new Date(entry.date).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </AppShell>
  );
}