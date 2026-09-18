"use client";

import * as React from "react";
import { destinationClient } from "@/lib/api-client";
import { Destination } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Loader2 } from "lucide-react";

interface DestinationSelectProps {
  value?: string | null;
  onChange: (value: string) => void;
  initialDestination?: {
    id: string;
    name: string;
    state?: string | null;
    country?: string;
    status?: string;
  } | null;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean | string;
  className?: string;
}

export function DestinationSelect({
  value,
  onChange,
  initialDestination,
  placeholder = "Select destination...",
  disabled = false,
  error,
  className,
}: DestinationSelectProps) {
  const [destinations, setDestinations] = React.useState<Destination[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    async function loadDestinations() {
      try {
        setLoading(true);
        setLoadError(null);
        const res = await destinationClient.getDestinations({
          status: "ACTIVE",
          limit: 200,
        });

        if (isMounted && res.success && res.data) {
          let list = res.data;

          // If current initial destination is not in active list (e.g., inactive legacy destination), prepend it so selection is preserved
          if (
            initialDestination &&
            !list.some((d) => d.id === initialDestination.id)
          ) {
            list = [
              {
                id: initialDestination.id,
                agencyId: "",
                name: `${initialDestination.name}${
                  initialDestination.status === "INACTIVE" ? " (Inactive)" : ""
                }`,
                country: initialDestination.country || "India",
                state: initialDestination.state || null,
                cityArea: null,
                status: (initialDestination.status as any) || "INACTIVE",
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              ...list,
            ];
          }

          setDestinations(list);
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

    loadDestinations();

    return () => {
      isMounted = false;
    };
  }, [initialDestination]);

  const hasError = Boolean(error);

  return (
    <Select
      value={value || "NONE"}
      onValueChange={(val: string | null) => {
        onChange(val === "NONE" || !val ? "" : val);
      }}
      disabled={disabled || loading}
    >
      <SelectTrigger
        className={`h-9.5 text-xs bg-slate-50/50 border-slate-200 focus-visible:ring-indigo-500 cursor-pointer ${
          hasError ? "border-red-500 focus-visible:ring-red-500" : ""
        } ${className || ""}`}
      >
        <div className="flex items-center gap-1.5 truncate">
          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          {loading ? (
            <span className="flex items-center gap-1 text-slate-400">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading destinations...
            </span>
          ) : (
            <SelectValue placeholder={placeholder}>
              {(val: any) => {
                if (!val || val === "NONE") return undefined;
                const match =
                  destinations.find((d) => d.id === val) ||
                  (initialDestination?.id === val ? initialDestination : null);
                if (match) {
                  return match.name;
                }
                return undefined;
              }}
            </SelectValue>
          )}
        </div>
      </SelectTrigger>
      <SelectContent className="max-h-60">
        <SelectItem value="NONE" className="text-xs text-slate-400">
          None (Unassigned)
        </SelectItem>
        {destinations.map((d) => (
          <SelectItem key={d.id} value={d.id} className="text-xs cursor-pointer">
            <span className="font-semibold text-slate-800">{d.name}</span>
            {d.state && <span className="text-slate-400 ml-1.5">({d.state})</span>}
          </SelectItem>
        ))}
        {destinations.length === 0 && !loading && (
          <div className="p-2 text-center text-xs text-slate-400">
            {loadError || "No destinations available."}
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
