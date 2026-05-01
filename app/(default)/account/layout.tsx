import type { Metadata } from "next";
import { PropsWithChildren } from "react";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function AccountLayout({ children }: PropsWithChildren) {
  return children;
}
