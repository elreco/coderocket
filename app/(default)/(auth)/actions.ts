"use server";

import { Provider } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";
import { createOrRetrieveCustomer } from "@/utils/supabase-admin";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    return { error: error.message };
  }

  return { url: "/" };
}

export async function register(formData: FormData) {
  const supabase = await createClient();

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };
  const { error, data: returnedData } = await supabase.auth.signUp(data);

  if (
    returnedData.user?.identities &&
    returnedData.user.identities.length === 0
  ) {
    return {
      error: "User already exists in our database",
    };
  }

  if (error) {
    return { error: error.message };
  }

  // update full name from table users
  if (!returnedData.user?.id) {
    return { error: "" };
  }
  const { error: updateError } = await supabase
    .from("users")
    .update({ full_name: formData.get("full_name") as string })
    .eq("id", returnedData.user.id);

  if (updateError) {
    return { error: updateError.message };
  }

  return { url: "/login" };
}

export async function signInWithEmail(formData: FormData) {
  const supabase = await createClient();
  const data = {
    email: formData.get("email") as string,
    options: {
      shouldCreateUser: false,
    },
  };
  const { error } = await supabase.auth.signInWithOtp(data);
  if (error?.status === 422) {
    return { error: "User with this email does not exist. Please sign up." };
  }
  if (returnedData.user?.id && returnedData.user?.email) {
    await createOrRetrieveCustomer({
      uuid: returnedData.user.id,
      email: returnedData.user.email,
    });
  }
  return { url: "/" };
}

export async function signInWithOAuth(provider: Provider) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `https://www.tailwindai.dev/auth/callback`,
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
    return { error: error.message };
  }
  return { url: "/" };
}
