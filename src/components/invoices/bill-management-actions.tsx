"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type BillType = "sales" | "purchases";

export function BillManagementActions({ type, id }: { type: BillType; id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const isSale = type === "sales";
  const label = isSale ? "customer bill" : "purchase bill";

  async function remove() {
    const paymentNote = isSale ? "Any recorded customer payments will remain in payment history, unlinked from this bill." : "Any recorded supplier payments will remain in payment history, unlinked from this bill.";
    if (!window.confirm(`Delete this ${label}? Stock and outstanding balances will be adjusted. ${paymentNote}`)) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/${type}/${id}`, { method: "DELETE" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error ?? `Unable to delete ${label}.`);
        return;
      }
      router.push(`/${type}`);
      router.refresh();
    } catch {
      setError("Bill service is unavailable. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return <div className="flex items-center gap-2 print:hidden"><Link href={`/${type}/${id}/edit`} className="rounded-md border px-4 py-2 text-sm font-semibold hover:bg-muted">Edit</Link><Button type="button" variant="outline" className="border-red-300 text-red-700 hover:bg-red-50" disabled={pending} onClick={remove}>{pending ? "Deleting..." : "Delete"}</Button>{error ? <span role="alert" className="max-w-64 text-xs text-red-600">{error}</span> : null}</div>;
}