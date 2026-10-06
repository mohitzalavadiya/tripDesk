import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.tripdesk.io";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/login",
          "/signup",
          "/forgot-password",
          "/reset-password",
          "/verify-email",
        ],
        disallow: [
          "/admin/",
          "/api/",
          "/dashboard/",
          "/customer/",
          "/trip/",
          "/b/",
          "/q/",
          "/trips/",
          "/quotations/",
          "/bookings/",
          "/customers/",
          "/destinations/",
          "/hotels/",
          "/activities/",
          "/vehicles/",
          "/ratesheets/",
          "/finance/",
          "/invoices/",
          "/operations/",
          "/reports/",
          "/feedback/",
          "/referrals/",
          "/suppliers/",
          "/travel-documents/",
          "/subscription/",
          "/settings/",
          "/notifications/",
        ],
      },
    ],
    sitemap: `${baseUrl.replace(/\/$/, "")}/sitemap.xml`,
  };
}
