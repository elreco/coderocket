"use client";

import AuthUI from "@/app/(default)/(auth)/login/auth-ui";
import AuthUIMagicLink from "@/app/(default)/(auth)/magic-link/auth-ui-magic-link";
import AuthUISignup from "@/app/(default)/(auth)/register/auth-ui";
import Logo from "@/components/icons/logo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthModal } from "@/hooks/use-auth-modal";

export function AuthModal() {
  const { isOpen, mode, redirectTo, close } = useAuthModal();

  const handleSuccess = () => {
    close();
  };

  const getTitle = () => {
    switch (mode) {
      case "login":
        return "Welcome back";
      case "signup":
        return "Create your account";
      case "magic-link":
        return "Magic link";
      default:
        return "";
    }
  };

  const getDescription = () => {
    switch (mode) {
      case "login":
        return "Sign in to your account to continue";
      case "signup":
        return "Get started with CodeRocket and build amazing components";
      case "magic-link":
        return "Enter your email to receive a secure login link";
      default:
        return "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-left">
          <div className="mb-4 flex items-center gap-3">
            <Logo className="w-10" />
            <div>
              <DialogTitle className="text-2xl font-semibold">
                {getTitle()}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                {getDescription()}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        {mode === "login" && (
          <AuthUI
            redirectTo={redirectTo}
            onSuccess={handleSuccess}
            showTitle={false}
          />
        )}
        {mode === "signup" && (
          <AuthUISignup
            redirectTo={redirectTo}
            onSuccess={handleSuccess}
            showTitle={false}
          />
        )}
        {mode === "magic-link" && (
          <AuthUIMagicLink
            redirectTo={redirectTo}
            onSuccess={handleSuccess}
            showTitle={false}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
