/**
 * Canonical Subscription Plan Marketing Features & Capabilities
 *
 * Single source of truth for user-facing plan capability checklists.
 * Note: Decoupled from machine-readable access-control entitlement keys.
 */
export const CANONICAL_PLAN_FEATURES: Record<string, string[]> = {
  Starter: [
    "Customer Management & CRM",
    "Trip Planning & Itinerary Builder",
    "Quotation Engine & PDF Export",
    "Booking Management & Vouchers",
    "Hotel & Vehicle Inventory",
    "Basic Payment Receipts & Invoicing",
    "Standard Email Support",
  ],
  Professional: [
    "Everything in Starter Plan",
    "Operations Desk & Supplier Confirmations",
    "Advanced Finance & Profit Margin Analysis",
    "Agency Business Intelligence & Reports",
    "Multi-Channel Communication Center",
    "Customer Feedback & Service Recovery",
    "Customer Insights & Lifetime Analytics",
    "Custom Agency Branding & Logo",
    "Priority Email & Helpdesk Support",
  ],
};
