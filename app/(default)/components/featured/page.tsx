import ComponentCard from "@/components/component-card";
import { Container } from "@/components/container";
import { PageTitle } from "@/components/page-title";

import { getFeaturedChats } from "../actions";

export const metadata = {
  title: `Featured components - Tailwind AI`,
  description:
    "Start your projects with our handpicked components, designed to inspire creativity and provide seamless integration.",
};

export default async function Featured() {
  const chats = await getFeaturedChats();
  return (
    <Container>
      <PageTitle
        title="Featured Components"
        subtitle="Start your projects with our handpicked components"
      />
      <div className="grid grid-cols-1 gap-3 pb-20 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {chats?.map((chat) => <ComponentCard key={chat.chat_id} chat={chat} />)}
      </div>
    </Container>
  );
}
