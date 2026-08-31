"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { customerPortalClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Compass, ShieldCheck, ArrowRight, Loader2, Sparkles, KeyRound } from "lucide-react";

export default function CustomerLoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <span className="mt-2 text-xs text-slate-500 font-semibold">Loading portal...</span>
        </div>
      }
    >
      <CustomerLoginForm />
    </React.Suspense>
  );
}

function CustomerLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get("token") || searchParams.get("b") || "";

  const [bookingNumber, setBookingNumber] = React.useState(tokenParam);
  const [phone, setPhone] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Auto-authenticate if token passed in URL
  React.useEffect(() => {
    if (tokenParam) {
      handleAccess(tokenParam, "");
    }
  }, [tokenParam]);

  const handleAccess = async (identifier: string, phoneNumber?: string) => {
    try {
      setLoading(true);
      setError(null);
      await customerPortalClient.access(identifier, phoneNumber || undefined);
      toast.success("Welcome back! Loading your travel itinerary...");
      router.push("/customer");
    } catch (err: any) {
      setError(err?.message || "Invalid booking reference or phone number.");
      toast.error(err?.message || "Could not access booking.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingNumber.trim()) {
      toast.error("Please enter your Booking Reference or Travel Token.");
      return;
    }
    handleAccess(bookingNumber.trim(), phone.trim());
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-6 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/90 p-8 shadow-xl shadow-slate-200/40 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mb-1 shadow-2xs">
            <Compass className="w-6 h-6 animate-pulse" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            Access Your Travel Portal
          </h1>
          <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto">
            View your real-time itinerary, download hotel vouchers, check driver details, and access travel documents.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-800 text-xs font-semibold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Booking Reference or Pass Token <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                type="text"
                value={bookingNumber}
                onChange={(e) => setBookingNumber(e.target.value)}
                placeholder="e.g. BKG-2026-001 or Share Token"
                className="h-11 rounded-xl text-xs font-semibold pl-10 border-slate-200 focus:border-indigo-500"
                required
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Registered Mobile Number (Optional)
            </label>
            <Input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 9876543210"
              className="h-11 rounded-xl text-xs font-semibold border-slate-200 focus:border-indigo-500"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Access...</span>
              </>
            ) : (
              <>
                <span>Open Traveler Portal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>

        <div className="pt-2 border-t border-slate-100 text-center flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>256-bit Encrypted Guest Security</span>
        </div>
      </div>
    </div>
  );
}
