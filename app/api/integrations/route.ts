import { NextRequest, NextResponse } from "next/server";

import {
  createUserIntegration,
  getUserIntegrations,
  IntegrationType,
  validateIntegrationConfig,
} from "@/utils/integrations";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const integrations = await getUserIntegrations(user.id);

    return NextResponse.json({ integrations });
  } catch (error) {
    console.error("Error fetching integrations:", error);
    return NextResponse.json(
      { error: "Failed to fetch integrations" },
      { status: 500 },
    );
  }
}

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
    const { type, name, config } = body;

    if (!type || !name || !config) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (!Object.values(IntegrationType).includes(type)) {
      return NextResponse.json(
        { error: "Invalid integration type" },
        { status: 400 },
      );
    }

    const validation = await validateIntegrationConfig(type, config);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || "Invalid configuration" },
        { status: 400 },
      );
    }

    const { data: existingIntegrations } = await supabase
      .from("user_integrations")
      .select("id, name")
      .eq("user_id", user.id)
      .eq("integration_type", type);

    if (existingIntegrations) {
      const duplicate = existingIntegrations.find(
        (integration) => integration.name === name,
      );

      if (duplicate) {
        return NextResponse.json(
          {
            error:
              "An integration with this name already exists. Please choose a different name or edit the existing integration.",
          },
          { status: 400 },
        );
      }
    }

    const result = await createUserIntegration(user.id, type, name, config);

    if (!result.success) {
      const errorMessage = result.error?.includes("unique constraint")
        ? "An integration with this name already exists"
        : result.error || "Failed to create integration";

      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    return NextResponse.json({ integration: result.integration });
  } catch (error) {
    console.error("Error creating integration:", error);
    return NextResponse.json(
      { error: "Failed to create integration" },
      { status: 500 },
    );
  }
}
