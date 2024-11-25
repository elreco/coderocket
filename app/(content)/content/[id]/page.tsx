import parse from "html-react-parser";

import { fetchChat } from "@/app/(default)/chats/actions";

export default async function Chats({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const fetchedChat = await fetchChat(id);

  const lastCompletionMessage = fetchedChat?.messages
    .slice()
    .reverse()
    .find((message) => message.role === "assistant");

  const updatedContent = parse(lastCompletionMessage?.content || "");
  console.log(updatedContent);
  return updatedContent;
}
