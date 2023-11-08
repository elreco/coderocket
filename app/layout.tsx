import SupabaseProvider from "./supabase-provider";

import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar/navbar";

import clsx from "clsx";
import { PropsWithChildren } from "react";
import "styles/main.css";
import { Inter } from "next/font/google";

import { SandPackCSS } from "@/components/sandpack-styles";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const meta = {
  title: "Tailwind AI",
  description: "Create tailwind components using AI.",
  cardImage: "/og.png",
  robots: "follow, index",
  favicon: "/favicon.ico",
  url: "https://subscription-starter.vercel.app",
  type: "website",
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
      className={clsx("h-full bg-slate-50 antialiased", inter.variable)}
    >
      <head>
        <SandPackCSS />
      </head>
      <body>
        <SupabaseProvider>
          <Navbar />
          <main>{children}</main>
          <Footer />
        </SupabaseProvider>
      </body>
    </html>
  );
}
