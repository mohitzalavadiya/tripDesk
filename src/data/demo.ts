export interface Enquiry {
  id: string;
  customerName: string;
  destination: string;
  travelDate: string;
  duration: string;
  travellers: string;
  budget: number;
  status: "New" | "Contacted" | "Quoted" | "Follow-up" | "Confirmed" | "Cancelled";
  lastActivity: string;
}

export interface FollowUp {
  id: string;
  customerName: string;
  destination: string;
  budget: number;
  dueDate: string;
  status: "today" | "tomorrow" | "pending";
}

export interface UpcomingTrip {
  id: string;
  destination: string;
  customerName: string;
  dates: string;
  duration: string;
  status: "Confirmed" | "Pending";
}

export interface RevenueData {
  month: string;
  amount: number;
}

export const mockEnquiries: Enquiry[] = [
  {
    id: "ENQ-001",
    customerName: "Rahul Patel",
    destination: "Kerala (Munnar & Alleppey)",
    travelDate: "01 Sep 2026",
    duration: "6 Nights / 7 Days",
    travellers: "4 Adults + 2 Children",
    budget: 120000,
    status: "Quoted",
    lastActivity: "Quotation sent by email today at 11:30 AM",
  },
  {
    id: "ENQ-002",
    customerName: "Priya Shah",
    destination: "Goa (North & South Goa)",
    travelDate: "12 Sep 2026",
    duration: "3 Nights / 4 Days",
    travellers: "2 Adults",
    budget: 72000,
    status: "Follow-up",
    lastActivity: "Follow-up call scheduled for tomorrow",
  },
  {
    id: "ENQ-003",
    customerName: "Amit Shah",
    destination: "Dubai (Expo City & Desert)",
    travelDate: "20 Sep 2026",
    duration: "5 Nights / 6 Days",
    travellers: "4 Adults",
    budget: 150000,
    status: "New",
    lastActivity: "Enquiry received from website contact form",
  },
  {
    id: "ENQ-004",
    customerName: "Meera Nair",
    destination: "Himachal (Shimla & Manali)",
    travelDate: "05 Oct 2026",
    duration: "7 Nights / 8 Days",
    travellers: "3 Adults + 1 Child",
    budget: 95000,
    status: "Contacted",
    lastActivity: "Discussed itinerary preferences on WhatsApp",
  },
  {
    id: "ENQ-005",
    customerName: "Vikram Malhotra",
    destination: "Kashmir (Srinagar & Gulmarg)",
    travelDate: "18 Oct 2026",
    duration: "5 Nights / 6 Days",
    travellers: "2 Adults (Honeymoon)",
    budget: 110000,
    status: "Confirmed",
    lastActivity: "Advance payment received. Booking completed.",
  },
];

export const mockFollowUps: FollowUp[] = [
  {
    id: "FOL-001",
    customerName: "Rahul Patel",
    destination: "Kerala",
    budget: 115920,
    dueDate: "Today",
    status: "today",
  },
  {
    id: "FOL-002",
    customerName: "Priya Shah",
    destination: "Goa",
    budget: 72000,
    dueDate: "Tomorrow",
    status: "tomorrow",
  },
  {
    id: "FOL-003",
    customerName: "Amit Shah",
    destination: "Dubai",
    budget: 142000,
    dueDate: "Today",
    status: "today",
  },
  {
    id: "FOL-004",
    customerName: "Meera Nair",
    destination: "Himachal",
    budget: 95000,
    dueDate: "2 days left",
    status: "pending",
  },
];

export const mockUpcomingTrips: UpcomingTrip[] = [
  {
    id: "TRIP-001",
    destination: "Kerala Holiday",
    customerName: "Rahul Patel",
    dates: "01 Sep - 07 Sep",
    duration: "6 Nights / 7 Days",
    status: "Confirmed",
  },
  {
    id: "TRIP-002",
    destination: "Goa Beach Getaway",
    customerName: "Priya Shah",
    dates: "12 Sep - 15 Sep",
    duration: "3 Nights / 4 Days",
    status: "Confirmed",
  },
  {
    id: "TRIP-003",
    destination: "Dubai Luxury Experience",
    customerName: "Amit Shah",
    dates: "20 Sep - 25 Sep",
    duration: "5 Nights / 6 Days",
    status: "Pending",
  },
  {
    id: "TRIP-004",
    destination: "Kashmir Paradise Tour",
    customerName: "Vikram Malhotra",
    dates: "18 Oct - 23 Oct",
    duration: "5 Nights / 6 Days",
    status: "Confirmed",
  },
];

export const mockRevenueOverview: RevenueData[] = [
  { month: "March", amount: 280000 },
  { month: "April", amount: 350000 },
  { month: "May", amount: 482000 },
  { month: "June", amount: 310000 },
  { month: "July", amount: 420000 },
  { month: "August", amount: 490000 },
];

export const mockPipelineData = [
  { stage: "New", count: 12, color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  { stage: "Contacted", count: 8, color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  { stage: "Quoted", count: 6, color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  { stage: "Follow-up", count: 5, color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  { stage: "Confirmed", count: 4, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
];

export const mockNotifications = [
  {
    id: "notif-1",
    title: "New enquiry received",
    description: "Amit Shah requested quotation for Dubai (4 Adults).",
    time: "10 mins ago",
    read: false,
    category: "enquiry",
  },
  {
    id: "notif-2",
    title: "Quotation viewed",
    description: "Rahul Patel opened the Kerala Holiday proposal PDF.",
    time: "1 hour ago",
    read: false,
    category: "quotation",
  },
  {
    id: "notif-3",
    title: "Follow-up due today",
    description: "Reminder to contact Amit Shah for the Dubai quotation.",
    time: "2 hours ago",
    read: true,
    category: "followup",
  },
  {
    id: "notif-4",
    title: "Payment reminder due",
    description: "Final payment reminder for Priya Shah's Goa booking.",
    time: "1 day ago",
    read: true,
    category: "payment",
  },
];
