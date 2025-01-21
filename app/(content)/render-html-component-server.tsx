"use server";

import { ChatFile } from "@/utils/completion-parser";

export default async function RenderHtmlComponentServer({
  files,
  style,
}: {
  files: ChatFile[];
  style?: React.CSSProperties;
}) {
  const initialContent = files[0]?.content || "";

  return (
    <iframe
      srcDoc={initialContent}
      style={style}
      sandbox="allow-scripts"
      className="bg-white"
    />
  );
}
