import {
  LayoutDashboard,
  Inbox,
  Users,
  Compass,
  FileText,
  Clock,
  Hotel,
  Car,
  Ticket,
  Truck,
  FileSpreadsheet,
  IndianRupee,
  BarChart,
  Settings,
  HelpCircle,
  CalendarCheck,
  Activity,
  Star,
  Gift,
  TrendingUp,
  Building,
  CreditCard,
  Layers,
  ShieldCheck,
  MessageSquare,
  LucideIcon
} from "lucide-react";

export interface NavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  badgeVariant?: "default" | "warning" | "success" | "info" | "travel";
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
    title: "MAIN",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "TRAVEL MANAGEMENT",
    items: [
      {
        label: "Customers",
        href: "/customers",
        icon: Users,
      },
      {
        label: "Trips",
        href: "/trips",
        icon: Compass,
        badge: "9",
        badgeVariant: "success",
      },
      {
        label: "Quotations",
        href: "/quotations",
        icon: FileText,
      },
      {
        label: "Bookings",
        href: "/bookings",
        icon: CalendarCheck,
        badge: "7",
        badgeVariant: "travel",
      },
      {
        label: "Documents",
        href: "/documents",
        icon: FileText,
      },
      {
        label: "Operations",
        href: "/operations",
        icon: Activity,
        badge: "Live",
        badgeVariant: "warning",
      },
    ],
  },
  {
    title: "RESOURCES",
    items: [
      {
        label: "Hotels",
        href: "/hotels",
        icon: Hotel,
      },
      {
        label: "Rate Sheets",
        href: "/rate-sheets",
        icon: FileSpreadsheet,
      },
    ],
  },
  {
    title: "FINANCE & RETENTION",
    items: [
      {
        label: "Payments",
        href: "/payments",
        icon: IndianRupee,
      },
      {
        label: "Feedback & Reviews",
        href: "/feedback",
        icon: Star,
        badge: "4.8 ★",
        badgeVariant: "travel",
      },
      {
        label: "Referrals & Rewards",
        href: "/referrals",
        icon: Gift,
      },
      {
        label: "Customer Insights",
        href: "/customer-insights",
        icon: TrendingUp,
      },
      {
        label: "Reports",
        href: "/reports",
        icon: BarChart,
      },
      {
        label: "Communications",
        href: "/communications",
        icon: MessageSquare,
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
      },
      {
        label: "Subscription",
        href: "/subscription",
        icon: CreditCard,
        badge: "Active",
        badgeVariant: "success",
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
        label: "Agencies",
        href: "/admin/agencies",
        icon: Building,
      },
      {
        label: "Subscriptions",
        href: "/admin/subscriptions",
        icon: CreditCard,
      },
      {
        label: "Plans & Pricing",
        href: "/admin/plans",
        icon: Layers,
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

export const secondaryNavigation = [
  {
    label: "Help & Support",
    href: "/help",
    icon: HelpCircle,
  },
];
