"use client";

import Hotjar from "@hotjar/browser";
import { useEffect } from "react";

const siteId = 5216030;
const hotjarVersion = 6;

export function HotjarWidget() {
  useEffect(() => {
    Hotjar.init(siteId, hotjarVersion);
  }, []);

  return null;
}
