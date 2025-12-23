"use server";

import { createClient } from "@/utils/supabase/server";

export const getExtraMessagesCount = async (userId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("extra_messages")
    .select("count")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return 0;
  }

  return data.count;
};

export const decrementExtraMessagesCount = async (userId: string) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("extra_messages")
    .select("count")
    .eq("user_id", userId)
    .single();

  if (error || !data || data.count <= 0) {
    return false;
  }

  const { error: updateError } = await supabase
    .from("extra_messages")
    .update({
      count: data.count - 1,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return !updateError;
};
