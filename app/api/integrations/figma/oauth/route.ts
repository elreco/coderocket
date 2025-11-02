import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

const FIGMA_CLIENT_ID = process.env.FIGMA_CLIENT_ID;
const FIGMA_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/figma/callback`
  : "https://stanchlessly-unpossessive-valerie.ngrok-free.dev/api/integrations/figma/callback";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!FIGMA_CLIENT_ID) {
      return NextResponse.json(
        { error: "Figma OAuth not configured" },
        { status: 500 },
      );
    }

    const state = `${user.id}-${Date.now()}`;
    const scope = "current_user:read file_content:read";

    const authUrl = new URL("https://www.figma.com/oauth");
    authUrl.searchParams.append("client_id", FIGMA_CLIENT_ID);
    authUrl.searchParams.append("redirect_uri", FIGMA_REDIRECT_URI);
    authUrl.searchParams.append("scope", scope);
    authUrl.searchParams.append("state", state);
    authUrl.searchParams.append("response_type", "code");

    return NextResponse.json({ authUrl: authUrl.toString() });
  } catch (error) {
    console.error("Error initiating Figma OAuth:", error);
    return NextResponse.json(
      { error: "Failed to initiate Figma OAuth" },
      { status: 500 },
    );
  }
}
