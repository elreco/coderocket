import { Tables } from "@/types_db";

import { createClient } from "../supabase/server";

import {
  decryptIntegrationConfig,
  encryptIntegrationConfig,
} from "./encryption";
import {
  ChatIntegrationWithDetails,
  IntegrationConfig,
  IntegrationType,
  SupabaseIntegrationConfig,
  UserIntegration,
} from "./types";

const SUPABASE_OAUTH_CLIENT_ID = process.env.SUPABASE_OAUTH_CLIENT_ID;
const SUPABASE_OAUTH_CLIENT_SECRET = process.env.SUPABASE_OAUTH_CLIENT_SECRET;

// Token refresh buffer: refresh 5 minutes before expiry
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

export async function getUserIntegrations(
  userId: string,
): Promise<UserIntegration[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_integrations")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user integrations:", error);
    return [];
  }

  return (data || []).map((integration) => ({
    ...integration,
    config: decryptIntegrationConfig(integration.config as unknown as string),
  })) as UserIntegration[];
}

export async function getChatIntegrations(
  chatId: string,
): Promise<ChatIntegrationWithDetails[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chat_integrations")
    .select(
      `
      *,
      user_integrations (*)
    `,
    )
    .eq("chat_id", chatId)
    .eq("is_enabled", true);

  if (error) {
    console.error("Error fetching chat integrations:", error);
    return [];
  }

  if (!data) return [];

  return data.map((item) => ({
    ...item,
    user_integrations: {
      ...item.user_integrations,
      config: decryptIntegrationConfig(
        (item.user_integrations as unknown as { config: string }).config,
      ),
    },
  })) as ChatIntegrationWithDetails[];
}

export async function createUserIntegration(
  userId: string,
  type: IntegrationType,
  name: string,
  config: IntegrationConfig,
): Promise<{
  success: boolean;
  integration?: UserIntegration;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const encryptedConfig = encryptIntegrationConfig(config);

    const { data, error } = await supabase
      .from("user_integrations")
      .insert({
        user_id: userId,
        integration_type: type,
        name,
        config:
          encryptedConfig as unknown as Tables<"user_integrations">["config"],
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating integration:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      integration: {
        ...data,
        config: decryptIntegrationConfig(data.config as unknown as string),
      } as UserIntegration,
    };
  } catch (error) {
    console.error("Error in createUserIntegration:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function updateUserIntegration(
  integrationId: string,
  updates: {
    name?: string;
    config?: IntegrationConfig;
    is_active?: boolean;
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const updateData: Record<string, unknown> = {};

    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }

    if (updates.config !== undefined) {
      updateData.config = encryptIntegrationConfig(updates.config);
    }

    if (updates.is_active !== undefined) {
      updateData.is_active = updates.is_active;
    }

    const { error } = await supabase
      .from("user_integrations")
      .update(updateData)
      .eq("id", integrationId);

    if (error) {
      console.error("Error updating integration:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error in updateUserIntegration:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function deleteUserIntegration(
  integrationId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("user_integrations")
      .delete()
      .eq("id", integrationId);

    if (error) {
      console.error("Error deleting integration:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error in deleteUserIntegration:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function enableChatIntegration(
  chatId: string,
  integrationId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { data: existing } = await supabase
      .from("chat_integrations")
      .select("id")
      .eq("chat_id", chatId)
      .eq("integration_id", integrationId)
      .single();

    if (existing) {
      const { error } = await supabase
        .from("chat_integrations")
        .update({ is_enabled: true })
        .eq("id", existing.id);

      if (error) {
        return { success: false, error: error.message };
      }
    } else {
      const { error } = await supabase.from("chat_integrations").insert({
        chat_id: chatId,
        integration_id: integrationId,
        is_enabled: true,
      });

      if (error) {
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error in enableChatIntegration:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function disableChatIntegration(
  chatId: string,
  integrationId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("chat_integrations")
      .update({ is_enabled: false })
      .eq("chat_id", chatId)
      .eq("integration_id", integrationId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in disableChatIntegration:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getIntegrationsByType(
  userId: string,
  type: IntegrationType,
): Promise<UserIntegration[]> {
  const allIntegrations = await getUserIntegrations(userId);
  return allIntegrations.filter((i) => i.integration_type === type);
}

export async function getActiveIntegration(
  userId: string,
  type: IntegrationType,
): Promise<UserIntegration | null> {
  const integrations = await getIntegrationsByType(userId, type);
  return integrations.find((i) => i.is_active) || null;
}

/**
 * Refreshes a Supabase OAuth access token if it's expired or about to expire.
 * Returns the valid access token (either existing or newly refreshed).
 */
export async function getValidSupabaseAccessToken(
  integrationId: string,
  config: SupabaseIntegrationConfig,
): Promise<{ accessToken: string; error?: string }> {
  const { accessToken, refreshToken, expiresAt } = config;

  // If no access token at all, return error
  if (!accessToken) {
    return { accessToken: "", error: "No access token configured" };
  }

  // If no refresh token or expiry info, just return current token (legacy integrations)
  if (!refreshToken || !expiresAt) {
    return { accessToken };
  }

  // Check if token is still valid (with buffer)
  const now = Date.now();
  if (expiresAt > now + TOKEN_REFRESH_BUFFER_MS) {
    // Token is still valid
    return { accessToken };
  }

  // Token is expired or about to expire, refresh it
  console.log("[integration-helpers] Refreshing Supabase access token...");

  if (!SUPABASE_OAUTH_CLIENT_ID || !SUPABASE_OAUTH_CLIENT_SECRET) {
    return {
      accessToken,
      error: "OAuth credentials not configured for token refresh",
    };
  }

  try {
    const tokenResponse = await fetch(
      "https://api.supabase.com/v1/oauth/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: SUPABASE_OAUTH_CLIENT_ID,
          client_secret: SUPABASE_OAUTH_CLIENT_SECRET,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      },
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("[integration-helpers] Token refresh failed:", errorText);
      return {
        accessToken,
        error: `Token refresh failed: ${errorText}`,
      };
    }

    const tokenData = await tokenResponse.json();
    const {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expires_in,
    } = tokenData;

    // Calculate new expiration timestamp
    const newExpiresAt = expires_in
      ? Date.now() + expires_in * 1000
      : undefined;

    // Update the integration config in the database
    const updatedConfig: SupabaseIntegrationConfig = {
      ...config,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken || refreshToken, // Some OAuth servers return a new refresh token
      expiresAt: newExpiresAt,
    };

    const updateResult = await updateUserIntegration(integrationId, {
      config: updatedConfig,
    });

    if (!updateResult.success) {
      console.error(
        "[integration-helpers] Failed to save refreshed token:",
        updateResult.error,
      );
      // Still return the new token even if save failed
    } else {
      console.log("[integration-helpers] Token refreshed successfully");
    }

    return { accessToken: newAccessToken };
  } catch (error) {
    console.error("[integration-helpers] Error refreshing token:", error);
    return {
      accessToken,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
