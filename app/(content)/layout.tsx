"use client";

import { Rubik } from "next/font/google";
import { PropsWithChildren } from "react";
import "styles/chrome-bug.css";
import "styles/main.css";

import { cn } from "@/lib/utils";

const rubik = Rubik({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-rubik",
});

const meta = {
  title: "Tailwind AI - Build Stunning Tailwind Apps with AI",
  metadataBase: new URL("https://www.tailwindai.dev"),
  description:
    "Create high-quality, AI-powered Tailwind applications effortlessly. Tailwind AI simplifies your workflow, generating sleek, responsive designs in seconds.",
  cardImage: "https://www.tailwindai.dev/og.png",
  robots: "index, follow",
  favicon: "/favicon.ico",
  url: "https://www.tailwindai.dev",
  type: "website",
  twitter: {
    card: "summary_large_image",
    title: "Tailwind AI - AI-Powered Tailwind App Builder",
    description:
      "Design and build stunning Tailwind applications with AI. Automate your UI development and create responsive, production-ready apps faster than ever.",
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

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html className={cn("dark size-full antialiased", rubik.variable)}>
      <body className="relative size-full">{children}</body>
    </html>
  );
}
