import {
  AdminAgencyFilterInput,
  PlanCreateInput,
  PlanUpdateInput,
  AnnouncementCreateInput,
  AnnouncementUpdateInput,
  SubscriptionPaymentFilterInput,
  SubscriptionPaymentCreateInput,
  SubscriptionPaymentVerifyInput,
  SubscriptionPaymentRejectInput,
} from "@/lib/validation/admin-schema";

export const adminClient = {
  async getOverview() {
    const res = await fetch("/api/admin/overview");
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to fetch platform overview");
    }
    return res.json();
  },

  async listAgencies(filter?: AdminAgencyFilterInput) {
    const params = new URLSearchParams();
    if (filter?.search) params.set("search", filter.search);
    if (filter?.status) params.set("status", filter.status);
    if (filter?.subscriptionStatus) params.set("subscriptionStatus", filter.subscriptionStatus);
    if (filter?.planId) params.set("planId", filter.planId);
    if (filter?.trialState) params.set("trialState", filter.trialState);
    if (filter?.sortBy) params.set("sortBy", filter.sortBy);
    if (filter?.sortOrder) params.set("sortOrder", filter.sortOrder);
    if (filter?.page) params.set("page", filter.page.toString());
    if (filter?.limit) params.set("limit", filter.limit.toString());

    const res = await fetch(`/api/admin/agencies?${params.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to fetch agencies");
    }
    return res.json();
  },

  async getAgency(id: string) {
    const res = await fetch(`/api/admin/agencies/${id}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to fetch agency details");
    }
    return res.json();
  },

  async suspendAgency(id: string, reason: string) {
    const res = await fetch(`/api/admin/agencies/${id}/suspend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to suspend agency");
    }
    return res.json();
  },

  async reactivateAgency(id: string) {
    const res = await fetch(`/api/admin/agencies/${id}/reactivate`, {
      method: "POST",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to reactivate agency");
    }
    return res.json();
  },

  async extendTrial(id: string, daysToAdd: number, reason: string) {
    const res = await fetch(`/api/admin/agencies/${id}/extend-trial`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ daysToAdd, reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to extend trial");
    }
    return res.json();
  },

  async listPlans() {
    const res = await fetch("/api/admin/plans");
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to list plans");
    }
    return res.json();
  },

  async createPlan(input: PlanCreateInput) {
    const res = await fetch("/api/admin/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to create plan");
    }
    return res.json();
  },

  async updatePlan(id: string, input: PlanUpdateInput) {
    const res = await fetch(`/api/admin/plans/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to update plan");
    }
    return res.json();
  },

  async listSubscriptions(filter?: { status?: string; planId?: string }) {
    const params = new URLSearchParams();
    if (filter?.status) params.set("status", filter.status);
    if (filter?.planId) params.set("planId", filter.planId);

    const res = await fetch(`/api/admin/subscriptions?${params.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to list subscriptions");
    }
    return res.json();
  },

  async getAnalytics() {
    const res = await fetch("/api/admin/analytics");
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to fetch platform analytics");
    }
    return res.json();
  },

  async listAuditLogs(filter?: { action?: string; agencyId?: string; limit?: number }) {
    const params = new URLSearchParams();
    if (filter?.action) params.set("action", filter.action);
    if (filter?.agencyId) params.set("agencyId", filter.agencyId);
    if (filter?.limit) params.set("limit", filter.limit.toString());

    const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to fetch audit logs");
    }
    return res.json();
  },

  async listAnnouncements() {
    const res = await fetch("/api/admin/announcements");
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to list announcements");
    }
    return res.json();
  },

  async createAnnouncement(input: AnnouncementCreateInput) {
    const res = await fetch("/api/admin/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to create announcement");
    }
    return res.json();
  },

  async updateAnnouncement(id: string, input: AnnouncementUpdateInput) {
    const res = await fetch(`/api/admin/announcements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to update announcement");
    }
    return res.json();
  },

  async deleteAnnouncement(id: string) {
    const res = await fetch(`/api/admin/announcements/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to delete announcement");
    }
    return res.json();
  },

  async getSettings() {
    const res = await fetch("/api/admin/settings");
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to fetch platform settings");
    }
    return res.json();
  },

  async updateSettings(settings: Record<string, string>) {
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to update platform settings");
    }
    return res.json();
  },

  async globalSearch(q: string) {
    const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to search platform");
    }
    return res.json();
  },

  async listSubscriptionPayments(filter?: SubscriptionPaymentFilterInput) {
    const params = new URLSearchParams();
    if (filter?.status) params.set("status", filter.status);
    if (filter?.agencyId) params.set("agencyId", filter.agencyId);
    if (filter?.subscriptionId) params.set("subscriptionId", filter.subscriptionId);
    if (filter?.planId) params.set("planId", filter.planId);
    if (filter?.search) params.set("search", filter.search);
    if (filter?.startDate) params.set("startDate", filter.startDate);
    if (filter?.endDate) params.set("endDate", filter.endDate);
    if (filter?.page) params.set("page", filter.page.toString());
    if (filter?.limit) params.set("limit", filter.limit.toString());

    const res = await fetch(`/api/admin/subscription-payments?${params.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to fetch subscription payments");
    }
    return res.json();
  },

  async getSubscriptionPayment(id: string) {
    const res = await fetch(`/api/admin/subscription-payments/${id}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to fetch subscription payment");
    }
    return res.json();
  },

  async createSubscriptionPayment(input: SubscriptionPaymentCreateInput) {
    const res = await fetch("/api/admin/subscription-payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to record subscription payment");
    }
    return res.json();
  },

  async verifySubscriptionPayment(id: string, input?: SubscriptionPaymentVerifyInput) {
    const res = await fetch(`/api/admin/subscription-payments/${id}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input || {}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to verify subscription payment");
    }
    return res.json();
  },

  async rejectSubscriptionPayment(id: string, reason: string) {
    const res = await fetch(`/api/admin/subscription-payments/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to reject subscription payment");
    }
    return res.json();
  },
};

