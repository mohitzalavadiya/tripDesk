"use client";

import * as React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Sparkles,
  Layers,
  Edit2,
  Plus,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Gauge,
  ShieldCheck,
} from "lucide-react";
import { adminClient } from "@/lib/api-client/admin-client";
import { useModalScrollLock } from "@/lib/scroll-lock";

export default function AdminPlansPage() {
  const [plans, setPlans] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Edit / Create Modal State
  const [modalMode, setModalMode] = React.useState<"CREATE" | "EDIT" | null>(null);

  useModalScrollLock(Boolean(modalMode));
  const [targetPlanId, setTargetPlanId] = React.useState<string | null>(null);
  const [planName, setPlanName] = React.useState("");
  const [planDesc, setPlanDesc] = React.useState("");
  const [planPrice, setPlanPrice] = React.useState("1999");
  const [planYearlyPrice, setPlanYearlyPrice] = React.useState("19999");
  const [planDuration, setPlanDuration] = React.useState("30");
  const [planFeatures, setPlanFeatures] = React.useState("");
  const [isPopular, setIsPopular] = React.useState(false);
  const [displayOrder, setDisplayOrder] = React.useState("1");
  const [isActive, setIsActive] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  // Normalized Entitlements & Usage Limits State
  const [entitlements, setEntitlements] = React.useState({
    CUSTOM_AGENCY_LOGO: false,
    FEEDBACK_REVIEWS: false,
    CUSTOMER_INSIGHTS: false,
    REPORTS_ANALYTICS: false,
  });

  const [usageLimits, setUsageLimits] = React.useState<{
    TRIPS: { isUnlimited: boolean; value: string };
    QUOTATIONS: { isUnlimited: boolean; value: string };
    BOOKINGS: { isUnlimited: boolean; value: string };
  }>({
    TRIPS: { isUnlimited: false, value: "20" },
    QUOTATIONS: { isUnlimited: false, value: "20" },
    BOOKINGS: { isUnlimited: false, value: "20" },
  });

  const fetchPlans = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminClient.listPlans();
      if (res.success && res.data) {
        setPlans(res.data);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load plans");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleOpenEdit = (plan: any) => {
    setModalMode("EDIT");
    setTargetPlanId(plan.id);
    setPlanName(plan.name);
    setPlanDesc(plan.description || "");
    setPlanPrice(String(plan.price));
    setPlanYearlyPrice(plan.yearlyPrice ? String(plan.yearlyPrice) : "");
    setPlanDuration(String(plan.durationDays || 30));
    setPlanFeatures(
      Array.isArray(plan.features) ? plan.features.join("\n") : ""
    );
    setIsPopular(Boolean(plan.isPopular));
    setDisplayOrder(String(plan.displayOrder || 0));
    setIsActive(Boolean(plan.isActive));

    setEntitlements({
      CUSTOM_AGENCY_LOGO: Boolean(plan.entitlements?.CUSTOM_AGENCY_LOGO),
      FEEDBACK_REVIEWS: Boolean(plan.entitlements?.FEEDBACK_REVIEWS),
      CUSTOMER_INSIGHTS: Boolean(plan.entitlements?.CUSTOMER_INSIGHTS),
      REPORTS_ANALYTICS: Boolean(plan.entitlements?.REPORTS_ANALYTICS),
    });

    setUsageLimits({
      TRIPS: {
        isUnlimited: plan.usageLimits?.TRIPS === null,
        value: plan.usageLimits?.TRIPS !== null && plan.usageLimits?.TRIPS !== undefined ? String(plan.usageLimits.TRIPS) : "20",
      },
      QUOTATIONS: {
        isUnlimited: plan.usageLimits?.QUOTATIONS === null,
        value: plan.usageLimits?.QUOTATIONS !== null && plan.usageLimits?.QUOTATIONS !== undefined ? String(plan.usageLimits.QUOTATIONS) : "20",
      },
      BOOKINGS: {
        isUnlimited: plan.usageLimits?.BOOKINGS === null,
        value: plan.usageLimits?.BOOKINGS !== null && plan.usageLimits?.BOOKINGS !== undefined ? String(plan.usageLimits.BOOKINGS) : "20",
      },
    });
  };

  const handleOpenCreate = () => {
    setModalMode("CREATE");
    setTargetPlanId(null);
    setPlanName("");
    setPlanDesc("");
    setPlanPrice("2999");
    setPlanYearlyPrice("29999");
    setPlanDuration("30");
    setPlanFeatures(
      "Customer Management & CRM\nTrip Planning & Itinerary Builder\nQuotation Engine & PDF Export\nBooking Management & Vouchers"
    );
    setIsPopular(false);
    setDisplayOrder(String(plans.length + 1));
    setIsActive(true);

    setEntitlements({
      CUSTOM_AGENCY_LOGO: false,
      FEEDBACK_REVIEWS: false,
      CUSTOMER_INSIGHTS: false,
      REPORTS_ANALYTICS: false,
    });

    setUsageLimits({
      TRIPS: { isUnlimited: false, value: "20" },
      QUOTATIONS: { isUnlimited: false, value: "20" },
      BOOKINGS: { isUnlimited: false, value: "20" },
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const parsedFeatures = planFeatures
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean);

      const parsedEntitlements = {
        CUSTOM_AGENCY_LOGO: entitlements.CUSTOM_AGENCY_LOGO,
        FEEDBACK_REVIEWS: entitlements.FEEDBACK_REVIEWS,
        CUSTOMER_INSIGHTS: entitlements.CUSTOMER_INSIGHTS,
        REPORTS_ANALYTICS: entitlements.REPORTS_ANALYTICS,
      };

      const parsedUsageLimits = {
        TRIPS: usageLimits.TRIPS.isUnlimited ? null : (parseInt(usageLimits.TRIPS.value) >= 0 ? parseInt(usageLimits.TRIPS.value) : 0),
        QUOTATIONS: usageLimits.QUOTATIONS.isUnlimited ? null : (parseInt(usageLimits.QUOTATIONS.value) >= 0 ? parseInt(usageLimits.QUOTATIONS.value) : 0),
        BOOKINGS: usageLimits.BOOKINGS.isUnlimited ? null : (parseInt(usageLimits.BOOKINGS.value) >= 0 ? parseInt(usageLimits.BOOKINGS.value) : 0),
      };

      if (modalMode === "CREATE") {
        await adminClient.createPlan({
          name: planName.trim(),
          description: planDesc.trim() || undefined,
          price: parseFloat(planPrice) || 0,
          yearlyPrice: planYearlyPrice.trim() ? parseFloat(planYearlyPrice) : null,
          durationDays: parseInt(planDuration) || 30,
          features: parsedFeatures,
          isPopular,
          displayOrder: parseInt(displayOrder) || 0,
          isActive,
          entitlements: parsedEntitlements,
          usageLimits: parsedUsageLimits,
        });
        toast.success("Subscription plan created successfully");
      } else if (modalMode === "EDIT" && targetPlanId) {
        await adminClient.updatePlan(targetPlanId, {
          name: planName.trim(),
          description: planDesc.trim() || undefined,
          price: parseFloat(planPrice) || 0,
          yearlyPrice: planYearlyPrice.trim() ? parseFloat(planYearlyPrice) : null,
          durationDays: parseInt(planDuration) || 30,
          features: parsedFeatures,
          isPopular,
          displayOrder: parseInt(displayOrder) || 0,
          isActive,
          entitlements: parsedEntitlements,
          usageLimits: parsedUsageLimits,
        });
        toast.success("Subscription plan updated successfully");
      }
      setModalMode(null);
      fetchPlans();
    } catch (err: any) {
      toast.error(err.message || "Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Top Header */}
        <PageHeader
          title="SaaS Plans & Pricing"
          description="Manage subscription tiers, pricing parameters, machine feature entitlements, and active agency usage quotas."
          breadcrumbs={[{ label: "SaaS Platform", href: "/admin" }, { label: "Plans & Pricing" }]}
          primaryAction={{
            label: "+ Create Plan",
            onClick: handleOpenCreate,
            icon: Plus,
          }}
        />

        {/* Informational Banner */}
        <div className="bg-purple-50/80 border border-purple-200/80 rounded-2xl p-4 flex items-center gap-3 text-xs text-purple-900 shadow-2xs">
          <Sparkles className="h-5 w-5 text-purple-600 shrink-0" />
          <span>
            <strong>TripDesk Subscription Engine:</strong> Pricing plans define agency billing options, feature entitlements, and creation usage limits. Changes updated here take effect immediately across all active agency subscriptions.
          </span>
        </div>

        {/* ─── PLANS CARDS GRID ────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-400 text-xs gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-purple-600" />
            Loading subscription plans...
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <Layers className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-600">No subscription plans found in database.</p>
            <Button size="sm" onClick={handleOpenCreate} className="bg-purple-600 text-white text-xs">
              + Create First Plan
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl">
            {plans.map((p) => {
              const featuresList = Array.isArray(p.features) ? p.features : [];
              const ent = p.entitlements || {};
              const lim = p.usageLimits || {};

              return (
                <div
                  key={p.id}
                  className={`bg-white rounded-3xl p-6 shadow-2xs border flex flex-col justify-between space-y-6 relative transition-all ${
                    p.isPopular
                      ? "border-purple-300 ring-2 ring-purple-500/20"
                      : "border-slate-200/90 hover:border-purple-200"
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-xl text-slate-900">{p.name}</h3>
                          {p.isPopular && (
                            <span className="text-[10px] font-black uppercase tracking-wider bg-purple-600 text-white px-2 py-0.5 rounded-full">
                              Popular
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{p.description || "Full platform features"}</p>
                      </div>
                      <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100 shrink-0">
                        {p.subscriptionsCount} Active
                      </span>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Monthly Rate</span>
                          <span className="text-2xl font-black text-slate-900">
                            ₹{p.price.toLocaleString("en-IN")}
                          </span>
                          <span className="text-xs text-slate-500 font-medium"> / mo</span>
                        </div>
                        {p.yearlyPrice && (
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Yearly Rate</span>
                            <span className="text-xl font-black text-purple-700">
                              ₹{p.yearlyPrice.toLocaleString("en-IN")}
                            </span>
                            <span className="text-xs text-slate-500 font-medium"> / yr</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Machine Usage Quotas */}
                    <div className="space-y-2 text-xs bg-purple-50/40 p-3.5 rounded-2xl border border-purple-100/60">
                      <div className="flex items-center gap-1.5 font-bold text-purple-900 uppercase tracking-wider text-[10px]">
                        <Gauge className="h-3.5 w-3.5 text-purple-600" />
                        <span>Resource Creation Quotas</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center pt-1">
                        <div className="bg-white p-2 rounded-xl border border-purple-100 shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-500 block">Trips</span>
                          <span className="text-xs font-black text-slate-900">
                            {lim.TRIPS === null ? "Unlimited" : lim.TRIPS}
                          </span>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-purple-100 shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-500 block">Quotations</span>
                          <span className="text-xs font-black text-slate-900">
                            {lim.QUOTATIONS === null ? "Unlimited" : lim.QUOTATIONS}
                          </span>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-purple-100 shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-500 block">Bookings</span>
                          <span className="text-xs font-black text-slate-900">
                            {lim.BOOKINGS === null ? "Unlimited" : lim.BOOKINGS}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Machine Feature Entitlements */}
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                        <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
                        <span>Feature Access Flags</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className={`flex items-center gap-1.5 p-2 rounded-xl border ${ent.CUSTOM_AGENCY_LOGO ? "bg-emerald-50/60 border-emerald-200/60 text-emerald-900" : "bg-slate-50 border-slate-200/60 text-slate-400 opacity-70"}`}>
                          {ent.CUSTOM_AGENCY_LOGO ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> : <XCircle className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                          <span className="font-semibold truncate">Agency Logo</span>
                        </div>

                        <div className={`flex items-center gap-1.5 p-2 rounded-xl border ${ent.FEEDBACK_REVIEWS ? "bg-emerald-50/60 border-emerald-200/60 text-emerald-900" : "bg-slate-50 border-slate-200/60 text-slate-400 opacity-70"}`}>
                          {ent.FEEDBACK_REVIEWS ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> : <XCircle className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                          <span className="font-semibold truncate">Feedback & Reviews</span>
                        </div>

                        <div className={`flex items-center gap-1.5 p-2 rounded-xl border ${ent.CUSTOMER_INSIGHTS ? "bg-emerald-50/60 border-emerald-200/60 text-emerald-900" : "bg-slate-50 border-slate-200/60 text-slate-400 opacity-70"}`}>
                          {ent.CUSTOMER_INSIGHTS ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> : <XCircle className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                          <span className="font-semibold truncate">Customer Insights</span>
                        </div>

                        <div className={`flex items-center gap-1.5 p-2 rounded-xl border ${ent.REPORTS_ANALYTICS ? "bg-emerald-50/60 border-emerald-200/60 text-emerald-900" : "bg-slate-50 border-slate-200/60 text-slate-400 opacity-70"}`}>
                          {ent.REPORTS_ANALYTICS ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> : <XCircle className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                          <span className="font-semibold truncate">Reports & BI</span>
                        </div>
                      </div>
                    </div>

                    {/* Marketing Text Features */}
                    {featuresList.length > 0 && (
                      <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                        <p className="font-semibold text-slate-700 uppercase tracking-wider text-[10px]">
                          Marketing Bullets ({featuresList.length})
                        </p>
                        <ul className="space-y-1.5 text-slate-600 max-h-32 overflow-y-auto pr-1">
                          {featuresList.map((feat: string, fIdx: number) => (
                            <li key={fIdx} className="flex items-center gap-2">
                              <CheckCircle2 className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        p.isActive
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {p.isActive ? "Active Plan" : "Archived"}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEdit(p)}
                      className="h-8 text-xs font-semibold hover:border-purple-300"
                    >
                      <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit Tier
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── CREATE / EDIT MODAL ────────────────────────────────────────── */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {modalMode === "CREATE" ? "Create Subscription Plan" : "Edit Plan Parameters"}
              </h3>
              <p className="text-xs text-slate-500">Configure pricing, usage limits, and platform feature access.</p>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Plan Name</label>
                <Input
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="e.g. Starter, Professional, Enterprise"
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Description / Tagline</label>
                <Input
                  value={planDesc}
                  onChange={(e) => setPlanDesc(e.target.value)}
                  placeholder="e.g. Ideal for growing travel agencies"
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Monthly Price (₹)</label>
                  <Input
                    type="number"
                    value={planPrice}
                    onChange={(e) => setPlanPrice(e.target.value)}
                    placeholder="1999"
                    className="text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Yearly Price (₹)</label>
                  <Input
                    type="number"
                    value={planYearlyPrice}
                    onChange={(e) => setPlanYearlyPrice(e.target.value)}
                    placeholder="19999"
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Display Order</label>
                  <Input
                    type="number"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(e.target.value)}
                    placeholder="1"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Duration (Days)</label>
                  <Input
                    type="number"
                    value={planDuration}
                    onChange={(e) => setPlanDuration(e.target.value)}
                    placeholder="30"
                    className="text-xs"
                    required
                  />
                </div>
              </div>

              {/* ─── MACHINE USAGE QUOTAS SECTION ────────────────── */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Gauge className="h-4 w-4 text-purple-600" />
                  <span>Resource Creation Quotas (per Billing Period)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* TRIPS */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                    <label className="text-[11px] font-bold text-slate-700 block">Trips Limit</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        disabled={usageLimits.TRIPS.isUnlimited}
                        value={usageLimits.TRIPS.isUnlimited ? "" : usageLimits.TRIPS.value}
                        onChange={(e) =>
                          setUsageLimits((prev) => ({
                            ...prev,
                            TRIPS: { ...prev.TRIPS, value: e.target.value },
                          }))
                        }
                        placeholder={usageLimits.TRIPS.isUnlimited ? "∞ Unlimited" : "20"}
                        className="text-xs h-8"
                      />
                    </div>
                    <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 cursor-pointer pt-0.5">
                      <input
                        type="checkbox"
                        checked={usageLimits.TRIPS.isUnlimited}
                        onChange={(e) =>
                          setUsageLimits((prev) => ({
                            ...prev,
                            TRIPS: { ...prev.TRIPS, isUnlimited: e.target.checked },
                          }))
                        }
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
                      />
                      <span>Unlimited</span>
                    </label>
                  </div>

                  {/* QUOTATIONS */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                    <label className="text-[11px] font-bold text-slate-700 block">Quotations Limit</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        disabled={usageLimits.QUOTATIONS.isUnlimited}
                        value={usageLimits.QUOTATIONS.isUnlimited ? "" : usageLimits.QUOTATIONS.value}
                        onChange={(e) =>
                          setUsageLimits((prev) => ({
                            ...prev,
                            QUOTATIONS: { ...prev.QUOTATIONS, value: e.target.value },
                          }))
                        }
                        placeholder={usageLimits.QUOTATIONS.isUnlimited ? "∞ Unlimited" : "20"}
                        className="text-xs h-8"
                      />
                    </div>
                    <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 cursor-pointer pt-0.5">
                      <input
                        type="checkbox"
                        checked={usageLimits.QUOTATIONS.isUnlimited}
                        onChange={(e) =>
                          setUsageLimits((prev) => ({
                            ...prev,
                            QUOTATIONS: { ...prev.QUOTATIONS, isUnlimited: e.target.checked },
                          }))
                        }
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
                      />
                      <span>Unlimited</span>
                    </label>
                  </div>

                  {/* BOOKINGS */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                    <label className="text-[11px] font-bold text-slate-700 block">Bookings Limit</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        disabled={usageLimits.BOOKINGS.isUnlimited}
                        value={usageLimits.BOOKINGS.isUnlimited ? "" : usageLimits.BOOKINGS.value}
                        onChange={(e) =>
                          setUsageLimits((prev) => ({
                            ...prev,
                            BOOKINGS: { ...prev.BOOKINGS, value: e.target.value },
                          }))
                        }
                        placeholder={usageLimits.BOOKINGS.isUnlimited ? "∞ Unlimited" : "20"}
                        className="text-xs h-8"
                      />
                    </div>
                    <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 cursor-pointer pt-0.5">
                      <input
                        type="checkbox"
                        checked={usageLimits.BOOKINGS.isUnlimited}
                        onChange={(e) =>
                          setUsageLimits((prev) => ({
                            ...prev,
                            BOOKINGS: { ...prev.BOOKINGS, isUnlimited: e.target.checked },
                          }))
                        }
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
                      />
                      <span>Unlimited</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* ─── MACHINE FEATURE ENTITLEMENTS SECTION ────────── */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <ShieldCheck className="h-4 w-4 text-purple-600" />
                  <span>Platform Feature Access Flags</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-purple-200 transition-all">
                    <span className="text-xs font-semibold text-slate-800">Custom Agency Logo</span>
                    <input
                      type="checkbox"
                      checked={entitlements.CUSTOM_AGENCY_LOGO}
                      onChange={(e) =>
                        setEntitlements((prev) => ({
                          ...prev,
                          CUSTOM_AGENCY_LOGO: e.target.checked,
                        }))
                      }
                      className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-purple-200 transition-all">
                    <span className="text-xs font-semibold text-slate-800">Feedback & Reviews</span>
                    <input
                      type="checkbox"
                      checked={entitlements.FEEDBACK_REVIEWS}
                      onChange={(e) =>
                        setEntitlements((prev) => ({
                          ...prev,
                          FEEDBACK_REVIEWS: e.target.checked,
                        }))
                      }
                      className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-purple-200 transition-all">
                    <span className="text-xs font-semibold text-slate-800">Customer Insights</span>
                    <input
                      type="checkbox"
                      checked={entitlements.CUSTOMER_INSIGHTS}
                      onChange={(e) =>
                        setEntitlements((prev) => ({
                          ...prev,
                          CUSTOMER_INSIGHTS: e.target.checked,
                        }))
                      }
                      className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-purple-200 transition-all">
                    <span className="text-xs font-semibold text-slate-800">Reports & Analytics</span>
                    <input
                      type="checkbox"
                      checked={entitlements.REPORTS_ANALYTICS}
                      onChange={(e) =>
                        setEntitlements((prev) => ({
                          ...prev,
                          REPORTS_ANALYTICS: e.target.checked,
                        }))
                      }
                      className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
                    />
                  </label>
                </div>
              </div>

              {/* Marketing Display Bullets */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Marketing Display Bullets (One per line)
                </label>
                <Textarea
                  value={planFeatures}
                  onChange={(e) => setPlanFeatures(e.target.value)}
                  placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                  className="text-xs min-h-[90px] font-sans"
                />
              </div>

              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPopular}
                    onChange={(e) => setIsPopular(e.target.checked)}
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                  />
                  Featured / Popular Badge
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                  />
                  Active Plan (Visible to Agencies)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalMode(null)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={saving}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
                >
                  {saving ? "Saving..." : "Save Plan"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


