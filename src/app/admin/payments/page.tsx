"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Building,
  CreditCard,
  Search,
  RotateCcw,
  Check,
  X,
  Eye,
  AlertTriangle,
  Plus,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  FileText,
  Calendar,
} from "lucide-react";
import {
  adminClient,
} from "@/lib/api-client/admin-client";
import {
  AdminSubscriptionPaymentItem,
  SubscriptionPaymentSummaryStats,
} from "@/lib/services/admin-service";

export default function AdminPaymentsPage() {
  const router = useRouter();

  // Core Payment List & Stats State
  const [payments, setPayments] = React.useState<AdminSubscriptionPaymentItem[]>([]);
  const [stats, setStats] = React.useState<SubscriptionPaymentSummaryStats>({
    totalExpected: 0,
    totalVerified: 0,
    pendingCount: 0,
    pendingAmount: 0,
    outstandingAmount: 0,
    currentMonthCollections: 0,
  });
  const [loading, setLoading] = React.useState(true);

  // Filter & Search Controls
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");

  // Payment Verification / Rejection Modal State
  const [selectedPayment, setSelectedPayment] = React.useState<AdminSubscriptionPaymentItem | null>(null);
  const [isRejecting, setIsRejecting] = React.useState(false);
  const [rejectionReason, setRejectionReason] = React.useState("");
  const [verificationNotes, setVerificationNotes] = React.useState("");
  const [actionLoading, setActionLoading] = React.useState(false);

  // Manual Payment Creation Modal State
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [agenciesList, setAgenciesList] = React.useState<any[]>([]);
  const [selectedAgencyId, setSelectedAgencyId] = React.useState("");
  const [selectedSubId, setSelectedSubId] = React.useState("");
  const [createAmount, setCreateAmount] = React.useState("");
  const [createMethod, setCreateMethod] = React.useState<string>("UPI");
  const [createUtr, setCreateUtr] = React.useState("");
  const [createDate, setCreateDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [createNotes, setCreateNotes] = React.useState("");
  const [createLoading, setCreateLoading] = React.useState(false);

  // Fetch live payments from API
  const fetchPayments = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminClient.listSubscriptionPayments({
        status: statusFilter !== "ALL" ? (statusFilter as any) : undefined,
        search: searchQuery.trim() || undefined,
        limit: 100,
      });

      if (res.success && res.data) {
        setPayments(res.data);
        if (res.stats) {
          setStats(res.stats);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load subscription payments");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  React.useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Load agencies for manual recording dropdown
  const loadAgenciesForModal = async () => {
    try {
      const res = await adminClient.listAgencies({ limit: 100 });
      if (res.success && res.data) {
        setAgenciesList(res.data);
        if (res.data.length > 0) {
          const first = res.data[0];
          setSelectedAgencyId(first.id);
          if (first.subscription) {
            setSelectedSubId(first.subscription.id);
            setCreateAmount(String(first.subscription.planPrice || "1999"));
          }
        }
      }
    } catch (err) {
      console.error("Failed to load agencies:", err);
    }
  };

  const handleOpenCreateModal = () => {
    loadAgenciesForModal();
    setIsCreateOpen(true);
  };

  const handleAgencyChange = (agencyId: string) => {
    setSelectedAgencyId(agencyId);
    const agency = agenciesList.find((a) => a.id === agencyId);
    if (agency && agency.subscription) {
      setSelectedSubId(agency.subscription.id);
      setCreateAmount(String(agency.subscription.planPrice || "1999"));
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgencyId || !selectedSubId) {
      toast.error("Please select an agency with a valid subscription.");
      return;
    }
    const amt = parseFloat(createAmount);
    if (!amt || amt <= 0) {
      toast.error("Please enter a valid positive payment amount.");
      return;
    }

    setCreateLoading(true);
    try {
      await adminClient.createSubscriptionPayment({
        agencyId: selectedAgencyId,
        subscriptionId: selectedSubId,
        amount: amt,
        currency: "INR",
        paymentMethod: createMethod as any,
        utrNumber: createUtr.trim() || undefined,
        paymentDate: createDate,
        notes: createNotes.trim() || undefined,
      });


      toast.success("SaaS subscription payment recorded successfully (Status: PENDING).");
      setIsCreateOpen(false);
      setCreateUtr("");
      setCreateNotes("");
      fetchPayments();
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!selectedPayment) return;
    setActionLoading(true);
    try {
      await adminClient.verifySubscriptionPayment(selectedPayment.id, {
        notes: verificationNotes.trim() || undefined,
      });
      toast.success(`Payment ${selectedPayment.id} verified! Agency subscription activated.`);
      setSelectedPayment(null);
      setVerificationNotes("");
      fetchPayments();
    } catch (err: any) {
      toast.error(err.message || "Failed to verify payment");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason.");
      return;
    }

    setActionLoading(true);
    try {
      await adminClient.rejectSubscriptionPayment(selectedPayment.id, rejectionReason.trim());
      toast.success(`Payment ${selectedPayment.id} rejected.`);
      setSelectedPayment(null);
      setIsRejecting(false);
      setRejectionReason("");
      fetchPayments();
    } catch (err: any) {
      toast.error(err.message || "Failed to reject payment");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-20">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Top Header */}
        <PageHeader
          title="SaaS Subscription Payments & Billing Reconciliation"
          description="Manage incoming B2B subscription payments from travel agencies, verify manual UPI/bank transfers, and reconcile platform revenue."
          breadcrumbs={[{ label: "SaaS Platform", href: "/admin" }, { label: "SaaS Payments" }]}
          primaryAction={{
            label: "+ Record Payment",
            onClick: handleOpenCreateModal,
            icon: Plus,
          }}
        />

        {/* ─── 5 BILLING RECONCILIATION SUMMARY CARDS ─────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* 1. Verified Collections */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-emerald-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Verified</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {formatCurrency(stats.totalVerified)}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">Lifetime confirmed revenue</p>
          </div>

          {/* 2. Pending Verification */}
          <div
            onClick={() => setStatusFilter("PENDING")}
            className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1 cursor-pointer hover:border-amber-300 transition-colors group"
          >
            <div className="flex items-center justify-between text-amber-600">
              <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-amber-700">
                Pending Review
              </span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-700 tracking-tight font-mono">
              {stats.pendingCount} <span className="text-xs font-normal text-slate-400">({formatCurrency(stats.pendingAmount)})</span>
            </p>
            <p className="text-[11px] text-slate-500 font-medium">Awaiting manual approval</p>
          </div>

          {/* 3. Current Month Collections */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-indigo-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">This Month</span>
              <TrendingUp className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-black text-indigo-700 tracking-tight font-mono">
              {formatCurrency(stats.currentMonthCollections)}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">Current calendar month</p>
          </div>

          {/* 4. Expected Monthly Run-rate */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-purple-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Expected MRR</span>
              <CreditCard className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-2xl font-black text-purple-700 tracking-tight font-mono">
              {formatCurrency(stats.totalExpected)}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">Active subscribed agencies</p>
          </div>

          {/* 5. Outstanding Amount */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-rose-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Outstanding</span>
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </div>
            <p className="text-2xl font-black text-rose-700 tracking-tight font-mono">
              {formatCurrency(stats.outstandingAmount)}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">Uncollected variance</p>
          </div>
        </div>

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
              <SelectTrigger className="h-9 text-xs w-48">
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="ALL">All Payment Statuses</SelectItem>
                <SelectItem value="PENDING">Pending Verification</SelectItem>
                <SelectItem value="VERIFIED">Verified & Active</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="REFUNDED">Refunded</SelectItem>
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

            <Button
              variant="outline"
              size="sm"
              onClick={fetchPayments}
              className="h-9 text-xs font-semibold bg-white"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 text-slate-500 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* ─── PAYMENTS LEDGER TABLE ──────────────────────────────────────── */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              SaaS Subscription Payment Ledger ({payments.length} Transactions)
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-16 text-slate-400 text-xs gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-purple-600" />
              Loading database payment records...
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center p-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-3">
              <CreditCard className="h-10 w-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-600">No subscription payments found.</p>
              <Button
                size="sm"
                onClick={handleOpenCreateModal}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
              >
                + Record First Payment
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/50 px-2 rounded-xl transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 text-[11px]">
                        {p.id.slice(0, 14)}...
                      </span>
                      <h4 className="font-bold text-sm text-slate-900">{p.agencyName}</h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                          p.status === "VERIFIED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : p.status === "PENDING"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : p.status === "REJECTED"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {p.status}
                      </span>
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {p.planName} Plan (₹{p.planPrice})
                      </span>
                    </div>

                    <p className="text-slate-500 flex items-center gap-2 flex-wrap">
                      <span>Method: <strong>{p.paymentMethod}</strong></span>
                      <span>•</span>
                      <span className="font-mono text-purple-700">
                        UTR / Ref: <strong>{p.utrNumber || p.paymentReference || "N/A"}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Date: {new Date(p.paymentDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      {p.verifiedBy && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-700 font-medium flex items-center gap-1">
                            <ShieldCheck className="h-3.5 w-3.5" /> Verified by Platform Admin
                          </span>
                        </>
                      )}
                    </p>

                    {p.notes && <p className="text-[11px] text-slate-600 italic">Notes: {p.notes}</p>}
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
                      <span className="font-black text-base text-slate-900 font-mono">
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

                      {p.status === "PENDING" && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedPayment(p);
                            setIsRejecting(false);
                            setRejectionReason("");
                            setVerificationNotes("");
                          }}
                          className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-8.5 px-3.5 rounded-xl cursor-pointer"
                        >
                          Review & Reconcile
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── PAYMENT REVIEW & VERIFICATION MODAL ──────────────────────────── */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-0">
          <div className="bg-white border border-slate-200/90 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Review SaaS Subscription Payment</h3>
                  <p className="text-xs text-slate-500 font-mono">ID: {selectedPayment.id}</p>
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
                <span className="text-slate-500">Amount Paid:</span>
                <strong className="text-emerald-700 font-mono text-sm">
                  {formatCurrency(selectedPayment.amount)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Method:</span>
                <strong className="text-slate-800">{selectedPayment.paymentMethod}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">UTR / Reference:</span>
                <strong className="font-mono text-purple-700">{selectedPayment.utrNumber || selectedPayment.paymentReference || "N/A"}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Date:</span>
                <span className="text-slate-800 font-medium">
                  {new Date(selectedPayment.paymentDate).toLocaleDateString("en-IN")}
                </span>
              </div>
            </div>

            {isRejecting ? (
              <form onSubmit={handleReject} className="space-y-3">
                <div className="space-y-1">
                  <label className="font-bold text-rose-700">Rejection Reason</label>
                  <Textarea
                    placeholder="e.g. Payment reference UTR not found in bank statement, amount mismatch..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    className="text-xs"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsRejecting(false)}
                    disabled={actionLoading}
                    className="h-8 text-xs cursor-pointer"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={actionLoading}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-8 px-4 rounded-xl cursor-pointer"
                  >
                    {actionLoading ? "Rejecting..." : "Confirm Rejection"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Verification Notes (Optional)</label>
                  <Input
                    placeholder="e.g. Bank statement verified on HDFC Portal"
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsRejecting(true)}
                    disabled={actionLoading}
                    className="text-rose-600 hover:bg-rose-50 border-rose-200 text-xs font-semibold h-9 px-4 rounded-xl cursor-pointer"
                  >
                    Reject Payment
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleVerify}
                    disabled={actionLoading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-5 rounded-xl cursor-pointer shadow-xs"
                  >
                    <Check className="h-4 w-4 mr-1.5" />
                    {actionLoading ? "Verifying..." : "Verify & Activate"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MANUAL PAYMENT RECORDING MODAL ──────────────────────────────── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-0">
          <div className="bg-white border border-slate-200/90 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-purple-600" />
                <h3 className="text-base font-bold text-slate-900">Record SaaS Subscription Payment</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Subscribing Agency</label>
                <Select value={selectedAgencyId} onValueChange={(v) => v && handleAgencyChange(v)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Agency" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {agenciesList.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} ({a.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Amount (₹)</label>
                  <Input
                    type="number"
                    value={createAmount}
                    onChange={(e) => setCreateAmount(e.target.value)}
                    placeholder="1999"
                    className="h-9 text-xs font-mono font-bold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Payment Method</label>
                  <Select value={createMethod} onValueChange={(v) => v && setCreateMethod(v)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="UPI">UPI / QR Code</SelectItem>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</SelectItem>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="CHEQUE">Cheque</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>


              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">UTR / Reference Number</label>
                  <Input
                    value={createUtr}
                    onChange={(e) => setCreateUtr(e.target.value)}
                    placeholder="e.g. UTR123456789"
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Payment Date</label>
                  <Input
                    type="date"
                    value={createDate}
                    onChange={(e) => setCreateDate(e.target.value)}
                    className="h-9 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Transaction Notes (Optional)</label>
                <Textarea
                  value={createNotes}
                  onChange={(e) => setCreateNotes(e.target.value)}
                  placeholder="e.g. Annual subscription advance via Google Pay"
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={createLoading}
                  className="h-8.5 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createLoading}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-8.5 px-4 rounded-xl cursor-pointer"
                >
                  {createLoading ? "Recording..." : "Record Payment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
