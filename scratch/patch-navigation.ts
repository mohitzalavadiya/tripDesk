import * as fs from 'fs';
import * as path from 'path';

const file = path.join(__dirname, '../src/lib/navigation.ts');
let content = fs.readFileSync(file, 'utf-8');

const targetItemInterface = `export interface NavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  badgeVariant?: "default" | "warning" | "success" | "info" | "travel";
  featureKey?: string;
  ownerOnly?: boolean;
}`;

const replaceItemInterface = `export interface NavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  badgeVariant?: "default" | "warning" | "success" | "info" | "travel";
  featureKey?: string;
  ownerOnly?: boolean;
  moduleKey?: string;
}`;

const targetConfig = `export const agencyNavigationConfig: NavigationSection[] = [
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
      },
      {
        label: "Follow-ups",
        href: "/follow-ups",
        icon: Clock,
      },
      {
        label: "Customers",
        href: "/customers",
        icon: Users,
      },
      {
        label: "Customer Insights",
        href: "/customer-insights",
        icon: TrendingUp,
        featureKey: "CUSTOMER_INSIGHTS",
        ownerOnly: true,
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
        label: "Destinations",
        href: "/destinations",
        icon: MapPin,
      },
      {
        label: "Hotels",
        href: "/hotels",
        icon: Hotel,
      },
      {
        label: "Vehicles",
        href: "/vehicles",
        icon: Car,
      },
      {
        label: "Activities",
        href: "/activities",
        icon: Ticket,
      },
      {
        label: "Rate Sheets",
        href: "/rate-sheets",
        icon: FileSpreadsheet,
        ownerOnly: true,
      },
    ],
  },
  {
    title: "FINANCE & REPORTING",
    items: [
      {
        label: "Finance",
        href: "/finance",
        icon: IndianRupee,
        ownerOnly: true,
      },
      {
        label: "Payments",
        href: "/payments",
        icon: CreditCard,
      },
      {
        label: "Feedback & Reviews",
        href: "/feedback",
        icon: Star,
        featureKey: "FEEDBACK_REVIEWS",
      },
      {
        label: "Reports & Analytics",
        href: "/reports",
        icon: BarChart,
        featureKey: "REPORTS_ANALYTICS",
        ownerOnly: true,
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
        ownerOnly: true,
        icon: Settings,
      },
      {
        label: "Subscription",
        href: "/subscription",
        ownerOnly: true,
        icon: CreditCard,
      },
      {
        label: "Support Chat",
        href: "/support",
        icon: MessageSquare,
      },
    ],
  },
];`;

const replaceConfig = `export const agencyNavigationConfig: NavigationSection[] = [
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
        featureKey: "CUSTOMER_INSIGHTS",
        ownerOnly: true,
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
      {
        label: "Activities",
        href: "/activities",
        icon: Ticket,
        moduleKey: "ACTIVITIES",
      },
      {
        label: "Rate Sheets",
        href: "/rate-sheets",
        icon: FileSpreadsheet,
        ownerOnly: true,
        moduleKey: "RATE_SHEETS",
      },
    ],
  },
  {
    title: "FINANCE & REPORTING",
    items: [
      {
        label: "Finance",
        href: "/finance",
        icon: IndianRupee,
        ownerOnly: true,
        moduleKey: "FINANCE",
      },
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
        featureKey: "FEEDBACK_REVIEWS",
        moduleKey: "FEEDBACK",
      },
      {
        label: "Reports & Analytics",
        href: "/reports",
        icon: BarChart,
        featureKey: "REPORTS_ANALYTICS",
        ownerOnly: true,
        moduleKey: "REPORTS",
      },
      {
        label: "Communications",
        href: "/communications",
        icon: MessageSquare,
        moduleKey: "COMMUNICATIONS",
      },
    ],
  },
  {
    title: "SETTINGS",
    items: [
      {
        label: "Agency Settings",
        href: "/settings",
        ownerOnly: true,
        icon: Settings,
        moduleKey: "SETTINGS",
      },
      {
        label: "Subscription",
        href: "/subscription",
        ownerOnly: true,
        icon: CreditCard,
        moduleKey: "SUBSCRIPTION",
      },
      {
        label: "Support Chat",
        href: "/support",
        icon: MessageSquare,
        moduleKey: "SUPPORT_CHAT",
      },
    ],
  },
];`;

const normalized = content.replace(/\r\n/g, '\n');
if (!normalized.includes(targetItemInterface)) {
  console.error('Target item interface not found!');
  process.exit(1);
}
if (!normalized.includes(targetConfig)) {
  console.error('Target config not found!');
  process.exit(1);
}

const updated = normalized
  .replace(targetItemInterface, replaceItemInterface)
  .replace(targetConfig, replaceConfig);

const finalContent = content.includes('\r\n') ? updated.replace(/\n/g, '\r\n') : updated;
fs.writeFileSync(file, finalContent, 'utf-8');
console.log('Successfully updated navigation.ts!');

