import { getAllPublicChats } from "./components/actions";
import Hero from "./hero";

export default async function Home() {
  const popularComponents = await getAllPublicChats(24, 0, true);

  return <Hero popularComponents={popularComponents} />;
}
