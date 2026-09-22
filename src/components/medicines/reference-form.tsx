"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { categorySchema, manufacturerSchema } from "@/lib/validations/medicine";

type ReferenceRecord = { id: string; name: string; description?: string | null; contact?: string | null; email?: string | null; active: boolean };

export function ReferenceForm({ type, records }: { type: "categories" | "manufacturers"; records: ReferenceRecord[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = (type === "categories" ? categorySchema : manufacturerSchema).safeParse(data);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check the entered details."); setPending(false); return; }
    try {
      const response = await fetch(editingId ? `/api/${type}/${editingId}` : `/api/${type}`, { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { setError(result.error ?? "Unable to save."); return; }
      event.currentTarget.reset();
      setEditingId(null);
      router.refresh();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to connect to the server."); }
    finally { setPending(false); }
  }
  async function deactivate(id: string, name: string) {
    if (!window.confirm(`Deactivate ${name}?`)) return;
    setPending(true);
    try {
      const response = await fetch(`/api/${type}/${id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) { setError(result.error ?? "Unable to deactivate."); return; }
      router.refresh();
    } catch { setError("Service unavailable. Please try again."); }
    finally { setPending(false); }
  }
  const category = type === "categories";
  const editing = records.find((record) => record.id === editingId);
  return <><form key={editingId ?? "new"} onSubmit={submit} className="grid gap-3 rounded-xl border bg-muted/30 p-4 md:grid-cols-4"><Input name="name" defaultValue={editing?.name} placeholder={category ? "Category name" : "Manufacturer name"} required />{category ? <Input name="description" defaultValue={editing?.description ?? ""} placeholder="Description" /> : <><Input name="contact" defaultValue={editing?.contact ?? ""} placeholder="Contact" /><Input name="email" type="email" defaultValue={editing?.email ?? ""} placeholder="Email" /></>}<div className="flex gap-2"><Button disabled={pending}>{pending ? "Saving..." : editing ? "Update" : `Add ${category ? "category" : "manufacturer"}`}</Button>{editing && <Button type="button" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>}</div>{error && <p role="alert" className="text-sm text-red-600 md:col-span-4">{error}</p>}</form><CardList records={records} category={category} onEdit={setEditingId} onDeactivate={deactivate} /></>;
}

function CardList({ records, category, onEdit, onDeactivate }: { records: ReferenceRecord[]; category: boolean; onEdit: (id: string) => void; onDeactivate: (id: string, name: string) => void }) { return <div className="rounded-xl border bg-surface"><div className="border-b px-6 py-4 font-semibold">{category ? "Categories" : "Manufacturers"}</div>{records.length === 0 ? <p className="px-6 py-10 text-center text-sm text-muted-foreground">No records created yet.</p> : <ul className="divide-y">{records.map((record) => <li key={record.id} className="flex items-center justify-between gap-4 px-6 py-3"><div><p className="font-medium">{record.name}</p><p className="text-sm text-muted-foreground">{category ? record.description || "No description" : [record.contact, record.email].filter(Boolean).join(" · ") || "No contact details"}</p></div><div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">{record.active ? "Active" : "Inactive"}</span>{record.active && <><Button type="button" variant="ghost" size="sm" onClick={() => onEdit(record.id)}>Edit</Button><Button type="button" variant="ghost" size="sm" onClick={() => onDeactivate(record.id, record.name)}>Delete</Button></>}</div></li>)}</ul>}</div>; }
