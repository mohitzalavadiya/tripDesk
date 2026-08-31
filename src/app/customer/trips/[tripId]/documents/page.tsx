"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { customerPortalClient } from "@/lib/api-client";
import { CustomerDocumentItemView } from "@/lib/services/customer-portal-service";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  FileText,
  Download,
  Hotel,
  Car,
  Ticket,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

export default function CustomerDocumentsPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = (params?.tripId as string) || "";

  const [documents, setDocuments] = React.useState<CustomerDocumentItemView[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadDocs() {
      if (!tripId) return;
      try {
        setLoading(true);
        setError(null);
        const data = await customerPortalClient.getTripDocuments(tripId);
        setDocuments(data);
      } catch (err: any) {
        if (err?.message?.includes("CUSTOMER_UNAUTHORIZED")) {
          router.push("/customer/login");
        } else {
          setError(err?.message || "Failed to load documents.");
        }
      } finally {
        setLoading(false);
      }
    }
    loadDocs();
  }, [tripId, router]);

  const getDocIcon = (type: string) => {
    switch (type) {
      case "HOTEL_VOUCHER":
        return <Hotel className="w-5 h-5 text-purple-600" />;
      case "VEHICLE_VOUCHER":
        return <Car className="w-5 h-5 text-blue-600" />;
      case "ACTIVITY_PASS":
        return <Ticket className="w-5 h-5 text-emerald-600" />;
      default:
        return <FileText className="w-5 h-5 text-indigo-600" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-xs text-slate-500 font-semibold">Generating verified travel documents...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header & Back */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href={`/customer/trips/${tripId}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Trip Details</span>
        </Link>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Customer Travel Document Center
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Official vouchers, booking receipts, and comprehensive PDF travel kits.
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="max-w-md mx-auto p-6 rounded-3xl bg-white border border-slate-200 text-center space-y-3 shadow-sm">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <p className="text-xs text-slate-600">{error}</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <FileText className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No Documents Available Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Travel vouchers and confirmation passes are generated once service confirmations are issued by suppliers.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-3xl border border-slate-200/90 hover:border-indigo-500/40 p-6 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 shrink-0">
                  {getDocIcon(doc.type)}
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    {doc.type.replace(/_/g, " ")}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">{doc.title}</h3>
                  <p className="text-xs text-slate-500 font-medium">{doc.subtitle}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-500">
                  Doc #: <strong>{doc.documentNumber}</strong>
                </span>
                <a
                  href={doc.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex"
                >
                  <Button
                    size="sm"
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </Button>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
