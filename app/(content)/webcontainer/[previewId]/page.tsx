"use client";

import { useParams } from "next/navigation";

import { WebContainerRender } from "@/components/webcontainer-render";

export default function WebContainerPreview() {
  const params = useParams();
  const previewId = params.previewId as string;

  return <WebContainerRender previewId={previewId} />;
}
