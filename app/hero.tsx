"use client";
import { Session } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/ui/toaster/use-toast";

import { Container } from "../components/container";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

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
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (!session) {
      setLoading(false);
      toast({
        variant: "destructive",
        title: "You must Log In",
        description: "Log in to your account to start generate components",
      });
      return router.push("/signin");
    }
    const data = await createGeneration(prompt);
    router.push(`/chats/${data.id}`);
    setLoading(false);
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
            autoFocus
            required
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <Button type="submit" loading={loading}>
            Generate
          </Button>
        </form>
      </Container>
    </>
  );
}
