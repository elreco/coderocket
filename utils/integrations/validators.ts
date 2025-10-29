import { createClient } from "@supabase/supabase-js";

import {
  IntegrationTestResult,
  IntegrationType,
  SupabaseIntegrationConfig,
  StripeIntegrationConfig,
  BlobIntegrationConfig,
  ResendIntegrationConfig,
  ValidationResult,
} from "./types";

export async function validateSupabaseCredentials(
  config: SupabaseIntegrationConfig,
): Promise<ValidationResult> {
  try {
    const { projectUrl, anonKey } = config;

    if (!projectUrl || !anonKey) {
      return {
        valid: false,
        error: "Project URL and Anon Key are required",
      };
    }

    if (
      !projectUrl.startsWith("https://") ||
      !projectUrl.includes(".supabase.co")
    ) {
      return {
        valid: false,
        error: "Invalid Supabase project URL format",
      };
    }

    const supabase = createClient(projectUrl, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const startTime = Date.now();
    const { error } = await supabase.from("_migrations").select("id").limit(1);
    const latency = Date.now() - startTime;

    if (error && error.code !== "42P01") {
      return {
        valid: false,
        error: `Connection failed: ${error.message}`,
      };
    }

    const projectId = projectUrl.split("//")[1]?.split(".")[0];

    return {
      valid: true,
      details: {
        projectName: projectId,
        latency: latency,
      },
    };
  } catch (error) {
    return {
      valid: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error during validation",
    };
  }
}

export async function testSupabaseConnection(
  config: SupabaseIntegrationConfig,
): Promise<IntegrationTestResult> {
  const validation = await validateSupabaseCredentials(config);

  if (!validation.valid) {
    return {
      success: false,
      message: validation.error || "Connection test failed",
    };
  }

  return {
    success: true,
    message: "Successfully connected to Supabase",
    details: {
      latency: validation.details?.latency,
      version: "2.x",
      features: ["realtime", "storage", "auth"],
    },
  };
}

export async function validateStripeCredentials(
  config: StripeIntegrationConfig,
): Promise<ValidationResult> {
  try {
    const { publishableKey, secretKey } = config;

    if (!publishableKey) {
      return {
        valid: false,
        error: "Publishable key is required",
      };
    }

    const keyPrefix = publishableKey.startsWith("pk_test_") ? "test" : "live";

    if (config.mode !== keyPrefix) {
      return {
        valid: false,
        error: `Key mode mismatch: ${keyPrefix} key for ${config.mode} mode`,
      };
    }

    if (secretKey) {
      const secretPrefix = secretKey.startsWith("sk_test_") ? "test" : "live";
      if (secretPrefix !== keyPrefix) {
        return {
          valid: false,
          error: "Publishable and secret keys must be from the same mode",
        };
      }
    }

    return {
      valid: true,
      details: {
        mode: keyPrefix,
      },
    };
  } catch (error) {
    return {
      valid: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error during validation",
    };
  }
}

export async function validateBlobCredentials(
  config: BlobIntegrationConfig,
): Promise<ValidationResult> {
  try {
    const { token } = config;

    if (!token) {
      return {
        valid: false,
        error: "Blob token is required",
      };
    }

    if (!token.startsWith("vercel_blob_")) {
      return {
        valid: false,
        error: "Invalid Vercel Blob token format",
      };
    }

    return {
      valid: true,
    };
  } catch (error) {
    return {
      valid: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error during validation",
    };
  }
}

export async function validateResendCredentials(
  config: ResendIntegrationConfig,
): Promise<ValidationResult> {
  try {
    const { apiKey, fromEmail } = config;

    if (!apiKey) {
      return {
        valid: false,
        error: "API key is required",
      };
    }

    if (!fromEmail) {
      return {
        valid: false,
        error: "From email is required",
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(fromEmail)) {
      return {
        valid: false,
        error: "Invalid email format",
      };
    }

    return {
      valid: true,
    };
  } catch (error) {
    return {
      valid: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error during validation",
    };
  }
}

export async function validateIntegrationConfig(
  type: IntegrationType,
  config: unknown,
): Promise<ValidationResult> {
  switch (type) {
    case IntegrationType.SUPABASE:
      return validateSupabaseCredentials(config as SupabaseIntegrationConfig);
    case IntegrationType.STRIPE:
      return validateStripeCredentials(config as StripeIntegrationConfig);
    case IntegrationType.BLOB:
      return validateBlobCredentials(config as BlobIntegrationConfig);
    case IntegrationType.RESEND:
      return validateResendCredentials(config as ResendIntegrationConfig);
    default:
      return {
        valid: false,
        error: "Unsupported integration type",
      };
  }
}
