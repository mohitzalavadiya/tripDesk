"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Compass, ExternalLink, MessageCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";

export default function CustomerLoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <span className="text-xs text-slate-500 font-semibold">Loading...</span>
        </div>
      }
    >
      <GuestAccessNotice />
    </React.Suspense>
  );
}

function GuestAccessNotice() {
  const searchParams = useSearchParams();
  const tokenParam = (searchParams.get("token") || searchParams.get("b") || "").trim();
  const isDirectToken = tokenParam.startsWith("psl_");

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-8 px-4">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-10 shadow-xl shadow-slate-200/40 text-center space-y-6">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
          <Compass className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Stateless Guest Access</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Personal Travel Links
          </h1>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Customer login accounts and passwords are not required. Your Travel Desk delivers your
            quotations, live trip itineraries, and travel vouchers directly through secure sharing links.
          </p>
        </div>

        {isDirectToken ? (
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 text-left space-y-3">
            <p className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
              <span>Personal Travel Link Detected</span>
            </p>
            <p className="text-[11px] text-indigo-800 leading-normal">
              A travel token was provided. You can view your itinerary or booking pass directly:
            </p>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Link href={`/trip/${encodeURIComponent(tokenParam)}`} className="flex-1">
                <Button className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold gap-1.5">
                  <span>View Itinerary</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
              <Link href={`/b/${encodeURIComponent(tokenParam)}`} className="flex-1">
                <Button variant="outline" className="w-full h-10 rounded-xl border-indigo-200 text-xs font-bold gap-1.5">
                  <span>Booking Pass</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2">
            <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4 text-indigo-600" />
              <span>How to access your travel documents</span>
            </p>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Open the personal link sent to your <strong>WhatsApp</strong> or <strong>email</strong> by your
              travel agency. Every trip and quotation has a dedicated, secure link that opens instantly without
              requiring a password or login.
            </p>
          </div>
        )}

        <div className="pt-2">
          <Link href="/">
            <Button variant="ghost" className="text-xs font-bold text-slate-600 hover:text-slate-900">
              Return to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
