import crypto from "crypto";

const ENCRYPTION_KEY = process.env.INTEGRATION_ENCRYPTION_KEY;
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

if (!ENCRYPTION_KEY) {
  console.warn(
    "⚠️  INTEGRATION_ENCRYPTION_KEY not set. Integration data will not be encrypted.",
  );
}

function getKey(salt: Buffer): Buffer {
  if (!ENCRYPTION_KEY) {
    throw new Error("INTEGRATION_ENCRYPTION_KEY is not set");
  }
  return crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, "sha512");
}

export function encryptIntegrationConfig<T>(config: T): string {
  if (!ENCRYPTION_KEY) {
    console.warn("Storing integration config without encryption");
    return JSON.stringify(config);
  }

  try {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getKey(salt);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(config), "utf8"),
      cipher.final(),
    ]);

    const tag = cipher.getAuthTag();

    const result = Buffer.concat([salt, iv, tag, encrypted]).toString("base64");

    return result;
  } catch (error) {
    console.error("Error encrypting integration config:", error);
    throw new Error("Failed to encrypt integration configuration");
  }
}

export function decryptIntegrationConfig<T>(encryptedData: string): T {
  if (!ENCRYPTION_KEY) {
    console.warn("Reading integration config without decryption");
    return JSON.parse(encryptedData) as T;
  }

  try {
    const data = Buffer.from(encryptedData, "base64");

    const salt = data.subarray(0, SALT_LENGTH);
    const iv = data.subarray(SALT_LENGTH, TAG_POSITION);
    const tag = data.subarray(TAG_POSITION, ENCRYPTED_POSITION);
    const encrypted = data.subarray(ENCRYPTED_POSITION);

    const key = getKey(salt);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = decipher.update(encrypted) + decipher.final("utf8");

    return JSON.parse(decrypted) as T;
  } catch (error) {
    console.error("Error decrypting integration config:", error);
    throw new Error("Failed to decrypt integration configuration");
  }
}

export function maskSensitiveData(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const masked = { ...config };
  const sensitiveKeys = [
    "apiKey",
    "secretKey",
    "anonKey",
    "token",
    "webhookSecret",
    "password",
    "secret",
  ];

  for (const key of Object.keys(masked)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
      const value = masked[key];
      if (typeof value === "string" && value.length > 8) {
        masked[key] =
          `${value.substring(0, 8)}...${value.substring(value.length - 4)}`;
      }
    }
  }

  return masked;
}

export function validateEncryptionKey(): boolean {
  if (!ENCRYPTION_KEY) {
    return false;
  }

  if (ENCRYPTION_KEY.length < 32) {
    console.warn(
      "⚠️  INTEGRATION_ENCRYPTION_KEY is too short. Should be at least 32 characters.",
    );
    return false;
  }

  return true;
}
