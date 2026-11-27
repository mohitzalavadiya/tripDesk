import { redirect } from "next/navigation";

/**
 * Subscription feature retired (Free SaaS conversion).
 * Redirects any direct visits to /subscription to /dashboard.
 */
export default function SubscriptionPage() {
  redirect("/dashboard");
}
