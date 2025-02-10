import { after, NextRequest } from "next/server";

import {
  fetchChatById,
  fetchLastAssistantMessageByChatId,
} from "@/app/(default)/components/actions";
import { takeScreenshot } from "@/utils/capture-screenshot";
import { extractFilesFromArtifact } from "@/utils/completion-parser";
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

  // Configuration du streaming pour Next.js 15
  const stream = new ReadableStream({
    async pull(controller) {
      const encoder = new TextEncoder();

      const sendStatus = async (event: string, data: { message: string }) => {
        const message = `data: ${JSON.stringify({ event, ...data })}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      try {
        await sendStatus("init", { message: "Starting deployment..." });

        const lastAssistantMessage =
          await fetchLastAssistantMessageByChatId(chatId);
        if (!lastAssistantMessage) {
          await sendStatus("error", { message: "No assistant message found." });
          controller.close();
          return;
        }

        await sendStatus("processing", {
          message: "Extracting files...",
        });

        const chat = await fetchChatById(chatId);
        if (!chat) {
          await sendStatus("error", { message: "No chat found." });
          controller.close();
          return;
        }

        const extractedFiles = extractFilesFromCompletion(
          lastAssistantMessage.content,
        );
        if (!extractedFiles.length) {
          await sendStatus("error", {
            message:
              "Tailwind AI didn't generate any files. Continue the prompt if you stopped the generation or try to generate again.",
          });
          controller.close();
          return;
        }

        const files = extractFilesFromArtifact(chat.artifact_code || "");
        if (!files.length) {
          await sendStatus("error", { message: "No files found in artifact." });
          controller.close();
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
        // Afficher les messages de progression dans l'ordre
        const updateInterval = setInterval(async () => {
          if (currentStepIndex >= buildSteps.length) {
            clearInterval(updateInterval);
            return;
          }
          await sendStatus("building", {
            message: buildSteps[currentStepIndex],
          });
          currentStepIndex++;
        }, 3000);
        console.log("forceBuild", forceBuild);
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
        // Arrêter les messages de mise à jour une fois la réponse reçue
        clearInterval(updateInterval);

        const responseData = await builderResponse.json();
        if (responseData.errors) {
          await sendStatus("error", {
            message: responseData.errors.join("\n"),
          });
          controller.close();
          return;
        }
        await sendStatus("complete", {
          message: responseData.message || "Build completed",
        });

        after(async () => {
          await takeScreenshot(chatId, parseInt(version), undefined, "react");
        });

        controller.close();
      } catch (error) {
        console.error("API error:", error);
        await sendStatus("error", { message: "Internal server error." });
        controller.close();
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
