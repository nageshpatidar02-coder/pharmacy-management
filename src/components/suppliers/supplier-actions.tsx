"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function SupplierActions({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  async function remove() {
    if (!window.confirm(`Delete ${name} permanently? Its purchase bills and supplier payments will also be removed.`)) return;
    const response = await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { window.alert(result.error ?? "Unable to delete supplier."); return; }
    router.refresh();
  }
  return <div className="flex items-center gap-3"><Link href={`/suppliers/${id}/edit`} className="font-semibold text-primary hover:underline">Edit</Link><Button type="button" variant="ghost" size="sm" onClick={remove}>Delete</Button></div>;
}
