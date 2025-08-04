import { Framework } from "./config";

export function generateDemoUrl(
  chatId: string,
  version: number,
  framework: string,
): string {
  if (framework === Framework.HTML) {
    return `https://www.coderocket.app/content/${chatId}/${version}?noWatermark=true`;
  } else {
    return `https://${chatId}-${version}.webcontainer.coderocket.app`;
  }
}

export function getDemoUrl(listing: {
  chat: {
    id: string;
    framework: string | null;
  };
  version: number;
}): string {
  return generateDemoUrl(
    listing.chat.id,
    listing.version,
    listing.chat.framework || "html",
  );
}
