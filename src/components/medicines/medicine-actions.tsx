"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function MedicineActions({ id, name, active }: { id: string; name: string; active: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function deactivate() {
    if (!window.confirm(`Delete ${name} permanently? Its stock and medicine line records will also be removed.`)) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/medicines/${id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) { setError(result.error ?? "Unable to delete medicine."); return; }
      router.refresh();
    } catch { setError("Medicine service is unavailable."); }
    finally { setPending(false); }
  }

  return <div className="flex items-center gap-2"><Link href={`/medicines/${id}/edit`} aria-label={`Edit ${name}`} className="inline-flex size-9 items-center justify-center rounded-md hover:bg-muted"><Pencil className="size-4" /></Link>{active && <Button type="button" variant="ghost" size="icon" disabled={pending} aria-label={`Delete ${name}`} onClick={deactivate}><Trash2 className="size-4" /></Button>}{error && <span role="alert" className="text-xs text-red-600">{error}</span>}</div>;
}