export const maxDuration = 300;
import { spawn } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";

import { head, put } from "@vercel/blob";
import mime from "mime-types";
import { after, NextResponse } from "next/server";

import { takeScreenshot } from "@/utils/capture-screenshot";
import { ChatFile } from "@/utils/completion-parser";

interface DeployFilesPayload {
  chatId: string;
  version: number;
  files: ChatFile[];
}

let progressStream: ReadableStream<Uint8Array> | null = null;

// POST method: Trigger deployment process
export async function POST(request: Request) {
  const { chatId, version, files }: DeployFilesPayload = await request.json();

  const tempDir = path.join(os.tmpdir(), `${chatId}-${version}`);

  const storagePath = `${chatId}-${version}`;
  const encoder = new TextEncoder();

  progressStream = new ReadableStream({
    async start(controller) {
      const sendProgress = (message: string, progress?: number) => {
        const progressMessage = `${progress ? `[${progress}%] ` : ""}${message}\n`;
        try {
          const payload = {
            event: "progress",
            details: progressMessage,
            progress: progress,
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
          );
        } catch (err) {
          console.error("Failed to send progress:", err);
        }
      };

      try {
        const existingUrl = await checkExistingBuild(storagePath);
        if (existingUrl) {
          sendProgress("all-files-deployed", 100);
          controller.close();
          return;
        }
        sendProgress("Starting deployment process...", 0);

        // Step 1: Check if files already exist
        sendProgress("Checking for existing builds...", 5);

        sendProgress("No existing build found. Initializing deployment.", 10);

        // Step 2: Prepare the temporary environment and install dependencies
        sendProgress("Preparing the temporary environment...", 20);
        await prepareEnvironment(files, tempDir, sendProgress);

        // Step 3: Compile the React project with Vite
        sendProgress("Compiling the project with Vite...", 40);
        const buildDir = `${tempDir}/dist`;
        await compileReactApp(tempDir, sendProgress);

        // Step 4: Upload files to Webcontainer Storage
        sendProgress("Uploading files to Webcontainer storage...", 70);
        await uploadToWebcontainerStorage(buildDir, storagePath, sendProgress);

        // Step 5: Clean up temporary directory
        sendProgress("Cleaning up temporary directory...", 90);
        await deleteTemporaryDirectory(tempDir);

        sendProgress("Deployment completed successfully!", 100);

        const successPayload = {
          event: "success",
          details: "Deployment completed successfully!",
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(successPayload)}\n\n`),
        );

        controller.close();
        after(async () => {
          await takeScreenshot(chatId, version, undefined, "react");
        });
      } catch (error) {
        console.error("Deployment error:", error);
        sendProgress("An error occurred during the deployment process.", 0);
        const errorPayload = {
          event: "error",
          details: "An error occurred during the deployment process.",
          message: error instanceof Error ? error.message : "Unknown error",
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(errorPayload)}\n\n`),
        );
        controller.close();
      }
    },
    cancel(reason) {
      console.warn("Stream canceled:", reason);
    },
  });

  return NextResponse.json({ status: "Deployment started." });
}

// GET method: Stream progress updates to the client
export async function GET() {
  if (!progressStream) {
    return NextResponse.json(
      { error: "No active deployment." },
      { status: 404 },
    );
  }

  return new NextResponse(progressStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

// Helper function: Check if the build exists
async function checkExistingBuild(storagePath: string): Promise<string | null> {
  try {
    // Use the `head` method to check if the file exists
    const response = await head(`${storagePath}/index.html`);

    // If the `head` request succeeds, the file exists
    if (response && response.url) {
      return response.url;
    }
    return null;
  } catch {
    // If the `head` request fails, the file does not exist
    console.log(`File not found for storage path: ${storagePath}`);
    return null;
  }
}

// Helper function: Prepare the temporary environment
async function prepareEnvironment(
  files: ChatFile[],
  tempDir: string,
  sendProgress: (message: string, progress?: number) => void,
) {
  try {
    await fs.mkdir(tempDir, { recursive: true });
  } catch (error) {
    console.error("Failed to create temporary directory:", error);
    throw error;
  }

  const totalFiles = files.length;
  let filesProcessed = 0;

  for (const file of files) {
    if (file.name && file.content) {
      const filePath = path.join(tempDir, file.name);
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, file.content, "utf-8");

      filesProcessed++;
      const progress = (filesProcessed / totalFiles) * 10; // 10% allocated
      sendProgress(`Created file: ${file.name}`, 20 + progress);
    }
  }

  sendProgress("Installing dependencies...", 30);

  // Run `npm install` in the temporary directory
  await runCommandWithStreaming(
    "npm",
    ["install", "--include=dev", "--cache", "/tmp/.npm"],
    tempDir,
    (message) => {
      sendProgress(`npm install: ${message.trim()}`, 30);
    },
  );

  sendProgress("Dependencies installed successfully.", 40);
}

// Helper function: Compile the React project with Vite
async function compileReactApp(
  tempDir: string,
  sendProgress: (message: string, progress?: number) => void,
) {
  sendProgress("Starting Vite build process...", 40);

  const buildErrors: string[] = [];
  let currentError = "";
  let buildFailed = false;

  try {
    await runCommandWithStreaming(
      "npm",
      ["run", "build", "--cache", "/tmp/.npm"],
      tempDir,
      (message, isError) => {
        const line = message.trim();

        // Ignorer certaines lignes non pertinentes
        if (
          line.startsWith("node_modules/") ||
          line.includes("@ module") ||
          line.includes("npm ERR!") ||
          line === ""
        ) {
          return;
        }

        // Si c'est une erreur ou si la ligne contient "error"
        if (isError || /\berror\b/i.test(line)) {
          buildFailed = true;
          // Si c'est une nouvelle erreur
          if (!currentError || /\berror\b/i.test(line)) {
            if (currentError) {
              buildErrors.push(currentError.trim());
            }
            currentError = line;
          } else {
            // Ajouter la ligne à l'erreur en cours
            currentError += "\n" + line;
          }
          sendProgress(`🔴 ${line}`, 40);
        } else {
          if (message.includes("building") || message.includes("completed")) {
            sendProgress(`Build: ${message.trim()}`, 50);
          }
        }
      },
    );

    // Ajouter la dernière erreur si elle existe
    if (currentError) {
      buildErrors.push(currentError.trim());
    }

    // Si des erreurs ont été détectées pendant le build
    if (buildFailed) {
      const errorSummary =
        buildErrors.slice(0, 3).join("\n\n") +
        (buildErrors.length > 3
          ? `\n\n... and ${buildErrors.length - 3} other errors`
          : "");
      throw new Error(errorSummary);
    }

    sendProgress("Vite build completed successfully.", 70);
  } catch (error) {
    // Si nous avons déjà collecté des erreurs de build, utilisons-les
    if (buildErrors.length > 0) {
      const errorSummary =
        buildErrors.slice(0, 3).join("\n\n") +
        (buildErrors.length > 3
          ? `\n\n... et ${buildErrors.length - 3} autres erreurs`
          : "");
      throw new Error(errorSummary);
    }
    // Sinon, relancer l'erreur originale
    throw error;
  }
}

// Helper function: Upload files to Webcontainer Storage
async function uploadToWebcontainerStorage(
  buildDir: string,
  storagePath: string,
  sendProgress: (message: string, progress?: number) => void,
) {
  const fs = await import("fs/promises");
  const path = await import("path");

  // Fonction récursive pour lister tous les fichiers
  async function getAllFiles(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          return getAllFiles(fullPath);
        }
        return [fullPath];
      }),
    );
    return files.flat();
  }

  const allFiles = await getAllFiles(buildDir);
  const totalFiles = allFiles.length;
  let filesUploaded = 0;

  for (const fullPath of allFiles) {
    const relativePath = path.relative(buildDir, fullPath);
    const fileContent = await fs.readFile(fullPath);

    await put(`${storagePath}/${relativePath}`, fileContent, {
      access: "public",
      contentType: mime.lookup(relativePath) || "application/octet-stream",
      addRandomSuffix: false,
    });

    filesUploaded++;
    const progress = (filesUploaded / totalFiles) * 30; // 30% allocated
    sendProgress(`Uploaded file: ${relativePath}`, 70 + progress);
  }

  sendProgress("File upload completed.", 90);
}

// Helper function: Delete the temporary directory
async function deleteTemporaryDirectory(tempDir: string) {
  const fs = await import("fs/promises");
  await fs.rm(tempDir, { recursive: true, force: true });
}

// Helper function: Run a command with streaming output
async function runCommandWithStreaming(
  command: string,
  args: string[],
  cwd: string,
  onMessage: (message: string, isError?: boolean) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const process = spawn(command, args, { cwd, shell: true });

    process.stdout.on("data", (data) => onMessage(data.toString(), false));
    process.stderr.on("data", (data) => onMessage(data.toString(), true));

    process.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        const errorMessage = `La commande "${command} ${args.join(" ")}" a échoué avec le code ${code}`;
        onMessage(errorMessage, true);
        reject(new Error(errorMessage));
      }
    });

    process.on("error", (error) => {
      const errorMessage = `Erreur d'exécution: ${error.message}`;
      onMessage(errorMessage, true);
      reject(error);
    });
  });
}
