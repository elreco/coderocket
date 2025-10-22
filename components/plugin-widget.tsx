"use client";

import { Crisp } from "crisp-sdk-web";
import { useEffect } from "react";

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
  useEffect(() => {
    const fetchUserData = async () => {
      const { data: authData } = await supabase.auth.getSession();
      const userId = authData?.session?.user?.id;
      Crisp.configure(crispWebsiteId);
      Crisp.chat.hide();

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

      window.openCrispChat = () => {
        Crisp.chat.show();
        setTimeout(() => {
          Crisp.chat.open();
        }, 100);
      };

      window.closeCrispChat = () => {
        Crisp.chat.hide();
      };
    };

    fetchUserData();
  });

  return null;
}
