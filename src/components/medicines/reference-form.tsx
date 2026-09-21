"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ReferenceForm({ type }: { type: "categories" | "manufacturers" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch(`/api/${type}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const result = await response.json();
      if (!response.ok) { setError(result.error ?? "Unable to save."); return; }
      event.currentTarget.reset();
      router.refresh();
    } catch { setError("Service unavailable. Please try again."); }
    finally { setPending(false); }
  }
  const category = type === "categories";
  return <form onSubmit={submit} className="grid gap-3 rounded-xl border bg-muted/30 p-4 md:grid-cols-4"><Input name="name" placeholder={category ? "Category name" : "Manufacturer name"} required />{category ? <Input name="description" placeholder="Description" /> : <><Input name="contact" placeholder="Contact" /><Input name="email" type="email" placeholder="Email" /></>}<Button disabled={pending}>{pending ? "Saving..." : `Add ${category ? "category" : "manufacturer"}`}</Button>{error && <p role="alert" className="text-sm text-red-600 md:col-span-4">{error}</p>}</form>;
}
