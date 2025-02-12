"use client";

import { createClient } from "@/utils/supabase/client";

export async function getUserDetails() {
  const supabase = createClient();
  try {
    const { data } = await supabase.auth.getUser();
    if (!data.user?.id) return null;
    const email = data.user.email ?? null;
    const { data: userDetails } = await supabase
      .from("users")
      .select("*")
      .eq("id", data.user.id)
      .single();
    if (!userDetails) return null;
    return { ...userDetails, email };
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}
