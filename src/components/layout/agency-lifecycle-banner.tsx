"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { Phone,ShieldAlert } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

export function AgencyLifecycleBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, currentAgency, subscriptionAccess, isPlatformOwner } = useAuth();

  // If user is Platform Owner or has no subscription context, banner is not applicable
  if (isPlatformOwner || !currentUser.agencyId || !subscriptionAccess) {
    return null;
  }

  const status = subscriptionAccess.status;

  const handleContactSupport = () => {
    if (pathname === "/support") return;
    router.push("/support");
  };

  // 1. Account Suspended State Banner
  if (status === "SUSPENDED") {
    return (
      <div className="bg-rose-600 text-white px-2.5 sm:px-4 py-2 sm:py-2.5 shadow-md sticky top-16 z-30 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 sm:gap-2 font-medium text-[11px] sm:text-xs leading-snug w-full sm:w-auto">
          <ShieldAlert className="h-4 w-4 shrink-0 text-rose-200" />
          <span>
            <strong>Account Suspended:</strong> Your agency workspace is currently suspended. Please contact Your Travel Desk support to reactivate your account.
          </span>
        </div>
        {pathname !== "/support" && (
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto">
            <Button
              size="sm"
              onClick={handleContactSupport}
              className="w-full sm:w-auto justify-center bg-white text-rose-700 hover:bg-rose-50 font-bold text-[11px] sm:text-xs h-7 sm:h-7 px-3 rounded-lg cursor-pointer whitespace-nowrap"
            >
              <Phone className="h-3 w-3 mr-1 shrink-0" />
              <span className="sm:hidden">Contact Support</span>
              <span className="hidden sm:inline">Contact Your Travel Desk</span>
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Subscription & trial banners retired (Free SaaS). Only Account Suspended security banner remains.
  return null;
}
