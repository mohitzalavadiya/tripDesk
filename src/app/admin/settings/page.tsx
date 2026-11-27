"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { adminClient } from "@/lib/api-client/admin-client";
import {
RefreshCw,
Save
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

export default function AdminSettingsPage() {
  const [loading, setLoading] = React.useState(true);
  const [savingGeneral, setSavingGeneral] = React.useState(false);

  // General Settings
  const [platformName, setPlatformName] = React.useState("Your Travel Desk Platform");
  const [supportEmail, setSupportEmail] = React.useState("");
  const [supportPhone, setSupportPhone] = React.useState("");
  const [maintenanceMode, setMaintenanceMode] = React.useState("false");
  const [platformNotice, setPlatformNotice] = React.useState("");

  const fetchAllSettings = React.useCallback(async () => {
    setLoading(true);
    try {
      const generalRes = await adminClient.getSettings();

      if (generalRes.success && generalRes.data) {
        const s = generalRes.data;
        if (s.platformName) setPlatformName(s.platformName);
        if (s.supportEmail !== undefined) setSupportEmail(s.supportEmail || "");
        if (s.supportPhone !== undefined) setSupportPhone(s.supportPhone || "");
        if (s.maintenanceMode) setMaintenanceMode(s.maintenanceMode);
        if (s.platformNotice) setPlatformNotice(s.platformNotice);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load platform settings");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAllSettings();
  }, [fetchAllSettings]);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGeneral(true);
    try {
      await adminClient.updateSettings({
        platformName,
        supportEmail,
        supportPhone,
        maintenanceMode,
        platformNotice,
      });
      toast.success("Core platform settings updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to update platform settings");
    } finally {
      setSavingGeneral(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <div className="max-w-[1550px] mx-auto px-2.5 sm:px-6 lg:px-8 pt-4 sm:pt-8 space-y-4 sm:space-y-6 min-w-0">
        {/* Top Header */}
        <PageHeader
          title="Your Travel Desk Platform Settings"
          description="Configure global platform defaults, maintenance mode, and support channels."
          breadcrumbs={[{ label: "Platform", href: "/admin" }, { label: "Platform Settings" }]}
          primaryAction={{
            label: "Refresh Settings",
            onClick: fetchAllSettings,
            icon: RefreshCw,
          }}
        />

        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-400 text-xs gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-purple-600" />
            Loading settings...
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8 max-w-4xl min-w-0">
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* 2. CORE SAAS & MAINTENANCE SETTINGS */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <form onSubmit={handleSaveGeneral} className="space-y-4 sm:space-y-6">
              {/* General Config Card */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-6 shadow-2xs space-y-3.5 sm:space-y-4 min-w-0">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2.5 sm:pb-3">
                  Core SaaS Configuration
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="font-bold text-slate-700">Platform Brand Name</label>
                    <Input
                      value={platformName}
                      onChange={(e) => setPlatformName(e.target.value)}
                      className="h-9 text-xs"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">Platform Support Email</label>
                    <Input
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      className="h-9 text-xs"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">Support Contact Phone</label>
                    <Input
                      value={supportPhone}
                      onChange={(e) => setSupportPhone(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Platform Banner & Maintenance Mode */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-6 shadow-2xs space-y-3.5 sm:space-y-4 min-w-0">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2.5 sm:pb-3">
                  Maintenance & System Notices
                </h3>

                <div className="space-y-3 sm:space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">Global Header Banner Notice</label>
                    <Textarea
                      value={platformNotice}
                      onChange={(e) => setPlatformNotice(e.target.value)}
                      placeholder="Optional message displayed on all agency dashboard headers..."
                      rows={3}
                      className="text-xs resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex flex-col sm:flex-row sm:justify-end">
                <Button
                  type="submit"
                  disabled={savingGeneral}
                  className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs px-4 sm:px-6 py-2 h-9 rounded-xl shadow-sm cursor-pointer justify-center"
                >
                  <Save className="h-4 w-4 mr-1.5 shrink-0" />
                  {savingGeneral ? "Saving Changes..." : "Save Platform Settings"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
