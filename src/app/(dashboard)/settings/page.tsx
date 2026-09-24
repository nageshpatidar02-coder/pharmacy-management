import { AppShell } from "@/components/layout/app-shell";
import { SettingsForm } from "@/components/settings/settings-form";
import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { prisma } from "@/server/db/prisma";
import { Building2, SlidersHorizontal, ShieldCheck } from "lucide-react";

export default async function SettingsPage() {
  const user = await requirePermission(PERMISSIONS.settingsManage);

  const settings = await prisma.pharmacySettings.findUnique({
    where: { pharmacyId: user.pharmacyId },
  });

  const defaultValues = {
    pharmacyName: settings?.pharmacyName ?? "",
    address: settings?.address ?? "",
    mobile: settings?.mobile ?? "",
    email: settings?.email ?? "",
    gstin: settings?.gstin ?? "",
    drugLicenseNo: settings?.drugLicenseNo ?? "",
    logoUrl: settings?.logoUrl ?? "",
    invoicePrefix: settings?.invoicePrefix ?? "INV",
    currency: settings?.currency ?? "INR",
    lowStockThreshold: settings?.lowStockThreshold ?? 10,
    expiryWarningDays: settings?.expiryWarningDays ?? 30,
  };

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-5xl space-y-8 p-4 md:p-6">
        
        {/* Page Header */}
        <div className="border-b pb-5">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">
            System Configuration
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Pharmacy Settings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your store details, bill header info, tax GSTIN, and inventory alerts.
          </p>
        </div>

        {/* Quick Highlights / Features Banner */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Building2 className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Store Info</p>
              <p className="text-sm font-semibold">Bill & Receipt Header</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <SlidersHorizontal className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Inventory Alerts</p>
              <p className="text-sm font-semibold">Low Stock & Expiry Days</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Tax & Invoicing</p>
              <p className="text-sm font-semibold">GSTIN & Prefix Options</p>
            </div>
          </div>
        </div>

        {/* Main Settings Form Container */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <SettingsForm values={defaultValues} />
        </div>

      </div>
    </AppShell>
  );
}