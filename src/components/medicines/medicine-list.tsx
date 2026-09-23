"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Package, Search } from "lucide-react";

import { LiveFilterForm } from "@/components/filters/live-filter-form";
import { MedicineActions } from "@/components/medicines/medicine-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatStock } from "@/lib/stock";

type Medicine = { id: string; name: string; genericName: string | null; composition: string | null; unit: string; itemType: string; packSize: string | null; sku: string | null; sellingPrice: number; active: boolean; batches: { quantity: number; freeQuantity: number }[] };
type Pagination = { total: number; page: number; limit: number; totalPages: number };

function stockLabel(medicine: Medicine) {
  const totalUnits = medicine.batches.reduce((sum, batch) => sum + batch.quantity + batch.freeQuantity, 0);
  if (totalUnits <= 0) return <span className="font-semibold text-red-500">Out of Stock</span>;
  const formatted = formatStock(totalUnits, medicine.itemType || medicine.unit || "OTHER", medicine.packSize);
  if (!formatted.secondary) return <span>{formatted.primary}</span>;
  return <div className="flex flex-col text-xs leading-tight"><span className="text-sm font-semibold">{formatted.primary}</span><span className="text-[11px] text-muted-foreground">{formatted.secondary}</span></div>;
}

export function MedicineList({ initialSearch }: { initialSearch: string }) {
  const [search, setSearch] = useState(initialSearch);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 25, totalPages: 1 });

  useEffect(() => {
    const controller = new AbortController();
    const query = search.trim();

    async function loadMedicines() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/medicines?page=${page}&limit=100${query ? `&search=${encodeURIComponent(query)}` : ""}`, { signal: controller.signal, cache: "no-store" });
        const result = await response.json().catch(() => null);
        if (!response.ok) throw new Error(result?.error ?? "Unable to load medicines.");
        setMedicines(Array.isArray(result?.data) ? result.data : []);
        if (result?.pagination) setPagination(result.pagination);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError(requestError instanceof Error ? requestError.message : "Medicine service is unavailable.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadMedicines();
    return () => controller.abort();
  }, [page, search]);

  function updateSearch(value: string) {
    setPage(1);
    setSearch(value);
  }

  return <Card className="border-border shadow-sm"><CardHeader className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between"><CardTitle className="flex items-center gap-2 text-lg font-semibold"><Package className="size-5 text-primary" /> All Medicines</CardTitle><LiveFilterForm fields={["search"]}><div className="relative w-full sm:max-w-xs"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input name="search" value={search} onChange={(event) => updateSearch(event.target.value)} placeholder="Search name, composition, SKU..." className="bg-background pl-9" /></div></LiveFilterForm></CardHeader><CardContent>{loading ? <div className="py-12 text-center text-sm text-muted-foreground" role="status">Loading medicines...</div> : error ? <div className="py-12 text-center text-sm text-red-600" role="alert">{error}</div> : medicines.length === 0 ? <div className="flex flex-col items-center justify-center py-12 text-center"><AlertCircle className="mb-3 size-10 text-muted-foreground/50" /><p className="text-base font-medium">No medicines found</p><p className="mt-1 text-xs text-muted-foreground">Try searching with a different term or add a new medicine.</p></div> : <div className="overflow-x-auto"><table className="w-full border-collapse text-left text-sm"><thead><tr className="border-b bg-muted/30 text-xs font-semibold uppercase text-muted-foreground"><th className="px-4 py-3">Medicine &amp; Composition</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">SKU / Code</th><th className="px-4 py-3">Current Stock</th><th className="px-4 py-3">Selling Price</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y">{medicines.map((medicine) => <tr key={medicine.id} className="transition-colors hover:bg-muted/20"><td className="px-4 py-3.5"><span className="block font-semibold">{medicine.name}</span><span className="block max-w-62.5 truncate text-xs text-muted-foreground">{medicine.genericName || medicine.composition || "No composition"}</span></td><td className="px-4 py-3.5"><span className="inline-block rounded-md bg-secondary px-2.5 py-1 text-xs font-medium uppercase text-secondary-foreground">{medicine.unit || "OTHER"}</span></td><td className="px-4 py-3.5 font-mono text-xs">{medicine.sku || "N/A"}</td><td className="px-4 py-3.5 font-medium">{stockLabel(medicine)}</td><td className="px-4 py-3.5 font-semibold">₹{Number(medicine.sellingPrice || 0).toFixed(2)}</td><td className="px-4 py-3.5"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${medicine.active ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}><span className={`size-1.5 rounded-full ${medicine.active ? "bg-emerald-600" : "bg-red-600"}`} />{medicine.active ? "Active" : "Inactive"}</span></td><td className="px-4 py-3.5 text-right"><MedicineActions id={medicine.id} name={medicine.name} active={medicine.active} /></td></tr>)}</tbody></table><div className="mt-4 flex items-center justify-between border-t pt-4 text-sm"><span className="text-muted-foreground">{pagination.total} medicines</span><div className="flex items-center gap-2"><button type="button" className="rounded-md border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}>Previous</button><span>Page {pagination.page} of {Math.max(pagination.totalPages, 1)}</span><button type="button" className="rounded-md border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50" disabled={page >= pagination.totalPages || loading} onClick={() => setPage((current) => current + 1)}>Next</button></div></div></div>}</CardContent></Card>;
}