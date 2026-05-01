import type { Metadata } from "next";

import { buildAppUrl } from "@/utils/runtime-config";

import FaqPageClient from "./faq-page-client";

export const metadata: Metadata = {
  title: "FAQ - CodeRocket Open Source AI Website Builder",
  description:
    "Frequently asked questions about CodeRocket. Learn how the open source AI website builder works, how to self-host it, and how to build production-ready web applications with AI.",
  keywords: [
    "coderocket faq",
    "open source ai builder faq",
    "self-hosted website builder",
    "tailwind ai faq",
    "website builder faq",
  ],
  openGraph: {
    title: "FAQ - CodeRocket Open Source AI Website Builder",
    description:
      "Get answers about CodeRocket, self-hosting, the integrated builder, and AI-powered website generation.",
    url: buildAppUrl("/faq"),
  },
  alternates: {
    canonical: buildAppUrl("/faq"),
  },
};

export default function FaqPage() {
  return <FaqPageClient />;
}
