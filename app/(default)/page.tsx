import { getFeaturedChats } from "./chats/actions";
import Hero from "./hero";
import HowItWorks from "./how-it-works";
import Parallax from "./parallax";

export default async function Home() {
  const chats = await getFeaturedChats();
  return (
    <>
      <Hero />
      <Parallax chats={chats} />
      <HowItWorks />
    </>
  );
}
