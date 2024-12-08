import { PropsWithChildren } from "react";

import "styles/main.css";

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html className="dark size-full">
      <head>
        <title>Tailwind AI Content</title>
      </head>
      <body className="size-full">{children}</body>
    </html>
  );
}
