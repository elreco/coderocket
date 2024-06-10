import { redirect } from "next/navigation";

import Logo from "@/components/icons/logo";
import { createClient } from "@/utils/supabase/server";

import AuthUI from "./AuthUI";

export default async function SignIn() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (userData.user?.id) {
    return redirect("/account");
  }

  return (
    <div className="flex h-screen justify-center">
      <div className="m-auto flex w-80 max-w-lg flex-col justify-between p-3 ">
        <div className="flex justify-center pb-12 ">
          <Logo className="w-16" />
        </div>
        <AuthUI />
      </div>
    </div>
  );
}
