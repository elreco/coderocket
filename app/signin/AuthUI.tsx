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
            container: { fontFamily: "inter" },
            input: { fontFamily: "inter", background: "white" },
            label: { fontFamily: "inter" },
            loader: { fontFamily: "inter" },
            message: { fontFamily: "inter" },
            anchor: { fontFamily: "inter" },
            button: {
              color: "white",
              background: "#262626",
              fontFamily: "inter",
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
