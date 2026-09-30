import Link from "next/link";
import { Plus } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { MedicineList } from "@/components/medicines/medicine-list";

export default async function MedicinesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.medicineView);
  const canDelete = user.role.name === "SUPER_ADMIN" || user.role.permissions.some(({ permission }) => permission.key === PERMISSIONS.medicineDelete);

  // Safe Resolution for Next.js 14 & Next.js 15 searchParams
  const resolvedParams = await Promise.resolve(searchParams);
  const search = resolvedParams?.search || "";

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-360 space-y-6 p-4 md:p-6">
        
        {/* Header Section */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary">
              Inventory & Catalogue
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Medicine Master</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              View and manage medicine prices, categories, and batch stocks.
            </p>
          </div>
          <Link
            href="/medicines/new"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow transition hover:opacity-90"
          >
            <Plus className="size-4" /> Add New Medicine
          </Link>
        </div>

        <MedicineList initialSearch={search} canDelete={canDelete} />
      </div>
    </AppShell>
  );
}