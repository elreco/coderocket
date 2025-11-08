import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

const SUPABASE_OAUTH_CLIENT_ID = process.env.SUPABASE_OAUTH_CLIENT_ID;
const SUPABASE_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/supabase/callback`
  : "https://www.coderocket.app/api/integrations/supabase/callback";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!SUPABASE_OAUTH_CLIENT_ID) {
      return NextResponse.json(
        { error: "Supabase OAuth not configured" },
        { status: 500 },
      );
    }

    const state = `${user.id}-${Date.now()}`;
    const scope = "all";

    const authUrl = new URL("https://api.supabase.com/v1/oauth/authorize");
    authUrl.searchParams.append("client_id", SUPABASE_OAUTH_CLIENT_ID);
    authUrl.searchParams.append("redirect_uri", SUPABASE_REDIRECT_URI);
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("scope", scope);
    authUrl.searchParams.append("state", state);

    return NextResponse.json({ authUrl: authUrl.toString() });
  } catch (error) {
    console.error("Error initiating Supabase OAuth:", error);
    return NextResponse.json(
      { error: "Failed to initiate Supabase OAuth" },
      { status: 500 },
    );
  }
}
