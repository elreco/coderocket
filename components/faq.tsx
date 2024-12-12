"use client";

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

export default function Faq() {
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="item-1">
        <AccordionTrigger>What is tailwindai.dev?</AccordionTrigger>
        <AccordionContent>
          tailwindai.dev is a generative user interface system powered by AI. It
          generates copy-and-paste friendly HTML code based on{" "}
          <a
            className="text-indigo-500 underline hover:text-indigo-900"
            href="https://tailwindcss.com"
            target="_blank"
          >
            Tailwind CSS
          </a>{" "}
          that people can use in their projects.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>How does tailwindai.dev work?</AccordionTrigger>
        <AccordionContent>
          <p>
            {" "}
            It uses AI models to generate code based on simple text prompts.
            After you submit your prompt, we give an AI-generated user
            interface.
          </p>{" "}
          <p>
            You can copy paste its code, or refine it further. To refine, you
            can fine tune your creation. When you are ready, you can copy,
            paste, and ship.
          </p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>How much does it cost?</AccordionTrigger>
        <AccordionContent>
          <p>Check out our this section for more information.</p>{" "}
          <p>
            You can copy paste its code, or refine it further. To refine, you
            can fine tune your creation. When you are ready, you can copy,
            paste, and ship.
          </p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-4">
        <AccordionTrigger>
          What are the limitations of a free account?
        </AccordionTrigger>
        <AccordionContent>
          <p>
            With a free account, you are limited to generating one component
            with four versions, and image use is not permitted. Upgrade to our
            premium plan for unlimited access to all features.
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
