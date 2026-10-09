"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { rateSheetClient, RateSheetWithRelations } from "@/lib/api-client";
import { ReadOnlyBanner } from "@/components/shared/read-only-banner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Calendar,
  Sparkles,
  Hotel as HotelIcon,
  Truck,
  Edit2,
  Trash2,
  MoreVertical,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { formatCurrency } from "@/lib/costing-engine";
import { toast } from "sonner";
import { isValidDecimal, isValidInteger } from "@/lib/validation/field-validators";

export default function RateSheetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  // Data states
  const [rateSheet, setRateSheet] = React.useState<RateSheetWithRelations | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = React.useState(false);
  const [confirmAction, setConfirmAction] = React.useState<{
    title: string;
    description: string;
    confirmText: string;
    variant?: "destructive" | "default" | "warning";
    action: () => Promise<void>;
  } | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);

  // Edit Rate Modal State
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editName, setEditName] = React.useState("");
  const [editSeasonName, setEditSeasonName] = React.useState("");
  const [editValidFrom, setEditValidFrom] = React.useState("");
  const [editValidTo, setEditValidTo] = React.useState("");
  const [editCostPrice, setEditCostPrice] = React.useState("0");
  const [editExtraAdultRate, setEditExtraAdultRate] = React.useState("");
  const [editExtraChildRate, setEditExtraChildRate] = React.useState("");
  const [editPriority, setEditPriority] = React.useState(0);
  const [editTaxPercentage, setEditTaxPercentage] = React.useState(0);
  const [editNotes, setEditNotes] = React.useState("");
  const [savingEdit, setSavingEdit] = React.useState(false);

  // Load rate sheet
  const loadRateSheet = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await rateSheetClient.getRateSheet(id);
      if (res.success && res.data) {
        setRateSheet(res.data);
        // Pre-fill edit form
        setEditName(res.data.name || "");
        setEditSeasonName(res.data.seasonName || "");
        setEditValidFrom(
          res.data.validFrom ? new Date(res.data.validFrom).toISOString().split("T")[0] : ""
        );
        setEditValidTo(
          res.data.validTo ? new Date(res.data.validTo).toISOString().split("T")[0] : ""
        );
        setEditCostPrice(String(res.data.costPrice || 0));
        setEditExtraAdultRate(res.data.extraAdultRate ? String(res.data.extraAdultRate) : "");
        setEditExtraChildRate(res.data.extraChildRate ? String(res.data.extraChildRate) : "");
        setEditPriority(res.data.priority || 0);
        setEditTaxPercentage(res.data.taxPercentage ? Number(res.data.taxPercentage) : 0);
        setEditNotes(res.data.notes || "");
      }
    } catch (err: any) {
      if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
        setIsReadOnly(true);
      }
      setError(err?.message || "Failed to load rate sheet.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    if (id) loadRateSheet();
  }, [id, loadRateSheet]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      toast.error("Subscription expired. Read-only mode is active.");
      return;
    }

    if (!editName.trim()) {
      toast.error("Rate sheet name is required.");
      return;
    }

    if (!isValidDecimal(editCostPrice, { min: 0 })) {
      toast.error("Room Cost Rate must be a valid non-negative amount.");
      return;
    }

    if (editExtraAdultRate && !isValidDecimal(editExtraAdultRate, { min: 0 })) {
      toast.error("Extra Adult Rate must be a valid non-negative amount.");
      return;
    }

    if (editExtraChildRate && !isValidDecimal(editExtraChildRate, { min: 0 })) {
      toast.error("Extra Child Rate must be a valid non-negative amount.");
      return;
    }

    if (!isValidInteger(editPriority, { min: 0, max: 1000 })) {
      toast.error("Priority weight must be a whole number between 0 and 1000.");
      return;
    }

    if (!isValidDecimal(editTaxPercentage, { min: 0, max: 100 })) {
      toast.error("Supplier Tax percentage must be between 0 and 100.");
      return;
    }

    try {
      setSavingEdit(true);
      const res = await rateSheetClient.updateRateSheet(id, {
        name: editName.trim(),
        seasonName: editSeasonName.trim() || null,
        validFrom: new Date(editValidFrom),
        validTo: new Date(editValidTo),
        costPrice: Number(editCostPrice),
        extraAdultRate: editExtraAdultRate ? Number(editExtraAdultRate) : null,
        extraChildRate: editExtraChildRate ? Number(editExtraChildRate) : null,
        priority: Number(editPriority),
        taxPercentage: Number(editTaxPercentage),
        notes: editNotes.trim() || null,
      });

      if (res.success) {
        toast.success("Rate sheet updated successfully!");
        setIsEditOpen(false);
        await loadRateSheet();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update rate sheet.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleArchive = () => {
    if (isReadOnly) {
      toast.error("Subscription expired. Read-only mode is active.");
      return;
    }

    if (!rateSheet) return;
    setConfirmAction({
      title: "Archive rate sheet?",
      description: `Archive rate sheet "${rateSheet.name}"? Historical quotation records will remain safe.`,
      confirmText: "Archive Rate Sheet",
      variant: "destructive",
      action: async () => {
        try {
          setActionLoading(true);
          await rateSheetClient.archiveRateSheet(id);
          toast.success(`Rate sheet ${rateSheet.name} archived.`);
          setConfirmAction(null);
          router.push("/rate-sheets");
        } catch (err: any) {
          toast.error(getErrorMessage(err, "We couldn't archive the rate sheet. Please try again."));
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const formatDateDisplay = (date: Date | string | null | undefined) => {
    if (!date) return "—";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-slate-50/50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
        <h3 className="text-xs font-bold text-slate-700">Loading rate sheet details...</h3>
      </div>
    );
  }

  if (error || !rateSheet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-slate-50/50">
        <AlertTriangle className="h-12 w-12 text-slate-400 mb-3" />
        <h3 className="text-lg font-bold text-slate-800">Rate Sheet Not Found</h3>
        <p className="text-xs text-slate-500 max-w-md mt-1">
          {error || "The requested rate sheet does not exist or has been archived."}
        </p>
        <Link href="/rate-sheets" className="mt-4">
          <Button variant="outline" size="sm" className="bg-white border-slate-200 cursor-pointer">
            Back to Rate Sheets
          </Button>
        </Link>
      </div>
    );
  }

  const isExpired = new Date(rateSheet.validTo) < new Date();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-8 space-y-4 sm:space-y-6">
        {/* Read-Only Banner */}
        {isReadOnly && <ReadOnlyBanner moduleName="Rate Sheet Detail" />}

        {/* Top Hero Command Header */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-6 shadow-xs relative overflow-hidden space-y-4 sm:space-y-5">
          <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-purple-50/70 via-purple-50/20 to-transparent pointer-events-none" />

          {/* Breadcrumb & Badges */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 z-10">
            <Link
              href="/rate-sheets"
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </Link>
            <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold tracking-wide uppercase bg-purple-50 text-purple-700 border border-purple-100 whitespace-nowrap">
              <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-purple-500" />
              Hotel Tariff
            </span>
            <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded whitespace-nowrap">
              {rateSheet.rateSheetNumber || "RAT-LEGACY"}
            </span>
            <Badge
              variant="outline"
              className={`text-[9px] sm:text-[10px] font-bold whitespace-nowrap px-1.5 sm:px-2.5 ${
                isExpired
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : rateSheet.status === "ACTIVE"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              {isExpired ? "EXPIRED" : rateSheet.status}
            </Badge>
          </div>

          {/* Main Info Row */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 z-10">
            <div className="flex items-start gap-3 sm:gap-4 min-w-0">
              <div className="h-11 w-11 sm:h-16 sm:w-16 rounded-xl sm:rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold border border-purple-100 shadow-2xs shrink-0">
                <HotelIcon className="h-5 w-5 sm:h-8 sm:w-8" />
              </div>

              <div className="space-y-1.5 min-w-0 flex-1">
                <h1 className="text-base sm:text-xl lg:text-2xl font-black text-slate-900 tracking-tight leading-snug sm:leading-tight break-words">
                  {rateSheet.name}
                </h1>

                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-600">
                  <span className="flex items-center gap-1 font-semibold text-slate-800">
                    <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="break-words">{formatDateDisplay(rateSheet.validFrom)} → {formatDateDisplay(rateSheet.validTo)}</span>
                  </span>

                  {rateSheet.seasonName && (
                    <span className="inline-flex items-center gap-1 text-slate-700 font-medium before:content-['•'] before:mr-1 before:text-slate-300">
                      {rateSheet.seasonName}
                    </span>
                  )}

                  {rateSheet.supplier && (
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-700 before:content-['•'] before:mr-1 before:text-slate-300">
                      <Truck className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      <span className="break-words">{rateSheet.supplier.name}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1 lg:pt-0 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(true)}
                disabled={isReadOnly}
                className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-9 rounded-xl shadow-2xs cursor-pointer gap-1.5"
              >
                <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                Edit Rate Sheet
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white hover:bg-slate-50 border-slate-200 h-9 w-9 p-0 rounded-xl shadow-2xs cursor-pointer"
                    >
                      <MoreVertical className="h-4 w-4 text-slate-500" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="w-44 bg-white border border-slate-200 rounded-xl p-1 text-xs">
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onClick={handleArchive}
                      disabled={isReadOnly}
                      className="text-rose-600 hover:bg-rose-50 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2 text-rose-500" />
                      Archive Rate
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Pricing Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
            <span className="text-[11px] uppercase font-bold text-slate-400">Primary Purchase Rate</span>
            <h3 className="text-xl sm:text-2xl font-black text-emerald-700">
              {formatCurrency(Number(rateSheet.costPrice))}
              <span className="text-xs text-slate-500 font-normal"> / room / night</span>
            </h3>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
            <span className="text-[11px] uppercase font-bold text-slate-400">Resolution Priority</span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
              Priority: {rateSheet.priority}
            </h3>
            <p className="text-[11px] text-slate-500">Higher priority overrides generic dates</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
            <span className="text-[11px] uppercase font-bold text-slate-400">Supplier Tax (%)</span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">
              {Number(rateSheet.taxPercentage || 0)}%
            </h3>
            <p className="text-[11px] text-slate-500">Inclusive supplier-side tax</p>
          </div>
        </div>

        {/* Configuration Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Linked Inventory details */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
              Contracted Hotel Resource
            </h3>

            <div className="space-y-3 text-xs">
              {rateSheet.hotel ? (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Hotel Property</span>
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-bold text-slate-900 text-sm">{rateSheet.hotel.name}</span>
                    <Link href={`/hotels/${rateSheet.hotel.id}`} className="text-indigo-600 hover:underline text-xs font-semibold">
                      View Hotel
                    </Link>
                  </div>
                  <p className="text-slate-600 mt-1">
                    Room: <strong>{rateSheet.roomType || "Standard Room"}</strong> • Meal: <strong>{rateSheet.mealPlan || "CP"}</strong>
                  </p>
                </div>
              ) : (
                <p className="text-slate-500 italic">No specific hotel linked.</p>
              )}

              {/* Extra rates Breakdown */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Extra Adult Rate</span>
                  <p className="font-bold text-slate-800">
                    {rateSheet.extraAdultRate ? formatCurrency(Number(rateSheet.extraAdultRate)) : "—"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Extra Child Rate</span>
                  <p className="font-bold text-slate-800">
                    {rateSheet.extraChildRate ? formatCurrency(Number(rateSheet.extraChildRate)) : "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Supplier & Contractual Notes */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
              Supplier & Contractual Terms
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Supplier / Vendor Partner</span>
                {rateSheet.supplier ? (
                  <div className="pt-1">
                    <h4 className="font-bold text-slate-900">{rateSheet.supplier.name}</h4>
                    <span className="text-[11px] text-slate-500 font-mono">{rateSheet.supplier.supplierCode}</span>
                  </div>
                ) : (
                  <p className="text-slate-700 font-semibold pt-1">Direct Hotel / In-House Inventory</p>
                )}
              </div>

              {rateSheet.notes && (
                <div className="pt-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Contract Notes & Remarks</span>
                  <p className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-700 mt-1 leading-relaxed whitespace-pre-wrap">
                    {rateSheet.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── EDIT RATE SHEET MODAL ─── */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="bg-white border border-slate-200 rounded-2xl max-w-lg p-6 shadow-xl">
            <form onSubmit={handleEditSubmit}>
              <DialogHeader>
                <DialogTitle className="text-slate-900 font-bold text-base flex items-center gap-2">
                  <Edit2 className="h-4 w-4 text-indigo-600" />
                  <span>Edit Rate Sheet</span>
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-xs mt-1">
                  Modify tariff pricing, seasonal validity, and priority for {rateSheet.name}.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5 mt-4 text-xs max-h-[60vh] overflow-y-auto pr-1">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Tariff Title *</label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs font-semibold"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Season Name</label>
                    <Input
                      value={editSeasonName}
                      onChange={(e) => setEditSeasonName(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Priority Weight</label>
                    <Input
                      type="number"
                      value={editPriority}
                      onChange={(e) => setEditPriority(Number(e.target.value))}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Valid From *</label>
                    <Input
                      type="date"
                      value={editValidFrom}
                      onChange={(e) => setEditValidFrom(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Valid To *</label>
                    <Input
                      type="date"
                      value={editValidTo}
                      onChange={(e) => setEditValidTo(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Cost Price (₹) *</label>
                    <Input
                      type="number"
                      value={editCostPrice}
                      onChange={(e) => setEditCostPrice(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs font-bold text-emerald-700"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Tax Percentage (%)</label>
                    <Input
                      type="number"
                      value={editTaxPercentage}
                      onChange={(e) => setEditTaxPercentage(Number(e.target.value))}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Extra Adult (₹)</label>
                    <Input
                      type="number"
                      value={editExtraAdultRate}
                      onChange={(e) => setEditExtraAdultRate(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Extra Child (₹)</label>
                    <Input
                      type="number"
                      value={editExtraChildRate}
                      onChange={(e) => setEditExtraChildRate(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Remarks & Notes</label>
                  <Textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={2}
                    className="bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="mt-6 flex justify-end gap-2.5">
                <DialogClose
                  render={
                    <Button type="button" variant="outline" size="sm" className="bg-white border-slate-200 text-xs font-semibold rounded-xl">
                      Cancel
                    </Button>
                  }
                />
                <Button
                  type="submit"
                  disabled={savingEdit}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 rounded-xl"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog */}
        <ConfirmDialog
          open={confirmAction !== null}
          onOpenChange={(open) => {
            if (!open && !actionLoading) setConfirmAction(null);
          }}
          title={confirmAction?.title || ""}
          description={confirmAction?.description || ""}
          confirmText={confirmAction?.confirmText || "Confirm"}
          variant={confirmAction?.variant || "destructive"}
          loading={actionLoading}
          onConfirm={async () => {
            if (confirmAction?.action) {
              await confirmAction.action();
            }
          }}
        />
      </div>
    </div>
  );
}
