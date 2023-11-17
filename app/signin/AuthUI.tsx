"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";

import { useSupabase } from "@/app/supabase-provider";
import { getURL } from "@/utils/helpers";

export default function AuthUI() {
  const { supabase } = useSupabase();
  return (
    <div className="flex flex-col space-y-4">
      <Auth
        supabaseClient={supabase}
        providers={["github"]}
        redirectTo={`${getURL()}/auth/callback`}
        magicLink={true}
        appearance={{
          theme: ThemeSupa,
          style: {
            container: { fontFamily: "var(--font-inter)" },
            input: { fontFamily: "var(--font-inter)", background: "white" },
            label: { fontFamily: "var(--font-inter)" },
            loader: { fontFamily: "var(--font-inter)" },
            message: { fontFamily: "var(--font-inter)" },
            anchor: { fontFamily: "var(--font-inter)" },
            button: {
              color: "white",
              background: "#262626",
              fontFamily: "var(--font-inter)",
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
