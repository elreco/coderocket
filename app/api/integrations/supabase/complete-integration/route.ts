import { NextRequest, NextResponse } from "next/server";

import { createUserIntegration } from "@/utils/integrations/integration-helpers";
import {
  IntegrationType,
  SupabaseIntegrationConfig,
} from "@/utils/integrations/types";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, accessToken, refreshToken, expiresAt, userId } = body;

    if (!projectId || !accessToken || !userId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const projectResponse = await fetch(
      `https://api.supabase.com/v1/projects/${projectId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!projectResponse.ok) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch project details" },
        { status: 400 },
      );
    }

    const project = await projectResponse.json();

    const keysResponse = await fetch(
      `https://api.supabase.com/v1/projects/${projectId}/api-keys`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!keysResponse.ok) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch API keys" },
        { status: 400 },
      );
    }

    const keys = await keysResponse.json();
    const anonKey = keys.find(
      (k: { name: string }) => k.name === "anon" || k.name === "anon key",
    )?.api_key;

    if (!anonKey) {
      return NextResponse.json(
        { success: false, error: "No anon key found" },
        { status: 400 },
      );
    }

    const { data: existingIntegrations } = await supabase
      .from("user_integrations")
      .select("id, name")
      .eq("user_id", user.id)
      .eq("integration_type", IntegrationType.SUPABASE);

    const integrationName = `Supabase - ${project.name}`;

    if (existingIntegrations) {
      const duplicate = existingIntegrations.find(
        (integration) => integration.name === integrationName,
      );

      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            error: `You have already connected this Supabase project. Please edit the existing integration instead.`,
          },
          { status: 400 },
        );
      }
    }

    const config: SupabaseIntegrationConfig = {
      projectUrl: `https://${projectId}.supabase.co`,
      anonKey: anonKey,
      accessToken: accessToken,
      refreshToken: refreshToken,
      expiresAt: expiresAt,
      projectId: projectId,
    };

    const result = await createUserIntegration(
      user.id,
      IntegrationType.SUPABASE,
      integrationName,
      config,
    );

    if (!result.success) {
      const errorMessage = result.error?.includes("unique constraint")
        ? "This project is already connected to your account"
        : result.error || "Failed to save integration";

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error completing Supabase integration:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
