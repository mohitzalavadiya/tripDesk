"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { rateSheetClient, RateSheetWithRelations } from "@/lib/api-client";
import { ReadOnlyBanner } from "@/components/shared/read-only-banner";
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
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  FileSpreadsheet,
  Calendar,
  Sparkles,
  Hotel as HotelIcon,
  Car,
  Ticket,
  Truck,
  IndianRupee,
  Edit2,
  Trash2,
  MoreVertical,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { formatCurrency } from "@/lib/costing-engine";
import { toast } from "sonner";

export default function RateSheetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  // Data states
  const [rateSheet, setRateSheet] = React.useState<RateSheetWithRelations | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = React.useState(false);

  // Edit Rate Modal State
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editName, setEditName] = React.useState("");
  const [editSeasonName, setEditSeasonName] = React.useState("");
  const [editValidFrom, setEditValidFrom] = React.useState("");
  const [editValidTo, setEditValidTo] = React.useState("");
  const [editCostPrice, setEditCostPrice] = React.useState("0");
  const [editExtraAdultRate, setEditExtraAdultRate] = React.useState("");
  const [editExtraChildRate, setEditExtraChildRate] = React.useState("");
  const [editRatePerKm, setEditRatePerKm] = React.useState("");
  const [editMinimumKm, setEditMinimumKm] = React.useState("");
  const [editTotalRate, setEditTotalRate] = React.useState("");
  const [editDriverAllowance, setEditDriverAllowance] = React.useState("");
  const [editNightAllowance, setEditNightAllowance] = React.useState("");
  const [editAdultCost, setEditAdultCost] = React.useState("");
  const [editChildCost, setEditChildCost] = React.useState("");
  const [editInfantCost, setEditInfantCost] = React.useState("");
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
        setEditRatePerKm(res.data.ratePerKm ? String(res.data.ratePerKm) : "");
        setEditMinimumKm(res.data.minimumKm ? String(res.data.minimumKm) : "");
        setEditTotalRate(res.data.totalRate ? String(res.data.totalRate) : "");
        setEditDriverAllowance(res.data.driverAllowance ? String(res.data.driverAllowance) : "");
        setEditNightAllowance(res.data.nightAllowance ? String(res.data.nightAllowance) : "");
        setEditAdultCost(res.data.adultCost ? String(res.data.adultCost) : "");
        setEditChildCost(res.data.childCost ? String(res.data.childCost) : "");
        setEditInfantCost(res.data.infantCost ? String(res.data.infantCost) : "");
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
        ratePerKm: editRatePerKm ? Number(editRatePerKm) : null,
        minimumKm: editMinimumKm ? Number(editMinimumKm) : null,
        totalRate: editTotalRate ? Number(editTotalRate) : null,
        driverAllowance: editDriverAllowance ? Number(editDriverAllowance) : null,
        nightAllowance: editNightAllowance ? Number(editNightAllowance) : null,
        adultCost: editAdultCost ? Number(editAdultCost) : null,
        childCost: editChildCost ? Number(editChildCost) : null,
        infantCost: editInfantCost ? Number(editInfantCost) : null,
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

  const handleArchive = async () => {
    if (isReadOnly) {
      toast.error("Subscription expired. Read-only mode is active.");
      return;
    }

    if (!rateSheet) return;
    if (!confirm(`Archive rate sheet ${rateSheet.name}? Historical quotation records remain safe.`)) {
      return;
    }

    try {
      await rateSheetClient.archiveRateSheet(id);
      toast.success(`Rate sheet ${rateSheet.name} archived.`);
      router.push("/rate-sheets");
    } catch (err: any) {
      toast.error(err?.message || "Failed to archive rate sheet.");
    }
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
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Read-Only Banner */}
        {isReadOnly && <ReadOnlyBanner moduleName="Rate Sheet Detail" />}

        {/* Top Hero Command Header */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs relative overflow-hidden space-y-5">
          <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-purple-50/70 via-purple-50/20 to-transparent pointer-events-none" />

          {/* Breadcrumb & Badges */}
          <div className="flex items-center gap-2.5 z-10">
            <Link
              href="/rate-sheets"
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </Link>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-purple-50 text-purple-700 border border-purple-100">
              <Sparkles className="h-3 w-3 text-purple-500" />
              {rateSheet.inventoryType} Tariff
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
              {rateSheet.rateSheetNumber || "RAT-LEGACY"}
            </span>
            <Badge
              variant="outline"
              className={`text-[10px] font-bold ${
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
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold border border-purple-100 shadow-2xs shrink-0">
                {rateSheet.inventoryType === "HOTEL" ? (
                  <HotelIcon className="h-8 w-8" />
                ) : rateSheet.inventoryType === "VEHICLE" ? (
                  <Car className="h-8 w-8" />
                ) : (
                  <Ticket className="h-8 w-8" />
                )}
              </div>

              <div className="space-y-1">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">{rateSheet.name}</h1>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  <span className="flex items-center gap-1 font-semibold text-slate-800">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>{formatDateDisplay(rateSheet.validFrom)} → {formatDateDisplay(rateSheet.validTo)}</span>
                  </span>

                  {rateSheet.seasonName && (
                    <>
                      <span>•</span>
                      <span className="font-medium text-slate-700">{rateSheet.seasonName}</span>
                    </>
                  )}

                  {rateSheet.supplier && (
                    <>
                      <span>•</span>
                      <Link
                        href={`/suppliers/${rateSheet.supplier.id}`}
                        className="flex items-center gap-1 font-semibold text-indigo-600 hover:underline"
                      >
                        <Truck className="h-3.5 w-3.5 text-indigo-500" />
                        <span>{rateSheet.supplier.name}</span>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
            <span className="text-[11px] uppercase font-bold text-slate-400">Primary Purchase Rate</span>
            <h3 className="text-2xl font-black text-emerald-700">
              {formatCurrency(Number(rateSheet.costPrice))}
              <span className="text-xs text-slate-500 font-normal">
                {rateSheet.inventoryType === "HOTEL" ? " / room / night" : rateSheet.inventoryType === "VEHICLE" && rateSheet.ratePerKm ? " / km" : " base"}
              </span>
            </h3>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
            <span className="text-[11px] uppercase font-bold text-slate-400">Resolution Priority</span>
            <h3 className="text-2xl font-black text-slate-900 font-mono">
              Priority: {rateSheet.priority}
            </h3>
            <p className="text-[11px] text-slate-500">Higher priority overrides generic dates</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
            <span className="text-[11px] uppercase font-bold text-slate-400">Supplier Tax (%)</span>
            <h3 className="text-2xl font-black text-slate-900">
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
              Contracted Inventory Resource
            </h3>

            <div className="space-y-3 text-xs">
              {rateSheet.hotel && (
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
              )}

              {rateSheet.vehicle && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Assigned Vehicle</span>
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-bold text-slate-900 text-sm">{rateSheet.vehicle.name}</span>
                    <Link href={`/vehicles/${rateSheet.vehicle.id}`} className="text-indigo-600 hover:underline text-xs font-semibold">
                      View Fleet
                    </Link>
                  </div>
                  <p className="text-slate-600 mt-1">
                    Type: <strong>{rateSheet.vehicle.type}</strong> • Pricing Basis: <strong>{rateSheet.vehiclePricingType}</strong>
                  </p>
                </div>
              )}

              {rateSheet.activity && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Activity Excursion</span>
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-bold text-slate-900 text-sm">{rateSheet.activity.name}</span>
                    <Link href={`/activities/${rateSheet.activity.id}`} className="text-indigo-600 hover:underline text-xs font-semibold">
                      View Activity
                    </Link>
                  </div>
                  <p className="text-slate-600 mt-1">
                    Location: <strong>{rateSheet.activity.location || "Local"}</strong>
                  </p>
                </div>
              )}

              {/* Extra rates Breakdown */}
              {rateSheet.inventoryType === "HOTEL" && (
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
              )}

              {rateSheet.inventoryType === "VEHICLE" && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Driver Allowance</span>
                    <p className="font-bold text-slate-800">
                      {rateSheet.driverAllowance ? formatCurrency(Number(rateSheet.driverAllowance)) : "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Night Allowance</span>
                    <p className="font-bold text-slate-800">
                      {rateSheet.nightAllowance ? formatCurrency(Number(rateSheet.nightAllowance)) : "—"}
                    </p>
                  </div>
                </div>
              )}

              {rateSheet.inventoryType === "ACTIVITY" && (
                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Adult Cost</span>
                    <p className="font-bold text-slate-800">
                      {rateSheet.adultCost ? formatCurrency(Number(rateSheet.adultCost)) : formatCurrency(Number(rateSheet.costPrice))}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Child Cost</span>
                    <p className="font-bold text-slate-800">
                      {rateSheet.childCost ? formatCurrency(Number(rateSheet.childCost)) : "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Infant Cost</span>
                    <p className="font-bold text-slate-800">
                      {rateSheet.infantCost ? formatCurrency(Number(rateSheet.infantCost)) : "Free"}
                    </p>
                  </div>
                </div>
              )}
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
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <h4 className="font-bold text-slate-900">{rateSheet.supplier.name}</h4>
                      <span className="text-[11px] text-slate-500 font-mono">{rateSheet.supplier.supplierCode}</span>
                    </div>
                    <Link href={`/suppliers/${rateSheet.supplier.id}`} className="text-indigo-600 hover:underline font-semibold">
                      Supplier 360
                    </Link>
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

                {rateSheet.inventoryType === "HOTEL" && (
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
                )}

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
      </div>
    </div>
  );
}
