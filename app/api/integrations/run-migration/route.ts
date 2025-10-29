import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

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
    const { chatId, sql, migrationName } = body;

    if (!chatId || !sql) {
      return NextResponse.json(
        { error: "Chat ID and SQL are required" },
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

    if (!config.serviceRoleKey) {
      return NextResponse.json(
        {
          error:
            "Service role key required for migrations. Please add it in your integration settings.",
        },
        { status: 400 },
      );
    }

    const projectRef = config.projectUrl.match(
      /https:\/\/([^.]+)\.supabase\.co/,
    )?.[1];

    if (!projectRef) {
      return NextResponse.json(
        { error: "Invalid Supabase project URL format" },
        { status: 400 },
      );
    }

    const connectionString = `postgresql://postgres.${projectRef}:${config.serviceRoleKey}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;

    const pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 1,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 10000,
    });

    try {
      await pool.query(sql);
      await pool.end();

      return NextResponse.json({
        success: true,
        message: "Migration executed successfully",
        migrationName,
      });
    } catch (pgError) {
      await pool.end();

      const errorMessage =
        pgError instanceof Error ? pgError.message : "Unknown database error";

      return NextResponse.json(
        {
          error: `Migration failed: ${errorMessage}`,
          details: pgError,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Migration executed successfully",
      migrationName,
    });
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
