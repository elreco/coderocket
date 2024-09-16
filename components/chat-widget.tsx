"use client";

import { Crisp } from "crisp-sdk-web";
import { useEffect } from "react";

import { createClient } from "@/utils/supabase/client";

export function ChatWidget() {
  const supabase = createClient();
  useEffect(() => {
    const fetchUserData = async () => {
      // Récupère les informations de l'utilisateur connecté
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
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
          Crisp.user.setEmail(authData.user?.email || "");
          Crisp.user.setNickname(userDetails.full_name);
        }
      }
    };

    fetchUserData();
  }, []);

  return null;
}
