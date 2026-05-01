import { NextRequest, NextResponse } from "next/server";

import { createUserIntegration } from "@/utils/integrations/integration-helpers";
import {
  IntegrationType,
  FigmaIntegrationConfig,
} from "@/utils/integrations/types";
import { buildAppUrl } from "@/utils/runtime-config";
import { createClient } from "@/utils/supabase/server";

const FIGMA_CLIENT_ID = process.env.FIGMA_CLIENT_ID;
const FIGMA_CLIENT_SECRET = process.env.FIGMA_CLIENT_SECRET;
const FIGMA_REDIRECT_URI = buildAppUrl("/api/integrations/figma/callback");

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

    if (!FIGMA_CLIENT_ID || !FIGMA_CLIENT_SECRET) {
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

    const credentials = Buffer.from(
      `${FIGMA_CLIENT_ID}:${FIGMA_CLIENT_SECRET}`,
    ).toString("base64");

    const tokenResponse = await fetch("https://api.figma.com/v1/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        redirect_uri: FIGMA_REDIRECT_URI,
        code: code,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      return NextResponse.redirect(
        new URL(
          "/account/integrations?error=token_exchange_failed",
          request.url,
        ),
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in, user_id } = tokenData;

    const config: FigmaIntegrationConfig = {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: expires_in ? Date.now() + expires_in * 1000 : undefined,
      userId: user_id,
      features: {
        importDesigns: true,
        exportCode: true,
        syncUpdates: true,
      },
    };

    const userResponse = await fetch("https://api.figma.com/v1/me", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    let integrationName = "Figma Account";
    if (userResponse.ok) {
      const userData = await userResponse.json();
      integrationName = `Figma - ${userData.handle || userData.email || "Account"}`;
    }

    const { data: existingIntegrations } = await supabase
      .from("user_integrations")
      .select("id, name")
      .eq("user_id", user.id)
      .eq("integration_type", IntegrationType.FIGMA);

    if (existingIntegrations) {
      const duplicate = existingIntegrations.find(
        (integration) => integration.name === integrationName,
      );

      if (duplicate) {
        return NextResponse.redirect(
          new URL("/account/integrations?error=already_connected", request.url),
        );
      }
    }

    const result = await createUserIntegration(
      user.id,
      IntegrationType.FIGMA,
      integrationName,
      config,
    );

    if (!result.success) {
      const errorMessage = result.error?.includes("unique constraint")
        ? "already_connected"
        : "save_failed";

      return NextResponse.redirect(
        new URL(
          `/account/integrations?error=${errorMessage}&message=${encodeURIComponent(result.error || "Unknown error")}`,
          request.url,
        ),
      );
    }

    return NextResponse.redirect(
      new URL("/account/integrations?success=figma_connected", request.url),
    );
  } catch (error) {
    console.error("Error in Figma OAuth callback:", error);
    return NextResponse.redirect(
      new URL("/account/integrations?error=callback_failed", request.url),
    );
  }
}
