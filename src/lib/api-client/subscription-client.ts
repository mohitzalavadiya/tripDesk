import { AgencyPaymentRequestInput } from "@/lib/validation/subscription-schema";

export const subscriptionClient = {
  async getSubscription() {
    const res = await fetch("/api/subscription");
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to fetch agency subscription");
    }
    return res.json();
  },

  async getActivePlans() {
    const res = await fetch("/api/subscription/plans");
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to fetch active plans");
    }
    return res.json();
  },

  async submitPaymentRequest(input: AgencyPaymentRequestInput) {
    const res = await fetch("/api/subscription/payment-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to submit payment request");
    }
    return res.json();
  },
};
