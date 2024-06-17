"use client";
import { motion } from "framer-motion";
import Link from "next/link";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function Video() {
  return (
    <div className="bg-hero flex h-screen w-full items-center justify-between px-4 pb-40">
      <div className="mx-auto w-1/2 pl-10 text-center">
        <motion.h1
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: [20, -5, 0],
          }}
          transition={{
            duration: 0.5,
            ease: [0.4, 0.0, 0.2, 1],
          }}
          className="text-left text-2xl font-bold  leading-relaxed text-gray-900 md:text-4xl lg:text-5xl lg:leading-snug"
        >
          How it works?
        </motion.h1>
        <motion.p
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: [20, -5, 0],
          }}
          transition={{
            duration: 0.5,
            ease: [0.4, 0.0, 0.2, 1],
          }}
          className="mt-8 max-w-2xl text-left text-base text-gray-900 md:text-xl"
        >
          Generate components effortlessly with simple prompts, iterate
          seamlessly, and use vision technology to create components from
          images, ensuring flexibility and innovation in your projects.
        </motion.p>
        <Accordion type="single" collapsible className="mt-10 w-full text-left">
          <AccordionItem value="item-1">
            <AccordionTrigger>What is tailwindai.dev?</AccordionTrigger>
            <AccordionContent>
              tailwindai.dev is a generative user interface system powered by
              AI. It generates copy-and-paste friendly HTML code based on{" "}
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
                You can copy paste its code, or refine it further. To refine,
                you can fine tune your creation. When you are ready, you can
                copy, paste, and ship.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger>How much does it cost?</AccordionTrigger>
            <AccordionContent>
              <p>
                Check out our{" "}
                <Link
                  className="text-indigo-500 underline hover:text-indigo-900"
                  href="/pricing"
                >
                  pricing page
                </Link>{" "}
                for more information.
              </p>{" "}
              <p>
                You can copy paste its code, or refine it further. To refine,
                you can fine tune your creation. When you are ready, you can
                copy, paste, and ship.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <motion.div
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: [20, -5, 0],
        }}
        transition={{
          duration: 0.5,
          ease: [0.4, 0.0, 0.2, 1],
        }}
        className="mx-20 w-1/2 bg-transparent"
      >
        <div className="rounded-lg bg-white">
          <video
            className="aspect-video rounded-lg border"
            controls
            preload="none"
            autoPlay
            muted
          >
            <source src="/demo.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      </motion.div>
    </div>
  );
}
