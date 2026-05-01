import JSZip from "jszip";
import { NextRequest, NextResponse } from "next/server";

import { fetchChatById } from "@/app/(default)/components/actions";
import { extractFilesFromArtifact } from "@/utils/completion-parser";
import { buildDocsUrl } from "@/utils/runtime-config";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const slug = formData.get("slug") as string;

    if (!slug) {
      return NextResponse.json(
        { error: "Component slug is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Get the component
    const chat = await fetchChatById(slug);

    if (!chat) {
      return NextResponse.json(
        { error: "Component not found" },
        { status: 404 },
      );
    }

    // Check if user owns this component (for purchased components, user_id should match)
    if (chat.user_id !== userData.user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get an assistant message with artifact code (for purchased components, find any message with code)
    const supabaseForMessages = await createClient();
    const { data: messageWithCode } = await supabaseForMessages
      .from("messages")
      .select("*")
      .eq("chat_id", chat.id)
      .eq("role", "assistant")
      .not("artifact_code", "is", null)
      .order("version", { ascending: false })
      .limit(1)
      .single();

    if (!messageWithCode || !messageWithCode.artifact_code) {
      return NextResponse.json(
        { error: "No code available for download" },
        { status: 404 },
      );
    }

    // Extract files from the artifact code
    const files = extractFilesFromArtifact(messageWithCode.artifact_code);

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files found in component" },
        { status: 404 },
      );
    }

    // Create ZIP file
    const zip = new JSZip();

    // Add component files
    files.forEach((file) => {
      if (file.name && file.content) {
        zip.file(file.name, file.content);
      }
    });

    // Add README with component info
    const readmeContent = `# ${chat.title}

## Component Information
- **Framework**: ${chat.framework}
- **Created**: ${new Date(chat.created_at ?? "").toLocaleDateString()}
- **Downloaded**: ${new Date().toLocaleDateString()}

## Installation & Usage

1. Extract all files to your project directory
2. Install any required dependencies for your framework
3. Import and use the component in your project

## Files Included
${files.map((file) => `- ${file.name}`).join("\n")}

## Support
For support and documentation, visit: ${buildDocsUrl("/")}

---
Downloaded from CodeRocket - AI-Powered Component Generation
`;

    zip.file("README.md", readmeContent);

    // Generate the ZIP file
    const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });

    // Create the filename
    const sanitizedTitle =
      chat.title?.replace(/[^a-zA-Z0-9\-_]/g, "_") || "component";
    const filename = `${sanitizedTitle}_coderocket.zip`;

    // Return the ZIP file
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": zipBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: "Failed to generate download" },
      { status: 500 },
    );
  }
}
