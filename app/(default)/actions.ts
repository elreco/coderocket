"use server";

import { createClient } from "@/utils/supabase/server";

export const getNotification = async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("notification").select("*").single();
  return data;
};
