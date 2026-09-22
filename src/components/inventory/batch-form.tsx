"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { batchSchema } from "@/lib/validations/medicine";

type MedicineOption = { id: string; name: string; sku: string };
export function BatchForm({ medicines }: { medicines: MedicineOption[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setSaving(true); setError(""); const data = Object.fromEntries(new FormData(event.currentTarget)); const parsed = batchSchema.safeParse(data); if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check the batch details."); setSaving(false); return; } try { const response = await fetch("/api/batches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) }); const result = await response.json().catch(() => ({})); if (!response.ok) { setError(result.error ?? "Unable to add batch."); return; } event.currentTarget.reset(); router.refresh(); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to connect to the server."); } finally { setSaving(false); } }
  return <form onSubmit={submit} className="grid gap-3 rounded-xl border bg-muted/30 p-4 md:grid-cols-4"><select name="medicineId" required className="h-10 rounded-md border bg-surface px-3 text-sm"><option value="">Select medicine</option>{medicines.map((medicine) => <option key={medicine.id} value={medicine.id}>{medicine.name} ({medicine.sku})</option>)}</select><Input name="batchNumber" placeholder="Batch number" required /><Input name="manufacturingDate" type="date" aria-label="Manufacturing date" required /><Input name="expiryDate" type="date" aria-label="Expiry date" required /><Input name="purchasePrice" type="number" step="0.01" min="0" placeholder="Purchase price" required /><Input name="mrp" type="number" step="0.01" min="0" placeholder="MRP" required /><Input name="sellingPrice" type="number" step="0.01" min="0" placeholder="Selling price" required /><Input name="quantity" type="number" min="0" placeholder="Quantity" required /><Input name="freeQuantity" type="number" min="0" defaultValue="0" placeholder="Free quantity" required /><Button disabled={saving}>{saving ? "Saving..." : "Add batch"}</Button>{error && <p role="alert" className="text-sm text-red-600 md:col-span-4">{error}</p>}</form>;
}