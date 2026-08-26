"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReadOnlyBannerProps {
  moduleName?: string;
}

export function ReadOnlyBanner({ moduleName = "Workspace" }: ReadOnlyBannerProps) {
  return (
    <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in-0 duration-200">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5 text-amber-700">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs font-bold text-amber-900">
            Subscription Expired — Read-Only Mode
          </p>
          <p className="text-[11px] text-amber-800 mt-0.5">
            Your {moduleName} records are safely preserved and accessible in read-only mode. Renew your subscription to resume creating or modifying data.
          </p>
        </div>
      </div>
      <Link href="/subscription" className="shrink-0">
        <Button
          size="sm"
          className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-8 px-3 rounded-lg shadow-xs flex items-center gap-1 cursor-pointer"
        >
          <span>Renew Subscription</span>
          <ArrowRight className="h-3 w-3" />
        </Button>
      </Link>
    </div>
  );
}
