import {
  FeedbackFilterInput,
  FeedbackCreateInput,
  FeedbackUpdateRecoveryInput,
} from "@/lib/validation/feedback-schema";
import {
  ReferralFilterInput,
  ReferralCreateInput,
  ReferralStatusUpdateInput,
} from "@/lib/validation/referral-schema";

export const experienceClient = {
  // ─── FEEDBACK & REVIEWS ─────────────────────────────────────────────
  async listFeedbacks(filter?: FeedbackFilterInput) {
    const params = new URLSearchParams();
    if (filter?.search) params.set("search", filter.search);
    if (filter?.tab) params.set("tab", filter.tab);
    if (filter?.tripId) params.set("tripId", filter.tripId);
    if (filter?.customerId) params.set("customerId", filter.customerId);
    if (filter?.page) params.set("page", filter.page.toString());
    if (filter?.limit) params.set("limit", filter.limit.toString());

    const res = await fetch(`/api/feedback?${params.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to fetch feedback");
    }
    return res.json();
  },

  async getFeedback(id: string) {
    const res = await fetch(`/api/feedback/${id}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to fetch feedback");
    }
    return res.json();
  },

  async createFeedback(input: FeedbackCreateInput) {
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to record feedback");
    }
    return res.json();
  },

  async updateServiceRecovery(id: string, input: FeedbackUpdateRecoveryInput) {
    const res = await fetch(`/api/feedback/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to update service recovery");
    }
    return res.json();
  },

  // ─── REFERRALS & REWARDS ───────────────────────────────────────────
  async listReferrals(filter?: ReferralFilterInput) {
    const params = new URLSearchParams();
    if (filter?.search) params.set("search", filter.search);
    if (filter?.status) params.set("status", filter.status);
    if (filter?.referrerCustomerId) params.set("referrerCustomerId", filter.referrerCustomerId);
    if (filter?.page) params.set("page", filter.page.toString());
    if (filter?.limit) params.set("limit", filter.limit.toString());

    const res = await fetch(`/api/referrals?${params.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to fetch referrals");
    }
    return res.json();
  },

  async getReferral(id: string) {
    const res = await fetch(`/api/referrals/${id}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to fetch referral");
    }
    return res.json();
  },

  async createReferral(input: ReferralCreateInput) {
    const res = await fetch("/api/referrals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to create referral");
    }
    return res.json();
  },

  async updateReferralStatus(id: string, input: ReferralStatusUpdateInput) {
    const res = await fetch(`/api/referrals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to update referral");
    }
    return res.json();
  },

  // ─── CUSTOMER INSIGHTS ─────────────────────────────────────────────
  async getCustomerInsights() {
    const res = await fetch("/api/customer-insights");
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to fetch customer insights");
    }
    return res.json();
  },
};
