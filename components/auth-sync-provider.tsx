"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import {
  AuthSyncMessage,
  broadcastAuthEvent,
  onAuthBroadcast,
} from "@/utils/auth-broadcast";
import { createClient } from "@/utils/supabase/client";

export function AuthSyncProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isBroadcasting = useRef<boolean>(false);

  useEffect(() => {
    const supabase = createClient();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (isBroadcasting.current) {
          return;
        }

        if (event === "SIGNED_IN") {
          broadcastAuthEvent("SIGNED_IN");
          router.refresh();
        } else if (event === "SIGNED_OUT") {
          broadcastAuthEvent("SIGNED_OUT");
          router.push("/");
          router.refresh();
        } else if (event === "TOKEN_REFRESHED") {
          broadcastAuthEvent("TOKEN_REFRESHED");
        }
      },
    );

    const handleBroadcastMessage = async (message: AuthSyncMessage) => {
      const { type } = message;

      isBroadcasting.current = true;

      try {
        if (type === "SIGNED_OUT") {
          await supabase.auth.signOut({ scope: "local" });
          router.push("/");
        }
        router.refresh();
      } catch (error) {
        console.error("Error syncing auth state:", error);
      } finally {
        setTimeout(() => {
          isBroadcasting.current = false;
        }, 100);
      }
    };

    const unsubscribeBroadcast = onAuthBroadcast(handleBroadcastMessage);

    return () => {
      authListener?.subscription.unsubscribe();
      unsubscribeBroadcast();
    };
  }, [router]);

  return <>{children}</>;
}
