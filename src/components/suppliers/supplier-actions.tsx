"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function SupplierActions({ id, name, canDelete = false }: { id: string; name: string; canDelete?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (!window.confirm(`Delete ${name} permanently? Its purchase bills and supplier payments will also be removed.`)) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error ?? "Unable to delete wholesaler.");
        return;
      }
      router.refresh();
    } catch {
      setError("Wholesaler service is unavailable. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return <div className="flex flex-wrap items-center gap-3"><Link href={`/suppliers/${id}/edit`} className="font-semibold text-primary hover:underline">Edit</Link>{canDelete && <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={remove}>{pending ? "Deleting..." : "Delete"}</Button>}{error && <span role="alert" className="text-xs text-red-600">{error}</span>}</div>;
}
