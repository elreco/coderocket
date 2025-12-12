"use client";

import { Crisp } from "crisp-sdk-web";
import { useEffect, useRef } from "react";

import { crispWebsiteId } from "@/utils/config";
import { createClient } from "@/utils/supabase/client";

declare global {
  interface Window {
    openCrispChat: () => void;
    closeCrispChat: () => void;
  }
}

export function PluginWidget() {
  const supabase = createClient();
  const isConfigured = useRef(false);

  useEffect(() => {
    if (isConfigured.current) return;
    isConfigured.current = true;

    Crisp.configure(crispWebsiteId);
    Crisp.chat.hide();

    const onChatClosed = () => {
      Crisp.chat.hide();
    };
    Crisp.chat.onChatClosed(onChatClosed);

    const fetchUserData = async () => {
      const { data: authData } = await supabase.auth.getSession();
      const userId = authData?.session?.user?.id;

      if (userId) {
        const { data: userDetails } = await supabase
          .from("users")
          .select("*")
          .eq("id", userId)
          .single();
        if (userDetails) {
          const email = authData.session?.user?.email;
          const fullName = userDetails?.full_name;
          if (email) {
            Crisp.user.setEmail(email);
          }
          if (fullName) {
            Crisp.user.setNickname(fullName);
          }
        }
      }
    };

    fetchUserData();

    window.openCrispChat = () => {
      Crisp.chat.show();
      setTimeout(() => {
        Crisp.chat.open();
      }, 100);
    };

    window.closeCrispChat = () => {
      Crisp.chat.hide();
    };
  }, [supabase]);

  return null;
}
