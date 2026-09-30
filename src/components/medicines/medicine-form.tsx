"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { medicineSchema } from "@/lib/validations/medicine";
import { Pill, Tag, DollarSign, AlertCircle, Percent } from "lucide-react";

type Option = { id: string; name: string };

type MedicineValues = {
  id?: string;
  name?: string;
  salt?: string | null;
  itemType?: "TABLET" | "CAPSULE" | "SYRUP" | "INJECTION" | "DROPS" | "OINTMENT" | "EQUIPMENT" | "OTHER";
  packSize?: string | null;
  unit?: string;
  gstPercentage?: number;
  prescriptionRequired?: boolean;
  mrp?: number;
  purchasePrice?: number;
  sellingPrice?: number;
  minimumStock?: number;
  active?: boolean;
};

const COMMON_GST_RATES = [0, 5, 12, 18, 28];
const COMMON_UNITS: Option[] = [
  { id: "tablet", name: "Tablet" },
  { id: "capsule", name: "Capsule" },
  { id: "strip", name: "Strip" },
  { id: "box", name: "Box" },
  { id: "bottle", name: "Bottle" },
  { id: "vial", name: "Vial" },
  { id: "ampoule", name: "Ampoule" },
  { id: "pack", name: "Pack" },
  { id: "tube", name: "Tube" },
  { id: "jar", name: "Jar" },
  { id: "piece", name: "Piece" },
  { id: "unit", name: "Unit" },
  { id: "sachet", name: "Sachet" },
];

function normalizeGst(value: unknown, fallback = 12): number {
  if (value === "" || value === null || value === undefined) return fallback;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Math.min(100, Math.max(0, numberValue)) : 12;
}

export function MedicineForm({
  initial = {},
}: {
  initial?: MedicineValues;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState(String(initial.name ?? ""));
  const [itemType, setItemType] = useState<NonNullable<MedicineValues["itemType"]>>(
    String(initial.itemType ?? "TABLET").toUpperCase() as NonNullable<MedicineValues["itemType"]>
  );
  const [gstPercentage, setGstPercentage] = useState<number | "">(
    normalizeGst(initial.gstPercentage)
  );
  const [unitSelection, setUnitSelection] = useState(() => {
    const initialUnit = String(initial.unit ?? "strip").trim();
    return COMMON_UNITS.find((unit) => unit.id.toLowerCase() === initialUnit.toLowerCase())?.id ?? "OTHER";
  });
  const [customUnit, setCustomUnit] = useState(() => {
    const initialUnit = String(initial.unit ?? "strip").trim();
    return COMMON_UNITS.some((unit) => unit.id.toLowerCase() === initialUnit.toLowerCase()) ? "" : initialUnit;
  });

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setFieldErrors({});

    const form = new FormData(event.currentTarget);
    const readText = (field: string) => String(form.get(field) ?? "");
    const readNumber = (field: string) => {
      const value = Number(form.get(field));
      return Number.isFinite(value) ? value : 0;
    };
    const medicineName = name.trim();

    if (!medicineName) {
      setFieldErrors({ name: "Medicine name is required." });
      setError("Please enter a medicine name.");
      setSaving(false);
      return;
    }

    const selectedGst = normalizeGst(gstPercentage, 0);

    const payload = {
      name: medicineName,
      composition: readText("salt"),
      itemType,
      packSize: readText("packSize"),
      unit: unitSelection === "OTHER" ? readText("customUnit").trim() : unitSelection,
      gstPercentage: selectedGst,
      prescriptionRequired: form.has("prescriptionRequired"),
      mrp: readNumber("mrp"),
      purchasePrice: readNumber("purchasePrice"),
      sellingPrice: readNumber("sellingPrice"),
      minimumStock: readNumber("minimumStock"),
      active: form.has("active"),
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
      <div className="flex flex-col gap-1 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            {initial.id ? "Edit Medicine Details" : "Add New Medicine"}
          </h2>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2 border-b pb-2 text-foreground">
          <Tag className="h-4 w-4 text-primary" /> Medicine Information
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Field
            id="name"
            label="Medicine Name *"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (fieldErrors.name) {
                setFieldErrors((prev) => {
                  const copy = { ...prev };
                  delete copy.name;
                  return copy;
                });
              }
            }}
            required
            error={fieldErrors.name}
            placeholder="e.g. Paracetamol"
          />
          <Field
            id="salt"
            label="Salt"
            defaultValue={String(initial.salt ?? "")}
            placeholder="e.g. Paracetamol"
          />
          <SelectField
            id="itemType"
            label="Item Type"
            value={itemType}
            options={["TABLET", "CAPSULE", "SYRUP", "INJECTION", "DROPS", "OINTMENT", "EQUIPMENT", "OTHER"].map((val) => ({ id: val, name: val }))}
            onChange={(val) => setItemType(val as NonNullable<MedicineValues["itemType"]>)}
            error={fieldErrors.itemType}
          />
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2 border-b pb-2 text-foreground">
          <Pill className="h-4 w-4 text-primary" /> Pack Details
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Field
            id="packSize"
            label="Pack Size"
            defaultValue={String(initial.packSize ?? "")}
            placeholder="e.g. 10 Tablets / Strip"
          />
          <SelectField
            id="unit"
            label="Unit *"
            value={unitSelection}
            options={[...COMMON_UNITS, { id: "OTHER", name: "Other" }]}
            onChange={(value) => {
              setUnitSelection(value);
              setFieldErrors((previous) => {
                const next = { ...previous };
                delete next.unit;
                return next;
              });
            }}
            error={fieldErrors.unit}
          />
          {unitSelection === "OTHER" && (
            <Field
              id="customUnit"
              label="Custom Unit *"
              value={customUnit}
              onChange={(event) => {
                setCustomUnit(event.target.value);
                setFieldErrors((previous) => {
                  const next = { ...previous };
                  delete next.unit;
                  return next;
                });
              }}
              required
              placeholder="Enter unit, e.g. jar"
            />
          )}
        </div>
      </div>

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

          {/* Fixed GST Percentage Section */}
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
                    onClick={() => {
                      setGstPercentage(rate);
                      if (fieldErrors.gstPercentage) {
                        setFieldErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.gstPercentage;
                          return copy;
                        });
                      }
                    }}
                    className={`h-7 px-2.5 rounded-md text-xs font-semibold border transition-colors ${
                      Number(gstPercentage) === rate
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
                onChange={(e) => {
                  const val = e.target.value === "" ? "" : Number(e.target.value);
                  setGstPercentage(val);
                }}
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
        <Field
          id="minimumStock"
          label="Minimum Stock Alert Level *"
          type="number"
          min="0"
          className={noSpinnerClass}
          defaultValue={Number(initial.minimumStock ?? 10)}
          required
          error={fieldErrors.minimumStock}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Batch number, expiry date and stock quantity are added from the purchase bill.
        </p>
      </div>

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
        <Button disabled={saving} className="font-semibold min-w-35">
          {saving ? "Saving..." : initial.id ? "Update Medicine" : "Save Medicine & Stock"}
        </Button>
      </div>
    </form>
  );
}

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
  // Check karein ki prop controlled hai ya nahi
  const isControlled = value !== undefined;

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
        {...(isControlled ? { value } : { defaultValue: defaultValue ?? "" })}
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