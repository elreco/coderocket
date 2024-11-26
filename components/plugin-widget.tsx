"use client";
import Hotjar from "@hotjar/browser";
import { Crisp } from "crisp-sdk-web";
import { useEffect } from "react";

import { createClient } from "@/utils/supabase/client";

const siteId = 5216030;
const hotjarVersion = 6;

export function PluginWidget() {
  const supabase = createClient();
  useEffect(() => {
    const fetchUserData = async () => {
      // Récupère les informations de l'utilisateur connecté
      const { data: authData } = await supabase.auth.getSession();
      const userId = authData?.session?.user?.id;
      // Initialisation de Crisp avec ton ID
      Crisp.configure("2f740c23-7cfa-40ff-ba55-581ff73c5a67");
      Hotjar.init(siteId, hotjarVersion);
      // Si l'utilisateur est connecté, récupérer les détails supplémentaires
      if (userId) {
        const { data: userDetails } = await supabase
          .from("users")
          .select("*")
          .eq("id", userId)
          .single();
        if (userDetails) {
          Crisp.user.setEmail(authData.session?.user?.email || "");
          if (userDetails.full_name) {
            Crisp.user.setNickname(userDetails.full_name);
          }
          Hotjar.identify(userId, {
            full_name: userDetails?.full_name || "",
            email: authData.session?.user?.email || "",
          });
        }
      }
    };

    fetchUserData();
  });

  return null;
}
