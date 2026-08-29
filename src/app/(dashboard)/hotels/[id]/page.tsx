"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  Hotel as HotelIcon,
  Building2,
  MapPin,
  ArrowLeft,
  Phone,
  Mail,
  Globe,
  Edit,
  Trash2,
  Loader2,
  AlertCircle,
  Archive,
  Info,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ReadOnlyBanner } from "@/components/shared/read-only-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { hotelClient } from "@/lib/api-client";
import { Hotel } from "@prisma/client";
import { toast } from "sonner";

const editHotelSchema = Yup.object().shape({
  name: Yup.string().trim().required("Hotel name is required").max(200),
  category: Yup.string().trim().max(100),
  address: Yup.string().trim().max(500),
  city: Yup.string().trim().max(100),
  state: Yup.string().trim().max(100),
  country: Yup.string().trim().max(100),
  phone: Yup.string().trim().max(30),
  email: Yup.string().trim().email("Invalid email").max(150),
  website: Yup.string().trim().max(250),
  notes: Yup.string().trim().max(2000),
});

export default function HotelProfilePage() {
  const params = useParams();
  const router = useRouter();
  const hotelId = params.id as string;

  const [hotel, setHotel] = React.useState<Hotel | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = React.useState(false);
  const [isEditHotelOpen, setIsEditHotelOpen] = React.useState(false);
  const [isArchiving, setIsArchiving] = React.useState(false);

  // Fetch real hotel
  const fetchHotel = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await hotelClient.getHotel(hotelId);
      if (res.success && res.data) {
        setHotel(res.data);
      }
    } catch (err: any) {
      if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
        setIsReadOnly(true);
      }
      setError(err?.message || "Hotel not found.");
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  React.useEffect(() => {
    if (hotelId) fetchHotel();
  }, [hotelId, fetchHotel]);

  // Edit Formik
  const editHotelFormik = useFormik({
    initialValues: {
      name: hotel?.name || "",
      category: hotel?.category || "",
      address: hotel?.address || "",
      city: hotel?.city || "",
      state: hotel?.state || "",
      country: hotel?.country || "India",
      phone: hotel?.phone || "",
      email: hotel?.email || "",
      website: hotel?.website || "",
      notes: hotel?.notes || "",
    },
    enableReinitialize: true,
    validationSchema: editHotelSchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        setSubmitting(true);
        await hotelClient.updateHotel(hotelId, {
          name: values.name.trim(),
          category: values.category.trim() || undefined,
          address: values.address.trim() || undefined,
          city: values.city.trim() || undefined,
          state: values.state.trim() || undefined,
          country: values.country.trim() || undefined,
          phone: values.phone.trim() || undefined,
          email: values.email.trim() || undefined,
          website: values.website.trim() || undefined,
          notes: values.notes.trim() || undefined,
        });

        toast.success("Hotel updated successfully.");
        setIsEditHotelOpen(false);
        await fetchHotel();
      } catch (err: any) {
        toast.error(err?.message || "Failed to update hotel.");
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Archive action
  const handleArchive = async () => {
    if (!confirm(`Are you sure you want to archive "${hotel?.name}"?`)) return;

    try {
      setIsArchiving(true);
      await hotelClient.archiveHotel(hotelId);
      toast.success("Hotel archived successfully.");
      router.push("/hotels");
    } catch (err: any) {
      toast.error(err?.message || "Failed to archive hotel.");
    } finally {
      setIsArchiving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-slate-50/50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
        <h3 className="text-xs font-bold text-slate-700">Loading hotel property...</h3>
      </div>
    );
  }

  if (error || !hotel) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-slate-50/50">
        <HotelIcon className="h-12 w-12 text-slate-400 mb-3" />
        <h3 className="text-lg font-bold text-slate-800">Hotel Property Not Found</h3>
        <p className="text-xs text-slate-500 max-w-md mt-1">
          {error || "The requested hotel does not exist or has been archived."}
        </p>
        <Link href="/hotels" className="mt-4">
          <Button variant="outline" size="sm" className="bg-white border-slate-200 cursor-pointer">
            Back to Hotels
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {isReadOnly && <ReadOnlyBanner moduleName="Hotel Profile" />}

        {/* Top Hero Command Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs relative overflow-hidden">
          <div className="space-y-3 z-10">
            <div className="flex items-center gap-2.5">
              <Link
                href="/hotels"
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </Link>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">
                <HotelIcon className="h-3 w-3 text-indigo-500" />
                Hotel Profile
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                {hotel.name}
              </h1>
              {hotel.category && (
                <span className="text-xs font-semibold text-slate-500">
                  {hotel.category}
                </span>
              )}
            </div>

            {/* Micro details */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                {hotel.city ? `${hotel.city}${hotel.state ? `, ${hotel.state}` : ""}` : (hotel.address || "Location unspecified")}
              </span>
              {hotel.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  {hotel.phone}
                </span>
              )}
              {hotel.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  {hotel.email}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 z-10">
            <Button
              variant="outline"
              size="sm"
              disabled={isReadOnly}
              onClick={() => setIsEditHotelOpen(true)}
              className="bg-white hover:bg-slate-50 border-slate-200 h-9 font-semibold text-xs rounded-xl shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <Edit className="h-3.5 w-3.5 mr-1 text-slate-400" /> Edit Hotel
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isReadOnly || isArchiving}
              onClick={handleArchive}
              className="bg-white hover:bg-rose-50 border-slate-200 text-rose-600 h-9 font-semibold text-xs rounded-xl shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <Archive className="h-3.5 w-3.5 mr-1 text-rose-500" />
              {isArchiving ? "Archiving..." : "Archive"}
            </Button>
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-6 max-w-4xl">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3">
            Hotel Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Property Name</span>
              <strong className="text-slate-900">{hotel.name}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Category</span>
              <span className="text-slate-800 font-semibold">{hotel.category || "Standard"}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Address</span>
              <span className="text-slate-800">{hotel.address || "-"}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">City / State / Country</span>
              <span className="text-slate-800 font-medium">
                {[hotel.city, hotel.state, hotel.country].filter(Boolean).join(", ") || "-"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Phone</span>
              <span className="text-slate-800">{hotel.phone || "-"}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Email</span>
              <span className="text-slate-800">{hotel.email || "-"}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Website</span>
              {hotel.website ? (
                <a
                  href={hotel.website.startsWith("http") ? hotel.website : `https://${hotel.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline font-medium"
                >
                  {hotel.website}
                </a>
              ) : (
                <span className="text-slate-400">-</span>
              )}
            </div>
          </div>

          {hotel.notes && (
            <div className="pt-3 border-t border-slate-100">
              <span className="text-slate-400 block text-[11px] font-bold uppercase mb-1">Internal Notes</span>
              <p className="text-xs text-slate-700 bg-slate-50/70 p-3 rounded-lg border border-slate-100 whitespace-pre-wrap">
                {hotel.notes}
              </p>
            </div>
          )}
        </div>

        {/* Edit Hotel Modal */}
        <Dialog open={isEditHotelOpen} onOpenChange={setIsEditHotelOpen}>
          <DialogContent className="bg-white border border-slate-200 rounded-2xl max-w-lg p-6 shadow-xl">
            <form onSubmit={editHotelFormik.handleSubmit}>
              <DialogHeader>
                <DialogTitle className="text-slate-900 font-bold text-base">Edit Hotel Property</DialogTitle>
                <DialogDescription className="text-slate-500 text-xs mt-1">
                  Modify property details, location, and contact information.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5 mt-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Hotel Name *</label>
                  <Input
                    {...editHotelFormik.getFieldProps("name")}
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Category</label>
                  <Input
                    {...editHotelFormik.getFieldProps("category")}
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">City</label>
                    <Input
                      {...editHotelFormik.getFieldProps("city")}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">State</label>
                    <Input
                      {...editHotelFormik.getFieldProps("state")}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Address</label>
                  <Input
                    {...editHotelFormik.getFieldProps("address")}
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Phone</label>
                    <Input
                      {...editHotelFormik.getFieldProps("phone")}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Email</label>
                    <Input
                      type="email"
                      {...editHotelFormik.getFieldProps("email")}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Website</label>
                  <Input
                    {...editHotelFormik.getFieldProps("website")}
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Notes</label>
                  <Textarea
                    {...editHotelFormik.getFieldProps("notes")}
                    rows={3}
                    className="bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="mt-6 flex justify-end gap-2.5">
                <DialogClose
                  render={
                    <Button type="button" variant="outline" size="sm" className="bg-white border-slate-200 text-xs font-semibold rounded-xl">
                      Cancel
                    </Button>
                  }
                />
                <Button
                  type="submit"
                  disabled={editHotelFormik.isSubmitting}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 rounded-xl"
                >
                  {editHotelFormik.isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
