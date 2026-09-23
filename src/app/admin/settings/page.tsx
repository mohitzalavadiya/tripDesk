"use client";

import * as React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Settings,
  RefreshCw,
  Save,
  Sparkles,
  ShieldCheck,
  QrCode,
  Landmark,
  Smartphone,
  Trash2,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Eye,
} from "lucide-react";
import { adminClient } from "@/lib/api-client/admin-client";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

export default function AdminSettingsPage() {
  const [loading, setLoading] = React.useState(true);
  const [savingGeneral, setSavingGeneral] = React.useState(false);
  const [savingBilling, setSavingBilling] = React.useState(false);
  const [uploadingQr, setUploadingQr] = React.useState(false);
  const [removingQr, setRemovingQr] = React.useState(false);
  const [confirmDeleteQrOpen, setConfirmDeleteQrOpen] = React.useState(false);

  // General Settings
  const [platformName, setPlatformName] = React.useState("TripDesk SaaS Platform");
  const [defaultTrialDays, setDefaultTrialDays] = React.useState("7");
  const [supportEmail, setSupportEmail] = React.useState("support@tripdesk.io");
  const [supportPhone, setSupportPhone] = React.useState("+91 98470 99000");
  const [maintenanceMode, setMaintenanceMode] = React.useState("false");
  const [platformNotice, setPlatformNotice] = React.useState("");

  // Billing & Payment Settings
  const [upiId, setUpiId] = React.useState("");
  const [upiDisplayName, setUpiDisplayName] = React.useState("");
  const [accountHolder, setAccountHolder] = React.useState("");
  const [bankName, setBankName] = React.useState("");
  const [accountNumber, setAccountNumber] = React.useState("");
  const [ifscCode, setIfscCode] = React.useState("");
  const [branchName, setBranchName] = React.useState("");
  const [qrCodeUrl, setQrCodeUrl] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const fetchAllSettings = React.useCallback(async () => {
    setLoading(true);
    try {
      const [generalRes, billingRes] = await Promise.all([
        adminClient.getSettings(),
        adminClient.getBillingSettings(),
      ]);

      if (generalRes.success && generalRes.data) {
        const s = generalRes.data;
        if (s.platformName) setPlatformName(s.platformName);
        if (s.defaultTrialDays) setDefaultTrialDays(s.defaultTrialDays);
        if (s.supportEmail) setSupportEmail(s.supportEmail);
        if (s.supportPhone) setSupportPhone(s.supportPhone);
        if (s.maintenanceMode) setMaintenanceMode(s.maintenanceMode);
        if (s.platformNotice) setPlatformNotice(s.platformNotice);
      }

      if (billingRes.success && billingRes.data) {
        const b = billingRes.data;
        setUpiId(b.upiId || "");
        setUpiDisplayName(b.upiDisplayName || "");
        setAccountHolder(b.accountHolder || "");
        setBankName(b.bankName || "");
        setAccountNumber(b.accountNumber || "");
        setIfscCode(b.ifscCode || "");
        setBranchName(b.branchName || "");
        setQrCodeUrl(b.qrCodeUrl || null);
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
        defaultTrialDays,
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

  const handleSaveBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBilling(true);
    try {
      const res = await adminClient.updateBillingSettings({
        upiId: upiId.trim(),
        upiDisplayName: upiDisplayName.trim() || null,
        accountHolder: accountHolder.trim(),
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.trim().toUpperCase(),
        branchName: branchName.trim() || null,
      });
      if (res.success) {
        toast.success("Platform billing & payment instructions saved successfully");
        if (res.data) {
          setUpiId(res.data.upiId || "");
          setUpiDisplayName(res.data.upiDisplayName || "");
          setAccountHolder(res.data.accountHolder || "");
          setBankName(res.data.bankName || "");
          setAccountNumber(res.data.accountNumber || "");
          setIfscCode(res.data.ifscCode || "");
          setBranchName(res.data.branchName || "");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update billing settings");
    } finally {
      setSavingBilling(false);
    }
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.type)) {
      toast.error("Invalid file format. Please select a PNG, JPEG, or WEBP image.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File is too large. Maximum size is 2MB.");
      return;
    }

    setUploadingQr(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await adminClient.uploadBillingQr(formData);
      if (res.success && res.data) {
        setQrCodeUrl(res.data.qrCodeUrl || null);
        toast.success("QR Code uploaded successfully");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload QR Code");
    } finally {
      setUploadingQr(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveQr = async () => {
    setRemovingQr(true);
    try {
      const res = await adminClient.deleteBillingQr();
      if (res.success && res.data) {
        setQrCodeUrl(null);
        setConfirmDeleteQrOpen(false);
        toast.success("Billing QR Code removed successfully");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to remove QR Code");
    } finally {
      setRemovingQr(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Top Header */}
        <PageHeader
          title="TripDesk Platform Settings"
          description="Configure global SaaS environment defaults, trial periods, subscription billing instructions, and support channels."
          breadcrumbs={[{ label: "SaaS Platform", href: "/admin" }, { label: "Platform Settings" }]}
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
          <div className="space-y-8 max-w-4xl">
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* 1. PLATFORM BILLING & PAYMENT SETTINGS (SUBSCRIPTION INSTRUCTIONS) */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <form onSubmit={handleSaveBilling} className="space-y-6">
              <div className="bg-white border border-indigo-200/80 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Landmark className="h-4 w-4" />
                      </span>
                      <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                        Platform Billing & Payment Instructions
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Official payment details displayed to Agency Owners when purchasing or renewing subscriptions.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full w-fit">
                    Global SaaS Singleton
                  </span>
                </div>

                {/* UPI Configuration */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <Smartphone className="h-4 w-4 text-indigo-600" />
                    <span>Official UPI Configuration</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700">
                        TripDesk Official UPI ID <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="e.g. tripdesk.billing@icici"
                        className="h-9 text-xs font-mono"
                        required
                      />
                      <p className="text-[10px] text-slate-400">
                        Official VPA handle for subscription payments.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700">UPI Business / Display Name</label>
                      <Input
                        value={upiDisplayName}
                        onChange={(e) => setUpiDisplayName(e.target.value)}
                        placeholder="e.g. TripDesk Billing"
                        className="h-9 text-xs"
                      />
                      <p className="text-[10px] text-slate-400">
                        Merchant name registered on the UPI VPA.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bank Details Configuration */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <Landmark className="h-4 w-4 text-indigo-600" />
                    <span>Direct Bank Transfer Details (NEFT / IMPS / RTGS)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700">
                        Account Holder / Beneficiary Name <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        value={accountHolder}
                        onChange={(e) => setAccountHolder(e.target.value)}
                        placeholder="e.g. TripDesk SaaS Technologies Pvt Ltd"
                        className="h-9 text-xs"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700">
                        Bank Name <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="e.g. ICICI Bank"
                        className="h-9 text-xs"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700">
                        Account Number <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="e.g. 002105009844"
                        className="h-9 text-xs font-mono"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700">
                        IFSC Code <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        value={ifscCode}
                        onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                        placeholder="e.g. ICIC0000021"
                        className="h-9 text-xs font-mono uppercase"
                        required
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="font-bold text-slate-700">Bank Branch</label>
                      <Input
                        value={branchName}
                        onChange={(e) => setBranchName(e.target.value)}
                        placeholder="e.g. MG Road Branch"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* QR Code Management */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <QrCode className="h-4 w-4 text-indigo-600" />
                    <span>Official Billing QR Code</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                    {/* QR Preview */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center min-h-[160px]">
                      {qrCodeUrl ? (
                        <div className="space-y-2 flex flex-col items-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={qrCodeUrl}
                            alt="Billing QR Code"
                            className="w-32 h-32 object-contain bg-white p-2 rounded-xl border border-slate-200 shadow-2xs"
                          />
                          <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Active Official QR
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-2 py-4 text-slate-400">
                          <QrCode className="h-10 w-10 mx-auto text-slate-300 stroke-[1.5]" />
                          <p className="text-[11px] font-medium">No QR Code Uploaded</p>
                          <p className="text-[10px] text-slate-400">
                            Payment modal will show UPI & Bank details only.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* QR Actions */}
                    <div className="md:col-span-2 space-y-3 text-xs">
                      <p className="text-slate-600 leading-relaxed text-[11px]">
                        Upload your official bank or UPI merchant QR code image (PNG, JPG, or WEBP, max 2MB). When uploaded, Agency Owners can scan this QR code directly inside their subscription payment modal.
                      </p>

                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleQrUpload}
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          className="hidden"
                          id="qr-upload-input"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={uploadingQr}
                          onClick={() => fileInputRef.current?.click()}
                          className="h-9 text-xs font-semibold rounded-xl cursor-pointer"
                        >
                          <UploadCloud className="h-4 w-4 mr-1.5 text-indigo-600" />
                          {uploadingQr
                            ? "Uploading..."
                            : qrCodeUrl
                            ? "Replace QR Code Image"
                            : "Upload QR Code Image"}
                        </Button>

                        {qrCodeUrl && (
                          <Button
                            type="button"
                            variant="destructive"
                            disabled={removingQr}
                            onClick={() => setConfirmDeleteQrOpen(true)}
                            className="h-9 text-xs font-semibold rounded-xl cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            {removingQr ? "Removing..." : "Remove QR"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Billing Settings Button */}
                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <Button
                    type="submit"
                    disabled={savingBilling}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-6 py-2 h-9 rounded-xl shadow-sm cursor-pointer"
                  >
                    <Save className="h-4 w-4 mr-1.5" />
                    {savingBilling ? "Saving Instructions..." : "Save Billing & Payment Settings"}
                  </Button>
                </div>
              </div>
            </form>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* 2. CORE SAAS & MAINTENANCE SETTINGS */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <form onSubmit={handleSaveGeneral} className="space-y-6">
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
                  disabled={savingGeneral}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs px-6 py-2 h-9 rounded-xl shadow-sm cursor-pointer"
                >
                  <Save className="h-4 w-4 mr-1.5" />
                  {savingGeneral ? "Saving Changes..." : "Save Platform Settings"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Delete QR Code Confirmation Dialog */}
        <ConfirmDialog
          open={confirmDeleteQrOpen}
          onOpenChange={setConfirmDeleteQrOpen}
          title="Remove Billing QR Code"
          description="Are you sure you want to remove the current billing QR Code? Agency Owners will see direct UPI ID and bank transfer details until a new QR is uploaded."
          confirmText="Remove QR"
          cancelText="Cancel"
          variant="destructive"
          loading={removingQr}
          onConfirm={handleRemoveQr}
        />
      </div>
    </div>
  );
}
