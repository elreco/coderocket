"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster/use-toast";

import { signInWithEmail } from "../actions";

export default function AuthUIMagicLink() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setIsLoading(true);
    try {
      await signInWithEmail(formData);
      toast({
        title: "Success",
        description: "Magic link sent successfully!",
      });
      router.push("/login");
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send magic link. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <form onSubmit={handleLogin}>
      <div className="grid gap-6">
        <div className="grid gap-2">
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="email">
              Email
            </Label>
            <Input
              id="email"
              className="!border-gray-300 bg-white !text-gray-900"
              placeholder="name@example.com"
              type="email"
              required
              name="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
            />
          </div>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Loading..." : "Send magic link"}
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="rounded-md bg-gray-900  px-2 text-white">Or</span>
          </div>
        </div>
        <Link href="/login">
          <Button className="w-full" variant="outline" type="button">
            Back to login
          </Button>
        </Link>
      </div>
    </form>
  );
}
