"use client";

import { useState } from "react";

import { SearchableSelect } from "@/components/shared/searchable-select";

type Supplier = { id: string; businessName: string };

export function SupplierHistorySearch({ suppliers, selectedId }: { suppliers: Supplier[]; selectedId?: string }) {
  const [supplierId, setSupplierId] = useState(selectedId ?? "");
  return <><SearchableSelect options={suppliers.map((supplier) => ({ id: supplier.id, label: supplier.businessName }))} selectedId={supplierId} onSelect={setSupplierId} placeholder="Search any supplier..." emptyMessage="No supplier found." /><input type="hidden" name="supplierId" value={supplierId} /></>;
}
