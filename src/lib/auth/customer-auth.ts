import "server-only";
import { headers, cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export interface AuthenticatedCustomerContext {
  customerId: string;
  agencyId: string;
  customerNumber?: string | null;
  name: string;
  email?: string | null;
  phone: string;
  authMethod: "COOKIE" | "SECURE_TOKEN";
  tokenTripId?: string | null;
}

export interface CustomerAuthOptions {
  /**
   * If specified, allows a SECURE_TOKEN only if it matches this specific tripId.
   */
  tripId?: string;
  /**
   * If true, strictly requires a full customer portal account session (COOKIE),
   * disallowing any token-based access regardless of resource scope.
   */
  requireAccountSession?: boolean;
}

/**
 * Resolves the authenticated customer context from the established session cookie
 * or an active PublicShareLink token (strictly scoped to its associated trip).
 *
 * SECURITY (DISC-02): Unauthenticated request headers (x-customer-id, x-agency-id)
 * are NEVER trusted or evaluated as credentials.
 */
export async function getAuthenticatedCustomer(
  request?: Request,
  options?: CustomerAuthOptions
): Promise<AuthenticatedCustomerContext | null> {
  try {
    // 1. Check customer cookie session (Primary / Account-Wide Access)
    try {
      let sessionCookie: string | undefined;

      // Check request cookie header if request object is provided
      if (request) {
        const cookieHeader = request.headers.get("cookie");
        if (cookieHeader) {
          const match = cookieHeader.match(/(?:^|;\s*)tripdesk_customer_session=([^;]+)/);
          if (match) {
            sessionCookie = decodeURIComponent(match[1]);
          }
        }
      }

      // Check Next.js cookie store
      if (!sessionCookie) {
        try {
          const cookieStore = await cookies();
          sessionCookie = cookieStore.get("tripdesk_customer_session")?.value;
        } catch {
          // Cookie store might not be available in standalone / external contexts
        }
      }

      if (sessionCookie) {
        let parsed: any = null;
        try {
          parsed = JSON.parse(sessionCookie);
        } catch {
          // Malformed JSON - treat as invalid session
          parsed = null;
        }

        if (
          parsed &&
          typeof parsed === "object" &&
          typeof parsed.customerId === "string" &&
          parsed.customerId.trim() !== "" &&
          typeof parsed.agencyId === "string" &&
          parsed.agencyId.trim() !== ""
        ) {
          const customer = await prisma.customer.findFirst({
            where: {
              id: parsed.customerId.trim(),
              agencyId: parsed.agencyId.trim(),
              archivedAt: null,
            },
            select: {
              id: true,
              agencyId: true,
              customerNumber: true,
              name: true,
              email: true,
              phone: true,
            },
          });

          if (customer) {
            return {
              customerId: customer.id,
              agencyId: customer.agencyId,
              customerNumber: customer.customerNumber,
              name: customer.name,
              email: customer.email,
              phone: customer.phone,
              authMethod: "COOKIE",
            };
          }
        }
      }
    } catch {
      // Cookie parsing or lookup error - proceed to token check
    }

    // 2. If a full customer account session is strictly required, stop here.
    if (options?.requireAccountSession) {
      return null;
    }

    // 3. Check Public Share Link token (Narrowly scoped to a specific trip)
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
