"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster/use-toast";

import { login, signup, signInWithGithub } from "./actions";

export default function AuthUI() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      if (error === "github") {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Can't connect with Github, please try again",
          duration: 5000,
        });
        return;
      }
      if (error === "sign-in") {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Can't find your account, Sign Up or try again.",
          duration: 5000,
        });
        return;
      }
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must fill Email and Password",
        duration: 5000,
      });
    }
  });

  return (
    <form>
      <div className="grid gap-6">
        <div className="grid gap-2">
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="email">
              Email
            </Label>
            <Input
              className="!border-gray-300 bg-white !text-gray-900"
              id="email"
              placeholder="name@example.com"
              type="email"
              name="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
            />
          </div>
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="password">
              Password
            </Label>
            <Input
              className="!border-gray-300 bg-white !text-gray-900"
              id="password"
              placeholder="password"
              name="password"
              type="password"
              autoCapitalize="none"
              autoComplete="password"
              autoCorrect="off"
            />
          </div>
          <Button formAction={login}>Sign In</Button>
          <Button className="mb-4" variant="outline" formAction={signup}>
            Sign Up
          </Button>
          <Link href="/signin/magic-link">
            <Button className="w-full" variant="outline" type="button">
              Send magic link
            </Button>
          </Link>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="rounded-md bg-gray-900  px-2 text-white">
              Or continue with
            </span>
          </div>
        </div>
        <Button
          formAction={signInWithGithub}
          variant="outline"
          className="flex items-center space-x-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
            <path d="M9 18c-4.51 2-5-2-7-2" />
          </svg>
          <span>GitHub</span>
        </Button>
      </div>
    </form>
  );
}
