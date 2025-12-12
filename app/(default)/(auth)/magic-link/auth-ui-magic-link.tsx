"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthModal } from "@/hooks/use-auth-modal";
import { toast } from "@/hooks/use-toast";

import { signInWithEmail } from "../actions";

interface AuthUIMagicLinkProps {
  redirectTo?: string;
  onSuccess?: () => void;
  showTitle?: boolean;
}

export default function AuthUIMagicLink({
  redirectTo: propRedirectTo,
  onSuccess,
  showTitle = true,
}: AuthUIMagicLinkProps = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo =
    propRedirectTo || searchParams.get("redirect") || undefined;
  const { openLogin } = useAuthModal();
  const isModal = !!onSuccess;

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setIsLoading(true);
    const result = await signInWithEmail(formData);
    if (result?.error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.error,
        duration: 4000,
      });
      setIsLoading(false);
      return;
    }
    if (result?.success || !result?.error) {
      toast({
        title: "Success",
        description: "Magic link sent successfully!",
      });
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
      return;
    }
  };

  const handleBackToLogin = () => {
    if (isModal) {
      openLogin(redirectTo);
    }
  };
  return (
    <form onSubmit={handleLogin}>
      {showTitle && (
        <h1 className="mb-4 text-center text-lg font-medium sm:text-2xl">
          Magic Link
        </h1>
      )}
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
              required
              name="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              className="bg-secondary"
            />
          </div>
          <Button type="submit" disabled={isLoading} loading={isLoading}>
            {isLoading ? "Loading..." : "Send magic link"}
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-secondary rounded-md px-2">Or</span>
          </div>
        </div>
        {isModal ? (
          <Button
            onClick={handleBackToLogin}
            className="w-full"
            variant="outline"
            type="button"
          >
            Back to login
          </Button>
        ) : (
          <Link
            href={`/login${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`}
          >
            <Button className="w-full" variant="outline" type="button">
              Back to login
            </Button>
          </Link>
        )}
      </div>
    </form>
  );
}
