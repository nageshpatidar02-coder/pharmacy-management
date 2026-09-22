"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function LiveFilterForm({ children, fields }: { children: React.ReactNode; fields: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fieldKey = fields.join(",");
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((field) => [field, searchParams.get(field) ?? ""])));
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      fieldKey.split(",").forEach((field) => values[field] ? params.set(field, values[field]) : params.delete(field));
      const nextUrl = `${pathname}?${params.toString()}`;
      if (`${pathname}?${searchParams.toString()}` !== nextUrl) router.replace(nextUrl, { scroll: false });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [fieldKey, pathname, router, searchParams, values]);
  return <form onSubmit={(event) => event.preventDefault()} onChange={(event) => { const target = event.target; if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLSelectElement)) return; if (fields.includes(target.name)) setValues((current) => ({ ...current, [target.name]: target.value })); }} className="mt-4">{children}</form>;
}
