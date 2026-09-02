"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Clock, AlertTriangle, ShieldAlert, Lock, Phone, CreditCard, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AgencyLifecycleBanner() {
  const router = useRouter();
  const { currentUser, currentAgency, subscriptionAccess, isPlatformOwner } = useAuth();

  // If user is Platform Owner or has no subscription context, banner is not applicable
  if (isPlatformOwner || !currentUser.agencyId || !subscriptionAccess) {
    return null;
  }

  const agencyName = currentAgency.name || currentUser.agencyName || "Agency";
  const status = subscriptionAccess.status;
  const trialDaysRemaining = subscriptionAccess.trialDaysRemaining ?? 0;

  const handleContactSupport = () => {
    window.open(
      `https://wa.me/919847099000?text=${encodeURIComponent(
        `Hi TripDesk Support! I am ${currentUser.name} from ${agencyName}. I need assistance with our SaaS account status.`
      )}`,
      "_blank"
    );
  };

  // 1. Account Suspended State Banner
  if (status === "SUSPENDED") {
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
  if (status === "READ_ONLY" || subscriptionAccess.isReadOnly) {
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
  if (status === "TRIAL" && trialDaysRemaining <= 1) {
    return (
      <div className="bg-amber-600 text-white px-4 py-2.5 shadow-md sticky top-16 z-30 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 font-medium">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-200" />
          <span>
            <strong>Trial Expiring {trialDaysRemaining === 0 ? "Today" : "Tomorrow"}:</strong> Your 7-day TripDesk free trial ends {trialDaysRemaining === 0 ? "today" : "tomorrow"}. Upgrade your plan to prevent service interruption.
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
  if (status === "TRIAL") {
    return (
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-900 text-white px-4 py-2 shadow-xs sticky top-16 z-30 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs border-b border-indigo-700/50">
        <div className="flex items-center gap-2 font-medium">
          <Clock className="h-3.5 w-3.5 shrink-0 text-amber-300" />
          <span>
            You are currently on your <strong>7-day free trial</strong> ({trialDaysRemaining} {trialDaysRemaining === 1 ? "day" : "days"} remaining).
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
