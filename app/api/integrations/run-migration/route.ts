import { NextRequest, NextResponse } from "next/server";

import {
  getChatIntegrations,
  IntegrationType,
  SupabaseIntegrationConfig,
} from "@/utils/integrations";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { chatId, sql, migrationName, messageId } = body;

    if (!chatId || !sql) {
      return NextResponse.json(
        { error: "Chat ID and SQL are required" },
        { status: 400 },
      );
    }

    if (!messageId) {
      return NextResponse.json(
        { error: "Message ID is required" },
        { status: 400 },
      );
    }

    const { data: chat } = await supabase
      .from("chats")
      .select("user_id")
      .eq("id", chatId)
      .single();

    if (!chat || chat.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const chatIntegrations = await getChatIntegrations(chatId);

    const supabaseIntegration = chatIntegrations.find(
      (ci) =>
        ci.user_integrations.integration_type === IntegrationType.SUPABASE,
    );

    if (!supabaseIntegration) {
      return NextResponse.json(
        { error: "No Supabase integration enabled for this chat" },
        { status: 400 },
      );
    }

    const config = supabaseIntegration.user_integrations
      .config as SupabaseIntegrationConfig;

    if (!config.accessToken || !config.projectId) {
      return NextResponse.json(
        {
          error:
            "Supabase Access Token and Project ID required for migrations. Please add them in your Supabase integration settings.",
        },
        { status: 400 },
      );
    }

    try {
      const response = await fetch(
        `https://api.supabase.com/v1/projects/${config.projectId}/database/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: sql }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;

        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }

        return NextResponse.json(
          {
            error: `Migration failed: ${errorData.message || errorData.error || errorText}`,
            details: errorData,
          },
          { status: response.status },
        );
      }

      const result = await response.json();

      await supabase
        .from("messages")
        .update({ migration_executed_at: new Date().toISOString() })
        .eq("id", messageId);

      return NextResponse.json({
        success: true,
        message: "Migration executed successfully",
        migrationName,
        result,
        migrationExecutedAt: new Date().toISOString(),
      });
    } catch (executionError) {
      const errorMessage =
        executionError instanceof Error
          ? executionError.message
          : "Unknown error";

      return NextResponse.json(
        {
          error: `Migration failed: ${errorMessage}`,
          details: executionError,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Error running migration:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to run migration",
      },
      { status: 500 },
    );
  }
}
