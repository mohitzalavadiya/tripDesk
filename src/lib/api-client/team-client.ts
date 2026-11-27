import { AgencyMember, SanitizedInvitation } from "@/lib/services/invitation-service";

export interface TeamDataResponse {
  members: AgencyMember[];
  invitations: SanitizedInvitation[];
}

export interface CreateInvitationResponse {
  invitation: SanitizedInvitation;
  rawToken: string;
}

export class TeamClient {
  async getTeam(): Promise<{ success: boolean; data: TeamDataResponse }> {
    const res = await fetch("/api/team");
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Failed to fetch team data.");
    }
    return json;
  }

  async createInvitation(email: string): Promise<{ success: boolean; data: CreateInvitationResponse }> {
    const res = await fetch("/api/team/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role: "AGENCY_STAFF" }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Failed to create invitation.");
    }
    return json;
  }

  async revokeInvitation(invitationId: string): Promise<{ success: boolean; data: SanitizedInvitation }> {
    const res = await fetch(`/api/team/invitations/${invitationId}/revoke`, {
      method: "POST",
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Failed to revoke invitation.");
    }
    return json;
  }

  async resendInvitation(invitationId: string): Promise<{ success: boolean; data: CreateInvitationResponse }> {
    const res = await fetch(`/api/team/invitations/${invitationId}/resend`, {
      method: "POST",
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Failed to resend invitation.");
    }
    return json;
  }

  async verifyInvitation(token: string): Promise<{
    success: boolean;
    data: {
      valid: boolean;
      reason?: string;
      agencyName?: string;
      email?: string;
      role?: string;
      expiresAt?: string;
    };
    error?: any;
  }> {
    const res = await fetch("/api/team/invitations/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const json = await res.json();
    return json;
  }

  async acceptInvitation(input: {
    token: string;
    name: string;
    password?: string;
  }): Promise<{
    success: boolean;
    data?: {
      user: {
        id: string;
        email: string;
        name: string;
        role: string;
        agencyId: string;
      };
    };
    error?: any;
  }> {
    const res = await fetch("/api/team/invitations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = await res.json();
    return json;
  }
}

export const teamClient = new TeamClient();
