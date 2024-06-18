"use server";

import { getSubscription } from "@/app/supabase-server";
import { createClient } from "@/utils/supabase/server";

export const changeVisiblity = async (
  isVisible: boolean,
  id: string,
): Promise<void> => {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) throw new Error("Could not get user");
  const subscription = await getSubscription();
  if (!subscription || subscription.status !== "active") {
    throw new Error("payment-required");
  }

  const { error } = await supabase
    .from("chats")
    .update({ is_private: !isVisible })
    .eq("user_id", user.id)
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to update visibility: ${error.message}`);
  }
};
