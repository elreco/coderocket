import { PropsWithChildren } from "react";

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html style={{ width: "100%", height: "100%" }}>
      <body style={{ width: "100%", height: "100%" }}>{children}</body>
    </html>
  );
}
