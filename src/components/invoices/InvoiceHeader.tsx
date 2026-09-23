import Image from "next/image";

export type InvoiceSettings = {
  pharmacyName: string;
  address: string | null;
  mobile: string | null;
  email?: string | null;
  gstin: string | null;
  drugLicenseNo: string | null;
  logoUrl: string | null;
  invoicePrefix: string;
};

export function InvoiceHeader({ settings }: { settings: InvoiceSettings }) {
  return (
    <header className="invoice-header flex items-start justify-between gap-6 border-b-2 border-foreground pb-4">
      <div className="flex min-w-0 items-start gap-4">
        {settings.logoUrl ? (
          <Image src={settings.logoUrl} alt="" width={64} height={64} className="size-16 object-contain" />
        ) : null}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold uppercase tracking-tight">{settings.pharmacyName}</h1>
          {settings.address ? <p className="mt-1 whitespace-pre-line text-sm">{settings.address}</p> : null}
          {settings.mobile ? <p className="text-sm">Mobile: {settings.mobile}</p> : null}
          {settings.email ? <p className="text-sm">Email: {settings.email}</p> : null}
        </div>
      </div>
      <div className="shrink-0 text-right text-sm">
        <p><span className="font-semibold">GSTIN:</span> {settings.gstin || "-"}</p>
        <p><span className="font-semibold">D.L. No.:</span> {settings.drugLicenseNo || "-"}</p>
        <p><span className="font-semibold">Invoice Prefix:</span> {settings.invoicePrefix}</p>
      </div>
    </header>
  );
}