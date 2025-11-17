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
      <section className="bg-card rounded-lg border p-4">
        <h2 className="mt-0 mb-3 text-xl font-semibold">
          What We&apos;re Working On
        </h2>
        <p className="text-muted-foreground mb-4 text-sm">
          We&apos;d love to hear your feedback! Share your thoughts and{" "}
          <span className="text-foreground font-semibold">get free time</span>{" "}
          added to your subscription as a thank you! 🎉
        </p>

        <div className="bg-muted/50 mb-4 space-y-3 rounded-md p-4">
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
              className="bg-card mt-0 rounded-lg border"
            >
              <AccordionTrigger className="mt-0 px-4 py-3 hover:no-underline data-[state=open]:border-b">
                <div className="flex w-full items-center justify-between gap-4 pr-4 text-left">
                  <span className="font-medium">{item.title}</span>
                  <span className="text-muted-foreground text-xs whitespace-nowrap">
                    {formatDate(item.date)}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground px-4 pt-3 pb-4 text-sm">
                {item.content}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
