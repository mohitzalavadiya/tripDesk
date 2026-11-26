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
import {
itineraryTemplateClient,
ItineraryTemplateWithDestination,
} from "@/lib/api-client";
import { ItineraryTemplateType } from "@prisma/client";
import {
AlertTriangle,
Building2,
Calendar,
CheckCircle2,
FileText,
Loader2,
MapPin,
Search,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

interface TemplatePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  targetDayNumber?: number | null;
  modeFilter?: ItineraryTemplateType;
  onApplied: () => Promise<void>;
  itineraryClient: any;
}

export function TemplatePickerModal({
  open,
  onOpenChange,
  tripId,
  targetDayNumber,
  modeFilter,
  onApplied,
  itineraryClient,
}: TemplatePickerModalProps) {
  const [templates, setTemplates] = React.useState<ItineraryTemplateWithDestination[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [selectedType, setSelectedType] = React.useState<ItineraryTemplateType>(
    modeFilter || ItineraryTemplateType.DAY
  );
  const [selectedTemplate, setSelectedTemplate] = React.useState<ItineraryTemplateWithDestination | null>(null);
  const [packageMode, setPackageMode] = React.useState<"APPEND" | "REPLACE">("APPEND");
  const [applying, setApplying] = React.useState(false);

  React.useEffect(() => {
    if (modeFilter) {
      setSelectedType(modeFilter);
    }
  }, [modeFilter]);

  const loadTemplates = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await itineraryTemplateClient.getTemplates({
        type: selectedType,
        search: search.trim() || undefined,
      });
      setTemplates(res.data || []);
      setSelectedTemplate(null);
    } catch {
      toast.error("Failed to load templates.");
    } finally {
      setLoading(false);
    }
  }, [selectedType, search]);

  React.useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open, loadTemplates]);

  const handleApply = async () => {
    if (!selectedTemplate) return;

    try {
      setApplying(true);
      if (selectedTemplate.type === ItineraryTemplateType.DAY) {
        if (!targetDayNumber) {
          toast.error("Please specify which day to apply this template to.");
          return;
        }
        await itineraryClient.applyDayTemplate(tripId, {
          templateId: selectedTemplate.id,
          targetDayNumber,
        });
        toast.success(`Day template applied to Day ${targetDayNumber}.`);
      } else {
        // PACKAGE TEMPLATE
        await itineraryClient.applyPackageTemplate(tripId, {
          templateId: selectedTemplate.id,
          mode: packageMode,
        });
        toast.success(
          packageMode === "REPLACE"
            ? "Package applied: itinerary replaced successfully."
            : "Package applied: days appended successfully."
        );
      }

      onOpenChange(false);
      await onApplied();
    } catch (err: any) {
      toast.error(err?.message || "Failed to apply template.");
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 overflow-hidden bg-white">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-600" />
            {targetDayNumber
              ? `Apply Day Template to Day ${targetDayNumber}`
              : "Apply Reusable Itinerary Template"}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Select a verified template from your agency library. Content will be copied independently into this trip.
          </DialogDescription>
        </DialogHeader>

        {/* Type Filter Buttons */}
        {!modeFilter && (
          <div className="flex items-center gap-2 pt-2 border-b border-slate-100 pb-3">
            <button
              type="button"
              onClick={() => setSelectedType(ItineraryTemplateType.DAY)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                selectedType === ItineraryTemplateType.DAY
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Day Templates
            </button>
            <button
              type="button"
              onClick={() => setSelectedType(ItineraryTemplateType.PACKAGE)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                selectedType === ItineraryTemplateType.PACKAGE
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Multi-Day Packages
            </button>
          </div>
        )}

        {/* Template List & Selection */}
        <div className="flex-1 overflow-y-auto min-h-[220px] max-h-[360px] py-2 space-y-2.5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin mb-2" />
              <p className="text-xs">Loading templates...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-10 px-4 text-slate-400 space-y-1">
              <p className="text-xs font-medium">No templates found in this category.</p>
              <p className="text-[11px] text-slate-400">
                You can save any day or package from your trips using "Save as Template".
              </p>
            </div>
          ) : (
            templates.map((tpl) => {
              const isSelected = selectedTemplate?.id === tpl.id;
              return (
                <div
                  key={tpl.id}
                  onClick={() => setSelectedTemplate(tpl)}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? "border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600 shadow-xs"
                      : "border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-slate-800 break-words">
                          {tpl.name}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {tpl.type === "DAY" ? "1 Day" : `${tpl.dayCount} Days`}
                        </span>
                        {tpl.destination && (
                          <span className="text-[10px] font-medium text-slate-500 flex items-center gap-0.5">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            {tpl.destination.name}
                          </span>
                        )}
                      </div>
                      {tpl.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                          {tpl.description}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Package Mode Choice if PACKAGE selected */}
        {selectedTemplate?.type === ItineraryTemplateType.PACKAGE && (
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              Package Application Mode:
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPackageMode("APPEND")}
                className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                  packageMode === "APPEND"
                    ? "border-indigo-600 bg-indigo-50/50 text-indigo-900 font-semibold"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="font-bold">Append Days</div>
                <div className="text-[10px] text-slate-500 font-normal">
                  Attaches {selectedTemplate.dayCount} days after the current schedule.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPackageMode("REPLACE")}
                className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                  packageMode === "REPLACE"
                    ? "border-rose-500 bg-rose-50/50 text-rose-900 font-semibold"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="font-bold text-rose-700">Replace Itinerary</div>
                <div className="text-[10px] text-slate-500 font-normal">
                  Replaces all current days with this package.
                </div>
              </button>
            </div>

            {packageMode === "REPLACE" && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Destructive Replacement:</strong> All current itinerary schedule items will be deleted and replaced. Hotel bookings, vehicles, and activities are preserved.
                </span>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
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
            type="button"
            size="sm"
            disabled={!selectedTemplate || applying}
            onClick={handleApply}
            className={`h-8 text-xs font-semibold text-white ${
              packageMode === "REPLACE" && selectedTemplate?.type === "PACKAGE"
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {applying ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Applying...
              </>
            ) : packageMode === "REPLACE" && selectedTemplate?.type === "PACKAGE" ? (
              "Confirm & Replace Itinerary"
            ) : (
              "Apply Template"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
