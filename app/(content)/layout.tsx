import { PropsWithChildren } from "react";

import "@/styles/chrome-bug.css";
import "@/styles/main.css";

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html className="size-full">
      <body className="size-full">{children}</body>
    </html>
  );
}
