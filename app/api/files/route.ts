import { NextRequest, NextResponse } from "next/server";

import { getSubscription } from "@/app/supabase-server";
import { getMaxFilesLimit } from "@/utils/config";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await getSubscription(user.id);
    if (!subscription) {
      return NextResponse.json(
        { error: "Premium subscription required" },
        { status: 403 },
      );
    }

    const maxFilesLimit = getMaxFilesLimit(subscription);

    const { count, error: countError } = await supabase
      .from("user_files")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (countError) {
      console.error("Error counting files:", countError);
      return NextResponse.json(
        { error: "Failed to count files" },
        { status: 500 },
      );
    }

    const total = count || 0;

    if (maxFilesLimit !== Infinity && total > maxFilesLimit) {
      return NextResponse.json(
        {
          error: `File limit exceeded. Your plan allows ${maxFilesLimit} files maximum. Please delete some files or upgrade your plan.`,
          total,
          maxFilesLimit,
        },
        { status: 403 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = (page - 1) * limit;

    const { data: files, error: listError } = await supabase
      .from("user_files")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (listError) {
      console.error("Error listing files:", listError);
      return NextResponse.json(
        { error: "Failed to list files" },
        { status: 500 },
      );
    }

    if (maxFilesLimit !== Infinity && total > maxFilesLimit) {
      return NextResponse.json(
        {
          error: `File limit exceeded. Your plan allows ${maxFilesLimit} files maximum. Please delete some files or upgrade your plan.`,
        },
        { status: 403 },
      );
    }

    const totalPages = Math.ceil(total / limit);

    const userFiles =
      files?.map((file) => ({
        path: file.storage_path,
        publicUrl: file.public_url,
        type: file.file_type as "image" | "pdf" | "text",
        mimeType: file.mime_type,
        uploadDate: file.created_at,
        size: file.file_size,
      })) || [];

    console.log(`Found ${total} files for user ${user.id}`);
    console.log(
      `Returning page ${page}: ${userFiles.length} files (offset: ${offset}, limit: ${limit})`,
    );

    return NextResponse.json({
      files: userFiles,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/files:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await getSubscription(user.id);
    if (!subscription) {
      return NextResponse.json(
        { error: "Premium subscription required" },
        { status: 403 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json(
        { error: "File path is required" },
        { status: 400 },
      );
    }

    const { data: fileRecord, error: fetchError } = await supabase
      .from("user_files")
      .select("storage_path")
      .eq("storage_path", path)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !fileRecord) {
      return NextResponse.json(
        { error: "File not found or unauthorized" },
        { status: 404 },
      );
    }

    const { error: deleteStorageError } = await supabase.storage
      .from("images")
      .remove([path]);

    if (deleteStorageError) {
      console.error("Error deleting file from storage:", deleteStorageError);
      return NextResponse.json(
        { error: "Failed to delete file from storage" },
        { status: 500 },
      );
    }

    const { error: deleteDbError } = await supabase
      .from("user_files")
      .delete()
      .eq("storage_path", path)
      .eq("user_id", user.id);

    if (deleteDbError) {
      console.error("Error deleting file record:", deleteDbError);
      return NextResponse.json(
        { error: "Failed to delete file record" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/files:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
