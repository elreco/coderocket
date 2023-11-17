/* eslint-disable import/order */
import { PropsWithChildren } from "react";

import SupabaseProvider from "./supabase-provider";

import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar/navbar";
import { Analytics } from "@vercel/analytics/react";
import clsx from "clsx";

import "styles/main.css";
import { Inter } from "next/font/google";

import { SandPackCSS } from "@/components/sandpack-styles";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const meta = {
  title: "Tailwind AI",
  metadataBase: new URL("https://www.tailwindai.dev"),
  description: "Create tailwind components using AI.",
  cardImage: "https://www.tailwindai.dev/og.png",
  robots: "follow, index",
  favicon: "/favicon.ico",
  url: "https://www.tailwindai.dev",
  type: "website",
  twitter: {
    card: "summary_large_image",
    title: "Tailwind AI",
    description: "Create tailwind components using AI.",
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
    site_name: meta.title,
  },
  twitter: {
    card: "summary_large_image",
    site: "@vercel",
    title: meta.title,
    description: meta.description,
    cardImage: meta.cardImage,
  },
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html
      lang="en"
      className={clsx("h-full bg-gray-50 antialiased", inter.variable)}
    >
      <head>
        <SandPackCSS />
      </head>
      <body>
        <SupabaseProvider>
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <Footer />
        </SupabaseProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
