import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StockAdjustmentForm } from "@/components/inventory/stock-adjustment-form";
import { LiveFilterForm } from "@/components/filters/live-filter-form";
import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { getInventorySummary } from "@/server/services/inventory.service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Package, Search, AlertTriangle, CalendarX, Layers } from "lucide-react";

// Helper function to get numerical batch quantity count
function getBatchPackageCount(batch: {
  quantity: number;
  freeQuantity: number;
  medicine: { itemType?: string | null; unit?: string | null; packSize: string | null };
}) {
  const totalUnits = (batch.quantity || 0) + (batch.freeQuantity || 0);
  if (totalUnits <= 0) return 0;

  const itemType = (batch.medicine.itemType || batch.medicine.unit || "OTHER").toUpperCase();

  // Non-tablet/capsule items: 1 unit = 1 bottle/vial/pack
  if (itemType !== "TABLET" && itemType !== "CAPSULE") {
    return totalUnits;
  }

  // Tablet & Capsule Strip calculation
  const match = batch.medicine.packSize?.match(/\d+/);
  const perStrip = match ? Math.max(1, Number(match[0])) : 10;

  const baseStrips = Math.floor(totalUnits / perStrip);
  const loose = totalUnits % perStrip;

  // If loose tablets present, count loose as package/strip quantity equivalent or base count
  if (loose > 0) {
    const halfStripSize = perStrip / 2;
    return loose >= halfStripSize ? baseStrips + 1 : baseStrips + loose;
  }

  return baseStrips;
}

// Stock Label Display
function stockLabel(batch: {
  quantity: number;
  freeQuantity: number;
  medicine: { itemType?: string | null; unit?: string | null; packSize: string | null };
}) {
  const totalUnits = (batch.quantity || 0) + (batch.freeQuantity || 0);
  if (totalUnits <= 0) {
    return <span className="text-red-500 font-semibold">Out of Stock</span>;
  }

  const itemType = (batch.medicine.itemType || batch.medicine.unit || "OTHER").toUpperCase();

  // Non-tablet/capsule items (Syrups, Injections, Drops)
  if (itemType !== "TABLET" && itemType !== "CAPSULE") {
    let unitName = "unit";
    if (itemType === "SYRUP" || itemType === "DROPS") unitName = "bottle";
    if (itemType === "INJECTION") unitName = "vial";
    return `${totalUnits} ${unitName}${totalUnits === 1 ? "" : "s"}`;
  }

  // Tablet & Capsule Strip calculation
  const match = batch.medicine.packSize?.match(/\d+/);
  const perStrip = match ? Math.max(1, Number(match[0])) : 10;

  const baseStrips = Math.floor(totalUnits / perStrip);
  const loose = totalUnits % perStrip;

  const halfStripSize = perStrip / 2;
  const roundedStrips = loose >= halfStripSize ? baseStrips + 1 : baseStrips;

  return (
    <div className="flex flex-col text-xs leading-tight">
      <span className="font-semibold text-foreground text-sm">
        {roundedStrips > 0 ? `~${roundedStrips} Strip${roundedStrips > 1 ? "s" : ""}` : `${loose} Loose Tab`}
        {loose > 0 && loose < halfStripSize && ` + ${loose} Loose`}
      </span>
      <span className="text-muted-foreground text-[11px] mt-0.5">
        ({totalUnits} Tabs • {perStrip}/Strip {loose >= halfStripSize ? "• Rounded Up" : ""})
      </span>
    </div>
  );
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }> | { search?: string };
}) {
  const user = await requirePermission(PERMISSIONS.inventoryView);
  const params = await Promise.resolve(searchParams);
  const search = params?.search || "";
  const summary = await getInventorySummary(search);

  // Calculate Total Quantity Across ALL Items (30 Bottles + 20 Strips + 1 Loose = 51)
  const totalStockCount = summary.batches.reduce((acc, batch) => {
    return acc + getBatchPackageCount(batch);
  }, 0);

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-[1440px] space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary">
              Inventory & Warehouse
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Stock Control</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Monitor batch stock, strip-wise estimation, loose tablets, and expiry status.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <LiveFilterForm fields={["search"]}>
          <div className="flex items-center gap-2 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                name="search"
                defaultValue={search}
                placeholder="Search medicine, generic, or batch number..."
                className="pl-9 bg-background"
              />
            </div>
            <Button type="submit">Search</Button>
          </div>
        </LiveFilterForm>

        {/* Stock Adjustment Form */}
        <StockAdjustmentForm batches={summary.batches} />

        {/* Summary Stat Cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {/* Total Stock Card showing Overall Count (51) */}
          <Card className="shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
                <Package className="size-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Total Stock</p>
                <p className="text-2xl font-bold mt-0.5">
                  {totalStockCount} Items
                </p>
                <p className="text-[11px] text-muted-foreground font-medium">
                  ({summary.totalStock} Total Loose Units)
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
                <Layers className="size-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Stock Value</p>
                <p className="text-2xl font-bold mt-0.5">₹{summary.stockValue.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
                <AlertTriangle className="size-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Low Stock Alerts</p>
                <p className="text-2xl font-bold mt-0.5">{summary.lowStock.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-rose-50 text-rose-600">
                <CalendarX className="size-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Expired / Near Expiry</p>
                <p className="text-2xl font-bold mt-0.5">
                  {summary.expired.length} / {summary.nearExpiry.length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Low Stock Medicines Warning Section */}
        {summary.lowStock.length > 0 && (
          <Card className="border-amber-300 bg-amber-50/40 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-amber-900 flex items-center gap-2">
                <AlertTriangle className="size-5 text-amber-600" /> Low Stock Medicines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {summary.lowStock.map((batch) => (
                  <div
                    key={batch.id}
                    className="rounded-lg border border-amber-200 bg-white p-3.5 shadow-xs"
                  >
                    <p className="font-semibold text-amber-950 text-base">{batch.medicine.name}</p>
                    <p className="text-xs text-amber-800 font-mono mt-0.5">Batch: {batch.batchNumber}</p>
                    <div className="mt-2 pt-2 border-t border-amber-100 flex justify-between items-end">
                      {stockLabel(batch)}
                      <span className="text-xs text-muted-foreground">Min: {batch.medicine.minimumStock}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Batch-wise Stock Table */}
        <Card className="shadow-sm border-border">
          <CardHeader className="border-b bg-muted/20 pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Package className="size-5 text-primary" /> Batch-Wise Stock Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {summary.batches.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No inventory batches recorded yet matching your filter.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/40 text-xs uppercase font-semibold text-muted-foreground">
                      <th className="py-3 px-4">Medicine Name</th>
                      <th className="py-3 px-4">Batch No</th>
                      <th className="py-3 px-4">Expiry Date</th>
                      <th className="py-3 px-4">Remaining Stock (Strips / Loose)</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {summary.batches.map((batch) => {
                      const isExpired = summary.expired.some((item) => item.id === batch.id);
                      const isNearExpiry = summary.nearExpiry.some((item) => item.id === batch.id);
                      const isLowStock = summary.lowStock.some((item) => item.id === batch.id);

                      // Status Badge Styling logic
                      let badgeClass = "bg-emerald-100 text-emerald-800";
                      let dotClass = "bg-emerald-600";
                      let statusText = "In Stock";

                      if (isExpired) {
                        badgeClass = "bg-red-100 text-red-800";
                        dotClass = "bg-red-600";
                        statusText = "Expired";
                      } else if (isLowStock) {
                        badgeClass = "bg-orange-100 text-orange-800";
                        dotClass = "bg-orange-600";
                        statusText = "Low Stock";
                      } else if (isNearExpiry) {
                        badgeClass = "bg-amber-100 text-amber-800";
                        dotClass = "bg-amber-600";
                        statusText = "Near Expiry";
                      }

                      return (
                        <tr key={batch.id} className="hover:bg-muted/10 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-foreground">
                            {batch.medicine.name}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-muted-foreground">
                            {batch.batchNumber}
                          </td>
                          <td className="py-3.5 px-4 text-xs font-medium">
                            {new Date(batch.expiryDate).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4">{stockLabel(batch)}</td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeClass}`}
                            >
                              <span className={`size-1.5 rounded-full ${dotClass}`} />
                              {statusText}
                            </span>
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