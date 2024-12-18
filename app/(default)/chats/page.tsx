import { redirect } from "next/navigation";

export const metadata = {
  title: `Public components - Tailwind AI`,
  description: "Last Tailwind components generated with AI by our users",
};

export default async function Chats() {
  redirect("/components");
}
