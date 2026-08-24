"use client";

import * as React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Settings, ShieldCheck, Mail, Phone, QrCode, Bell } from "lucide-react";

export default function AdminSettingsPage() {
  const [platformName, setPlatformName] = React.useState("TripDesk SaaS");
  const [supportEmail, setSupportEmail] = React.useState("support@tripdesk.in");
  const [supportPhone, setSupportPhone] = React.useState("+91 98470 99000");
  const [upiId, setUpiId] = React.useState("tripdesk.billing@icici");
  const [trialDays, setTrialDays] = React.useState("14");
  const [broadcastMsg, setBroadcastMsg] = React.useState(
    "All travel operations engines running at optimal performance."
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Platform settings updated successfully!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-20">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Top Header */}
        <PageHeader
          title="TripDesk Platform Settings"
          description="Configure global SaaS settings, default trial periods, support contact channels, and UPI billing information."
          breadcrumbs={[{ label: "SaaS Platform" }, { label: "Platform Settings" }]}
        />

        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
              General SaaS Configuration
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Platform Brand Name</label>
                <Input
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Default Trial Duration (Days)</label>
                <Input
                  type="number"
                  value={trialDays}
                  onChange={(e) => setTrialDays(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Support Helpdesk Email</label>
                <Input
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Support WhatsApp / Phone</label>
                <Input
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
              Subscription Billing & Payment Details (Manual V1)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Platform Billing UPI ID</label>
                <Input
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
                <p className="text-[10px] text-slate-400">
                  Displayed on Agency Owner renewal pages for manual UPI payments.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">System Broadcast Notice</label>
                <Input
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button
                type="submit"
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-9 px-5 rounded-xl cursor-pointer"
              >
                Save Platform Settings
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
