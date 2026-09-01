"use client";

import * as React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  communicationClient,
  CommunicationSettings,
  CommunicationLogItem,
} from "@/lib/api-client/communication-client";
import {
  Mail,
  MessageSquare,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Sliders,
  ShieldCheck,
  Zap,
  Check,
  RotateCw,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = React.useState<"communication" | "general">("communication");
  const [settings, setSettings] = React.useState<CommunicationSettings | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [runningSweep, setRunningSweep] = React.useState(false);

  // Form states
  const [emailEnabled, setEmailEnabled] = React.useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = React.useState(true);
  const [defaultSenderName, setDefaultSenderName] = React.useState("");
  const [defaultSenderEmail, setDefaultSenderEmail] = React.useState("");
  const [autoQuotationSent, setAutoQuotationSent] = React.useState(true);
  const [autoBookingConfirmed, setAutoBookingConfirmed] = React.useState(true);
  const [autoPaymentReminders, setAutoPaymentReminders] = React.useState(true);
  const [autoTravelReminders, setAutoTravelReminders] = React.useState(true);
  const [autoFeedbackRequests, setAutoFeedbackRequests] = React.useState(true);
  const [paymentReminderDays, setPaymentReminderDays] = React.useState(3);
  const [travelReminderDays, setTravelReminderDays] = React.useState(3);

  // Recent logs
  const [recentLogs, setRecentLogs] = React.useState<CommunicationLogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = React.useState(false);

  const fetchSettings = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await communicationClient.getSettings();
      setSettings(data);
      setEmailEnabled(data.emailEnabled);
      setWhatsappEnabled(data.whatsappEnabled);
      setDefaultSenderName(data.defaultSenderName || "");
      setDefaultSenderEmail(data.defaultSenderEmail || "");
      setAutoQuotationSent(data.autoQuotationSent);
      setAutoBookingConfirmed(data.autoBookingConfirmed);
      setAutoPaymentReminders(data.autoPaymentReminders);
      setAutoTravelReminders(data.autoTravelReminders);
      setAutoFeedbackRequests(data.autoFeedbackRequests);
      setPaymentReminderDays(data.paymentReminderDays || 3);
      setTravelReminderDays(data.travelReminderDays || 3);
    } catch (err: any) {
      toast.error("Failed to load communication settings", {
        description: err?.message || "Please refresh to try again.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLogs = React.useCallback(async () => {
    try {
      setLoadingLogs(true);
      const res = await communicationClient.listLogs({ limit: 10 });
      setRecentLogs(res.data);
    } catch {
      // safe fallback
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  React.useEffect(() => {
    fetchSettings();
    fetchLogs();
  }, [fetchSettings, fetchLogs]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const updated = await communicationClient.updateSettings({
        emailEnabled,
        whatsappEnabled,
        defaultSenderName: defaultSenderName.trim() || null,
        defaultSenderEmail: defaultSenderEmail.trim() || null,
        autoQuotationSent,
        autoBookingConfirmed,
        autoPaymentReminders,
        autoTravelReminders,
        autoFeedbackRequests,
        paymentReminderDays: Number(paymentReminderDays) || 3,
        travelReminderDays: Number(travelReminderDays) || 3,
      });
      setSettings(updated);
      toast.success("Settings saved successfully", {
        description: "Communication channels and automation rules have been updated.",
      });
    } catch (err: any) {
      toast.error("Failed to save settings", {
        description: err?.message || "An error occurred while saving.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRunSweep = async () => {
    try {
      setRunningSweep(true);
      const res = await communicationClient.runAutomation("all");
      toast.success("Automation sweep completed", {
        description: `Dispatched ${res.summary.totalDispatched} notifications (${res.summary.paymentRemindersSent} payments, ${res.summary.travelRemindersSent} departures, ${res.summary.feedbackRequestsSent} feedbacks).`,
      });
      fetchLogs();
    } catch (err: any) {
      toast.error("Automation sweep failed", {
        description: err?.message || "Failed to trigger reminder scan.",
      });
    } finally {
      setRunningSweep(false);
    }
  };

  const handleResend = async (id: string) => {
    try {
      toast.info("Retrying communication dispatch...");
      await communicationClient.resend(id);
      toast.success("Communication resent successfully");
      fetchLogs();
    } catch (err: any) {
      toast.error("Failed to resend communication", {
        description: err?.message || "Error resending.",
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-12">
      <PageHeader
        title="Settings & Integrations"
        description="Manage communication channels, automated customer alerts, and email branding."
        breadcrumbs={[{ label: "Settings" }]}
        primaryAction={{
          label: runningSweep ? "Running Sweep..." : "Run Automation Sweep",
          onClick: handleRunSweep,
          icon: Zap,
        }}
      />

      <div className="px-4 py-6 md:px-8 max-w-6xl w-full mx-auto space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("communication")}
            className={`px-4 py-2.5 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "communication"
                ? "border-indigo-600 text-indigo-600 bg-indigo-50/30 rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            WhatsApp & Email Automation
          </button>
        </div>

        {loading ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 flex flex-col items-center justify-center space-y-3">
            <RotateCw className="h-8 w-8 text-indigo-600 animate-spin" />
            <p className="text-xs font-semibold text-slate-500">Loading communication configuration...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Form */}
            <div className="lg:col-span-2 space-y-6">
              <form onSubmit={handleSaveSettings} className="space-y-6">
                {/* Communication Channels Box */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                        <Sliders className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Communication Channels</h3>
                        <p className="text-xs text-slate-500">Enable or disable outbound notification delivery</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Email Toggle */}
                    <div
                      onClick={() => setEmailEnabled(!emailEnabled)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                        emailEnabled
                          ? "bg-indigo-50/40 border-indigo-200 shadow-2xs"
                          : "bg-slate-50 border-slate-200 opacity-60"
                      }`}
                    >
                      <div
                        className={`h-9 w-9 rounded-lg flex items-center justify-center font-bold ${
                          emailEnabled ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        <Mail className="h-4.5 w-4.5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">Email Delivery</span>
                          <span
                            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                              emailEnabled ? "bg-indigo-100 text-indigo-800" : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {emailEnabled ? "ACTIVE" : "DISABLED"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Sends responsive HTML proposals, confirmations, and milestone invoices.
                        </p>
                      </div>
                    </div>

                    {/* WhatsApp Toggle */}
                    <div
                      onClick={() => setWhatsappEnabled(!whatsappEnabled)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                        whatsappEnabled
                          ? "bg-emerald-50/40 border-emerald-200 shadow-2xs"
                          : "bg-slate-50 border-slate-200 opacity-60"
                      }`}
                    >
                      <div
                        className={`h-9 w-9 rounded-lg flex items-center justify-center font-bold ${
                          whatsappEnabled ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        <MessageSquare className="h-4.5 w-4.5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">WhatsApp Delivery</span>
                          <span
                            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                              whatsappEnabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {whatsappEnabled ? "ACTIVE" : "DISABLED"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Sends structured WhatsApp template updates and instant itinerary links.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Sender Profile */}
                  <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Default Sender Name</label>
                      <Input
                        value={defaultSenderName}
                        onChange={(e) => setDefaultSenderName(e.target.value)}
                        placeholder="e.g. Acme Holidays & Travel"
                        className="bg-white text-xs h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Default Sender Email</label>
                      <Input
                        type="email"
                        value={defaultSenderEmail}
                        onChange={(e) => setDefaultSenderEmail(e.target.value)}
                        placeholder="e.g. reservations@acmeholidays.com"
                        className="bg-white text-xs h-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Automation Rules Box */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Event Automation Rules</h3>
                        <p className="text-xs text-slate-500">
                          Automated customer triggers fired on booking events & schedule
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Proposal Sent */}
                    <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50/80 transition-all cursor-pointer">
                      <div>
                        <p className="text-xs font-bold text-slate-900">Auto Quotation Proposal Dispatch</p>
                        <p className="text-[11px] text-slate-500">
                          Instantly send customer interactive link when proposal is published
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={autoQuotationSent}
                        onChange={(e) => setAutoQuotationSent(e.target.checked)}
                        className="h-4 w-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                      />
                    </label>

                    {/* Booking Confirmed */}
                    <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50/80 transition-all cursor-pointer">
                      <div>
                        <p className="text-xs font-bold text-slate-900">Auto Booking Confirmation</p>
                        <p className="text-[11px] text-slate-500">
                          Send confirmed voucher summary upon converting quotation or booking
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={autoBookingConfirmed}
                        onChange={(e) => setAutoBookingConfirmed(e.target.checked)}
                        className="h-4 w-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                      />
                    </label>

                    {/* Payment Reminders */}
                    <div className="p-3 rounded-xl border border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-900">Auto Payment Due Reminders</p>
                          <p className="text-[11px] text-slate-500">
                            Scan milestone schedules and notify customer before due date
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={autoPaymentReminders}
                          onChange={(e) => setAutoPaymentReminders(e.target.checked)}
                          className="h-4 w-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                        />
                      </div>
                      {autoPaymentReminders && (
                        <div className="pt-2 flex items-center gap-2 text-xs text-slate-600">
                          <span>Remind customer</span>
                          <Input
                            type="number"
                            min={1}
                            max={30}
                            value={paymentReminderDays}
                            onChange={(e) => setPaymentReminderDays(parseInt(e.target.value, 10) || 1)}
                            className="w-16 h-7 text-xs bg-white"
                          />
                          <span>days before milestone due date.</span>
                        </div>
                      )}
                    </div>

                    {/* Travel Reminders */}
                    <div className="p-3 rounded-xl border border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-900">Auto Upcoming Departure Reminders</p>
                          <p className="text-[11px] text-slate-500">
                            Notify travelers with 24/7 support contacts before journey start
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={autoTravelReminders}
                          onChange={(e) => setAutoTravelReminders(e.target.checked)}
                          className="h-4 w-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                        />
                      </div>
                      {autoTravelReminders && (
                        <div className="pt-2 flex items-center gap-2 text-xs text-slate-600">
                          <span>Send departure alert</span>
                          <Input
                            type="number"
                            min={1}
                            max={30}
                            value={travelReminderDays}
                            onChange={(e) => setTravelReminderDays(parseInt(e.target.value, 10) || 1)}
                            className="w-16 h-7 text-xs bg-white"
                          />
                          <span>days before tour start date.</span>
                        </div>
                      )}
                    </div>

                    {/* Feedback Requests */}
                    <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50/80 transition-all cursor-pointer">
                      <div>
                        <p className="text-xs font-bold text-slate-900">Auto Post-Tour Review Request</p>
                        <p className="text-[11px] text-slate-500">
                          Automatically request feedback 2 days after trip completion
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={autoFeedbackRequests}
                        onChange={(e) => setAutoFeedbackRequests(e.target.checked)}
                        className="h-4 w-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                      />
                    </label>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 px-6 rounded-xl cursor-pointer shadow-2xs gap-1.5"
                  >
                    <Check className="h-4 w-4" />
                    {saving ? "Saving Changes..." : "Save Communication Settings"}
                  </Button>
                </div>
              </form>
            </div>

            {/* Right 1 Col: Audit & Live Status */}
            <div className="space-y-6">
              {/* Provider Health Box */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase">Provider Status</h4>
                </div>
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">Email Gateway</p>
                      <p className="text-[11px] text-slate-500">{settings?.emailProvider || "MOCK"} Provider</p>
                    </div>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                      Operational
                    </Badge>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">WhatsApp Gateway</p>
                      <p className="text-[11px] text-slate-500">{settings?.whatsappProvider || "MOCK"} Provider</p>
                    </div>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                      Operational
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Recent Dispatches */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase">Recent Dispatches</h4>
                  <button
                    onClick={fetchLogs}
                    className="text-indigo-600 hover:text-indigo-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCw className={`h-3 w-3 ${loadingLogs ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                </div>

                {recentLogs.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No notifications dispatched yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {recentLogs.slice(0, 5).map((log) => (
                      <div
                        key={log.id}
                        className="p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all text-xs flex items-start justify-between gap-2"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-800">{log.customerName || "Customer"}</span>
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-1.5 py-0 ${
                                log.channel === "WHATSAPP"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-blue-50 text-blue-700 border-blue-200"
                              }`}
                            >
                              {log.channel}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-1">{log.title}</p>
                          <span className="text-[10px] text-slate-400">
                            {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1.5 py-0 ${
                              log.status === "DELIVERED" || log.status === "SENT"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : log.status === "FAILED"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {log.status}
                          </Badge>
                          {log.status === "FAILED" && (
                            <button
                              onClick={() => handleResend(log.id)}
                              className="text-[10px] text-indigo-600 hover:underline font-bold cursor-pointer"
                            >
                              Retry
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
