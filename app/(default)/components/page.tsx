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
      ? `Results for "${searchQuery}" - Public Components - CodeRocket`
      : "Public Components - CodeRocket",
    description: searchQuery
      ? `Discover the latest AI components for "${searchQuery}".`
      : "Last Tailwind components generated with AI by our users with React, Vue, and HTML",
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
    initialPopularChats,
    reactComponents,
    vueComponents,
    htmlComponents,
    svelteComponents,
    angularComponents,
    mostPopularComponents,
  ] = await Promise.all([
    getAllPublicChats(
      20,
      0,
      initialSort === "top",
      searchQuery,
      initialSelectedFrameworks,
    ),
    getAllPublicChats(4, 0, true, searchQuery, initialSelectedFrameworks),
    getComponentsByFramework(Framework.REACT, 10),
    getComponentsByFramework(Framework.VUE, 10),
    getComponentsByFramework(Framework.HTML, 10),
    getComponentsByFramework(Framework.SVELTE, 10),
    getComponentsByFramework(Framework.ANGULAR, 10),
    getMostPopularComponents(10),
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
        initialPopularChats={initialPopularChats}
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
