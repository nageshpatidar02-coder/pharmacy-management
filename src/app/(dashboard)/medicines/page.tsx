import Link from "next/link";
import { Plus, Search, AlertCircle, Package } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { listMedicines } from "@/server/services/medicine.service";
import { MedicineActions } from "@/components/medicines/medicine-actions";
import { LiveFilterForm } from "@/components/filters/live-filter-form";
import { formatStock } from "@/lib/stock";

// Stock Unit Formatter with Strips & Loose Tablet Logic
function stockLabel(medicine: {
  unit?: string | null;
  itemType?: string | null;
  packSize: string | null;
  batches?: { quantity: number; freeQuantity: number }[];
}) {
  const batches = medicine.batches || [];
  const totalUnits = batches.reduce(
    (sum, batch) => sum + (batch.quantity || 0) + (batch.freeQuantity || 0),
    0
  );

  if (totalUnits <= 0) {
    return <span className="text-red-500 font-semibold">Out of Stock</span>;
  }

  const formatted = formatStock(totalUnits, medicine.itemType || medicine.unit || "OTHER", medicine.packSize);
  if (formatted.outOfStock) return <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">Out of Stock</span>;
  if (!formatted.secondary) return <span>{formatted.primary}</span>;

  return (
    <div className="flex flex-col text-xs leading-tight">
      <span className="font-semibold text-foreground text-sm">{formatted.primary}</span>
      <span className="text-muted-foreground text-[11px]">
        {formatted.secondary}
      </span>
    </div>
  );
}

export default async function MedicinesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }> | { search?: string };
}) {
  const user = await requirePermission(PERMISSIONS.medicineView);

  // Safe Resolution for Next.js 14 & Next.js 15 searchParams
  const resolvedParams = await Promise.resolve(searchParams);
  const search = resolvedParams?.search || "";

  const medicines = await listMedicines(search);

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-[1440px] space-y-6 p-4 md:p-6">
        
        {/* Header Section */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary">
              Inventory & Catalogue
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Medicine Master</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              View and manage medicine prices, categories, and batch stocks.
            </p>
          </div>
          <Link
            href="/medicines/new"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow transition hover:opacity-90"
          >
            <Plus className="size-4" /> Add New Medicine
          </Link>
        </div>

        {/* Medicine Catalogue Card */}
        <Card className="shadow-sm border-border">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Package className="size-5 text-primary" /> All Medicines
            </CardTitle>
            <LiveFilterForm fields={["search"]}>
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  name="search"
                  defaultValue={search}
                  placeholder="Search name, composition, SKU..."
                  className="pl-9 bg-background"
                />
              </div>
            </LiveFilterForm>
          </CardHeader>

          <CardContent>
            {medicines.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="size-10 text-muted-foreground/50 mb-3" />
                <p className="text-base font-medium">No medicines found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try searching with a different term or add a new medicine.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/30 text-xs uppercase font-semibold text-muted-foreground">
                      <th className="py-3 px-4">Medicine & Composition</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">SKU / Code</th>
                      <th className="py-3 px-4">Current Stock</th>
                      <th className="py-3 px-4">Selling Price (₹)</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {medicines.map((medicine) => (
                      <tr
                        key={medicine.id}
                        className="hover:bg-muted/20 transition-colors"
                      >
                        {/* Name & Composition */}
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-foreground block">
                            {medicine.name}
                          </span>
                          <span className="text-xs text-muted-foreground block truncate max-w-[250px]">
                            {medicine.genericName ||
                              medicine.composition ||
                              "No composition"}
                          </span>
                        </td>

                        {/* Category / Type Badge */}
                        <td className="py-3.5 px-4">
                          <span className="inline-block rounded-md bg-secondary px-2.5 py-1 text-xs font-medium uppercase text-secondary-foreground">
                            {medicine.unit || "OTHER"}
                          </span>
                        </td>

                        {/* SKU */}
                        <td className="py-3.5 px-4 text-xs font-mono">
                          {medicine.sku || "N/A"}
                        </td>

                        {/* Stock */}
                        <td className="py-3.5 px-4 font-medium">
                          {stockLabel(medicine)}
                        </td>

                        {/* Price */}
                        <td className="py-3.5 px-4 font-semibold">
                          ₹{Number(medicine.sellingPrice || 0).toFixed(2)}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                              medicine.active
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            <span
                              className={`size-1.5 rounded-full ${
                                medicine.active
                                  ? "bg-emerald-600"
                                  : "bg-red-600"
                              }`}
                            />
                            {medicine.active ? "Active" : "Inactive"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <MedicineActions
                            id={medicine.id}
                            name={medicine.name}
                            active={medicine.active}
                          />
                        </td>
                      </tr>
                    ))}
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