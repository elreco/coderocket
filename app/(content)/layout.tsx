import { GoogleAnalytics } from "@next/third-parties/google";
import { Plus_Jakarta_Sans } from "next/font/google";
import { PropsWithChildren } from "react";
import "styles/chrome-bug.css";
import "styles/main.css";

import { cn } from "@/lib/utils";
import { gaId } from "@/utils/config";
import { buildAppUrl } from "@/utils/runtime-config";

const rubik = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-rubik",
});

const meta = {
  title: "CodeRocket - Preview",
  description: "Component preview",
  cardImage: buildAppUrl("/og.png"),
  robots: "noindex, nofollow",
  favicon: "/favicon.ico",
};

export const metadata = {
  title: meta.title,
  description: meta.description,
  cardImage: meta.cardImage,
  robots: meta.robots,
  favicon: meta.favicon,
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html className={cn("dark size-full bg-white antialiased", rubik.variable)}>
      <body className="relative size-full bg-white">{children}</body>
      <GoogleAnalytics gaId={gaId} />
    </html>
  );
}
