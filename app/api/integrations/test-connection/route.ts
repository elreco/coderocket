import { NextRequest, NextResponse } from "next/server";

import {
  IntegrationType,
  testSupabaseConnection,
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
    const { type, config } = body;

    if (!type || !config) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    let result;

    switch (type) {
      case IntegrationType.SUPABASE:
        result = await testSupabaseConnection(
          config as SupabaseIntegrationConfig,
        );
        break;
      default:
        return NextResponse.json(
          { error: "Unsupported integration type for connection testing" },
          { status: 400 },
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error testing connection:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Connection test failed",
      },
      { status: 500 },
    );
  }
}

