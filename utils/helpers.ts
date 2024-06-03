import { customAlphabet } from "nanoid";

import { Database } from "@/types_db";

type Price = Database["public"]["Tables"]["prices"]["Row"];

export const getURL = () => {
  let url =
    process?.env?.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env.
    process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
    "http://localhost:3000/";
  // Make sure to include `https://` when not localhost.
  url = url.includes("http") ? url : `https://${url}`;
  // Make sure to including trailing `/`.
  url = url.charAt(url.length - 1) === "/" ? url : `${url}/`;
  return url;
};

export const postData = async ({
  url,
  data,
}: {
  url: string;
  data?: { price: Price };
}) => {
  console.log("posting,", url, data);

  const res = await fetch(url, {
    method: "POST",
    headers: new Headers({ "Content-Type": "application/json" }),
    credentials: "same-origin",
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    console.log("Error in postData", { url, data, res });

    throw Error(res.statusText);
  }

  return res.json();
};

export const toDateTime = (secs: number) => {
  const t = new Date("1970-01-01T00:30:00Z"); // Unix epoch start.
  t.setSeconds(secs);
  return t;
};

export const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  7,
);

export const capitalizeFirstLetter = (string: string) => {
  if (!string) return "";
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
};

export const convertHtmlToJsx = (html: string) => {
  return html
    .replace(/class=/g, "className=")
    .replace(/for=/g, "htmlFor=")
    .replace(/<input(.*?)>/g, "<input$1/>")
    .replace(/<img(.*?)>/g, "<img$1/>")
    .replace(/<br(.*?)>/g, "<br$1/>")
    .replace(/<hr(.*?)>/g, "<hr$1/>")
    .replace(/<meta(.*?)>/g, "<meta$1/>")
    .replace(/<link(.*?)>/g, "<link$1/>")
    .replace(/<\s*script[^>]*>([\s\S]*?)<\s*\/\s*script>/gi, "")
    .replace(
      /on([a-z]+)=/g,
      (match, p1) => `on${p1.charAt(0).toUpperCase() + p1.slice(1)}=`,
    );
};
