import { NextRequest, NextResponse } from "next/server";

import {
  deleteUserIntegration,
  updateUserIntegration,
  validateIntegrationConfig,
} from "@/utils/integrations";
import { createClient } from "@/utils/supabase/server";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();

    const { data: integration } = await supabase
      .from("user_integrations")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 },
      );
    }

    if (body.config) {
      const validation = await validateIntegrationConfig(
        integration.integration_type,
        body.config,
      );
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error || "Invalid configuration" },
          { status: 400 },
        );
      }
    }

    const result = await updateUserIntegration(id, body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to update integration" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating integration:", error);
    return NextResponse.json(
      { error: "Failed to update integration" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const { data: integration } = await supabase
      .from("user_integrations")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 },
      );
    }

    const result = await deleteUserIntegration(id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to delete integration" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting integration:", error);
    return NextResponse.json(
      { error: "Failed to delete integration" },
      { status: 500 },
    );
  }
}

