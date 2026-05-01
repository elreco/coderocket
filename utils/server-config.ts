import "server-only";

import path from "path";

import { appUrl } from "./runtime-config";

const normalizeUrl = (value: string): string => {
  if (!value) {
    return value;
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value.replace(/\/+$/, "");
  }

  if (value.startsWith("localhost") || value.startsWith("127.0.0.1")) {
    return `http://${value.replace(/\/+$/, "")}`;
  }

  return `https://${value.replace(/\/+$/, "")}`;
};

export const billingProvider =
  process.env.BILLING_PROVIDER ??
  process.env.NEXT_PUBLIC_BILLING_PROVIDER ??
  "none";
export const domainProvider =
  process.env.DOMAIN_PROVIDER ??
  process.env.NEXT_PUBLIC_DOMAIN_PROVIDER ??
  "none";

export const billingEnabled = billingProvider === "stripe";
export const domainApiEnabled = domainProvider === "vercel";

export const builderApiUrl = normalizeUrl(
  process.env.BUILDER_API_URL ??
    process.env.NEXT_PUBLIC_BUILDER_API_URL ??
    "http://127.0.0.1:3000",
);
export const builderHost = process.env.BUILDER_HOST ?? "0.0.0.0";
export const builderPort = Number(process.env.BUILDER_PORT ?? "3000");
export const builderStorageDriver =
  process.env.BUILDER_STORAGE_DRIVER ?? "fs";
export const builderAuthToken = process.env.BUILDER_AUTH_TOKEN ?? "";
export const builderStorageFsRoot = path.resolve(
  process.cwd(),
  process.env.BUILDER_STORAGE_FS_ROOT ?? ".coderocket/builds",
);
export const builderTempDir = path.resolve(
  process.cwd(),
  process.env.BUILDER_TEMP_DIR ?? ".coderocket/tmp",
);

export const vercelToken = process.env.VERCEL_TOKEN ?? "";
export const vercelProjectId = process.env.VERCEL_PROJECT_ID ?? "";
export const vercelTeamId = process.env.VERCEL_TEAM_ID ?? "";
export const blobReadWriteToken = process.env.BLOB_READ_WRITE_TOKEN ?? "";

export const appOrigin = appUrl;

export const buildBuilderHeaders = (
  headers: Record<string, string> = {},
): Record<string, string> => {
  if (!builderAuthToken) {
    return headers;
  }

  return {
    ...headers,
    Authorization: `Bearer ${builderAuthToken}`,
  };
};
