const DEFAULT_APP_URL = "http://localhost:4002";
const DEFAULT_CLOUD_URL = "https://www.coderocket.app";
const DEFAULT_DOCS_URL = "https://docs.coderocket.app";
const DEFAULT_DEPLOYMENT_ROOT_DOMAIN = "coderocket.app";
const DEFAULT_PREVIEW_ROOT_DOMAIN = "preview.coderocket.app";
const DEFAULT_WEBCONTAINER_ROOT_DOMAIN = "webcontainer.coderocket.app";
const DEFAULT_AVATAR_API = "https://api.dicebear.com/9.x/initials/svg?seed=";
const DEFAULT_DISCORD_URL = "https://discord.gg/t7dQgcYJ5t";
const DEFAULT_GITHUB_REPO_URL = "https://github.com/elreco/coderocket";

const ensureAbsoluteUrl = (value: string): string => {
  if (!value) {
    return DEFAULT_APP_URL;
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value.replace(/\/+$/, "");
  }

  if (value.startsWith("localhost") || value.startsWith("127.0.0.1")) {
    return `http://${value.replace(/\/+$/, "")}`;
  }

  return `https://${value.replace(/\/+$/, "")}`;
};

export const normalizeHostname = (value: string): string =>
  value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");

export const normalizePathname = (value = ""): string => {
  if (!value || value === "/") {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

export const appUrl = ensureAbsoluteUrl(
  process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    DEFAULT_APP_URL,
);
export const cloudUrl = ensureAbsoluteUrl(
  process.env.NEXT_PUBLIC_CLOUD_URL ?? DEFAULT_CLOUD_URL,
);
export const docsUrl = ensureAbsoluteUrl(
  process.env.NEXT_PUBLIC_DOCS_URL ?? DEFAULT_DOCS_URL,
);

export const appHostname = new URL(appUrl).hostname;
export const deploymentRootDomain = normalizeHostname(
  process.env.NEXT_PUBLIC_DEPLOYMENT_ROOT_DOMAIN ??
    DEFAULT_DEPLOYMENT_ROOT_DOMAIN,
);
export const previewRootDomain = normalizeHostname(
  process.env.NEXT_PUBLIC_PREVIEW_ROOT_DOMAIN ?? DEFAULT_PREVIEW_ROOT_DOMAIN,
);
export const webcontainerRootDomain = normalizeHostname(
  process.env.NEXT_PUBLIC_WEBCONTAINER_ROOT_DOMAIN ??
    DEFAULT_WEBCONTAINER_ROOT_DOMAIN,
);

export const publicBillingProvider =
  process.env.NEXT_PUBLIC_BILLING_PROVIDER ??
  process.env.BILLING_PROVIDER ??
  "none";
export const publicDomainProvider =
  process.env.NEXT_PUBLIC_DOMAIN_PROVIDER ??
  process.env.DOMAIN_PROVIDER ??
  "none";

export const gaId = process.env.NEXT_PUBLIC_GA_ID ?? "";
export const avatarApi =
  process.env.NEXT_PUBLIC_AVATAR_API ?? DEFAULT_AVATAR_API;
export const discordLink =
  process.env.NEXT_PUBLIC_DISCORD_URL ?? DEFAULT_DISCORD_URL;
export const githubRepoUrl =
  process.env.NEXT_PUBLIC_GITHUB_REPO_URL ?? DEFAULT_GITHUB_REPO_URL;

export const publicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const storageUrl = publicSupabaseUrl
  ? `${publicSupabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/images`
  : "";

export const isLocalHostname = (hostname: string): boolean => {
  const normalized = normalizeHostname(hostname);
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized.endsWith(".lvh.me")
  );
};

export const isLocalAppUrl = isLocalHostname(appHostname);

export const matchesHostnameOrSubdomain = (
  hostname: string,
  rootDomain: string,
): boolean => {
  const normalizedHost = normalizeHostname(hostname);
  const normalizedRoot = normalizeHostname(rootDomain);

  return (
    normalizedHost === normalizedRoot ||
    normalizedHost.endsWith(`.${normalizedRoot}`)
  );
};

export const buildAbsoluteUrl = (
  baseUrl: string,
  pathname = "/",
  searchParams?: URLSearchParams,
): string => {
  const url = new URL(normalizePathname(pathname) || "/", `${baseUrl}/`);
  if (searchParams) {
    url.search = searchParams.toString();
  }
  return url.toString();
};

export const buildAppUrl = (pathname = "/"): string =>
  buildAbsoluteUrl(appUrl, pathname);

export const buildCloudUrl = (pathname = "/"): string =>
  buildAbsoluteUrl(cloudUrl, pathname);

export const buildDocsUrl = (pathname = "/"): string =>
  buildAbsoluteUrl(docsUrl, pathname);

export const buildAccountUrl = (): string => buildAppUrl("/account");
export const buildPricingUrl = (): string => buildAppUrl("/pricing");

export const buildCloudComponentUrl = (slug?: string): string =>
  slug ? buildCloudUrl(`/components/${slug}`) : cloudUrl;

export const buildComponentUrl = (slug: string): string =>
  buildAppUrl(`/components/${slug}`);

export const buildContentUrl = (
  chatId: string,
  version: number,
  options?: { noWatermark?: boolean },
): string => {
  const params = new URLSearchParams();
  if (options?.noWatermark) {
    params.set("noWatermark", "true");
  }

  return buildAbsoluteUrl(
    appUrl,
    `/content/${chatId}/${version}`,
    params.size > 0 ? params : undefined,
  );
};

const buildHostBasedUrl = (
  hostname: string,
  pathname = "/",
  searchParams?: URLSearchParams,
): string => {
  const protocol = hostname.startsWith("localhost") || hostname.startsWith("127.")
    ? "http"
    : "https";
  return buildAbsoluteUrl(`${protocol}://${hostname}`, pathname, searchParams);
};

const joinPrefixPath = (prefix: string, pathname = ""): string => {
  const cleanPrefix = prefix.replace(/^\/+|\/+$/g, "");
  const cleanPath = normalizePathname(pathname);
  return `/webcontainer/${cleanPrefix}${cleanPath}`;
};

export const buildVersionedWebcontainerUrl = (
  chatId: string,
  version: number,
  pathname = "",
): string => {
  const prefix = `${chatId}-${version}`;
  if (isLocalAppUrl) {
    return buildAppUrl(joinPrefixPath(prefix, pathname));
  }

  return buildHostBasedUrl(`${prefix}.${webcontainerRootDomain}`, pathname);
};

export const buildVersionedPreviewUrl = (
  chatId: string,
  version: number,
  pathname = "",
): string => {
  const prefix = `${chatId}-${version}`;
  if (isLocalAppUrl) {
    const params = new URLSearchParams({ preview: "1" });
    return buildAbsoluteUrl(
      appUrl,
      joinPrefixPath(prefix, pathname),
      params,
    );
  }

  return buildHostBasedUrl(`${prefix}.${previewRootDomain}`, pathname);
};

export const buildDeploymentSubdomainUrl = (
  subdomain: string,
  pathname = "",
): string => {
  if (isLocalAppUrl) {
    return buildAppUrl(joinPrefixPath(subdomain, pathname));
  }

  return buildHostBasedUrl(`${subdomain}.${deploymentRootDomain}`, pathname);
};

export const buildDeploymentUrl = ({
  customDomain,
  subdomain,
  chatId,
  version,
  pathname = "",
}: {
  customDomain?: string | null;
  subdomain?: string | null;
  chatId?: string | null;
  version?: number | null;
  pathname?: string;
}): string => {
  if (customDomain) {
    return buildHostBasedUrl(customDomain, pathname);
  }

  if (subdomain) {
    return buildDeploymentSubdomainUrl(subdomain, pathname);
  }

  if (chatId && version !== null && version !== undefined) {
    return buildVersionedWebcontainerUrl(chatId, version, pathname);
  }

  return buildAppUrl(pathname || "/");
};
