"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getURL } from "@/utils/helpers";
import { createClient } from "@/utils/supabase/server";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    redirect("/login?error=" + error.message);
  }
  revalidatePath("/", "layout");
  redirect("/");
}

export async function register(formData: FormData) {
  const supabase = await createClient();

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signUp(data);

  if (error) {
    redirect("/register?error=" + error.message);
  }
  revalidatePath("/", "layout");
  redirect("/");
}

export async function signInWithEmail(formData: FormData) {
  const supabase = await createClient();
  const data = {
    email: formData.get("email") as string,
  };
  const { error } = await supabase.auth.signInWithOtp(data);
  if (error) {
    redirect("/login?error=" + error.message);
  }
  revalidatePath("/", "layout");
  redirect("/");
}

export async function signInWithGithub() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: `${getURL()}/auth/callback`,
    },
  });
  if (error) {
    redirect("/login?error=" + error.message);
  }
  if (data.url) {
    redirect(data.url);
  }
}

export async function logout() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    redirect("/?error=" + error.message);
  }
  revalidatePath("/", "layout");
  redirect("/");
}
