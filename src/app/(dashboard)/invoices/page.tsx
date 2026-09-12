"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InvoicesRedirectPage() {
  const router = useRouter();

  React.useEffect(() => {
    router.replace("/bookings");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4 text-indigo-600">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
      <h2 className="text-lg font-bold text-slate-800">Invoices are managed within Bookings</h2>
      <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
        Redirecting you to the Bookings Workspace where you can view, generate, and manage invoices for your confirmed trips.
      </p>
      <Link href="/bookings">
        <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl gap-1.5 cursor-pointer">
          <CalendarCheck className="h-3.5 w-3.5" />
          Go to Bookings
        </Button>
      </Link>
    </div>
  );
}
