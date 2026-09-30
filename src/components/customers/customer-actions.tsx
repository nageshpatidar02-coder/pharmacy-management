"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function CustomerActions({ id, name }: { id: string; name: string }) {
	const router = useRouter();
	const [pending, setPending] = useState(false);
	const [error, setError] = useState("");

	async function remove() {
		if (!window.confirm(`Remove ${name} from the active customer list? Past sales will be retained.`)) return;
		setPending(true);
		setError("");
		try {
			const response = await fetch(`/api/customers/${id}`, { method: "DELETE" });
			const result = await response.json().catch(() => ({}));
			if (!response.ok) {
				setError(result.error ?? "Unable to delete customer.");
				return;
			}
			router.refresh();
		} catch {
			setError("Customer service is unavailable. Please try again.");
		} finally {
			setPending(false);
		}
	}

	return <div className="flex items-center gap-2"><Button type="button" variant="ghost" size="sm" disabled={pending} onClick={remove}>{pending ? "Deleting..." : "Delete"}</Button>{error && <span role="alert" className="text-xs text-red-600">{error}</span>}</div>;
}
