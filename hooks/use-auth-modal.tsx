"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface AuthModalState {
  isOpen: boolean;
  mode: "login" | "signup" | "magic-link" | null;
  redirectTo?: string;
  openLogin: (redirectTo?: string) => void;
  openSignup: (redirectTo?: string) => void;
  openMagicLink: (redirectTo?: string) => void;
  close: () => void;
}

const AuthModalContext = createContext<AuthModalState | undefined>(undefined);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "signup" | "magic-link" | null>(null);
  const [redirectTo, setRedirectTo] = useState<string | undefined>(undefined);

  const openLogin = (redirect?: string) => {
    setRedirectTo(redirect);
    setMode("login");
    setIsOpen(true);
  };

  const openSignup = (redirect?: string) => {
    setRedirectTo(redirect);
    setMode("signup");
    setIsOpen(true);
  };

  const openMagicLink = (redirect?: string) => {
    setRedirectTo(redirect);
    setMode("magic-link");
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setMode(null);
    setRedirectTo(undefined);
  };

  return (
    <AuthModalContext.Provider
      value={{
        isOpen,
        mode,
        redirectTo,
        openLogin,
        openSignup,
        openMagicLink,
        close,
      }}
    >
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (context === undefined) {
    throw new Error("useAuthModal must be used within an AuthModalProvider");
  }
  return context;
}

