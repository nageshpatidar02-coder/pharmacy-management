"use client";

import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";

export function InvoiceActions() {
  return <div className="flex gap-2 print:hidden"><Button type="button" variant="outline" onClick={() => window.print()}><Printer className="size-4" /> Print / PDF</Button><Button type="button" variant="ghost" onClick={() => window.print()}><Download className="size-4" /> Download PDF</Button></div>;
}
