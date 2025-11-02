"use client";

import { Container } from "@/components/container";
import { PageTitle } from "@/components/page-title";

import Faq from "./faq";

const metadata = {
  title: "FAQ - CodeRocket AI Website Builder",
  description:
    "Frequently asked questions about CodeRocket. Learn about our AI-powered Tailwind website builder, features, pricing, and how to create production-ready web applications.",
  keywords:
    "CodeRocket FAQ, AI builder questions, Tailwind help, how to use CodeRocket, website builder FAQ",
  openGraph: {
    title: "FAQ - CodeRocket AI Website Builder",
    description:
      "Get answers to frequently asked questions about CodeRocket AI-powered Tailwind website builder.",
    url: "https://www.coderocket.app/faq",
  },
  alternates: {
    canonical: "https://www.coderocket.app/faq",
  },
};

export default function FaqPage() {
  if (typeof window !== "undefined") {
    document.title = metadata.title;
  }

  return (
    <Container className="my-2 size-auto pr-2 sm:pr-11">
      <PageTitle
        title="Frequently Asked Questions"
        subtitle="Everything you need to know about CodeRocket"
      />

      <div className="mb-8">
        <p className="text-lg text-muted-foreground">
          Find answers to common questions about our AI-powered Tailwind website
          builder. Can&apos;t find what you&apos;re looking for?{" "}
          <button
            className="text-primary hover:underline"
            onClick={() => {
              if (typeof window !== "undefined" && window.openCrispChat) {
                window.openCrispChat();
              }
            }}
          >
            Contact our support team
          </button>
          .
        </p>
      </div>

      <Faq />

      <h2 className="mt-10 text-2xl font-semibold">How It Works</h2>
      <p className=" mb-4 text-muted-foreground">
        Watch this quick video to see how CodeRocket helps you build stunning
        Tailwind websites with AI in seconds.
      </p>
      <div className="mt-12 flex w-full flex-col items-start justify-between space-y-4 lg:flex-row lg:space-x-4 lg:space-y-0">
        <div className="w-full lg:w-1/2">
          <div className="aspect-video overflow-hidden rounded-lg border bg-card">
            <video
              className="size-full"
              controls
              preload="metadata"
              playsInline
            >
              <source src="/demo.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>

        <div className="flex w-full flex-col gap-4 space-y-4 lg:w-1/2">
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-primary/10">
              <span className="text-lg font-bold text-primary">1</span>
            </div>
            <h4 className="mb-1 font-semibold">Enter Your Prompt</h4>
            <p className="text-sm text-muted-foreground">
              Describe what you want to build with simple text or upload an
              image
            </p>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-primary/10">
              <span className="text-lg font-bold text-primary">2</span>
            </div>
            <h4 className="mb-1 font-semibold">AI Generates Code</h4>
            <p className="text-sm text-muted-foreground">
              Watch as AI creates production-ready Tailwind v4 components
              instantly
            </p>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-primary/10">
              <span className="text-lg font-bold text-primary">3</span>
            </div>
            <h4 className="mb-1 font-semibold">Deploy & Iterate</h4>
            <p className="text-sm text-muted-foreground">
              Copy the code, refine with AI assistance, and deploy to production
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4 mt-12 rounded-lg border bg-card p-6">
        <h3 className="mb-3 mt-0 text-xl font-semibold">
          Still have questions?
        </h3>
        <p className="mb-4 text-muted-foreground">
          Our team is here to help you get the most out of CodeRocket.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            onClick={() => {
              if (typeof window !== "undefined" && window.openCrispChat) {
                window.openCrispChat();
              }
            }}
          >
            Chat with Support
          </button>
          <a
            href="https://docs.coderocket.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            View Documentation
          </a>
        </div>
      </div>
    </Container>
  );
}
