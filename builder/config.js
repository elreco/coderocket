import path from "path";
import { fileURLToPath } from "url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(currentDir, "..");

const resolveFromRepoRoot = (value, fallbackRelativePath) => {
  const target = value || fallbackRelativePath;
  if (path.isAbsolute(target)) {
    return target;
  }
  return path.resolve(repoRoot, target);
};

export const builderHost = process.env.BUILDER_HOST ?? "0.0.0.0";
export const builderPort = Number(process.env.BUILDER_PORT ?? "3000");
export const storageDriver = process.env.BUILDER_STORAGE_DRIVER ?? "fs";
export const tempDir = resolveFromRepoRoot(
  process.env.BUILDER_TEMP_DIR,
  ".coderocket/tmp",
);
export const storageFsRoot = resolveFromRepoRoot(
  process.env.BUILDER_STORAGE_FS_ROOT,
  ".coderocket/builds",
);
export const npmCacheDir = path.join(tempDir, "npm-cache");
export const blobReadWriteToken = process.env.BLOB_READ_WRITE_TOKEN ?? "";

export const isFsStorage = storageDriver === "fs";
export const isVercelBlobStorage = storageDriver === "vercel-blob";

