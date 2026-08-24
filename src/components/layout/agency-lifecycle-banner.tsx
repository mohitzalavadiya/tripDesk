"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useSaaS } from "@/context/saas-context";
import { Clock, AlertTriangle, ShieldAlert, Lock, Phone, CreditCard, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AgencyLifecycleBanner() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { agencies, subscriptions } = useSaaS();

  // If user is TripDesk Owner, lifecycle banner is not applicable
  if (currentUser.role === "TRIPDESK_OWNER" || !currentUser.agencyId) {
    return null;
  }

  const currentAgency = agencies.find((a) => a.id === currentUser.agencyId);
  const currentSub = subscriptions.find((s) => s.agencyId === currentUser.agencyId);

  if (!currentAgency) return null;

  // Calculate days remaining if in trial
  let trialDaysRemaining = 5;
  if (currentSub?.trialEnd) {
    const end = new Date(currentSub.trialEnd).getTime();
    const now = new Date().getTime();
    const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    trialDaysRemaining = Math.max(0, diffDays);
  }

  const handleContactSupport = () => {
    window.open(
      `https://wa.me/919847099000?text=${encodeURIComponent(
        `Hi TripDesk Support! I am ${currentUser.name} from ${currentAgency.name}. I need assistance with our SaaS account status.`
      )}`,
      "_blank"
    );
  };

  // 1. Account Suspended State Banner
  if (currentAgency.status === "SUSPENDED") {
    return (
      <div className="bg-rose-600 text-white px-4 py-2.5 shadow-md sticky top-16 z-30 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 font-medium">
          <ShieldAlert className="h-4 w-4 shrink-0 text-rose-200" />
          <span>
            <strong>Account Suspended:</strong> Your TripDesk agency workspace is currently suspended. Please contact TripDesk support to reactivate your account.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={handleContactSupport}
            className="bg-white text-rose-700 hover:bg-rose-50 font-bold text-xs h-7 px-3 rounded-lg cursor-pointer"
          >
            <Phone className="h-3 w-3 mr-1" />
            Contact TripDesk
          </Button>
        </div>
      </div>
    );
  }

  // 2. Read Only Mode Banner
  if (currentAgency.status === "READ_ONLY") {
    return (
      <div className="bg-blue-600 text-white px-4 py-2.5 shadow-md sticky top-16 z-30 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 font-medium">
          <Lock className="h-4 w-4 shrink-0 text-blue-200" />
          <span>
            <strong>Read Only Mode:</strong> Your subscription is inactive. You can view existing data, but creating or editing operations is disabled.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={() => router.push("/subscription")}
            className="bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs h-7 px-3 rounded-lg cursor-pointer"
          >
            <CreditCard className="h-3 w-3 mr-1" />
            Renew Subscription
          </Button>
          <Button
            size="sm"
            onClick={handleContactSupport}
            className="bg-blue-700 text-white hover:bg-blue-800 font-bold text-xs h-7 px-3 rounded-lg cursor-pointer"
          >
            Contact TripDesk
          </Button>
        </div>
      </div>
    );
  }

  // 3. Trial Expiring Tomorrow Banner
  if (currentAgency.status === "TRIAL" && trialDaysRemaining <= 1) {
    return (
      <div className="bg-amber-600 text-white px-4 py-2.5 shadow-md sticky top-16 z-30 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 font-medium">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-200" />
          <span>
            <strong>Trial Expiring Tomorrow:</strong> Your 7-day TripDesk free trial ends tomorrow. Contact TripDesk to activate your full plan.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={() => router.push("/subscription")}
            className="bg-white text-amber-800 hover:bg-amber-50 font-bold text-xs h-7 px-3 rounded-lg cursor-pointer"
          >
            View Plans
          </Button>
          <Button
            size="sm"
            onClick={handleContactSupport}
            className="bg-amber-700 text-white hover:bg-amber-800 font-bold text-xs h-7 px-3 rounded-lg cursor-pointer"
          >
            Contact TripDesk
          </Button>
        </div>
      </div>
    );
  }

  // 4. Standard 7-Day Free Trial Banner
  if (currentAgency.status === "TRIAL") {
    return (
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-900 text-white px-4 py-2 shadow-xs sticky top-16 z-30 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs border-b border-indigo-700/50">
        <div className="flex items-center gap-2 font-medium">
          <Clock className="h-3.5 w-3.5 shrink-0 text-amber-300" />
          <span>
            You are currently on your <strong>7-day free trial</strong> ({trialDaysRemaining} days remaining).
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={() => router.push("/subscription")}
            className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs h-6.5 px-3 rounded-lg cursor-pointer"
          >
            View Plans & Upgrade
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleContactSupport}
            className="text-white hover:bg-white/10 text-xs h-6.5 px-2.5 rounded-lg cursor-pointer"
          >
            Contact TripDesk
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
