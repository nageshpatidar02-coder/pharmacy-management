import { AppShell } from "@/components/layout/app-shell";
import { SettingsForm } from "@/components/settings/settings-form";
import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { prisma } from "@/server/db/prisma";

export default async function SettingsPage() {
  const user = await requirePermission(PERMISSIONS.settingsManage);
  const settings = await prisma.pharmacySettings.findUnique({ where: { key: "singleton" } });
  return <AppShell user={user}><div className="mx-auto max-w-4xl space-y-8"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Settings</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Pharmacy settings</h1><p className="mt-2 text-muted-foreground">Configure the details used across your store.</p></div><SettingsForm values={{ pharmacyName: settings?.pharmacyName ?? "", address: settings?.address ?? "", mobile: settings?.mobile ?? "", email: settings?.email ?? "", gstin: settings?.gstin ?? "", logoUrl: settings?.logoUrl ?? "", invoicePrefix: settings?.invoicePrefix ?? "INV", currency: settings?.currency ?? "INR", lowStockThreshold: settings?.lowStockThreshold ?? 10, expiryWarningDays: settings?.expiryWarningDays ?? 30 }} /></div></AppShell>;
}
