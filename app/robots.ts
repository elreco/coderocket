import { MetadataRoute } from "next";

import { buildAppUrl } from "@/utils/runtime-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/auth/",
          "/account/",
          "/account/api/",
          "/login",
          "/register",
          "/content/",
          "/webcontainer/",
        ],
      },
      { userAgent: "GPTBot", disallow: "/" },
      { userAgent: "ChatGPT-User", disallow: "/" },
      { userAgent: "CCBot", disallow: "/" },
      { userAgent: "anthropic-ai", disallow: "/" },
      { userAgent: "Claude-Web", disallow: "/" },
      { userAgent: "Google-Extended", disallow: "/" },
    ],
    sitemap: buildAppUrl("/sitemap.xml"),
  };
}
