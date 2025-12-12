import { GoogleAnalytics } from "@next/third-parties/google";
import { Analytics } from "@vercel/analytics/react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { PropsWithChildren } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { AuthModal } from "@/components/auth-modal";
import { AuthSyncProvider } from "@/components/auth-sync-provider";
import { PluginWidget } from "@/components/plugin-widget";
import "styles/main.css";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthModalProvider } from "@/hooks/use-auth-modal";
import { cn } from "@/lib/utils";
import { gaId } from "@/utils/config";

import { getUserDetails } from "../supabase-server";

const rubik = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-rubik",
});

const meta = {
  title:
    "CodeRocket - Tailwind AI Website Builder | Generate Tailwind Components with AI",
  metadataBase: new URL("https://www.coderocket.app"),
  description:
    "CodeRocket (formerly Tailwind AI) - Build production-ready Tailwind v4 websites and components with AI in seconds. Clone a website from any URL or create experiences from scratch. Generate React, Vue, Svelte, Angular components. Free to start.",
  cardImage: "https://www.coderocket.app/og.png",
  robots: "index, follow",
  favicon: "/favicon.ico",
  url: "https://www.coderocket.app",
  type: "website",
  keywords: [
    "tailwind ai",
    "Tailwind AI",
    "tailwind ai generator",
    "AI website builder",
    "Tailwind CSS generator",
    "AI web development",
    "website builder",
    "Tailwind v4",
    "React components",
    "Vue components",
    "AI code generator",
    "web app builder",
    "responsive design",
    "UI component generator",
    "clone website",
    "AI design tool",
    "frontend development",
    "rapid prototyping",
    "tailwind css ai",
    "tailwind component generator",
  ],
  twitter: {
    card: "summary_large_image",
    title: "CodeRocket - Tailwind AI Website Builder",
    description:
      "Build production-ready Tailwind v4 websites and components with AI. Clone a website from any URL or create from scratch. Support for React, Vue, Svelte, Angular. Deploy instantly.",
    images: ["https://www.coderocket.app/og.png"],
    creator: "@coderocketapp",
    site: "@coderocketapp",
  },
};

export const metadata = {
  metadataBase: new URL("https://www.coderocket.app"),
  title: {
    default: meta.title,
    template: "%s | CodeRocket",
  },
  description: meta.description,
  keywords: meta.keywords,
  authors: [{ name: "CodeRocket", url: "https://www.coderocket.app" }],
  creator: "CodeRocket",
  publisher: "CodeRocket",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: meta.url,
  },
  openGraph: {
    type: meta.type,
    locale: "en_US",
    url: meta.url,
    title: meta.title,
    description: meta.description,
    siteName: "CodeRocket",
    images: [
      {
        url: meta.cardImage,
        width: 1200,
        height: 630,
        alt: "CodeRocket - AI-Powered Tailwind Website Builder",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: meta.twitter.title,
    description: meta.twitter.description,
    images: meta.twitter.images,
    creator: meta.twitter.creator,
    site: meta.twitter.site,
  },
  verification: {
    google: "google-site-verification-code",
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
        <link rel="canonical" href="https://www.coderocket.app" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": "https://www.coderocket.app/#organization",
                  name: "CodeRocket",
                  url: "https://www.coderocket.app",
                  logo: {
                    "@type": "ImageObject",
                    url: "https://www.coderocket.app/logo.png",
                    width: 512,
                    height: 512,
                  },
                  contactPoint: {
                    "@type": "ContactPoint",
                    contactType: "Customer Support",
                    url: "https://www.coderocket.app",
                  },
                },
                {
                  "@type": "WebApplication",
                  "@id": "https://www.coderocket.app/#webapp",
                  name: "CodeRocket",
                  url: "https://www.coderocket.app",
                  description:
                    "CodeRocket (formerly Tailwind AI) - AI-powered website builder that creates production-ready Tailwind v4 websites and components. Build complete web applications from scratch or clone a website from any URL. Deploy instantly.",
                  applicationCategory: "DeveloperApplication",
                  operatingSystem: "Any",
                  browserRequirements:
                    "Requires JavaScript. Chrome, Firefox, Safari, or Edge browser recommended.",
                  offers: [
                    {
                      "@type": "Offer",
                      price: "0",
                      priceCurrency: "USD",
                      name: "Free Plan",
                      description: "Create one component with four versions",
                    },
                    {
                      "@type": "Offer",
                      price: "19",
                      priceCurrency: "USD",
                      name: "Premium Plan",
                      description: "Unlimited components and features",
                      priceSpecification: {
                        "@type": "UnitPriceSpecification",
                        price: "19",
                        priceCurrency: "USD",
                        unitText: "MONTH",
                      },
                    },
                  ],
                  featureList: [
                    "AI-powered Tailwind v4 component generation",
                    "Clone a website from any URL",
                    "Multiple framework support (React, Vue, Svelte, Angular, HTML)",
                    "Responsive design generation",
                    "Real-time code preview",
                    "GitHub integration",
                    "Custom domain support",
                    "Instant deployment",
                    "Image-to-code conversion",
                    "Supabase integration",
                  ],
                },
                {
                  "@type": "WebSite",
                  "@id": "https://www.coderocket.app/#website",
                  url: "https://www.coderocket.app",
                  name: "CodeRocket",
                  publisher: {
                    "@id": "https://www.coderocket.app/#organization",
                  },
                  potentialAction: {
                    "@type": "SearchAction",
                    target: {
                      "@type": "EntryPoint",
                      urlTemplate:
                        "https://www.coderocket.app/components?search={search_term_string}",
                    },
                    "query-input": "required name=search_term_string",
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body className="bg-background size-full overflow-x-hidden">
        <AuthModalProvider>
          <AuthSyncProvider>
            <SidebarProvider defaultOpen={defaultOpen} className="size-full">
              <AppSidebar defaultUser={user} />
              <main className="relative size-full overflow-x-hidden">
                <SidebarTrigger className="fixed z-50 size-12 rounded-none border-none" />
                <TooltipProvider>{children}</TooltipProvider>
              </main>
            </SidebarProvider>
            <PluginWidget />
            <AuthModal />
            <Toaster />
            <Analytics />
          </AuthSyncProvider>
        </AuthModalProvider>
      </body>
      <GoogleAnalytics gaId={gaId} />
    </html>
  );
}
