"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { customerPortalClient } from "@/lib/api-client";
import { CustomerProfileView } from "@/lib/services/customer-portal-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Save,
  Loader2,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Bell,
  MessageSquare,
  Sparkles,
  Smartphone,
} from "lucide-react";

export default function CustomerProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<"PROFILE" | "NOTIFICATIONS">("PROFILE");
  const [profile, setProfile] = React.useState<CustomerProfileView | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Profile Form State
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [alternatePhone, setAlternatePhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [city, setCity] = React.useState("");
  const [state, setState] = React.useState("");
  const [country, setCountry] = React.useState("India");
  const [postalCode, setPostalCode] = React.useState("");

  // Notification Preferences State
  const [inAppEnabled, setInAppEnabled] = React.useState(true);
  const [emailEnabled, setEmailEnabled] = React.useState(true);
  const [smsEnabled, setSmsEnabled] = React.useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = React.useState(true);
  const [tripUpdates, setTripUpdates] = React.useState(true);
  const [paymentAlerts, setPaymentAlerts] = React.useState(true);
  const [documentAlerts, setDocumentAlerts] = React.useState(true);
  const [serviceUpdates, setServiceUpdates] = React.useState(true);
  const [marketingMessages, setMarketingMessages] = React.useState(false);
  const [savingPrefs, setSavingPrefs] = React.useState(false);

  React.useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const [profileData, prefsData] = await Promise.all([
          customerPortalClient.getProfile(),
          customerPortalClient.getNotificationPreferences().catch(() => null),
        ]);

        setProfile(profileData);
        setName(profileData.name || "");
        setPhone(profileData.phone || "");
        setAlternatePhone(profileData.alternatePhone || "");
        setEmail(profileData.email || "");
        setAddress(profileData.address || "");
        setCity(profileData.city || "");
        setState(profileData.state || "");
        setCountry(profileData.country || "India");
        setPostalCode(profileData.postalCode || "");

        if (prefsData) {
          setInAppEnabled(prefsData.inAppEnabled ?? true);
          setEmailEnabled(prefsData.emailEnabled ?? true);
          setSmsEnabled(prefsData.smsEnabled ?? true);
          setWhatsappEnabled(prefsData.whatsappEnabled ?? true);
          setTripUpdates(prefsData.tripUpdates ?? true);
          setPaymentAlerts(prefsData.paymentAlerts ?? true);
          setDocumentAlerts(prefsData.documentAlerts ?? true);
          setServiceUpdates(prefsData.serviceUpdates ?? true);
          setMarketingMessages(prefsData.marketingMessages ?? false);
        }
      } catch (err: any) {
        if (err?.message?.includes("CUSTOMER_UNAUTHORIZED")) {
          router.push("/customer/login");
        } else {
          setError(err?.message || "Failed to load profile.");
        }
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const updated = await customerPortalClient.updateProfile({
        name,
        phone,
        alternatePhone,
        email,
        address,
        city,
        state,
        country,
        postalCode,
      });
      setProfile(updated);
      toast.success("Profile contact details updated successfully.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    try {
      setSavingPrefs(true);
      await customerPortalClient.updateNotificationPreferences({
        inAppEnabled,
        emailEnabled,
        smsEnabled,
        whatsappEnabled,
        tripUpdates,
        paymentAlerts,
        documentAlerts,
        serviceUpdates,
        marketingMessages,
      });
      toast.success("Notification preferences saved successfully.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update notification preferences.");
    } finally {
      setSavingPrefs(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-xs text-slate-500 font-semibold">Loading your traveler profile & preferences...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/customer"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Trips</span>
        </Link>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-200/70 rounded-2xl text-xs font-bold w-fit">
        <button
          onClick={() => setActiveTab("PROFILE")}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === "PROFILE"
              ? "bg-white text-indigo-600 shadow-2xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <User className="w-4 h-4" />
          <span>Contact Profile</span>
        </button>
        <button
          onClick={() => setActiveTab("NOTIFICATIONS")}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === "NOTIFICATIONS"
              ? "bg-white text-indigo-600 shadow-2xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Alerts & Channels</span>
        </button>
      </div>

      {/* 1. CONTACT PROFILE TAB */}
      {activeTab === "PROFILE" && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xl shadow-slate-200/40 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Traveler Profile & Contact</h1>
              <p className="text-xs text-slate-500 font-medium">
                Update your primary contact information for vouchers, driver coordination, and alerts.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmitProfile} className="space-y-4 text-xs font-semibold">
            <div className="space-y-1.5">
              <label className="text-slate-700">Full Name *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 rounded-xl text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-slate-700">Primary Mobile Number *</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-slate-700">WhatsApp / Alt Phone</label>
                <Input
                  value={alternatePhone}
                  onChange={(e) => setAlternatePhone(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-700">Email Address</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 rounded-xl text-xs"
                placeholder="e.g. traveler@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-700">Address / City</label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="h-10 rounded-xl text-xs"
                placeholder="Street address"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-slate-700">City</label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-slate-700">State</label>
                <Input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-slate-700">Postal Code</label>
                <Input
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="w-full h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 mt-4 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Contact Details</span>
                </>
              )}
            </Button>
          </form>
        </div>
      )}

      {/* 2. NOTIFICATION PREFERENCES TAB */}
      {activeTab === "NOTIFICATIONS" && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xl shadow-slate-200/40 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Notification Channels & Alerts</h1>
              <p className="text-xs text-slate-500 font-medium">
                Choose which channels and categories you wish to receive updates on.
              </p>
            </div>
          </div>

          {/* Mandatory Transactional Notice */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 text-emerald-900 space-y-1 text-xs">
            <div className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Transactional Trip Alerts</span>
            </div>
            <p className="text-[11px] text-emerald-700 font-medium leading-relaxed">
              Critical operations updates (e.g. airport pickups, hotel vouchers, emergency coordination) are always delivered in-app for your safety and convenience.
            </p>
          </div>

          {/* Channel Preferences */}
          <div className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
              Delivery Channels
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-4 h-4 text-indigo-600" />
                  <div>
                    <span className="font-bold text-slate-900 block">In-App Traveler Alerts</span>
                    <span className="text-[10px] text-slate-500">Live feed on customer portal</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={inAppEnabled}
                  onChange={(e) => setInAppEnabled(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-purple-600" />
                  <div>
                    <span className="font-bold text-slate-900 block">Email Notifications</span>
                    <span className="text-[10px] text-slate-500">Vouchers & PDF receipts</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={emailEnabled}
                  onChange={(e) => setEmailEnabled(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="font-bold text-slate-900 block">WhatsApp Updates</span>
                    <span className="text-[10px] text-slate-500">Driver & schedule alerts</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={whatsappEnabled}
                  onChange={(e) => setWhatsappEnabled(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-blue-600" />
                  <div>
                    <span className="font-bold text-slate-900 block">SMS Alerts</span>
                    <span className="text-[10px] text-slate-500">Critical pickup broadcasts</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={smsEnabled}
                  onChange={(e) => setSmsEnabled(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
              </label>
            </div>
          </div>

          {/* Optional Categories */}
          <div className="space-y-3 pt-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
              Optional Alert Categories
            </h2>
            <div className="space-y-2 text-xs">
              <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer">
                <div>
                  <span className="font-bold text-slate-900 block">Promotions, Specials & Early Bird Offers</span>
                  <span className="text-[10px] text-slate-500">Receive curated seasonal holiday packages and discounts</span>
                </div>
                <input
                  type="checkbox"
                  checked={marketingMessages}
                  onChange={(e) => setMarketingMessages(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
              </label>
            </div>
          </div>

          <Button
            type="button"
            disabled={savingPrefs}
            onClick={handleSavePreferences}
            className="w-full h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 mt-4 flex items-center justify-center gap-2"
          >
            {savingPrefs ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Preferences...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Notification Preferences</span>
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
