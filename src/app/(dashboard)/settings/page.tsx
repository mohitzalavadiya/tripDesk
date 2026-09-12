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
  taxClient,
  TaxRateItem,
  AgencyTaxProfileData,
} from "@/lib/api-client/tax-client";
import { TaxMode, GstTreatment } from "@prisma/client";
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
  Receipt,
  Building2,
  Percent,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = React.useState<"communication" | "tax">("communication");
  const [settings, setSettings] = React.useState<CommunicationSettings | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [runningSweep, setRunningSweep] = React.useState(false);

  // Tax Profile state
  const [taxRates, setTaxRates] = React.useState<TaxRateItem[]>([]);
  const [loadingTax, setLoadingTax] = React.useState(false);
  const [savingTax, setSavingTax] = React.useState(false);
  const [isGstRegistered, setIsGstRegistered] = React.useState(false);
  const [gstin, setGstin] = React.useState("");
  const [legalBusinessName, setLegalBusinessName] = React.useState("");
  const [registeredAddress, setRegisteredAddress] = React.useState("");
  const [state, setState] = React.useState("");
  const [stateCode, setStateCode] = React.useState("");
  const [defaultTaxMode, setDefaultTaxMode] = React.useState<TaxMode>(TaxMode.EXCLUSIVE);
  const [defaultGstRate, setDefaultGstRate] = React.useState<number>(0);
  const [defaultGstTreatment, setDefaultGstTreatment] = React.useState<GstTreatment>(GstTreatment.INTRA_STATE);

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

  const fetchTaxData = React.useCallback(async () => {
    try {
      setLoadingTax(true);
      const [profileData, ratesData] = await Promise.all([
        taxClient.getTaxProfile(),
        taxClient.listTaxRates(),
      ]);
      setTaxRates(ratesData);
      setIsGstRegistered(profileData.isGstRegistered);
      setGstin(profileData.gstin || "");
      setLegalBusinessName(profileData.legalBusinessName || "");
      setRegisteredAddress(profileData.registeredAddress || "");
      setState(profileData.state || "");
      setStateCode(profileData.stateCode || "");
      setDefaultTaxMode(profileData.defaultTaxMode || TaxMode.EXCLUSIVE);
      setDefaultGstRate(profileData.defaultGstRate || 0);
      setDefaultGstTreatment(profileData.defaultGstTreatment || GstTreatment.INTRA_STATE);
    } catch (err: any) {
      toast.error("Failed to load tax profile", {
        description: err?.message || "Please refresh to try again.",
      });
    } finally {
      setLoadingTax(false);
    }
  }, []);

  React.useEffect(() => {
    fetchSettings();
    fetchLogs();
    fetchTaxData();
  }, [fetchSettings, fetchLogs, fetchTaxData]);

  const handleSaveTaxProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingTax(true);
      const updated = await taxClient.updateTaxProfile({
        isGstRegistered,
        gstin: isGstRegistered ? gstin.trim() : null,
        legalBusinessName: isGstRegistered ? legalBusinessName.trim() : null,
        registeredAddress: registeredAddress.trim() || null,
        state: state.trim() || null,
        stateCode: stateCode.trim() || null,
        defaultTaxMode,
        defaultGstRate: Number(defaultGstRate) || 0,
        defaultGstTreatment: defaultGstTreatment,
      });
      setIsGstRegistered(updated.isGstRegistered);
      setGstin(updated.gstin || "");
      setLegalBusinessName(updated.legalBusinessName || "");
      setRegisteredAddress(updated.registeredAddress || "");
      setState(updated.state || "");
      setStateCode(updated.stateCode || "");
      setDefaultTaxMode(updated.defaultTaxMode);
      setDefaultGstRate(updated.defaultGstRate);
      setDefaultGstTreatment(updated.defaultGstTreatment);
      toast.success("Tax profile saved successfully", {
        description: "Commercial tax defaults for new quotations have been updated.",
      });
    } catch (err: any) {
      toast.error("Failed to save tax profile", {
        description: err?.message || "An error occurred while saving.",
      });
    } finally {
      setSavingTax(false);
    }
  };

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
      <div className="max-w-[1550px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-6">
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

        <div className="max-w-6xl w-full mx-auto space-y-6">
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
          <button
            onClick={() => setActiveTab("tax")}
            className={`px-4 py-2.5 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "tax"
                ? "border-indigo-600 text-indigo-600 bg-indigo-50/30 rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Receipt className="h-4 w-4" />
            Agency Tax & GST Profile
          </button>
        </div>

        {activeTab === "communication" ? (
          loading ? (
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
                                {log.channel === "WHATSAPP" ? "WhatsApp" : log.channel === "EMAIL" ? "Email" : log.channel}
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
                              {log.status === "DELIVERED" ? "Delivered" : log.status === "SENT" ? "Sent" : log.status === "FAILED" ? "Failed" : log.status === "PENDING" ? "Pending" : log.status}
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
          )
        ) : (
          /* ─── AGENCY TAX & GST SETTINGS TAB ─── */
          loadingTax ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 flex flex-col items-center justify-center space-y-3">
              <RotateCw className="h-8 w-8 text-indigo-600 animate-spin" />
              <p className="text-xs font-semibold text-slate-500">Loading agency tax profile & catalog presets...</p>
            </div>
          ) : (
            <form onSubmit={handleSaveTaxProfile} className="space-y-6">
              {/* Informational Scope Callout */}
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
                <div className="h-8 w-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Receipt className="h-4.5 w-4.5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-indigo-950">Quotation Defaults Architecture</h4>
                  <p className="text-xs text-indigo-800/80 leading-relaxed">
                    Configuring your agency tax profile establishes the starting commercial presets for <span className="font-semibold text-indigo-950">new quotations and package options</span>. Changing these defaults will <span className="font-semibold text-indigo-950">never modify or recalculate historical records</span> (past quotations, accepted bookings, or invoices remain frozen).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Card 1: GST Registration Profile */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">GST Registration Profile</h3>
                        <p className="text-xs text-slate-500">Official business identity & tax registration</p>
                      </div>
                    </div>
                  </div>

                  {/* Registered Toggle Card */}
                  <div
                    onClick={() => setIsGstRegistered(!isGstRegistered)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isGstRegistered
                        ? "bg-emerald-50/40 border-emerald-200 shadow-2xs"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">GST Registered Business</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 ${
                            isGstRegistered
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                              : "bg-slate-200 text-slate-600 border-slate-300"
                          }`}
                        >
                          {isGstRegistered ? "REGISTERED" : "UNREGISTERED"}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Enable if your agency has an active GSTIN to include on commercial proposals and invoices.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={isGstRegistered}
                      onChange={(e) => setIsGstRegistered(e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-5 w-5 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                  </div>

                  {/* Conditional GST Fields */}
                  {isGstRegistered ? (
                    <div className="space-y-4 pt-1">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                          GSTIN <span className="text-rose-500">*</span>
                        </label>
                        <Input
                          value={gstin}
                          onChange={(e) => setGstin(e.target.value.toUpperCase())}
                          placeholder="e.g. 27AAAAA0000A1Z5"
                          maxLength={15}
                          className="bg-white text-xs h-9 font-mono tracking-wider"
                        />
                        <p className="text-[10px] text-slate-400">15-digit Goods and Services Tax Identification Number.</p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Legal Business Name</label>
                        <Input
                          value={legalBusinessName}
                          onChange={(e) => setLegalBusinessName(e.target.value)}
                          placeholder="e.g. Acme Holidays & Tour Operators Pvt Ltd"
                          className="bg-white text-xs h-9"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Registered Business Address</label>
                        <Input
                          value={registeredAddress}
                          onChange={(e) => setRegisteredAddress(e.target.value)}
                          placeholder="e.g. Suite 402, Tourism Plaza, MG Road"
                          className="bg-white text-xs h-9"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700">State / Province</label>
                          <Input
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            placeholder="e.g. Maharashtra"
                            className="bg-white text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700">State Code</label>
                          <Input
                            value={stateCode}
                            onChange={(e) => setStateCode(e.target.value)}
                            placeholder="e.g. 27"
                            maxLength={5}
                            className="bg-white text-xs h-9"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100 text-xs text-slate-500 space-y-1">
                      <p className="font-semibold text-slate-700">Non-GST / Exempt Operator</p>
                      <p className="text-[11px] leading-relaxed">
                        Unregistered tour operators can still select standard commercial rate presets and modes for proposal pricing.
                      </p>
                    </div>
                  )}
                </div>

                {/* Card 2: Commercial Quotation Defaults */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                        <Percent className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Commercial Pricing Defaults</h3>
                        <p className="text-xs text-slate-500">Preset tax rate, mode, and commercial GST treatment</p>
                      </div>
                    </div>
                  </div>

                  {/* Default Tax Rate Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Default Tax Rate (Catalog Presets)</span>
                      <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        Selected: {defaultGstRate}%
                      </span>
                    </label>
                    <select
                      value={defaultGstRate}
                      onChange={(e) => setDefaultGstRate(Number(e.target.value))}
                      className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium cursor-pointer"
                    >
                      {taxRates.map((rateItem) => (
                        <option key={rateItem.id} value={rateItem.rate}>
                          {rateItem.name} — ({rateItem.rate === 0 ? "0% No Tax / Exempt" : `${rateItem.rate}% Standard Rate`})
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400">
                      Applied at the quotation/package total level (no item-level rate splits).
                    </p>
                  </div>

                  {/* Default Tax Mode Selector */}
                  <div className="space-y-2 pt-1">
                    <label className="text-xs font-bold text-slate-700">Default Tax Mode</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Exclusive Mode Card */}
                      <div
                        onClick={() => setDefaultTaxMode(TaxMode.EXCLUSIVE)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1 ${
                          defaultTaxMode === TaxMode.EXCLUSIVE
                            ? "bg-indigo-50/50 border-indigo-300 ring-1 ring-indigo-200 shadow-2xs"
                            : "bg-slate-50/60 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">Tax Exclusive</span>
                          <span className={`h-2 w-2 rounded-full ${defaultTaxMode === TaxMode.EXCLUSIVE ? "bg-indigo-600" : "bg-slate-300"}`} />
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Tax is calculated and added on top of the selling amount:
                        </p>
                        <p className="text-[10px] font-mono text-indigo-700 bg-indigo-100/50 px-1.5 py-0.5 rounded inline-block">
                          Final = Base + Tax
                        </p>
                      </div>

                      {/* Inclusive Mode Card */}
                      <div
                        onClick={() => setDefaultTaxMode(TaxMode.INCLUSIVE)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1 ${
                          defaultTaxMode === TaxMode.INCLUSIVE
                            ? "bg-indigo-50/50 border-indigo-300 ring-1 ring-indigo-200 shadow-2xs"
                            : "bg-slate-50/60 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">Tax Inclusive</span>
                          <span className={`h-2 w-2 rounded-full ${defaultTaxMode === TaxMode.INCLUSIVE ? "bg-indigo-600" : "bg-slate-300"}`} />
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Quoted customer price already contains tax:
                        </p>
                        <p className="text-[10px] font-mono text-indigo-700 bg-indigo-100/50 px-1.5 py-0.5 rounded inline-block">
                          Final = Gross Price
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Default GST Treatment Selector */}
                  <div className="space-y-2 pt-1">
                    <label className="text-xs font-bold text-slate-700">Default Commercial GST Treatment</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div
                        onClick={() => setDefaultGstTreatment(GstTreatment.INTRA_STATE)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          defaultGstTreatment === GstTreatment.INTRA_STATE
                            ? "bg-indigo-50/60 border-indigo-300 font-bold text-indigo-900 ring-1 ring-indigo-200"
                            : "bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <p className="text-xs">Intra-State</p>
                        <p className="text-[10px] font-normal text-slate-500">CGST + SGST (50/50)</p>
                      </div>

                      <div
                        onClick={() => setDefaultGstTreatment(GstTreatment.INTER_STATE)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          defaultGstTreatment === GstTreatment.INTER_STATE
                            ? "bg-indigo-50/60 border-indigo-300 font-bold text-indigo-900 ring-1 ring-indigo-200"
                            : "bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <p className="text-xs">Inter-State</p>
                        <p className="text-[10px] font-normal text-slate-500">IGST (100%)</p>
                      </div>

                      <div
                        onClick={() => setDefaultGstTreatment(GstTreatment.NON_GST_EXEMPT)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          defaultGstTreatment === GstTreatment.NON_GST_EXEMPT
                            ? "bg-indigo-50/60 border-indigo-300 font-bold text-indigo-900 ring-1 ring-indigo-200"
                            : "bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <p className="text-xs">Non-GST Exempt</p>
                        <p className="text-[10px] font-normal text-slate-500">₹0 Tax</p>
                      </div>
                    </div>
                  </div>

                  {/* Commercial Note */}
                  <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/70 flex items-start gap-2 text-[11px] text-amber-900 leading-relaxed">
                    <HelpCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                    <span>
                      Commercial GST treatment is a manually chosen commercial preference. TripDesk does not perform automated place-of-supply legal determination.
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit / Save Bar */}
              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={savingTax}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 px-6 rounded-xl cursor-pointer shadow-2xs gap-1.5"
                >
                  <Check className="h-4 w-4" />
                  {savingTax ? "Saving Tax Profile..." : "Save Agency Tax Profile"}
                </Button>
              </div>
            </form>
          )
        )}
      </div>
      </div>
    </div>
  );
}

