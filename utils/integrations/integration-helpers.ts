import { Tables } from "@/types_db";

import { createClient } from "../supabase/server";

import { decryptIntegrationConfig, encryptIntegrationConfig } from "./encryption";
import {
  ChatIntegrationWithDetails,
  IntegrationConfig,
  IntegrationType,
  UserIntegration,
} from "./types";

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
): Promise<{ success: boolean; integration?: UserIntegration; error?: string }> {
  try {
    const supabase = await createClient();

    const encryptedConfig = encryptIntegrationConfig(config);

    const { data, error } = await supabase
      .from("user_integrations")
      .insert({
        user_id: userId,
        integration_type: type,
        name,
        config: encryptedConfig as unknown as Tables<"user_integrations">["config"],
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

