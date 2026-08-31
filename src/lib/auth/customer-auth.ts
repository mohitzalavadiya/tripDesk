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
  authMethod: "SESSION_HEADER" | "COOKIE" | "SECURE_TOKEN";
}

/**
 * Resolves the authenticated customer context from HTTP headers, cookies, or public token.
 */
export async function getAuthenticatedCustomer(
  request?: Request
): Promise<AuthenticatedCustomerContext | null> {
  try {
    let customerId: string | null = null;
    let agencyId: string | null = null;
    let token: string | null = null;

    // 1. Check custom headers (for API clients, tests, or proxy)
    if (request) {
      customerId = request.headers.get("x-customer-id");
      agencyId = request.headers.get("x-agency-id");
      token = request.headers.get("x-customer-token");
    }

    if (!customerId || !agencyId) {
      try {
        const headerStore = await headers();
        customerId = customerId || headerStore.get("x-customer-id");
        agencyId = agencyId || headerStore.get("x-agency-id");
        token = token || headerStore.get("x-customer-token");
      } catch {
        // Headers might not be available in standalone context
      }
    }

    // 2. Direct Customer ID + Agency ID check
    if (customerId && agencyId) {
      const customer = await prisma.customer.findFirst({
        where: {
          id: customerId,
          agencyId: agencyId,
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
          authMethod: "SESSION_HEADER",
        };
      }
    }

    // 3. Check customer cookie session
    try {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get("tripdesk_customer_session")?.value;
      if (sessionCookie) {
        const parsed = JSON.parse(sessionCookie);
        if (parsed.customerId && parsed.agencyId) {
          const customer = await prisma.customer.findFirst({
            where: {
              id: parsed.customerId,
              agencyId: parsed.agencyId,
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
      // Cookie parsing error - proceed to token check
    }

    // 4. Check Public Share Link or Secure Token
    if (token) {
      const trimmed = token.trim();
      // Try resolving via PublicShareLink
      const shareLink = await prisma.publicShareLink.findFirst({
        where: {
          tokenHash: trimmed,
          status: "ACTIVE",
          revokedAt: null,
        },
        include: {
          trip: {
            select: {
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
        };
      }

      // Try resolving via direct Booking Number or Booking ID
      const booking = await prisma.booking.findFirst({
        where: {
          OR: [{ id: trimmed }, { bookingNumber: trimmed }],
        },
        include: {
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
      });

      if (booking?.customer) {
        return {
          customerId: booking.customer.id,
          agencyId: booking.customer.agencyId,
          customerNumber: booking.customer.customerNumber,
          name: booking.customer.name,
          email: booking.customer.email,
          phone: booking.customer.phone,
          authMethod: "SECURE_TOKEN",
        };
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
  request?: Request
): Promise<AuthenticatedCustomerContext> {
  const auth = await getAuthenticatedCustomer(request);
  if (!auth) {
    throw new Error("CUSTOMER_UNAUTHORIZED: Access denied. Please provide a valid customer authentication session.");
  }
  return auth;
}
