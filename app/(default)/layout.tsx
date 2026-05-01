import { GoogleAnalytics } from "@next/third-parties/google";
import { Analytics } from "@vercel/analytics/react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { PropsWithChildren } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { AuthModal } from "@/components/auth-modal";
import { AuthSyncProvider } from "@/components/auth-sync-provider";
import "styles/main.css";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthModalProvider } from "@/hooks/use-auth-modal";
import { cn } from "@/lib/utils";
import { gaId } from "@/utils/config";
import {
  appUrl,
  buildAppUrl,
  buildDocsUrl,
  discordLink,
  githubRepoUrl,
} from "@/utils/runtime-config";

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
const sourceCodeId = `${baseAppUrl}#source`;
const demoVideoId = "vkfCdoFQnAk";
const demoVideoUrl = `https://www.youtube.com/watch?v=${demoVideoId}`;
const demoVideoEmbedUrl = `https://www.youtube.com/embed/${demoVideoId}`;
const demoVideoIdUrl = `${baseAppUrl}#demo-video`;
const searchUrlTemplate = buildAppUrl(
  "/components?search={search_term_string}",
);
const docsHomeUrl = buildDocsUrl("/");
const sameAsLinks = [githubRepoUrl, docsHomeUrl, discordLink];

const meta = {
  title: "CodeRocket - Open Source Vibe Coding Tool & AI Website Builder",
  metadataBase: new URL(appUrl),
  description:
    "CodeRocket is an open source vibe coding tool and AI website builder. Build production-ready Tailwind v4 websites and UI components with AI, self-host the stack, or use the managed cloud. Generate React, Vue, Svelte, Angular, and HTML experiences in minutes.",
  cardImage: buildAppUrl("/og.png"),
  robots: "index, follow",
  favicon: "/favicon.ico",
  url: baseAppUrl,
  type: "website",
  keywords: [
    "vibe coding tool",
    "open source vibe coding tool",
    "ai vibe coding tool",
    "self-hosted vibe coding tool",
    "tailwind ai",
    "Tailwind AI",
    "tailwind ai generator",
    "AI website builder",
    "open source ai website builder",
    "open source website builder",
    "open source app builder",
    "self-hosted ai builder",
    "self-hosted website builder",
    "github ai website builder",
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
    title: "CodeRocket - Open Source Vibe Coding Tool",
    description:
      "Build and self-host production-ready websites and components with AI. CodeRocket is an open source vibe coding tool for Tailwind, Next.js and Supabase workflows.",
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
        alt: "CodeRocket - Open Source Vibe Coding Tool",
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
                  sameAs: sameAsLinks,
                },
                {
                  "@type": "WebApplication",
                  "@id": webAppId,
                  name: "CodeRocket",
                  url: baseAppUrl,
                  description:
                    "CodeRocket (formerly Tailwind AI) is an open source vibe coding tool and AI website builder that creates production-ready Tailwind v4 websites and components. Build complete web applications from scratch, clone a website from any URL, self-host the stack, or use the managed cloud.",
                  applicationCategory: "DeveloperApplication",
                  applicationSubCategory: "Open Source Vibe Coding Tool",
                  operatingSystem: "Any",
                  browserRequirements:
                    "Requires JavaScript. Chrome, Firefox, Safari, or Edge browser recommended.",
                  isAccessibleForFree: true,
                  downloadUrl: githubRepoUrl,
                  softwareHelp: docsHomeUrl,
                  releaseNotes: buildAppUrl("/changelog"),
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
                    "Open source self-hosted deployment option",
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
                    "Open source vibe coding workflow",
                  ],
                },
                {
                  "@type": "SoftwareSourceCode",
                  "@id": sourceCodeId,
                  name: "CodeRocket Open Source Repository",
                  description:
                    "Open source CodeRocket repository with the Next.js app, integrated builder, self-hosting setup, vibe coding workflow and product code.",
                  codeRepository: githubRepoUrl,
                  license: "https://opensource.org/license/mit/",
                  programmingLanguage: ["TypeScript", "JavaScript"],
                  runtimePlatform: "Node.js",
                  targetProduct: {
                    "@id": webAppId,
                  },
                  url: githubRepoUrl,
                },
                {
                  "@type": "WebSite",
                  "@id": websiteId,
                  url: baseAppUrl,
                  name: "CodeRocket",
                  publisher: {
                    "@id": organizationId,
                  },
                  sameAs: sameAsLinks,
                  potentialAction: {
                    "@type": "SearchAction",
                    target: {
                      "@type": "EntryPoint",
                      urlTemplate: searchUrlTemplate,
                    },
                    "query-input": "required name=search_term_string",
                  },
                },
                {
                  "@type": "VideoObject",
                  "@id": demoVideoIdUrl,
                  name: "CodeRocket demo",
                  description:
                    "Watch CodeRocket, the open source vibe coding tool and AI website builder, generate production-ready websites and UI components.",
                  thumbnailUrl: [meta.cardImage],
                  embedUrl: demoVideoEmbedUrl,
                  contentUrl: demoVideoUrl,
                  publisher: {
                    "@id": organizationId,
                  },
                  isFamilyFriendly: true,
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
