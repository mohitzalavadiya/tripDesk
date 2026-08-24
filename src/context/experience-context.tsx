"use client";

import * as React from "react";
import {
  CustomerFeedback,
  PublicReview,
  Referral,
  CustomerReward,
  CustomerPreference,
  CustomerLifecycleStatus,
  CustomerCommunicationRecord,
  CustomerEvent,
  AgencyReviewSettings,
  LoyaltyInfo,
  LoyaltyTier,
} from "@/types";
import { useEnquiry } from "@/context/enquiry-context";
import { useBooking } from "@/context/booking-context";

// Initial Demo Review Settings
const initialReviewSettings: AgencyReviewSettings = {
  googleReviewUrl: "https://g.page/r/tripdesk-holidays/review",
  tripAdvisorUrl: "https://www.tripadvisor.com/UserReview-tripdesk-holidays",
  reviewInvitationMessage:
    "We are thrilled you had a fantastic trip! Could you take a moment to share your review on Google?",
  referralRewardAmount: 500,
  referralFriendDiscount: 500,
  referralMinBookingAmount: 10000,
};

// Initial Demo Feedbacks
const initialFeedbacks: CustomerFeedback[] = [
  {
    id: "fb-1",
    tripId: "trip-kerala-001",
    tripTitle: "Kerala Family Holiday Experience",
    bookingId: "bk-1",
    bookingNumber: "BK-2026-0001",
    customerId: "cust-1",
    customerName: "Amit Sharma",
    overallRating: 5,
    hotelRating: 5,
    vehicleRating: 5,
    driverRating: 5,
    activityRating: 5,
    supportRating: 5,
    positiveComment:
      "The Munnar tea gardens, houseboat stay in Alleppey, and our dedicated chauffeur Rajesh Kumar were absolutely exceptional!",
    improvementComment: "Everything was perfectly arranged. Keep it up!",
    travelAgain: "Yes",
    serviceRecoveryStatus: "Not Needed",
    createdAt: "2026-08-20T14:30:00Z",
  },
  {
    id: "fb-2",
    tripId: "trip-rajasthan-002",
    tripTitle: "Royal Rajasthan Heritage & Desert Safari",
    bookingId: "bk-2",
    bookingNumber: "BK-2026-0002",
    customerId: "cust-2",
    customerName: "Priya Patel",
    overallRating: 4,
    hotelRating: 4,
    vehicleRating: 4,
    driverRating: 4,
    activityRating: 5,
    supportRating: 5,
    positiveComment: "The Udaipur Lake Palace views and Sam Sand Dunes desert camping were magical.",
    improvementComment: "Driver arrived 20 minutes late on Day 2 due to Jaipur highway traffic.",
    travelAgain: "Yes",
    serviceRecoveryStatus: "Not Needed",
    createdAt: "2026-08-18T11:15:00Z",
  },
  {
    id: "fb-3",
    tripId: "trip-golden-003",
    tripTitle: "Golden Triangle Cultural Exploration",
    bookingId: "bk-3",
    bookingNumber: "BK-2026-0003",
    customerId: "cust-3",
    customerName: "Vikram Singh",
    overallRating: 2,
    hotelRating: 2,
    vehicleRating: 3,
    driverRating: 3,
    activityRating: 3,
    supportRating: 3,
    positiveComment: "Taj Mahal visit was well coordinated.",
    improvementComment:
      "The hotel room in Jaipur was noisy and check-in was delayed by 45 minutes. Expected a better hotel category.",
    travelAgain: "Maybe",
    serviceRecoveryStatus: "Follow-up Required",
    serviceRecoveryNotes:
      "Guest reported dissatisfaction with Jaipur hotel room noise and check-in delay. Senior relationship manager assigned to offer ₹2,000 goodwill credit on next tour.",
    createdAt: "2026-08-15T09:40:00Z",
  },
];

// Initial Demo Public Reviews
const initialPublicReviews: PublicReview[] = [
  {
    id: "rev-1",
    feedbackId: "fb-1",
    customerId: "cust-1",
    customerName: "Amit Sharma",
    tripId: "trip-kerala-001",
    tripTitle: "Kerala Family Holiday",
    rating: 5,
    comment:
      "Booked our 8-day Kerala family vacation with TripDesk. Flawless execution from airport pickup to houseboat. Driver Rajesh was very polite and punctual.",
    platform: "Google",
    isPublished: true,
    createdAt: "2026-08-21T10:00:00Z",
  },
  {
    id: "rev-2",
    customerId: "cust-2",
    customerName: "Priya Patel",
    tripTitle: "Rajasthan Tour",
    rating: 5,
    comment:
      "TripDesk created an unforgettable customized Rajasthan itinerary for my parents. Great heritage hotels and fast support desk.",
    platform: "TripAdvisor",
    isPublished: true,
    createdAt: "2026-08-19T16:20:00Z",
  },
  {
    id: "rev-3",
    customerId: "cust-4",
    customerName: "Neha Verma",
    tripTitle: "Goa Beach Retreat",
    rating: 5,
    comment:
      "Best travel agency platform! Loved the live travel portal with driver contact and daily itinerary right on mobile.",
    platform: "Google",
    isPublished: true,
    createdAt: "2026-08-10T12:00:00Z",
  },
];

// Initial Demo Referrals
const initialReferrals: Referral[] = [
  {
    id: "ref-1",
    referrerCustomerId: "cust-1",
    referrerName: "Amit Sharma",
    referrerPhone: "+91 98470 12345",
    referredCustomerId: "cust-5",
    referredName: "Rohan Gupta",
    referredPhone: "+91 98765 43210",
    referralCode: "TRIP-AMIT500",
    status: "Completed",
    bookingId: "bk-5",
    bookingNumber: "BK-2026-0005",
    tripValue: 68000,
    rewardAmount: 500,
    friendDiscount: 500,
    notes: "Referred for Himachal Summer Tour",
    createdAt: "2026-07-15T10:00:00Z",
    updatedAt: "2026-08-10T12:00:00Z",
  },
  {
    id: "ref-2",
    referrerCustomerId: "cust-1",
    referrerName: "Amit Sharma",
    referrerPhone: "+91 98470 12345",
    referredCustomerId: "cust-6",
    referredName: "Suresh Nair",
    referredPhone: "+91 91234 56780",
    referralCode: "TRIP-AMIT500",
    status: "Booked",
    bookingId: "bk-6",
    bookingNumber: "BK-2026-0006",
    tripValue: 52000,
    rewardAmount: 500,
    friendDiscount: 500,
    notes: "Referred for Wayanad Weekend",
    createdAt: "2026-08-01T14:30:00Z",
    updatedAt: "2026-08-18T10:00:00Z",
  },
  {
    id: "ref-3",
    referrerCustomerId: "cust-2",
    referrerName: "Priya Patel",
    referrerPhone: "+91 98250 99887",
    referredName: "Ananya Joshi",
    referredPhone: "+91 94000 11223",
    referralCode: "TRIP-PRIYA500",
    status: "Inquiry",
    rewardAmount: 500,
    friendDiscount: 500,
    notes: "Shared referral code for Kashmir Honeymoon package",
    createdAt: "2026-08-12T09:00:00Z",
    updatedAt: "2026-08-12T09:00:00Z",
  },
];

// Initial Demo Rewards
const initialRewards: CustomerReward[] = [
  {
    id: "rew-1",
    customerId: "cust-1",
    type: "Travel Credit",
    amount: 500,
    status: "Available",
    description: "Referral Reward from Rohan Gupta (BK-2026-0005)",
    source: "Referral",
    bookingId: "bk-5",
    createdAt: "2026-08-10T12:00:00Z",
  },
  {
    id: "rew-2",
    customerId: "cust-1",
    type: "Travel Credit",
    amount: 500,
    status: "Available",
    description: "Welcome Loyalty Credit for Phase 9 Member",
    source: "Booking Milestone",
    createdAt: "2026-08-01T00:00:00Z",
  },
  {
    id: "rew-3",
    customerId: "cust-2",
    type: "Travel Credit",
    amount: 500,
    status: "Available",
    description: "Loyalty Tier Gold Bonus",
    source: "Booking Milestone",
    createdAt: "2026-08-18T12:00:00Z",
  },
];

// Initial Demo Customer Preferences
const initialPreferences: Record<string, CustomerPreference> = {
  "cust-1": {
    id: "pref-1",
    customerId: "cust-1",
    preferredDestinations: ["Kerala", "Goa", "Kashmir"],
    travelStyle: "Family",
    preferredHotelCategory: "4 Star",
    preferredMealPlan: "CP",
    preferredVehicle: "Force Urbania",
    preferredActivities: ["Nature & Wildlife", "Sightseeing", "Beaches"],
    typicalGroupSize: "4 Adults + 1 Child",
    mealPreference: "Vegetarian",
    budgetRange: "₹60,000 - ₹1,00,000",
    notes: "Always prefers private air-conditioned transport and beach resort rooms.",
    updatedAt: "2026-08-20T10:00:00Z",
  },
  "cust-2": {
    id: "pref-2",
    customerId: "cust-2",
    preferredDestinations: ["Rajasthan", "Himachal Pradesh", "Andaman"],
    travelStyle: "Luxury",
    preferredHotelCategory: "5 Star",
    preferredMealPlan: "MAP",
    preferredVehicle: "Innova Crysta",
    preferredActivities: ["Heritage & Temples", "Culinary", "Sightseeing"],
    typicalGroupSize: "2 Adults",
    mealPreference: "Non-Vegetarian",
    budgetRange: "₹1,00,000 - ₹2,00,000",
    notes: "Enjoys boutique heritage properties and palace hotels.",
    updatedAt: "2026-08-18T10:00:00Z",
  },
};

// Initial Demo Communication Records
const initialCommunications: CustomerCommunicationRecord[] = [
  {
    id: "comm-1",
    customerId: "cust-1",
    tripId: "trip-kerala-001",
    type: "Booking Confirmation",
    channel: "WhatsApp",
    summary: "Sent finalized travel vouchers & confirmed booking confirmation BK-2026-0001.",
    date: "2026-08-15 11:30 AM",
    agentName: "Mohit (Operations Lead)",
  },
  {
    id: "comm-2",
    customerId: "cust-1",
    tripId: "trip-kerala-001",
    type: "Pickup Details",
    channel: "WhatsApp",
    summary: "Shared chauffeur Rajesh Kumar contact details and Cochin airport pickup schedule.",
    date: "2026-08-16 04:15 PM",
    agentName: "Mohit (Operations Lead)",
  },
  {
    id: "comm-3",
    customerId: "cust-1",
    tripId: "trip-kerala-001",
    type: "Feedback Request",
    channel: "WhatsApp",
    summary: "Sent post-trip feedback request and link upon trip completion.",
    date: "2026-08-20 02:00 PM",
    agentName: "Kishan (Support Desk)",
  },
  {
    id: "comm-4",
    customerId: "cust-1",
    type: "Review Invitation",
    channel: "WhatsApp",
    summary: "Invited guest to leave a 5-star review on Google after glowing feedback.",
    date: "2026-08-21 10:30 AM",
    agentName: "Kishan (Support Desk)",
  },
];

// Initial Customer Events
const initialEvents: CustomerEvent[] = [
  {
    id: "evt-1",
    customerId: "cust-1",
    type: "Birthday",
    date: "12 September",
    notes: "Send special holiday discount voucher on birthday.",
  },
  {
    id: "evt-2",
    customerId: "cust-1",
    type: "Anniversary",
    date: "24 November",
    notes: "Celebrate 10th wedding anniversary in Goa.",
  },
  {
    id: "evt-3",
    customerId: "cust-2",
    type: "Birthday",
    date: "05 October",
    notes: "VIP guest birthday reminder.",
  },
];

// Initial Customer Lifecycle Status
const initialLifecycles: Record<string, CustomerLifecycleStatus> = {
  "cust-1": "Repeat Customer",
  "cust-2": "Completed",
  "cust-3": "New Customer",
};

interface Customer360Data {
  totalTrips: number;
  completedTrips: number;
  upcomingTrips: number;
  activeTrips: number;
  lifetimeValue: number;
  averageTripValue: number;
  averageRating: number;
  referralCount: number;
  totalRewardsEarned: number;
  availableRewards: number;
  loyalty: LoyaltyInfo;
  lifecycleStatus: CustomerLifecycleStatus;
  preferences?: CustomerPreference;
  events: CustomerEvent[];
  communications: CustomerCommunicationRecord[];
  feedbacks: CustomerFeedback[];
  reviews: PublicReview[];
  referrals: Referral[];
  rewards: CustomerReward[];
}

interface ExperienceContextType {
  feedbacks: CustomerFeedback[];
  reviews: PublicReview[];
  referrals: Referral[];
  rewards: CustomerReward[];
  preferences: Record<string, CustomerPreference>;
  lifecycles: Record<string, CustomerLifecycleStatus>;
  communications: CustomerCommunicationRecord[];
  events: CustomerEvent[];
  reviewSettings: AgencyReviewSettings;

  // Actions
  submitCustomerFeedback: (
    data: Omit<CustomerFeedback, "id" | "createdAt" | "serviceRecoveryStatus">
  ) => CustomerFeedback;
  updateServiceRecovery: (
    feedbackId: string,
    status: CustomerFeedback["serviceRecoveryStatus"],
    notes?: string
  ) => void;
  createPublicReview: (
    data: Omit<PublicReview, "id" | "createdAt" | "isPublished">
  ) => PublicReview;
  createReferralCode: (customerId: string, customCode?: string) => string;
  trackReferral: (
    referrerCustomerId: string,
    referredName: string,
    referredPhone: string,
    notes?: string
  ) => Referral;
  updateReferralStatus: (
    referralId: string,
    status: Referral["status"],
    bookingId?: string,
    bookingNumber?: string,
    tripValue?: number
  ) => void;
  addCustomerReward: (
    customerId: string,
    amount: number,
    type: CustomerReward["type"],
    description: string,
    source: CustomerReward["source"],
    bookingId?: string
  ) => CustomerReward;
  redeemCustomerReward: (rewardId: string, bookingId?: string) => void;
  updateCustomerPreferences: (
    customerId: string,
    pref: Partial<CustomerPreference>
  ) => CustomerPreference;
  updateCustomerLifecycle: (
    customerId: string,
    status: CustomerLifecycleStatus
  ) => void;
  addCustomerEvent: (
    customerId: string,
    type: CustomerEvent["type"],
    date: string,
    notes?: string
  ) => CustomerEvent;
  deleteCustomerEvent: (eventId: string) => void;
  addCommunicationLog: (
    customerId: string,
    type: CustomerCommunicationRecord["type"],
    channel: CustomerCommunicationRecord["channel"],
    summary: string,
    tripId?: string,
    agentName?: string
  ) => CustomerCommunicationRecord;
  updateReviewSettings: (settings: Partial<AgencyReviewSettings>) => void;

  // Aggregation queries
  getCustomer360: (customerId: string) => Customer360Data;
  getFeedbackStats: () => {
    averageRating: number;
    totalFeedback: number;
    positiveCount: number;
    needsAttentionCount: number;
    starCounts: Record<number, number>;
    categoryAverages: {
      hotels: number;
      vehicles: number;
      drivers: number;
      activities: number;
      support: number;
    };
  };
  getReferralStats: () => {
    totalReferrals: number;
    convertedCount: number;
    conversionRate: number;
    totalRevenue: number;
    totalRewardsPaid: number;
  };
  getSupplierPerformanceMetrics: () => {
    drivers: Array<{ name: string; trips: number; averageRating: number; complaints: number }>;
    hotels: Array<{ name: string; bookings: number; averageRating: number; complaints: number }>;
  };
}

const ExperienceContext = React.createContext<ExperienceContextType | undefined>(
  undefined
);

export function ExperienceProvider({ children }: { children: React.ReactNode }) {
  const { customers, trips } = useEnquiry();
  const { bookings } = useBooking();

  const [feedbacks, setFeedbacks] = React.useState<CustomerFeedback[]>(initialFeedbacks);
  const [reviews, setReviews] = React.useState<PublicReview[]>(initialPublicReviews);
  const [referrals, setReferrals] = React.useState<Referral[]>(initialReferrals);
  const [rewards, setRewards] = React.useState<CustomerReward[]>(initialRewards);
  const [preferences, setPreferences] = React.useState<Record<string, CustomerPreference>>(
    initialPreferences
  );
  const [lifecycles, setLifecycles] = React.useState<Record<string, CustomerLifecycleStatus>>(
    initialLifecycles
  );
  const [communications, setCommunications] = React.useState<CustomerCommunicationRecord[]>(
    initialCommunications
  );
  const [events, setEvents] = React.useState<CustomerEvent[]>(initialEvents);
  const [reviewSettings, setReviewSettings] = React.useState<AgencyReviewSettings>(
    initialReviewSettings
  );

  // Submit Feedback from Customer
  const submitCustomerFeedback = React.useCallback(
    (data: Omit<CustomerFeedback, "id" | "createdAt" | "serviceRecoveryStatus">) => {
      // Check if feedback already exists for this trip
      const existing = feedbacks.find((f) => f.tripId === data.tripId);
      if (existing) {
        return existing;
      }

      const needsRecovery = data.overallRating <= 3;
      const newFeedback: CustomerFeedback = {
        ...data,
        id: `fb-${Date.now()}`,
        serviceRecoveryStatus: needsRecovery ? "Follow-up Required" : "Not Needed",
        createdAt: new Date().toISOString(),
      };

      setFeedbacks((prev) => [newFeedback, ...prev]);

      // If rating is 5 or 4, also create a draft internal review
      if (data.overallRating >= 4) {
        const newReview: PublicReview = {
          id: `rev-${Date.now()}`,
          feedbackId: newFeedback.id,
          customerId: data.customerId,
          customerName: data.customerName,
          tripId: data.tripId,
          tripTitle: data.tripTitle,
          rating: data.overallRating,
          comment: data.positiveComment || "Had a wonderful trip experience with TripDesk!",
          platform: "Google",
          isPublished: true,
          createdAt: new Date().toISOString(),
        };
        setReviews((prev) => [newReview, ...prev]);
      }

      return newFeedback;
    },
    [feedbacks]
  );

  // Update Service Recovery status
  const updateServiceRecovery = React.useCallback(
    (
      feedbackId: string,
      status: CustomerFeedback["serviceRecoveryStatus"],
      notes?: string
    ) => {
      setFeedbacks((prev) =>
        prev.map((f) =>
          f.id === feedbackId
            ? {
                ...f,
                serviceRecoveryStatus: status,
                serviceRecoveryNotes: notes || f.serviceRecoveryNotes,
              }
            : f
        )
      );
    },
    []
  );

  // Create Public Review
  const createPublicReview = React.useCallback(
    (data: Omit<PublicReview, "id" | "createdAt" | "isPublished">) => {
      const newReview: PublicReview = {
        ...data,
        id: `rev-${Date.now()}`,
        isPublished: true,
        createdAt: new Date().toISOString(),
      };
      setReviews((prev) => [newReview, ...prev]);
      return newReview;
    },
    []
  );

  // Create Referral Code
  const createReferralCode = React.useCallback(
    (customerId: string, customCode?: string) => {
      if (customCode && customCode.trim()) {
        return customCode.trim().toUpperCase();
      }
      const customer = customers.find((c) => c.id === customerId);
      const namePart = (customer?.name || "TRIP").replace(/[^a-zA-Z]/g, "").slice(0, 5).toUpperCase();
      return `TRIP-${namePart || "VIP"}500`;
    },
    [customers]
  );

  // Track New Referral
  const trackReferral = React.useCallback(
    (
      referrerCustomerId: string,
      referredName: string,
      referredPhone: string,
      notes?: string
    ) => {
      const referrer = customers.find((c) => c.id === referrerCustomerId);
      const referralCode = createReferralCode(referrerCustomerId);

      const newRef: Referral = {
        id: `ref-${Date.now()}`,
        referrerCustomerId,
        referrerName: referrer?.name || "Customer",
        referrerPhone: referrer?.phone || "",
        referredName: referredName.trim(),
        referredPhone: referredPhone.trim(),
        referralCode,
        status: "Shared",
        rewardAmount: reviewSettings.referralRewardAmount,
        friendDiscount: reviewSettings.referralFriendDiscount,
        notes: notes?.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setReferrals((prev) => [newRef, ...prev]);
      return newRef;
    },
    [customers, createReferralCode, reviewSettings]
  );

  // Update Referral Status
  const updateReferralStatus = React.useCallback(
    (
      referralId: string,
      status: Referral["status"],
      bookingId?: string,
      bookingNumber?: string,
      tripValue?: number
    ) => {
      setReferrals((prev) =>
        prev.map((r) => {
          if (r.id !== referralId) return r;
          const updated: Referral = {
            ...r,
            status,
            bookingId: bookingId || r.bookingId,
            bookingNumber: bookingNumber || r.bookingNumber,
            tripValue: tripValue !== undefined ? tripValue : r.tripValue,
            updatedAt: new Date().toISOString(),
          };

          // If Completed or Rewarded, automatically disburse reward to referrer
          if (status === "Completed" || status === "Rewarded") {
            // check if reward already exists
            const existingReward = rewards.find((rew) => rew.bookingId === bookingId && rew.customerId === r.referrerCustomerId);
            if (!existingReward && r.rewardAmount > 0) {
              const newReward: CustomerReward = {
                id: `rew-${Date.now()}`,
                customerId: r.referrerCustomerId,
                type: "Referral Reward",
                amount: r.rewardAmount,
                status: "Available",
                description: `Referral Reward for ${r.referredName} (${bookingNumber || "Booking"})`,
                source: "Referral",
                bookingId: bookingId,
                createdAt: new Date().toISOString(),
              };
              setRewards((rPrev) => [newReward, ...rPrev]);
            }
          }

          return updated;
        })
      );
    },
    [rewards]
  );

  // Add Customer Reward
  const addCustomerReward = React.useCallback(
    (
      customerId: string,
      amount: number,
      type: CustomerReward["type"],
      description: string,
      source: CustomerReward["source"],
      bookingId?: string
    ) => {
      const newReward: CustomerReward = {
        id: `rew-${Date.now()}`,
        customerId,
        type,
        amount,
        status: "Available",
        description: description.trim(),
        source,
        bookingId,
        createdAt: new Date().toISOString(),
      };
      setRewards((prev) => [newReward, ...prev]);
      return newReward;
    },
    []
  );

  // Redeem Customer Reward
  const redeemCustomerReward = React.useCallback(
    (rewardId: string, bookingId?: string) => {
      setRewards((prev) =>
        prev.map((rew) =>
          rew.id === rewardId
            ? { ...rew, status: "Redeemed", bookingId: bookingId || rew.bookingId }
            : rew
        )
      );
    },
    []
  );

  // Update Customer Preferences
  const updateCustomerPreferences = React.useCallback(
    (customerId: string, pref: Partial<CustomerPreference>) => {
      const existing = preferences[customerId] || {
        id: `pref-${Date.now()}`,
        customerId,
        preferredDestinations: [],
        updatedAt: new Date().toISOString(),
      };

      const updated: CustomerPreference = {
        ...existing,
        ...pref,
        customerId,
        updatedAt: new Date().toISOString(),
      };

      setPreferences((prev) => ({ ...prev, [customerId]: updated }));
      return updated;
    },
    [preferences]
  );

  // Update Lifecycle Status
  const updateCustomerLifecycle = React.useCallback(
    (customerId: string, status: CustomerLifecycleStatus) => {
      setLifecycles((prev) => ({ ...prev, [customerId]: status }));
    },
    []
  );

  // Add Event
  const addCustomerEvent = React.useCallback(
    (customerId: string, type: CustomerEvent["type"], date: string, notes?: string) => {
      const newEvt: CustomerEvent = {
        id: `evt-${Date.now()}`,
        customerId,
        type,
        date: date.trim(),
        notes: notes?.trim(),
      };
      setEvents((prev) => [newEvt, ...prev]);
      return newEvt;
    },
    []
  );

  // Delete Event
  const deleteCustomerEvent = React.useCallback((eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  }, []);

  // Add Communication Record
  const addCommunicationLog = React.useCallback(
    (
      customerId: string,
      type: CustomerCommunicationRecord["type"],
      channel: CustomerCommunicationRecord["channel"],
      summary: string,
      tripId?: string,
      agentName?: string
    ) => {
      const now = new Date();
      const dateStr = `${now.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} ${now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;

      const newComm: CustomerCommunicationRecord = {
        id: `comm-${Date.now()}`,
        customerId,
        tripId,
        type,
        channel,
        summary: summary.trim(),
        date: dateStr,
        agentName: agentName || "Agent (TripDesk)",
      };
      setCommunications((prev) => [newComm, ...prev]);
      return newComm;
    },
    []
  );

  // Update Review Settings
  const updateReviewSettings = React.useCallback(
    (settings: Partial<AgencyReviewSettings>) => {
      setReviewSettings((prev) => ({ ...prev, ...settings }));
    },
    []
  );

  // ─── 360 DEGREE CUSTOMER AGGREGATION ──────────────────────────────────────
  const getCustomer360 = React.useCallback(
    (customerId: string): Customer360Data => {
      const custTrips = trips.filter((t) => t.customerId === customerId);
      const custBookings = bookings.filter((b) => b.customerId === customerId);

      const totalTrips = custTrips.length;
      const completedTrips = custTrips.filter(
        (t) => t.status === "Completed"
      ).length;
      const upcomingTrips = custTrips.filter(
        (t) => t.status === "Confirmed"
      ).length;
      const activeTrips = custTrips.filter(
        (t) => t.status === "In Progress"
      ).length;

      // Lifetime value: sum of confirmed and completed bookings (excludes cancelled)
      const lifetimeValue = custBookings
        .filter((b) => b.status !== "Cancelled")
        .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

      const averageTripValue =
        totalTrips > 0 ? Math.round(lifetimeValue / Math.max(1, totalTrips)) : 0;

      // Customer Feedbacks
      const custFeedbacks = feedbacks.filter((f) => f.customerId === customerId);
      const averageRating =
        custFeedbacks.length > 0
          ? Number(
              (
                custFeedbacks.reduce((sum, f) => sum + f.overallRating, 0) /
                custFeedbacks.length
              ).toFixed(1)
            )
          : 5.0;

      // Referrals
      const custReferrals = referrals.filter(
        (r) => r.referrerCustomerId === customerId
      );
      const referralCount = custReferrals.length;

      // Rewards
      const custRewards = rewards.filter((r) => r.customerId === customerId);
      const totalRewardsEarned = custRewards.reduce((sum, r) => sum + r.amount, 0);
      const availableRewards = custRewards
        .filter((r) => r.status === "Available")
        .reduce((sum, r) => sum + r.amount, 0);

      // Loyalty Tier computation:
      // Silver: 1-2 completed trips
      // Gold: 3-4 completed trips
      // Platinum: 5+ completed trips
      let tier: LoyaltyTier = "Silver";
      let nextTier: LoyaltyTier | undefined = "Gold";
      let tripsToNextTier = Math.max(0, 3 - completedTrips);
      let tierDiscountPercentage = 3;
      let badgeColor = "bg-slate-100 text-slate-800 border-slate-300";

      if (completedTrips >= 5) {
        tier = "Platinum";
        nextTier = undefined;
        tripsToNextTier = 0;
        tierDiscountPercentage = 10;
        badgeColor = "bg-purple-100 text-purple-800 border-purple-300";
      } else if (completedTrips >= 3) {
        tier = "Gold";
        nextTier = "Platinum";
        tripsToNextTier = Math.max(0, 5 - completedTrips);
        tierDiscountPercentage = 6;
        badgeColor = "bg-amber-100 text-amber-800 border-amber-300";
      }

      const loyalty: LoyaltyInfo = {
        tier,
        completedTrips,
        nextTier,
        tripsToNextTier,
        tierDiscountPercentage,
        badgeColor,
      };

      // Lifecycle status default calculation
      let lifecycleStatus: CustomerLifecycleStatus =
        lifecycles[customerId] || "New Customer";

      if (!lifecycles[customerId]) {
        if (completedTrips >= 2) {
          lifecycleStatus = "Repeat Customer";
        } else if (activeTrips > 0) {
          lifecycleStatus = "Traveling";
        } else if (upcomingTrips > 0) {
          lifecycleStatus = "Booked";
        } else if (completedTrips === 1) {
          lifecycleStatus = "Completed";
        }
      }

      const custReviews = reviews.filter((r) => r.customerId === customerId);
      const custEvents = events.filter((e) => e.customerId === customerId);
      const custComms = communications.filter((c) => c.customerId === customerId);
      const custPref = preferences[customerId];

      return {
        totalTrips,
        completedTrips,
        upcomingTrips,
        activeTrips,
        lifetimeValue,
        averageTripValue,
        averageRating,
        referralCount,
        totalRewardsEarned,
        availableRewards,
        loyalty,
        lifecycleStatus,
        preferences: custPref,
        events: custEvents,
        communications: custComms,
        feedbacks: custFeedbacks,
        reviews: custReviews,
        referrals: custReferrals,
        rewards: custRewards,
      };
    },
    [
      trips,
      bookings,
      feedbacks,
      referrals,
      rewards,
      lifecycles,
      reviews,
      events,
      communications,
      preferences,
    ]
  );

  // ─── OVERALL FEEDBACK STATS ───────────────────────────────────────────────
  const getFeedbackStats = React.useCallback(() => {
    const totalFeedback = feedbacks.length;
    if (totalFeedback === 0) {
      return {
        averageRating: 5.0,
        totalFeedback: 0,
        positiveCount: 0,
        needsAttentionCount: 0,
        starCounts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        categoryAverages: {
          hotels: 4.8,
          vehicles: 4.9,
          drivers: 4.8,
          activities: 4.8,
          support: 5.0,
        },
      };
    }

    const sumRating = feedbacks.reduce((sum, f) => sum + f.overallRating, 0);
    const averageRating = Number((sumRating / totalFeedback).toFixed(1));

    const positiveCount = feedbacks.filter((f) => f.overallRating >= 4).length;
    const needsAttentionCount = feedbacks.filter((f) => f.overallRating <= 3).length;

    const starCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    feedbacks.forEach((f) => {
      starCounts[f.overallRating] = (starCounts[f.overallRating] || 0) + 1;
    });

    const hotelRatings = feedbacks.filter((f) => f.hotelRating).map((f) => f.hotelRating!);
    const vehicleRatings = feedbacks.filter((f) => f.vehicleRating).map((f) => f.vehicleRating!);
    const driverRatings = feedbacks.filter((f) => f.driverRating).map((f) => f.driverRating!);
    const activityRatings = feedbacks.filter((f) => f.activityRating).map((f) => f.activityRating!);
    const supportRatings = feedbacks.filter((f) => f.supportRating).map((f) => f.supportRating!);

    const calcAvg = (arr: number[]) =>
      arr.length > 0 ? Number((arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(1)) : 4.8;

    return {
      averageRating,
      totalFeedback,
      positiveCount,
      needsAttentionCount,
      starCounts,
      categoryAverages: {
        hotels: calcAvg(hotelRatings),
        vehicles: calcAvg(vehicleRatings),
        drivers: calcAvg(driverRatings),
        activities: calcAvg(activityRatings),
        support: calcAvg(supportRatings),
      },
    };
  }, [feedbacks]);

  // ─── OVERALL REFERRAL STATS ───────────────────────────────────────────────
  const getReferralStats = React.useCallback(() => {
    const totalReferrals = referrals.length;
    const converted = referrals.filter(
      (r) => r.status === "Booked" || r.status === "Completed" || r.status === "Rewarded"
    );
    const convertedCount = converted.length;
    const conversionRate =
      totalReferrals > 0 ? Math.round((convertedCount / totalReferrals) * 100) : 0;

    const totalRevenue = converted.reduce((sum, r) => sum + (r.tripValue || 0), 0);
    const totalRewardsPaid = referrals
      .filter((r) => r.status === "Completed" || r.status === "Rewarded")
      .reduce((sum, r) => sum + r.rewardAmount, 0);

    return {
      totalReferrals,
      convertedCount,
      conversionRate,
      totalRevenue,
      totalRewardsPaid,
    };
  }, [referrals]);

  // ─── SUPPLIER & FLEET PERFORMANCE METRICS ─────────────────────────────────
  const getSupplierPerformanceMetrics = React.useCallback(() => {
    return {
      drivers: [
        { name: "Rajesh Kumar", trips: 32, averageRating: 4.9, complaints: 0 },
        { name: "Suresh Babu", trips: 28, averageRating: 4.8, complaints: 1 },
        { name: "Manoj Nair", trips: 19, averageRating: 4.7, complaints: 1 },
      ],
      hotels: [
        { name: "Munnar Valley Tea Resort", bookings: 24, averageRating: 4.9, complaints: 0 },
        { name: "Alleppey Luxury Houseboats", bookings: 31, averageRating: 4.8, complaints: 0 },
        { name: "Jaipur Heritage Haveli", bookings: 16, averageRating: 3.8, complaints: 2 },
      ],
    };
  }, []);

  return (
    <ExperienceContext.Provider
      value={{
        feedbacks,
        reviews,
        referrals,
        rewards,
        preferences,
        lifecycles,
        communications,
        events,
        reviewSettings,
        submitCustomerFeedback,
        updateServiceRecovery,
        createPublicReview,
        createReferralCode,
        trackReferral,
        updateReferralStatus,
        addCustomerReward,
        redeemCustomerReward,
        updateCustomerPreferences,
        updateCustomerLifecycle,
        addCustomerEvent,
        deleteCustomerEvent,
        addCommunicationLog,
        updateReviewSettings,
        getCustomer360,
        getFeedbackStats,
        getReferralStats,
        getSupplierPerformanceMetrics,
      }}
    >
      {children}
    </ExperienceContext.Provider>
  );
}

export function useExperience() {
  const context = React.useContext(ExperienceContext);
  if (!context) {
    throw new Error("useExperience must be used within an ExperienceProvider");
  }
  return context;
}
