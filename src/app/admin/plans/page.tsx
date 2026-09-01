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
  RefreshCw,
  IndianRupee,
  Calendar,
} from "lucide-react";
import { adminClient } from "@/lib/api-client/admin-client";

export default function AdminPlansPage() {
  const [plans, setPlans] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Edit / Create Modal State
  const [modalMode, setModalMode] = React.useState<"CREATE" | "EDIT" | null>(null);
  const [targetPlanId, setTargetPlanId] = React.useState<string | null>(null);
  const [planName, setPlanName] = React.useState("");
  const [planDesc, setPlanDesc] = React.useState("");
  const [planPrice, setPlanPrice] = React.useState("2999");
  const [planDuration, setPlanDuration] = React.useState("30");
  const [saving, setSaving] = React.useState(false);

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
    setPlanDuration(String(plan.durationDays));
  };

  const handleOpenCreate = () => {
    setModalMode("CREATE");
    setTargetPlanId(null);
    setPlanName("");
    setPlanDesc("");
    setPlanPrice("3999");
    setPlanDuration("30");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modalMode === "CREATE") {
        await adminClient.createPlan({
          name: planName.trim(),
          description: planDesc.trim() || undefined,
          price: parseFloat(planPrice) || 0,
          durationDays: parseInt(planDuration) || 30,
          isActive: true,
        });
        toast.success("Subscription plan created successfully");
      } else if (modalMode === "EDIT" && targetPlanId) {
        await adminClient.updatePlan(targetPlanId, {
          name: planName.trim(),
          description: planDesc.trim() || undefined,
          price: parseFloat(planPrice) || 0,
          durationDays: parseInt(planDuration) || 30,
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
          description="Manage subscription tiers, pricing parameters, billing frequencies, and active agency quotas."
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
            <strong>TripDesk Subscription Engine:</strong> Pricing plans define agency billing cycles, renewal frequencies, and trial defaults. Existing subscribed agencies retain their pricing tiers upon renewal.
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
            {plans.map((p, idx) => (
              <div
                key={p.id}
                className="bg-white rounded-3xl p-6 shadow-2xs border border-slate-200/90 flex flex-col justify-between space-y-6 relative hover:border-purple-200 transition-all"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-xl text-slate-900">{p.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{p.description || "Full platform features"}</p>
                    </div>
                    <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100 shrink-0">
                      {p.subscriptionsCount} Active
                    </span>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Pricing & Duration</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-slate-900">₹{p.price.toLocaleString("en-IN")}</span>
                      <span className="text-xs text-slate-500 font-medium">/ {p.durationDays} days</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600">
                    <p className="font-semibold text-slate-700 uppercase tracking-wider text-[10px]">Tier Entitlements</p>
                    <ul className="space-y-1.5 text-slate-600">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Complete Travel Agency CRM
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> PDF Proposals & Vouchers
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> WhatsApp & Email Gateway
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Multi-Currency Ledger
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
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
            ))}
          </div>
        )}
      </div>

      {/* ─── CREATE / EDIT MODAL ────────────────────────────────────────── */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900">
              {modalMode === "CREATE" ? "Create Subscription Plan" : "Edit Plan Parameters"}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
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
                  <label className="text-xs font-bold text-slate-700">Price (INR)</label>
                  <Input
                    type="number"
                    value={planPrice}
                    onChange={(e) => setPlanPrice(e.target.value)}
                    placeholder="2999"
                    className="text-xs"
                    required
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

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
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
