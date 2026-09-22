export type StockItemType = "TABLET" | "CAPSULE" | string;

export function unitsPerStrip(packSize?: string | number | null) {
  if (typeof packSize === "number" && Number.isFinite(packSize)) {
    return Math.max(1, Math.floor(packSize));
  }
  const match = String(packSize ?? "").match(/\d+(?:\.\d+)?/);
  return match ? Math.max(1, Math.floor(Number(match[0]))) : 1;
}

export function stockBreakdown(totalUnits: number, packSize?: string | number | null) {
  const total = Math.max(0, Math.floor(Number(totalUnits) || 0));
  const perStrip = unitsPerStrip(packSize);
  return { total, perStrip, strips: Math.floor(total / perStrip), loose: total % perStrip };
}

export function formatStock(
  totalUnits: number,
  itemType: StockItemType,
  packSize?: string | number | null,
) {
  const type = String(itemType || "OTHER").toUpperCase();
  const { total, perStrip, strips, loose } = stockBreakdown(totalUnits, packSize);
  if (type !== "TABLET" && type !== "CAPSULE") {
    return { primary: `${total} units`, secondary: null, outOfStock: total <= 0 };
  }
  const parts = [
    strips > 0 ? `${strips} Strip${strips === 1 ? "" : "s"}` : "",
    loose > 0 ? `${loose} Loose` : "",
  ].filter(Boolean);
  return {
    primary: parts.join(" + ") || "Out of Stock",
    secondary: `Total: ${total} Tabs • ${perStrip}/Strip`,
    outOfStock: total <= 0,
  };
}
