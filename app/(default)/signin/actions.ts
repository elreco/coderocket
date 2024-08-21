"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getURL } from "@/utils/helpers";
import { createClient } from "@/utils/supabase/server";

export async function login(formData: FormData) {
  const supabase = createClient();

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    redirect("/signin?error=sign-in");
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signup(formData: FormData) {
  const supabase = createClient();

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signUp(data);

  if (error) {
    redirect("/signin?error=sign-up");
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signInWithEmail(formData: FormData) {
  const supabase = createClient();
  const data = {
    email: formData.get("email") as string,
  };
  const { error } = await supabase.auth.signInWithOtp(data);
  if (error) {
    redirect("/signin?error=true");
  }
  revalidatePath("/signin", "layout");
  redirect("/signin?emailSent=true");
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
    redirect("/signin?error=github");
  }
  if (data.url) {
    redirect(data.url);
  }
}
