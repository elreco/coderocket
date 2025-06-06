"use server";

import { Tables } from "@/types_db";
import { createClient } from "@/utils/supabase/server";

export async function getGithubConnection(): Promise<Tables<"github_connections"> | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return null;
  }

  const { data, error } = await supabase
    .from("github_connections")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) {
    return null;
  }

  return data;
}

export async function disconnectGithub(): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("github_connections")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function isGithubConnected(): Promise<boolean> {
  const connection = await getGithubConnection();
  return connection !== null;
}
