import { ComponentsInfiniteScroll } from "@/components/components-infinite-scroll";
import { Container } from "@/components/container";
import { Framework } from "@/utils/config";

import {
  getAllPublicChats,
  getComponentsByFramework,
  getMostPopularComponents,
} from "./actions";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search } = await searchParams;
  const searchQuery = search || "";
  return {
    title: searchQuery
      ? `Results for "${searchQuery}" - Public Components - CodeRocket | Tailwind AI`
      : "Public Components - CodeRocket | Tailwind AI Components",
    description: searchQuery
      ? `Discover the latest Tailwind AI components for "${searchQuery}". Browse AI-generated React, Vue, Svelte, Angular, and HTML components created with CodeRocket (formerly Tailwind AI).`
      : "Browse public Tailwind AI components generated with CodeRocket (formerly Tailwind AI). Discover React, Vue, Svelte, Angular, and HTML components created by our community. Free to explore and remix.",
    keywords: [
      "tailwind ai",
      "Tailwind AI",
      "tailwind ai components",
      "public components",
      "ai components",
      "tailwind css components",
      "react components",
      "vue components",
      "svelte components",
      "angular components",
      "html components",
      "tailwind ai generator",
      "CodeRocket",
    ].join(", "),
    openGraph: {
      title: searchQuery
        ? `Results for "${searchQuery}" - Public Components - CodeRocket`
        : "Public Components - CodeRocket | Tailwind AI",
      description: searchQuery
        ? `Discover the latest Tailwind AI components for "${searchQuery}".`
        : "Browse public Tailwind AI components generated with CodeRocket. Discover React, Vue, Svelte, Angular, and HTML components.",
      url: "https://www.coderocket.app/components",
    },
    alternates: {
      canonical: "https://www.coderocket.app/components",
    },
  };
}

export default async function Components({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    frameworks?: string;
    sort?: string;
  }>;
}) {
  const { search, frameworks, sort } = await searchParams;
  const searchQuery = search || "";
  const initialSelectedFrameworks = frameworks
    ? frameworks.split(",").map((framework) => framework as Framework)
    : [];
  const initialSort = (sort === "top" ? "top" : "newest") as "newest" | "top";

  const [
    initialChats,
    reactComponents,
    vueComponents,
    htmlComponents,
    svelteComponents,
    angularComponents,
    mostPopularComponents,
  ] = await Promise.all([
    getAllPublicChats(
      16,
      0,
      initialSort === "top",
      searchQuery,
      initialSelectedFrameworks,
    ),
    getComponentsByFramework(Framework.REACT, 4),
    getComponentsByFramework(Framework.VUE, 4),
    getComponentsByFramework(Framework.HTML, 4),
    getComponentsByFramework(Framework.SVELTE, 4),
    getComponentsByFramework(Framework.ANGULAR, 4),
    getMostPopularComponents(6),
  ]);

  return (
    <Container className="overflow-x-hidden pr-2 sm:pr-11">
      <div className="mb-4 mt-14 flex flex-col items-center justify-center space-y-4">
        <h1 className="text-center text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Browse Public Components
        </h1>
        <h2 className="mb-8 text-center text-lg text-primary sm:text-xl">
          Last Tailwind components generated with AI by our users
        </h2>
      </div>
      <ComponentsInfiniteScroll
        initialChats={initialChats}
        initialSearchQuery={searchQuery}
        initialSelectedFrameworks={initialSelectedFrameworks}
        initialSort={initialSort}
        reactComponents={reactComponents}
        vueComponents={vueComponents}
        htmlComponents={htmlComponents}
        svelteComponents={svelteComponents}
        angularComponents={angularComponents}
        mostPopularComponents={mostPopularComponents}
      />
    </Container>
  );
}
