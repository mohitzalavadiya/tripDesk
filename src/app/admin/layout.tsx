import * as React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { requirePlatformOwner } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  await requirePlatformOwner();
  return <AppShell>{children}</AppShell>;
}
