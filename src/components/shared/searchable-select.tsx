"use client";

import { useEffect, useId, useState } from "react";

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
  disabled = false,
}: {
  options: SearchableOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  placeholder: string;
  emptyMessage?: string;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listboxId = useId();
  const selected = options.find((option) => option.id === selectedId);
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? options.filter((option) => `${option.label} ${option.searchText ?? ""}`.toLowerCase().includes(normalizedQuery))
    : options;
  const activeOptionId = activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  useEffect(() => {
    if (open && activeOptionId) {
      document.getElementById(activeOptionId)?.scrollIntoView({ block: "nearest" });
    }
  }, [activeOptionId, open]);

  function selectOption(id: string) {
    onSelect(id);
    setQuery("");
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => current < 0 ? 0 : Math.min(current + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => current < 0 ? filtered.length - 1 : Math.max(current - 1, 0));
    } else if (event.key === "Home" && open && filtered.length > 0) {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End" && open && filtered.length > 0) {
      event.preventDefault();
      setActiveIndex(filtered.length - 1);
    } else if (event.key === "Enter" && open && filtered[activeIndex]) {
      event.preventDefault();
      selectOption(filtered[activeIndex].id);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      setQuery("");
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div className="relative">
      <Input
        value={open ? query : selected?.label ?? ""}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => {
          setQuery("");
          setOpen(true);
          setActiveIndex(-1);
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setActiveIndex(0);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => window.setTimeout(() => {
          setOpen(false);
          setQuery("");
          setActiveIndex(-1);
        }, 150)}
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open ? activeOptionId : undefined}
        aria-autocomplete="list"
        autoComplete="off"
        required={!selectedId}
      />
      {open && (
        <div id={listboxId} role="listbox" className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-background shadow-lg">
          {filtered.length > 0 ? filtered.map((option) => (
            <button
              key={option.id}
              id={`${listboxId}-option-${filtered.indexOf(option)}`}
              type="button"
              role="option"
              aria-selected={option.id === selectedId}
              className={`block w-full border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-muted ${filtered[activeIndex]?.id === option.id ? "bg-muted" : ""}`}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(filtered.findIndex((entry) => entry.id === option.id))}
              onClick={() => selectOption(option.id)}
            >
              {option.label}
            </button>
          )) : <p className="p-3 text-center text-sm text-muted-foreground">{emptyMessage}</p>}
        </div>
      )}
    </div>
  );
}
