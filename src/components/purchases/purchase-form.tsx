"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { purchaseSchema } from "@/lib/validations/purchase";
import { SearchableSelect } from "@/components/shared/searchable-select";

// 1. Medicine Type/Category added to prevent Syrup shown as Tablet
export type MedicineCategory = "TABLET" | "CAPSULE" | "SYRUP" | "INJECTION" | "DROPS" | "OINTMENT" | "EQUIPMENT" | "OTHER";

type Supplier = { id: string; businessName: string };
type Medicine = { 
  id: string; 
  name: string; 
  barcode: string | null; 
  purchasePrice: number; 
  mrp: number; 
  sellingPrice: number; 
  gstPercentage: number;
  itemType: MedicineCategory;
};

type PurchaseLine = { 
  medicineId: string; 
  medicineName?: string;
  itemType?: MedicineCategory;
  batchNumber: string; 
  expiryDate: string; 
  quantity: number; 
  freeQuantity: number; 
  purchaseRate: number; 
  mrp: number; 
  sellingPrice: number; 
  discount: number; 
  gstPercentage: number; 
};

type PurchaseInitialData = {
  id: string;
  supplierId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  paidAmount: number;
  paymentMethod: string;
  paymentCount: number;
  discountValue: number;
  igst: number;
  items: PurchaseLine[];
};

const emptyLine = (): PurchaseLine => ({ 
  medicineId: "", 
  medicineName: "",
  itemType: "TABLET",
  batchNumber: "", 
  expiryDate: "", 
  quantity: 1, 
  freeQuantity: 0, 
  purchaseRate: 0, 
  mrp: 0, 
  sellingPrice: 0, 
  discount: 0, 
  gstPercentage: 0 
});

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

function formatExpiryMonthYear(value: string) {
  const isoDate = value.match(/^\d{4}-(0[1-9]|1[0-2])(?:-\d{2})?$/);
  if (isoDate) return `${isoDate[1]}/${value.slice(2, 4)}`;

  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

export function PurchaseForm({ suppliers, medicines: initialMedicines, initialData }: { suppliers: Supplier[]; medicines: Medicine[]; initialData?: PurchaseInitialData }) {
  const router = useRouter();
  const [medicinesList] = useState<Medicine[]>(initialMedicines);
  const [lines, setLines] = useState<PurchaseLine[]>(() => initialData?.items.map((line) => ({
    ...line,
    expiryDate: formatExpiryMonthYear(line.expiryDate),
  })) ?? [emptyLine()]);
  const [supplierId, setSupplierId] = useState(initialData?.supplierId ?? "");
  const [invoiceNumber, setInvoiceNumber] = useState(initialData?.invoiceNumber ?? "");
  const [invoiceDate, setInvoiceDate] = useState(initialData?.invoiceDate ?? new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(initialData?.dueDate ?? "");
  const [paymentMethod, setPaymentMethod] = useState(initialData?.paymentMethod ?? "CREDIT");
  const [paidAmount, setPaidAmount] = useState(initialData?.paidAmount ?? 0);
  const [discountType, setDiscountType] = useState<"AMOUNT" | "PERCENTAGE">("AMOUNT");
  const [discountValue, setDiscountValue] = useState(initialData?.discountValue ?? 0);
  const [igst, setIgst] = useState(initialData?.igst ?? 0);
  const [barcode, setBarcode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  // Totals Calculation
  const totals = lines.reduce((result, line) => {
    const gross = line.quantity * line.purchaseRate;
    const lineDiscount = Math.min(Math.max(line.discount, 0), gross);
    const taxable = Math.max(gross - lineDiscount, 0);
    const tax = taxable * line.gstPercentage / 100;
    result.subtotal += gross; 
    result.lineDiscount += lineDiscount; 
    result.taxable += taxable; 
    result.tax += tax;
    return result;
  }, { subtotal: 0, lineDiscount: 0, taxable: 0, tax: 0 });

  const maxDiscountValue = discountType === "PERCENTAGE" ? 100 : totals.taxable;
  const effectiveDiscountValue = Math.min(Math.max(discountValue, 0), maxDiscountValue);
  const billDiscount = discountType === "PERCENTAGE" ? totals.taxable * effectiveDiscountValue / 100 : effectiveDiscountValue;
  const taxTotal = igst > 0 ? igst : totals.tax;
  const grandTotal = Math.round(Math.max(totals.taxable - billDiscount, 0) + taxTotal);
  const totalDiscount = totals.lineDiscount + billDiscount;
  const dueAmount = Math.max(grandTotal - paidAmount, 0);
  const paymentStatus = paidAmount <= 0 ? "UNPAID" : paidAmount >= grandTotal ? "PAID" : "PARTIAL";

  function updateLine(index: number, patch: Partial<PurchaseLine>) { 
    const currentLine = lines[index];
    if (!currentLine) return;
    const updated = { ...currentLine, ...patch };
    if (patch.sellingPrice !== undefined || patch.purchaseRate !== undefined) {
      updated.priceWarning = undefined;
    }
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? updated : line));
  }

  // Medicine Selection Logic with Category Preserved
  function selectMedicine(index: number, medicineId: string) { 
    const medicine = medicinesList.find((entry) => entry.id === medicineId); 
    if (!medicine) return;

    updateLine(index, { 
      medicineId, 
      medicineName: medicine.name,
      itemType: medicine.itemType || "OTHER",
      purchaseRate: medicine.purchasePrice ?? 0, 
      mrp: medicine.mrp ?? 0, 
      sellingPrice: medicine.sellingPrice ?? 0, 
      gstPercentage: medicine.gstPercentage ?? 0 
    }); 
  }

  function lookupBarcode() { 
    const medicine = medicinesList.find((entry) => entry.barcode === barcode.trim()); 
    if (!medicine) { 
      setError("Is barcode ki koi medicine nahi mili. Pehle Medicine Master mein add karein."); 
      return; 
    } 
    selectMedicine(0, medicine.id); 
    setBarcode(""); 
    setError(""); 
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); 
    setPending(true); 
    setError("");

    if (paidAmount > grandTotal) { 
      setError(`Paid amount total payable amount (${grandTotal.toFixed(2)}) se zyada nahi ho sakta.`); 
      setPending(false); 
      return; 
    }

    const parsed = purchaseSchema.safeParse({ 
      supplierId, 
      invoiceNumber, 
      invoiceDate, 
      dueDate: dueDate || undefined, 
      paymentMethod, 
      paidAmount, 
      igst,
      discountType, 
      discountValue: effectiveDiscountValue,
      items: lines.map((line) => ({ ...line, discount: Math.min(Math.max(line.discount, 0), line.quantity * line.purchaseRate) })),
    });

    if (!parsed.success) { 
      setError(parsed.error.issues[0]?.message ?? "Kripya purchase bill ki details check karein."); 
      setPending(false); 
      return; 
    }

    try { 
      // Saving Purchase Bill automatically adds stock to Inventory
      const response = await fetch(initialData ? `/api/purchases/${initialData.id}` : "/api/purchases", {
        method: initialData ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(parsed.data) 
      }); 
      
      const result = await response.json().catch(() => ({})); 
      if (!response.ok) { 
        setError(result.error ?? "Purchase entry save nahi ho saki."); 
        return; 
      } 
      
      router.push(initialData ? `/purchases/${result.id}` : "/purchases");
      router.refresh(); 
    } catch (requestError) { 
      setError(requestError instanceof Error ? requestError.message : "Server se connect nahi ho pa rahe hain."); 
    } finally { 
      setPending(false); 
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Wholesaler & Bill Details */}
      <div className="grid gap-4 rounded-xl border bg-surface p-6 md:grid-cols-4">
        <label className="text-sm font-medium">
          Wholesaler / Supplier
          <SearchableSelect
            options={suppliers.map((supplier) => ({ id: supplier.id, label: supplier.businessName }))}
            selectedId={supplierId}
            onSelect={setSupplierId}
            placeholder="Search wholesaler / supplier..."
            emptyMessage="No wholesaler found."
            disabled={Boolean(initialData?.paymentCount)}
          />
        </label>
        <label className="text-sm font-medium">
          Invoice / Bill No.
          <Input value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} required />
        </label>
        <label className="text-sm font-medium">
          Purchase Date
          <Input type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} required />
        </label>
        <label className="text-sm font-medium">
          Due Date
          <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </label>
      </div>

      {/* Item Entries */}
      <div className="rounded-xl border bg-surface p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-semibold text-lg">Purchase Items (Stock In)</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Medicine search karein. Yaha entry karte hi wholesaler stock automatic update ho jayega.
            </p>
          </div>
          <div className="flex gap-2">
            <Input 
              aria-label="Medicine barcode" 
              placeholder="Scan Barcode" 
              value={barcode} 
              onChange={(event) => setBarcode(event.target.value)} 
              onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); lookupBarcode(); } }} 
            />
            <Button type="button" variant="outline" onClick={lookupBarcode}>Scan</Button>
            <Button type="button" variant="default" onClick={() => setLines((current) => [...current, emptyLine()])}>
              + Add Item
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {lines.map((line, index) => { 
            const gross = line.quantity * line.purchaseRate; 
            const lineDiscount = Math.min(line.discount, gross); 
            const tax = Math.max(gross - lineDiscount, 0) * line.gstPercentage / 100; 
            const lineTotal = gross - lineDiscount + tax; 

            return (
              <div key={index} className="grid gap-3 rounded-lg border bg-background p-4 md:grid-cols-4">
                
                {/* Searchable Medicine Input / Dropdown */}
                <div className="md:col-span-2">
                  <label className="text-xs font-medium flex justify-between">
                    <span>Search Medicine</span>
                    {line.itemType && (
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">
                        TYPE: {line.itemType}
                      </span>
                    )}
                  </label>
                  <SearchableSelect
                    options={medicinesList.map((medicine) => ({ id: medicine.id, label: `${medicine.name} (${medicine.itemType || "OTHER"})`, searchText: medicine.barcode ?? "" }))}
                    selectedId={line.medicineId}
                    onSelect={(medicineId) => selectMedicine(index, medicineId)}
                    placeholder="Search medicine or barcode..."
                    emptyMessage="No medicine found."
                  />
                </div>

                <Field label="Batch Number" value={line.batchNumber} onChange={(value) => updateLine(index, { batchNumber: value })} required />
                <Field label="Quantity (Pcs/Bottles)" value={line.quantity} onChange={(value) => updateLine(index, { quantity: Math.max(1, Math.trunc(Number(value) || 0)) })} type="number" step="1" min="1" required />
                <Field label="Free Qty (Scheme)" value={line.freeQuantity} onChange={(value) => updateLine(index, { freeQuantity: Math.max(0, Math.trunc(Number(value) || 0)) })} type="number" step="1" min="0" />
                <Field label="Purchase Rate" value={line.purchaseRate} onChange={(value) => updateLine(index, { purchaseRate: Math.max(0, Number(value) || 0) })} type="number" step="0.01" required />
                <Field label="MRP" value={line.mrp} onChange={(value) => updateLine(index, { mrp: Math.max(0, Number(value) || 0) })} type="number" step="0.01" required />
                <div>
                  <Field label="Selling Price" value={line.sellingPrice} onChange={(value) => updateLine(index, { sellingPrice: Math.max(0, Number(value) || 0) })} type="number" step="0.01" min="0" required />
                  {line.priceWarning ? <p role="status" className="mt-1 text-xs text-amber-700">{line.priceWarning}</p> : null}
                </div>
                <Field label="Discount (Rs)" value={Math.min(line.discount, line.quantity * line.purchaseRate)} onChange={(value) => updateLine(index, { discount: Math.min(line.quantity * line.purchaseRate, Math.max(0, Number(value) || 0)) })} type="number" min="0" max={line.quantity * line.purchaseRate} />
                <Field label="GST %" value={line.gstPercentage} onChange={(value) => updateLine(index, { gstPercentage: Math.min(100, Math.max(0, Number(value) || 0)) })} type="number" />
                <Field label="Expiry Month / Year" value={line.expiryDate} onChange={(value) => updateLine(index, { expiryDate: formatExpiryMonthYear(value) })} type="text" inputMode="numeric" maxLength={5} placeholder="MM/YY" required />
                
                <div className="flex items-end justify-between gap-2 text-sm md:col-span-4 border-t pt-2">
                  <span>Line Total: <strong className="text-base">{money(lineTotal).toFixed(2)}</strong></span>
                  <Button 
                    type="button" 
                    variant="outline"
                    size="sm" 
                    disabled={lines.length === 1} 
                    onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}
                  >
                    Remove Item
                  </Button>
                </div>
              </div>
            ); 
          })}
        </div>
      </div>

      {/* Bill Totals & Discount Section */}
      <div className="grid gap-4 md:grid-cols-[1fr_380px]">
        <div className="rounded-xl border bg-surface p-6">
          <h2 className="font-semibold">Discount & Payment Details</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm font-medium">
              Discount Type
              <select value={discountType} onChange={(event) => { const type = event.target.value as "AMOUNT" | "PERCENTAGE"; setDiscountType(type); setDiscountValue((value) => Math.min(value, type === "PERCENTAGE" ? 100 : totals.taxable)); }} className="mt-2 h-10 w-full rounded-md border bg-background px-3">
                <option value="AMOUNT">Amount (₹)</option>
                <option value="PERCENTAGE">Percentage (%)</option>
              </select>
            </label>
            <label className="text-sm font-medium">
              Discount Value
              <Input type="number" min="0" max={maxDiscountValue} step="0.01" value={effectiveDiscountValue} onChange={(event) => setDiscountValue(Math.min(maxDiscountValue, Math.max(0, Number(event.target.value) || 0)))} />
            </label>
            <label className="text-sm font-medium">
              Payment Method
              <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} disabled={Boolean(initialData)} className="mt-2 h-10 w-full rounded-md border bg-background px-3">
                <option value="CASH">CASH</option>
                <option value="UPI">UPI</option>
                <option value="CARD">CARD</option>
                <option value="BANK">BANK</option>
                <option value="CREDIT">CREDIT (Udhar)</option>
              </select>
            </label>
            <label className="text-sm font-medium">
              Paid Amount
              <Input type="number" min="0" max={grandTotal} step="0.01" value={paidAmount} onChange={(event) => setPaidAmount(Math.max(0, Number(event.target.value) || 0))} disabled={Boolean(initialData)} />
            </label>
            {initialData && igst > 0 ? <label className="text-sm font-medium">IGST Amount<Input type="number" min="0" step="0.01" value={igst} onChange={(event) => setIgst(Math.max(0, Number(event.target.value) || 0))} /></label> : null}
          </div>
        </div>

        {/* Grand Total Sidebar */}
        <div className="rounded-xl border bg-surface p-6 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><strong>{money(totals.subtotal).toFixed(2)}</strong></div>
          <div className="mt-2 flex justify-between"><span>GST Tax</span><strong>{money(taxTotal).toFixed(2)}</strong></div>
          <div className="mt-2 flex justify-between"><span>Total Discount</span><strong>{money(totalDiscount).toFixed(2)}</strong></div>
          <div className="mt-3 flex justify-between border-t pt-3 text-lg font-semibold"><span>Grand Total</span><span>{grandTotal.toFixed(2)}</span></div>
          <div className="mt-2 flex justify-between text-emerald-700"><span>Paid Amount</span><span>{money(paidAmount).toFixed(2)}</span></div>
          <div className="mt-2 flex justify-between font-semibold text-amber-700"><span>Due Amount</span><span>{dueAmount.toFixed(2)}</span></div>
          <div className="mt-2 flex justify-between">
            <span>Status</span>
            <strong className={paymentStatus === "PAID" ? "text-emerald-700" : paymentStatus === "PARTIAL" ? "text-amber-700" : "text-red-700"}>
              {paymentStatus}
            </strong>
          </div>
        </div>
      </div>

      <Button disabled={pending} className="w-full md:w-auto h-12 text-base px-8">
        {pending ? "Saving Purchase & Updating Stock..." : initialData ? "Save Purchase Changes" : "Save Purchase Bill"}
      </Button>

      {error && <p role="alert" className="text-sm text-red-600 font-medium">{error}</p>}
    </form>
  );
}

function Field({
  id,
  label,
  type = "text",
  step,
  min,
  max,
  maxLength,
  inputMode,
  defaultValue,
  value,
  onChange,
  required,
  error,
  placeholder,
  className,
}: {
  id?: string;
  label: string;
  type?: string;
  step?: string;
  min?: string;
  max?: number;
  maxLength?: number;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  defaultValue?: string | number;
  value?: string | number;
  onChange?: (value: string) => void;
  required?: boolean;
  error?: string;
  placeholder?: string;
  className?: string;
}) {
  // Check karein ki prop controlled hai ya nahi
  const fieldId = id ?? label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const isControlled = value !== undefined;

  return (
    <div className="space-y-1.5">
      <label       htmlFor={fieldId} className="text-xs font-semibold text-foreground">
        {label}
      </label>
      <Input
        id={fieldId}
        name={fieldId}
        type={type}
        step={step}
        min={min}
        max={max}
        maxLength={maxLength}
        inputMode={inputMode}
        {...(isControlled ? { value } : { defaultValue: defaultValue ?? "" })}
        onChange={(event) => onChange?.(event.target.value)}
        required={required}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        className={`h-10 text-xs ${className ?? ""}`}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}