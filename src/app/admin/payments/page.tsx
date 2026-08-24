"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSaaS } from "@/context/saas-context";
import { PageHeader } from "@/components/shared/page-header";
import { formatCurrency } from "@/lib/costing-engine";
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
  IndianRupee,
  CheckCircle2,
  Clock,
  QrCode,
  Building,
  CreditCard,
  Search,
  RotateCcw,
  Check,
  X,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { SaaSSubscriptionPayment } from "@/data/saas-data";

export default function AdminPaymentsPage() {
  const router = useRouter();
  const { subscriptionPayments, verifyPayment, rejectPayment } = useSaaS();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");

  // Payment Review Modal State
  const [selectedPayment, setSelectedPayment] = React.useState<SaaSSubscriptionPayment | null>(null);
  const [isRejecting, setIsRejecting] = React.useState(false);
  const [rejectionReason, setRejectionReason] = React.useState("");

  const filteredPayments = React.useMemo(() => {
    return subscriptionPayments.filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mAgency = p.agencyName.toLowerCase().includes(q);
        const mRef = p.reference.toLowerCase().includes(q);
        const mId = p.id.toLowerCase().includes(q);
        if (!mAgency && !mRef && !mId) return false;
      }

      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;

      return true;
    });
  }, [subscriptionPayments, searchQuery, statusFilter]);

  const handleVerify = (payment: SaaSSubscriptionPayment) => {
    verifyPayment(payment.id);
    setSelectedPayment(null);
    setIsRejecting(false);
    setRejectionReason("");
  };

  const handleReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason.");
      return;
    }
    rejectPayment(selectedPayment.id, rejectionReason);
    setSelectedPayment(null);
    setIsRejecting(false);
    setRejectionReason("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-20">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Top Header */}
        <PageHeader
          title="SaaS Subscription Payments"
          description="Manage incoming B2B subscription payments from travel agencies, verify manual UPI/bank transfers, and review invoices."
          breadcrumbs={[{ label: "SaaS Platform" }, { label: "SaaS Payments" }]}
        />

        {/* ─── SEARCH & FILTER CONTROLS ───────────────────────────────────── */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search Agency, UTR Reference, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "ALL")}>
              <SelectTrigger className="h-9 text-xs w-44">
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="ALL">All Payment Statuses</SelectItem>
                <SelectItem value="Pending">Pending Verification</SelectItem>
                <SelectItem value="Verified">Verified & Active</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            {(searchQuery || statusFilter !== "ALL") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                }}
                className="h-9 text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* ─── PAYMENTS LEDGER TABLE ──────────────────────────────────────── */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Subscription Payment Ledger ({filteredPayments.length})
            </span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {filteredPayments.map((p) => (
              <div
                key={p.id}
                className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                      {p.id}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900">{p.agencyName}</h4>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                        p.status === "Verified"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : p.status === "Pending"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      {p.status}
                    </span>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      {p.planName} Plan
                    </span>
                  </div>

                  <p className="text-slate-500 flex items-center gap-2 flex-wrap">
                    <span>Method: <strong>{p.method}</strong></span>
                    <span>•</span>
                    <span className="font-mono text-purple-700">UTR: {p.reference}</span>
                    <span>•</span>
                    <span>Date: {p.paymentDate}</span>
                    {p.verifiedBy && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-700 font-medium">Verified by: {p.verifiedBy}</span>
                      </>
                    )}
                  </p>
                  {p.notes && <p className="text-[11px] text-slate-600 italic">{p.notes}</p>}
                  {p.rejectionReason && (
                    <p className="text-[11px] text-rose-600 font-medium">
                      Rejection Reason: {p.rejectionReason}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-5 self-end lg:self-center shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Amount Paid
                    </span>
                    <span className="font-black text-sm text-slate-900 font-mono">
                      {formatCurrency(p.amount)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/admin/agencies/${p.agencyId}`)}
                      className="h-8.5 text-xs font-semibold cursor-pointer bg-white"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1 text-slate-400" />
                      View Agency
                    </Button>

                    {p.status === "Pending" && (
                      <Button
                        size="sm"
                        onClick={() => setSelectedPayment(p)}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-8.5 px-3.5 rounded-xl cursor-pointer"
                      >
                        Review
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── PAYMENT REVIEW MODAL ─────────────────────────────────────────── */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-0">
          <div className="bg-white border border-slate-200/90 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Review Subscription Payment</h3>
                  <p className="text-xs text-slate-500">Transaction ID: {selectedPayment.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedPayment(null);
                  setIsRejecting(false);
                }}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Subscribing Agency:</span>
                <strong className="text-slate-900">{selectedPayment.agencyName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Plan Tier:</span>
                <strong className="text-indigo-600">{selectedPayment.planName} Plan</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <strong className="text-emerald-700 font-mono text-sm">
                  {formatCurrency(selectedPayment.amount)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Method:</span>
                <strong className="text-slate-800">{selectedPayment.method}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Reference (UTR):</span>
                <strong className="font-mono text-purple-700">{selectedPayment.reference}</strong>
              </div>
            </div>

            {isRejecting ? (
              <form onSubmit={handleReject} className="space-y-3">
                <div className="space-y-1">
                  <label className="font-bold text-rose-700">Rejection Reason</label>
                  <Textarea
                    placeholder="e.g. Payment reference UTR not found in bank statement..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={2}
                    className="text-xs"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsRejecting(false)}
                    className="h-8 text-xs"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-8 px-4 rounded-xl"
                  >
                    Confirm Rejection
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRejecting(true)}
                  className="text-rose-600 hover:bg-rose-50 border-rose-200 text-xs font-semibold h-9 px-4 rounded-xl cursor-pointer"
                >
                  Reject Payment
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleVerify(selectedPayment)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-5 rounded-xl cursor-pointer shadow-xs"
                >
                  <Check className="h-4 w-4 mr-1.5" />
                  Verify & Activate
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
