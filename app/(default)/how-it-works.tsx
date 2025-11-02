"use client";
import { motion } from "framer-motion";

import Faq from "@/components/faq";

export default function Video() {
  return (
    <div className="flex h-screen w-full flex-col items-center px-4 py-40 lg:flex-row lg:justify-between">
      <div className="w-full text-center lg:mx-auto lg:w-1/2 lg:pl-10">
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
          className="text-left text-2xl font-bold md:text-4xl lg:text-5xl"
        >
          How CodeRocket AI Website Builder Works
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
          className="mt-8 max-w-2xl text-left text-base md:text-xl"
        >
          Generate production-ready Tailwind v4 components effortlessly with
          simple AI prompts. Iterate seamlessly with real-time previews, use
          vision technology to create components from images, or clone existing
          websites by simply providing a URL. Build complete web applications
          from scratch with support for React, Vue, Svelte, Angular, and HTML,
          ensuring flexibility and innovation in your projects.
        </motion.p>
        <div className="mt-10 w-full text-left">
          <Faq />
        </div>
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
        className="mt-10 w-full bg-transparent pb-20 lg:mx-20 lg:mt-0 lg:w-1/2 lg:pb-0"
      >
        <div className="rounded-lg bg-background">
          <video
            className="aspect-video w-full rounded-lg border"
            controls
            preload="metadata"
            playsInline
            aria-label="CodeRocket AI Website Builder demonstration video"
          >
            <source src="/demo.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      </motion.div>
    </div>
  );
}
