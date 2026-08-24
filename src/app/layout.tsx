import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/auth-context";
import { SaaSProvider } from "@/context/saas-context";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "TripDesk - Travel Agency SaaS Operating System",
  description: "Modern CRM & Travel Management platform for travel agencies and tour operators.",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AuthProvider>
          <SaaSProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </SaaSProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
