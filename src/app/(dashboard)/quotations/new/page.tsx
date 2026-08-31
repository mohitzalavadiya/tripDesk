"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import { FileText, ArrowLeft, Loader2, Plus, AlertCircle, Sparkles, Compass } from "lucide-react";
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
import { tripClient, quotationClient, TripWithRelations } from "@/lib/api-client";
import { toast } from "sonner";

export default function NewQuotationPage() {
  const router = useRouter();
  const [trips, setTrips] = React.useState<TripWithRelations[]>([]);
  const [loadingTrips, setLoadingTrips] = React.useState(true);
  const [isReadOnly, setIsReadOnly] = React.useState(false);
  const [selectedTripId, setSelectedTripId] = React.useState<string>("");
  const [markupPct, setMarkupPct] = React.useState("10");
  const [discountPct, setDiscountPct] = React.useState("0");
  const [taxPct, setTaxPct] = React.useState("5");
  const [generating, setGenerating] = React.useState(false);

  // Load active trips
  React.useEffect(() => {
    async function loadTrips() {
      try {
        setLoadingTrips(true);
        const res = await tripClient.getTrips({ limit: 100 });
        if (res.success && res.data) {
          setTrips(res.data);
          if (res.data.length > 0) {
            setSelectedTripId(res.data[0].id);
          }
        }
      } catch (err: any) {
        if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
          setIsReadOnly(true);
        }
      } finally {
        setLoadingTrips(false);
      }
    }
    loadTrips();
  }, []);

  const handleGenerateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTripId) {
      toast.error("Please select a trip.");
      return;
    }

    try {
      setGenerating(true);
      const res = await quotationClient.generateTripQuotation(selectedTripId, {
        markupPercentage: Number(markupPct) || 0,
        discountPercentage: Number(discountPct) || 0,
        taxPercentage: Number(taxPct) || 0,
      });

      if (res.success && res.data) {
        toast.success(`Quotation ${res.data.quotationNumber} generated successfully!`);
        router.push(`/trips/${selectedTripId}/quotation`);
      }
    } catch (err: any) {
      if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
        setIsReadOnly(true);
        toast.error("Subscription expired. Read-only mode is active.");
      } else {
        toast.error(err?.message || "Failed to generate quotation.");
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {isReadOnly && <ReadOnlyBanner moduleName="Quotations & Proposals" />}

        <PageHeader
          title="Generate New Quotation"
          description="Create a commercial proposal by snapshotting live trip itinerary, hotel, vehicle, and activity assignments."
          breadcrumbs={[
            { label: "Quotations", href: "/quotations" },
            { label: "New Quotation" },
          ]}
        />

        <div className="max-w-2xl mx-auto w-full">
          <form onSubmit={handleGenerateQuotation} className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-5">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center gap-2">
                <Compass className="h-4 w-4 text-indigo-600" />
                <span>Select Trip Source</span>
              </h3>

              <div className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Trip Workspace *</label>
                  {loadingTrips ? (
                    <div className="h-9.5 flex items-center gap-2 text-slate-400 text-xs px-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading trips...
                    </div>
                  ) : trips.length === 0 ? (
                    <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-lg border border-amber-200">
                      No active trips found. Please create a trip workspace first.
                    </div>
                  ) : (
                    <Select value={selectedTripId} onValueChange={(val) => val && setSelectedTripId(val)}>
                      <SelectTrigger className="h-9.5 text-xs bg-slate-50/50 border-slate-200">
                        <SelectValue placeholder="Choose a trip...">
                          {(val: string | null) => {
                            if (!val) return undefined;
                            const t = trips.find((item) => item.id === val);
                            return t ? `${t.tripNumber} — ${t.title} (${t.customer?.name || "Customer"})` : val;
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        {trips.map((t) => (
                          <SelectItem key={t.id} value={t.id} className="text-xs">
                            {t.tripNumber} — {t.title} ({t.customer?.name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Agency Markup (%)</label>
                    <Input
                      type="number"
                      value={markupPct}
                      onChange={(e) => setMarkupPct(e.target.value)}
                      placeholder="10"
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Discount (%)</label>
                    <Input
                      type="number"
                      value={discountPct}
                      onChange={(e) => setDiscountPct(e.target.value)}
                      placeholder="0"
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Tax / GST (%)</label>
                    <Input
                      type="number"
                      value={taxPct}
                      onChange={(e) => setTaxPct(e.target.value)}
                      placeholder="5"
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Panel */}
            <div className="flex items-center justify-between gap-4 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/quotations")}
                className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-10 px-5 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={generating || isReadOnly || trips.length === 0}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-10 px-6 cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating Snapshot...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Proposal
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
