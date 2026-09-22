"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supplierSchema } from "@/lib/validations/supplier";

type SupplierValues = Partial<{ id: string; businessName: string; contactPerson: string | null; mobile: string | null; email: string | null; address: string | null; gstin: string | null; dlNumber: string | null; city: string | null; state: string | null; paymentTerms: string | null; creditLimit: number; openingBalance: number; status: "ACTIVE" | "INACTIVE" }>;

export function SupplierForm({ initial = {} }: { initial?: SupplierValues }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [gstin, setGstin] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const rawData = Object.fromEntries(formData);

    const parsed = supplierSchema.safeParse(rawData);

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the supplier details.");
      setPending(false);
      return;
    }

    try {
      const response = await fetch(initial.id ? `/api/suppliers/${initial.id}` : "/api/suppliers", {
        method: initial.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(result.error ?? "Unable to create supplier.");
        return;
      }

      router.push("/suppliers");
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to connect to the server."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
        
        {/* Header */}
        <div className="border-b p-6">
          <h2 className="text-xl font-bold tracking-tight">Add New Wholesaler / Supplier</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Fill in the distributor details, Drug License (DL), GSTIN, and credit terms.
          </p>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Section 1: Business Identification */}
          <div>
            <h3 className="text-sm font-semibold text-primary mb-3">1. Business Details</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                id="businessName" 
                label="Wholesaler / Agency Name" 
                placeholder="e.g. Mahavir Pharma Distributors" 
                required
                defaultValue={initial.businessName ?? ""}
              />
              <Field 
                id="contactPerson" 
                label="Contact Person Name" 
                placeholder="e.g. Rajesh Sharma"
                defaultValue={initial.contactPerson ?? ""}
              />
              <div>
                <label className="mb-1.5 block text-xs font-medium" htmlFor="gstin">
                  GSTIN Number
                </label>
                <Input
                  id="gstin"
                  name="gstin"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                  className="uppercase tracking-wider"
                  defaultValue={initial.gstin ?? ""}
                />
              </div>
              <Field 
                id="dlNumber" 
                label="Drug License (DL) Number" 
                placeholder="20B/21B-123456"
                defaultValue={initial.dlNumber ?? ""}
              />
            </div>
          </div>

          <hr className="border-border" />

          {/* Section 2: Contact Information */}
          <div>
            <h3 className="text-sm font-semibold text-primary mb-3">2. Contact & Address</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Field 
                id="mobile" 
                label="Mobile Number" 
                inputMode="tel" 
                placeholder="9876543210" 
                required
                defaultValue={initial.mobile ?? ""}
              />
              <Field 
                id="email" 
                label="Email Address" 
                type="email" 
                placeholder="sales@supplier.com"
                defaultValue={initial.email ?? ""}
              />
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-xs font-medium" htmlFor="address">
                  Full Address
                </label>
                <Input 
                  id="address" 
                  name="address" 
                  placeholder="Shop/Plot No, Wholesale Market Area"
                  defaultValue={initial.address ?? ""}
                />
              </div>
              <Field id="city" label="City" placeholder="Indore" defaultValue={initial.city ?? ""} />
              <Field id="state" label="State" placeholder="Madhya Pradesh" defaultValue={initial.state ?? ""} />
            </div>
          </div>

          <hr className="border-border" />

          {/* Section 3: Financial & Credit Terms */}
          <div>
            <h3 className="text-sm font-semibold text-primary mb-3">3. Credit & Payment Terms</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <Field 
                id="paymentTerms" 
                label="Payment Terms (Days)" 
                placeholder="e.g. 30 Days"
                defaultValue={initial.paymentTerms ?? ""}
              />
              <Field 
                id="creditLimit" 
                label="Credit Limit (₹)" 
                type="number" 
                min="0" 
                placeholder="50000"
                defaultValue={String(initial.creditLimit ?? 0)}
              />
              <Field 
                id="openingBalance" 
                label="Opening Balance (₹)" 
                type="number" 
                step="0.01" 
                min="0" 
                defaultValue={String(initial.openingBalance ?? 0)}
              />
            </div>
          </div>

          {/* Error Message Display */}
          {error && (
            <div className="rounded-lg bg-destructive/15 p-3 text-sm font-medium text-destructive">
              {error}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t bg-muted/40 px-6 py-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button disabled={pending} type="submit" className="min-w-[120px]">
            {pending ? "Saving Supplier..." : initial.id ? "Update Supplier" : "Save Supplier"}
          </Button>
        </div>

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
  inputMode,
  defaultValue,
  required,
  placeholder,
}: {
  id: string;
  label: string;
  type?: string;
  step?: string;
  min?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium" htmlFor={id}>
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <Input
        id={id}
        name={id}
        type={type}
        step={step}
        min={min}
        inputMode={inputMode}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
      />
    </div>
  );
}