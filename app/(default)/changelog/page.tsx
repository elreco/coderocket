"use client";

import React, { useState, useEffect } from "react";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";

const Changelog = () => {
  const [openSection, setOpenSection] = useState("1.2.1");

  const toggleAccordion = (version: React.SetStateAction<string>) => {
    setOpenSection(openSection === version ? "" : version);
  };

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
              We’d love to hear your feedback! Share your thoughts and{" "}
              <b>get free time</b> added to your subscription as a thank you! 🎉
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

          <div className=" mt-8 space-y-4">
            {/* Version 1.2.1 (open by default) */}
            <div className="rounded-lg border bg-card">
              <button
                className="flex w-full justify-between border-b p-4"
                onClick={() => toggleAccordion("1.2.1")}
              >
                <span className="font-semibold">Version 1.2.1</span>
                <span className="text-gray-500">2024-10-08</span>
              </button>
              {openSection === "1.2.1" && (
                <div className="border-t p-4">
                  <ul className="list-inside list-disc">
                    <li>
                      <b>AI Model Optimization:</b> Our AI model has been
                      further trained and optimized to provide more accurate and
                      efficient results.
                    </li>
                    <li>
                      <b>SVG Display Fixes:</b> Corrected display issues
                      affecting SVG files, ensuring better compatibility and
                      visualization.
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {/* Version 1.2.0 */}
            <div className="rounded-lg border bg-card">
              <button
                className="flex w-full justify-between border-b p-4"
                onClick={() => toggleAccordion("1.2.0")}
              >
                <span className="font-semibold">Version 1.2.0</span>
                <span className="text-gray-500">2024-08-30</span>
              </button>
              {openSection === "1.2.0" && (
                <div className="border-t p-4">
                  <ul className="list-inside list-disc">
                    <li>
                      <b>Preview Enhancements:</b> Improved the real-time
                      preview feature to make it more responsive and reliable.
                    </li>
                    <li>
                      <b>User Communication:</b> Implemented an automated system
                      for sending users updates and communication emails.
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {/* Version 1.1.1 */}
            <div className="rounded-lg border bg-card">
              <button
                className="flex w-full justify-between border-b p-4"
                onClick={() => toggleAccordion("1.1.1")}
              >
                <span className="font-semibold">Version 1.1.1</span>
                <span className="text-gray-500">2024-06-15</span>
              </button>
              {openSection === "1.1.1" && (
                <div className="border-t p-4">
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
                </div>
              )}
            </div>

            {/* Version 1.1.0 */}
            <div className="rounded-lg border bg-card">
              <button
                className="flex w-full justify-between border-b p-4"
                onClick={() => toggleAccordion("1.1.0")}
              >
                <span className="font-semibold">Version 1.1.0</span>
                <span className="text-gray-500">2024-04-02</span>
              </button>
              {openSection === "1.1.0" && (
                <div className="border-t p-4">
                  <ul className="list-inside list-disc">
                    <li>
                      <b>Improved Performance:</b> Significant improvements to
                      app loading times and overall performance.
                    </li>
                    <li>
                      <b>Minor Bug Fixes:</b> Addressed several minor bugs to
                      enhance app stability and usability.
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {/* Version 1.0.0 */}
            <div className="rounded-lg border bg-card">
              <button
                className="flex w-full justify-between border-b p-4"
                onClick={() => toggleAccordion("1.0.0")}
              >
                <span className="font-semibold">Version 1.0.0</span>
                <span className="text-gray-500">2024-01-01</span>
              </button>
              {openSection === "1.0.0" && (
                <div className="border-t p-4">
                  <ul className="list-inside list-disc">
                    <li>
                      <b>Initial Release:</b> The first public release of our
                      tool, allowing users to generate Tailwind CSS code with
                      real-time preview functionality.
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default Changelog;
