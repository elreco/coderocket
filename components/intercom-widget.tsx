"use client";

import crypto from "crypto";

import Intercom from "@intercom/messenger-js-sdk";
import { useEffect } from "react";

import { createClient } from "@/utils/supabase/client";

const getUnixTimestamp = (date: string) => {
  const dateObject = new Date(date);
  const unixTimestamp = Math.floor(dateObject.getTime() / 1000);
  return unixTimestamp;
};

const secretKey = "xSYqwJF2eAneNZI-o0lPpJArxtNXt8A1ZiidiW85"; // IMPORTANT: your web Identity Verification secret key - keep it safe!

export function IntercomWidget() {
  const supabase = createClient();
  useEffect(() => {
    const fetchUserData = async () => {
      const userData = await supabase.auth.getUser();
      const { data: userDetails } = await supabase
        .from("users")
        .select("*")
        .eq("id", userData.data.user?.id)
        .single();
      let user_hash = "";
      if (userData.data.user?.id) {
        const userIdentifier = userData.data.user?.id.toString();

        user_hash = crypto
          .createHmac("sha256", secretKey)
          .update(userIdentifier)
          .digest("hex");
      }

      Intercom({
        app_id: "lddkt5f9",
        user_id: userData.data.user?.id,
        name: userDetails?.full_name,
        email: userData.data.user?.email,
        created_at: getUnixTimestamp(userDetails?.created_at),
        user_hash,
      });
    };

    fetchUserData();
  }, []);

  return;
}
