"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { stockAdjustmentSchema } from "@/lib/validations/medicine";

type StockBatch = { id: string; batchNumber: string; quantity: number; freeQuantity: number; medicine: { name: string } };

export function StockAdjustmentForm({ batches }: { batches: StockBatch[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const parsed = stockAdjustmentSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget))); if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check the stock adjustment."); setSaving(false); return; }
    try { const response = await fetch("/api/inventory/adjust", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) }); const result = await response.json().catch(() => ({})); if (!response.ok) { setError(result.error ?? "Unable to adjust stock."); return; } event.currentTarget.reset(); router.refresh(); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to connect to the server."); } finally { setSaving(false); }
  }
  return <form onSubmit={submit} className="grid gap-3 rounded-xl border bg-muted/30 p-4 md:grid-cols-4"><select name="batchId" required className="h-10 rounded-md border bg-surface px-3 text-sm"><option value="">Select batch</option>{batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.medicine.name} - {batch.batchNumber} ({batch.quantity + batch.freeQuantity})</option>)}</select><Input name="quantityChange" type="number" placeholder="+/- quantity" required /><Input name="reason" placeholder="Reason" required /><Input name="reference" placeholder="Reference (optional)" /><Button disabled={saving}>{saving ? "Saving..." : "Adjust stock"}</Button>{error && <p role="alert" className="text-sm text-red-600 md:col-span-4">{error}</p>}</form>;
}
