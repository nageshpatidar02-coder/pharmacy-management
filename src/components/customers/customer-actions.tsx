"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
export function CustomerActions({ id, name }: { id: string; name: string }) { const router = useRouter(); return <Button type="button" variant="ghost" size="sm" onClick={async () => { if (!window.confirm(`Deactivate ${name}?`)) return; const response = await fetch(`/api/customers/${id}`, { method: "DELETE" }); if (response.ok) router.refresh(); }}>Delete</Button>; }
