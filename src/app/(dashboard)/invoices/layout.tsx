import { redirect } from "next/navigation";

/**
 * Invoices pages are hidden from the UI while preserving original page components, APIs, and data.
 * Redirects any direct server-side navigation under /invoices/* to /dashboard.
 */
export default function InvoicesHiddenLayout() {
  redirect("/dashboard");
}
