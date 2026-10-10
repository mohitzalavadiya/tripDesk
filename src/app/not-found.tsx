"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Compass, ArrowLeft, LayoutDashboard, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-100/60 px-4 py-12">
      <div className="w-full max-w-md mx-auto text-center space-y-6">
        {/* Brand / Logo Mark */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100/80 text-indigo-700 text-xs font-semibold shadow-xs">
          <Compass className="h-4 w-4 text-indigo-600 animate-spin-slow" />
          <span>Your Travel Desk</span>
        </div>

        {/* 404 Visual Icon Box */}
        <div className="relative mx-auto w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-indigo-600/5 to-purple-500/10 border border-indigo-100 flex items-center justify-center shadow-inner">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-indigo-500/5 to-transparent blur-xs pointer-events-none" />
          <span className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            404
          </span>
        </div>

        {/* Heading & Subtitle */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Page could not be found
          </h1>
          <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
            The page you are looking for might have been removed, moved, or the link may be out of date.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-sm transition-all w-full sm:w-auto"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Go to Dashboard</span>
          </Link>

          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="w-full sm:w-auto border-slate-200 text-slate-700 hover:bg-slate-100 font-medium transition-all"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span>Go Back</span>
          </Button>
        </div>

        {/* Secondary Help Link */}
        <div className="pt-4 border-t border-slate-200/60">
          <p className="text-xs text-slate-400">
            Need assistance?{" "}
            <Link
              href="/support"
              className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:text-indigo-500 hover:underline"
            >
              <LifeBuoy className="h-3 w-3" />
              <span>Contact Support</span>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
