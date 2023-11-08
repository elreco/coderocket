import { redirect } from "next/navigation";

import { getSession } from "@/app/supabase-server";
import Logo from "@/components/icons/logo";

import AuthUI from "./AuthUI";

export default async function SignIn() {
  const session = await getSession();

  if (session) {
    return redirect("/account");
  }

  return (
    <div className="height-screen-helper flex justify-center">
      <div className="m-auto flex w-80 max-w-lg flex-col justify-between p-3 ">
        <div className="flex justify-center pb-12 ">
          <Logo width="64px" height="64px" />
        </div>
        <AuthUI />
      </div>
    </div>
  );
}
