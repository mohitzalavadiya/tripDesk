"use client";

import * as React from "react";
import { destinationClient } from "@/lib/api-client";
import { Destination } from "@prisma/client";
import { MapPin, ChevronDown, Check, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DestinationMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  destinations?: Destination[];
  placeholder?: string;
  disabled?: boolean;
  error?: boolean | string;
  className?: string;
}

export function DestinationMultiSelect({
  value = [],
  onChange,
  destinations: propDestinations,
  placeholder = "Select destinations...",
  disabled = false,
  error,
  className,
}: DestinationMultiSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [internalDestinations, setInternalDestinations] = React.useState<Destination[]>([]);
  const [loading, setLoading] = React.useState(!propDestinations);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Load active destinations if not provided via props
  React.useEffect(() => {
    if (propDestinations) {
      setInternalDestinations(propDestinations);
      setLoading(false);
      return;
    }

    let isMounted = true;
    async function load() {
      try {
        setLoading(true);
        setLoadError(null);
        const res = await destinationClient.getDestinations({
          status: "ACTIVE",
          limit: 200,
        });
        if (isMounted && res.success && res.data) {
          setInternalDestinations(res.data);
        }
      } catch (err: any) {
        if (isMounted) {
          setLoadError(err?.message || "Failed to load destinations.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [propDestinations]);

  // Handle outside click to close dropdown
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Auto-focus search input when opened
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle Escape key
  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const activeDestinations = propDestinations || internalDestinations;

  // Filtered by search query
  const filteredDestinations = React.useMemo(() => {
    if (!search.trim()) return activeDestinations;
    const q = search.toLowerCase().trim();
    return activeDestinations.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.state && d.state.toLowerCase().includes(q)) ||
        (d.country && d.country.toLowerCase().includes(q))
    );
  }, [activeDestinations, search]);

  // Build selected names list in order of selection
  const selectedDestinationNames = React.useMemo(() => {
    return value
      .map((id) => activeDestinations.find((d) => d.id === id)?.name)
      .filter((name): name is string => Boolean(name));
  }, [value, activeDestinations]);

  // Toggle selection
  const toggleDestination = (id: string) => {
    if (value.includes(id)) {
      // Remove while preserving relative order of others
      onChange(value.filter((item) => item !== id));
    } else {
      // Append new selection to preserve selection order
      onChange([...value, id]);
    }
  };

  const displayText = React.useMemo(() => {
    if (selectedDestinationNames.length === 0) {
      return null;
    }
    return selectedDestinationNames.join(", ");
  }, [selectedDestinationNames]);

  const hasError = Boolean(error);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Dropdown Trigger */}
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "w-full h-10.5 px-3 rounded-md border text-xs text-left flex items-center justify-between gap-2 transition-all cursor-pointer select-none",
          "bg-slate-50/30 border-slate-200 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1",
          hasError && "border-red-500 focus:ring-red-500",
          disabled && "opacity-50 cursor-not-allowed bg-slate-100",
          isOpen && "ring-2 ring-indigo-500 border-indigo-500"
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
          {loading ? (
            <span className="text-slate-400 flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin text-indigo-600" /> Loading destinations...
            </span>
          ) : displayText ? (
            <span className="font-semibold text-slate-800 truncate" title={displayText}>
              {displayText}
            </span>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {value.length > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              {value.length}
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-slate-400 transition-transform duration-150",
              isOpen && "rotate-180 text-slate-600"
            )}
          />
        </div>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          className={cn(
            "absolute z-50 mt-1 w-full rounded-lg bg-white border border-slate-200 shadow-lg",
            "animate-in fade-in-0 zoom-in-95 duration-100 flex flex-col max-h-72 overflow-hidden"
          )}
          role="listbox"
          aria-multiselectable="true"
        >
          {/* Header & Search */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/50 space-y-1.5">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search destinations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-7 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-slate-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {value.length > 0 && (
              <div className="flex items-center justify-between px-1 text-[11px]">
                <span className="text-slate-500 font-medium">
                  {value.length} selected
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange([]);
                  }}
                  className="text-rose-600 font-semibold hover:underline cursor-pointer"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* Destination Items List */}
          <div className="overflow-y-auto max-h-48 p-1 divide-y divide-slate-50">
            {filteredDestinations.length === 0 ? (
              <div className="py-6 px-3 text-center text-xs text-slate-500">
                {search ? "No matching destinations found." : loadError || "No active destinations available."}
              </div>
            ) : (
              filteredDestinations.map((d) => {
                const isSelected = value.includes(d.id);
                const selectionIndex = isSelected ? value.indexOf(d.id) + 1 : null;

                return (
                  <div
                    key={d.id}
                    onClick={() => toggleDestination(d.id)}
                    className={cn(
                      "flex items-center justify-between px-2.5 py-2 rounded-md text-xs cursor-pointer select-none transition-colors",
                      isSelected
                        ? "bg-indigo-50/70 text-indigo-950 font-semibold"
                        : "hover:bg-slate-50 text-slate-700"
                    )}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Checkbox */}
                      <div
                        className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                          isSelected
                            ? "bg-indigo-600 border-indigo-600 text-white"
                            : "border-slate-300 bg-white"
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>

                      {/* Name & State */}
                      <div className="truncate flex-1">
                        <span className="truncate block font-medium">{d.name}</span>
                        {d.state && (
                          <span className="text-[10px] text-slate-400 block truncate font-normal">
                            {d.state}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Order indicator */}
                    {isSelected && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 ml-2 shrink-0">
                        #{selectionIndex}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
