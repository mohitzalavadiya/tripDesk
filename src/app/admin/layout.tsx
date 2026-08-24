import * as React from "react";
import { AppShell } from "@/components/layout/app-shell";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return <AppShell>{children}</AppShell>;
}
