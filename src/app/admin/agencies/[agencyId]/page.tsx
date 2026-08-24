"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSaaS } from "@/context/saas-context";
import { formatCurrency } from "@/lib/costing-engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  User,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCcw,
  ShieldCheck,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Globe,
  FileText,
  Edit2,
  Check,
  X,
  History,
  IndianRupee,
} from "lucide-react";
import { AgencyStatus, SaaSSubscriptionPayment } from "@/data/saas-data";

export default function AgencyDetailsPage() {
  const params = useParams();
  const agencyId = params.agencyId as string;
  const router = useRouter();

  const {
    getAgencyDetails,
    updateAgencyStatus,
    updateAgency,
    verifyPayment,
    rejectPayment,
  } = useSaaS();

  const details = getAgencyDetails(agencyId);
  const { agency, owner, subscription, plan, payments, activities } = details;

  // Active Tab
  const [activeTab, setActiveTab] = React.useState<"overview" | "subscription" | "payments" | "activity">("overview");

  // Status Change Confirmation Modal State
  const [statusModalOpen, setStatusModalOpen] = React.useState(false);
  const [targetStatus, setTargetStatus] = React.useState<AgencyStatus | null>(null);
  const [statusReason, setStatusReason] = React.useState("");

  // Payment Review Modal State
  const [selectedPayment, setSelectedPayment] = React.useState<SaaSSubscriptionPayment | null>(null);
  const [isRejecting, setIsRejecting] = React.useState(false);
  const [rejectionReason, setRejectionReason] = React.useState("");

  // Quick Edit Agency Modal State
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editName, setEditName] = React.useState("");
  const [editEmail, setEditEmail] = React.useState("");
  const [editPhone, setEditPhone] = React.useState("");
  const [editAddress, setEditAddress] = React.useState("");
  const [editCity, setEditCity] = React.useState("");
  const [editWebsite, setEditWebsite] = React.useState("");
  const [editGstin, setEditGstin] = React.useState("");
  const [editNotes, setEditNotes] = React.useState("");

  React.useEffect(() => {
    if (agency) {
      setEditName(agency.name);
      setEditEmail(agency.email);
      setEditPhone(agency.phone);
      setEditAddress(agency.address || "");
      setEditCity(agency.city);
      setEditWebsite(agency.website || "");
      setEditGstin(agency.gstin || "");
      setEditNotes(agency.internalNotes || "");
    }
  }, [agency]);

  if (!agency) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <Building2 className="h-12 w-12 text-slate-300" />
        <h2 className="text-lg font-bold text-slate-800">Agency Not Found</h2>
        <Link href="/admin/agencies">
          <Button variant="outline" size="sm" className="bg-white">
            Return to Agencies Directory
          </Button>
        </Link>
      </div>
    );
  }

  const handleOpenStatusModal = (status: AgencyStatus) => {
    setTargetStatus(status);
    setStatusReason("");
    setStatusModalOpen(true);
  };

  const handleConfirmStatusChange = () => {
    if (!targetStatus) return;
    updateAgencyStatus(agency.id, targetStatus, statusReason);
    setStatusModalOpen(false);
    setTargetStatus(null);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    updateAgency(agency.id, {
      name: editName.trim(),
      email: editEmail.trim(),
      phone: editPhone.trim(),
      address: editAddress.trim() || undefined,
      city: editCity.trim(),
      website: editWebsite.trim() || undefined,
      gstin: editGstin.trim() || undefined,
      internalNotes: editNotes.trim() || undefined,
    });
    setIsEditOpen(false);
  };

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
        {/* Top Header Navigation */}
        <div className="space-y-1">
          <Link
            href="/admin/agencies"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-purple-600 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Agencies Directory
          </Link>
        </div>

        {/* ─── AGENCY HERO BANNER ─────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-2xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {agency.name}
                </h1>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border uppercase ${
                    agency.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : agency.status === "TRIAL"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : agency.status === "PAST_DUE"
                      ? "bg-orange-50 text-orange-700 border-orange-200"
                      : agency.status === "READ_ONLY"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                >
                  {agency.status === "PAST_DUE" ? "Payment Required" : agency.status.replace("_", " ")}
                </span>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                  {plan?.name || "Starter"} Plan ({subscription?.billingCycle || "Monthly"})
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">
                  Owner: <strong>{owner?.name || "Agency Owner"}</strong>
                </span>
                <span>•</span>
                <span>{agency.phone}</span>
                <span>•</span>
                <span>{agency.email}</span>
                <span>•</span>
                <span>{agency.city}, {agency.state || agency.country}</span>
                <span>•</span>
                <span>Onboarded: {agency.createdAt}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap self-end lg:self-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(true)}
                className="text-xs font-semibold h-9 px-3.5 rounded-xl cursor-pointer bg-white"
              >
                <Edit2 className="h-3.5 w-3.5 mr-1 text-slate-400" />
                Edit Profile
              </Button>

              {agency.status === "ACTIVE" && (
                <Button
                  size="sm"
                  onClick={() => handleOpenStatusModal("SUSPENDED")}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-9 px-4 rounded-xl cursor-pointer"
                >
                  Suspend Agency
                </Button>
              )}

              {agency.status === "SUSPENDED" && (
                <Button
                  size="sm"
                  onClick={() => handleOpenStatusModal("ACTIVE")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 rounded-xl cursor-pointer"
                >
                  Reactivate Agency
                </Button>
              )}

              {agency.status === "TRIAL" && (
                <Button
                  size="sm"
                  onClick={() => handleOpenStatusModal("ACTIVE")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 rounded-xl cursor-pointer"
                >
                  Activate Account
                </Button>
              )}

              {agency.status === "READ_ONLY" && (
                <Button
                  size="sm"
                  onClick={() => handleOpenStatusModal("ACTIVE")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 rounded-xl cursor-pointer"
                >
                  Reactivate Account
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ─── 4 DETAILS TABS ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 border-b border-slate-200 pb-px">
          {[
            { id: "overview", label: "Overview" },
            { id: "subscription", label: "Subscription" },
            { id: "payments", label: `Payments (${payments.length})` },
            { id: "activity", label: `Activity (${activities.length})` },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                  isActive
                    ? "border-purple-600 text-purple-700 bg-purple-50/40 rounded-t-xl"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ─── TAB 1: OVERVIEW ────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in-0">
            <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xs space-y-4 text-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
                Agency Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Agency Name</span>
                  <span className="font-bold text-slate-900 text-sm">{agency.name}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Unique Slug</span>
                  <span className="font-mono text-slate-700">{agency.slug}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Email</span>
                  <span className="text-slate-800">{agency.email}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Phone</span>
                  <span className="text-slate-800">{agency.phone}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Location</span>
                  <span className="text-slate-800">
                    {agency.address ? `${agency.address}, ` : ""}
                    {agency.city}, {agency.state || agency.country}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Website</span>
                  {agency.website ? (
                    <a
                      href={agency.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-purple-600 hover:underline inline-flex items-center gap-1"
                    >
                      {agency.website}
                    </a>
                  ) : (
                    <span className="text-slate-400">Not provided</span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">GSTIN / Tax ID</span>
                  <span className="font-mono font-bold text-slate-800">
                    {agency.gstin || "Not provided"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Created On</span>
                  <span className="text-slate-800 font-mono">{agency.createdAt}</span>
                </div>
              </div>

              {agency.internalNotes && (
                <div className="pt-3 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Internal Admin Remarks
                  </span>
                  <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                    {agency.internalNotes}
                  </p>
                </div>
              )}
            </div>

            <div className="lg:col-span-4 space-y-6">
              {/* Agency Owner Card */}
              <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xs space-y-3 text-xs">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                  <User className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Agency Owner Profile
                  </h3>
                </div>

                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Full Name</span>
                    <span className="font-bold text-slate-900 text-sm">{owner?.name || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Email</span>
                    <span className="text-slate-700">{owner?.email || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Mobile</span>
                    <span className="text-slate-700">{owner?.phone || "—"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: SUBSCRIPTION ────────────────────────────────────────── */}
        {activeTab === "subscription" && (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-2xs space-y-6 animate-in fade-in-0 text-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
              Subscription Entitlements & Billing Schedule
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Current Plan</span>
                <span className="font-black text-sm text-purple-700 mt-1 block">
                  {plan?.name || "Starter"} Plan
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Billing Cycle</span>
                <span className="font-bold text-slate-900 text-sm mt-1 block">
                  {subscription?.billingCycle || "Monthly"}
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Subscription Status</span>
                <span className="font-bold text-emerald-700 text-sm mt-1 block">
                  {subscription?.status || "ACTIVE"}
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Subscription Fee</span>
                <span className="font-black text-sm text-slate-900 font-mono mt-1 block">
                  {formatCurrency(subscription?.amount || 1999)}
                </span>
              </div>
            </div>

            {subscription?.status === "TRIAL" && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-amber-600" />
                  7-Day Free Trial Active
                </p>
                <p className="text-xs text-amber-800">
                  Trial Window: <strong>{subscription.trialStart}</strong> to <strong>{subscription.trialEnd}</strong>.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <span className="text-slate-500 font-medium">Subscription Start Date:</span>
                <p className="font-mono font-bold text-slate-800">{subscription?.startDate}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 font-medium">Next Renewal / Expiry Date:</span>
                <p className="font-mono font-bold text-slate-800">{subscription?.renewalDate}</p>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 3: PAYMENTS ────────────────────────────────────────────── */}
        {activeTab === "payments" && (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xs space-y-4 animate-in fade-in-0 text-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
              B2B Subscription Payments Ledger
            </h3>

            {payments.length === 0 ? (
              <p className="text-slate-400 py-8 text-center">No payment transactions recorded yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                          {p.id}
                        </span>
                        <span className="font-bold text-slate-900">{formatCurrency(p.amount)}</span>
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
                      </div>

                      <p className="text-slate-500 flex items-center gap-2">
                        <span>Method: <strong>{p.method}</strong></span>
                        <span>•</span>
                        <span className="font-mono text-indigo-600">Ref: {p.reference}</span>
                        <span>•</span>
                        <span>Date: {p.paymentDate}</span>
                      </p>
                      {p.notes && <p className="text-[11px] text-slate-600 italic">{p.notes}</p>}
                      {p.rejectionReason && (
                        <p className="text-[11px] text-rose-600 font-medium">
                          Rejection: {p.rejectionReason}
                        </p>
                      )}
                    </div>

                    {p.status === "Pending" && (
                      <Button
                        size="sm"
                        onClick={() => setSelectedPayment(p)}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-8 px-3 rounded-xl cursor-pointer"
                      >
                        Review Payment
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 4: ACTIVITY TIMELINE ───────────────────────────────────── */}
        {activeTab === "activity" && (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xs space-y-4 animate-in fade-in-0 text-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
              Agency Activity & Audit History
            </h3>

            {activities.length === 0 ? (
              <p className="text-slate-400 py-8 text-center">No activity history recorded.</p>
            ) : (
              <div className="space-y-4">
                {activities.map((act) => (
                  <div key={act.id} className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                      <History className="h-3.5 w-3.5" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{act.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {act.date} {act.time}
                        </span>
                      </div>
                      <p className="text-slate-600">{act.description}</p>
                      <p className="text-[10px] text-purple-700 font-semibold">By: {act.actor}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── STATUS CHANGE CONFIRMATION MODAL ─────────────────────────────── */}
      {statusModalOpen && targetStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-0">
          <div className="bg-white border border-slate-200/90 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {targetStatus === "SUSPENDED" ? "Suspend Agency Account?" : "Update Agency Status?"}
                </h3>
                <p className="text-xs text-slate-500">Target State: {targetStatus}</p>
              </div>
            </div>

            <p className="text-slate-600 leading-relaxed">
              Are you sure you want to change the status of <strong>{agency.name}</strong> to{" "}
              <strong>{targetStatus}</strong>?
            </p>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Reason / Notes (Optional)</label>
              <Textarea
                placeholder="e.g. Requested temporary hold on operations..."
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                rows={2}
                className="text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStatusModalOpen(false)}
                className="h-8.5 text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmStatusChange}
                className={`font-bold text-xs h-8.5 px-4 rounded-xl cursor-pointer ${
                  targetStatus === "SUSPENDED"
                    ? "bg-rose-600 hover:bg-rose-700 text-white"
                    : "bg-purple-600 hover:bg-purple-700 text-white"
                }`}
              >
                Confirm Status Change
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── QUICK EDIT PROFILE MODAL ─────────────────────────────────────── */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-0">
          <div className="bg-white border border-slate-200/90 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-purple-600" />
                <h3 className="text-base font-bold text-slate-900">Edit Agency Profile</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Agency Name</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-8.5 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Email</label>
                  <Input
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="h-8.5 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Phone</label>
                  <Input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="h-8.5 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">City</label>
                  <Input
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="h-8.5 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Website</label>
                  <Input
                    value={editWebsite}
                    onChange={(e) => setEditWebsite(e.target.value)}
                    className="h-8.5 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">GSTIN</label>
                <Input
                  value={editGstin}
                  onChange={(e) => setEditGstin(e.target.value)}
                  className="h-8.5 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Internal Remarks</label>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditOpen(false)}
                  className="h-8.5 text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-8.5 px-4 rounded-xl cursor-pointer"
                >
                  Save Profile
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                    placeholder="e.g. Payment reference UTR not found..."
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
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-5 rounded-xl cursor-pointer"
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
