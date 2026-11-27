"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import Link from "next/link";
import * as React from "react";

interface OwnerRestrictedCardProps {
  featureName: string;
  badgeText?: string;
  description?: string;
}

export function OwnerRestrictedCard({
  featureName,
  badgeText = "Owner Restricted",
  description = "This module contains commercial margins, financial administration, or workspace settings restricted to the Agency Owner.",
}: OwnerRestrictedCardProps) {
  return (
    <div className="w-full max-w-2xl mx-auto my-12 p-8 bg-white border border-amber-200/80 rounded-2xl shadow-sm text-center">
      <div className="h-14 w-14 mx-auto mb-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
        <ShieldAlert className="h-7 w-7" />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-semibold mb-3">
        <span>{badgeText}</span>
      </div>

      <h3 className="text-xl font-bold text-slate-900 mb-2">
        {featureName} Restricted Access
      </h3>
      <p className="text-sm text-slate-600 max-w-md mx-auto mb-6 leading-relaxed">
        {description}
      </p>

      <Link href="/dashboard">
        <Button variant="outline" className="gap-2 font-medium cursor-pointer">
          <ArrowLeft className="h-4 w-4" />
          <span>Return to Dashboard</span>
        </Button>
      </Link>
    </div>
  );
}
