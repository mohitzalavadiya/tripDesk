import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { requirePlatformOwner } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  await requirePlatformOwner();
  return <AppShell>{children}</AppShell>;
}
