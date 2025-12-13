"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

import {
  AuthSyncMessage,
  broadcastAuthEvent,
  onAuthBroadcast,
} from "@/utils/auth-broadcast";
import { createClient } from "@/utils/supabase/client";

export function AuthSyncProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isBroadcasting = useRef<boolean>(false);

  const scheduleRefresh = useCallback(() => {
    setTimeout(() => {
      router.refresh();
    }, 50);
  }, [router]);

  useEffect(() => {
    const supabase = createClient();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (isBroadcasting.current) {
          return;
        }

        if (event === "SIGNED_IN") {
          broadcastAuthEvent("SIGNED_IN");
          scheduleRefresh();
        } else if (event === "SIGNED_OUT") {
          broadcastAuthEvent("SIGNED_OUT");
          router.push("/");
          scheduleRefresh();
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
        scheduleRefresh();
      } catch (error) {
        console.error("Error syncing auth state:", error);
      } finally {
        setTimeout(() => {
          isBroadcasting.current = false;
        }, 100);
      }
    };

    const unsubscribeBroadcast = onAuthBroadcast(handleBroadcastMessage);

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        scheduleRefresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      authListener?.subscription.unsubscribe();
      unsubscribeBroadcast();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [scheduleRefresh, router]);

  return <>{children}</>;
}
