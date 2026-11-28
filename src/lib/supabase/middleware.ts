import { createServerClient } from "@supabase/ssr";
import { NextResponse,type NextRequest } from "next/server";
import { normalizeSupabaseUrl } from "./normalize";

/**
 * UI page routes temporarily hidden from user access.
 * Original pages, APIs, services, and database models remain preserved.
 */
export const HIDDEN_PAGE_ROUTES = ["/activities", "/suppliers", "/invoices"] as const;

export function isHiddenPagePath(pathname: string): boolean {
  const normalized =
    pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  return HIDDEN_PAGE_ROUTES.some(
    (route) => normalized === route || normalized.startsWith(`${route}/`)
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!rawUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabaseUrl = normalizeSupabaseUrl(rawUrl);

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Define public routes that unauthenticated users can access
  const isPublicRoute =
    pathname === "/" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/api/health" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/accept-invitation") || // Staff invitation acceptance flow
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/verify-email") ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/q/") || // Public quotation link
    pathname.startsWith("/trip/") || // Public trip portal
    pathname.startsWith("/b/") || // Public booking token
    pathname.startsWith("/customer/") || // Customer self-service portal
    pathname.startsWith("/api/auth") || // Auth callbacks
    pathname.startsWith("/api/trips/public") || // Public trip & feedback endpoints
    pathname.startsWith("/api/quotations/public") || // Public quotation endpoints
    pathname.startsWith("/api/bookings/public") || // Public booking endpoints
    pathname.startsWith("/api/customer/") || // Customer authenticated API
    pathname === "/api/subscription/plans" || // Public subscription plans catalog
    pathname === "/api/team/invitations/verify" || // Public invitation token verification
    pathname === "/api/team/invitations/accept" || // Public invitation onboarding acceptance
    pathname.startsWith("/api/webhooks/"); // Webhook endpoints


  // Handle unauthenticated requests
  if (!user && !isPublicRoute) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required to access this endpoint.",
          },
        },
        { status: 401 }
      );
    }

    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from login/signup to root (which dispatches to /admin or /dashboard by role)
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Prevent direct URL access to hidden pages (/activities, /suppliers, /invoices and nested routes)
  if (user && isHiddenPagePath(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}
