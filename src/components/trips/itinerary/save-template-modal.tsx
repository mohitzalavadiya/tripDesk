import { Button } from "@/components/ui/button";
import {
Dialog,
DialogClose,
DialogContent,
DialogDescription,
DialogFooter,
DialogHeader,
DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
Select,
SelectContent,
SelectItem,
SelectTrigger,
SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BookmarkPlus,Loader2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

interface SaveTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  defaultType?: "DAY" | "PACKAGE";
  defaultSourceDay?: number | null;
  destinations: Array<{ id: string; name: string }>;
  totalDays: number;
  itineraryClient: any;
}

export function SaveTemplateModal({
  open,
  onOpenChange,
  tripId,
  defaultType = "DAY",
  defaultSourceDay = 1,
  destinations,
  totalDays,
  itineraryClient,
}: SaveTemplateModalProps) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [type, setType] = React.useState<"DAY" | "PACKAGE">(defaultType);
  const [sourceDay, setSourceDay] = React.useState<number>(defaultSourceDay || 1);
  const [destinationId, setDestinationId] = React.useState<string>("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (defaultType) setType(defaultType);
    if (defaultSourceDay) setSourceDay(defaultSourceDay);
    if (open) {
      setName(
        defaultType === "DAY"
          ? `Day ${defaultSourceDay || 1} Reusable Schedule`
          : "Full Trip Package Template"
      );
      setDescription("");
      setDestinationId("");
    }
  }, [open, defaultType, defaultSourceDay]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a template name.");
      return;
    }

    try {
      setSaving(true);
      await itineraryClient.saveAsTemplate(tripId, {
        name: name.trim(),
        description: description.trim() || undefined,
        destinationId: destinationId || undefined,
        type,
        sourceDayNumber: type === "DAY" ? sourceDay : undefined,
      });

      toast.success(
        type === "DAY"
          ? `Day ${sourceDay} saved as template "${name}".`
          : `Trip saved as package template "${name}".`
      );
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save template.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BookmarkPlus className="h-4 w-4 text-indigo-600" />
            Save to Template Library
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Save this itinerary content as a reusable template for future quotes and trips.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-3.5 mt-2 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Template Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("DAY")}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold cursor-pointer text-center transition-all ${
                  type === "DAY"
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Single Day
              </button>
              <button
                type="button"
                onClick={() => setType("PACKAGE")}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold cursor-pointer text-center transition-all ${
                  type === "PACKAGE"
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Multi-Day Package
              </button>
            </div>
          </div>

          {type === "DAY" && (
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Source Day
              </label>
              <Select
                value={String(sourceDay)}
                onValueChange={(val) => setSourceDay(Number(val))}
              >
                <SelectTrigger className="h-9 text-xs bg-white border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={String(day)}>
                      Day {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Template Name <span className="text-rose-500">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Bali Culture & Waterfalls Day Tour"
              className="h-9 text-xs bg-white border-slate-200"
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Destination (Optional)
            </label>
            <Select
              value={destinationId || "none"}
              onValueChange={(val) => setDestinationId(val === "none" || !val ? "" : val)}
            >
              <SelectTrigger className="h-9 text-xs bg-white border-slate-200">
                <SelectValue placeholder="All destinations / None" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="none">None (Universal)</SelectItem>
                {destinations.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Description (Optional)
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Summary of this template, recommended traveler profiles, or key inclusions..."
              rows={3}
              className="text-xs bg-white border-slate-200 resize-none"
            />
          </div>

          <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving || !name.trim()}
              className="h-8 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Saving...
                </>
              ) : (
                "Save Template"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
