import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";

import { del, head, list, put } from "@vercel/blob";
import mime from "mime-types";

import {
  blobReadWriteToken,
  isFsStorage,
  isVercelBlobStorage,
  storageDriver,
  storageFsRoot,
} from "./config.js";

const ensureBlobToken = () => {
  if (!blobReadWriteToken) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is required when BUILDER_STORAGE_DRIVER=vercel-blob",
    );
  }
};

const resolveStoragePath = (storagePath) => {
  const normalized = storagePath.replace(/^\/+|\/+$/g, "");
  const resolvedPath = path.resolve(storageFsRoot, normalized);
  const expectedRoot = path.resolve(storageFsRoot);

  if (
    resolvedPath !== expectedRoot &&
    !resolvedPath.startsWith(`${expectedRoot}${path.sep}`)
  ) {
    throw new Error(`Invalid storage path: ${storagePath}`);
  }

  return resolvedPath;
};

const copyDirectory = async (sourceDir, destinationDir) => {
  await fs.mkdir(destinationDir, { recursive: true });
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const destinationPath = path.join(destinationDir, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, destinationPath);
    } else {
      await fs.mkdir(path.dirname(destinationPath), { recursive: true });
      await fs.copyFile(sourcePath, destinationPath);
    }
  }
};

const findRemoteBlob = async (targetPathname) => {
  ensureBlobToken();

  let cursor;
  do {
    const response = await list({
      prefix: targetPathname,
      limit: 100,
      cursor,
      token: blobReadWriteToken,
    });

    const exactMatch = response.blobs.find(
      (blob) => blob.pathname === targetPathname,
    );

    if (exactMatch) {
      return exactMatch;
    }

    if (!response.hasMore) {
      return null;
    }

    cursor = response.cursor;
  } while (cursor);

  return null;
};

export const ensureStorageRoot = async () => {
  if (isFsStorage) {
    await fs.mkdir(storageFsRoot, { recursive: true });
  }
};

export const getStorageDriverName = () => storageDriver;

export const findBuildAsset = async (targetPathname) => {
  if (isFsStorage) {
    const filePath = resolveStoragePath(targetPathname);
    if (!existsSync(filePath)) {
      return null;
    }

    return {
      kind: "file",
      pathname: targetPathname,
      filePath,
    };
  }

  const blob = await findRemoteBlob(targetPathname);
  if (!blob) {
    return null;
  }

  return {
    kind: "remote",
    pathname: blob.pathname,
    url: blob.url,
  };
};

export const readBuildAsset = async (asset) => {
  if (asset.kind === "file") {
    return fs.readFile(asset.filePath);
  }

  const response = await fetch(asset.url);
  if (!response.ok) {
    throw new Error(
      `Failed to read remote build asset ${asset.pathname}: ${response.status}`,
    );
  }

  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer);
};

export const buildExists = async (storagePath) => {
  if (isFsStorage) {
    const buildDir = resolveStoragePath(storagePath);
    const markerPath = path.join(buildDir, "build-complete.txt");
    const indexPath = path.join(buildDir, "index.html");
    return existsSync(markerPath) && existsSync(indexPath);
  }

  ensureBlobToken();

  try {
    const buildComplete = await head(`${storagePath}/build-complete.txt`, {
      token: blobReadWriteToken,
    });
    if (!buildComplete?.url) {
      return false;
    }

    const indexFile = await head(`${storagePath}/index.html`, {
      token: blobReadWriteToken,
    });
    return !!indexFile?.url;
  } catch {
    return false;
  }
};

export const uploadBuildDirectory = async (
  storagePath,
  distPath,
  safeLog = console.log,
) => {
  if (isFsStorage) {
    const buildDir = resolveStoragePath(storagePath);
    await fs.rm(buildDir, { recursive: true, force: true });
    await copyDirectory(distPath, buildDir);
    await fs.writeFile(
      path.join(buildDir, "build-complete.txt"),
      new Date().toISOString(),
      "utf-8",
    );
    return;
  }

  ensureBlobToken();

  const uploadDirectory = async (dirPath) => {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dirPath, file.name);
      const relativePath = path.relative(distPath, fullPath);

      if (file.isDirectory()) {
        await uploadDirectory(fullPath);
      } else {
        const fileContent = await fs.readFile(fullPath);
        safeLog(`📤 Uploading ${storagePath}/${relativePath}`);
        await put(`${storagePath}/${relativePath}`, fileContent, {
          access: "public",
          contentType: mime.lookup(file.name) || "application/octet-stream",
          addRandomSuffix: false,
          token: blobReadWriteToken,
          cacheControlMaxAge: 0,
        });
      }
    }
  };

  await uploadDirectory(distPath);
  await put(`${storagePath}/build-complete.txt`, new Date().toISOString(), {
    access: "public",
    contentType: "text/plain",
    addRandomSuffix: false,
    token: blobReadWriteToken,
    cacheControlMaxAge: 0,
  });
};

export const deleteBuildPrefix = async (storagePath, safeLog = console.log) => {
  if (isFsStorage) {
    await fs.rm(resolveStoragePath(storagePath), {
      recursive: true,
      force: true,
    });
    return;
  }

  ensureBlobToken();
  const files = await list({ prefix: storagePath, token: blobReadWriteToken });
  for (const file of files.blobs ?? []) {
    try {
      await del(file.url, { token: blobReadWriteToken });
      safeLog(`Deleted remote asset ${file.pathname}`);
    } catch (error) {
      safeLog(`Failed to delete remote asset ${file.pathname}: ${error}`);
    }
  }
};

export const deleteBuildsByChat = async (chatId, safeLog = console.log) => {
  if (isFsStorage) {
    await ensureStorageRoot();
    const entries = await fs.readdir(storageFsRoot, { withFileTypes: true });
    await Promise.all(
      entries
        .filter((entry) => entry.name.startsWith(`${chatId}-`))
        .map((entry) =>
          fs.rm(path.join(storageFsRoot, entry.name), {
            recursive: true,
            force: true,
          }),
        ),
    );
    return;
  }

  ensureBlobToken();
  const files = await list({
    prefix: `${chatId}-`,
    token: blobReadWriteToken,
  });

  for (const file of files.blobs ?? []) {
    try {
      await del(file.url, { token: blobReadWriteToken });
      safeLog(`Deleted remote asset ${file.pathname}`);
    } catch (error) {
      safeLog(`Failed to delete remote asset ${file.pathname}: ${error}`);
    }
  }
};

export const getStoredBuildUrl = async (storagePath) => {
  const asset = await findBuildAsset(`${storagePath}/index.html`);
  if (!asset) {
    return null;
  }

  if (asset.kind === "remote") {
    return asset.url;
  }

  return asset.filePath;
};

export const isBlobStorageEnabled = () => isVercelBlobStorage;

