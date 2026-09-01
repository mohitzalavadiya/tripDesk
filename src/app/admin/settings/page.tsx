"use client";

import * as React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Settings, RefreshCw, Save, Sparkles, ShieldCheck } from "lucide-react";
import { adminClient } from "@/lib/api-client/admin-client";

export default function AdminSettingsPage() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const [platformName, setPlatformName] = React.useState("TripDesk SaaS Platform");
  const [defaultTrialDays, setDefaultTrialDays] = React.useState("7");
  const [supportEmail, setSupportEmail] = React.useState("support@tripdesk.io");
  const [supportPhone, setSupportPhone] = React.useState("+91 98470 99000");
  const [maintenanceMode, setMaintenanceMode] = React.useState("false");
  const [platformNotice, setPlatformNotice] = React.useState("");

  const fetchSettings = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminClient.getSettings();
      if (res.success && res.data) {
        const s = res.data;
        if (s.platformName) setPlatformName(s.platformName);
        if (s.defaultTrialDays) setDefaultTrialDays(s.defaultTrialDays);
        if (s.supportEmail) setSupportEmail(s.supportEmail);
        if (s.supportPhone) setSupportPhone(s.supportPhone);
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
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminClient.updateSettings({
        platformName,
        defaultTrialDays,
        supportEmail,
        supportPhone,
        maintenanceMode,
        platformNotice,
      });
      toast.success("Platform settings updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to update platform settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Top Header */}
        <PageHeader
          title="TripDesk Platform Settings"
          description="Configure global SaaS environment defaults, trial periods, maintenance alerts, and support channels."
          breadcrumbs={[{ label: "SaaS Platform", href: "/admin" }, { label: "Platform Settings" }]}
          primaryAction={{
            label: "Refresh Settings",
            onClick: fetchSettings,
            icon: RefreshCw,
          }}
        />

        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-400 text-xs gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-purple-600" />
            Loading settings...
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
            {/* General Config Card */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
                Core SaaS Configuration
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Platform Brand Name</label>
                  <Input
                    value={platformName}
                    onChange={(e) => setPlatformName(e.target.value)}
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Default Free Trial Duration (Days)</label>
                  <Input
                    type="number"
                    value={defaultTrialDays}
                    onChange={(e) => setDefaultTrialDays(e.target.value)}
                    className="h-9 text-xs font-mono"
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
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
                Maintenance & System Notices
              </h3>

              <div className="space-y-4 text-xs">
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
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={saving}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs px-6 py-2 h-9"
              >
                <Save className="h-4 w-4 mr-1.5" />
                {saving ? "Saving Changes..." : "Save Platform Settings"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
