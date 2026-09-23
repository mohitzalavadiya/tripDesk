"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Destination, DestinationStatus } from "@prisma/client";
import { destinationClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/utils";
import { Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";

interface DestinationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destination?: Destination | null;
  onSuccess?: () => void;
  isReadOnly?: boolean;
}

export function DestinationDialog({
  open,
  onOpenChange,
  destination,
  onSuccess,
  isReadOnly = false,
}: DestinationDialogProps) {
  const isEdit = Boolean(destination);

  const [name, setName] = React.useState("");
  const [country, setCountry] = React.useState("India");
  const [state, setState] = React.useState("");
  const [cityArea, setCityArea] = React.useState("");
  const [status, setStatus] = React.useState<DestinationStatus>(DestinationStatus.ACTIVE);
  const [submitting, setSubmitting] = React.useState(false);

  // Sync state when dialog opens or destination changes
  React.useEffect(() => {
    if (open) {
      if (destination) {
        setName(destination.name || "");
        setCountry(destination.country || "India");
        setState(destination.state || "");
        setCityArea(destination.cityArea || "");
        setStatus(destination.status || DestinationStatus.ACTIVE);
      } else {
        setName("");
        setCountry("India");
        setState("");
        setCityArea("");
        setStatus(DestinationStatus.ACTIVE);
      }
    }
  }, [open, destination]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isReadOnly) {
      toast.error("Subscription expired. Modifications are restricted to read-only mode.");
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Destination name is required.");
      return;
    }

    if (trimmedName.length > 100) {
      toast.error("Destination name must be 100 characters or less.");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        name: trimmedName,
        country: country.trim() || "India",
        state: state.trim() || undefined,
        cityArea: cityArea.trim() || undefined,
        status,
      };

      if (isEdit && destination) {
        await destinationClient.updateDestination(destination.id, payload);
        toast.success(`Destination "${trimmedName}" updated successfully.`);
      } else {
        await destinationClient.createDestination(payload);
        toast.success(`Destination "${trimmedName}" created successfully.`);
      }

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(getErrorMessage(err, isEdit ? "Failed to update destination." : "Failed to create destination."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 shrink-0">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                {isEdit ? "Edit Destination" : "Add Destination"}
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            {isEdit
              ? "Update destination geographic details and operational status."
              : "Register a new travel destination master for hotels, activities, and itinerary planning."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Destination Name */}
          <div className="space-y-1.5">
            <Label htmlFor="dest-name" className="text-xs font-semibold text-slate-700">
              Destination Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="dest-name"
              placeholder="e.g. Manali, Goa, Jaipur, Srinagar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-xs h-9"
              maxLength={100}
              autoFocus
              required
              disabled={submitting || isReadOnly}
            />
          </div>

          {/* State / Region & Country */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dest-state" className="text-xs font-semibold text-slate-700">
                State / Province
              </Label>
              <Input
                id="dest-state"
                placeholder="e.g. Himachal Pradesh"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="text-xs h-9"
                maxLength={100}
                disabled={submitting || isReadOnly}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dest-country" className="text-xs font-semibold text-slate-700">
                Country
              </Label>
              <Input
                id="dest-country"
                placeholder="e.g. India"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="text-xs h-9"
                maxLength={100}
                disabled={submitting || isReadOnly}
              />
            </div>
          </div>

          {/* City / Area / Sub-region */}
          <div className="space-y-1.5">
            <Label htmlFor="dest-city" className="text-xs font-semibold text-slate-700">
              City / Specific Area <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
            </Label>
            <Input
              id="dest-city"
              placeholder="e.g. Old Manali, North Goa, Candolim"
              value={cityArea}
              onChange={(e) => setCityArea(e.target.value)}
              className="text-xs h-9"
              maxLength={100}
              disabled={submitting || isReadOnly}
            />
          </div>

          {/* Status (For Edit mode and toggleable on Create) */}
          <div className="space-y-1.5">
            <Label htmlFor="dest-status" className="text-xs font-semibold text-slate-700">
              Operational Status
            </Label>
            <Select
              value={status}
              onValueChange={(val) => {
                if (val) setStatus(val as DestinationStatus);
              }}
              disabled={submitting || isReadOnly}
            >
              <SelectTrigger id="dest-status" className="text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DestinationStatus.ACTIVE} className="text-xs">
                  Active (Available across system)
                </SelectItem>
                <SelectItem value={DestinationStatus.INACTIVE} className="text-xs">
                  Inactive (Hidden from new selections)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-8 px-3 rounded-lg"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="text-xs h-8 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              disabled={submitting || isReadOnly || !name.trim()}
            >
              {submitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Destination"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
