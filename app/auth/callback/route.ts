import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

// The client you created from the Server-Side Auth instructions
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (data.user?.user_metadata?.full_name && data.user?.id) {
        await supabase
          .from("users")
          .update({ full_name: data.user.user_metadata.full_name })
          .eq("id", data.user.id);
      }
      const forwardedHost = request.headers.get("x-forwarded-host"); // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === "development";
      if (isLocalEnv) {
        revalidatePath(`${origin}${next}`);
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        revalidatePath(`https://${forwardedHost}${next}`);
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        revalidatePath(`${origin}${next}`);
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
