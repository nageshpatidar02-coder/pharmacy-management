"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supplierSchema } from "@/lib/validations/supplier";

export function SupplierForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setPending(true); setError(""); const parsed = supplierSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget))); if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check the supplier details."); setPending(false); return; } try { const response = await fetch("/api/suppliers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) }); const result = await response.json().catch(() => ({})); if (!response.ok) { setError(result.error ?? "Unable to create supplier."); return; } router.push("/suppliers"); router.refresh(); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to connect to the server."); } finally { setPending(false); } }
  return <form onSubmit={submit} className="grid gap-5 md:grid-cols-2"><Field id="businessName" label="Business name" required /><Field id="contactPerson" label="Contact person" /><Field id="mobile" label="Mobile" inputMode="tel" /><Field id="email" label="Email" type="email" /><Field id="gstin" label="GSTIN" /><Field id="paymentTerms" label="Payment terms" /><Field id="openingBalance" label="Opening balance" type="number" step="0.01" min="0" defaultValue="0" /><div className="md:col-span-2"><label className="mb-2 block text-sm font-medium" htmlFor="address">Address</label><Input id="address" name="address" /></div>{error && <p role="alert" className="text-sm text-red-600 md:col-span-2">{error}</p>}<Button disabled={pending} className="md:col-span-2">{pending ? "Saving..." : "Save supplier"}</Button></form>;
}
function Field({ id, label, type = "text", step, min, inputMode, defaultValue, required }: { id: string; label: string; type?: string; step?: string; min?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]; defaultValue?: string; required?: boolean }) { return <div><label className="mb-2 block text-sm font-medium" htmlFor={id}>{label}</label><Input id={id} name={id} type={type} step={step} min={min} inputMode={inputMode} defaultValue={defaultValue} required={required} /></div>; }
