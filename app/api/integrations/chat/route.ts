import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;
  const chatId = searchParams.get("chatId");

  if (!chatId) {
    return NextResponse.json({ error: "Chat ID is required" }, { status: 400 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("chat_integrations")
    .select(
      `
      *,
      user_integrations (*)
    `,
    )
    .eq("chat_id", chatId)
    .eq("is_enabled", true);

  if (error) {
    console.error("Error fetching chat integrations:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat integrations" },
      { status: 500 },
    );
  }

  return NextResponse.json({ integrations: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { chatId, integrationId } = body;

  if (!chatId || !integrationId) {
    return NextResponse.json(
      { error: "Chat ID and Integration ID are required" },
      { status: 400 },
    );
  }

  const { data: integration } = await supabase
    .from("user_integrations")
    .select("*")
    .eq("id", integrationId)
    .eq("user_id", user.id)
    .single();

  if (!integration) {
    return NextResponse.json(
      { error: "Integration not found" },
      { status: 404 },
    );
  }

  const { data: existingChatIntegration } = await supabase
    .from("chat_integrations")
    .select("*")
    .eq("chat_id", chatId)
    .eq("integration_id", integrationId)
    .single();

  if (existingChatIntegration) {
    const { error: updateError } = await supabase
      .from("chat_integrations")
      .update({ is_enabled: true })
      .eq("id", existingChatIntegration.id);

    if (updateError) {
      console.error("Error updating chat integration:", updateError);
      return NextResponse.json(
        { error: "Failed to enable integration" },
        { status: 500 },
      );
    }
  } else {
    const { error: insertError } = await supabase
      .from("chat_integrations")
      .insert({
        chat_id: chatId,
        integration_id: integrationId,
        is_enabled: true,
      });

    if (insertError) {
      console.error("Error creating chat integration:", insertError);
      return NextResponse.json(
        { error: "Failed to enable integration" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;
  const chatId = searchParams.get("chatId");
  const integrationId = searchParams.get("integrationId");

  if (!chatId || !integrationId) {
    return NextResponse.json(
      { error: "Chat ID and Integration ID are required" },
      { status: 400 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("chat_integrations")
    .update({ is_enabled: false })
    .eq("chat_id", chatId)
    .eq("integration_id", integrationId);

  if (error) {
    console.error("Error disabling chat integration:", error);
    return NextResponse.json(
      { error: "Failed to disable integration" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
