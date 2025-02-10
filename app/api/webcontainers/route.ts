export const revalidate = 0;
import { after, NextRequest } from "next/server";

import {
  fetchChatById,
  fetchLastAssistantMessageByChatId,
} from "@/app/(default)/components/actions";
import { takeScreenshot } from "@/utils/capture-screenshot";
import { extractFilesFromCompletion } from "@/utils/completion-parser";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const chatId = searchParams.get("chatId");
  const version = searchParams.get("version");
  const forceBuild = searchParams.get("forceBuild");

  if (!chatId || !version) {
    return Response.json(
      { error: "Missing chatId or version" },
      { status: 400 },
    );
  }

  let updateInterval: NodeJS.Timeout | null = null; // We'll store the interval here
  let isStreamClosed = false; // Track if the stream is already closed

  // Helper to close the stream & clear the interval safely
  const closeStream = (controller: ReadableStreamDefaultController) => {
    if (isStreamClosed) return; // avoid multiple closes
    isStreamClosed = true;

    // Clear the interval if it's set
    if (updateInterval) {
      clearInterval(updateInterval);
      updateInterval = null;
    }

    // Finally, close the stream
    controller.close();
  };

  // Configuration du streaming pour Next.js 15
  const stream = new ReadableStream({
    async pull(controller) {
      const encoder = new TextEncoder();

      // Enqueue data into the stream if it's still open
      const sendStatus = async (event: string, data: { message: string }) => {
        if (isStreamClosed) return; // If we've closed already, don't enqueue
        const message = `data: ${JSON.stringify({ event, ...data })}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      try {
        await sendStatus("init", { message: "Starting deployment..." });

        const lastAssistantMessage =
          await fetchLastAssistantMessageByChatId(chatId);
        if (!lastAssistantMessage) {
          await sendStatus("error", { message: "No assistant message found." });
          closeStream(controller);
          return;
        }

        await sendStatus("processing", {
          message: "Extracting files...",
        });

        const chat = await fetchChatById(chatId);
        if (!chat) {
          await sendStatus("error", { message: "No chat found." });
          closeStream(controller);
          return;
        }

        // Extract files from the last assistant message
        const files = extractFilesFromCompletion(lastAssistantMessage.content);
        if (!files.length) {
          await sendStatus("error", {
            message:
              "Tailwind AI didn't generate any files. Continue the prompt if you stopped the generation or try to generate again.",
          });
          closeStream(controller);
          return;
        }

        await sendStatus("deploying", {
          message: "Starting build...",
        });
        // Messages de progression séquentiels
        const buildSteps = [
          "Installing dependencies...",
          "Configuring build environment...",
          "Compiling source files...",
          "Optimizing assets...",
          "Running final checks...",
        ];

        let currentStepIndex = 0;
        // Send sequential progress messages every 3s
        updateInterval = setInterval(async () => {
          if (isStreamClosed) {
            clearInterval(updateInterval!);
            return;
          }

          if (currentStepIndex >= buildSteps.length) {
            clearInterval(updateInterval!);
            return;
          }

          await sendStatus("building", {
            message: buildSteps[currentStepIndex],
          });
          currentStepIndex++;
        }, 3000);

        // Make the POST request to the builder API
        console.log("forceBuild", forceBuild === "true");
        console.log("chatId", chatId);
        console.log("version", parseInt(version));
        const builderResponse = await fetch(
          "https://react-builder.fly.dev/build",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              chatId,
              version: parseInt(version),
              files,
              forceBuild: forceBuild === "true",
            }),
          },
        );

        // Stop sending sequential build messages
        if (updateInterval) {
          clearInterval(updateInterval);
          updateInterval = null;
        }

        // Parse the response
        const responseData = await builderResponse.json();
        if (responseData.errors) {
          await sendStatus("error", {
            message: responseData.errors.join("\n"),
          });
          closeStream(controller);
          return;
        }

        // Build complete
        await sendStatus("complete", {
          message: responseData.message || "Build completed",
        });

        // Take a screenshot after everything is done
        after(async () => {
          await takeScreenshot(chatId, parseInt(version), undefined, "react");
        });

        closeStream(controller);
      } catch (error) {
        console.error("API error:", error);
        await sendStatus("error", { message: "Internal server error." });
        closeStream(controller);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
