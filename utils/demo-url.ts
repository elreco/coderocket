import { Framework } from "./config";
import {
  buildContentUrl,
  buildVersionedWebcontainerUrl,
} from "./runtime-config";

export function generateDemoUrl(
  chatId: string,
  version: number,
  framework: string,
): string {
  if (framework === Framework.HTML) {
    return buildContentUrl(chatId, version, { noWatermark: true });
  } else {
    return buildVersionedWebcontainerUrl(chatId, version);
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
