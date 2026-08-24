"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { User, Settings, HelpCircle, LogOut, CreditCard, ShieldCheck, RefreshCw, Building } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

export function UserMenu() {
  const router = useRouter();
  const { currentUser, currentAgency, switchRole, logout } = useAuth();
  const isPlatformOwner = currentUser.role === "TRIPDESK_OWNER";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button className="flex items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 p-0.5 cursor-pointer group">
            <Avatar className="h-8 w-8 ring-2 ring-indigo-600/10 group-hover:ring-indigo-600/20 transition-all">
              <AvatarFallback
                className={`text-white text-xs font-semibold ${
                  isPlatformOwner ? "bg-purple-600" : "bg-indigo-600"
                }`}
              >
                {isPlatformOwner ? "AD" : currentUser.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>
        }
      />

      <DropdownMenuContent
        align="end"
        className="w-60 p-1 bg-white border border-border rounded-xl shadow-md mt-1"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-3 py-2 flex flex-col">
            <span className="font-bold text-sm text-foreground">{currentUser.name}</span>
            <span className="text-[11px] text-muted-foreground font-normal">
              {isPlatformOwner ? "TripDesk Platform Owner" : `${currentAgency.name} (Agency Owner)`}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="my-1 border-t border-slate-100" />

        {!isPlatformOwner ? (
          <>
            <DropdownMenuItem
              onClick={() => router.push("/subscription")}
              className="hover:bg-slate-50 cursor-pointer text-xs font-medium"
            >
              <CreditCard className="mr-2 h-4 w-4 text-emerald-600" />
              <span>Subscription & Plan</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => router.push("/settings")}
              className="hover:bg-slate-50 cursor-pointer text-xs font-medium"
            >
              <Settings className="mr-2 h-4 w-4 text-slate-500" />
              <span>Agency Settings</span>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem
              onClick={() => router.push("/admin/agencies")}
              className="hover:bg-slate-50 cursor-pointer text-xs font-medium"
            >
              <Building className="mr-2 h-4 w-4 text-purple-600" />
              <span>Manage Agencies</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => router.push("/admin/settings")}
              className="hover:bg-slate-50 cursor-pointer text-xs font-medium"
            >
              <Settings className="mr-2 h-4 w-4 text-slate-500" />
              <span>Platform Settings</span>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator className="my-1 border-t border-slate-100" />

        {/* Quick Role Switcher */}
        <DropdownMenuItem
          onClick={() =>
            switchRole(isPlatformOwner ? "AGENCY_OWNER" : "TRIPDESK_OWNER")
          }
          className="hover:bg-indigo-50 text-indigo-700 cursor-pointer text-xs font-medium"
        >
          <RefreshCw className="mr-2 h-4 w-4 text-indigo-600" />
          <span>
            Switch to {isPlatformOwner ? "Agency Owner" : "TripDesk Admin"}
          </span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1 border-t border-slate-100" />

        <DropdownMenuItem
          onClick={logout}
          className="hover:bg-red-50 text-red-600 focus:bg-red-50 focus:text-red-600 cursor-pointer text-xs font-medium"
        >
          <LogOut className="mr-2 h-4 w-4 text-red-500" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
