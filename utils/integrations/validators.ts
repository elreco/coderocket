import { createClient } from "@supabase/supabase-js";

import {
  IntegrationTestResult,
  IntegrationType,
  SupabaseIntegrationConfig,
  StripeIntegrationConfig,
  BlobIntegrationConfig,
  ResendIntegrationConfig,
  FigmaIntegrationConfig,
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

export async function validateFigmaCredentials(
  config: FigmaIntegrationConfig,
): Promise<ValidationResult> {
  try {
    const { accessToken } = config;

    if (!accessToken) {
      return {
        valid: false,
        error: "Access token is required",
      };
    }

    if (accessToken.length < 10) {
      return {
        valid: false,
        error: "Access token appears to be too short",
      };
    }

    const isOAuthToken = accessToken.startsWith("figu_");
    const headers: Record<string, string> = isOAuthToken
      ? { Authorization: `Bearer ${accessToken}` }
      : { "X-Figma-Token": accessToken };

    const response = await fetch("https://api.figma.com/v1/me", {
      headers,
    });

    if (!response.ok) {
      if (response.status === 403) {
        return {
          valid: false,
          error:
            "Invalid or expired access token. Make sure your token has the 'current_user:read' scope.",
        };
      }
      return {
        valid: false,
        error: `Failed to connect to Figma (${response.status}): ${response.statusText}`,
      };
    }

    const userData = await response.json();

    return {
      valid: true,
      details: {
        projectName: userData.handle || userData.email,
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

export async function testFigmaConnection(
  config: FigmaIntegrationConfig,
): Promise<IntegrationTestResult> {
  const validation = await validateFigmaCredentials(config);

  if (!validation.valid) {
    return {
      success: false,
      message: validation.error || "Connection test failed",
    };
  }

  return {
    success: true,
    message: "Successfully connected to Figma",
    details: {
      version: "v1",
      features: ["import-designs", "export-code"],
    },
  };
}

export function validateSupabaseSchema(
  config: SupabaseIntegrationConfig,
): ValidationResult {
  if (!config.databaseSchema) {
    return {
      valid: false,
      error:
        "Database schema is missing. Please add your database schema in the Supabase integration settings.",
    };
  }

  if (!config.databaseSchema.tables) {
    return {
      valid: false,
      error:
        "Database schema tables are missing. Please add at least one table to your schema.",
    };
  }

  if (!Array.isArray(config.databaseSchema.tables)) {
    return {
      valid: false,
      error: "Database schema tables must be an array.",
    };
  }

  if (config.databaseSchema.tables.length === 0) {
    return {
      valid: false,
      error:
        "Database schema is empty. Please add at least one table to your schema.",
    };
  }

  for (const table of config.databaseSchema.tables) {
    if (!table.name || typeof table.name !== "string") {
      return {
        valid: false,
        error: `Table name is missing or invalid for table at index ${config.databaseSchema.tables.indexOf(table)}.`,
      };
    }

    if (!table.columns || !Array.isArray(table.columns)) {
      return {
        valid: false,
        error: `Table "${table.name}" is missing columns or columns is not an array.`,
      };
    }

    if (table.columns.length === 0) {
      return {
        valid: false,
        error: `Table "${table.name}" has no columns. Please add at least one column.`,
      };
    }

    for (const column of table.columns) {
      if (!column.name || typeof column.name !== "string") {
        return {
          valid: false,
          error: `Column name is missing or invalid in table "${table.name}".`,
        };
      }

      if (!column.type || typeof column.type !== "string") {
        return {
          valid: false,
          error: `Column type is missing or invalid for column "${column.name}" in table "${table.name}".`,
        };
      }
    }
  }

  return {
    valid: true,
    details: {
      tables: config.databaseSchema.tables.map((t) => t.name),
    },
  };
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
    case IntegrationType.FIGMA:
      return validateFigmaCredentials(config as FigmaIntegrationConfig);
    default:
      return {
        valid: false,
        error: "Unsupported integration type",
      };
  }
}
