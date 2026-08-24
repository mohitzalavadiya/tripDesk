"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";

export type PlatformRole = "TRIPDESK_OWNER" | "AGENCY_OWNER";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: PlatformRole;
  agencyId: string | null;
  agencyName?: string;
  avatar?: string;
}

export interface AgencyAccount {
  id: string;
  name: string;
  slug: string;
  ownerName: string;
  email: string;
  phone: string;
  city: string;
  plan: "Starter" | "Professional" | "Growth" | "Enterprise";
  planStatus: "Active" | "Trial" | "Suspended";
  billingCycle: "Yearly" | "Monthly";
  annualFee: number;
  monthlyFee: number;
  tripsThisMonth: number;
  activeCustomers: number;
  renewalDate: string;
  joinedDate: string;
  logo?: string;
}

// Initial Mock Platform Agencies
const initialAgencies: AgencyAccount[] = [
  {
    id: "agency-1",
    name: "ABC Travels",
    slug: "abc-travels",
    ownerName: "Mohit Patel",
    email: "mohit@abctravels.com",
    phone: "+91 98470 12345",
    city: "Kochi, Kerala",
    plan: "Professional",
    planStatus: "Active",
    billingCycle: "Yearly",
    annualFee: 49999,
    monthlyFee: 4999,
    tripsThisMonth: 18,
    activeCustomers: 48,
    renewalDate: "2027-08-22",
    joinedDate: "2025-08-22",
  },
  {
    id: "agency-2",
    name: "Wanderlust India Holidays",
    slug: "wanderlust-india",
    ownerName: "Priya Shah",
    email: "priya@wanderlust.in",
    phone: "+91 98250 99887",
    city: "Mumbai, Maharashtra",
    plan: "Growth",
    planStatus: "Active",
    billingCycle: "Yearly",
    annualFee: 99999,
    monthlyFee: 9999,
    tripsThisMonth: 34,
    activeCustomers: 120,
    renewalDate: "2027-06-15",
    joinedDate: "2025-06-15",
  },
  {
    id: "agency-3",
    name: "Royal Rajasthan Tours",
    slug: "royal-rajasthan",
    ownerName: "Vikram Singh",
    email: "vikram@royalrajasthan.com",
    phone: "+91 94140 55667",
    city: "Jaipur, Rajasthan",
    plan: "Professional",
    planStatus: "Active",
    billingCycle: "Monthly",
    annualFee: 59988,
    monthlyFee: 4999,
    tripsThisMonth: 22,
    activeCustomers: 76,
    renewalDate: "2026-09-10",
    joinedDate: "2025-11-10",
  },
  {
    id: "agency-4",
    name: "Kerala Backwaters & Hills",
    slug: "kerala-backwaters",
    ownerName: "Kishan Kumar",
    email: "kishan@keralatravel.com",
    phone: "+91 97440 22334",
    city: "Alleppey, Kerala",
    plan: "Starter",
    planStatus: "Trial",
    billingCycle: "Monthly",
    annualFee: 23988,
    monthlyFee: 1999,
    tripsThisMonth: 7,
    activeCustomers: 19,
    renewalDate: "2026-09-05",
    joinedDate: "2026-08-15",
  },
  {
    id: "agency-5",
    name: "Goa Coastal Escapes",
    slug: "goa-coastal",
    ownerName: "Suresh Lobo",
    email: "suresh@goaescapes.com",
    phone: "+91 98221 44556",
    city: "Panaji, Goa",
    plan: "Starter",
    planStatus: "Suspended",
    billingCycle: "Monthly",
    annualFee: 23988,
    monthlyFee: 1999,
    tripsThisMonth: 0,
    activeCustomers: 12,
    renewalDate: "2026-08-01",
    joinedDate: "2026-02-01",
  },
];

interface AuthContextType {
  currentUser: UserProfile;
  currentAgency: AgencyAccount;
  agencies: AgencyAccount[];
  switchRole: (role: PlatformRole) => void;
  updateAgencyStatus: (
    agencyId: string,
    status: AgencyAccount["planStatus"]
  ) => void;
  registerAgency: (data: Omit<AgencyAccount, "id" | "joinedDate" | "tripsThisMonth" | "activeCustomers">) => AgencyAccount;
  login: (role: PlatformRole) => void;
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [agencies, setAgencies] = React.useState<AgencyAccount[]>(initialAgencies);
  const [activeAgencyId, setActiveAgencyId] = React.useState<string>("agency-1");

  const [currentUser, setCurrentUser] = React.useState<UserProfile>({
    id: "user-1",
    name: "Mohit Patel",
    email: "mohit@abctravels.com",
    role: "AGENCY_OWNER",
    agencyId: "agency-1",
    agencyName: "ABC Travels",
  });

  const currentAgency = React.useMemo(() => {
    return (
      agencies.find((a) => a.id === currentUser.agencyId) ||
      agencies[0] || {
        id: "agency-1",
        name: "ABC Travels",
        slug: "abc-travels",
        ownerName: "Mohit Patel",
        email: "mohit@abctravels.com",
        phone: "+91 98470 12345",
        city: "Kochi, Kerala",
        plan: "Professional",
        planStatus: "Active",
        billingCycle: "Yearly",
        annualFee: 49999,
        monthlyFee: 4999,
        tripsThisMonth: 18,
        activeCustomers: 48,
        renewalDate: "2027-08-22",
        joinedDate: "2025-08-22",
      }
    );
  }, [agencies, currentUser.agencyId]);

  // Sync role based on path if navigating directly to /admin or /dashboard
  React.useEffect(() => {
    if (pathname.startsWith("/admin") && currentUser.role !== "TRIPDESK_OWNER") {
      setCurrentUser({
        id: "admin-1",
        name: "TripDesk Administrator",
        email: "admin@tripdesk.in",
        role: "TRIPDESK_OWNER",
        agencyId: null,
      });
    }
  }, [pathname, currentUser.role]);

  const switchRole = React.useCallback(
    (newRole: PlatformRole) => {
      if (newRole === "TRIPDESK_OWNER") {
        setCurrentUser({
          id: "admin-1",
          name: "TripDesk Administrator",
          email: "admin@tripdesk.in",
          role: "TRIPDESK_OWNER",
          agencyId: null,
        });
        toast.info("Switched to TripDesk Platform Owner role");
        router.push("/admin");
      } else {
        setCurrentUser({
          id: "user-1",
          name: "Mohit Patel",
          email: "mohit@abctravels.com",
          role: "AGENCY_OWNER",
          agencyId: "agency-1",
          agencyName: "ABC Travels",
        });
        toast.info("Switched to Agency Owner role (ABC Travels)");
        router.push("/dashboard");
      }
    },
    [router]
  );

  const updateAgencyStatus = React.useCallback(
    (agencyId: string, status: AgencyAccount["planStatus"]) => {
      setAgencies((prev) =>
        prev.map((a) => (a.id === agencyId ? { ...a, planStatus: status } : a))
      );
      toast.success(`Agency status updated to ${status}`);
    },
    []
  );

  const registerAgency = React.useCallback(
    (data: Omit<AgencyAccount, "id" | "joinedDate" | "tripsThisMonth" | "activeCustomers">) => {
      const newAgency: AgencyAccount = {
        ...data,
        id: `agency-${Date.now()}`,
        tripsThisMonth: 0,
        activeCustomers: 0,
        joinedDate: new Date().toISOString().split("T")[0],
      };
      setAgencies((prev) => [newAgency, ...prev]);
      toast.success(`Agency "${newAgency.name}" registered successfully!`);
      return newAgency;
    },
    []
  );

  const login = React.useCallback(
    (role: PlatformRole) => {
      switchRole(role);
    },
    [switchRole]
  );

  const logout = React.useCallback(() => {
    toast("Logged out of session.");
    router.push("/dashboard");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentAgency,
        agencies,
        switchRole,
        updateAgencyStatus,
        registerAgency,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
