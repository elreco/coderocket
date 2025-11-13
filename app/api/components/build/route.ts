import { after, NextRequest, NextResponse } from "next/server";

import { buildComponent } from "@/app/(default)/components/[slug]/actions";

export async function POST(req: NextRequest) {
  try {
    const { chatId, version } = await req.json();

    if (!chatId || version === undefined) {
      return NextResponse.json(
        { error: "Missing chatId or version" },
        { status: 400 },
      );
    }

    after(async () => {
      await buildComponent(chatId, version, true);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Build API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Build failed" },
      { status: 500 },
    );
  }
}
