import * as React from "react";
import Link from "next/link";
import { Compass, FileText, CreditCard, User, HelpCircle, ShieldCheck, Phone, MessageSquare, Bell } from "lucide-react";
import { CustomerNotificationBell } from "@/components/customer/customer-notification-bell";

export const metadata = {
  title: "TripDesk Traveler Portal — My Trips & Documents",
  description: "Secure, real-time travel itinerary, hotel vouchers, transfers, and booking documentation.",
};

export default function CustomerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100/60 text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/customer" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform duration-200">
              <Compass className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-900">TripDesk</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                  Guest
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-none">Traveler Portal</p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden sm:flex items-center gap-1">
            <Link
              href="/customer"
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/60 transition-colors flex items-center gap-1.5"
            >
              <Compass className="w-4 h-4" />
              <span>My Trips</span>
            </Link>
            <Link
              href="/customer/notifications"
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/60 transition-colors flex items-center gap-1.5"
            >
              <Bell className="w-4 h-4" />
              <span>Alerts</span>
            </Link>
            <Link
              href="/customer/profile"
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/60 transition-colors flex items-center gap-1.5"
            >
              <User className="w-4 h-4" />
              <span>Profile</span>
            </Link>
          </nav>

          {/* Secure indicator & Bell */}
          <div className="flex items-center gap-2">
            <CustomerNotificationBell />
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Verified Access</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-4 py-2 flex items-center justify-around shadow-lg">
        <Link
          href="/customer"
          className="flex flex-col items-center gap-0.5 text-slate-600 hover:text-indigo-600 text-[10px] font-semibold"
        >
          <Compass className="w-5 h-5" />
          <span>Trips</span>
        </Link>
        <Link
          href="/customer/notifications"
          className="flex flex-col items-center gap-0.5 text-slate-600 hover:text-indigo-600 text-[10px] font-semibold"
        >
          <Bell className="w-5 h-5" />
          <span>Alerts</span>
        </Link>
        <Link
          href="/customer/profile"
          className="flex flex-col items-center gap-0.5 text-slate-600 hover:text-indigo-600 text-[10px] font-semibold"
        >
          <User className="w-5 h-5" />
          <span>Profile</span>
        </Link>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-8 text-center text-xs text-slate-500 pb-16 sm:pb-8">
        <div className="max-w-6xl mx-auto px-4 space-y-2">
          <div className="flex items-center justify-center gap-2 font-semibold text-slate-700">
            <span>Powered by TripDesk Travel Management</span>
          </div>
          <p className="text-[11px] text-slate-400">
            For travel amendments or emergency assistance, please contact your tour manager.
          </p>
        </div>
      </footer>
    </div>
  );
}
