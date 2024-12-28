import { Database } from "@/types_db";

type Price = Database["public"]["Tables"]["prices"]["Row"];

export const getURL = () => {
  let url =
    process?.env?.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env.
    process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
    "https://www.tailwindai.dev";
  // Make sure to include `https://` when not localhost.
  url = url.includes("http") ? url : `https://${url}`;
  // Make sure to including trailing `/`.
  url = url.charAt(url.length - 1) === "/" ? url : `${url}`;
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
  const t = new Date("1970-01-01T00:30:00Z");
  t.setSeconds(secs);
  return t;
};

export const capitalizeFirstLetter = (
  string: string,
  maxLength: number = 150,
) => {
  if (!string) return "";
  let formattedString =
    string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  if (formattedString.length > maxLength) {
    formattedString = formattedString.substring(0, maxLength) + "...";
  }
  return formattedString;
};
