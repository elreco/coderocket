import { PropsWithChildren } from "react";

import "styles/main.css";

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html>
      <head>
        <title>Tailwind AI Content</title>
      </head>
      <body className="size-full">{children}</body>
    </html>
  );
}
