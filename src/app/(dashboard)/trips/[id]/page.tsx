"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useFormik } from "formik";
import Link from "next/link";
import { ReadOnlyBanner } from "@/components/shared/read-only-banner";
import {
  tripClient,
  travelerClient,
  itineraryClient,
  hotelClient,
  vehicleClient,
  activityClient,
  tripHotelClient,
  tripVehicleClient,
  tripActivityClient,
  TripHotelWithHotel,
  TripVehicleWithVehicle,
  TripActivityWithActivity,
} from "@/lib/api-client";
import {
  TripStatus,
  Traveler,
  ItineraryItem,
  TravelerType,
  Hotel,
  Vehicle,
  Activity,
  ActivityType,
  VehiclePricingType,
} from "@prisma/client";
import { TripWithRelations } from "@/lib/services/trip-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Compass,
  Calendar,
  Info,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Hotel as HotelIcon,
  Car,
  Ticket,
  DollarSign,
  Users,
  Archive,
  Loader2,
  UserPlus,
  Mail,
  Phone,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { formatTripStatus, TripStatusBadge } from "../page";

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  // Real Database States
  const [trip, setTrip] = React.useState<TripWithRelations | null>(null);
  const [travelers, setTravelers] = React.useState<Traveler[]>([]);
  const [itineraryItems, setItineraryItems] = React.useState<ItineraryItem[]>([]);
  const [tripHotels, setTripHotels] = React.useState<TripHotelWithHotel[]>([]);
  const [tripVehicles, setTripVehicles] = React.useState<TripVehicleWithVehicle[]>([]);
  const [tripActivities, setTripActivities] = React.useState<TripActivityWithActivity[]>([]);

  // Master Inventory States (for selectors)
  const [masterHotels, setMasterHotels] = React.useState<Hotel[]>([]);
  const [masterVehicles, setMasterVehicles] = React.useState<Vehicle[]>([]);
  const [masterActivities, setMasterActivities] = React.useState<Activity[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = React.useState(false);
  const [isArchiving, setIsArchiving] = React.useState(false);

  // Active Tab state
  const [activeTab, setActiveTab] = React.useState<
    | "overview"
    | "travelers"
    | "itinerary"
    | "hotels"
    | "vehicles"
    | "activities"
    | "costing"
    | "quotation"
  >("overview");

  // Fetch real trip details and assignments from APIs
  const fetchTripDetails = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [tripRes, hotelsRes, vehiclesRes, activitiesRes] = await Promise.all([
        tripClient.getTrip(id),
        tripHotelClient.getTripHotels(id).catch(() => ({ success: true, data: [] as TripHotelWithHotel[] })),
        tripVehicleClient.getTripVehicles(id).catch(() => ({ success: true, data: [] as TripVehicleWithVehicle[] })),
        tripActivityClient.getTripActivities(id).catch(() => ({ success: true, data: [] as TripActivityWithActivity[] })),
      ]);

      if (tripRes.success && tripRes.data) {
        setTrip(tripRes.data);
        setTravelers(tripRes.data.travelers || []);
        setItineraryItems(tripRes.data.itineraryItems || []);
      }

      if (hotelsRes.success && hotelsRes.data) {
        setTripHotels(hotelsRes.data);
      }

      if (vehiclesRes.success && vehiclesRes.data) {
        setTripVehicles(vehiclesRes.data);
      }

      if (activitiesRes.success && activitiesRes.data) {
        setTripActivities(activitiesRes.data);
      }
    } catch (err: any) {
      if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
        setIsReadOnly(true);
      }
      setError(err?.message || "Failed to load trip workspace.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Fetch master inventories for pickers
  const fetchMasterInventories = React.useCallback(async () => {
    try {
      const [hRes, vRes, aRes] = await Promise.all([
        hotelClient.getHotels({ limit: 100 }).catch(() => ({ success: true, data: [] as Hotel[] })),
        vehicleClient.getVehicles({ limit: 100 }).catch(() => ({ success: true, data: [] as Vehicle[] })),
        activityClient.getActivities({ limit: 100 }).catch(() => ({ success: true, data: [] as Activity[] })),
      ]);

      if (hRes.success && hRes.data) setMasterHotels(hRes.data);
      if (vRes.success && vRes.data) setMasterVehicles(vRes.data);
      if (aRes.success && aRes.data) setMasterActivities(aRes.data);
    } catch {
      // Non-blocking for master inventory
    }
  }, []);

  React.useEffect(() => {
    if (id) {
      fetchTripDetails();
      fetchMasterInventories();
    }
  }, [id, fetchTripDetails, fetchMasterInventories]);

  const tripQuotations = trip?.quotations || [];

  // Edit Trip Modal state
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editSaving, setEditSaving] = React.useState(false);

  // Traveler Dialog states
  const [isAddTravelerOpen, setIsAddTravelerOpen] = React.useState(false);
  const [isEditTravelerOpen, setIsEditTravelerOpen] = React.useState(false);
  const [selectedTravelerId, setSelectedTravelerId] = React.useState<string | null>(null);
  const [travelerName, setTravelerName] = React.useState("");
  const [travelerType, setTravelerType] = React.useState<TravelerType>("ADULT");
  const [travelerPhone, setTravelerPhone] = React.useState("");
  const [travelerEmail, setTravelerEmail] = React.useState("");
  const [travelerGender, setTravelerGender] = React.useState("");
  const [travelerSaving, setTravelerSaving] = React.useState(false);

  // Itinerary Item Dialog states
  const [isAddItemOpen, setIsAddItemOpen] = React.useState(false);
  const [isEditItemOpen, setIsEditItemOpen] = React.useState(false);
  const [selectedItemId, setSelectedItemId] = React.useState<string | null>(null);
  const [itemDayNumber, setItemDayNumber] = React.useState(1);
  const [itemDate, setItemDate] = React.useState("");
  const [itemTitle, setItemTitle] = React.useState("");
  const [itemDescription, setItemDescription] = React.useState("");
  const [itemLocation, setItemLocation] = React.useState("");
  const [itemStartTime, setItemStartTime] = React.useState("");
  const [itemEndTime, setItemEndTime] = React.useState("");
  const [itemSaving, setItemSaving] = React.useState(false);

  // Trip Hotel Dialog states
  const [isAddHotelOpen, setIsAddHotelOpen] = React.useState(false);
  const [isEditHotelOpen, setIsEditHotelOpen] = React.useState(false);
  const [selectedTripHotelId, setSelectedTripHotelId] = React.useState<string | null>(null);
  const [hotelFormHotelId, setHotelFormHotelId] = React.useState("");
  const [hotelFormCheckIn, setHotelFormCheckIn] = React.useState("");
  const [hotelFormCheckOut, setHotelFormCheckOut] = React.useState("");
  const [hotelFormRoomType, setHotelFormRoomType] = React.useState("Deluxe Room");
  const [hotelFormRooms, setHotelFormRooms] = React.useState(1);
  const [hotelFormMealPlan, setHotelFormMealPlan] = React.useState("CP - Breakfast Included");
  const [hotelFormNightlyRate, setHotelFormNightlyRate] = React.useState("");
  const [hotelFormTotalAmount, setHotelFormTotalAmount] = React.useState("");
  const [hotelFormNotes, setHotelFormNotes] = React.useState("");
  const [hotelSaving, setHotelSaving] = React.useState(false);

  // Trip Vehicle Dialog states
  const [isAddVehicleOpen, setIsAddVehicleOpen] = React.useState(false);
  const [isEditVehicleOpen, setIsEditVehicleOpen] = React.useState(false);
  const [selectedTripVehicleId, setSelectedTripVehicleId] = React.useState<string | null>(null);
  const [vehicleFormVehicleId, setVehicleFormVehicleId] = React.useState("");
  const [vehicleFormName, setVehicleFormName] = React.useState("Toyota Innova Crysta");
  const [vehicleFormType, setVehicleFormType] = React.useState("SUV");
  const [vehicleFormCapacity, setVehicleFormCapacity] = React.useState(7);
  const [vehicleFormStartDate, setVehicleFormStartDate] = React.useState("");
  const [vehicleFormEndDate, setVehicleFormEndDate] = React.useState("");
  const [vehicleFormPickup, setVehicleFormPickup] = React.useState("");
  const [vehicleFormDrop, setVehicleFormDrop] = React.useState("");
  const [vehicleFormDriverName, setVehicleFormDriverName] = React.useState("");
  const [vehicleFormDriverPhone, setVehicleFormDriverPhone] = React.useState("");
  const [vehicleFormPricingType, setVehicleFormPricingType] = React.useState<VehiclePricingType>(VehiclePricingType.TOTAL);
  const [vehicleFormRatePerKm, setVehicleFormRatePerKm] = React.useState("");
  const [vehicleFormEstimatedKm, setVehicleFormEstimatedKm] = React.useState("");
  const [vehicleFormTotalRate, setVehicleFormTotalRate] = React.useState("");
  const [vehicleFormNotes, setVehicleFormNotes] = React.useState("");
  const [vehicleSaving, setVehicleSaving] = React.useState(false);

  // Trip Activity Dialog states
  const [isAddActivityOpen, setIsAddActivityOpen] = React.useState(false);
  const [isEditActivityOpen, setIsEditActivityOpen] = React.useState(false);
  const [selectedTripActivityId, setSelectedTripActivityId] = React.useState<string | null>(null);
  const [activityFormActivityId, setActivityFormActivityId] = React.useState("");
  const [activityFormName, setActivityFormName] = React.useState("Sightseeing Tour");
  const [activityFormDescription, setActivityFormDescription] = React.useState("");
  const [activityFormDate, setActivityFormDate] = React.useState("");
  const [activityFormTime, setActivityFormTime] = React.useState("09:00 AM");
  const [activityFormLocation, setActivityFormLocation] = React.useState("");
  const [activityFormParticipants, setActivityFormParticipants] = React.useState(2);
  const [activityFormType, setActivityFormType] = React.useState<ActivityType>(ActivityType.INCLUDED);
  const [activityFormAdultPrice, setActivityFormAdultPrice] = React.useState("");
  const [activityFormChildPrice, setActivityFormChildPrice] = React.useState("");
  const [activityFormTotalPrice, setActivityFormTotalPrice] = React.useState("");
  const [activityFormNotes, setActivityFormNotes] = React.useState("");
  const [activitySaving, setActivitySaving] = React.useState(false);

  // Edit Trip Formik
  const editTripFormik = useFormik({
    initialValues: {
      title: trip?.title || "",
      startDate: trip?.startDate ? new Date(trip.startDate).toISOString().split("T")[0] : "",
      endDate: trip?.endDate ? new Date(trip.endDate).toISOString().split("T")[0] : "",
      status: trip?.status || TripStatus.PLANNING,
      notes: trip?.notes || "",
    },
    enableReinitialize: true,
    onSubmit: async (values) => {
      try {
        setEditSaving(true);
        const res = await tripClient.updateTrip(id, {
          title: values.title.trim(),
          startDate: values.startDate ? new Date(values.startDate) : undefined,
          endDate: values.endDate ? new Date(values.endDate) : undefined,
          status: values.status,
          notes: values.notes.trim() || undefined,
        });

        if (res.success && res.data) {
          toast.success("Trip updated successfully.");
          setIsEditOpen(false);
          await fetchTripDetails();
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to update trip.");
      } finally {
        setEditSaving(false);
      }
    },
  });

  // Archive Trip
  const handleArchiveTrip = async () => {
    if (!confirm(`Are you sure you want to archive trip "${trip?.title}"?`)) return;

    try {
      setIsArchiving(true);
      await tripClient.archiveTrip(id);
      toast.success("Trip archived successfully.");
      router.push("/trips");
    } catch (err: any) {
      toast.error(err?.message || "Failed to archive trip.");
    } finally {
      setIsArchiving(false);
    }
  };

  // ──────────────────────── TRAVELER HANDLERS ─────────────────────────
  const handleOpenAddTraveler = () => {
    setTravelerName("");
    setTravelerType("ADULT");
    setTravelerPhone("");
    setTravelerEmail("");
    setTravelerGender("");
    setIsAddTravelerOpen(true);
  };

  const handleSaveAddTraveler = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!travelerName.trim()) return;

    try {
      setTravelerSaving(true);
      await travelerClient.createTraveler(id, {
        name: travelerName.trim(),
        type: travelerType,
        phone: travelerPhone.trim() || undefined,
        email: travelerEmail.trim() || undefined,
        gender: travelerGender.trim() || undefined,
      });

      toast.success("Traveler added.");
      setIsAddTravelerOpen(false);
      await fetchTripDetails();
    } catch (err: any) {
      toast.error(err?.message || "Failed to add traveler.");
    } finally {
      setTravelerSaving(false);
    }
  };

  const handleOpenEditTraveler = (t: Traveler) => {
    setSelectedTravelerId(t.id);
    setTravelerName(t.name);
    setTravelerType(t.type);
    setTravelerPhone(t.phone || "");
    setTravelerEmail(t.email || "");
    setTravelerGender(t.gender || "");
    setIsEditTravelerOpen(true);
  };

  const handleSaveEditTraveler = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTravelerId || !travelerName.trim()) return;

    try {
      setTravelerSaving(true);
      await travelerClient.updateTraveler(id, selectedTravelerId, {
        name: travelerName.trim(),
        type: travelerType,
        phone: travelerPhone.trim() || undefined,
        email: travelerEmail.trim() || undefined,
        gender: travelerGender.trim() || undefined,
      });

      toast.success("Traveler updated.");
      setIsEditTravelerOpen(false);
      await fetchTripDetails();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update traveler.");
    } finally {
      setTravelerSaving(false);
    }
  };

  const handleDeleteTraveler = async (travelerId: string, name: string) => {
    if (!confirm(`Remove traveler "${name}" from this trip?`)) return;

    try {
      await travelerClient.deleteTraveler(id, travelerId);
      toast.success("Traveler removed.");
      await fetchTripDetails();
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove traveler.");
    }
  };

  // ──────────────────────── ITINERARY HANDLERS ─────────────────────────
  const handleOpenAddItem = () => {
    const nextDay = itineraryItems.length + 1;
    setItemDayNumber(nextDay);
    setItemDate("");
    setItemTitle(`Day ${nextDay}: Sightseeing & Transfers`);
    setItemDescription("");
    setItemLocation("");
    setItemStartTime("09:00 AM");
    setItemEndTime("05:00 PM");
    setIsAddItemOpen(true);
  };

  const handleSaveAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTitle.trim()) return;

    try {
      setItemSaving(true);
      await itineraryClient.createItineraryItem(id, {
        dayNumber: Number(itemDayNumber),
        sortOrder: itineraryItems.length,
        date: itemDate ? new Date(itemDate) : undefined,
        title: itemTitle.trim(),
        description: itemDescription.trim() || undefined,
        location: itemLocation.trim() || undefined,
        startTime: itemStartTime.trim() || undefined,
        endTime: itemEndTime.trim() || undefined,
      });

      toast.success("Itinerary item added.");
      setIsAddItemOpen(false);
      await fetchTripDetails();
    } catch (err: any) {
      toast.error(err?.message || "Failed to add itinerary item.");
    } finally {
      setItemSaving(false);
    }
  };

  const handleOpenEditItem = (item: ItineraryItem) => {
    setSelectedItemId(item.id);
    setItemDayNumber(item.dayNumber);
    setItemDate(item.date ? new Date(item.date).toISOString().split("T")[0] : "");
    setItemTitle(item.title);
    setItemDescription(item.description || "");
    setItemLocation(item.location || "");
    setItemStartTime(item.startTime || "");
    setItemEndTime(item.endTime || "");
    setIsEditItemOpen(true);
  };

  const handleSaveEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || !itemTitle.trim()) return;

    try {
      setItemSaving(true);
      await itineraryClient.updateItineraryItem(id, selectedItemId, {
        dayNumber: Number(itemDayNumber),
        date: itemDate ? new Date(itemDate) : undefined,
        title: itemTitle.trim(),
        description: itemDescription.trim() || undefined,
        location: itemLocation.trim() || undefined,
        startTime: itemStartTime.trim() || undefined,
        endTime: itemEndTime.trim() || undefined,
      });

      toast.success("Itinerary item updated.");
      setIsEditItemOpen(false);
      await fetchTripDetails();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update itinerary item.");
    } finally {
      setItemSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: string, dayNumber: number) => {
    if (!confirm(`Delete itinerary schedule for Day ${dayNumber}?`)) return;

    try {
      await itineraryClient.deleteItineraryItem(id, itemId);
      toast.success("Itinerary item deleted.");
      await fetchTripDetails();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete itinerary item.");
    }
  };

  // ──────────────────────── TRIP HOTEL HANDLERS ─────────────────────────
  const handleOpenAddHotel = () => {
    setHotelFormHotelId(masterHotels[0]?.id || "");
    setHotelFormCheckIn(trip?.startDate ? new Date(trip.startDate).toISOString().split("T")[0] : "");
    setHotelFormCheckOut(trip?.endDate ? new Date(trip.endDate).toISOString().split("T")[0] : "");
    setHotelFormRoomType("Deluxe Room");
    setHotelFormRooms(1);
    setHotelFormMealPlan("CP - Breakfast Included");
    setHotelFormNightlyRate("3500");
    setHotelFormTotalAmount("7000");
    setHotelFormNotes("");
    setIsAddHotelOpen(true);
  };

  const handleSaveAddHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotelFormHotelId || !hotelFormCheckIn || !hotelFormCheckOut) {
      toast.error("Please select a hotel and specify check-in/check-out dates.");
      return;
    }

    try {
      setHotelSaving(true);
      await tripHotelClient.createTripHotel(id, {
        hotelId: hotelFormHotelId,
        checkIn: new Date(hotelFormCheckIn),
        checkOut: new Date(hotelFormCheckOut),
        roomType: hotelFormRoomType.trim(),
        rooms: Number(hotelFormRooms),
        mealPlan: hotelFormMealPlan.trim() || undefined,
        nightlyRate: hotelFormNightlyRate !== "" ? Number(hotelFormNightlyRate) : undefined,
        totalAmount: hotelFormTotalAmount !== "" ? Number(hotelFormTotalAmount) : undefined,
        notes: hotelFormNotes.trim() || undefined,
      });

      toast.success("Hotel reservation attached to trip.");
      setIsAddHotelOpen(false);
      await fetchTripDetails();
    } catch (err: any) {
      toast.error(err?.message || "Failed to add hotel reservation.");
    } finally {
      setHotelSaving(false);
    }
  };

  const handleOpenEditHotel = (th: TripHotelWithHotel) => {
    setSelectedTripHotelId(th.id);
    setHotelFormHotelId(th.hotelId);
    setHotelFormCheckIn(th.checkIn ? new Date(th.checkIn).toISOString().split("T")[0] : "");
    setHotelFormCheckOut(th.checkOut ? new Date(th.checkOut).toISOString().split("T")[0] : "");
    setHotelFormRoomType(th.roomType);
    setHotelFormRooms(th.rooms);
    setHotelFormMealPlan(th.mealPlan || "");
    setHotelFormNightlyRate(th.nightlyRate !== null && th.nightlyRate !== undefined ? String(th.nightlyRate) : "");
    setHotelFormTotalAmount(th.totalAmount !== null && th.totalAmount !== undefined ? String(th.totalAmount) : "");
    setHotelFormNotes(th.notes || "");
    setIsEditHotelOpen(true);
  };

  const handleSaveEditHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTripHotelId || !hotelFormCheckIn || !hotelFormCheckOut) return;

    try {
      setHotelSaving(true);
      await tripHotelClient.updateTripHotel(id, selectedTripHotelId, {
        hotelId: hotelFormHotelId,
        checkIn: new Date(hotelFormCheckIn),
        checkOut: new Date(hotelFormCheckOut),
        roomType: hotelFormRoomType.trim(),
        rooms: Number(hotelFormRooms),
        mealPlan: hotelFormMealPlan.trim() || undefined,
        nightlyRate: hotelFormNightlyRate !== "" ? Number(hotelFormNightlyRate) : undefined,
        totalAmount: hotelFormTotalAmount !== "" ? Number(hotelFormTotalAmount) : undefined,
        notes: hotelFormNotes.trim() || undefined,
      });

      toast.success("Hotel reservation updated.");
      setIsEditHotelOpen(false);
      await fetchTripDetails();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update hotel reservation.");
    } finally {
      setHotelSaving(false);
    }
  };

  const handleDeleteTripHotel = async (tripHotelId: string, hotelName: string) => {
    if (!confirm(`Remove hotel reservation for "${hotelName}"?`)) return;

    try {
      await tripHotelClient.deleteTripHotel(id, tripHotelId);
      toast.success("Hotel reservation removed.");
      await fetchTripDetails();
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove hotel reservation.");
    }
  };

  // ──────────────────────── TRIP VEHICLE HANDLERS ─────────────────────────
  const handleOpenAddVehicle = () => {
    setVehicleFormVehicleId(masterVehicles[0]?.id || "");
    setVehicleFormName(masterVehicles[0]?.name || "Sedan");
    setVehicleFormType(masterVehicles[0]?.type || "Sedan");
    setVehicleFormCapacity(masterVehicles[0]?.capacity || 4);
    setVehicleFormStartDate(trip?.startDate ? new Date(trip.startDate).toISOString().split("T")[0] : "");
    setVehicleFormEndDate(trip?.endDate ? new Date(trip.endDate).toISOString().split("T")[0] : "");
    setVehicleFormPickup("Airport Pickup");
    setVehicleFormDrop("Hotel Drop");
    setVehicleFormDriverName(masterVehicles[0]?.driverName || "");
    setVehicleFormDriverPhone(masterVehicles[0]?.driverPhone || "");
    setVehicleFormPricingType(VehiclePricingType.TOTAL);
    setVehicleFormRatePerKm(masterVehicles[0]?.ratePerKm ? String(masterVehicles[0].ratePerKm) : "18");
    setVehicleFormEstimatedKm("250");
    setVehicleFormTotalRate("4500");
    setVehicleFormNotes("");
    setIsAddVehicleOpen(true);
  };

  const handleSelectMasterVehicle = (vId: string | null) => {
    if (!vId) return;
    setVehicleFormVehicleId(vId);
    const mv = masterVehicles.find((v) => v.id === vId);
    if (mv) {
      setVehicleFormName(mv.name);
      setVehicleFormType(mv.type);
      setVehicleFormCapacity(mv.capacity);
      setVehicleFormDriverName(mv.driverName || "");
      setVehicleFormDriverPhone(mv.driverPhone || "");
      setVehicleFormPricingType(mv.pricingType);
      if (mv.ratePerKm) setVehicleFormRatePerKm(String(mv.ratePerKm));
    }
  };

  const handleSaveAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleFormName.trim() || !vehicleFormType.trim()) {
      toast.error("Please enter a vehicle name and type.");
      return;
    }

    try {
      setVehicleSaving(true);
      await tripVehicleClient.createTripVehicle(id, {
        vehicleId: vehicleFormVehicleId || undefined,
        vehicleName: vehicleFormName.trim(),
        vehicleType: vehicleFormType.trim(),
        capacity: Number(vehicleFormCapacity),
        startDate: vehicleFormStartDate ? new Date(vehicleFormStartDate) : undefined,
        endDate: vehicleFormEndDate ? new Date(vehicleFormEndDate) : undefined,
        pickupLocation: vehicleFormPickup.trim() || undefined,
        dropLocation: vehicleFormDrop.trim() || undefined,
        driverName: vehicleFormDriverName.trim() || undefined,
        driverPhone: vehicleFormDriverPhone.trim() || undefined,
        pricingType: vehicleFormPricingType,
        ratePerKm: vehicleFormRatePerKm !== "" ? Number(vehicleFormRatePerKm) : undefined,
        estimatedKm: vehicleFormEstimatedKm !== "" ? Number(vehicleFormEstimatedKm) : undefined,
        totalRate: vehicleFormTotalRate !== "" ? Number(vehicleFormTotalRate) : undefined,
        notes: vehicleFormNotes.trim() || undefined,
      });

      toast.success("Vehicle assigned to trip.");
      setIsAddVehicleOpen(false);
      await fetchTripDetails();
    } catch (err: any) {
      toast.error(err?.message || "Failed to assign vehicle.");
    } finally {
      setVehicleSaving(false);
    }
  };

  const handleOpenEditVehicle = (tv: TripVehicleWithVehicle) => {
    setSelectedTripVehicleId(tv.id);
    setVehicleFormVehicleId(tv.vehicleId || "");
    setVehicleFormName(tv.vehicleName);
    setVehicleFormType(tv.vehicleType);
    setVehicleFormCapacity(tv.capacity || 4);
    setVehicleFormStartDate(tv.startDate ? new Date(tv.startDate).toISOString().split("T")[0] : "");
    setVehicleFormEndDate(tv.endDate ? new Date(tv.endDate).toISOString().split("T")[0] : "");
    setVehicleFormPickup(tv.pickupLocation || "");
    setVehicleFormDrop(tv.dropLocation || "");
    setVehicleFormDriverName(tv.driverName || "");
    setVehicleFormDriverPhone(tv.driverPhone || "");
    setVehicleFormPricingType(tv.pricingType);
    setVehicleFormRatePerKm(tv.ratePerKm !== null && tv.ratePerKm !== undefined ? String(tv.ratePerKm) : "");
    setVehicleFormEstimatedKm(tv.estimatedKm !== null && tv.estimatedKm !== undefined ? String(tv.estimatedKm) : "");
    setVehicleFormTotalRate(tv.totalRate !== null && tv.totalRate !== undefined ? String(tv.totalRate) : "");
    setVehicleFormNotes(tv.notes || "");
    setIsEditVehicleOpen(true);
  };

  const handleSaveEditVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTripVehicleId || !vehicleFormName.trim()) return;

    try {
      setVehicleSaving(true);
      await tripVehicleClient.updateTripVehicle(id, selectedTripVehicleId, {
        vehicleId: vehicleFormVehicleId || undefined,
        vehicleName: vehicleFormName.trim(),
        vehicleType: vehicleFormType.trim(),
        capacity: Number(vehicleFormCapacity),
        startDate: vehicleFormStartDate ? new Date(vehicleFormStartDate) : undefined,
        endDate: vehicleFormEndDate ? new Date(vehicleFormEndDate) : undefined,
        pickupLocation: vehicleFormPickup.trim() || undefined,
        dropLocation: vehicleFormDrop.trim() || undefined,
        driverName: vehicleFormDriverName.trim() || undefined,
        driverPhone: vehicleFormDriverPhone.trim() || undefined,
        pricingType: vehicleFormPricingType,
        ratePerKm: vehicleFormRatePerKm !== "" ? Number(vehicleFormRatePerKm) : undefined,
        estimatedKm: vehicleFormEstimatedKm !== "" ? Number(vehicleFormEstimatedKm) : undefined,
        totalRate: vehicleFormTotalRate !== "" ? Number(vehicleFormTotalRate) : undefined,
        notes: vehicleFormNotes.trim() || undefined,
      });

      toast.success("Vehicle assignment updated.");
      setIsEditVehicleOpen(false);
      await fetchTripDetails();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update vehicle assignment.");
    } finally {
      setVehicleSaving(false);
    }
  };

  const handleDeleteTripVehicle = async (tripVehicleId: string, vehicleName: string) => {
    if (!confirm(`Remove vehicle assignment "${vehicleName}"?`)) return;

    try {
      await tripVehicleClient.deleteTripVehicle(id, tripVehicleId);
      toast.success("Vehicle assignment removed.");
      await fetchTripDetails();
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove vehicle assignment.");
    }
  };

  // ──────────────────────── TRIP ACTIVITY HANDLERS ─────────────────────────
  const handleOpenAddActivity = () => {
    setActivityFormActivityId(masterActivities[0]?.id || "");
    setActivityFormName(masterActivities[0]?.name || "Sightseeing Excursion");
    setActivityFormDescription(masterActivities[0]?.description || "");
    setActivityFormDate(trip?.startDate ? new Date(trip.startDate).toISOString().split("T")[0] : "");
    setActivityFormTime("09:00 AM");
    setActivityFormLocation(masterActivities[0]?.location || "");
    setActivityFormParticipants(travelers.length || 2);
    setActivityFormType(masterActivities[0]?.type || ActivityType.INCLUDED);
    setActivityFormAdultPrice(masterActivities[0]?.adultPrice ? String(masterActivities[0].adultPrice) : "1500");
    setActivityFormChildPrice(masterActivities[0]?.childPrice ? String(masterActivities[0].childPrice) : "800");
    setActivityFormTotalPrice("3000");
    setActivityFormNotes("");
    setIsAddActivityOpen(true);
  };

  const handleSelectMasterActivity = (actId: string | null) => {
    if (!actId) return;
    setActivityFormActivityId(actId);
    const ma = masterActivities.find((a) => a.id === actId);
    if (ma) {
      setActivityFormName(ma.name);
      setActivityFormDescription(ma.description || "");
      setActivityFormLocation(ma.location || "");
      setActivityFormType(ma.type);
      if (ma.adultPrice) setActivityFormAdultPrice(String(ma.adultPrice));
      if (ma.childPrice) setActivityFormChildPrice(String(ma.childPrice));
    }
  };

  const handleSaveAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityFormName.trim()) {
      toast.error("Please enter an activity name.");
      return;
    }

    try {
      setActivitySaving(true);
      await tripActivityClient.createTripActivity(id, {
        activityId: activityFormActivityId || undefined,
        name: activityFormName.trim(),
        description: activityFormDescription.trim() || undefined,
        date: activityFormDate ? new Date(activityFormDate) : undefined,
        time: activityFormTime.trim() || undefined,
        location: activityFormLocation.trim() || undefined,
        numberOfParticipants: Number(activityFormParticipants),
        type: activityFormType,
        adultPrice: activityFormAdultPrice !== "" ? Number(activityFormAdultPrice) : undefined,
        childPrice: activityFormChildPrice !== "" ? Number(activityFormChildPrice) : undefined,
        totalPrice: activityFormTotalPrice !== "" ? Number(activityFormTotalPrice) : undefined,
        notes: activityFormNotes.trim() || undefined,
      });

      toast.success("Activity assigned to trip.");
      setIsAddActivityOpen(false);
      await fetchTripDetails();
    } catch (err: any) {
      toast.error(err?.message || "Failed to assign activity.");
    } finally {
      setActivitySaving(false);
    }
  };

  const handleOpenEditActivity = (ta: TripActivityWithActivity) => {
    setSelectedTripActivityId(ta.id);
    setActivityFormActivityId(ta.activityId || "");
    setActivityFormName(ta.name);
    setActivityFormDescription(ta.description || "");
    setActivityFormDate(ta.date ? new Date(ta.date).toISOString().split("T")[0] : "");
    setActivityFormTime(ta.time || "");
    setActivityFormLocation(ta.location || "");
    setActivityFormParticipants(ta.numberOfParticipants || 1);
    setActivityFormType(ta.type);
    setActivityFormAdultPrice(ta.adultPrice !== null && ta.adultPrice !== undefined ? String(ta.adultPrice) : "");
    setActivityFormChildPrice(ta.childPrice !== null && ta.childPrice !== undefined ? String(ta.childPrice) : "");
    setActivityFormTotalPrice(ta.totalPrice !== null && ta.totalPrice !== undefined ? String(ta.totalPrice) : "");
    setActivityFormNotes(ta.notes || "");
    setIsEditActivityOpen(true);
  };

  const handleSaveEditActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTripActivityId || !activityFormName.trim()) return;

    try {
      setActivitySaving(true);
      await tripActivityClient.updateTripActivity(id, selectedTripActivityId, {
        activityId: activityFormActivityId || undefined,
        name: activityFormName.trim(),
        description: activityFormDescription.trim() || undefined,
        date: activityFormDate ? new Date(activityFormDate) : undefined,
        time: activityFormTime.trim() || undefined,
        location: activityFormLocation.trim() || undefined,
        numberOfParticipants: Number(activityFormParticipants),
        type: activityFormType,
        adultPrice: activityFormAdultPrice !== "" ? Number(activityFormAdultPrice) : undefined,
        childPrice: activityFormChildPrice !== "" ? Number(activityFormChildPrice) : undefined,
        totalPrice: activityFormTotalPrice !== "" ? Number(activityFormTotalPrice) : undefined,
        notes: activityFormNotes.trim() || undefined,
      });

      toast.success("Activity assignment updated.");
      setIsEditActivityOpen(false);
      await fetchTripDetails();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update activity assignment.");
    } finally {
      setActivitySaving(false);
    }
  };

  const handleDeleteTripActivity = async (tripActivityId: string, activityName: string) => {
    if (!confirm(`Remove activity "${activityName}" from this trip?`)) return;

    try {
      await tripActivityClient.deleteTripActivity(id, tripActivityId);
      toast.success("Activity removed.");
      await fetchTripDetails();
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove activity.");
    }
  };

  const formatDateDisplay = (date: Date | string | null | undefined) => {
    if (!date) return "Unscheduled";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-slate-50/50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
        <h3 className="text-xs font-bold text-slate-700">Loading trip workspace...</h3>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-slate-50/50">
        <Compass className="h-12 w-12 text-slate-400 mb-3" />
        <h3 className="text-lg font-bold text-slate-800">Trip Workspace Not Found</h3>
        <p className="text-xs text-slate-500 max-w-md mt-1">
          {error || "The requested trip record does not exist or has been archived."}
        </p>
        <Link href="/trips" className="mt-4">
          <Button variant="outline" size="sm" className="bg-white border-slate-200 cursor-pointer">
            Back to Trips
          </Button>
        </Link>
      </div>
    );
  }

  const duration =
    trip.startDate && trip.endDate
      ? Math.max(
          1,
          Math.ceil(
            (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) /
              (1000 * 60 * 60 * 24)
          ) + 1
        )
      : 1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Read-Only Banner */}
        {isReadOnly && <ReadOnlyBanner moduleName="Trip Workspace" />}

        {/* Top Hero Command Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-indigo-50/70 via-indigo-50/20 to-transparent pointer-events-none" />

          {/* Left Title & Telemetry */}
          <div className="space-y-3 z-10">
            <div className="flex items-center gap-2.5">
              <Link
                href="/trips"
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </Link>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">
                <Compass className="h-3 w-3 text-indigo-500" />
                Trip Workspace
              </span>
              <span className="text-slate-300">•</span>
              <TripStatusBadge status={trip.status} />
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                {trip.title}
              </h1>
              <span className="text-xs font-semibold text-slate-500">
                {duration} Days Trip
              </span>
            </div>

            {/* Micro details */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
              <span className="flex items-center gap-1 font-medium">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                {formatDateDisplay(trip.startDate)} – {formatDateDisplay(trip.endDate)}
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1 font-medium">
                <Users className="h-3.5 w-3.5 text-slate-400" />
                {travelers.length} Travelers
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1 font-medium">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                {tripHotels.length} Hotels
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1 font-medium">
                <Car className="h-3.5 w-3.5 text-slate-400" />
                {tripVehicles.length} Vehicles
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1 font-medium">
                <Ticket className="h-3.5 w-3.5 text-slate-400" />
                {tripActivities.length} Activities
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 z-10">
            <Button
              variant="outline"
              size="sm"
              disabled={isReadOnly}
              onClick={() => setIsEditOpen(true)}
              className="bg-white hover:bg-slate-50 border-slate-200 h-9 font-semibold text-xs rounded-xl shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <Edit2 className="h-3.5 w-3.5 mr-1 text-slate-400" /> Edit Trip
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isReadOnly || isArchiving}
              onClick={handleArchiveTrip}
              className="bg-white hover:bg-rose-50 border-slate-200 text-rose-600 h-9 font-semibold text-xs rounded-xl shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <Archive className="h-3.5 w-3.5 mr-1 text-rose-500" />
              {isArchiving ? "Archiving..." : "Archive"}
            </Button>
          </div>
        </div>

        {/* Workspace Navigation Tabs */}
        <div className="border-b border-slate-200 bg-white rounded-xl shadow-2xs px-3">
          <div className="flex gap-2 overflow-x-auto py-2">
            {[
              { id: "overview", label: "Overview", icon: Info },
              { id: "travelers", label: "Travelers", icon: Users, count: travelers.length },
              { id: "itinerary", label: "Itinerary", icon: Calendar, count: itineraryItems.length },
              { id: "hotels", label: "Hotels", icon: HotelIcon, count: tripHotels.length },
              { id: "vehicles", label: "Vehicles", icon: Car, count: tripVehicles.length },
              { id: "activities", label: "Activities", icon: Ticket, count: tripActivities.length },
              { id: "costing", label: "Costing", icon: DollarSign },
              { id: "quotation", label: "Quotations", icon: CheckCircle2, count: tripQuotations.length },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive ? "bg-indigo-200/60 text-indigo-900" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-150">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3">
                  Trip Profile Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Customer Account</span>
                    <Link href={`/customers/${trip.customerId}`} className="font-bold text-indigo-600 hover:underline">
                      {trip.customer?.name} ({trip.customer?.phone})
                    </Link>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Customer Email</span>
                    <span className="font-semibold text-slate-800">{trip.customer?.email || "No email registered"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Travel Dates</span>
                    <span className="font-semibold text-slate-800">
                      {formatDateDisplay(trip.startDate)} – {formatDateDisplay(trip.endDate)} ({duration} Days)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Created At</span>
                    <span className="font-semibold text-slate-800">{formatDateDisplay(trip.createdAt)}</span>
                  </div>
                </div>

                {trip.notes && (
                  <div className="pt-3 border-t border-slate-100">
                    <span className="text-slate-400 block text-[11px] font-bold uppercase mb-1">Planning Notes</span>
                    <p className="text-xs text-slate-700 bg-slate-50/70 p-3 rounded-lg border border-slate-100 whitespace-pre-wrap">
                      {trip.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Quick Summary Cards for Attached Inventory */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div
                  onClick={() => setActiveTab("hotels")}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-200 cursor-pointer transition-all space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Hotels</span>
                    <HotelIcon className="h-4 w-4 text-indigo-500" />
                  </div>
                  <strong className="text-lg text-slate-900 block">{tripHotels.length}</strong>
                  <span className="text-[11px] text-slate-500">Reserved properties</span>
                </div>

                <div
                  onClick={() => setActiveTab("vehicles")}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-200 cursor-pointer transition-all space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Vehicles</span>
                    <Car className="h-4 w-4 text-emerald-500" />
                  </div>
                  <strong className="text-lg text-slate-900 block">{tripVehicles.length}</strong>
                  <span className="text-[11px] text-slate-500">Assigned fleet units</span>
                </div>

                <div
                  onClick={() => setActiveTab("activities")}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-200 cursor-pointer transition-all space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Activities</span>
                    <Ticket className="h-4 w-4 text-purple-500" />
                  </div>
                  <strong className="text-lg text-slate-900 block">{tripActivities.length}</strong>
                  <span className="text-[11px] text-slate-500">Tours & excursion passes</span>
                </div>
              </div>
            </div>

            {/* Right Col: Summary Stats & CTA */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2.5">
                  Workspace Telemetry
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Travelers</span>
                    <strong className="text-slate-900">{travelers.length}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Itinerary Days</span>
                    <strong className="text-slate-900">{itineraryItems.length}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Hotels Reserved</span>
                    <strong className="text-slate-900">{tripHotels.length}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Vehicles Assigned</span>
                    <strong className="text-slate-900">{tripVehicles.length}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Activities Scheduled</span>
                    <strong className="text-slate-900">{tripActivities.length}</strong>
                  </div>
                </div>

                <div className="pt-3 space-y-2">
                  <Button
                    onClick={() => setActiveTab("itinerary")}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 rounded-xl cursor-pointer"
                  >
                    Build Day-by-Day Itinerary
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TRAVELERS */}
        {activeTab === "travelers" && (
          <div className="space-y-6 animate-in fade-in duration-150 max-w-4xl mx-auto w-full">
            <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Travelers & Passenger Manifest</h3>
                <p className="text-xs text-slate-500">
                  Manage passenger profiles, contact information, and travel demographics.
                </p>
              </div>

              <Button
                onClick={handleOpenAddTraveler}
                disabled={isReadOnly}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <UserPlus className="h-3.5 w-3.5 mr-1" /> Add Traveler
              </Button>
            </div>

            {travelers.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No travelers registered yet"
                description="Add adult and child passengers to this trip manifest for itinerary scheduling and flight vouchers."
                actionText="Add Traveler"
                onAction={handleOpenAddTraveler}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {travelers.map((t) => (
                  <div key={t.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3 hover:shadow-xs transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-100">
                          {t.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-slate-900 text-xs">{t.name}</h4>
                            {t.isPrimary && (
                              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                Primary
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 capitalize">
                            {t.type.toLowerCase()} {t.gender ? `• ${t.gender}` : ""} {t.nationality ? `• ${t.nationality}` : ""}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditTraveler(t)}
                          disabled={isReadOnly}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer disabled:opacity-50"
                          title="Edit Traveler"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTraveler(t.id, t.name)}
                          disabled={isReadOnly}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 cursor-pointer disabled:opacity-50"
                          title="Remove Traveler"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-slate-600 border-t border-slate-100 pt-2.5">
                      {t.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span>{t.phone}</span>
                        </div>
                      )}
                      {t.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3 w-3 text-slate-400" />
                          <span>{t.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ITINERARY */}
        {activeTab === "itinerary" && (
          <div className="space-y-6 animate-in fade-in duration-150 max-w-4xl mx-auto w-full">
            <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Day-by-Day Itinerary Builder</h3>
                <p className="text-xs text-slate-500">
                  Dates: {formatDateDisplay(trip.startDate)} to {formatDateDisplay(trip.endDate)} ({duration} Days)
                </p>
              </div>

              <Button
                onClick={handleOpenAddItem}
                disabled={isReadOnly}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Day
              </Button>
            </div>

            {itineraryItems.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No itinerary items added yet"
                description="Start adding daily schedules, sightseeing, transfers, and coordinates to this trip."
                actionText="Add Day 1"
                onAction={handleOpenAddItem}
              />
            ) : (
              <div className="space-y-4">
                {itineraryItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3 hover:shadow-xs transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-md uppercase">
                            Day {item.dayNumber}
                          </span>
                          <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                        </div>
                        {item.date && (
                          <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            {formatDateDisplay(item.date)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditItem(item)}
                          disabled={isReadOnly}
                          className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Edit2 className="h-3 w-3" /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id, item.dayNumber)}
                          disabled={isReadOnly}
                          className="p-1.5 rounded-md border border-slate-200 hover:bg-rose-50 text-rose-600 text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      </div>
                    </div>

                    {item.description && (
                      <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    {(item.location || item.startTime || item.endTime) && (
                      <div className="flex flex-wrap gap-3 text-xs text-slate-500 pt-1">
                        {item.location && (
                          <span>Location: <strong className="text-slate-800">{item.location}</strong></span>
                        )}
                        {(item.startTime || item.endTime) && (
                          <span>Timing: <strong className="text-slate-800">{item.startTime || ""} – {item.endTime || ""}</strong></span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: HOTELS (Real PostgreSQL Trip-Hotel Integration) */}
        {activeTab === "hotels" && (
          <div className="space-y-6 animate-in fade-in duration-150 max-w-4xl mx-auto w-full">
            <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Accommodation & Hotel Reservations</h3>
                <p className="text-xs text-slate-500">
                  Assign contracted agency hotels, room categories, check-in dates, and meal plans.
                </p>
              </div>

              <Button
                onClick={handleOpenAddHotel}
                disabled={isReadOnly}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Hotel
              </Button>
            </div>

            {tripHotels.length === 0 ? (
              <EmptyState
                icon={HotelIcon}
                title="No hotel reservations attached"
                description="Assign hotel properties from your agency inventory to this trip for room booking and voucher creation."
                actionText="Add Hotel Reservation"
                onAction={handleOpenAddHotel}
              />
            ) : (
              <div className="space-y-4">
                {tripHotels.map((th) => (
                  <div
                    key={th.id}
                    className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3 hover:shadow-xs transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-md uppercase">
                            {th.roomType}
                          </span>
                          <h4 className="font-bold text-slate-900 text-sm">{th.hotel?.name || "Contracted Hotel"}</h4>
                        </div>
                        <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          Check-in: {formatDateDisplay(th.checkIn)} → Check-out: {formatDateDisplay(th.checkOut)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditHotel(th)}
                          disabled={isReadOnly}
                          className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Edit2 className="h-3 w-3" /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTripHotel(th.id, th.hotel?.name || "Hotel")}
                          disabled={isReadOnly}
                          className="p-1.5 rounded-md border border-slate-200 hover:bg-rose-50 text-rose-600 text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="h-3 w-3" /> Remove
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600 pt-1">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Rooms</span>
                        <strong className="text-slate-800">{th.rooms} Room(s)</strong>
                      </div>
                      {th.mealPlan && (
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Meal Plan</span>
                          <span className="text-slate-800 font-medium">{th.mealPlan}</span>
                        </div>
                      )}
                      {th.nightlyRate !== null && th.nightlyRate !== undefined && (
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Nightly Rate</span>
                          <span className="text-slate-800 font-medium">₹{Number(th.nightlyRate)} / night</span>
                        </div>
                      )}
                      {th.totalAmount !== null && th.totalAmount !== undefined && (
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Tariff</span>
                          <strong className="text-slate-900 font-bold">₹{Number(th.totalAmount)}</strong>
                        </div>
                      )}
                    </div>

                    {th.notes && (
                      <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        {th.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: VEHICLES (Real PostgreSQL Trip-Vehicle Integration) */}
        {activeTab === "vehicles" && (
          <div className="space-y-6 animate-in fade-in duration-150 max-w-4xl mx-auto w-full">
            <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Transportation & Vehicle Assignments</h3>
                <p className="text-xs text-slate-500">
                  Assign fleet units, sedans, SUVs, and tempo travellers with driver arrangements.
                </p>
              </div>

              <Button
                onClick={handleOpenAddVehicle}
                disabled={isReadOnly}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Vehicle
              </Button>
            </div>

            {tripVehicles.length === 0 ? (
              <EmptyState
                icon={Car}
                title="No vehicles assigned to this trip"
                description="Assign private mobility, chauffeurs, or airport transfers to this trip workspace."
                actionText="Assign Vehicle"
                onAction={handleOpenAddVehicle}
              />
            ) : (
              <div className="space-y-4">
                {tripVehicles.map((tv) => (
                  <div
                    key={tv.id}
                    className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3 hover:shadow-xs transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-md uppercase">
                            {tv.vehicleType}
                          </span>
                          <h4 className="font-bold text-slate-900 text-sm">{tv.vehicleName}</h4>
                          {tv.capacity && (
                            <span className="text-[11px] text-slate-500">({tv.capacity} Seats)</span>
                          )}
                        </div>
                        {(tv.startDate || tv.endDate) && (
                          <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            {formatDateDisplay(tv.startDate)} → {formatDateDisplay(tv.endDate)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditVehicle(tv)}
                          disabled={isReadOnly}
                          className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Edit2 className="h-3 w-3" /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTripVehicle(tv.id, tv.vehicleName)}
                          disabled={isReadOnly}
                          className="p-1.5 rounded-md border border-slate-200 hover:bg-rose-50 text-rose-600 text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="h-3 w-3" /> Remove
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600 pt-1">
                      {tv.pickupLocation && (
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Pickup</span>
                          <span className="text-slate-800 font-medium">{tv.pickupLocation}</span>
                        </div>
                      )}
                      {tv.dropLocation && (
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Drop</span>
                          <span className="text-slate-800 font-medium">{tv.dropLocation}</span>
                        </div>
                      )}
                      {tv.driverName && (
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Chauffeur</span>
                          <span className="text-slate-800 font-medium">{tv.driverName} {tv.driverPhone ? `(${tv.driverPhone})` : ""}</span>
                        </div>
                      )}
                      {tv.totalRate !== null && tv.totalRate !== undefined && (
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Tariff</span>
                          <strong className="text-slate-900 font-bold">₹{Number(tv.totalRate)}</strong>
                        </div>
                      )}
                    </div>

                    {tv.notes && (
                      <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        {tv.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: ACTIVITIES (Real PostgreSQL Trip-Activity Integration) */}
        {activeTab === "activities" && (
          <div className="space-y-6 animate-in fade-in duration-150 max-w-4xl mx-auto w-full">
            <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Sightseeing & Activity Passes</h3>
                <p className="text-xs text-slate-500">
                  Attach guided excursions, boat tickets, entrance passes, and adventure experiences.
                </p>
              </div>

              <Button
                onClick={handleOpenAddActivity}
                disabled={isReadOnly}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Activity
              </Button>
            </div>

            {tripActivities.length === 0 ? (
              <EmptyState
                icon={Ticket}
                title="No activities assigned to this trip"
                description="Assign experiences, entry passes, or adventure sports from your agency database to this itinerary."
                actionText="Assign Activity"
                onAction={handleOpenAddActivity}
              />
            ) : (
              <div className="space-y-4">
                {tripActivities.map((ta) => (
                  <div
                    key={ta.id}
                    className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3 hover:shadow-xs transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-md uppercase">
                            {ta.type}
                          </span>
                          <h4 className="font-bold text-slate-900 text-sm">{ta.name}</h4>
                        </div>
                        {(ta.date || ta.time) && (
                          <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            {formatDateDisplay(ta.date)} {ta.time ? `• ${ta.time}` : ""}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditActivity(ta)}
                          disabled={isReadOnly}
                          className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Edit2 className="h-3 w-3" /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTripActivity(ta.id, ta.name)}
                          disabled={isReadOnly}
                          className="p-1.5 rounded-md border border-slate-200 hover:bg-rose-50 text-rose-600 text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="h-3 w-3" /> Remove
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600 pt-1">
                      {ta.location && (
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Location</span>
                          <span className="text-slate-800 font-medium">{ta.location}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Participants</span>
                        <span className="text-slate-800 font-medium">{ta.numberOfParticipants} Pax</span>
                      </div>
                      {ta.adultPrice !== null && ta.adultPrice !== undefined && (
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Rate</span>
                          <span className="text-slate-800 font-medium">₹{Number(ta.adultPrice)} / pax</span>
                        </div>
                      )}
                      {ta.totalPrice !== null && ta.totalPrice !== undefined && (
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Tariff</span>
                          <strong className="text-slate-900 font-bold">₹{Number(ta.totalPrice)}</strong>
                        </div>
                      )}
                    </div>

                    {ta.description && (
                      <p className="text-xs text-slate-600 leading-relaxed pt-1">
                        {ta.description}
                      </p>
                    )}

                    {ta.notes && (
                      <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        {ta.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 7: COSTING */}
        {activeTab === "costing" && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4 max-w-4xl mx-auto">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3">
              Trip Costing & Margin Sheet
            </h3>
            <p className="text-xs text-slate-500">
              Financial calculation sheet, supplier costs, and agency profit margins for workspace ID: {trip.id}.
            </p>
          </div>
        )}

        {/* TAB 8: QUOTATIONS */}
        {activeTab === "quotation" && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4 max-w-4xl mx-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Quotations & Proposals ({tripQuotations.length})
              </h3>
            </div>
            {tripQuotations.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4">No quotation proposals generated yet.</p>
            ) : (
              <div className="space-y-2">
                {tripQuotations.map((q: any) => (
                  <div key={q.id} className="p-3 border border-slate-100 rounded-lg text-xs flex justify-between items-center">
                    <div>
                      <strong className="text-slate-900 block">{q.quotationNumber || q.name || `Quotation v${q.version}`}</strong>
                      <span className="text-slate-500">Version {q.version} • ₹{Number(q.finalAmount || q.pricingSummary?.finalPrice || 0).toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TRAVELER DIALOGS ─── */}
        <Dialog open={isAddTravelerOpen} onOpenChange={setIsAddTravelerOpen}>
          <DialogContent className="bg-white border border-slate-200 rounded-2xl max-w-md p-6 shadow-xl">
            <form onSubmit={handleSaveAddTraveler}>
              <DialogHeader>
                <DialogTitle className="text-slate-900 font-bold text-base">Add Traveler</DialogTitle>
                <DialogDescription className="text-slate-500 text-xs mt-1">
                  Add a new passenger to this trip manifest.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5 mt-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Traveler Name *</label>
                  <Input
                    value={travelerName}
                    onChange={(e) => setTravelerName(e.target.value)}
                    placeholder="e.g. Rahul Verma"
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Type</label>
                    <Select value={travelerType} onValueChange={(val) => val && setTravelerType(val as TravelerType)}>
                      <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        <SelectItem value="ADULT" className="text-xs">Adult (12y+)</SelectItem>
                        <SelectItem value="CHILD" className="text-xs">Child (&lt;12y)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Gender</label>
                    <Input
                      value={travelerGender}
                      onChange={(e) => setTravelerGender(e.target.value)}
                      placeholder="e.g. Male / Female"
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Phone</label>
                    <Input
                      value={travelerPhone}
                      onChange={(e) => setTravelerPhone(e.target.value)}
                      placeholder="+91..."
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Email</label>
                    <Input
                      type="email"
                      value={travelerEmail}
                      onChange={(e) => setTravelerEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
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
                  disabled={travelerSaving}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 rounded-xl"
                >
                  {travelerSaving ? "Saving..." : "Add Traveler"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditTravelerOpen} onOpenChange={setIsEditTravelerOpen}>
          <DialogContent className="bg-white border border-slate-200 rounded-2xl max-w-md p-6 shadow-xl">
            <form onSubmit={handleSaveEditTraveler}>
              <DialogHeader>
                <DialogTitle className="text-slate-900 font-bold text-base">Edit Traveler</DialogTitle>
              </DialogHeader>

              <div className="space-y-3.5 mt-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Traveler Name *</label>
                  <Input
                    value={travelerName}
                    onChange={(e) => setTravelerName(e.target.value)}
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Type</label>
                    <Select value={travelerType} onValueChange={(val) => val && setTravelerType(val as TravelerType)}>
                      <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        <SelectItem value="ADULT" className="text-xs">Adult (12y+)</SelectItem>
                        <SelectItem value="CHILD" className="text-xs">Child (&lt;12y)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Gender</label>
                    <Input
                      value={travelerGender}
                      onChange={(e) => setTravelerGender(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Phone</label>
                    <Input
                      value={travelerPhone}
                      onChange={(e) => setTravelerPhone(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Email</label>
                    <Input
                      type="email"
                      value={travelerEmail}
                      onChange={(e) => setTravelerEmail(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
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
                  disabled={travelerSaving}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 rounded-xl"
                >
                  {travelerSaving ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ─── ITINERARY DIALOGS ─── */}
        <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
          <DialogContent className="bg-white border border-slate-200 rounded-2xl max-w-lg p-6 shadow-xl">
            <form onSubmit={handleSaveAddItem}>
              <DialogHeader>
                <DialogTitle className="text-slate-900 font-bold text-base">Add Itinerary Day Item</DialogTitle>
              </DialogHeader>

              <div className="space-y-3.5 mt-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Day Number *</label>
                    <Input
                      type="number"
                      min={1}
                      value={itemDayNumber}
                      onChange={(e) => setItemDayNumber(parseInt(e.target.value) || 1)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Date</label>
                    <Input
                      type="date"
                      value={itemDate}
                      onChange={(e) => setItemDate(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Title / Heading *</label>
                  <Input
                    value={itemTitle}
                    onChange={(e) => setItemTitle(e.target.value)}
                    placeholder="e.g. Arrival in Cochin & Transfer to Munnar"
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Description / Details</label>
                  <Textarea
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                    placeholder="Describe transfers, stops, hotel check-in..."
                    rows={3}
                    className="bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Location</label>
                    <Input
                      value={itemLocation}
                      onChange={(e) => setItemLocation(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Start Time</label>
                    <Input
                      value={itemStartTime}
                      onChange={(e) => setItemStartTime(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">End Time</label>
                    <Input
                      value={itemEndTime}
                      onChange={(e) => setItemEndTime(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
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
                  disabled={itemSaving}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 rounded-xl"
                >
                  {itemSaving ? "Saving..." : "Add Itinerary Item"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditItemOpen} onOpenChange={setIsEditItemOpen}>
          <DialogContent className="bg-white border border-slate-200 rounded-2xl max-w-lg p-6 shadow-xl">
            <form onSubmit={handleSaveEditItem}>
              <DialogHeader>
                <DialogTitle className="text-slate-900 font-bold text-base">Edit Itinerary Day Item</DialogTitle>
              </DialogHeader>

              <div className="space-y-3.5 mt-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Day Number *</label>
                    <Input
                      type="number"
                      min={1}
                      value={itemDayNumber}
                      onChange={(e) => setItemDayNumber(parseInt(e.target.value) || 1)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Date</label>
                    <Input
                      type="date"
                      value={itemDate}
                      onChange={(e) => setItemDate(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Title / Heading *</label>
                  <Input
                    value={itemTitle}
                    onChange={(e) => setItemTitle(e.target.value)}
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Description / Details</label>
                  <Textarea
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                    rows={3}
                    className="bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Location</label>
                    <Input
                      value={itemLocation}
                      onChange={(e) => setItemLocation(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Start Time</label>
                    <Input
                      value={itemStartTime}
                      onChange={(e) => setItemStartTime(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">End Time</label>
                    <Input
                      value={itemEndTime}
                      onChange={(e) => setItemEndTime(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
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
                  disabled={itemSaving}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 rounded-xl"
                >
                  {itemSaving ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ─── TRIP HOTEL DIALOGS ─── */}
        <Dialog open={isAddHotelOpen} onOpenChange={setIsAddHotelOpen}>
          <DialogContent className="bg-white border border-slate-200 rounded-2xl max-w-lg p-6 shadow-xl">
            <form onSubmit={handleSaveAddHotel}>
              <DialogHeader>
                <DialogTitle className="text-slate-900 font-bold text-base">Attach Hotel to Trip</DialogTitle>
                <DialogDescription className="text-slate-500 text-xs mt-1">
                  Select a property from your agency inventory and configure reservation dates.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5 mt-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Select Hotel Property *</label>
                  <Select value={hotelFormHotelId} onValueChange={(val) => val && setHotelFormHotelId(val)}>
                    <SelectTrigger className="h-9 bg-slate-50/50 border-slate-200 text-xs">
                      <SelectValue placeholder="Choose hotel...">
                        {(val: string | null) => {
                          if (!val) return undefined;
                          const h = masterHotels.find((item) => item.id === val);
                          return h ? `${h.name} ${h.city ? `(${h.city})` : ""}` : val;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      {masterHotels.map((h) => (
                        <SelectItem key={h.id} value={h.id} className="text-xs">
                          {h.name} {h.city ? `(${h.city})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Check-in Date *</label>
                    <Input
                      type="date"
                      value={hotelFormCheckIn}
                      onChange={(e) => setHotelFormCheckIn(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Check-out Date *</label>
                    <Input
                      type="date"
                      value={hotelFormCheckOut}
                      onChange={(e) => setHotelFormCheckOut(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Room Category</label>
                    <Input
                      value={hotelFormRoomType}
                      onChange={(e) => setHotelFormRoomType(e.target.value)}
                      placeholder="Deluxe Room"
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Number of Rooms</label>
                    <Input
                      type="number"
                      min={1}
                      value={hotelFormRooms}
                      onChange={(e) => setHotelFormRooms(parseInt(e.target.value) || 1)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Meal Plan</label>
                    <Input
                      value={hotelFormMealPlan}
                      onChange={(e) => setHotelFormMealPlan(e.target.value)}
                      placeholder="CP / MAP / AP"
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Nightly Rate (₹)</label>
                    <Input
                      type="number"
                      value={hotelFormNightlyRate}
                      onChange={(e) => setHotelFormNightlyRate(e.target.value)}
                      placeholder="3500"
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Total Tariff (₹)</label>
                    <Input
                      type="number"
                      value={hotelFormTotalAmount}
                      onChange={(e) => setHotelFormTotalAmount(e.target.value)}
                      placeholder="7000"
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Special Inclusions / Notes</label>
                  <Textarea
                    value={hotelFormNotes}
                    onChange={(e) => setHotelFormNotes(e.target.value)}
                    placeholder="Extra bed, honeymoon inclusions, breakfast timings..."
                    rows={2}
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
                  disabled={hotelSaving}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 rounded-xl"
                >
                  {hotelSaving ? "Attaching..." : "Attach Hotel"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditHotelOpen} onOpenChange={setIsEditHotelOpen}>
          <DialogContent className="bg-white border border-slate-200 rounded-2xl max-w-lg p-6 shadow-xl">
            <form onSubmit={handleSaveEditHotel}>
              <DialogHeader>
                <DialogTitle className="text-slate-900 font-bold text-base">Edit Hotel Reservation</DialogTitle>
              </DialogHeader>

              <div className="space-y-3.5 mt-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Check-in Date *</label>
                    <Input
                      type="date"
                      value={hotelFormCheckIn}
                      onChange={(e) => setHotelFormCheckIn(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Check-out Date *</label>
                    <Input
                      type="date"
                      value={hotelFormCheckOut}
                      onChange={(e) => setHotelFormCheckOut(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Room Category</label>
                    <Input
                      value={hotelFormRoomType}
                      onChange={(e) => setHotelFormRoomType(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Number of Rooms</label>
                    <Input
                      type="number"
                      min={1}
                      value={hotelFormRooms}
                      onChange={(e) => setHotelFormRooms(parseInt(e.target.value) || 1)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Meal Plan</label>
                    <Input
                      value={hotelFormMealPlan}
                      onChange={(e) => setHotelFormMealPlan(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Nightly Rate (₹)</label>
                    <Input
                      type="number"
                      value={hotelFormNightlyRate}
                      onChange={(e) => setHotelFormNightlyRate(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Total Tariff (₹)</label>
                    <Input
                      type="number"
                      value={hotelFormTotalAmount}
                      onChange={(e) => setHotelFormTotalAmount(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Notes</label>
                  <Textarea
                    value={hotelFormNotes}
                    onChange={(e) => setHotelFormNotes(e.target.value)}
                    rows={2}
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
                  disabled={hotelSaving}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 rounded-xl"
                >
                  {hotelSaving ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ─── TRIP VEHICLE DIALOGS ─── */}
        <Dialog open={isAddVehicleOpen} onOpenChange={setIsAddVehicleOpen}>
          <DialogContent className="bg-white border border-slate-200 rounded-2xl max-w-lg p-6 shadow-xl">
            <form onSubmit={handleSaveAddVehicle}>
              <DialogHeader>
                <DialogTitle className="text-slate-900 font-bold text-base">Assign Vehicle to Trip</DialogTitle>
                <DialogDescription className="text-slate-500 text-xs mt-1">
                  Select a fleet model or enter transport transfer details.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5 mt-4 text-xs">
                {masterVehicles.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Pre-fill from Agency Fleet</label>
                    <Select value={vehicleFormVehicleId} onValueChange={(val) => handleSelectMasterVehicle(val)}>
                      <SelectTrigger className="h-9 bg-slate-50/50 border-slate-200 text-xs">
                        <SelectValue placeholder="Choose vehicle model...">
                          {(val: string | null) => {
                            if (!val) return undefined;
                            const v = masterVehicles.find((item) => item.id === val);
                            return v ? `${v.name} (${v.type} • ${v.capacity} Seats)` : val;
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        {masterVehicles.map((v) => (
                          <SelectItem key={v.id} value={v.id} className="text-xs">
                            {v.name} ({v.type} • {v.capacity} Seats)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Vehicle Name *</label>
                    <Input
                      value={vehicleFormName}
                      onChange={(e) => setVehicleFormName(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Vehicle Type *</label>
                    <Input
                      value={vehicleFormType}
                      onChange={(e) => setVehicleFormType(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Start Date</label>
                    <Input
                      type="date"
                      value={vehicleFormStartDate}
                      onChange={(e) => setVehicleFormStartDate(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">End Date</label>
                    <Input
                      type="date"
                      value={vehicleFormEndDate}
                      onChange={(e) => setVehicleFormEndDate(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Pickup Location</label>
                    <Input
                      value={vehicleFormPickup}
                      onChange={(e) => setVehicleFormPickup(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Drop Location</label>
                    <Input
                      value={vehicleFormDrop}
                      onChange={(e) => setVehicleFormDrop(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Driver Name</label>
                    <Input
                      value={vehicleFormDriverName}
                      onChange={(e) => setVehicleFormDriverName(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Driver Phone</label>
                    <Input
                      value={vehicleFormDriverPhone}
                      onChange={(e) => setVehicleFormDriverPhone(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Rate/KM (₹)</label>
                    <Input
                      type="number"
                      value={vehicleFormRatePerKm}
                      onChange={(e) => setVehicleFormRatePerKm(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Est. KM</label>
                    <Input
                      type="number"
                      value={vehicleFormEstimatedKm}
                      onChange={(e) => setVehicleFormEstimatedKm(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Total Rate (₹)</label>
                    <Input
                      type="number"
                      value={vehicleFormTotalRate}
                      onChange={(e) => setVehicleFormTotalRate(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
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
                  disabled={vehicleSaving}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 rounded-xl"
                >
                  {vehicleSaving ? "Assigning..." : "Assign Vehicle"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditVehicleOpen} onOpenChange={setIsEditVehicleOpen}>
          <DialogContent className="bg-white border border-slate-200 rounded-2xl max-w-lg p-6 shadow-xl">
            <form onSubmit={handleSaveEditVehicle}>
              <DialogHeader>
                <DialogTitle className="text-slate-900 font-bold text-base">Edit Vehicle Assignment</DialogTitle>
              </DialogHeader>

              <div className="space-y-3.5 mt-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Vehicle Name *</label>
                    <Input
                      value={vehicleFormName}
                      onChange={(e) => setVehicleFormName(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Vehicle Type *</label>
                    <Input
                      value={vehicleFormType}
                      onChange={(e) => setVehicleFormType(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Pickup Location</label>
                    <Input
                      value={vehicleFormPickup}
                      onChange={(e) => setVehicleFormPickup(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Drop Location</label>
                    <Input
                      value={vehicleFormDrop}
                      onChange={(e) => setVehicleFormDrop(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Driver Name</label>
                    <Input
                      value={vehicleFormDriverName}
                      onChange={(e) => setVehicleFormDriverName(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Total Tariff (₹)</label>
                    <Input
                      type="number"
                      value={vehicleFormTotalRate}
                      onChange={(e) => setVehicleFormTotalRate(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
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
                  disabled={vehicleSaving}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 rounded-xl"
                >
                  {vehicleSaving ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ─── TRIP ACTIVITY DIALOGS ─── */}
        <Dialog open={isAddActivityOpen} onOpenChange={setIsAddActivityOpen}>
          <DialogContent className="bg-white border border-slate-200 rounded-2xl max-w-lg p-6 shadow-xl">
            <form onSubmit={handleSaveAddActivity}>
              <DialogHeader>
                <DialogTitle className="text-slate-900 font-bold text-base">Assign Activity to Trip</DialogTitle>
                <DialogDescription className="text-slate-500 text-xs mt-1">
                  Select an excursion or entry pass from inventory.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5 mt-4 text-xs">
                {masterActivities.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Pre-fill from Inventory</label>
                    <Select value={activityFormActivityId} onValueChange={(val) => handleSelectMasterActivity(val)}>
                      <SelectTrigger className="h-9 bg-slate-50/50 border-slate-200 text-xs">
                        <SelectValue placeholder="Choose activity...">
                          {(val: string | null) => {
                            if (!val) return undefined;
                            const a = masterActivities.find((item) => item.id === val);
                            return a ? `${a.name} (${a.type})` : val;
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        {masterActivities.map((a) => (
                          <SelectItem key={a.id} value={a.id} className="text-xs">
                            {a.name} ({a.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Activity Name *</label>
                  <Input
                    value={activityFormName}
                    onChange={(e) => setActivityFormName(e.target.value)}
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Scheduled Date</label>
                    <Input
                      type="date"
                      value={activityFormDate}
                      onChange={(e) => setActivityFormDate(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Timing / Slot</label>
                    <Input
                      value={activityFormTime}
                      onChange={(e) => setActivityFormTime(e.target.value)}
                      placeholder="09:00 AM"
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Location</label>
                    <Input
                      value={activityFormLocation}
                      onChange={(e) => setActivityFormLocation(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Participants (Pax)</label>
                    <Input
                      type="number"
                      min={1}
                      value={activityFormParticipants}
                      onChange={(e) => setActivityFormParticipants(parseInt(e.target.value) || 1)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Adult Price (₹)</label>
                    <Input
                      type="number"
                      value={activityFormAdultPrice}
                      onChange={(e) => setActivityFormAdultPrice(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Total Tariff (₹)</label>
                    <Input
                      type="number"
                      value={activityFormTotalPrice}
                      onChange={(e) => setActivityFormTotalPrice(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
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
                  disabled={activitySaving}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 rounded-xl"
                >
                  {activitySaving ? "Assigning..." : "Assign Activity"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditActivityOpen} onOpenChange={setIsEditActivityOpen}>
          <DialogContent className="bg-white border border-slate-200 rounded-2xl max-w-lg p-6 shadow-xl">
            <form onSubmit={handleSaveEditActivity}>
              <DialogHeader>
                <DialogTitle className="text-slate-900 font-bold text-base">Edit Activity Assignment</DialogTitle>
              </DialogHeader>

              <div className="space-y-3.5 mt-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Activity Name *</label>
                  <Input
                    value={activityFormName}
                    onChange={(e) => setActivityFormName(e.target.value)}
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Scheduled Date</label>
                    <Input
                      type="date"
                      value={activityFormDate}
                      onChange={(e) => setActivityFormDate(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Total Tariff (₹)</label>
                    <Input
                      type="number"
                      value={activityFormTotalPrice}
                      onChange={(e) => setActivityFormTotalPrice(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
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
                  disabled={activitySaving}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 rounded-xl"
                >
                  {activitySaving ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ─── EDIT TRIP MODAL ─── */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="bg-white border border-slate-200 rounded-2xl max-w-lg p-6 shadow-xl">
            <form onSubmit={editTripFormik.handleSubmit}>
              <DialogHeader>
                <DialogTitle className="text-slate-900 font-bold text-base">Edit Trip Workspace</DialogTitle>
                <DialogDescription className="text-slate-500 text-xs mt-1">
                  Update itinerary title, dates, and stage.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5 mt-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Trip Title *</label>
                  <Input
                    {...editTripFormik.getFieldProps("title")}
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Start Date</label>
                    <Input
                      type="date"
                      {...editTripFormik.getFieldProps("startDate")}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">End Date</label>
                    <Input
                      type="date"
                      {...editTripFormik.getFieldProps("endDate")}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Status</label>
                  <Select
                    value={editTripFormik.values.status}
                    onValueChange={(val) => val && editTripFormik.setFieldValue("status", val)}
                  >
                    <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value={TripStatus.DRAFT} className="text-xs">Draft</SelectItem>
                      <SelectItem value={TripStatus.PLANNING} className="text-xs">Planning</SelectItem>
                      <SelectItem value={TripStatus.QUOTED} className="text-xs">Quoted</SelectItem>
                      <SelectItem value={TripStatus.BOOKED} className="text-xs">Booked</SelectItem>
                      <SelectItem value={TripStatus.ONGOING} className="text-xs">Ongoing</SelectItem>
                      <SelectItem value={TripStatus.COMPLETED} className="text-xs">Completed</SelectItem>
                      <SelectItem value={TripStatus.CANCELLED} className="text-xs">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Planning Notes</label>
                  <Textarea
                    {...editTripFormik.getFieldProps("notes")}
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
                  disabled={editSaving}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 rounded-xl"
                >
                  {editSaving ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
