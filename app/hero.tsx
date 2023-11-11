"use client";
import beautify from "js-beautify";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Container } from "../components/container";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { redirect } from "next/navigation";
import { Session } from "@supabase/supabase-js";
import { useToast } from "@/components/ui/toaster/use-toast";

interface Props {
  session: Session | null;
}

async function createGeneration(prompt: string): Promise<any> {
  try {
    const response = await fetch("/api/chats", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      console.log("Failed:", response.status, response.statusText);
      return "";
    }
    const data = await response.json();
    return data[0];
  } catch (error) {
    console.error("There was an error!", error);
    return "";
  }
}

export default function Hero({ session }: Props) {
  const router = useRouter();
  const { toast } = useToast()
  const [prompt, setPrompt] = useState("A beautiful table");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      toast({
        title: "Scheduled: Catch up",
        description: "Friday, February 10, 2023 at 5:57 PM",
      })
      return router.push("/signin");
    }
    const data = await createGeneration(prompt);
    router.push(`/chats/${data.id}`);
  };

  return (
    <>
      <Container className="flex h-screen items-center justify-center">
        <form
          className="mt-2 flex w-full flex-col items-center justify-center space-x-0 space-y-5 px-5 text-center sm:flex-row sm:space-x-3 sm:space-y-0 lg:w-1/2"
          onSubmit={handleSubmit}
        >
          <Input
            placeholder="Start generate a beautiful Tailwind component"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <Button type="submit">Generate</Button>
        </form>
      </Container>
    </>
  );
}
