"use client";
import { SiFacebook, SiGithub, SiGoogle } from "@icons-pack/react-simple-icons";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

import { login, signInWithOAuth } from "../actions";

export default function AuthUI() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await login(formData, redirectTo || undefined);
    if (result?.error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.error,
        duration: 4000,
      });
    }
    if (result?.url) {
      toast({
        title: "Success",
        description: "Logged in successfully!",
      });
      router.push(result.url);
      router.refresh();
      return;
    }

    setIsLoading(false);
  };

  const handleGithubLogin = async () => {
    await signInWithOAuth("github");
  };

  const handleGoogleLogin = async () => {
    await signInWithOAuth("google");
  };

  const handleFacebookLogin = async () => {
    await signInWithOAuth("facebook");
  };

  return (
    <form onSubmit={handleLogin}>
      <h1 className="mb-4 text-center text-lg font-medium sm:text-2xl">
        Login
      </h1>
      {redirectTo && (
        <div className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-800">
          You need to sign in to continue.
        </div>
      )}
      <div className="grid gap-4">
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
            <Button
              className="w-full"
              disabled={isLoading}
              loading={isLoading}
              variant="outline"
              type="button"
            >
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
          <SiGithub className="size-4" />
          <span>GitHub</span>
        </Button>
        <Button
          onClick={handleGoogleLogin}
          variant="secondary"
          type="button"
          disabled={isLoading}
          className="flex items-center space-x-2"
        >
          <SiGoogle className="size-4" />
          <span>Google</span>
        </Button>
        <Button
          onClick={handleFacebookLogin}
          variant="secondary"
          type="button"
          disabled={isLoading}
          className="flex items-center space-x-2"
        >
          <SiFacebook className="size-4" />
          <span>Facebook</span>
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
        <Link
          href={`/register${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`}
        >
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
