const BROADCAST_CHANNEL_NAME = "supabase-auth-sync";

export type AuthEventType = "SIGNED_IN" | "SIGNED_OUT" | "TOKEN_REFRESHED";

export type AuthSyncMessage = {
  type: AuthEventType;
  timestamp: number;
};

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (
    typeof window === "undefined" ||
    typeof BroadcastChannel === "undefined"
  ) {
    return null;
  }
  if (!channel) {
    channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  }
  return channel;
}

export function broadcastAuthEvent(type: AuthEventType): void {
  const ch = getChannel();
  if (ch) {
    const message: AuthSyncMessage = {
      type,
      timestamp: Date.now(),
    };
    ch.postMessage(message);
  }
}

export function onAuthBroadcast(
  callback: (message: AuthSyncMessage) => void,
): () => void {
  const ch = getChannel();
  if (!ch) {
    return () => {};
  }

  const handler = (event: MessageEvent<AuthSyncMessage>) => {
    callback(event.data);
  };

  ch.addEventListener("message", handler);

  return () => {
    ch.removeEventListener("message", handler);
  };
}

export function getChannelName(): string {
  return BROADCAST_CHANNEL_NAME;
}
