import { GoogleAnalytics } from "@next/third-parties/google";
import { Analytics } from "@vercel/analytics/react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { PropsWithChildren } from "react";

import { AIDirectoryWidget } from "@/components/ai-directory-widget";
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
import { appUrl, buildAppUrl } from "@/utils/runtime-config";

import { getUserDetails } from "../supabase-server";

const rubik = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-rubik",
});

const googleSiteVerification = process.env.GOOGLE_SITE_VERIFICATION;
const baseAppUrl = buildAppUrl("/");
const organizationId = `${baseAppUrl}#organization`;
const webAppId = `${baseAppUrl}#webapp`;
const websiteId = `${baseAppUrl}#website`;
const searchUrlTemplate = buildAppUrl("/components?search={search_term_string}");

const meta = {
  title:
    "CodeRocket - Open Source AI Website Builder | Generate Tailwind Components with AI",
  metadataBase: new URL(appUrl),
  description:
    "CodeRocket is an open source AI website and component builder. Build production-ready Tailwind v4 websites and UI components with AI, self-host the stack, or use the managed cloud. Generate React, Vue, Svelte, Angular, and HTML experiences in minutes.",
  cardImage: buildAppUrl("/og.png"),
  robots: "index, follow",
  favicon: "/favicon.ico",
  url: baseAppUrl,
  type: "website",
  keywords: [
    "tailwind ai",
    "Tailwind AI",
    "tailwind ai generator",
    "AI website builder",
    "open source ai website builder",
    "open source website builder",
    "self-hosted ai builder",
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
    "supabase",
    "next.js",
  ],
  twitter: {
    card: "summary_large_image",
    title: "CodeRocket - Open Source AI Website Builder",
    description:
      "Build and self-host production-ready websites and components with AI. Generate React, Vue, Svelte, Angular, and HTML with CodeRocket.",
    images: [buildAppUrl("/og.png")],
    creator: "@coderocketapp",
    site: "@coderocketapp",
  },
};

export const metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: meta.title,
    template: "%s | CodeRocket",
  },
  description: meta.description,
  keywords: meta.keywords,
  authors: [{ name: "CodeRocket", url: baseAppUrl }],
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
  ...(googleSiteVerification
    ? {
        verification: {
          google: googleSiteVerification,
        },
      }
    : {}),
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": organizationId,
                  name: "CodeRocket",
                  url: baseAppUrl,
                  logo: {
                    "@type": "ImageObject",
                    url: buildAppUrl("/logo.png"),
                    width: 512,
                    height: 512,
                  },
                  contactPoint: {
                    "@type": "ContactPoint",
                    contactType: "Customer Support",
                    url: baseAppUrl,
                  },
                },
                {
                  "@type": "WebApplication",
                  "@id": webAppId,
                  name: "CodeRocket",
                  url: baseAppUrl,
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
                      name: "Included Access",
                      description: "Create components with baseline limits",
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
                  "@id": websiteId,
                  url: baseAppUrl,
                  name: "CodeRocket",
                  publisher: {
                    "@id": organizationId,
                  },
                  potentialAction: {
                    "@type": "SearchAction",
                    target: {
                      "@type": "EntryPoint",
                      urlTemplate: searchUrlTemplate,
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
            <AIDirectoryWidget />
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
