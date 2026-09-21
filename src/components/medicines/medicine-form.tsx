"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { medicineSchema } from "@/lib/validations/medicine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Option = { id: string; name: string };
type MedicineValues = { id?: string; name?: string; genericName?: string | null; composition?: string | null; categoryId?: string | null; manufacturerId?: string | null; dosageForm?: string | null; strength?: string | null; packSize?: string | null; unit?: string; hsnCode?: string | null; gstPercentage?: number; prescriptionRequired?: boolean; barcode?: string | null; sku?: string; mrp?: number; purchasePrice?: number; sellingPrice?: number; minimumStock?: number; active?: boolean };

export function MedicineForm({ categories, manufacturers, initial = {} }: { categories: Option[]; manufacturers: Option[]; initial?: MedicineValues }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setFieldErrors({});
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""), genericName: String(form.get("genericName") ?? ""), composition: String(form.get("composition") ?? ""),
      categoryId: String(form.get("categoryId") ?? ""), manufacturerId: String(form.get("manufacturerId") ?? ""), dosageForm: String(form.get("dosageForm") ?? ""), strength: String(form.get("strength") ?? ""), packSize: String(form.get("packSize") ?? ""), unit: String(form.get("unit") ?? ""), hsnCode: String(form.get("hsnCode") ?? ""),
      gstPercentage: form.get("gstPercentage"), prescriptionRequired: form.has("prescriptionRequired"), barcode: String(form.get("barcode") ?? ""), sku: String(form.get("sku") ?? ""), mrp: form.get("mrp"), purchasePrice: form.get("purchasePrice"), sellingPrice: form.get("sellingPrice"), minimumStock: form.get("minimumStock"), active: form.has("active") || !initial.id,
    };
    const parsed = medicineSchema.safeParse(payload);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) if (issue.path[0]) errors[String(issue.path[0])] = issue.message;
      setFieldErrors(errors);
      setError("Please correct the highlighted fields.");
      setSaving(false);
      return;
    }
    try {
      const response = await fetch(initial.id ? `/api/medicines/${initial.id}` : "/api/medicines", { method: initial.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const result = await response.json();
      if (!response.ok) { setError(result.error ?? "Unable to save medicine."); return; }
      router.push("/medicines");
      router.refresh();
    } catch { setError("Medicine service is unavailable. Please try again."); }
    finally { setSaving(false); }
  }

  return <form onSubmit={submit} className="space-y-6"><div className="grid gap-4 md:grid-cols-3"><Field id="name" label="Medicine name" defaultValue={initial.name} required error={fieldErrors.name} /><Field id="genericName" label="Generic name" defaultValue={initial.genericName ?? ""} error={fieldErrors.genericName} /><Field id="composition" label="Salt / composition" defaultValue={initial.composition ?? ""} error={fieldErrors.composition} /><SelectField id="categoryId" label="Category" value={initial.categoryId ?? ""} options={categories} error={fieldErrors.categoryId} /><SelectField id="manufacturerId" label="Manufacturer" value={initial.manufacturerId ?? ""} options={manufacturers} error={fieldErrors.manufacturerId} /><Field id="dosageForm" label="Dosage form" defaultValue={initial.dosageForm ?? ""} /><Field id="strength" label="Strength" defaultValue={initial.strength ?? ""} /><Field id="packSize" label="Pack size" defaultValue={initial.packSize ?? ""} /><Field id="unit" label="Unit" defaultValue={initial.unit ?? "piece"} required error={fieldErrors.unit} /><Field id="hsnCode" label="HSN code" defaultValue={initial.hsnCode ?? ""} /><Field id="gstPercentage" label="GST %" type="number" step="0.01" defaultValue={initial.gstPercentage ?? 0} required error={fieldErrors.gstPercentage} /><Field id="sku" label="SKU" defaultValue={initial.sku} required error={fieldErrors.sku} /><Field id="barcode" label="Barcode" defaultValue={initial.barcode ?? ""} error={fieldErrors.barcode} /><Field id="mrp" label="MRP" type="number" step="0.01" defaultValue={initial.mrp ?? 0} required error={fieldErrors.mrp} /><Field id="purchasePrice" label="Purchase price" type="number" step="0.01" defaultValue={initial.purchasePrice ?? 0} required error={fieldErrors.purchasePrice} /><Field id="sellingPrice" label="Selling price" type="number" step="0.01" defaultValue={initial.sellingPrice ?? 0} required error={fieldErrors.sellingPrice} /><Field id="minimumStock" label="Minimum stock" type="number" defaultValue={initial.minimumStock ?? 0} required error={fieldErrors.minimumStock} /></div><div className="flex flex-wrap gap-6 rounded-lg border bg-muted/30 p-4"><label className="flex items-center gap-2 text-sm font-medium"><input name="prescriptionRequired" type="checkbox" defaultChecked={initial.prescriptionRequired} /> Prescription required</label><label className="flex items-center gap-2 text-sm font-medium"><input name="active" type="checkbox" defaultChecked={initial.active ?? true} /> Active medicine</label></div>{error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}<Button disabled={saving}>{saving ? "Saving..." : initial.id ? "Update medicine" : "Save medicine"}</Button></form>;
}

function Field({ id, label, type = "text", step, defaultValue, required, error }: { id: string; label: string; type?: string; step?: string; defaultValue?: string | number; required?: boolean; error?: string }) { return <div className="space-y-2"><label htmlFor={id} className="text-sm font-medium">{label}</label><Input id={id} name={id} type={type} step={step} defaultValue={defaultValue} required={required} aria-invalid={Boolean(error)} />{error && <p className="text-xs text-red-600">{error}</p>}</div>; }

function SelectField({ id, label, value, options, error }: { id: string; label: string; value: string; options: Option[]; error?: string }) { return <div className="space-y-2"><label htmlFor={id} className="text-sm font-medium">{label}</label><select id={id} name={id} defaultValue={value} className="h-10 w-full rounded-md border bg-surface px-3 text-sm" aria-invalid={Boolean(error)}><option value="">Select {label.toLowerCase()}</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select>{error && <p className="text-xs text-red-600">{error}</p>}</div>; }
