/* eslint-disable import/order */
import { PropsWithChildren } from "react";

import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar/navbar";
import { Analytics } from "@vercel/analytics/react";
import clsx from "clsx";

import "styles/main.css";
import { Rubik } from "next/font/google";

import { SandPackCSS } from "@/components/sandpack-styles";
import { Toaster } from "@/components/ui/toaster";

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
      className={clsx("h-full bg-gray-50 antialiased", rubik.variable)}
    >
      <head>
        <SandPackCSS />
      </head>
      <body className="size-full">
        <Navbar />
        <main className="size-full">{children}</main>
        <Footer />
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
