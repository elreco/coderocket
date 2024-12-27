import React from "react";

import RenderHtmlComponentClient from "./render-html-component-client";

export default function RenderHtmlComponent({
  files,
  style,
}: {
  files: { name: string | null; content: string }[];
  style?: React.CSSProperties;
}) {
  const initialContent = files[0]?.content || "";

  return (
    <RenderHtmlComponentClient
      initialContent={initialContent}
      files={files}
      style={style}
    />
  );
}
