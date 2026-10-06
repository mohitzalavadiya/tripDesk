"use client";

import * as React from "react";
import Link from "next/link";
import { Lock, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LockedFeatureCardProps {
  featureName: string;
  featureKey?: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function LockedFeatureCard({
  featureName,
  description,
  icon: Icon,
}: LockedFeatureCardProps) {
  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-white shadow-xl relative overflow-hidden my-6">
      {/* Background Decorative Gradients */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-xl mx-auto flex flex-col items-center">
        {/* Icon Monogram */}
        <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-5 shadow-inner">
          {Icon ? <Icon className="h-8 w-8 stroke-[1.75]" /> : <Lock className="h-8 w-8 stroke-[1.75]" />}
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          <span>Professional Plan Feature</span>
        </div>

        {/* Title & Description */}
        <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-3">
          {featureName}
        </h3>
        <p className="text-sm text-slate-300 leading-relaxed mb-6 max-w-md">
          {description}
        </p>

        {/* Action Button */}
        <Link href="/subscription">
          <Button
            size="lg"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-6 h-11 rounded-xl shadow-lg shadow-indigo-600/25 flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Upgrade to Professional</span>
            <ArrowRight className="h-4 w-4 ml-0.5" />
          </Button>
        </Link>

        {/* Guarantee subtext */}
        <p className="text-[11px] text-slate-400 mt-4 flex items-center gap-1.5">
          <Lock className="h-3 w-3 text-slate-400" />
          <span>Instant upgrade with zero downtime or data loss</span>
        </p>
      </div>
    </div>
  );
}
