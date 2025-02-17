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
      src={`https://${chatId}-${selectedVersion}.webcontainer.tailwindai.dev`}
      className="size-full border-none"
      sandbox="" // ❌ Supprime toutes les restrictions
      allow="*"
      referrerPolicy="no-referrer"
    />
  );
}
