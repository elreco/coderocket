"use client";

import React, { useEffect } from "react";

import { Container } from "@/components/container";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

const Changelog = () => {
  useEffect(() => {
    const openChatButton = document.getElementById("openChat");
    if (openChatButton) {
      openChatButton.addEventListener("click", function () {
        $crisp.push(["do", "chat:open"]);
      });
    }

    return () => {
      if (openChatButton) {
        openChatButton.removeEventListener("click", function () {
          $crisp.push(["do", "chat:open"]);
        });
      }
    };
  }, []);

  return (
    <Container>
      <div className="mx-auto max-w-screen-md p-8">
        {/* What We're Working On */}
        <div className="mb-16">
          <h1 className="mb-1 text-3xl font-bold">
            What We&apos;re Working On
          </h1>
          <div className="space-y-6">
            <p className="mb-6 ">
              We&apos;d love to hear your feedback! Share your thoughts and{" "}
              <b>get free time</b> added to your subscription as a thank you!{" "}
              <b>🎉</b>
            </p>
            <div className="rounded-lg border bg-card">
              <div className="p-4">
                <p className="mb-4">
                  <b>Improving iteration management:</b> We&apos;re working on
                  improving iteration management, including the ability to
                  delete, organize, and manage iterations more easily.
                </p>
                <p className="mb-4">
                  <b>API development:</b> We&apos;re in the process of
                  developing a public API to allow integration with other
                  services.
                </p>
                <p className="mb-4">
                  <b>Contextual prompts:</b> We aim to optimize the inclusion of
                  context within our prompts, enhancing the relevance and
                  customization of generated content.
                </p>
                <p className="mb-4">
                  <b>Prompt design assistance:</b> We&apos;re exploring ways to
                  help users design prompts more easily, possibly through a
                  guided form or interactive buttons.
                </p>
                <p className="mb-4">
                  <b>Preview element selection:</b> We&apos;re working on
                  improving the selection and modification of individual
                  elements in the preview for a more granular editing
                  experience.
                </p>
                <p className="mb-4">
                  <b>My Components space:</b> We plan to introduce a dedicated
                  My Components section, where users can easily access and
                  manage their previously created work.
                </p>
              </div>
            </div>

            <Button id="openChat">Share your thoughts</Button>
          </div>
        </div>

        {/* Changelog */}
        <div className="mb-12">
          <h1 className="mb-1 text-3xl font-bold">Changelog</h1>
          <p className="mb-6">
            Keep track of the latest changes and improvements in our
            application.
          </p>

          <Accordion
            type="single"
            defaultValue="1.2.2"
            className="mt-8 space-y-4"
          >
            <AccordionItem value="1.2.2" className="rounded-lg border bg-card">
              <AccordionTrigger className="flex w-full items-center justify-between p-4 hover:no-underline">
                <div>
                  <span className="font-semibold">January 21, 2025</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="border-t p-4">
                <ul className="list-inside list-disc">
                  <li>
                    <b>Discord Community:</b> Launch of our official Discord
                    server for better communication with our community. Join us
                    on{" "}
                    <a
                      href="https://discord.gg/t7dQgcYJ5t"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline hover:text-primary/80"
                    >
                      Discord
                    </a>{" "}
                    !
                  </li>
                  <li>
                    <b>React Support:</b> Added the ability to generate React
                    components.
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="1.2.1" className="rounded-lg border bg-card">
              <AccordionTrigger className="flex w-full items-center justify-between p-4 hover:no-underline">
                <div>
                  <span className="font-semibold">October 8, 2024</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="border-t p-4">
                <ul className="list-inside list-disc">
                  <li>
                    <b>AI Model Optimization:</b> Our AI model has been further
                    trained and optimized to provide more accurate and efficient
                    results.
                  </li>
                  <li>
                    <b>SVG Display Fixes:</b> Corrected display issues affecting
                    SVG files, ensuring better compatibility and visualization.
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="1.2.0" className="rounded-lg border bg-card">
              <AccordionTrigger className="flex w-full items-center justify-between p-4 hover:no-underline">
                <div>
                  <span className="font-semibold">August 30, 2024</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="border-t p-4">
                <ul className="list-inside list-disc">
                  <li>
                    <b>Preview Enhancements:</b> Improved the real-time preview
                    feature to make it more responsive and reliable.
                  </li>
                  <li>
                    <b>User Communication:</b> Implemented an automated system
                    for sending users updates and communication emails.
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="1.1.1" className="rounded-lg border bg-card">
              <AccordionTrigger className="flex w-full items-center justify-between p-4 hover:no-underline">
                <div>
                  <span className="font-semibold">June 15, 2024</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="border-t p-4">
                <ul className="list-inside list-disc">
                  <li>
                    <b>Bug Fixes:</b> Resolved issues related to user
                    registration for a smoother sign-up process.
                  </li>
                  <li>
                    <b>Authentication Improvements:</b> Fixed multiple issues
                    related to the user authentication flow to ensure seamless
                    login experiences.
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="1.1.0" className="rounded-lg border bg-card">
              <AccordionTrigger className="flex w-full items-center justify-between p-4 hover:no-underline">
                <div>
                  <span className="font-semibold">April 2, 2024</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="border-t p-4">
                <ul className="list-inside list-disc">
                  <li>
                    <b>Improved Performance:</b> Significant improvements to app
                    loading times and overall performance.
                  </li>
                  <li>
                    <b>Minor Bug Fixes:</b> Addressed several minor bugs to
                    enhance app stability and usability.
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="1.0.0" className="rounded-lg border bg-card">
              <AccordionTrigger className="flex w-full items-center justify-between p-4 hover:no-underline">
                <div>
                  <span className="font-semibold">January 1, 2024</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="border-t p-4">
                <ul className="list-inside list-disc">
                  <li>
                    <b>Initial Release:</b> The first public release of our
                    tool, allowing users to generate Tailwind CSS code with
                    real-time preview functionality.
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </Container>
  );
};

export default Changelog;
