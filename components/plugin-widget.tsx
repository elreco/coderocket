"use client";
import { Crisp } from "crisp-sdk-web";
import { useEffect } from "react";

import { createClient } from "@/utils/supabase/client";

export function PluginWidget() {
  const supabase = createClient();
  useEffect(() => {
    const fetchUserData = async () => {
      // Récupère les informations de l'utilisateur connecté
      const { data: authData } = await supabase.auth.getSession();
      const userId = authData?.session?.user?.id;
      // Initialisation de Crisp avec ton ID
      Crisp.configure("2f740c23-7cfa-40ff-ba55-581ff73c5a67");
      // Si l'utilisateur est connecté, récupérer les détails supplémentaires
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
  });

  return null;
}
