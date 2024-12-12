"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

import { login, signInWithGithub } from "../actions";

export default function AuthUI() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await login(formData);
    if (result?.error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.error,
        duration: 5000,
      });
    }
    if (result?.url) {
      toast({
        title: "Success",
        description: "Logged in successfully!",
      });
      router.push(result.url);
      return;
    }

    setIsLoading(false);
  };

  const handleGithubLogin = async () => {
    await signInWithGithub();
  };

  return (
    <form onSubmit={handleLogin}>
      <h1 className="mb-4 text-center text-lg font-medium sm:text-2xl">
        Login
      </h1>
      <div className="grid gap-6">
        <div className="grid gap-2">
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="email">
              Email
            </Label>
            <Input
              id="email"
              placeholder="name@gmail.com"
              type="email"
              name="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              className="bg-secondary"
            />
          </div>
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="password">
              Password
            </Label>
            <Input
              id="password"
              placeholder="password"
              name="password"
              type="password"
              autoCapitalize="none"
              autoComplete="password"
              autoCorrect="off"
              className="bg-secondary"
            />
          </div>
          <Button type="submit" disabled={isLoading} loading={isLoading}>
            {isLoading ? "Logging in..." : "Login"}
          </Button>
          <Link href="/magic-link">
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
            <span className="rounded-md bg-secondary px-2">
              Or continue with
            </span>
          </div>
        </div>
        <Button
          onClick={handleGithubLogin}
          variant="secondary"
          type="button"
          disabled={isLoading}
          className="flex items-center space-x-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
            <path d="M9 18c-4.51 2-5-2-7-2" />
          </svg>
          <span>GitHub</span>
        </Button>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="rounded-md bg-secondary px-2">
              You don&apos;t have an account?
            </span>
          </div>
        </div>
        <Link href="/register">
          <Button
            className="flex w-full items-center space-x-2"
            variant="secondary"
            type="button"
          >
            Register
          </Button>
        </Link>
      </div>
    </form>
  );
}
