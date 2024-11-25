import { redirect } from "next/navigation";

import { getURL } from "@/utils/helpers";
import { createClient } from "@/utils/supabase/client";

export async function login(formData: FormData) {
  const supabase = createClient();

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    throw new Error(error.message);
  }
}

export async function register(formData: FormData) {
  const supabase = createClient();

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signUp(data);

  if (error) {
    throw new Error(error.message);
  }

  const { error: loginError } = await supabase.auth.signInWithPassword(data);
  if (loginError) {
    throw new Error(loginError.message);
  }
}

export async function signInWithEmail(formData: FormData) {
  const supabase = createClient();
  const data = {
    email: formData.get("email") as string,
  };
  const { error } = await supabase.auth.signInWithOtp(data);
  if (error) {
    throw new Error(error.message);
  }
}

export async function signInWithGithub() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: `${getURL()}/auth/callback`,
    },
  });
  if (error) {
    throw new Error(error.message);
  }
  if (data.url) {
    redirect(data.url);
  }
}
