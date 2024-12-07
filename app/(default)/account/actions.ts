import { revalidatePath } from "next/cache";

import { createClient } from "@/utils/supabase/server";

export const getUser = async () => {
  "use server";
  const supabase = await createClient();
  return supabase.auth.getUser();
};

export const updateName = async (formData: FormData) => {
  "use server";
  const supabase = await createClient();
  const newName = formData.get("name") as string;
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  const { error } = await supabase
    .from("users")
    .update({ full_name: newName })
    .eq("id", user?.id || "");
  if (error) {
    console.log(error);
  }
  revalidatePath("/account");
};

export const updateEmail = async (formData: FormData) => {
  "use server";

  const newEmail = formData.get("email") as string;
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) {
    console.log(error);
  }
  revalidatePath("/account");
};
