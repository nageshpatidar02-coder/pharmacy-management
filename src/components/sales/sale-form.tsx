"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saleSchema } from "@/lib/validations/sale";

type Customer = { id: string; name: string; mobile?: string | null };
type Batch = { id: string; batchNumber: string; quantity: number; sellingPrice: number; mrp: number; expiryDate: Date };
type Medicine = { id: string; name: string; sellingPrice: number; packSize?: string | null; batches: Batch[] };
type Line = { medicineId: string; batchId: string; quantity: number; strips: number; loose: number; unitsPerStrip: number; sellingPrice: number; discount: number };
const emptyLine = (): Line => ({ medicineId: "", batchId: "", quantity: 1, strips: 1, loose: 0, unitsPerStrip: 1, sellingPrice: 0, discount: 0 });
function unitsInStrip(packSize?: string | null) { const match = packSize?.match(/\d+/); return match ? Math.max(1, Number(match[0])) : 1; }

export function SaleForm({ customers, medicines }: { customers: Customer[]; medicines: Medicine[] }) {
  const router = useRouter();
  const [customerOptions, setCustomerOptions] = useState(customers);
  const [customerId, setCustomerId] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerMobile, setNewCustomerMobile] = useState("");
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  function updateLine(index: number, changes: Partial<Line>) { setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...changes } : line)); }
  function selectMedicine(index: number, medicineId: string) { const medicine = medicines.find((entry) => entry.id === medicineId); const batch = medicine?.batches[0]; const unitsPerStrip = unitsInStrip(medicine?.packSize); updateLine(index, { medicineId, batchId: batch?.id ?? "", unitsPerStrip, quantity: unitsPerStrip, sellingPrice: batch?.sellingPrice ?? medicine?.sellingPrice ?? 0 }); }
  function selectBatch(index: number, batchId: string) { const line = lines[index]; const batch = medicines.find((medicine) => medicine.id === line.medicineId)?.batches.find((entry) => entry.id === batchId); updateLine(index, { batchId, sellingPrice: batch?.sellingPrice ?? line.sellingPrice }); }

  async function addCustomer() {
    if (newCustomerName.trim().length < 2) { setError("Enter the customer name first."); return; }
    setCreatingCustomer(true); setError("");
    try { const response = await fetch("/api/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newCustomerName, mobile: newCustomerMobile }) }); const result = await response.json().catch(() => ({})); if (!response.ok) { setError(result.error ?? "Unable to add customer."); return; } setCustomerOptions((current) => [...current, result]); setCustomerId(result.id); setNewCustomerName(""); setNewCustomerMobile(""); setShowCustomerForm(false); } catch { setError("Unable to connect to the server."); } finally { setCreatingCustomer(false); }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const parsed = saleSchema.safeParse({ customerId, invoiceNumber, paidAmount, paymentMethod, items: lines.map(({ medicineId, batchId, sellingPrice, discount, strips, loose, unitsPerStrip }) => ({ medicineId, batchId, sellingPrice, discount, quantity: strips * unitsPerStrip + loose })) });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check bill details."); setSaving(false); return; }
    try { const response = await fetch("/api/sales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) }); const result = await response.json().catch(() => ({})); if (!response.ok) { setError(result.error ?? "Unable to create bill."); return; } router.push(`/sales/${result.id}`); } catch { setError("Unable to connect to the server."); } finally { setSaving(false); }
  }

  return <form onSubmit={submit} className="space-y-4 rounded-xl border bg-muted/30 p-4"><div className="grid gap-3 md:grid-cols-3"><div className="space-y-2"><label className="text-sm font-medium">Customer</label><select value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="h-10 w-full rounded-md border bg-surface px-3 text-sm"><option value="">Walk-in customer</option>{customerOptions.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.mobile ? ` (${customer.mobile})` : ""}</option>)}</select><button type="button" className="text-sm font-semibold text-primary hover:underline" onClick={() => setShowCustomerForm((value) => !value)}>{showCustomerForm ? "Cancel" : "+ Add customer"}</button></div><Input value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} placeholder="Invoice number" required /><div className="grid grid-cols-2 gap-2"><Input type="number" min="0" step="0.01" value={paidAmount} onChange={(event) => setPaidAmount(Number(event.target.value))} placeholder="Paid now" /><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="h-10 rounded-md border bg-surface px-2 text-sm"><option>CASH</option><option>UPI</option><option>CARD</option><option>BANK</option><option>CREDIT</option></select></div></div>{showCustomerForm && <div className="grid gap-2 rounded-md border bg-surface p-3 md:grid-cols-3"><Input value={newCustomerName} onChange={(event) => setNewCustomerName(event.target.value)} placeholder="New customer name" /><Input value={newCustomerMobile} onChange={(event) => setNewCustomerMobile(event.target.value)} placeholder="Mobile number" inputMode="tel" /><Button type="button" onClick={addCustomer} disabled={creatingCustomer}>{creatingCustomer ? "Adding..." : "Add and select"}</Button></div>}<div className="space-y-3"><div className="flex items-center justify-between"><h3 className="font-semibold">Bill items</h3><Button type="button" variant="outline" size="sm" onClick={() => setLines((current) => [...current, emptyLine()])}>+ Add item</Button></div>{lines.map((line, index) => { const medicine = medicines.find((entry) => entry.id === line.medicineId); const batch = medicine?.batches.find((entry) => entry.id === line.batchId); return <div key={index} className="grid gap-2 rounded-md border bg-surface p-3 md:grid-cols-[1.4fr_1.2fr_.7fr_.7fr_.7fr_.8fr_.7fr_auto]"><select value={line.medicineId} onChange={(event) => selectMedicine(index, event.target.value)} className="h-10 rounded-md border bg-surface px-2 text-sm" required><option value="">Select tablet / medicine</option>{medicines.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={line.batchId} onChange={(event) => selectBatch(index, event.target.value)} className="h-10 rounded-md border bg-surface px-2 text-sm" required><option value="">Select batch</option>{(medicine?.batches ?? []).map((entry) => <option key={entry.id} value={entry.id}>{entry.batchNumber} | stock {entry.quantity} | MRP {entry.mrp}</option>)}</select><Input type="number" min="0" max={batch?.quantity} value={line.strips} onChange={(event) => { const strips = Number(event.target.value); updateLine(index, { strips, quantity: strips * line.unitsPerStrip + line.loose }); }} placeholder="Strips" required /><Input type="number" min="0" max={batch?.quantity} value={line.loose} onChange={(event) => { const loose = Number(event.target.value); updateLine(index, { loose, quantity: line.strips * line.unitsPerStrip + loose }); }} placeholder={`Loose (${line.unitsPerStrip}/strip)`} /><span className="flex h-10 items-center text-xs text-muted-foreground">Total: {line.quantity}</span><Input type="number" min="0" step="0.01" value={line.sellingPrice} onChange={(event) => updateLine(index, { sellingPrice: Number(event.target.value) })} placeholder="Price" required /><Input type="number" min="0" step="0.01" value={line.discount} onChange={(event) => updateLine(index, { discount: Number(event.target.value) })} placeholder="Discount" /><Button type="button" variant="ghost" size="sm" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}>Remove</Button></div>; })}</div><Button disabled={saving}>{saving ? "Generating invoice..." : "Generate customer invoice"}</Button>{error && <p role="alert" className="text-sm text-red-600">{error}</p>}</form>;
}
