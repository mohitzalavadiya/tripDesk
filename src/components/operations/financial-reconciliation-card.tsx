"use client";

import * as React from "react";
import {
  OperationsClosureSummary,
  CostAdjustmentItem,
  operationsClient,
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  DollarSign,
  Plus,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Scale,
} from "lucide-react";

interface FinancialReconciliationCardProps {
  summary: OperationsClosureSummary;
  onSuccess: () => void;
}

export function FinancialReconciliationCard({
  summary,
  onSuccess,
}: FinancialReconciliationCardProps) {
  const existingFin = summary.financialReconciliation;
  const isFinalized = summary.isFinalized;

  const [plannedCost, setPlannedCost] = React.useState<number>(
    existingFin?.plannedCost ?? 0
  );
  const [actualCost, setActualCost] = React.useState<number>(
    existingFin?.actualCost ?? 0
  );
  const [varianceReason, setVarianceReason] = React.useState<string>(
    existingFin?.varianceReason || ""
  );
  const [remarks, setRemarks] = React.useState<string>(
    existingFin?.remarks || ""
  );

  const [adjustments, setAdjustments] = React.useState<CostAdjustmentItem[]>(
    existingFin?.adjustments || []
  );

  const [saving, setSaving] = React.useState(false);

  // Computed variance
  const varianceAmount = Number((actualCost - plannedCost).toFixed(2));
  const hasVariance = Math.abs(varianceAmount) > 0.01;

  const handleAddAdjustment = () => {
    setAdjustments((prev) => [
      ...prev,
      {
        id: `adj-${Date.now()}`,
        supplier: "",
        category: "HOTEL_AMENDMENT",
        amount: 0,
        reason: "",
        reference: "",
      },
    ]);
  };

  const handleRemoveAdjustment = (index: number) => {
    setAdjustments((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateAdjustment = (
    index: number,
    field: keyof CostAdjustmentItem,
    value: any
  ) => {
    setAdjustments((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const handleSaveFinancial = async () => {
    if (hasVariance && (!varianceReason || !varianceReason.trim())) {
      toast.error(
        "A variance reason is required whenever planned and actual operational costs differ."
      );
      return;
    }

    try {
      setSaving(true);
      await operationsClient.saveFinancialReconciliation(summary.operationId, {
        plannedCost,
        actualCost,
        varianceAmount,
        varianceReason: varianceReason.trim() || undefined,
        adjustments: adjustments.filter((a) => a.supplier.trim() && a.reason.trim()),
        remarks: remarks.trim() || undefined,
      });

      toast.success("Financial cost reconciliation recorded successfully!");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to save financial reconciliation.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-emerald-600" />
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Internal Operational Cost & Financial Reconciliation
            </h3>
            <p className="text-[11px] text-slate-400">
              Confidential internal audit layer (Sanitized from customer documents)
            </p>
          </div>
        </div>
        {existingFin ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
            <CheckCircle2 className="h-3 w-3" /> Reconciled
          </span>
        ) : (
          <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
            Pending Financial Audit
          </span>
        )}
      </div>

      {/* Cost Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Planned Cost */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">Planned Operating Cost (₹)</label>
          <Input
            type="number"
            value={plannedCost}
            onChange={(e) => setPlannedCost(Number(e.target.value))}
            disabled={isFinalized}
            className="text-sm font-bold bg-white"
          />
          <span className="text-[10px] text-slate-400 block">Budgeted vendor & supplier costs</span>
        </div>

        {/* Actual Cost */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">Actual Operating Cost (₹)</label>
          <Input
            type="number"
            value={actualCost}
            onChange={(e) => setActualCost(Number(e.target.value))}
            disabled={isFinalized}
            className="text-sm font-bold bg-white"
          />
          <span className="text-[10px] text-slate-400 block">Actual supplier invoices & payouts</span>
        </div>

        {/* Variance Card */}
        <div
          className={`rounded-xl p-3.5 space-y-1 border ${
            varianceAmount > 0
              ? "bg-rose-50/60 border-rose-200 text-rose-900"
              : varianceAmount < 0
              ? "bg-emerald-50/60 border-emerald-200 text-emerald-900"
              : "bg-slate-50 border-slate-200 text-slate-900"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">Cost Variance</span>
            {varianceAmount > 0 ? (
              <TrendingUp className="h-4 w-4 text-rose-600" />
            ) : varianceAmount < 0 ? (
              <TrendingDown className="h-4 w-4 text-emerald-600" />
            ) : (
              <Scale className="h-4 w-4 text-slate-500" />
            )}
          </div>
          <div className="text-lg font-black">
            {varianceAmount > 0
              ? `+ ₹${varianceAmount.toLocaleString("en-IN")}`
              : varianceAmount < 0
              ? `- ₹${Math.abs(varianceAmount).toLocaleString("en-IN")}`
              : "₹0 (Balanced)"}
          </div>
          <span className="text-[10px] text-slate-500 block">
            {varianceAmount > 0
              ? "Cost overrun / extra expense"
              : varianceAmount < 0
              ? "Cost savings / margin gain"
              : "Zero cost variance"}
          </span>
        </div>
      </div>

      {/* Variance Reason (when variance !== 0) */}
      {hasVariance && (
        <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 space-y-1.5">
          <label className="text-xs font-bold text-amber-900 flex items-center justify-between">
            <span>Mandatory Variance Explanation *</span>
            <span className="text-[10px] text-amber-700">Required for non-zero variance</span>
          </label>
          <Textarea
            rows={2}
            value={varianceReason}
            onChange={(e) => setVarianceReason(e.target.value)}
            disabled={isFinalized}
            placeholder="Explain why actual supplier costs differed from planned budget (e.g. hotel room upgrade, extra mileage)..."
            className="text-xs bg-white border-amber-200"
          />
        </div>
      )}

      {/* Cost Adjustments Breakdown */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800">
            Supplier Adjustments & Discrepancies ({adjustments.length})
          </h4>
          {!isFinalized && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleAddAdjustment}
              className="text-xs font-bold h-7 px-2.5 border-slate-200 cursor-pointer"
            >
              <Plus className="h-3 w-3 mr-1" /> Add Adjustment
            </Button>
          )}
        </div>

        {adjustments.length > 0 && (
          <div className="space-y-2">
            {adjustments.map((adj, idx) => (
              <div
                key={adj.id || idx}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs items-center"
              >
                <div className="sm:col-span-3">
                  <Input
                    placeholder="Supplier / Vendor"
                    value={adj.supplier}
                    onChange={(e) => handleUpdateAdjustment(idx, "supplier", e.target.value)}
                    disabled={isFinalized}
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="sm:col-span-3">
                  <Select
                    value={adj.category}
                    onValueChange={(val) => handleUpdateAdjustment(idx, "category", val)}
                    disabled={isFinalized}
                  >
                    <SelectTrigger className="h-8 text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="HOTEL_AMENDMENT">Hotel Amendment</SelectItem>
                      <SelectItem value="ROOM_UPGRADE">Room Upgrade</SelectItem>
                      <SelectItem value="EXTRA_VEHICLE_KM">Extra Vehicle KM</SelectItem>
                      <SelectItem value="VEHICLE_UPGRADE">Vehicle Upgrade</SelectItem>
                      <SelectItem value="ACTIVITY_ADDON">Activity Add-on</SelectItem>
                      <SelectItem value="CANCELLATION_FEE">Cancellation Fee</SelectItem>
                      <SelectItem value="GUEST_REQUEST">Guest Request</SelectItem>
                      <SelectItem value="OPERATIONAL_ERROR">Operational Error</SelectItem>
                      <SelectItem value="OTHER">Other Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Input
                    type="number"
                    placeholder="Amount (₹)"
                    value={adj.amount}
                    onChange={(e) => handleUpdateAdjustment(idx, "amount", Number(e.target.value))}
                    disabled={isFinalized}
                    className="h-8 text-xs bg-white font-bold"
                  />
                </div>
                <div className="sm:col-span-3">
                  <Input
                    placeholder="Reason / Notes"
                    value={adj.reason}
                    onChange={(e) => handleUpdateAdjustment(idx, "reason", e.target.value)}
                    disabled={isFinalized}
                    className="h-8 text-xs bg-white"
                  />
                </div>
                {!isFinalized && (
                  <div className="sm:col-span-1 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveAdjustment(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* General Remarks */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700">Financial Audit Remarks / Accounting Notes</label>
        <Textarea
          rows={2}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          disabled={isFinalized}
          placeholder="Record notes for internal accounting or settlements..."
          className="text-xs bg-slate-50 border-slate-200"
        />
      </div>

      {/* Action Footer */}
      {!isFinalized && (
        <div className="flex items-center justify-end pt-2 border-t border-slate-100">
          <Button
            type="button"
            onClick={handleSaveFinancial}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9 px-4 cursor-pointer shadow-xs"
          >
            {saving ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Saving Financial Audit...
              </>
            ) : (
              <>
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Save Financial Reconciliation
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
