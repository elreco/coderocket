import {
  IntegrationType,
  IntegrationConfig,
  UserIntegration,
  IntegrationTestResult,
  ChatIntegrationWithDetails,
  getUserIntegrations,
} from "@/utils/integrations";
import { createClient } from "@/utils/supabase/server";

export async function getServerIntegrations(): Promise<UserIntegration[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const integrations = await getUserIntegrations(user.id);
    return integrations;
  } catch (error) {
    console.error("Error fetching integrations:", error);
    return [];
  }
}

export async function fetchUserIntegrations(): Promise<UserIntegration[]> {
  try {
    const response = await fetch("/api/integrations");
    if (!response.ok) {
      throw new Error("Failed to fetch integrations");
    }
    const data = await response.json();
    return data.integrations || [];
  } catch (error) {
    console.error("Error fetching integrations:", error);
    return [];
  }
}

export async function createIntegration(
  type: IntegrationType,
  name: string,
  config: IntegrationConfig,
): Promise<{
  success: boolean;
  integration?: UserIntegration;
  error?: string;
}> {
  try {
    const response = await fetch("/api/integrations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type, name, config }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || "Failed to create integration",
      };
    }

    return {
      success: true,
      integration: data.integration,
    };
  } catch (error) {
    console.error("Error creating integration:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create integration",
    };
  }
}

export async function updateIntegration(
  integrationId: string,
  updates: {
    name?: string;
    config?: IntegrationConfig;
    is_active?: boolean;
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/integrations/${integrationId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || "Failed to update integration",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating integration:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update integration",
    };
  }
}

export async function deleteIntegration(
  integrationId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/integrations/${integrationId}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || "Failed to delete integration",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting integration:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete integration",
    };
  }
}

export async function testConnection(
  type: IntegrationType,
  config: IntegrationConfig,
): Promise<IntegrationTestResult> {
  try {
    const response = await fetch("/api/integrations/test-connection", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type, config }),
    });

    const data = await response.json();

    return data;
  } catch (error) {
    console.error("Error testing connection:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Connection test failed",
    };
  }
}

export async function enableChatIntegration(
  chatId: string,
  integrationId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("/api/integrations/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ chatId, integrationId }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || "Failed to enable integration",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error enabling chat integration:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to enable integration",
    };
  }
}

export async function disableChatIntegration(
  chatId: string,
  integrationId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `/api/integrations/chat?chatId=${chatId}&integrationId=${integrationId}`,
      {
        method: "DELETE",
      },
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || "Failed to disable integration",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error disabling chat integration:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to disable integration",
    };
  }
}

export async function getChatIntegrations(
  chatId: string,
): Promise<ChatIntegrationWithDetails[]> {
  try {
    const response = await fetch(`/api/integrations/chat?chatId=${chatId}`);
    if (!response.ok) {
      throw new Error("Failed to fetch chat integrations");
    }
    const data = await response.json();
    return data.integrations || [];
  } catch (error) {
    console.error("Error fetching chat integrations:", error);
    return [];
  }
}
