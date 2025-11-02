import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/app/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const integrationId = searchParams.get("integration_id");
    const fileKey = searchParams.get("file_key");

    if (!integrationId || !fileKey) {
      return NextResponse.json(
        { error: "Missing integration_id or file_key" },
        { status: 400 },
      );
    }

    const { data: integration, error: integrationError } = await supabase
      .from("user_integrations")
      .select("config")
      .eq("id", integrationId)
      .eq("user_id", user.id)
      .eq("integration_type", "figma")
      .single();

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 },
      );
    }

    const config = integration.config as { accessToken: string };
    const accessToken = config.accessToken;

    const fileResponse = await fetch(
      `https://api.figma.com/v1/files/${fileKey}`,
      {
        headers: {
          "X-Figma-Token": accessToken,
        },
      },
    );

    if (!fileResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch Figma file" },
        { status: fileResponse.status },
      );
    }

    const fileData = await fileResponse.json();

    const imagesResponse = await fetch(
      `https://api.figma.com/v1/images/${fileKey}?format=png&scale=2`,
      {
        headers: {
          "X-Figma-Token": accessToken,
        },
      },
    );

    let images = {};
    if (imagesResponse.ok) {
      const imagesData = await imagesResponse.json();
      images = imagesData.images || {};
    }

    return NextResponse.json({
      file: fileData,
      images: images,
    });
  } catch (error) {
    console.error("Error fetching Figma file:", error);
    return NextResponse.json(
      { error: "Failed to fetch Figma file" },
      { status: 500 },
    );
  }
}
