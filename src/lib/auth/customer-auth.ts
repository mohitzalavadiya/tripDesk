import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import "server-only";

export interface AuthenticatedCustomerContext {
  customerId: string;
  agencyId: string;
  customerNumber?: string | null;
  name: string;
  email?: string | null;
  phone: string;
  authMethod: "SECURE_TOKEN";
  tokenTripId?: string | null;
}

export interface CustomerAuthOptions {
  /**
   * If specified, allows a SECURE_TOKEN only if it matches this specific tripId.
   */
  tripId?: string;
  /**
   * If true, strictly requires a full customer portal account session.
   * Since customer accounts and login are retired, this always resolves to null.
   */
  requireAccountSession?: boolean;
}

/**
 * Resolves the authenticated customer context from an active PublicShareLink token
 * (strictly scoped to its associated trip).
 *
 * NOTE: Customer login and customer account sessions are retired per product scope.
 * Stateless guest access is authorized exclusively via active, unrevoked PublicShareLink tokens.
 */
export async function getAuthenticatedCustomer(
  request?: Request,
  options?: CustomerAuthOptions
): Promise<AuthenticatedCustomerContext | null> {
  try {
    // 1. Account-wide sessions are not supported (customer accounts are retired)
    if (options?.requireAccountSession) {
      return null;
    }

    // 2. Check Public Share Link token (Narrowly scoped to a specific trip)
    // Only evaluate token if options.tripId is explicitly provided for a trip-scoped route.
    // Unscoped/account-wide endpoints (profile, all bookings, notifications) cannot be authenticated via token.
    if (options?.tripId) {
      let token: string | null = null;
      if (request) {
        token = request.headers.get("x-customer-token");
        if (!token && "nextUrl" in request) {
          token = (request as any).nextUrl.searchParams.get("token");
        } else if (!token && request.url) {
          try {
            const url = new URL(request.url);
            token = url.searchParams.get("token");
          } catch {}
        }
      }

      if (!token) {
        try {
          const headerStore = await headers();
          token = headerStore.get("x-customer-token");
        } catch {}
      }

      if (token) {
        const trimmed = token.trim();
        const shareLink = await prisma.publicShareLink.findFirst({
          where: {
            tokenHash: trimmed,
            status: "ACTIVE",
            revokedAt: null,
            tripId: options.tripId, // Token MUST match the requested trip!
          },
          include: {
            trip: {
              select: {
                id: true,
                customerId: true,
                agencyId: true,
                customer: {
                  select: {
                    id: true,
                    agencyId: true,
                    customerNumber: true,
                    name: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            },
          },
        });

        if (shareLink?.trip?.customer) {
          return {
            customerId: shareLink.trip.customer.id,
            agencyId: shareLink.trip.customer.agencyId,
            customerNumber: shareLink.trip.customer.customerNumber,
            name: shareLink.trip.customer.name,
            email: shareLink.trip.customer.email,
            phone: shareLink.trip.customer.phone,
            authMethod: "SECURE_TOKEN",
            tokenTripId: shareLink.trip.id,
          };
        }
      }
    }

    return null;
  } catch (err) {
    console.error("Error resolving customer auth context:", err);
    return null;
  }
}

/**
 * Server-side guard: Ensures the customer is authenticated.
 */
export async function requireCustomerAuth(
  request?: Request,
  options?: CustomerAuthOptions
): Promise<AuthenticatedCustomerContext> {
  const auth = await getAuthenticatedCustomer(request, options);
  if (!auth) {
    throw new Error(
      "CUSTOMER_UNAUTHORIZED: Access denied. Please provide a valid customer authentication session."
    );
  }
  return auth;
}
