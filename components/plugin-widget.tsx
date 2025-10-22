"use client";
import { Crisp } from "crisp-sdk-web";
import { useEffect } from "react";

import { crispWebsiteId } from "@/utils/config";
import { createClient } from "@/utils/supabase/client";

// Fonctions globales pour gérer le chat Crisp
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
      // Récupère les informations de l'utilisateur connecté
      const { data: authData } = await supabase.auth.getSession();
      const userId = authData?.session?.user?.id;
      // Initialisation de Crisp avec ton ID
      Crisp.configure(crispWebsiteId);

      // Masquer le chat par défaut
      Crisp.chat.hide();

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

      // Exposer les fonctions pour gérer le chat
      window.openCrispChat = () => {
        Crisp.chat.show();
        // Ouvrir directement la conversation
        setTimeout(() => {
          Crisp.chat.open();
        }, 100);
      };

      window.closeCrispChat = () => {
        Crisp.chat.hide();
      };

      // Écouter les événements de fermeture du chat
      Crisp.on("chat:closed", () => {
        Crisp.chat.hide();
      });
    };

    fetchUserData();
  });

  return null;
}
