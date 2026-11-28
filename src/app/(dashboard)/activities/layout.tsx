import { redirect } from "next/navigation";

/**
 * Activities pages are hidden from the UI while preserving original page components, APIs, and data.
 * Redirects any direct server-side navigation under /activities/* to /dashboard.
 */
export default function ActivitiesHiddenLayout() {
  redirect("/dashboard");
}
