"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PurchasePaymentForm({ purchaseId, balance }: { purchaseId: string; balance: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState(balance);
  const [method, setMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch(`/api/purchases/${purchaseId}/payment`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount, method, reference }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { setError(result.error ?? "Unable to receive supplier payment."); return; }
      router.refresh();
    } catch { setError("Unable to connect to the server."); } finally { setSaving(false); }
  }
  if (balance <= 0) return <p className="text-sm font-semibold text-emerald-700">Purchase bill fully paid.</p>;
  return <form onSubmit={submit} className="grid gap-2 md:grid-cols-4"><Input type="number" min="0.01" max={balance} step="0.01" value={amount} onChange={(event) => setAmount(Number(event.target.value))} required /><select value={method} onChange={(event) => setMethod(event.target.value)} className="h-10 rounded-md border bg-surface px-3 text-sm"><option>CASH</option><option>UPI</option><option>CARD</option><option>BANK</option><option>CREDIT</option></select><Input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Reference / note" /><Button disabled={saving}>{saving ? "Saving..." : "Pay supplier due"}</Button>{error && <p role="alert" className="text-sm text-red-600 md:col-span-4">{error}</p>}</form>;
}
