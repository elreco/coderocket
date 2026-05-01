import type { Metadata } from "next";
import Link from "next/link";

import { AppFooter } from "@/components/app-footer";
import { Container } from "@/components/container";
import { PageTitle } from "@/components/page-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  buildAppUrl,
  buildDocsUrl,
  cloudUrl,
  discordLink,
  githubRepoUrl,
} from "@/utils/runtime-config";

export const metadata: Metadata = {
  title: "Open Source - CodeRocket Vibe Coding Tool",
  description:
    "Learn how CodeRocket works as an open source vibe coding tool and AI website builder. Explore the self-hosted stack, GitHub repository, integrated builder, Supabase setup, and the managed cloud option.",
  keywords: [
    "coderocket open source",
    "vibe coding tool",
    "open source vibe coding tool",
    "open source ai website builder",
    "self-hosted ai builder",
    "github website builder",
    "next.js supabase open source",
    "tailwind ai open source",
  ],
  openGraph: {
    title: "CodeRocket Open Source Vibe Coding Tool",
    description:
      "Explore the open source CodeRocket stack, self-hosting workflow, GitHub repository, integrated AI builder and demo video.",
    url: buildAppUrl("/open-source"),
  },
  alternates: {
    canonical: buildAppUrl("/open-source"),
  },
};

const stack = [
  "Next.js application for the product, onboarding, generation flows and deployed site management",
  "Integrated builder service for compiling and serving user projects locally or in the cloud",
  "Supabase for auth, database, storage metadata and collaborative product features",
  "Tailwind-first generation workflow with support for React, Vue, Svelte, Angular and HTML",
];

const useCases = [
  "Self-host an AI website builder for your team or agency",
  "Run the managed CodeRocket cloud and upsell advanced workflows",
  "Fork the project to build your own AI component or website generation product",
];

export default function OpenSourcePage() {
  return (
    <Container className="my-2 size-auto pr-2 sm:pr-11">
      <div className="mb-6 flex flex-wrap gap-2">
        <Badge variant="secondary">Open source</Badge>
        <Badge variant="secondary">Self-hostable</Badge>
        <Badge variant="secondary">GitHub + Supabase</Badge>
      </div>

      <PageTitle
        title="CodeRocket Open Source"
        subtitle="An open source vibe coding tool and AI website builder you can self-host, fork, and extend."
      />

      <div className="max-w-4xl space-y-5">
        <p className="text-muted-foreground text-base leading-7">
          CodeRocket is an open source AI website builder and component
          generator focused on production-ready Tailwind workflows. It is built
          to work both as a managed product and as a self-hosted vibe coding
          tool for teams who want full control over the stack. You can run the
          full stack locally, deploy your own self-hosted instance, or use the
          managed cloud at{" "}
          <a
            href={cloudUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            coderocket.app
          </a>
          .
        </p>

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <a href={githubRepoUrl} target="_blank" rel="noopener noreferrer">
              View GitHub Repository
            </a>
          </Button>
          <Button asChild variant="outline">
            <a
              href="https://www.youtube.com/watch?v=vkfCdoFQnAk"
              target="_blank"
              rel="noopener noreferrer"
            >
              Watch Demo Video
            </a>
          </Button>
          <Button asChild variant="outline">
            <a
              href={buildDocsUrl("/")}
              target="_blank"
              rel="noopener noreferrer"
            >
              Read Self-Hosting Docs
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={discordLink} target="_blank" rel="noopener noreferrer">
              Join the Community
            </a>
          </Button>
        </div>
      </div>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold">What you get in the repo</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {stack.map((item) => (
            <div key={item} className="bg-card rounded-lg border p-5">
              <p className="text-muted-foreground leading-7">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="bg-card rounded-lg border p-6">
          <h2 className="text-2xl font-semibold">
            Why the open source version matters
          </h2>
          <p className="text-muted-foreground mt-4 leading-7">
            The open source edition makes it easier for developers to inspect
            the full generation pipeline, customize the builder, adapt the
            domain and deployment logic, and integrate CodeRocket into their own
            product or internal tooling.
          </p>
          <p className="text-muted-foreground mt-4 leading-7">
            If you are evaluating AI website builders, this page is the clearest
            path to understand that CodeRocket is both a managed product and a
            self-hosted codebase built around Next.js, Supabase and an
            integrated builder service, with a stronger vibe coding workflow for
            teams that want speed without losing control.
          </p>
        </div>

        <div className="bg-card rounded-lg border p-6">
          <h2 className="text-2xl font-semibold">Common use cases</h2>
          <ul className="text-muted-foreground mt-4 space-y-3 leading-7">
            {useCases.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-12 bg-card rounded-lg border p-6">
        <h2 className="text-2xl font-semibold">Useful links</h2>
        <div className="mt-4 flex flex-col gap-3 text-sm">
          <Link href="/faq" className="text-primary hover:underline">
            Read the FAQ about self-hosting and the builder
          </Link>
          <Link href="/pricing" className="text-primary hover:underline">
            Compare the self-hosted workflow with the managed cloud
          </Link>
          <a
            href={`${githubRepoUrl}/discussions`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Open a GitHub discussion
          </a>
        </div>
      </section>

      <AppFooter />
    </Container>
  );
}
