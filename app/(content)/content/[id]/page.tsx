import parse from "html-react-parser";

import { fetchChat } from "@/app/(default)/chats/actions";

export default async function Chats({ params }: { params: { id: string } }) {
  const fetchedChat = await fetchChat(params.id);

  const lastCompletionMessage = fetchedChat?.messages
    .slice()
    .reverse()
    .find((message) => message.role === "assistant");

  const updatedContent = parse(lastCompletionMessage?.content || "");

  return updatedContent;
}
