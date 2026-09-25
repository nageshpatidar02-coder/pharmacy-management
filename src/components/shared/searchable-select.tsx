"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";

type SearchableOption = {
  id: string;
  label: string;
  searchText?: string;
};

export function SearchableSelect({
  options,
  selectedId,
  onSelect,
  placeholder,
  emptyMessage = "No results found.",
}: {
  options: SearchableOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  placeholder: string;
  emptyMessage?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.id === selectedId);
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? options.filter((option) => `${option.label} ${option.searchText ?? ""}`.toLowerCase().includes(normalizedQuery))
    : options;

  return (
    <div className="relative">
      <Input
        value={open ? query : selected?.label ?? ""}
        placeholder={placeholder}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        role="combobox"
        aria-expanded={open}
        autoComplete="off"
        required={!selectedId}
      />
      {open && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-background shadow-lg">
          {filtered.length > 0 ? filtered.map((option) => (
            <button
              key={option.id}
              type="button"
              className="block w-full border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-muted"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onSelect(option.id);
                setQuery("");
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          )) : <p className="p-3 text-center text-sm text-muted-foreground">{emptyMessage}</p>}
        </div>
      )}
    </div>
  );
}
