"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saleSchema } from "@/lib/validations/sale";
import { Plus, Trash2, UserPlus, ShoppingBag, Receipt, AlertCircle, RefreshCw } from "lucide-react";
import { unitsPerStrip } from "@/lib/stock";
import { SearchableSelect } from "@/components/shared/searchable-select";

type Customer = { id: string; name: string; mobile?: string | null };
type Batch = {
  id: string;
  batchNumber: string;
  quantity: number;
  sellingPrice: number;
  mrp: number;
  expiryDate: Date;
};

type Medicine = {
  id: string;
  name: string;
  sellingPrice: number;
  itemType?: "TABLET" | "CAPSULE" | "SYRUP" | "INJECTION" | "DROPS" | "OINTMENT" | "EQUIPMENT" | "OTHER";
  packSize?: string | number | null;
  unit?: string | null;
  batches: Batch[];
};

type Line = {
  medicineId: string;
  batchId: string;
  itemType: string;
  sellMode: "FULL_STRIP" | "LOOSE_TABLET" | "BOTH"; // BOTH = Strip + Loose combine
  strips: number;
  loose: number;
  quantity: number; // Total calculated units/pcs
  unitsPerStrip: number;
  stripPrice: number;
  perUnitPrice: number;
  sellingPrice: number;
  discount: number;
};

const emptyLine = (): Line => ({
  medicineId: "",
  batchId: "",
  itemType: "OTHER",
  sellMode: "FULL_STRIP",
  strips: 1,
  loose: 0,
  quantity: 1,
  unitsPerStrip: 1,
  stripPrice: 0,
  perUnitPrice: 0,
  sellingPrice: 0,
  discount: 0,
});

function parseUnitsInStrip(packSize?: string | number | null) {
  return unitsPerStrip(packSize);
}

export function calculateSaleQuantity(
  itemType: string,
  sellMode: Line["sellMode"],
  strips: number,
  loose: number,
  quantity: number,
  packSize?: string | number | null,
) {
  const isTablet = itemType === "TABLET" || itemType === "CAPSULE";
  if (!isTablet) return Math.max(0, Number(quantity) || 0);
  const perStrip = unitsPerStrip(packSize);
  if (sellMode === "LOOSE_TABLET") return Math.max(0, Number(loose) || 0);
  const stripUnits = Math.max(0, Number(strips) || 0) * perStrip;
  return sellMode === "BOTH" ? stripUnits + Math.max(0, Number(loose) || 0) : stripUnits;
}

function generateInvoiceNo(isWalkIn: boolean) {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const customerTag = isWalkIn ? "WALK" : "CUST";
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `INV-${dateStr}-${customerTag}-${randomNum}`;
}

// Item type wise unit label define karne ke liye helper function
function getItemUnitLabel(itemType: string) {
  switch (itemType) {
    case "SYRUP":
      return "Bottle";
    case "INJECTION":
      return "Vial / Amp";
    case "DROPS":
      return "Bottle";
    case "OINTMENT":
      return "Tube";
    case "EQUIPMENT":
      return "Pc";
    default:
      return "Unit / Pc";
  }
}

export function SaleForm({ customers, medicines }: { customers: Customer[]; medicines: Medicine[] }) {
  const router = useRouter();
  const [customerOptions, setCustomerOptions] = useState(customers);
  const [customerId, setCustomerId] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerMobile, setNewCustomerMobile] = useState("");
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [invoiceNumber, setInvoiceNumber] = useState(() => generateInvoiceNo(true));
  const [paidAmount, setPaidAmount] = useState<number | "">("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  const noSpinnerClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  function updateLine(index: number, changes: Partial<Line>) {
    setLines((current) =>
      current.map((line, lineIndex) => {
        if (lineIndex !== index) return line;
        const updated = { ...line, ...changes };
        const isTablet = updated.itemType === "TABLET" || updated.itemType === "CAPSULE";

        let calculatedQty = 0;
        let effectiveSellingPrice = updated.stripPrice;

        if (isTablet) {
          calculatedQty = calculateSaleQuantity(updated.itemType, updated.sellMode, updated.strips, updated.loose, updated.quantity, updated.unitsPerStrip);
          effectiveSellingPrice = updated.sellMode === "LOOSE_TABLET" ? updated.perUnitPrice : updated.stripPrice;
        } else {
          // Non-Tablets (Syrup, Injection, Drops, etc.)
          calculatedQty = updated.quantity || 1;
          effectiveSellingPrice = updated.stripPrice;
        }

        return {
          ...updated,
          quantity: calculatedQty,
          sellingPrice: effectiveSellingPrice,
        };
      })
    );
  }

  function selectMedicine(index: number, medicineId: string) {
    const medicine = medicines.find((entry) => entry.id === medicineId);
    const batch = medicine?.batches[0];
    const unitsPerStrip = parseUnitsInStrip(medicine?.packSize);
    const stripPrice = batch?.sellingPrice ?? medicine?.sellingPrice ?? 0;
    const perUnitPrice = Number((stripPrice / unitsPerStrip).toFixed(2));
    const itemType = medicine?.itemType ?? "OTHER";

    updateLine(index, {
      medicineId,
      batchId: batch?.id ?? "",
      itemType,
      sellMode: "FULL_STRIP",
      unitsPerStrip,
      strips: 1,
      loose: 0,
      quantity: itemType === "TABLET" || itemType === "CAPSULE" ? unitsPerStrip : 1,
      stripPrice,
      perUnitPrice,
      sellingPrice: stripPrice,
    });
  }

  function selectBatch(index: number, batchId: string) {
    const line = lines[index];
    const batch = medicines.find((m) => m.id === line.medicineId)?.batches.find((b) => b.id === batchId);
    const stripPrice = batch?.sellingPrice ?? line.stripPrice;
    const perUnitPrice = Number((stripPrice / (line.unitsPerStrip || 1)).toFixed(2));

    updateLine(index, {
      batchId,
      stripPrice,
      perUnitPrice,
    });
  }

  const summary = useMemo(() => {
    return lines.reduce(
      (acc, line) => {
        const isTablet = line.itemType === "TABLET" || line.itemType === "CAPSULE";
        
        let lineTotal = 0;
        if (isTablet) {
          if (line.sellMode === "LOOSE_TABLET") {
            lineTotal = (line.loose || 0) * (line.perUnitPrice || 0);
          } else if (line.sellMode === "BOTH") {
            // Strip total + Loose total
            lineTotal = (line.strips || 0) * (line.stripPrice || 0) + (line.loose || 0) * (line.perUnitPrice || 0);
          } else {
            lineTotal = (line.strips || 0) * (line.stripPrice || 0);
          }
        } else {
          // Non-tablets (Syrup / Injection)
          lineTotal = (line.quantity || 0) * (line.stripPrice || 0);
        }

        const lineDiscount = line.discount || 0;
        const netLineTotal = Math.max(0, lineTotal - lineDiscount);

        return {
          totalUnits: acc.totalUnits + line.quantity,
          grossTotal: acc.grossTotal + lineTotal,
          totalDiscount: acc.totalDiscount + lineDiscount,
          netTotal: acc.netTotal + netLineTotal,
        };
      },
      { totalUnits: 0, grossTotal: 0, totalDiscount: 0, netTotal: 0 }
    );
  }, [lines]);

  async function addCustomer() {
    if (newCustomerName.trim().length < 2) {
      setError("Please enter customer name first.");
      return;
    }
    setCreatingCustomer(true);
    setError("");
    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCustomerName, mobile: newCustomerMobile }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error ?? "Unable to add customer.");
        return;
      }
      setCustomerOptions((current) => [...current, result]);
      setCustomerId(result.id);
      setInvoiceNumber(generateInvoiceNo(false));
      setNewCustomerName("");
      setNewCustomerMobile("");
      setShowCustomerForm(false);
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setCreatingCustomer(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const parsed = saleSchema.safeParse({
      customerId,
      invoiceNumber,
      paidAmount: Number(paidAmount) || summary.netTotal,
      paymentMethod,
      items: lines.map((line) => {
        const isTablet = line.itemType === "TABLET" || line.itemType === "CAPSULE";
        const unitRate = isTablet && line.sellMode === "LOOSE_TABLET" ? line.perUnitPrice : line.stripPrice;

        return {
          medicineId: line.medicineId,
          batchId: line.batchId,
          itemType: line.itemType,
          sellMode: line.sellMode,
          strips: line.strips,
          loose: line.loose,
          quantity: line.quantity,
          sellingPrice: isTablet ? Number((unitRate / (line.unitsPerStrip || 1)).toFixed(2)) : unitRate,
          discount: line.discount,
        };
      }),
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check invoice details.");
      setSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error ?? "Unable to generate bill.");
        return;
      }
      router.push(`/sales/${result.id}`);
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-7xl space-y-6 rounded-2xl border bg-background p-6 shadow-sm">
      {/* Header Section */}
      <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" /> Create New Bill
          </h2>
          <p className="text-xs text-muted-foreground">Select customer, pick items, enter quantities, and generate bill.</p>
        </div>

        <div className="flex items-center gap-1.5">
          <Input
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="Invoice No."
            className="w-56 font-mono text-xs font-semibold"
            required
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            title="Re-generate Invoice Number"
            onClick={() => setInvoiceNumber(generateInvoiceNo(!customerId))}
          >
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Customer & Payment Info */}
      <div className="grid gap-4 rounded-xl border bg-muted/20 p-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer</label>
          <div className="flex gap-2">
            <SearchableSelect
              options={customerOptions.map((customer) => ({ id: customer.id, label: `${customer.name}${customer.mobile ? ` (${customer.mobile})` : ""}`, searchText: customer.mobile ?? "" }))}
              selectedId={customerId}
              onSelect={(id) => { setCustomerId(id); setInvoiceNumber(generateInvoiceNo(false)); }}
              placeholder="Search customer by name or mobile..."
              emptyMessage="No customer found."
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              title="Add Customer"
              onClick={() => setShowCustomerForm(!showCustomerForm)}
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payment Method</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="CASH">CASH</option>
            <option value="UPI">UPI / QR</option>
            <option value="CARD">CARD</option>
            <option value="BANK">BANK TRANSFER</option>
            <option value="CREDIT">CREDIT (DUE)</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount Paid Now (₹)</label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={paidAmount}
            onChange={(e) => setPaidAmount(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder={`₹${summary.netTotal.toFixed(2)}`}
            className={`h-10 bg-background ${noSpinnerClass}`}
          />
        </div>
      </div>

      {/* Customer Create Collapse */}
      {showCustomerForm && (
        <div className="grid gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 md:grid-cols-3">
          <Input
            value={newCustomerName}
            onChange={(e) => setNewCustomerName(e.target.value)}
            placeholder="Full Name *"
            className="bg-background"
          />
          <Input
            value={newCustomerMobile}
            onChange={(e) => setNewCustomerMobile(e.target.value)}
            placeholder="Mobile Number"
            inputMode="tel"
            className="bg-background"
          />
          <Button type="button" onClick={addCustomer} disabled={creatingCustomer}>
            {creatingCustomer ? "Saving..." : "Save & Select"}
          </Button>
        </div>
      )}

      {/* Itemized Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" /> Bill Items ({lines.length})
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLines((current) => [...current, emptyLine()])}
            className="gap-1 text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Add Row
          </Button>
        </div>

        {/* Table Headers */}
        <div className="hidden items-center gap-2 px-3 text-xs font-semibold text-muted-foreground md:grid md:grid-cols-12">
          <span className="col-span-3">ITEM NAME</span>
          <span className="col-span-2">BATCH & STOCK</span>
          <span className="col-span-2 text-center">QUANTITY / MODE</span>
          <span className="col-span-1 text-center">TOTAL QTY</span>
          <span className="col-span-1 text-right">PRICE</span>
          <span className="col-span-1 text-right">DISCOUNT</span>
          <span className="col-span-2 text-right pr-2">NET TOTAL</span>
        </div>

        {/* Rows */}
        <div className="space-y-2">
          {lines.map((line, index) => {
            const medicine = medicines.find((m) => m.id === line.medicineId);
            const isTablet = line.itemType === "TABLET" || line.itemType === "CAPSULE";

            let lineSubtotal = 0;
            if (isTablet) {
              if (line.sellMode === "LOOSE_TABLET") {
                lineSubtotal = (line.loose || 0) * (line.perUnitPrice || 0);
              } else if (line.sellMode === "BOTH") {
                lineSubtotal = (line.strips || 0) * (line.stripPrice || 0) + (line.loose || 0) * (line.perUnitPrice || 0);
              } else {
                lineSubtotal = (line.strips || 0) * (line.stripPrice || 0);
              }
            } else {
              lineSubtotal = (line.quantity || 0) * (line.stripPrice || 0);
            }

            const lineNet = Math.max(0, lineSubtotal - (line.discount || 0));

            return (
              <div
                key={index}
                className="grid gap-3 rounded-xl border bg-card p-3 shadow-sm md:grid-cols-12 md:items-center"
              >
                {/* Item Pick */}
                <div className="md:col-span-3">
                  <label className="text-[10px] font-semibold text-muted-foreground md:hidden">Item</label>
                  <SearchableSelect
                    options={medicines.map((item) => ({ id: item.id, label: `${item.name} (${item.itemType ?? "OTHER"})` }))}
                    selectedId={line.medicineId}
                    onSelect={(id) => selectMedicine(index, id)}
                    placeholder="Search medicine..."
                    emptyMessage="No medicine found."
                  />
                </div>

                {/* Batch Pick */}
                <div className="md:col-span-2">
                  <label className="text-[10px] font-semibold text-muted-foreground md:hidden">Batch</label>
                  <select
                    value={line.batchId}
                    onChange={(e) => selectBatch(index, e.target.value)}
                    className="h-10 w-full rounded-md border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  >
                    <option value="">Select Batch</option>
                    {(medicine?.batches ?? []).map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.batchNumber} (Stock: {entry.quantity})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity Details */}
                <div className="md:col-span-2">
                  <label className="text-[10px] font-semibold text-muted-foreground md:hidden">Quantity</label>
                  {isTablet ? (
                    <div className="space-y-1.5">
                      {/* Mode Toggles for Tablets/Capsules */}
                      <div className="flex rounded-md border bg-muted p-0.5 text-[9px] font-bold">
                        <button
                          type="button"
                          onClick={() => updateLine(index, { sellMode: "FULL_STRIP" })}
                          className={`flex-1 rounded py-1 transition-colors ${
                            line.sellMode === "FULL_STRIP" ? "bg-background text-primary shadow-xs" : "text-muted-foreground"
                          }`}
                        >
                          Strip
                        </button>
                        <button
                          type="button"
                          onClick={() => updateLine(index, { sellMode: "LOOSE_TABLET" })}
                          className={`flex-1 rounded py-1 transition-colors ${
                            line.sellMode === "LOOSE_TABLET" ? "bg-background text-primary shadow-xs" : "text-muted-foreground"
                          }`}
                        >
                          Loose
                        </button>
                        <button
                          type="button"
                          onClick={() => updateLine(index, { sellMode: "BOTH" })}
                          className={`flex-1 rounded py-1 transition-colors ${
                            line.sellMode === "BOTH" ? "bg-background text-primary shadow-xs" : "text-muted-foreground"
                          }`}
                        >
                          Both
                        </button>
                      </div>

                      {/* Input fields according to mode */}
                      {line.sellMode === "FULL_STRIP" && (
                        <Input
                          type="number"
                          min="1"
                          value={line.strips || ""}
                          onChange={(e) => updateLine(index, { strips: Number(e.target.value) })}
                          placeholder="Strips"
                          className={`h-8 text-center text-xs ${noSpinnerClass}`}
                        />
                      )}

                      {line.sellMode === "LOOSE_TABLET" && (
                        <Input
                          type="number"
                          min="1"
                          value={line.loose || ""}
                          onChange={(e) => updateLine(index, { loose: Number(e.target.value) })}
                          placeholder="Loose Tabs"
                          className={`h-8 text-center text-xs ${noSpinnerClass}`}
                        />
                      )}

                      {line.sellMode === "BOTH" && (
                        <div className="flex gap-1">
                          <Input
                            type="number"
                            min="1"
                            value={line.strips || ""}
                            onChange={(e) => updateLine(index, { strips: Number(e.target.value) })}
                            placeholder="Strips"
                            className={`h-8 text-center text-xs ${noSpinnerClass}`}
                          />
                          <Input
                            type="number"
                            min="1"
                            value={line.loose || ""}
                            onChange={(e) => updateLine(index, { loose: Number(e.target.value) })}
                            placeholder="Loose"
                            className={`h-8 text-center text-xs ${noSpinnerClass}`}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Syrup, Injection, Drops, Tube, Pc Quantity Input */
                    <div className="space-y-1">
                      <span className="inline-block rounded bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {getItemUnitLabel(line.itemType)}
                      </span>
                      <Input
                        type="number"
                        min="1"
                        value={line.quantity || ""}
                        onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })}
                        placeholder="Qty"
                        className={`h-8 text-center text-xs ${noSpinnerClass}`}
                      />
                    </div>
                  )}
                </div>

                {/* Total Units Badge */}
                <div className="flex h-10 flex-col justify-center items-center rounded-md bg-muted/40 font-mono text-xs font-medium md:col-span-1">
                  <span>
                    {line.quantity} {isTablet ? "tabs" : getItemUnitLabel(line.itemType).toLowerCase()}
                  </span>
                  {isTablet && (
                    <span className="text-[9px] text-muted-foreground">({line.unitsPerStrip}/strip)</span>
                  )}
                </div>

                {/* Price Column */}
                <div className="md:col-span-1">
                  <label className="text-[10px] font-semibold text-muted-foreground md:hidden">Price (₹)</label>
                  {isTablet && line.sellMode === "LOOSE_TABLET" ? (
                    <div className="space-y-0.5">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.perUnitPrice || ""}
                        onChange={(e) => updateLine(index, { perUnitPrice: Number(e.target.value) })}
                        className={`h-8 text-right text-xs font-mono ${noSpinnerClass}`}
                        required
                      />
                      <span className="block text-[9px] text-right text-emerald-600 font-medium">₹/Tab</span>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.stripPrice || ""}
                        onChange={(e) => updateLine(index, { stripPrice: Number(e.target.value) })}
                        className={`h-8 text-right text-xs font-mono ${noSpinnerClass}`}
                        required
                      />
                      <span className="block text-[9px] text-right text-muted-foreground">
                        {isTablet ? "₹/Strip" : `₹/${getItemUnitLabel(line.itemType)}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Discount */}
                <div className="md:col-span-1">
                  <label className="text-[10px] font-semibold text-muted-foreground md:hidden">Disc (₹)</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.discount || ""}
                    onChange={(e) => updateLine(index, { discount: Number(e.target.value) })}
                    placeholder="0.00"
                    className={`h-10 text-right text-xs font-mono ${noSpinnerClass}`}
                  />
                </div>

                {/* Line Total & Delete */}
                <div className="flex items-center justify-between gap-2 md:col-span-2 md:justify-end">
                  <div className="text-right font-mono text-sm font-bold text-foreground">
                    ₹{lineNet.toFixed(2)}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10"
                    disabled={lines.length === 1}
                    onClick={() => setLines((current) => current.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Footer */}
      <div className="flex flex-col gap-4 rounded-xl border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-2 gap-4 text-xs sm:flex sm:items-center sm:gap-8">
          <div className="flex flex-col">
            <span className="text-muted-foreground">Total Items</span>
            <span className="text-sm font-semibold">{lines.length}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">Total Units</span>
            <span className="text-sm font-semibold">{summary.totalUnits}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">Total Discount</span>
            <span className="text-sm font-semibold text-emerald-600">-₹{summary.totalDiscount.toFixed(2)}</span>
          </div>
          <div className="flex flex-col border-t pt-2 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            <span className="text-xs uppercase font-medium text-muted-foreground">Grand Total</span>
            <span className="font-mono text-xl font-bold text-primary">₹{summary.netTotal.toFixed(2)}</span>
          </div>
        </div>

        <Button disabled={saving} size="lg" className="w-full sm:w-auto font-semibold">
          {saving ? "Generating Bill..." : "Generate & Print Invoice"}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs font-medium text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </form>
  );
}