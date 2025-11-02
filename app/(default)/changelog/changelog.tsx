"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

const formatDate = (dateString: string) => {
  const [day, month, year] = dateString.split("/");
  const date = new Date(`${month}/${day}/${year}`);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export default function Changelog({
  futureWork,
  changelog,
}: {
  futureWork: { title: string; content: string }[];
  changelog: { date: string; title: string; content: string }[];
}) {
  return (
    <div className="space-y-2">
      <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 mt-0 text-xl font-semibold">
          What We&apos;re Working On
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          We&apos;d love to hear your feedback! Share your thoughts and{" "}
          <span className="font-semibold text-foreground">get free time</span>{" "}
          added to your subscription as a thank you! 🎉
        </p>

        <div className="mb-4 space-y-3 rounded-md bg-muted/50 p-4">
          {futureWork.map((item, index) => (
            <div key={index} className="text-sm">
              <span className="font-semibold">{item.title}:</span>{" "}
              <span className="text-muted-foreground">{item.content}</span>
            </div>
          ))}
        </div>

        <Button
          id="openChat"
          onClick={() => {
            if (typeof window !== "undefined" && window.openCrispChat) {
              window.openCrispChat();
            }
          }}
        >
          Share your thoughts
        </Button>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Latest Updates</h2>

        <Accordion type="single" collapsible className="space-y-3">
          {changelog.map((item, index) => (
            <AccordionItem
              key={index}
              value={`changelog-${index}`}
              className="mt-0 rounded-lg border bg-card"
            >
              <AccordionTrigger className="mt-0 px-4 py-3 hover:no-underline [&[data-state=open]]:border-b">
                <div className="flex w-full items-center justify-between gap-4 pr-4 text-left">
                  <span className="font-medium">{item.title}</span>
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatDate(item.date)}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-3 text-sm text-muted-foreground">
                {item.content}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
