import { z } from "zod";

/**
 * Zod schema for inviting a staff member to an agency.
 * Strictly restricts the invited role to AGENCY_STAFF.
 * Agency owners cannot invite PLATFORM_OWNER or AGENCY_OWNER.
 */
export const createInvitationSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address.")
    .max(255, "Email address is too long."),
  role: z
    .literal("AGENCY_STAFF", {
      error: "Only AGENCY_STAFF role can be assigned through staff invitations.",
    })
    .default("AGENCY_STAFF"),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;

/**
 * Zod schema for revoking an existing pending invitation.
 */
export const revokeInvitationSchema = z.object({
  invitationId: z.string().trim().min(1, "Invitation ID is required."),
});

export type RevokeInvitationInput = z.infer<typeof revokeInvitationSchema>;

/**
 * Zod schema for resending an existing invitation with a fresh token.
 */
export const resendInvitationSchema = z.object({
  invitationId: z.string().trim().min(1, "Invitation ID is required."),
});

export type ResendInvitationInput = z.infer<typeof resendInvitationSchema>;

/**
 * Zod schema for accepting an invitation and setting up a user account.
 */
export const acceptInvitationSchema = z.object({
  token: z
    .string()
    .trim()
    .min(32, "Invalid or malformed invitation token."),
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(100, "Name must not exceed 100 characters."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(100, "Password is too long.")
    .optional(),
});

export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;

/**
 * Zod schema for validating a public invitation token.
 */
export const verifyInvitationSchema = z.object({
  token: z
    .string()
    .trim()
    .min(32, "Invalid or malformed invitation token."),
});

export type VerifyInvitationInput = z.infer<typeof verifyInvitationSchema>;
