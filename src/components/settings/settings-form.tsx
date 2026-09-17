"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { updateSettingsAction, type SettingsState } from "@/app/(dashboard)/settings/actions";

export function SettingsForm({ values }: { values: { pharmacyName: string; address: string; mobile: string; email: string; gstin: string; logoUrl: string; invoicePrefix: string; currency: string; lowStockThreshold: number; expiryWarningDays: number } }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(updateSettingsAction, {});
  return <form action={action} className="space-y-6"><Card><CardHeader><CardTitle>Store profile</CardTitle></CardHeader><CardContent className="grid gap-5 md:grid-cols-2"><Field id="pharmacyName" label="Pharmacy name" defaultValue={values.pharmacyName} required /><Field id="address" label="Address" defaultValue={values.address} className="md:col-span-2" /><Field id="mobile" label="Mobile" defaultValue={values.mobile} /><Field id="email" label="Email" type="email" defaultValue={values.email} /><Field id="gstin" label="GSTIN" defaultValue={values.gstin} /><Field id="logoUrl" label="Logo URL" type="url" defaultValue={values.logoUrl} /></CardContent></Card><Card><CardHeader><CardTitle>Invoicing and inventory</CardTitle></CardHeader><CardContent className="grid gap-5 md:grid-cols-2"><Field id="invoicePrefix" label="Invoice prefix" defaultValue={values.invoicePrefix} required /><Field id="currency" label="Currency" defaultValue={values.currency} required /><Field id="lowStockThreshold" label="Low stock threshold" type="number" defaultValue={values.lowStockThreshold} required /><Field id="expiryWarningDays" label="Expiry warning days" type="number" defaultValue={values.expiryWarningDays} required /></CardContent></Card>{state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}{state.success && <p role="status" className="text-sm text-primary">{state.success}</p>}<Button disabled={pending}><Save className="size-4" />{pending ? "Saving..." : "Save settings"}</Button></form>;
}

function Field({ id, label, type = "text", className, ...props }: { id: string; label: string; type?: string; className?: string; defaultValue?: string | number; required?: boolean }) { return <div className={className}><label htmlFor={id} className="mb-2 block text-sm font-medium">{label}</label><Input id={id} name={id} type={type} className="bg-background" {...props} /></div>; }
