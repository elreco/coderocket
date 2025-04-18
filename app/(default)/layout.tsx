import { GoogleAnalytics } from "@next/third-parties/google";
import { Analytics } from "@vercel/analytics/react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { PropsWithChildren } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { PluginWidget } from "@/components/plugin-widget";
import "styles/main.css";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { gaId } from "@/utils/config";

import { getUserDetails } from "../supabase-server";

const rubik = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-rubik",
});

const meta = {
  title: "CodeRocket - Build Stunning Tailwind Websites with AI",
  metadataBase: new URL("https://www.coderocket.app"),
  description:
    "Create high-quality, AI-powered Tailwind websites and components effortlessly. CodeRocket simplifies your workflow, generating sleek, responsive designs in seconds. Clone existing websites with a URL or build from scratch.",
  cardImage: "https://www.coderocket.app/og.png",
  robots: "index, follow",
  favicon: "/favicon.ico",
  url: "https://www.coderocket.app",
  type: "website",
  twitter: {
    card: "summary_large_image",
    title: "CodeRocket - AI-Powered Tailwind App Builder",
    description:
      "Design and build stunning Tailwind websites and components with AI. Clone existing websites with a URL or create responsive, production-ready websites faster than ever.",
    images: ["https://www.coderocket.app/og.png"],
  },
};

export const metadata = {
  title: meta.title,
  description: meta.description,
  cardImage: meta.cardImage,
  robots: meta.robots,
  favicon: meta.favicon,
  url: meta.url,
  type: meta.type,
  openGraph: {
    url: meta.url,
    title: meta.title,
    description: meta.description,
    cardImage: meta.cardImage,
    type: meta.type,
    siteName: "CodeRocket",
    images: meta.twitter.images,
  },
  twitter: {
    card: "summary_large_image",
    title: meta.title,
    description: meta.description,
    images: meta.twitter.images,
  },
};

export default async function RootLayout({ children }: PropsWithChildren) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar:state")?.value === "true";
  const user = await getUserDetails();

  return (
    <html
      lang="en"
      className={cn("dark size-full antialiased", rubik.className)}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "CodeRocket",
              url: "https://www.coderocket.app",
              description:
                "Create high-quality, AI-powered Tailwind websites and components effortlessly. Clone existing websites with a URL or build from scratch.",
              applicationCategory: "WebDevelopment",
              operatingSystem: "Any",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              featureList: [
                "AI-powered Tailwind component generation",
                "Website cloning from URL",
                "Multiple framework support (React, Vue, HTML)",
                "Responsive design",
              ],
            }),
          }}
        />
      </head>
      <body className="size-full bg-background">
        <SidebarProvider defaultOpen={defaultOpen} className="size-full">
          <AppSidebar defaultUser={user} />
          <main className="relative size-full">
            <SidebarTrigger className="fixed z-50 m-2" />
            <TooltipProvider>{children}</TooltipProvider>
          </main>
        </SidebarProvider>
        <PluginWidget />
        <Toaster />
        <Analytics />
      </body>
      <GoogleAnalytics gaId={gaId} />
    </html>
  );
}
