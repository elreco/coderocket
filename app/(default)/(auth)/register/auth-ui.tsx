"use client";
import { SiFacebook, SiGithub, SiGoogle } from "@icons-pack/react-simple-icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

import { register, signInWithOAuth } from "../actions";

export default function AuthUI() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setIsLoading(true);
    const result = await register(formData);
    if (result?.error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.error,
        duration: 5000,
      });
      setIsLoading(false);
      return;
    }
    if (result?.url) {
      toast({
        title: "Registered successfully!",
        description: "An email has been sent to you to verify your account.",
      });
      if (result.url === "/register") {
        router.push(result.url);
      }
      setIsLoading(false);
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
    <form onSubmit={handleRegister}>
      <h1 className="mb-4 text-center text-lg font-medium  sm:text-2xl">
        Register
      </h1>
      <div className="grid gap-4">
        <div className="grid gap-2">
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="full_name">
              Full Name
            </Label>
            <Input
              id="full_name"
              placeholder="John Doe"
              type="text"
              name="full_name"
              autoCapitalize="true"
              autoComplete="full_name"
              autoCorrect="off"
              required
              className="bg-secondary"
            />
          </div>
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
              required
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
              required
              className="bg-secondary"
            />
          </div>
          <Button type="submit" disabled={isLoading} loading={isLoading}>
            {isLoading ? "Creating account..." : "Create my account"}
          </Button>
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
              You already have an account?
            </span>
          </div>
        </div>
        <Link href="/login">
          <Button
            className="flex w-full items-center space-x-2"
            variant="secondary"
            type="button"
          >
            Login
          </Button>
        </Link>
      </div>
    </form>
  );
}
