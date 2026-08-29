"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export type PlatformRole = "PLATFORM_OWNER" | "AGENCY_OWNER" | "TRIPDESK_OWNER";

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
  slug?: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  city?: string;
  plan?: string;
  planStatus?: string;
  billingCycle?: string;
  annualFee?: number;
  monthlyFee?: number;
  tripsThisMonth?: number;
  activeCustomers?: number;
  renewalDate?: string;
  joinedDate?: string;
  logo?: string;
}

export interface SubscriptionAccessInfo {
  status: string;
  hasFullAccess: boolean;
  isReadOnly: boolean;
  canRead: boolean;
  canWrite: boolean;
  trialDaysRemaining: number;
  planName?: string;
}

interface AuthContextType {
  currentUser: UserProfile;
  currentAgency: AgencyAccount;
  agencies: AgencyAccount[];
  subscriptionAccess: SubscriptionAccessInfo | null;
  isLoading: boolean;
  isPlatformOwner: boolean;
  isAgencyOwner: boolean;
  updateAgencyStatus: (
    agencyId: string,
    status: "Active" | "Trial" | "Suspended"
  ) => void;
  registerAgency: (data: Partial<AgencyAccount>) => AgencyAccount;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const defaultUser: UserProfile = {
  id: "",
  name: "Loading...",
  email: "",
  role: "AGENCY_OWNER",
  agencyId: null,
};

const defaultAgency: AgencyAccount = {
  id: "",
  name: "TripDesk Workspace",
  email: "",
  phone: "",
  city: "",
  plan: "Starter",
  planStatus: "Active",
  billingCycle: "Monthly",
  annualFee: 0,
  monthlyFee: 0,
  tripsThisMonth: 0,
  activeCustomers: 0,
  renewalDate: "",
  joinedDate: "",
};

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [currentUser, setCurrentUser] = React.useState<UserProfile>(defaultUser);
  const [currentAgency, setCurrentAgency] = React.useState<AgencyAccount>(defaultAgency);
  const [agencies, setAgencies] = React.useState<AgencyAccount[]>([]);
  const [subscriptionAccess, setSubscriptionAccess] =
    React.useState<SubscriptionAccessInfo | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  const fetchSession = React.useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", {
        cache: "no-store",
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const u = json.data.user;
          const a = json.data.agency;
          const role = u.role as PlatformRole;

          setCurrentUser({
            id: u.id,
            name: u.name || "TripDesk User",
            email: u.email || "",
            role: role,
            agencyId: u.agencyId || null,
            agencyName: a?.name,
          });

          if (a) {
            const agencyObj: AgencyAccount = {
              id: a.id,
              name: a.name,
              email: a.email || "",
              phone: a.phone || "",
              city: a.address || "",
              plan: json.data.subscriptionAccess?.planName || "Starter",
              planStatus: json.data.subscriptionAccess?.status || "Active",
              billingCycle: "Monthly",
              annualFee: 0,
              monthlyFee: 0,
              tripsThisMonth: 0,
              activeCustomers: 0,
              renewalDate: "",
              joinedDate: "",
            };
            setCurrentAgency(agencyObj);
            setAgencies([agencyObj]);
          }

          setSubscriptionAccess(json.data.subscriptionAccess || null);
        }
      }
    } catch (err) {
      console.error("Failed to fetch authoritative session:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchSession();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setCurrentUser(defaultUser);
        setCurrentAgency(defaultAgency);
        setSubscriptionAccess(null);
        setIsLoading(false);
      } else if (event === "SIGNED_IN") {
        fetchSession();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchSession]);

  const updateAgencyStatus = React.useCallback(
    (agencyId: string, status: "Active" | "Trial" | "Suspended") => {
      setAgencies((prev) =>
        prev.map((a) => (a.id === agencyId ? { ...a, planStatus: status } : a))
      );
      toast.success(`Agency status updated to ${status}`);
    },
    []
  );

  const registerAgency = React.useCallback(
    (data: Partial<AgencyAccount>) => {
      const newAgency: AgencyAccount = {
        id: `agency-${Date.now()}`,
        name: data.name || "New Agency",
        email: data.email || "",
        phone: data.phone || "",
        city: data.city || "",
        plan: data.plan || "Starter",
        planStatus: data.planStatus || "Trial",
        billingCycle: data.billingCycle || "Monthly",
        annualFee: data.annualFee || 0,
        monthlyFee: data.monthlyFee || 0,
        tripsThisMonth: 0,
        activeCustomers: 0,
        renewalDate: new Date().toISOString().split("T")[0],
        joinedDate: new Date().toISOString().split("T")[0],
      };
      setAgencies((prev) => [newAgency, ...prev]);
      toast.success(`Agency "${newAgency.name}" registered successfully!`);
      return newAgency;
    },
    []
  );

  const logout = React.useCallback(async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    } catch (err) {
      console.error("Error signing out:", err);
    } finally {
      setCurrentUser(defaultUser);
      setCurrentAgency(defaultAgency);
      setSubscriptionAccess(null);
      toast.success("Signed out successfully.");
      // Full page redirect to purge Next.js client router cache
      window.location.href = "/login";
    }
  }, []);

  const isPlatformOwner =
    currentUser.role === "PLATFORM_OWNER" || currentUser.role === "TRIPDESK_OWNER";
  const isAgencyOwner = currentUser.role === "AGENCY_OWNER" && !isPlatformOwner;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentAgency,
        agencies,
        subscriptionAccess,
        isLoading,
        isPlatformOwner,
        isAgencyOwner,
        updateAgencyStatus,
        registerAgency,
        logout,
        refreshAuth: fetchSession,
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
