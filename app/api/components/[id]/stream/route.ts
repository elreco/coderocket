import { after } from "next/server";
import { createResumableStreamContext } from "resumable-stream/ioredis";

import { getPublisher, getSubscriber, isRedisConfigured } from "@/utils/redis";
import { createClient } from "@/utils/supabase/server";

export const maxDuration = 800;

const STALE_STREAM_THRESHOLD_MS = 10 * 60 * 1000;

const getResumableStreamContext = () => {
  if (!isRedisConfigured()) {
    return null;
  }
  return createResumableStreamContext({
    waitUntil: after,
    publisher: getPublisher(),
    subscriber: getSubscriber(),
  });
};

const isStreamStale = (startedAt: string | null): boolean => {
  if (!startedAt) return false;
  const startTime = new Date(startedAt).getTime();
  const now = Date.now();
  return now - startTime > STALE_STREAM_THRESHOLD_MS;
};

const clearActiveStream = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  chatId: string,
) => {
  await supabase
    .from("chats")
    .update({
      active_stream_id: null,
      active_stream_started_at: null,
    } as Record<string, unknown>)
    .eq("id", chatId);
};

const checkIfBuildNeeded = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  chatId: string,
): Promise<{
  needsBuild: boolean;
  version: number | null;
  buildInProgress: boolean;
}> => {
  const { data: lastAssistantMessage } = await supabase
    .from("messages")
    .select("version, is_built, is_building, content, build_error")
    .eq("chat_id", chatId)
    .eq("role", "assistant")
    .order("version", { ascending: false })
    .limit(1)
    .single();

  if (!lastAssistantMessage) {
    return { needsBuild: false, version: null, buildInProgress: false };
  }

  const hasContent =
    !!lastAssistantMessage.content && lastAssistantMessage.content.length > 0;
  const notBuilt =
    lastAssistantMessage.is_built === false ||
    lastAssistantMessage.is_built === null;
  const notBuilding =
    lastAssistantMessage.is_building === false ||
    lastAssistantMessage.is_building === null;

  const hasNoBuildError = !lastAssistantMessage.build_error;

  const buildInProgress = lastAssistantMessage.is_building === true;

  const needsBuild = hasContent && notBuilt && notBuilding && hasNoBuildError;

  if (needsBuild) {
    console.log(
      `[checkIfBuildNeeded] Build needed for chat ${chatId}, version ${lastAssistantMessage.version}`,
      {
        hasContent,
        notBuilt,
        notBuilding,
        hasNoBuildError,
        is_built: lastAssistantMessage.is_built,
        is_building: lastAssistantMessage.is_building,
        build_error: lastAssistantMessage.build_error,
      },
    );
  }

  return {
    needsBuild,
    version: lastAssistantMessage.version,
    buildInProgress,
  };
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: chatId } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: chat } = await supabase
    .from("chats")
    .select("user_id, is_private")
    .eq("id", chatId)
    .single();

  if (!chat) {
    return new Response(JSON.stringify({ error: "Chat not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const isPublic = chat.is_private === false;
  const isOwner = user && chat.user_id === user.id;
  const canView = isOwner || isPublic;

  if (!canView) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: streamData } = (await supabase
    .from("chats")
    .select("*")
    .eq("id", chatId)
    .single()) as { data: Record<string, unknown> | null };

  const chatData = streamData || {};

  if (!chatData.active_stream_id) {
    const buildStatus = await checkIfBuildNeeded(supabase, chatId);

    if (buildStatus.needsBuild && buildStatus.version !== null) {
      after(async () => {
        const { buildComponent } = await import(
          "@/app/(default)/components/[slug]/actions"
        );
        try {
          await buildComponent(chatId, buildStatus.version!);
          console.log(
            `[stream/route] Build triggered for chat ${chatId}, version ${buildStatus.version}`,
          );
        } catch (error) {
          console.error(
            `[stream/route] Build error for chat ${chatId}, version ${buildStatus.version}:`,
            error,
          );
        }
      });
    }

    return new Response(
      JSON.stringify({
        status: "no_active_stream",
        needsBuild: buildStatus.needsBuild,
        version: buildStatus.version,
        buildInProgress: buildStatus.buildInProgress,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  if (isStreamStale(chatData.active_stream_started_at as string | null)) {
    await clearActiveStream(supabase, chatId);
    const buildStatus = await checkIfBuildNeeded(supabase, chatId);

    if (buildStatus.needsBuild && buildStatus.version !== null) {
      after(async () => {
        const { buildComponent } = await import(
          "@/app/(default)/components/[slug]/actions"
        );
        try {
          await buildComponent(chatId, buildStatus.version!);
          console.log(
            `[stream/route] Build triggered for chat ${chatId}, version ${buildStatus.version}`,
          );
        } catch (error) {
          console.error(
            `[stream/route] Build error for chat ${chatId}, version ${buildStatus.version}:`,
            error,
          );
        }
      });
    }

    return new Response(
      JSON.stringify({
        status: "stream_stale",
        needsBuild: buildStatus.needsBuild,
        version: buildStatus.version,
        buildInProgress: buildStatus.buildInProgress,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const streamContext = getResumableStreamContext();

  if (!streamContext) {
    const buildStatus = await checkIfBuildNeeded(supabase, chatId);
    return new Response(
      JSON.stringify({
        status: "redis_not_configured",
        needsBuild: buildStatus.needsBuild,
        version: buildStatus.version,
        buildInProgress: buildStatus.buildInProgress,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  try {
    const resumedStream = await streamContext.resumeExistingStream(
      chatData.active_stream_id as string,
    );

    if (!resumedStream) {
      await clearActiveStream(supabase, chatId);
      const buildStatus = await checkIfBuildNeeded(supabase, chatId);
      return new Response(
        JSON.stringify({
          status: "stream_not_found",
          needsBuild: buildStatus.needsBuild,
          version: buildStatus.version,
          buildInProgress: buildStatus.buildInProgress,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(resumedStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Stream-Id": chatData.active_stream_id as string,
        "X-Stream-Status": "streaming",
      },
    });
  } catch (error) {
    console.error("Error resuming stream:", error);
    await clearActiveStream(supabase, chatId);
    const buildStatus = await checkIfBuildNeeded(supabase, chatId);
    return new Response(
      JSON.stringify({
        status: "stream_error",
        needsBuild: buildStatus.needsBuild,
        version: buildStatus.version,
        buildInProgress: buildStatus.buildInProgress,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
