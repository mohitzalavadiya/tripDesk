import { redirect } from "next/navigation";

/**
 * Suppliers pages are hidden from the UI while preserving original page components, APIs, and data.
 * Redirects any direct server-side navigation under /suppliers/* to /dashboard.
 */
export default function SuppliersHiddenLayout() {
  redirect("/dashboard");
}
