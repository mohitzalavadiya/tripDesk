import {
Activity,
BarChart,
Building,
CalendarCheck,
Car,
Clock,
Compass,
CreditCard,
FileSpreadsheet,
FileText,
Gift,
Hotel,
Inbox,
IndianRupee,
// Layers,
LayoutDashboard,
LucideIcon,
MapPin,
MessageSquare,
Settings,
Star,
// Ticket,
TrendingUp,
Users
} from "lucide-react";

export interface NavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  badgeVariant?: "default" | "warning" | "success" | "info" | "travel";
  featureKey?: string;
  ownerOnly?: boolean;
  moduleKey?: string;
}

export interface NavigationSection {
  title: string;
  items: NavigationItem[];
}

/**
 * Navigation structure for Agency Owners (Travel Business Operations)
 */
export const agencyNavigationConfig: NavigationSection[] = [
  {
    title: "CRM & PIPELINE",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        label: "Enquiries",
        href: "/enquiries",
        icon: Inbox,
        moduleKey: "ENQUIRIES",
      },
      {
        label: "Follow-ups",
        href: "/follow-ups",
        icon: Clock,
        moduleKey: "FOLLOW_UPS",
      },
      {
        label: "Customers",
        href: "/customers",
        icon: Users,
        moduleKey: "CUSTOMERS",
      },
      {
        label: "Customer Insights",
        href: "/customer-insights",
        icon: TrendingUp,
        moduleKey: "CUSTOMER_INSIGHTS",
      },
    ],
  },
  {
    title: "TRIPS & BOOKINGS",
    items: [
      {
        label: "Trips",
        href: "/trips",
        icon: Compass,
        moduleKey: "TRIPS",
      },
      {
        label: "Quotations",
        href: "/quotations",
        icon: FileText,
        moduleKey: "QUOTATIONS",
      },
      {
        label: "Bookings",
        href: "/bookings",
        icon: CalendarCheck,
        moduleKey: "BOOKINGS",
      },
      {
        label: "Documents",
        href: "/documents",
        icon: FileText,
        moduleKey: "DOCUMENTS",
      },
      {
        label: "Operations",
        href: "/operations",
        icon: Activity,
        badge: "Live",
        badgeVariant: "warning",
        moduleKey: "OPERATIONS",
      },
    ],
  },
  {
    title: "RESOURCES",
    items: [
      {
        label: "Destinations",
        href: "/destinations",
        icon: MapPin,
        moduleKey: "DESTINATIONS",
      },
      {
        label: "Hotels",
        href: "/hotels",
        icon: Hotel,
        moduleKey: "HOTELS",
      },
      {
        label: "Vehicles",
        href: "/vehicles",
        icon: Car,
        moduleKey: "VEHICLES",
      },
      // Hidden from UI navigation (original page & API functionality preserved):
      // {
      //   label: "Activities",
      //   href: "/activities",
      //   icon: Ticket,
      //   moduleKey: "ACTIVITIES",
      // },
      {
        label: "Rate Sheets",
        href: "/rate-sheets",
        icon: FileSpreadsheet,
        moduleKey: "RATE_SHEETS",
      },
      // Hidden from UI navigation (original page & API functionality preserved):
      // {
      //   label: "Suppliers",
      //   href: "/suppliers",
      //   icon: Building,
      //   moduleKey: "SUPPLIERS",
      // },
    ],
  },
  {
    title: "FINANCE & REPORTING",
    items: [
      {
        label: "Finance",
        href: "/finance",
        icon: IndianRupee,
        moduleKey: "FINANCE",
      },
      // Hidden from UI navigation (original page & API functionality preserved):
      // {
      //   label: "Invoices",
      //   href: "/invoices",
      //   icon: FileText,
      //   moduleKey: "INVOICES",
      // },
      {
        label: "Payments",
        href: "/payments",
        icon: CreditCard,
        moduleKey: "PAYMENTS",
      },
      {
        label: "Feedback & Reviews",
        href: "/feedback",
        icon: Star,
        moduleKey: "FEEDBACK",
      },
      {
        label: "Reports & Analytics",
        href: "/reports",
        icon: BarChart,
        moduleKey: "REPORTS",
      },
      {
        label: "Communications",
        href: "/communications",
        icon: MessageSquare,
        moduleKey: "COMMUNICATIONS",
      },
      {
        label: "Referrals & Rewards",
        href: "/referrals",
        icon: Gift,
        moduleKey: "REFERRALS",
      },
    ],
  },
  {
    title: "SETTINGS",
    items: [
      {
        label: "Agency Settings",
        href: "/settings",
        icon: Settings,
        moduleKey: "SETTINGS",
      },
      {
        label: "Support Chat",
        href: "/support",
        icon: MessageSquare,
        moduleKey: "SUPPORT_CHAT",
      },
    ],
  },
];

/**
 * Navigation structure for TripDesk Platform Owner (SaaS Administration)
 */
export const adminNavigationConfig: NavigationSection[] = [
  {
    title: "PLATFORM OVERVIEW",
    items: [
      {
        label: "Admin Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
      },
      {
        label: "Support Chat",
        href: "/admin/chat",
        icon: MessageSquare,
      },
      {
        label: "Agencies",
        href: "/admin/agencies",
        icon: Building,
      },
      {
        label: "Usage & Analytics",
        href: "/admin/analytics",
        icon: TrendingUp,
      },
    ],
  },

  {
    title: "GOVERNANCE & SYSTEM",
    items: [
      {
        label: "Audit Logs",
        href: "/admin/audit-logs",
        icon: Activity,
      },
      {
        label: "Announcements",
        href: "/admin/announcements",
        icon: Star,
      },
      {
        label: "Platform Settings",
        href: "/admin/settings",
        icon: Settings,
      },
    ],
  },
];

// Default export alias for backward compatibility
export const navigationConfig = agencyNavigationConfig;

export const secondaryNavigation: NavigationItem[] = [];
