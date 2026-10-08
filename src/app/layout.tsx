import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/auth-context";
import { SaaSProvider } from "@/context/saas-context";
import { ScrollReset } from "@/components/layout/scroll-reset";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://yourtraveldesk.in";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Your Travel Desk - Travel Agency SaaS Operating System",
    template: "%s | Your Travel Desk",
  },
  description: "Modern CRM & Travel Management platform for travel agencies and tour operators.",
  openGraph: {
    title: "Your Travel Desk - Travel Agency SaaS Operating System",
    description: "Modern CRM & Travel Management platform for travel agencies and tour operators.",
    siteName: "Your Travel Desk",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Your Travel Desk - Travel Agency SaaS Operating System",
    description: "Modern CRM & Travel Management platform for travel agencies and tour operators.",
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ScrollReset />
        <AuthProvider>
          <SaaSProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </SaaSProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
