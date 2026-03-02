"use client";

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

const faqData = [
  {
    question: "What is coderocket.app?",
    answer:
      "coderocket.app is a generative user interface system powered by AI. It generates copy-and-paste friendly HTML code based on Tailwind v4 that people can use in their projects.",
  },
  {
    question: "How does coderocket.app work?",
    answer:
      "It uses AI models to generate code based on simple text prompts. After you submit your prompt, we give an AI-generated user interface. You can copy paste its code, or refine it further. To refine, you can fine tune your creation. When you are ready, you can copy, paste, and ship.",
  },
  {
    question: "What are the limitations without a paid plan?",
    answer:
      "Without a paid plan, generation limits apply and image upload is not available. Upgrade to a paid plan for broader limits and advanced features.",
  },
];

export default function Faq() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqData.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.answer,
              },
            })),
          }),
        }}
      />
      <Accordion type="single" collapsible>
        {faqData.map((faq, index) => (
          <AccordionItem key={`item-${index + 1}`} value={`item-${index + 1}`}>
            <AccordionTrigger>{faq.question}</AccordionTrigger>
            <AccordionContent>
              {index === 0 ? (
                <>
                  coderocket.app is a generative user interface system powered
                  by AI. It generates copy-and-paste friendly HTML code based on{" "}
                  <a
                    className="text-indigo-500 underline hover:text-indigo-900"
                    href="https://tailwindcss.com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Tailwind v4
                  </a>{" "}
                  that people can use in their projects.
                </>
              ) : index === 1 ? (
                <>
                  <p>
                    It uses AI models to generate code based on simple text
                    prompts. After you submit your prompt, we give an
                    AI-generated user interface.
                  </p>
                  <p>
                    You can copy paste its code, or refine it further. To
                    refine, you can fine tune your creation. When you are ready,
                    you can copy, paste, and ship.
                  </p>
                </>
              ) : (
                <p>{faq.answer}</p>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </>
  );
}
