import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/account?github_error=${error}`,
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/account?github_error=missing_params`,
    );
  }

  const supabase = await createClient();

  // Vérifier que l'utilisateur est connecté et que le state correspond
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user || user.id !== state) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/account?github_error=invalid_state`,
    );
  }

  try {
    // Échanger le code contre un access token
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        }),
      },
    );

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }

    const accessToken = tokenData.access_token;

    // Récupérer les informations utilisateur GitHub
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    const githubUser = await userResponse.json();

    if (!githubUser.login) {
      throw new Error("Failed to get GitHub user information");
    }

    // Sauvegarder ou mettre à jour la connexion GitHub
    const { error: dbError } = await supabase.from("github_connections").upsert(
      {
        user_id: user.id,
        github_username: githubUser.login,
        access_token: accessToken, // En production, il faut chiffrer ce token
        connected_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      },
    );

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/account?github_success=true`,
    );
  } catch (error) {
    console.error("GitHub OAuth error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/account?github_error=oauth_failed`,
    );
  }
}
