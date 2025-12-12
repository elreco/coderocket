"use server";

import { Provider } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getClientIp } from "@/utils/client-ip";
import { isTemporaryEmailDomain, normalizeEmail } from "@/utils/helpers";
import { createClient } from "@/utils/supabase/server";
import { createOrRetrieveCustomer } from "@/utils/supabase-admin";

export async function login(formData: FormData, redirectTo?: string) {
  const supabase = await createClient();

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function register(formData: FormData, redirectTo?: string) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (isTemporaryEmailDomain(email)) {
    return {
      error:
        "Temporary emails are not allowed. Please use your primary email address.",
    };
  }

  const normalizedEmail = normalizeEmail(email);
  const { data: existingUsers } = await supabase
    .from("users")
    .select("email")
    .ilike("email", normalizedEmail);

  if (existingUsers && existingUsers.length > 0) {
    return {
      error: "An account with this email already exists.",
    };
  }

  /* const clientIp = getClientIp(headersList as unknown as Headers);

  if (clientIp) {
    const { data: usersWithSameIp, error: ipLookupError } = await supabase
      .from("users")
      .select("id")
      .eq("ip_address", clientIp);

    if (ipLookupError) {
      console.error("Error checking IP:", ipLookupError);
    } else if (
      usersWithSameIp &&
      usersWithSameIp.length >= MAX_ACCOUNTS_PER_IP
    ) {
      return {
        error:
          "Too many accounts have been created from this IP address. Please contact support.",
      };
    }
  } */

  const data = {
    email,
    password,
  };
  const { error, data: returnedData } = await supabase.auth.signUp(data);

  if (
    returnedData.user?.identities &&
    returnedData.user.identities.length === 0
  ) {
    return {
      error:
        "An account with this email address already exists. Try with another email.",
    };
  }

  if (error) {
    console.error("Error registering user:", error);
    return { error: error.message };
  }

  if (!returnedData.user?.id) {
    console.error("Error registering user:", error);
    return { error: "User not found" };
  }
  try {
    await supabase
      .from("users")
      .update({
        full_name: formData.get("full_name") as string,
      })
      .eq("id", returnedData.user.id);
  } catch (e) {
    console.error(e);
  }

  if (returnedData.user?.id && returnedData.user?.email) {
    await createOrRetrieveCustomer({
      uuid: returnedData.user.id,
      email: returnedData.user.email,
    });
  }

  return { success: true };
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
  return { success: true };
}

export async function signInWithOAuth(provider: Provider) {
  const supabase = await createClient();
  const headersList = headers();

  // Vérifier le nombre d'utilisateurs avec cette IP
  const clientIp = getClientIp(headersList as unknown as Headers);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `https://www.coderocket.app/auth/callback`,
    },
  });
  if (error) {
    redirect("/login?error=" + error.message);
  }

  // Si l'authentification réussit, nous enregistrons l'IP de l'utilisateur
  if (data.url) {
    try {
      // Cette partie est asynchrone et pourrait ne pas avoir le temps de s'exécuter avant la redirection
      // Il faudrait idéalement gérer cela dans le callback de l'authentification OAuth
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.id) {
        await supabase
          .from("users")
          .update({
            ip_address: clientIp,
          })
          .eq("id", userData.user.id);
      }
    } catch (e) {
      console.error("Erreur lors de l'enregistrement de l'IP:", e);
    }

    redirect(data.url);
  }
}

export async function logout() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { error: error.message };
  }
  return { success: true };
}
