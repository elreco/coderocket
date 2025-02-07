import { Analytics } from "@vercel/analytics/react";
import { Rubik } from "next/font/google";
import { cookies } from "next/headers";
import { PropsWithChildren } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { PluginWidget } from "@/components/plugin-widget";
import "styles/main.css";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { getUserDetails } from "../supabase-server";

const rubik = Rubik({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-rubik",
});

const meta = {
  title: "Tailwind AI - Build Stunning Tailwind Websites with AI",
  metadataBase: new URL("https://www.tailwindai.dev"),
  description:
    "Create high-quality, AI-powered Tailwind websites and components effortlessly. Tailwind AI simplifies your workflow, generating sleek, responsive designs in seconds.",
  cardImage: "https://www.tailwindai.dev/og.png",
  robots: "index, follow",
  favicon: "/favicon.ico",
  url: "https://www.tailwindai.dev",
  type: "website",
  twitter: {
    card: "summary_large_image",
    title: "Tailwind AI - AI-Powered Tailwind App Builder",
    description:
      "Design and build stunning Tailwind websites and components with AI. Automate your UI development and create responsive, production-ready websites faster than ever.",
    images: ["https://www.tailwindai.dev/og.png"],
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
    siteName: "Tailwind AI",
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
    </html>
  );
}
