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
  ArrowLeft,
  Building2,
  User,
  CreditCard,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import { BillingCycle, PlanTier } from "@/data/saas-data";

export default function CreateAgencyPage() {
  const router = useRouter();
  const { createAgency, plans } = useSaaS();

  // Section 1: Agency Information
  const [name, setName] = React.useState("");
  const [logo, setLogo] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [city, setCity] = React.useState("");
  const [state, setState] = React.useState("");
  const [country, setCountry] = React.useState("India");
  const [website, setWebsite] = React.useState("");
  const [gstin, setGstin] = React.useState("");
  const [internalNotes, setInternalNotes] = React.useState("");

  // Section 2: Agency Owner
  const [ownerName, setOwnerName] = React.useState("");
  const [ownerEmail, setOwnerEmail] = React.useState("");
  const [ownerPhone, setOwnerPhone] = React.useState("");

  // Section 3: Subscription
  const [planId, setPlanId] = React.useState<"starter" | "professional">("starter");
  const [billingCycle, setBillingCycle] = React.useState<BillingCycle>("Monthly");
  const [isTrial, setIsTrial] = React.useState(true);
  const [paymentStatus, setPaymentStatus] = React.useState<"Trial" | "Pending Payment" | "Paid">("Trial");

  // Dynamic 7-day trial calculations
  const now = new Date();
  const todayFormatted = now.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const trialEndObj = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const trialEndFormatted = trialEndObj.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const selectedPlan = plans.find((p) => p.id === planId) || plans[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim() || !city.trim()) {
      toast.error("Please fill in Agency Name, Email, Phone, and City.");
      return;
    }
    if (!ownerName.trim() || !ownerEmail.trim() || !ownerPhone.trim()) {
      toast.error("Please fill in Agency Owner Name, Email, and Phone.");
      return;
    }

    const created = createAgency({
      name,
      logo: logo.trim() || undefined,
      email,
      phone,
      address: address.trim() || undefined,
      city,
      state: state.trim() || undefined,
      country,
      website: website.trim() || undefined,
      gstin: gstin.trim() || undefined,
      internalNotes: internalNotes.trim() || undefined,
      ownerName,
      ownerEmail,
      ownerPhone,
      planId,
      billingCycle,
      isTrial,
      paymentStatus: isTrial ? "Trial" : paymentStatus,
    });

    router.push(`/admin/agencies/${created.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-20">
      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Top Header */}
        <div className="space-y-1">
          <Link
            href="/admin/agencies"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-purple-600 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Agencies Directory
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Create New Agency
          </h1>
          <p className="text-xs text-slate-500">
            Register an agency account, assign the agency owner profile, and setup initial subscription & 7-day trial terms.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 text-xs">
          {/* ─── SECTION 1: AGENCY INFORMATION ────────────────────────────── */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building2 className="h-4 w-4 text-purple-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                Section 1 — Agency Information
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="font-bold text-slate-700">
                  Agency Name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Blue Lagoon Holiday Planners"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 text-xs font-semibold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">
                  Official Email <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  placeholder="e.g. info@bluelagoon.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">
                  Primary Phone <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. +91 98470 12345"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="font-bold text-slate-700">Physical Address / Office</label>
                <Input
                  placeholder="e.g. 3rd Floor, Business Center, MG Road"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">
                  City <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Kochi"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">State / Region</label>
                <Input
                  placeholder="e.g. Kerala"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Country</label>
                <Input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Website URL</label>
                <Input
                  placeholder="https://bluelagoon.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="font-bold text-slate-700">GSTIN / Tax Identification</label>
                <Input
                  placeholder="e.g. 32ABCDE1234F1Z5"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
                <p className="text-[10px] text-slate-400">
                  Stored as agency record information for document header templates.
                </p>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="font-bold text-slate-700">Internal Admin Notes</label>
                <Textarea
                  placeholder="Special onboarding notes, referral source, or contract details..."
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  rows={2}
                  className="text-xs min-h-[60px]"
                />
              </div>
            </div>
          </div>

          {/* ─── SECTION 2: AGENCY OWNER ──────────────────────────────────── */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <User className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                Section 2 — Agency Owner Profile
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">
                  Owner Full Name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Amit Sharma"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="h-9 text-xs font-semibold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">
                  Owner Email <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  placeholder="e.g. amit@bluelagoon.com"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">
                  Owner Mobile <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. +91 98250 99887"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>
          </div>

          {/* ─── SECTION 3: SUBSCRIPTION & 7-DAY TRIAL ─────────────────────── */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-2xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-emerald-600" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  Section 3 — Subscription & Terms
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">SaaS Plan Tier</label>
                <Select
                  value={planId}
                  onValueChange={(val) => setPlanId(val as "starter" | "professional")}
                >
                  <SelectTrigger className="h-9 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="starter">Starter Plan (₹1,999/mo)</SelectItem>
                    <SelectItem value="professional">Professional Plan (₹4,999/mo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Billing Cycle</label>
                <Select
                  value={billingCycle}
                  onValueChange={(val) => setBillingCycle(val as BillingCycle)}
                >
                  <SelectTrigger className="h-9 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Yearly">Yearly (Annual Discount)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Account Access Mode</label>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsTrial(true);
                      setPaymentStatus("Trial");
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                      isTrial
                        ? "bg-amber-500 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    7-Day Free Trial
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsTrial(false);
                      setPaymentStatus("Paid");
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                      !isTrial
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Direct Paid Activation
                  </button>
                </div>
              </div>
            </div>

            {/* Trial calculation banner */}
            {isTrial ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-900">
                <Clock className="h-5 w-5 text-amber-600 shrink-0" />
                <div className="space-y-0.5">
                  <p className="font-bold">
                    7-Day Dynamic Trial Active: {todayFormatted} → {trialEndFormatted}
                  </p>
                  <p className="text-amber-800 text-[11px]">
                    The agency will receive full access to {selectedPlan.name} Plan features for 7 days without upfront payment.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">
                    Subscription Fee ({billingCycle})
                  </span>
                  <span className="font-black text-sm text-slate-900 font-mono">
                    {formatCurrency(
                      billingCycle === "Yearly" ? selectedPlan.yearlyPrice : selectedPlan.monthlyPrice
                    )}
                  </span>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block">Payment State</label>
                  <Select
                    value={paymentStatus}
                    onValueChange={(val) => setPaymentStatus(val as any)}
                  >
                    <SelectTrigger className="h-8 text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="Paid">Paid & Active</SelectItem>
                      <SelectItem value="Pending Payment">Pending Payment Verification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/agencies")}
              className="text-xs font-semibold h-10 px-5 rounded-xl cursor-pointer bg-white"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-10 px-6 rounded-xl shadow-xs cursor-pointer"
            >
              Create Agency Account
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
