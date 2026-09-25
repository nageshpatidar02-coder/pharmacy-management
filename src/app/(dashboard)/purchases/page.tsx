import Link from "next/link";
import { 
  Plus, 
  Search, 
  Filter, 
  RotateCcw, 
  Receipt, 
  Building2, 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  ArrowUpRight
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SupplierHistorySearch } from "@/components/purchases/supplier-history-search";
import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { listPurchases } from "@/server/services/purchase.service";
import { prisma } from "@/server/db/prisma";

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    supplierId?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const user = await requirePermission(PERMISSIONS.purchaseView);
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));

  const [result, suppliers] = await Promise.all([
    listPurchases({
      search: params.search,
      supplierId: params.supplierId,
      from: params.from ? new Date(`${params.from}T00:00:00.000Z`) : undefined,
      to: params.to ? new Date(`${params.to}T23:59:59.999Z`) : undefined,
      page,
    }),
    prisma.supplier.findMany({
      where: { pharmacyId: user.pharmacyId, status: "ACTIVE" },
      select: { id: true, businessName: true },
      orderBy: { businessName: "asc" },
    }),
  ]);

  const query = (nextPage: number) =>
    new URLSearchParams({
      ...(params.search ? { search: params.search } : {}),
      ...(params.supplierId ? { supplierId: params.supplierId } : {}),
      ...(params.from ? { from: params.from } : {}),
      ...(params.to ? { to: params.to } : {}),
      page: String(nextPage),
    }).toString();

  const hasActiveFilters = Boolean(
    params.search || params.supplierId || params.from || params.to
  );

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              Purchasing & Stock In
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Purchase History
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Manage supplier invoices, purchase ledgers, and payment statuses.
            </p>
          </div>
          <Button asChild size="default" className="gap-2 font-semibold shadow-sm">
            <Link href="/purchases/new">
              <Plus className="size-4" />
              New Purchase Invoice
            </Link>
          </Button>
        </div>

        {/* Filter Card */}
        <Card className="shadow-sm border-border">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Filter className="size-4 text-primary" />
                Filter Invoices
              </CardTitle>
              {hasActiveFilters && (
                <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                  <Link href="/purchases">
                    <RotateCcw className="size-3.5" />
                    Reset Filters
                  </Link>
                </Button>
              )}
            </div>
            <CardDescription className="text-xs">
              Search by Invoice number, Supplier name, Mobile number or GSTIN.
            </CardDescription>

            <form className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  name="search"
                  defaultValue={params.search}
                  placeholder="Invoice, Supplier, Mobile..."
                  className="pl-9 bg-background text-xs"
                />
              </div>

              <SupplierHistorySearch suppliers={suppliers} selectedId={params.supplierId} />

              <Input
                name="from"
                type="date"
                defaultValue={params.from}
                aria-label="From date"
                className="bg-background text-xs"
              />

              <div className="flex gap-2">
                <Input
                  name="to"
                  type="date"
                  defaultValue={params.to}
                  aria-label="To date"
                  className="bg-background text-xs"
                />
                <Button type="submit" size="default" className="gap-1.5 shrink-0">
                  <Filter className="size-3.5" />
                  Filter
                </Button>
              </div>
            </form>
          </CardHeader>

          {/* Table Content */}
          <CardContent className="pt-0">
            {result.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
                  <Receipt className="size-6" />
                </div>
                <p className="text-sm font-semibold text-foreground">No purchases found</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  {hasActiveFilters
                    ? "Try adjusting your search query or date range filters."
                    : "Create your first purchase invoice to start tracking inventory inflows."}
                </p>
                {hasActiveFilters && (
                  <Button asChild variant="outline" size="sm" className="mt-4">
                    <Link href="/purchases">Clear Filters</Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium">
                    <tr>
                      <th className="py-3 px-4">Invoice No.</th>
                      <th className="py-3 px-4">Supplier</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Total Amount</th>
                      <th className="py-3 px-4 text-right">Paid Amount</th>
                      <th className="py-3 px-4 text-right">Balance Due</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {result.items.map((purchase) => {
                      const balance = purchase.balanceAmount;
                      const isPaid = balance <= 0;
                      const isPartial = balance > 0 && purchase.paidAmount > 0;

                      return (
                        <tr key={purchase.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 font-mono font-semibold text-primary">
                            <Link href={`/purchases/${purchase.id}`} className="hover:underline flex items-center gap-1">
                              {purchase.invoiceNumber}
                            </Link>
                          </td>

                          <td className="py-3 px-4 font-medium text-foreground">
                            <div className="flex items-center gap-1.5">
                              <Building2 className="size-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate max-w-[180px]">
                                {purchase.supplier?.businessName ?? "Supplier unavailable"}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="size-3 text-muted-foreground shrink-0" />
                              {new Date(purchase.invoiceDate).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right font-semibold text-foreground">
                            ₹{purchase.grandTotal.toFixed(2)}
                          </td>

                          <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                            ₹{purchase.paidAmount.toFixed(2)}
                          </td>

                          <td className="py-3 px-4 text-right font-medium">
                            {balance > 0 ? (
                              <span className="text-red-600 dark:text-red-400 font-semibold">
                                ₹{balance.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">₹0.00</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center">
                            {isPaid ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] py-0">
                                PAID
                              </Badge>
                            ) : isPartial ? (
                              <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] py-0">
                                PARTIAL
                              </Badge>
                            ) : (
                              <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px] py-0">
                                UNPAID
                              </Badge>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <Button asChild variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <Link href={`/purchases/${purchase.id}`}>
                                <ArrowUpRight className="size-4" />
                                <span className="sr-only font-medium">View Invoice</span>
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {result.pageCount > 0 && (
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground pt-2">
                <span>
                  Page <strong>{result.page}</strong> of <strong>{result.pageCount}</strong> ·{" "}
                  <strong>{result.total}</strong> invoice(s)
                </span>
                <div className="flex gap-2">
                  <Button
                    asChild={result.page > 1}
                    disabled={result.page <= 1}
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1"
                  >
                    {result.page > 1 ? (
                      <Link href={`/purchases?${query(result.page - 1)}`}>
                        <ChevronLeft className="size-3.5" /> Previous
                      </Link>
                    ) : (
                      <span>
                        <ChevronLeft className="size-3.5 inline" /> Previous
                      </span>
                    )}
                  </Button>

                  <Button
                    asChild={result.page < result.pageCount}
                    disabled={result.page >= result.pageCount}
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1"
                  >
                    {result.page < result.pageCount ? (
                      <Link href={`/purchases?${query(result.page + 1)}`}>
                        Next <ChevronRight className="size-3.5" />
                      </Link>
                    ) : (
                      <span>
                        Next <ChevronRight className="size-3.5 inline" />
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}