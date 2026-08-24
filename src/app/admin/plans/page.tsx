"use client";

import * as React from "react";
import { useSaaS } from "@/context/saas-context";
import { PageHeader } from "@/components/shared/page-header";
import { formatCurrency } from "@/lib/costing-engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Check, Edit2, X, Sparkles, Layers, ShieldCheck } from "lucide-react";
import { SaaSPlan } from "@/data/saas-data";

export default function AdminPlansPage() {
  const { plans, updatePlan, subscriptions } = useSaaS();

  // Edit Plan Modal State
  const [editingPlan, setEditingPlan] = React.useState<SaaSPlan | null>(null);
  const [editMonthlyPrice, setEditMonthlyPrice] = React.useState("");
  const [editYearlyPrice, setEditYearlyPrice] = React.useState("");
  const [editTagline, setEditTagline] = React.useState("");
  const [editFeatures, setEditFeatures] = React.useState("");

  const handleOpenEdit = (plan: SaaSPlan) => {
    setEditingPlan(plan);
    setEditMonthlyPrice(String(plan.monthlyPrice));
    setEditYearlyPrice(String(plan.yearlyPrice));
    setEditTagline(plan.tagline);
    setEditFeatures(plan.features.join("\n"));
  };

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    const featureList = editFeatures
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);

    updatePlan(editingPlan.id, {
      monthlyPrice: parseFloat(editMonthlyPrice) || 0,
      yearlyPrice: parseFloat(editYearlyPrice) || 0,
      tagline: editTagline.trim(),
      features: featureList,
    });

    setEditingPlan(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-20">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Top Header */}
        <PageHeader
          title="SaaS Plans & Pricing"
          description="Manage TripDesk V1 subscription tiers, placeholder pricing parameters, and plan entitlements."
          breadcrumbs={[{ label: "SaaS Platform" }, { label: "Plans & Pricing" }]}
        />

        {/* Notice on V1 Pricing */}
        <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-4 flex items-center gap-3 text-xs text-purple-900">
          <Sparkles className="h-5 w-5 text-purple-600 shrink-0" />
          <span>
            <strong>V1 Plan Structure:</strong> TripDesk features two subscription tiers: <strong>Starter</strong> and <strong>Professional</strong>. All prices shown are placeholder values for preview and mock administration.
          </span>
        </div>

        {/* ─── 2 PLANS GRID ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch max-w-4xl mx-auto">
          {plans.map((p) => {
            const activeCount = subscriptions.filter(
              (s) => s.planId === p.id && (s.status === "ACTIVE" || s.status === "TRIAL")
            ).length;
            const isPro = p.id === "professional";

            return (
              <div
                key={p.id}
                className={`bg-white rounded-3xl p-6 sm:p-8 shadow-2xs border flex flex-col justify-between space-y-6 relative ${
                  isPro
                    ? "border-2 border-purple-600 ring-4 ring-purple-50"
                    : "border-slate-200/90"
                }`}
              >
                {isPro && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[10px] font-black uppercase px-3.5 py-1 rounded-full tracking-wider shadow-sm">
                    Recommended Tier
                  </span>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-xl text-slate-900">{p.name} Plan</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{p.tagline}</p>
                    </div>
                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 shrink-0">
                      {activeCount} Subscribed
                    </span>
                  </div>

                  <div className="space-y-0.5 py-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-slate-900 font-mono">
                        {formatCurrency(p.monthlyPrice)}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">/ month</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium font-mono">
                      or {formatCurrency(p.yearlyPrice)} billed annually
                    </p>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Included Features
                    </span>
                    {p.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-slate-700">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  variant={isPro ? "default" : "outline"}
                  onClick={() => handleOpenEdit(p)}
                  className={`w-full text-xs font-bold h-9 rounded-xl cursor-pointer ${
                    isPro ? "bg-purple-600 hover:bg-purple-700 text-white shadow-xs" : "bg-white"
                  }`}
                >
                  <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                  Edit Plan & Features
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── EDIT PLAN MODAL ──────────────────────────────────────────────── */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-0">
          <div className="bg-white border border-slate-200/90 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-4 text-xs animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-purple-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Edit {editingPlan.name} Plan
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Monthly Price (₹)</label>
                  <Input
                    type="number"
                    value={editMonthlyPrice}
                    onChange={(e) => setEditMonthlyPrice(e.target.value)}
                    className="h-8.5 text-xs font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Yearly Price (₹)</label>
                  <Input
                    type="number"
                    value={editYearlyPrice}
                    onChange={(e) => setEditYearlyPrice(e.target.value)}
                    className="h-8.5 text-xs font-mono"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Plan Tagline</label>
                <Input
                  value={editTagline}
                  onChange={(e) => setEditTagline(e.target.value)}
                  className="h-8.5 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Features (One per line)</label>
                <Textarea
                  value={editFeatures}
                  onChange={(e) => setEditFeatures(e.target.value)}
                  rows={6}
                  className="text-xs font-sans leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingPlan(null)}
                  className="h-8 text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-8 px-4 rounded-xl cursor-pointer"
                >
                  Save Plan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
