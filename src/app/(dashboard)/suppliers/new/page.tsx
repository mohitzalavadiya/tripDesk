"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { ReadOnlyBanner } from "@/components/shared/read-only-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supplierClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
  Truck,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  CreditCard,
  Plus,
  Loader2,
  Globe,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

export default function NewSupplierPage() {
  const router = useRouter();

  // Form states
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState("Hotel Supplier");
  const [contactPerson, setContactPerson] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [alternatePhone, setAlternatePhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [city, setCity] = React.useState("");
  const [state, setState] = React.useState("");
  const [country, setCountry] = React.useState("India");
  const [postalCode, setPostalCode] = React.useState("");
  const [gstNumber, setGstNumber] = React.useState("");
  const [panNumber, setPanNumber] = React.useState("");
  const [paymentTerms, setPaymentTerms] = React.useState("100% advance before check-in/service");
  const [bankDetails, setBankDetails] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [internalNotes, setInternalNotes] = React.useState("");

  const [duplicateMatches, setDuplicateMatches] = React.useState<any[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [isReadOnly, setIsReadOnly] = React.useState(false);

  // Debounced duplicate detection
  React.useEffect(() => {
    if (!name.trim() || name.trim().length < 2) {
      setDuplicateMatches([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setCheckingDuplicates(true);
        const res = await supplierClient.checkDuplicate({
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
        });

        if (res.success && res.data?.isDuplicate) {
          setDuplicateMatches(res.data.matches);
        } else {
          setDuplicateMatches([]);
        }
      } catch (err) {
        // Non-blocking duplicate check error
      } finally {
        setCheckingDuplicates(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [name, phone, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      toast.error("Subscription expired. Read-only mode is active.");
      return;
    }

    if (!name.trim()) {
      toast.error("Supplier name is required.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await supplierClient.createSupplier({
        name: name.trim(),
        type: type.trim(),
        contactPerson: contactPerson.trim() || undefined,
        phone: phone.trim() || undefined,
        alternatePhone: alternatePhone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        country: country.trim() || "India",
        postalCode: postalCode.trim() || undefined,
        gstNumber: gstNumber.trim() || undefined,
        panNumber: panNumber.trim() || undefined,
        paymentTerms: paymentTerms.trim() || undefined,
        bankDetails: bankDetails.trim() || undefined,
        notes: notes.trim() || undefined,
        internalNotes: internalNotes.trim() || undefined,
      });

      if (res.success && res.data) {
        toast.success(`Supplier ${res.data.supplierCode || res.data.name} created successfully!`);
        router.push(`/suppliers/${res.data.id}`);
      }
    } catch (err: any) {
      if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
        setIsReadOnly(true);
      }
      toast.error(err?.message || "Failed to register supplier.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {isReadOnly && <ReadOnlyBanner moduleName="Supplier Directory" />}

        <PageHeader
          title="Onboard New Supplier / Vendor"
          description="Register B2B travel partners, hotel chains, fleet operators, and DMCs to maintain seasonal purchase rate sheets."
          breadcrumbs={[
            { label: "Suppliers", href: "/suppliers" },
            { label: "New Supplier" },
          ]}
        />

        <div className="max-w-4xl mx-auto w-full space-y-4">
          {duplicateMatches.length > 0 && (
            <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex items-center gap-2 text-amber-800 font-bold">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Potential Duplicate Suppliers Found ({duplicateMatches.length})</span>
              </div>
              <p className="text-slate-600 text-[11px]">
                A supplier with matching details is already registered under your agency. You can review existing records before creating a duplicate.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {duplicateMatches.map((match) => (
                  <div
                    key={match.id}
                    className="bg-white p-2.5 rounded-xl border border-amber-200/60 flex items-center justify-between gap-2"
                  >
                    <div>
                      <h4 className="font-bold text-slate-900">{match.name}</h4>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {match.supplierCode || "SUP"} • {match.phone || match.email || match.type || "Vendor"}
                      </p>
                    </div>
                    <Link
                      href={`/suppliers/${match.id}`}
                      target="_blank"
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 shrink-0"
                    >
                      <span>View</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Identity & Business Type */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
                <Truck className="h-4 w-4 text-emerald-600" />
                <span>Vendor Identity & Category</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Company / Supplier Name *</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. WGH Hotels & Resorts"
                    className="h-9.5 bg-slate-50/50 border-slate-200 font-semibold text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Supplier Category / Service Type</label>
                  <Select value={type} onValueChange={(val) => val && setType(val)}>
                    <SelectTrigger className="h-9.5 text-xs bg-slate-50/50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="Hotel Supplier">Hotel Supplier / Chain</SelectItem>
                      <SelectItem value="DMC">DMC (Destination Management Co.)</SelectItem>
                      <SelectItem value="Transport Supplier">Transport & Fleet Operator</SelectItem>
                      <SelectItem value="Activity Supplier">Activity & Excursion Operator</SelectItem>
                      <SelectItem value="Airline Partner">Airline Partner / Consolidator</SelectItem>
                      <SelectItem value="Wholesaler">Travel Wholesaler</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Primary Contact Person</label>
                  <Input
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="e.g. Rajesh Kumar (Contracts)"
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Official Phone / WhatsApp</label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98470 12345"
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Email Address</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contracts@wghhotels.com"
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* 2. Address & Location */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-600" />
                <span>Office Address & Location</span>
              </h3>

              <div className="space-y-1 text-xs">
                <label className="font-bold text-slate-700">Office / Base Address</label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 5th Floor, Marine Drive Trade Center"
                  className="h-9.5 bg-slate-50/50 border-slate-200 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">City</label>
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Kochi"
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">State</label>
                  <Input
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="Kerala"
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Country</label>
                  <Input
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="India"
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Postal Code</label>
                  <Input
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="682001"
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* 3. Tax & Commercial Bank Details */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-purple-600" />
                <span>Commercial, Tax & Payment Terms</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">GST Number</label>
                  <Input
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                    placeholder="32AAAAA0000A1Z5"
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">PAN Number</label>
                  <Input
                    value={panNumber}
                    onChange={(e) => setPanNumber(e.target.value)}
                    placeholder="ABCDE1234F"
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <label className="font-bold text-slate-700">Contractual Payment Terms</label>
                <Input
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="e.g. 100% advance on confirmation, or 15 days credit"
                  className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                />
              </div>

              <div className="space-y-1 text-xs pt-1">
                <label className="font-bold text-slate-700">Bank Account Details for Wire Transfers</label>
                <Textarea
                  value={bankDetails}
                  onChange={(e) => setBankDetails(e.target.value)}
                  placeholder="Bank Name, Account Number, IFSC Code, Account Name..."
                  rows={2}
                  className="bg-slate-50/50 border-slate-200 text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Public Supplier Remarks</label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="General supplier description, hotel properties covered, cancellation policies..."
                    rows={3}
                    className="bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Internal Agency Remarks</label>
                  <Textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Private contracting terms, commission kickbacks, escalation contacts..."
                    rows={3}
                    className="bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-4 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/suppliers")}
                className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-10 px-5 cursor-pointer"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={submitting || isReadOnly}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-10 px-6 cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Registering Supplier...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Save & Onboard Supplier
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
