"use client";
import { Session } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/ui/toaster/use-toast";

import { Container } from "../components/container";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

import { createChat } from "./chats/actions";

interface Props {
  session: Session | null;
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
    await createChat(prompt);
    setLoading(false);
  };

  return (
    <>
      <Container className="flex h-screen items-center justify-center">
        <form
          className="group relative z-10 p-3 border focus-within:shadow-2xl hover:shadow-2xl hover:shadow-zinc-200 focus-within:shadow-zinc-200 transition-all duration-300 bg-gradient-to-r from-white to-gray-50 backdrop-filter backdrop-blur-xl rounded-md flex w-full flex-col items-center justify-center gap-x-0 space-y-5 text-center sm:flex-row sm:gap-x-3 sm:space-y-0 lg:w-1/2 xl:w-1/3"
          onSubmit={handleSubmit}
        >
          <div className="-z-10 absolute right-0 top-0 left-0 bottom-0 bg-hero"></div>
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
