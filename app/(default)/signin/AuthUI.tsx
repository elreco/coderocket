"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";

import { createClient } from "@/utils/supabase/client";

export default function AuthUI() {
  const supabase = createClient();
  return (
    <div className="flex flex-col space-y-4">
      <Auth
        supabaseClient={supabase}
        providers={["github"]}
        redirectTo={`https://www.tailwindai.dev/auth/callback`}
        magicLink={true}
        appearance={{
          theme: ThemeSupa,
          style: {
            container: { fontFamily: "var(--font-rubik)" },
            input: { fontFamily: "var(--font-rubik)", background: "white" },
            label: { fontFamily: "var(--font-rubik)" },
            loader: { fontFamily: "var(--font-rubik)" },
            message: { fontFamily: "var(--font-rubik)" },
            anchor: { fontFamily: "var(--font-rubik)" },
            button: {
              color: "white",
              background: "#262626",
              fontFamily: "var(--font-rubik)",
            },
          },
          variables: {
            default: {
              colors: {
                brand: "#262626",
                brandAccent: "#171717",
              },
            },
          },
        }}
        theme="light"
      />
    </div>
  );
}
