import { NextRequest, NextResponse } from "next/server";

import { createUserIntegration } from "@/utils/integrations/integration-helpers";
import {
  IntegrationType,
  SupabaseIntegrationConfig,
} from "@/utils/integrations/types";
import { buildAppUrl } from "@/utils/runtime-config";
import { createClient } from "@/utils/supabase/server";

const SUPABASE_OAUTH_CLIENT_ID = process.env.SUPABASE_OAUTH_CLIENT_ID;
const SUPABASE_OAUTH_CLIENT_SECRET = process.env.SUPABASE_OAUTH_CLIENT_SECRET;
const SUPABASE_REDIRECT_URI = buildAppUrl(
  "/api/integrations/supabase/callback",
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code) {
      return NextResponse.redirect(
        new URL("/account/integrations?error=no_code", request.url),
      );
    }

    if (!SUPABASE_OAUTH_CLIENT_ID || !SUPABASE_OAUTH_CLIENT_SECRET) {
      return NextResponse.redirect(
        new URL("/account/integrations?error=not_configured", request.url),
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        new URL("/account/integrations?error=unauthorized", request.url),
      );
    }

    const userId = state?.substring(0, state.lastIndexOf("-"));

    if (userId !== user.id) {
      return NextResponse.redirect(
        new URL("/account/integrations?error=invalid_state", request.url),
      );
    }

    const tokenResponse = await fetch(
      "https://api.supabase.com/v1/oauth/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: SUPABASE_OAUTH_CLIENT_ID,
          client_secret: SUPABASE_OAUTH_CLIENT_SECRET,
          redirect_uri: SUPABASE_REDIRECT_URI,
          code: code,
          grant_type: "authorization_code",
        }),
      },
    );

    if (!tokenResponse.ok) {
      console.error(
        "Failed to exchange code for token:",
        await tokenResponse.text(),
      );
      return NextResponse.redirect(
        new URL(
          "/account/integrations?error=token_exchange_failed",
          request.url,
        ),
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;
    // Calculate expiration timestamp (expires_in is in seconds)
    const expiresAt = expires_in ? Date.now() + expires_in * 1000 : undefined;

    const projectsResponse = await fetch(
      "https://api.supabase.com/v1/projects",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      },
    );

    if (!projectsResponse.ok) {
      console.error("Failed to fetch projects:", await projectsResponse.text());
      return NextResponse.redirect(
        new URL(
          "/account/integrations?error=projects_fetch_failed",
          request.url,
        ),
      );
    }

    const projects = await projectsResponse.json();

    if (!projects || projects.length === 0) {
      return NextResponse.redirect(
        new URL("/account/integrations?error=no_projects", request.url),
      );
    }

    const { data: existingIntegrations } = await supabase
      .from("user_integrations")
      .select("name")
      .eq("user_id", user.id)
      .eq("integration_type", IntegrationType.SUPABASE);

    const existingProjectNames = new Set(
      existingIntegrations?.map((integration) =>
        integration.name.replace("Supabase - ", ""),
      ) || [],
    );

    const availableProjects = projects.filter(
      (project: { name: string }) => !existingProjectNames.has(project.name),
    );

    if (availableProjects.length === 0) {
      return NextResponse.redirect(
        new URL(
          "/account/integrations?error=all_projects_connected",
          request.url,
        ),
      );
    }

    if (availableProjects.length === 1) {
      const projectRef = availableProjects[0].ref || availableProjects[0].id;
      const projectName = availableProjects[0].name;

      const keysResponse = await fetch(
        `https://api.supabase.com/v1/projects/${projectRef}/api-keys`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        },
      );

      if (!keysResponse.ok) {
        console.error("Failed to fetch API keys:", await keysResponse.text());
        return NextResponse.redirect(
          new URL("/account/integrations?error=keys_fetch_failed", request.url),
        );
      }

      const keys = await keysResponse.json();
      const anonKey = keys.find(
        (k: { name: string }) => k.name === "anon" || k.name === "anon key",
      )?.api_key;

      if (!anonKey) {
        return NextResponse.redirect(
          new URL("/account/integrations?error=no_anon_key", request.url),
        );
      }

      const config: SupabaseIntegrationConfig = {
        projectUrl: `https://${projectRef}.supabase.co`,
        anonKey: anonKey,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: expiresAt,
        projectId: projectRef,
      };

      const integrationName = `Supabase - ${projectName}`;

      const result = await createUserIntegration(
        user.id,
        IntegrationType.SUPABASE,
        integrationName,
        config,
      );

      if (!result.success) {
        return NextResponse.redirect(
          new URL(
            `/account/integrations?error=save_failed&message=${encodeURIComponent(result.error || "Unknown error")}`,
            request.url,
          ),
        );
      }

      return NextResponse.redirect(
        new URL(
          "/account/integrations?success=supabase_connected",
          request.url,
        ),
      );
    }

    const tempData = {
      projects: availableProjects,
      access_token,
      refresh_token,
      expiresAt,
      userId: user.id,
      timestamp: Date.now(),
    };

    const encodedData = Buffer.from(JSON.stringify(tempData)).toString(
      "base64url",
    );

    return NextResponse.redirect(
      new URL(
        `/account/integrations/supabase/select?data=${encodedData}`,
        request.url,
      ),
    );
  } catch (error) {
    console.error("Error in Supabase OAuth callback:", error);
    return NextResponse.redirect(
      new URL("/account/integrations?error=callback_failed", request.url),
    );
  }
}
