import Link from "next/link";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <Container>
      <section className="flex h-full items-center">
        <div className="mx-auto max-w-screen-sm text-center">
          <h1 className="mb-4 text-7xl font-extrabold tracking-tight lg:text-9xl">
            404
          </h1>
          <p className="mb-4 text-3xl font-bold tracking-tight md:text-4xl ">
            Something&apos;s missing.
          </p>
          <p className="mb-4 text-lg font-light text-muted-foreground">
            Sorry, we can&apos;t find that page. You&apos;ll find lots to
            explore on the home page.{" "}
          </p>
          <div className="flex items-center justify-center space-x-2">
            <Link href="/">
              <Button>Return Home</Button>
            </Link>
            <Link href="/components">
              <Button variant="outline">Browse components</Button>
            </Link>
          </div>
        </div>
      </section>
    </Container>
  );
}
