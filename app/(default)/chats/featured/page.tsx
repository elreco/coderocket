import ChatCard from "@/components/chat-card";
import { Container } from "@/components/container";

import { getFeaturedChats } from "../actions";

export default async function Featured() {
  const chats = await getFeaturedChats();
  return (
    <Container>
      <h1 className="mb-1 text-lg font-medium text-gray-900 sm:text-left sm:text-2xl">
        Featured Components
      </h1>
      <h2 className="mb-8 text-lg text-gray-700 sm:text-left sm:text-xl">
        Start your projects with our handpicked components, designed to inspire
        creativity and provide seamless integration, high quality, and
        exceptional functionality for outstanding results.
      </h2>
      <div className="grid grid-cols-1 gap-3 pb-20 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {chats?.map((chat) => <ChatCard key={chat.chat_id} chat={chat} />)}
      </div>
    </Container>
  );
}
