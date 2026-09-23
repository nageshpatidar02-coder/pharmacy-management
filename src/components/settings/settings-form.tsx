"use client";

import { useActionState } from "react";
import { Save, Store, Receipt, Landmark, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { updateSettingsAction, type SettingsState } from "@/app/(dashboard)/settings/actions";

interface SettingsValues {
  pharmacyName: string;
  address: string;
  mobile: string;
  email: string;
  gstin: string;
  drugLicenseNo?: string;
  logoUrl: string;
  invoicePrefix: string;
  currency: string;
  lowStockThreshold: number;
  expiryWarningDays: number;
  bankName?: string;
  accountNo?: string;
  ifscCode?: string;
}

export function SettingsForm({ values }: { values: SettingsValues }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(
    updateSettingsAction,
    {}
  );

  return (
    <form action={action} className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Store Profile Section */}
      <Card className="shadow-sm border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-semibold">
            <Store className="size-5 text-primary" />
            Store Profile
          </CardTitle>
          <CardDescription>
            Yeh details aapke Purchase aur Sales Bills/Invoices ke header par print hongi.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <Field id="pharmacyName" label="Pharmacy Name" defaultValue={values.pharmacyName} required />
          <Field id="mobile" label="Mobile Number" defaultValue={values.mobile} required />
          <Field id="email" label="Email Address" type="email" defaultValue={values.email} />
          <Field id="gstin" label="GSTIN Number" defaultValue={values.gstin} placeholder="22AAAAA0000A1Z5" />
          <Field id="drugLicenseNo" label="Drug License No. (DL No.)" defaultValue={values.drugLicenseNo || ""} placeholder="DL-12345/2024" />
          <Field id="logoUrl" label="Logo URL" type="url" defaultValue={values.logoUrl} placeholder="https://example.com/logo.png" />
          <Field id="address" label="Full Address" defaultValue={values.address} className="md:col-span-2" required />
        </CardContent>
      </Card>

      {/* Invoicing and Inventory Section */}
      <Card className="shadow-sm border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-semibold">
            <Receipt className="size-5 text-primary" />
            Invoicing & Inventory
          </CardTitle>
          <CardDescription>
            Invoice numbering, currency symbols aur low-stock alerts.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <Field id="invoicePrefix" label="Invoice Prefix" defaultValue={values.invoicePrefix} required placeholder="INV-" />
          <Field id="currency" label="Currency Symbol" defaultValue={values.currency} required placeholder="₹" />
          <Field id="lowStockThreshold" label="Low Stock Alert Threshold" type="number" defaultValue={values.lowStockThreshold} required />
          <Field id="expiryWarningDays" label="Expiry Warning (Days)" type="number" defaultValue={values.expiryWarningDays} required />
        </CardContent>
      </Card>

      {/* Payment & Bank Details (for Invoices) */}
      <Card className="shadow-sm border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-semibold">
            <Landmark className="size-5 text-primary" />
            Bank & Payment Details (Optional)
          </CardTitle>
          <CardDescription>
            Sales invoice ke footer par payment details show karne ke liye.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-3">
          <Field id="bankName" label="Bank Name" defaultValue={values.bankName || ""} placeholder="HDFC Bank" />
          <Field id="accountNo" label="Account Number" defaultValue={values.accountNo || ""} placeholder="5010000000000" />
          <Field id="ifscCode" label="IFSC Code" defaultValue={values.ifscCode || ""} placeholder="HDFC0001234" />
        </CardContent>
      </Card>

      {/* Alert Messages */}
      {state.error && (
        <div role="alert" className="flex items-center gap-2 p-4 text-sm text-red-600 bg-red-50 dark:bg-red-950/50 rounded-lg border border-red-200 dark:border-red-900">
          <AlertCircle className="size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      {state.success && (
        <div role="status" className="flex items-center gap-2 p-4 text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg border border-emerald-200 dark:border-emerald-900">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{state.success}</span>
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-end">
        <Button disabled={pending} size="lg" className="min-w-[150px] gap-2 font-medium">
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="size-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  type = "text",
  className,
  ...props
}: {
  id: string;
  label: string;
  type?: string;
  className?: string;
  defaultValue?: string | number;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className={`space-y-2 ${className || ""}`}>
      <label htmlFor={id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {label}
        {props.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <Input
        id={id}
        name={id}
        type={type}
        className="bg-background transition-all focus-visible:ring-2"
        {...props}
      />
    </div>
  );
}