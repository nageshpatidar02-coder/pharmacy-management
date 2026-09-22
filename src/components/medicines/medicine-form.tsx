"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { medicineSchema } from "@/lib/validations/medicine";
import {
  Pill,
  Tag,
  DollarSign,
  Barcode,
  Sparkles,
  AlertCircle,
  Percent,
} from "lucide-react";

type Option = { id: string; name: string };

type MedicineValues = {
  id?: string;
  name?: string;
  genericName?: string | null;
  composition?: string | null;
  dosageForm?: string | null;
  itemType?: "TABLET" | "CAPSULE" | "SYRUP" | "INJECTION" | "DROPS" | "OINTMENT" | "EQUIPMENT" | "OTHER";
  strength?: string | null;
  packSize?: string | null;
  unit?: string;
  hsnCode?: string | null;
  gstPercentage?: number;
  prescriptionRequired?: boolean;
  barcode?: string | null;
  sku?: string;
  mrp?: number;
  purchasePrice?: number;
  sellingPrice?: number;
  minimumStock?: number;
  active?: boolean;
};

// Common standard GST Rates in Pharma
const COMMON_GST_RATES = [0, 5, 12, 18, 28];

export function MedicineForm({
  initial = {},
}: {
  initial?: MedicineValues;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [sku, setSku] = useState(String(initial.sku ?? ""));
  const [name, setName] = useState(String(initial.name ?? ""));
  const [dosageForm, setDosageForm] = useState(String(initial.dosageForm ?? ""));
  const [itemType, setItemType] = useState<NonNullable<MedicineValues["itemType"]>>(
    String(initial.itemType ?? "TABLET").toUpperCase() as NonNullable<MedicineValues["itemType"]>
  );
  const [gstPercentage, setGstPercentage] = useState<number | "">(
    initial.gstPercentage == null ? 12 : Number(initial.gstPercentage)
  );

  useEffect(() => {
    setSku(String(initial.sku ?? ""));
    setName(String(initial.name ?? ""));
    setDosageForm(String(initial.dosageForm ?? ""));
    setItemType(String(initial.itemType ?? "TABLET").toUpperCase() as NonNullable<MedicineValues["itemType"]>);
    setGstPercentage(initial.gstPercentage == null ? 12 : Number(initial.gstPercentage));
  }, [initial]);

  // Auto Generate Unique SKU Code based on Medicine Name & Form
  function handleGenerateSku() {
    if (!name) {
      setFieldErrors((prev) => ({ ...prev, name: "Enter medicine name to generate SKU" }));
      return;
    }
    const cleanName = name.replace(/[^a-zA-Z0-9]/g, "").substring(0, 4).toUpperCase();
    const cleanForm = (dosageForm || "MED").replace(/[^a-zA-Z0-9]/g, "").substring(0, 3).toUpperCase();
    const randomCode = Math.floor(100 + Math.random() * 900);
    setSku(`${cleanName}-${cleanForm}-${randomCode}`);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setFieldErrors({});

    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      genericName: String(form.get("genericName") ?? ""),
      composition: String(form.get("composition") ?? ""),
      dosageForm: String(form.get("dosageForm") ?? ""),
      itemType,
      strength: String(form.get("strength") ?? ""),
      packSize: String(form.get("packSize") ?? ""),
      unit: String(form.get("unit") ?? ""),
      hsnCode: String(form.get("hsnCode") ?? ""),
      gstPercentage: gstPercentage === "" ? 0 : Number(gstPercentage),
      prescriptionRequired: form.has("prescriptionRequired"),
      barcode: String(form.get("barcode") ?? ""),
      sku: sku,
      mrp: form.get("mrp") ? Number(form.get("mrp")) : 0,
      purchasePrice: form.get("purchasePrice") ? Number(form.get("purchasePrice")) : 0,
      sellingPrice: form.get("sellingPrice") ? Number(form.get("sellingPrice")) : 0,
      minimumStock: form.get("minimumStock") ? Number(form.get("minimumStock")) : 0,
      active: form.has("active") || !initial.id,
    };

    const parsed = medicineSchema.safeParse(payload);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0]) errors[String(issue.path[0])] = issue.message;
      }
      setFieldErrors(errors);
      setError("Please review and fix the highlighted fields.");
      setSaving(false);
      return;
    }

    try {
      const response = await fetch(
        initial.id ? `/api/medicines/${initial.id}` : "/api/medicines",
        {
          method: initial.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        }
      );
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (result.fields && typeof result.fields === "object") {
          const nextErrors: Record<string, string> = {};
          for (const [field, messages] of Object.entries(result.fields as Record<string, unknown>)) {
            if (Array.isArray(messages) && messages[0]) nextErrors[field] = String(messages[0]);
          }
          setFieldErrors(nextErrors);
        }
        setError(result.error ?? "Unable to save medicine.");
        return;
      }

      router.push("/medicines");
      router.refresh();
    } catch {
      setError("Medicine service is unavailable. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const noSpinnerClass =
    "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  return (
    <form onSubmit={submit} className="mx-auto max-w-6xl space-y-6">
      {/* Header Info */}
      <div className="flex flex-col gap-1 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            {initial.id ? "Edit Medicine Details" : "Add New Medicine"}
          </h2>
          <p className="text-xs text-muted-foreground">
            Configure pharmaceutical stock, pricing, composition, GST rates, and initial stock quantities.
          </p>
        </div>
      </div>

      {/* 1. Basic Medicine Details */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2 border-b pb-2 text-foreground">
          <Tag className="h-4 w-4 text-primary" /> Basic Information
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Field
            id="name"
            label="Medicine Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            error={fieldErrors.name}
            placeholder="e.g. Paracetamol / Crocin"
          />
          <Field
            id="genericName"
            label="Generic Name"
            defaultValue={String(initial.genericName ?? "")}
            error={fieldErrors.genericName}
            placeholder="e.g. Acetaminophen"
          />
          <Field
            id="composition"
            label="Salt / Composition"
            defaultValue={String(initial.composition ?? "")}
            error={fieldErrors.composition}
            placeholder="e.g. Paracetamol 500mg"
          />
          <Field
            id="dosageForm"
            label="Dosage Form"
            value={dosageForm}
            onChange={(e) => setDosageForm(e.target.value)}
            placeholder="e.g. Tablet, Syrup, Injection"
          />
          <SelectField
            id="itemType"
            label="Item Type"
            value={itemType}
            options={["TABLET", "CAPSULE", "SYRUP", "INJECTION", "DROPS", "OINTMENT", "EQUIPMENT", "OTHER"].map((value) => ({ id: value, name: value }))}
            onChange={(value) => setItemType(value as NonNullable<MedicineValues["itemType"]>)}
            error={fieldErrors.itemType}
          />
        </div>
      </div>

      {/* 2. Packaging & Identification (SKU, Barcode, HSN) */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2 border-b pb-2 text-foreground">
          <Barcode className="h-4 w-4 text-primary" /> Packaging & Identifiers
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Field
            id="strength"
            label="Strength"
            defaultValue={String(initial.strength ?? "")}
            placeholder="e.g. 500 mg, 10 ml"
          />
          <Field
            id="packSize"
            label="Pack Size"
            defaultValue={String(initial.packSize ?? "")}
            placeholder="e.g. 10 Tablets / Strip"
          />
          <Field
            id="unit"
            label="Unit *"
            defaultValue={String(initial.unit ?? "strip")}
            required
            error={fieldErrors.unit}
            placeholder="e.g. strip, bottle, box"
          />
          <Field
            id="hsnCode"
            label="HSN Code"
            defaultValue={String(initial.hsnCode ?? "")}
            placeholder="e.g. 30049099"
          />

          {/* Dynamic SKU Generator Field */}
          <div className="space-y-1.5">
            <label htmlFor="sku" className="text-xs font-semibold text-foreground">
              SKU / Item Code *
            </label>
            <div className="flex gap-1.5">
              <Input
                id="sku"
                name="sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                required
                className="h-10 text-xs font-mono"
                placeholder="SKU-XXXX"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                title="Generate SKU automatically"
                onClick={handleGenerateSku}
              >
                <Sparkles className="h-4 w-4 text-primary" />
              </Button>
            </div>
            {fieldErrors.sku && <p className="text-xs text-red-600">{fieldErrors.sku}</p>}
          </div>

          <Field
            id="barcode"
            label="Barcode / EAN"
            defaultValue={String(initial.barcode ?? "")}
            error={fieldErrors.barcode}
            placeholder="Scan or enter barcode"
          />
        </div>
      </div>

      {/* 3. Pricing & Taxes */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2 border-b pb-2 text-foreground">
          <DollarSign className="h-4 w-4 text-primary" /> Pricing & Taxation
        </h3>
        <div className="grid gap-4 md:grid-cols-4">
          <Field
            id="purchasePrice"
            label="Purchase Price (₹) *"
            type="number"
            step="0.01"
            className={noSpinnerClass}
            defaultValue={Number(initial.purchasePrice ?? 0)}
            required
            error={fieldErrors.purchasePrice}
          />
          <Field
            id="sellingPrice"
            label="Selling Price (₹) *"
            type="number"
            step="0.01"
            className={noSpinnerClass}
            defaultValue={Number(initial.sellingPrice ?? 0)}
            required
            error={fieldErrors.sellingPrice}
          />
          <Field
            id="mrp"
            label="MRP (₹) *"
            type="number"
            step="0.01"
            className={noSpinnerClass}
            defaultValue={Number(initial.mrp ?? 0)}
            required
            error={fieldErrors.mrp}
          />

          {/* Quick GST Selector + Custom GST Input */}
          <div className="space-y-1.5 md:col-span-4 lg:col-span-1">
            <label htmlFor="gstPercentage" className="text-xs font-semibold text-foreground flex items-center gap-1">
              <Percent className="h-3.5 w-3.5 text-primary" /> GST Percentage (%) *
            </label>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {COMMON_GST_RATES.map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setGstPercentage(rate)}
                    className={`h-7 px-2.5 rounded-md text-xs font-semibold border transition-colors ${
                      gstPercentage === rate
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/40 hover:bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>

              <Input
                id="gstPercentage"
                name="gstPercentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={gstPercentage}
                onChange={(e) => setGstPercentage(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Custom GST %"
                required
                className={`h-9 text-xs font-mono ${noSpinnerClass}`}
              />
            </div>
            {fieldErrors.gstPercentage && (
              <p className="text-xs text-red-600">{fieldErrors.gstPercentage}</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <Field id="minimumStock" label="Minimum Stock Alert Level *" type="number" min="0" className={noSpinnerClass} defaultValue={Number(initial.minimumStock ?? 10)} required error={fieldErrors.minimumStock} />
        <p className="mt-2 text-xs text-muted-foreground">Batch number, expiry date and stock quantity are added from the purchase bill.</p>
      </div>

      {/* Checkboxes / Regulatory Settings */}
      <div className="flex flex-wrap gap-6 rounded-xl border bg-muted/20 p-4">
        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
          <input
            name="prescriptionRequired"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            defaultChecked={initial.prescriptionRequired}
          />
          <span>Prescription Required (Schedule H / H1)</span>
        </label>

        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
          <input
            name="active"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            defaultChecked={initial.active ?? true}
          />
          <span>Active Medicine Status</span>
        </label>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs font-medium text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/medicines")}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button disabled={saving} className="font-semibold min-w-[140px]">
          {saving ? "Saving..." : initial.id ? "Update Medicine" : "Save Medicine & Stock"}
        </Button>
      </div>
    </form>
  );
}

// Reusable Input Field Component
function Field({
  id,
  label,
  type = "text",
  step,
  min,
  defaultValue,
  value,
  onChange,
  required,
  error,
  placeholder,
  className,
}: {
  id: string;
  label: string;
  type?: string;
  step?: string;
  min?: string;
  defaultValue?: string | number;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  error?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-foreground">
        {label}
      </label>
      <Input
        id={id}
        name={id}
        type={type}
        step={step}
        min={min}
        defaultValue={defaultValue}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        className={`h-10 text-xs ${className ?? ""}`}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

// Reusable Select Field Component
function SelectField({
  id,
  label,
  value,
  options,
  onChange,
  error,
}: {
  id: string;
  label: string;
  value: string;
  options: Option[];
  onChange?: (value: string) => void;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-foreground">
        {label}
      </label>
      <select
        id={id}
        name={id}
        value={onChange ? value : undefined}
        defaultValue={onChange ? undefined : value}
        onChange={(event) => onChange?.(event.target.value)}
        className="h-10 w-full rounded-md border bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
        aria-invalid={Boolean(error)}
      >
        <option value="">Select {label}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}