import * as React from "react";

import { cn } from "@/lib/utils";

type InputProps = React.ComponentProps<"input"> & { allowNegative?: boolean };

export function Input({ className, type, allowNegative = false, min, value, defaultValue, onChange, onKeyDown, onPaste, ...props }: InputProps) {
  const isNonNegativeNumber = type === "number" && !allowNegative;
  const visibleValue = isNonNegativeNumber && (value === 0 || value === "0") ? "" : value;
  const visibleDefaultValue = isNonNegativeNumber && (defaultValue === 0 || defaultValue === "0") ? "" : defaultValue;

  return <input
    type={type}
    min={isNonNegativeNumber ? min ?? 0 : min}
    className={cn("flex h-10 w-full rounded-md border bg-surface px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50", className)}
    {...props}
    {...(value !== undefined ? { value: visibleValue } : { defaultValue: visibleDefaultValue })}
    onKeyDown={(event) => {
      if (isNonNegativeNumber && event.key === "-") event.preventDefault();
      onKeyDown?.(event);
    }}
    onPaste={(event) => {
      if (isNonNegativeNumber && /^\s*-/.test(event.clipboardData.getData("text"))) event.preventDefault();
      onPaste?.(event);
    }}
    onChange={(event) => {
      if (isNonNegativeNumber && Number(event.currentTarget.value) < 0) event.currentTarget.value = "";
      onChange?.(event);
    }}
  />;
}
