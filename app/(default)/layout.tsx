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
import { TooltipProvider } from "@/components/ui/tooltip";

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

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html
      lang="en"
      className={clsx("h-full bg-gray-50 antialiased", rubik.variable)}
    >
      <head>
        <SandPackCSS />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(d, w, c) {
                  w.BrevoConversationsID = '66c30f09e1078bbc630253d8';
                  w[c] = w[c] || function() {
                      (w[c].q = w[c].q || []).push(arguments);
                  };
                  var s = d.createElement('script');
                  s.async = true;
                  s.src = 'https://conversations-widget.brevo.com/brevo-conversations.js';
                  if (d.head) d.head.appendChild(s);
              })(document, window, 'BrevoConversations');
            `,
          }}
        ></script>
      </head>
      <TooltipProvider>
        <body className="size-full">
          <Navbar />
          <main className="size-full">{children}</main>
          <Footer />
          <Toaster />
          <Analytics />
        </body>
      </TooltipProvider>
    </html>
  );
}
