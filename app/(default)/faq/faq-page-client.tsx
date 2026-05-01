"use client";

import { AppFooter } from "@/components/app-footer";
import { Container } from "@/components/container";
import { PageTitle } from "@/components/page-title";
import {
  buildDocsUrl,
  discordLink,
  githubRepoUrl,
} from "@/utils/runtime-config";

import Faq from "./faq";

export default function FaqPageClient() {
  return (
    <Container className="my-2 size-auto pr-2 sm:pr-11">
      <PageTitle
        title="Frequently Asked Questions"
        subtitle="Everything you need to know about CodeRocket"
      />

      <div className="mb-8">
        <p className="text-muted-foreground text-lg">
          Find answers to common questions about our AI-powered Tailwind website
          builder. Can&apos;t find what you&apos;re looking for? Join the
          community on{" "}
          <a
            href={discordLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Discord
          </a>{" "}
          or open a discussion on{" "}
          <a
            href={`${githubRepoUrl}/discussions`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            GitHub
          </a>
          .
        </p>
      </div>

      <Faq />

      <h2 className="mt-10 text-2xl font-semibold">How It Works</h2>
      <p className=" text-muted-foreground mb-4">
        Watch this quick video to see how CodeRocket helps you build stunning
        Tailwind websites with AI in seconds.
      </p>
      <div className="mt-12 flex w-full flex-col items-start justify-between space-y-4 lg:flex-row lg:space-y-0 lg:space-x-4">
        <div className="w-full lg:w-1/2">
          <div className="bg-card aspect-video overflow-hidden rounded-lg border">
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
          <div className="bg-card rounded-lg border p-4">
            <div className="bg-primary/10 mb-2 flex size-10 items-center justify-center rounded-full">
              <span className="text-primary text-lg font-bold">1</span>
            </div>
            <h4 className="mb-1 font-semibold">Enter Your Prompt</h4>
            <p className="text-muted-foreground text-sm">
              Describe what you want to build with simple text or upload an
              image
            </p>
          </div>

          <div className="bg-card rounded-lg border p-4">
            <div className="bg-primary/10 mb-2 flex size-10 items-center justify-center rounded-full">
              <span className="text-primary text-lg font-bold">2</span>
            </div>
            <h4 className="mb-1 font-semibold">AI Generates Code</h4>
            <p className="text-muted-foreground text-sm">
              Watch as AI creates production-ready Tailwind v4 components
              instantly
            </p>
          </div>

          <div className="bg-card rounded-lg border p-4">
            <div className="bg-primary/10 mb-2 flex size-10 items-center justify-center rounded-full">
              <span className="text-primary text-lg font-bold">3</span>
            </div>
            <h4 className="mb-1 font-semibold">Deploy & Iterate</h4>
            <p className="text-muted-foreground text-sm">
              Copy the code, refine with AI assistance, and deploy to production
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card mt-12 mb-4 rounded-lg border p-6">
        <h3 className="mt-0 mb-3 text-xl font-semibold">
          Still have questions?
        </h3>
        <p className="text-muted-foreground mb-4">
          The community and docs are the best places to get help with
          CodeRocket.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            href={discordLink}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium"
          >
            Join Discord
          </a>
          <a
            href={buildDocsUrl("/")}
            target="_blank"
            rel="noopener noreferrer"
            className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium"
          >
            View Documentation
          </a>
          <a
            href={`${githubRepoUrl}/discussions`}
            target="_blank"
            rel="noopener noreferrer"
            className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium"
          >
            Open Discussion
          </a>
        </div>
      </div>
      <AppFooter />
    </Container>
  );
}
