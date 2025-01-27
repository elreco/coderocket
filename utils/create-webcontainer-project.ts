"use server";

import { spawn } from "child_process";

import { head, put } from "@vercel/blob";
import mime from "mime-types";

import { ChatFile } from "./completion-parser";

interface DeployFilesPayload {
  chatId: string;
  version: number;
  files: ChatFile[];
  onProgress?: (message: string, progress?: number) => void;
}

export async function deployToWebcontainerStorage({
  chatId,
  version,
  files,
  onProgress,
}: DeployFilesPayload) {
  const tempDir = `/tmp/${chatId}-${version}`;
  const storagePath = `${chatId}-${version}`;

  try {
    const existingUrl = await checkExistingBuild(storagePath);
    if (existingUrl) {
      onProgress?.("no-data", 100);
      return existingUrl; // No need to proceed further
    }
    onProgress?.("Starting deployment process...", 0);

    // Step 1: Check if the files already exist
    onProgress?.("Checking for existing builds...", 5);
    onProgress?.("No existing build found. Initializing deployment.", 10);

    // Step 2: Prepare the temporary environment
    onProgress?.("Preparing the temporary environment...", 20);
    await prepareEnvironment(files, tempDir, onProgress);

    // Step 3: Compile the React project with Vite
    onProgress?.("Compiling the project with Vite...", 40);
    const buildDir = `${tempDir}/dist`;
    await compileReactApp(tempDir, onProgress);

    // Step 4: Upload files to Webcontainer Storage
    onProgress?.("Uploading files to Webcontainer storage...", 70);
    const publicUrl = await uploadToWebcontainerStorage(
      buildDir,
      storagePath,
      onProgress,
    );

    // Step 5: Clean up the temporary directory
    onProgress?.("Cleaning up temporary directory...", 90);
    await deleteTemporaryDirectory(tempDir);

    onProgress?.("Deployment completed successfully!", 100);
    return publicUrl;
  } catch (error) {
    onProgress?.("An error occurred during the deployment process.", 0);
    console.error("Deployment error:", error);
    throw error;
  }
}

// Check if the build already exists in Webcontainer Storage
async function checkExistingBuild(storagePath: string): Promise<string | null> {
  try {
    const blob = await head(`${storagePath}/index.html`);
    if (blob) {
      return blob.url;
    }
    return null;
  } catch {
    return null;
  }
}

// Prepare the temporary environment
async function prepareEnvironment(
  files: ChatFile[],
  tempDir: string,
  onProgress?: (message: string, progress?: number) => void,
) {
  const fs = await import("fs/promises");
  const path = await import("path");

  await fs.mkdir(tempDir, { recursive: true });
  const totalFiles = files.length;
  let filesProcessed = 0;

  for (const file of files) {
    if (file.name && file.content) {
      const filePath = path.join(tempDir, file.name);
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, file.content, "utf-8");

      // Update progress
      filesProcessed++;
      const progress = (filesProcessed / totalFiles) * 20; // 20% allocated to this step
      onProgress?.(`Created file: ${file.name}`, 20 + progress);
    }
  }

  onProgress?.("Temporary environment preparation completed.", 40);
}

// Compile the React project using Vite
async function compileReactApp(
  tempDir: string,
  onProgress?: (message: string, progress?: number) => void,
) {
  onProgress?.("Starting Vite build process...", 40);

  try {
    await runCommandWithStreaming(
      "npx",
      ["vite", "build"],
      tempDir,
      (message) => {
        onProgress?.(`Vite: ${message.trim()}`, 50); // Updates during build
      },
    );
  } catch (error) {
    onProgress?.("Vite build failed.", 40);
    throw error;
  }

  onProgress?.("Vite build completed successfully.", 70);
}

// Upload files to Webcontainer storage
async function uploadToWebcontainerStorage(
  buildDir: string,
  storagePath: string,
  onProgress?: (message: string, progress?: number) => void,
) {
  const fs = await import("fs/promises");
  const path = await import("path");

  const entries = await fs.readdir(buildDir, { withFileTypes: true });
  const totalFiles = entries.length;
  let filesUploaded = 0;
  const urls: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(buildDir, entry.name);

    if (entry.isFile()) {
      const fileExt = path.extname(entry.name);
      const mimeType = mime.lookup(fileExt) || "application/octet-stream";
      const fileContent = await fs.readFile(fullPath);
      const blob = await put(`${storagePath}/${entry.name}`, fileContent, {
        access: "public",
        contentType: mimeType,
        addRandomSuffix: false,
      });
      urls.push(blob.url);

      // Update progress
      filesUploaded++;
      const progress = (filesUploaded / totalFiles) * 30; // 30% allocated to uploads
      onProgress?.(`Uploaded file: ${entry.name}`, 70 + progress);
    }
  }

  onProgress?.("File upload completed.", 90);
  return urls.find((url) => url.endsWith("index.html")) || urls[0];
}

// Clean up the temporary directory
async function deleteTemporaryDirectory(tempDir: string) {
  const fs = await import("fs/promises");
  console.log(`Deleting temporary directory: ${tempDir}`);
  await fs.rm(tempDir, { recursive: true, force: true });
  console.log("Temporary directory deleted.");
}

// Execute a command with streaming output
async function runCommandWithStreaming(
  command: string,
  args: string[],
  cwd: string,
  onMessage?: (message: string) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const process = spawn(command, args, {
      cwd,
      shell: true,
    });

    process.stdout.on("data", (data) => {
      onMessage?.(data.toString());
    });

    process.stderr.on("data", (data) => {
      onMessage?.(data.toString());
    });

    process.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command "${command}" failed with exit code ${code}`));
      }
    });

    process.on("error", (error) => {
      reject(error);
    });
  });
}
