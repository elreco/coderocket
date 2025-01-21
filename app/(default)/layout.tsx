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
  title: "Tailwind AI - Effortless AI-Driven Tailwind Component Design",
  metadataBase: new URL("https://www.tailwindai.dev"),
  description:
    "Elevate your web design with Tailwind AI. Harness the power of AI to generate custom, high-quality Tailwind components with ease.",
  cardImage: "https://www.tailwindai.dev/og.png",
  robots: "follow, index",
  favicon: "/favicon.ico",
  url: "https://www.tailwindai.dev",
  type: "website",
  twitter: {
    card: "summary_large_image",
    title: "Tailwind AI - AI-Driven Tailwind Design",
    description:
      "Revolutionize your web development with Tailwind AI. Create unique, AI-optimized Tailwind components for standout web designs.",
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
  const userDetails = await getUserDetails();

  return (
    <html
      lang="en"
      className={cn("dark size-full antialiased", rubik.variable)}
    >
      <body className="size-full bg-background">
        <SidebarProvider defaultOpen={defaultOpen} className="size-full">
          <AppSidebar user={userDetails} />
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
