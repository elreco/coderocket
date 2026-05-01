"use server";

import { after } from "next/server";

import { getSubscription } from "@/app/supabase-server";
import { takeScreenshot } from "@/utils/capture-screenshot";
import {
  extractFilesFromArtifact,
  hasArtifacts,
} from "@/utils/completion-parser";
import { Framework } from "@/utils/config";
import {
  verifyDomainOwnership,
  checkDomainAvailability,
} from "@/utils/domain-verification";
import {
  getChatIntegrations,
  IntegrationType,
  SupabaseIntegrationConfig,
} from "@/utils/integrations";
import { promptEnhancer } from "@/utils/prompt-enhancer";
import {
  billingEnabled,
  buildBuilderHeaders,
  builderApiUrl,
  domainApiEnabled,
} from "@/utils/server-config";
import { getLatestArtifactCode } from "@/utils/supabase/artifact-helpers";
import { createClient } from "@/utils/supabase/server";
import {
  addDomainToVercel,
  removeDomainFromVercel,
  checkVercelDomainStatus,
} from "@/utils/vercel-domains";

import {
  fetchAssistantMessageByChatIdAndVersion,
  fetchChatById,
} from "../actions";

const requireSubscriptionIfBillingEnabled = async () => {
  if (!billingEnabled) {
    return null;
  }

  const subscription = await getSubscription();
  if (!subscription) {
    throw new Error("payment-required");
  }

  return subscription;
};

export const updateArtifactCode = async (
  chatId: string,
  artifactCode: string,
  selectedVersion?: number,
) => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) throw new Error("User not authenticated");

  const { data: chat } = await supabase
    .from("chats")
    .select("user_id")
    .eq("id", chatId)
    .single();

  if (!chat || chat.user_id !== user.id) {
    throw new Error("Unauthorized");
  }

  let targetMessage;

  if (selectedVersion !== undefined) {
    const { data: versionMessage } = await supabase
      .from("messages")
      .select("id, version")
      .eq("chat_id", chatId)
      .eq("role", "assistant")
      .eq("version", selectedVersion)
      .single();

    targetMessage = versionMessage;
  } else {
    const { data: lastMessage } = await supabase
      .from("messages")
      .select("id, version")
      .eq("chat_id", chatId)
      .eq("role", "assistant")
      .order("version", { ascending: false })
      .limit(1)
      .single();

    targetMessage = lastMessage;
  }

  if (targetMessage) {
    const { error: messageError } = await supabase
      .from("messages")
      .update({ artifact_code: artifactCode })
      .eq("id", targetMessage.id);

    if (messageError) {
      console.error("Error updating message artifact code:", messageError);
      throw new Error("Failed to update message artifact code");
    }
  }

  const { data: latestMessage } = await supabase
    .from("messages")
    .select("id, version")
    .eq("chat_id", chatId)
    .eq("role", "assistant")
    .order("version", { ascending: false })
    .limit(1)
    .single();

  if (
    selectedVersion === undefined ||
    selectedVersion === latestMessage?.version
  ) {
    const { error } = await supabase
      .from("chats")
      .update({ artifact_code: artifactCode })
      .eq("id", chatId);

    if (error) {
      console.error("Error updating artifact code:", error);
      throw new Error("Failed to update artifact code");
    }
  }

  return { success: true };
};

export const changeVisibilityByChatId = async (
  chatId: string,
  isVisible: boolean,
) => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) throw new Error("Could not get user");
  await requireSubscriptionIfBillingEnabled();

  const { error } = await supabase
    .from("chats")
    .update({ is_private: !isVisible })
    .eq("user_id", user.id)
    .eq("id", chatId);

  if (error) {
    throw new Error(`Failed to update visibility: ${error.message}`);
  }
};

export const updateTitleByChatId = async (chatId: string, title: string) => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) throw new Error("Could not get user");

  if (!title || title.trim().length === 0) {
    throw new Error("Title cannot be empty");
  }

  if (title.length > 255) {
    throw new Error("Title is too long (max 255 characters)");
  }

  const { error } = await supabase
    .from("chats")
    .update({ title: title.trim() })
    .eq("user_id", user.id)
    .eq("id", chatId);

  if (error) {
    throw new Error(`Failed to update title: ${error.message}`);
  }
};

export const improvePromptByChatId = async (chatId: string, prompt: string) => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) throw new Error("Could not get user");
  await requireSubscriptionIfBillingEnabled();
  const { data: chat, error: chatError } = await supabase
    .from("chats")
    .select("id, framework")
    .eq("id", chatId)
    .eq("user_id", user.id)
    .single();
  if (chatError) {
    throw new Error(`Failed to fetch chat: ${chatError.message}`);
  }
  return await promptEnhancer(
    prompt,
    chat?.framework as Framework,
    undefined,
    user.id,
    chatId,
  );
};

export const deleteVersionByMessageId = async (messageId: number) => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) throw new Error("Could not get user");
  await requireSubscriptionIfBillingEnabled();
  const { data: message, error: fetchError } = await supabase
    .from("messages")
    .select("id, chat_id, version, chats(id)")
    .eq("id", messageId)
    .eq("chats.user_id", user.id)
    .single();
  if (fetchError) {
    throw new Error(fetchError.message);
  }
  if (!message) {
    throw new Error("Message not found or user not authorized.");
  }

  const { data: allVersions } = await supabase
    .from("messages")
    .select("version")
    .eq("chat_id", message.chat_id)
    .eq("role", "assistant")
    .order("version", { ascending: false });

  if (!allVersions || allVersions.length === 0) {
    throw new Error("No versions found");
  }

  const totalVersions = allVersions.length;
  const highestVersion = allVersions[0].version;

  if (totalVersions > 1 && message.version !== highestVersion) {
    throw new Error(
      "Only the last version can be deleted when multiple versions exist",
    );
  }

  const { error: deleteError } = await supabase
    .from("messages")
    .delete()
    .eq("version", message.version)
    .eq("chat_id", message.chat_id);

  if (deleteError) {
    throw new Error(`Failed to delete messages: ${deleteError.message}`);
  }

  try {
    const response = await fetch(
      `${builderApiUrl}/build/${message.chat_id}/${message.version}`,
      {
        method: "DELETE",
        headers: buildBuilderHeaders(),
      },
    );

    if (!response.ok) {
      console.error(
        `Failed to delete build from storage for version ${message.version}: ${response.status}`,
      );
      throw new Error(
        `Failed to delete build from storage: ${response.status}`,
      );
    }

    await response.json();
    console.log(
      `Successfully deleted build for chat ${message.chat_id}, version ${message.version}`,
    );
  } catch (error) {
    console.error(
      `Error deleting build from storage for version ${message.version}:`,
      error,
    );
    throw error;
  }

  const latestArtifactCode = await getLatestArtifactCode(message.chat_id);

  await supabase
    .from("chats")
    .update({ artifact_code: latestArtifactCode || "" })
    .eq("id", message.chat_id);
};

export const updateTheme = async (
  chatId: string,
  theme: string,
  version: number,
  completion: string,
) => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) throw new Error("Could not get user");

  const { data: chat, error: chatError } = await supabase
    .from("chats")
    .select("id, framework")
    .eq("id", chatId)
    .eq("user_id", user.id)
    .single();

  if (chatError) {
    throw new Error(`Failed to fetch chat: ${chatError.message}`);
  }

  await supabase
    .from("messages")
    .update({ theme, content: completion })
    .eq("chat_id", chatId)
    .eq("version", version)
    .eq("role", "assistant");
  const hasArtifactResult = hasArtifacts(completion);
  if (hasArtifactResult) {
    after(async () => {
      await takeScreenshot(chatId, version, theme, chat?.framework || "react");
    });
  }
};

export const buildComponent = async (
  chatId: string,
  version: number,
): Promise<{
  success: boolean;
  alreadyBuilt?: boolean;
  lockNotAcquired?: boolean;
}> => {
  const { tryAcquireBuildLock, releaseBuildLock } = await import(
    "@/app/api/components/post-processing"
  );

  const lockId = `build-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  try {
    const lastAssistantMessage = await fetchAssistantMessageByChatIdAndVersion(
      chatId,
      version,
    );
    if (!lastAssistantMessage) {
      console.error(
        `buildComponent: No assistant message found for chat ${chatId} version ${version}`,
      );
      return { success: false };
    }

    const chat = await fetchChatById(chatId);
    if (!chat) {
      console.error(`buildComponent: No chat found for ${chatId}`);
      return { success: false };
    }

    if (chat.framework === Framework.HTML) {
      return { success: true };
    }

    const lockAcquired = await tryAcquireBuildLock(chatId, version, lockId);
    if (!lockAcquired) {
      console.log(
        `buildComponent: Lock not acquired for chat ${chatId} version ${version} - build may be in progress or already complete`,
      );
      return { success: false, lockNotAcquired: true };
    }

    console.log(
      `buildComponent: Lock acquired (${lockId}) for chat ${chatId} version ${version}`,
    );

    const newArtifactFiles = extractFilesFromArtifact(
      lastAssistantMessage.artifact_code || "",
    );

    if (!newArtifactFiles.length) {
      console.warn(
        `buildComponent: No files found in completion for chat ${chatId} version ${version} - skipping build`,
      );
      await releaseBuildLock(chatId, version, false, {
        title: "No Files",
        description: "No files found to build",
        errors: [],
      });
      return { success: false };
    }

    const chatIntegrations = await getChatIntegrations(chatId);
    const envVars: Record<string, string> = {};

    const supabaseIntegration = chatIntegrations.find(
      (ci) =>
        ci.user_integrations.integration_type === IntegrationType.SUPABASE,
    );
    if (supabaseIntegration) {
      const config = supabaseIntegration.user_integrations
        .config as SupabaseIntegrationConfig;
      envVars.VITE_SUPABASE_URL = config.projectUrl;
      envVars.VITE_SUPABASE_ANON_KEY = config.anonKey;
    }

    const builderResponse = await fetch(`${builderApiUrl}/build`, {
      method: "POST",
      headers: buildBuilderHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        chatId,
        version,
        files: newArtifactFiles,
        forceBuild: true,
        envVars,
      }),
    });

    if (!builderResponse.ok) {
      const errorText = await builderResponse.text();
      console.error(
        `buildComponent: Builder API error (${builderResponse.status}) for chat ${chatId}:`,
        errorText,
      );
      await releaseBuildLock(chatId, version, false, {
        title: "Build Failed",
        description: `Builder API returned ${builderResponse.status}`,
        errors: [errorText],
      });
      return { success: false };
    }

    const contentType = builderResponse.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const responseText = await builderResponse.text();
      console.error(
        `buildComponent: Builder API did not return JSON for chat ${chatId}:`,
        responseText,
      );
      await releaseBuildLock(chatId, version, false, {
        title: "Build Failed",
        description: "Builder API returned non-JSON response",
        errors: [responseText.substring(0, 500)],
      });
      return { success: false };
    }

    const responseData = await builderResponse.json();

    if (responseData.errors || responseData.event === "error") {
      const buildError = {
        title: "Build Failed",
        description:
          responseData.details || "The build process encountered errors.",
        errors: responseData.errors || [],
        exitCode: responseData.exitCode,
      };
      console.error(
        `buildComponent: Build failed for chat ${chatId}:`,
        buildError,
      );
      await releaseBuildLock(chatId, version, false, buildError);
      return { success: false };
    }

    const buildSuccess = responseData.event === "success";
    await releaseBuildLock(chatId, version, buildSuccess);
    console.log(
      `buildComponent: Build ${buildSuccess ? "succeeded" : "completed"} for chat ${chatId} version ${version}`,
    );

    // Auto-deploy if enabled and build was successful
    if (buildSuccess) {
      try {
        await autoDeployAfterBuild(chatId, version);
      } catch (autoDeployError) {
        console.error(
          "buildComponent: Auto-deploy error (non-blocking):",
          autoDeployError,
        );
      }
    }

    try {
      let buildExists = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        buildExists = await checkExistingComponent(chatId, version);
        if (buildExists) break;
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      if (buildExists) {
        await takeScreenshot(
          chatId,
          version,
          undefined,
          chat.framework || Framework.REACT,
        );
      } else {
        console.warn(
          `buildComponent: Build ${chatId}-${version} not available in storage after 3 attempts, skipping screenshot`,
        );
      }
    } catch (screenshotError) {
      console.error(
        "buildComponent: Screenshot error (non-blocking):",
        screenshotError,
      );
    }

    return { success: buildSuccess };
  } catch (error) {
    console.error(
      `buildComponent: Unexpected error for chat ${chatId}:`,
      error,
    );
    await releaseBuildLock(chatId, version, false, {
      title: "Build Error",
      description: "An unexpected error occurred during the build process.",
      errors: [error instanceof Error ? error.message : String(error)],
    });
    return { success: false };
  }
};

export const getIntegrationsForWebcontainer = async (chatId: string) => {
  try {
    const chatIntegrations = await getChatIntegrations(chatId);
    const envVars: Record<string, string> = {};

    const supabaseIntegration = chatIntegrations.find(
      (ci) =>
        ci.user_integrations.integration_type === IntegrationType.SUPABASE,
    );
    if (supabaseIntegration) {
      const config = supabaseIntegration.user_integrations
        .config as SupabaseIntegrationConfig;
      envVars.VITE_SUPABASE_URL = config.projectUrl;
      envVars.VITE_SUPABASE_ANON_KEY = config.anonKey;
    }

    return envVars;
  } catch (error) {
    console.error("Error fetching integrations for webcontainer:", error);
    return {};
  }
};

export const checkExistingComponent = async (
  chatId: string,
  version: number,
) => {
  const builderResponse = await fetch(
    `${builderApiUrl}/check-build/${chatId}/${version}`,
    {
      method: "GET",
      headers: buildBuilderHeaders({
        "Content-Type": "application/json",
      }),
    },
  );

  if (!builderResponse.ok) {
    console.error(
      `Builder API error (${builderResponse.status}) when checking build existence`,
    );
    return false;
  }

  const contentType = builderResponse.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    const responseText = await builderResponse.text();
    console.error(
      "Builder API did not return JSON when checking build:",
      responseText.substring(0, 200),
    );
    return false;
  }

  const responseData = await builderResponse.json();

  if (responseData.errors) {
    return false;
  }

  return responseData.exists;
};

export const checkSubdomainAvailability = async (subdomain: string) => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) throw new Error("User not authenticated");

  const normalizedSubdomain = subdomain.toLowerCase().trim();

  const { data: existingChat, error } = await supabase
    .from("chats")
    .select("id")
    .eq("deploy_subdomain", normalizedSubdomain)
    .maybeSingle();

  if (error) {
    console.error("Error checking subdomain:", error);
    throw new Error("Failed to check subdomain availability");
  }

  return !existingChat;
};

export const deployComponent = async (
  chatId: string,
  subdomain: string,
  version: number,
) => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) throw new Error("User not authenticated");

  await requireSubscriptionIfBillingEnabled();

  const { data: chat } = await supabase
    .from("chats")
    .select("user_id")
    .eq("id", chatId)
    .single();

  if (!chat || chat.user_id !== user.id) {
    throw new Error("Unauthorized");
  }

  const normalizedSubdomain = subdomain.toLowerCase().trim();

  const isAvailable = await checkSubdomainAvailability(normalizedSubdomain);
  if (!isAvailable) {
    throw new Error("Subdomain is already taken");
  }

  const { error } = await supabase
    .from("chats")
    .update({
      deploy_subdomain: normalizedSubdomain,
      deployed_at: new Date().toISOString(),
      deployed_version: version,
      is_deployed: true,
    })
    .eq("id", chatId);

  if (error) {
    console.error("Error deploying component:", error);
    throw new Error(error.message || "Failed to deploy component");
  }

  return { success: true, subdomain: normalizedSubdomain, version };
};

export const undeployComponent = async (chatId: string) => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) throw new Error("User not authenticated");

  await requireSubscriptionIfBillingEnabled();

  const { data: chat } = await supabase
    .from("chats")
    .select("user_id")
    .eq("id", chatId)
    .single();

  if (!chat || chat.user_id !== user.id) {
    throw new Error("Unauthorized");
  }

  const { error } = await supabase
    .from("chats")
    .update({
      is_deployed: false,
      deploy_subdomain: null,
      deployed_at: null,
      deployed_version: null,
    })
    .eq("id", chatId);

  if (error) {
    console.error("Error undeploying component:", error);
    throw new Error("Failed to undeploy component");
  }

  const { error: domainError } = await supabase
    .from("custom_domains")
    .delete()
    .eq("chat_id", chatId);

  if (domainError) {
    console.error("Error deleting custom domain:", domainError);
  }

  return { success: true };
};

export const updateDeploymentSubdomain = async (
  chatId: string,
  newSubdomain: string,
  version?: number,
) => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) throw new Error("User not authenticated");

  await requireSubscriptionIfBillingEnabled();

  const { data: chat } = await supabase
    .from("chats")
    .select("user_id, deploy_subdomain")
    .eq("id", chatId)
    .single();

  if (!chat || chat.user_id !== user.id) {
    throw new Error("Unauthorized");
  }

  const normalizedSubdomain = newSubdomain.toLowerCase().trim();

  if (chat.deploy_subdomain !== normalizedSubdomain) {
    const isAvailable = await checkSubdomainAvailability(normalizedSubdomain);
    if (!isAvailable) {
      throw new Error("Subdomain is already taken");
    }
  }

  const updateData: {
    deploy_subdomain: string;
    deployed_version?: number;
    deployed_at?: string;
  } = {
    deploy_subdomain: normalizedSubdomain,
  };

  if (version !== undefined) {
    updateData.deployed_version = version;
    updateData.deployed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("chats")
    .update(updateData)
    .eq("id", chatId);

  if (error) {
    console.error("Error updating subdomain:", error);
    throw new Error(error.message || "Failed to update subdomain");
  }

  return { success: true, subdomain: normalizedSubdomain };
};

export const updateAutoDeploySettings = async (
  chatId: string,
  autoDeploy: boolean,
) => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) throw new Error("User not authenticated");

  await requireSubscriptionIfBillingEnabled();

  const { data: chat } = await supabase
    .from("chats")
    .select("user_id, is_deployed")
    .eq("id", chatId)
    .single();

  if (!chat || chat.user_id !== user.id) {
    throw new Error("Unauthorized");
  }

  if (!chat.is_deployed) {
    throw new Error("Application must be deployed to enable auto-deploy");
  }

  const { error } = await supabase
    .from("chats")
    .update({ auto_deploy: autoDeploy })
    .eq("id", chatId);

  if (error) {
    console.error("Error updating auto-deploy settings:", error);
    throw new Error(error.message || "Failed to update auto-deploy settings");
  }

  return { success: true, autoDeploy };
};

export const autoDeployAfterBuild = async (
  chatId: string,
  version: number,
): Promise<void> => {
  try {
    const supabase = await createClient();

    // Fetch chat to check if auto-deploy is enabled
    const { data: chat, error: chatError } = await supabase
      .from("chats")
      .select("is_deployed, auto_deploy, deployed_version")
      .eq("id", chatId)
      .single();

    if (chatError || !chat) {
      console.log(
        `autoDeployAfterBuild: Could not fetch chat ${chatId}:`,
        chatError,
      );
      return;
    }

    // Check if chat is deployed and auto-deploy is enabled
    if (!chat.is_deployed) {
      console.log(
        `autoDeployAfterBuild: Chat ${chatId} is not deployed, skipping auto-deploy`,
      );
      return;
    }

    // auto_deploy defaults to true if null (for backward compatibility)
    const autoDeployEnabled = chat.auto_deploy !== false;
    if (!autoDeployEnabled) {
      console.log(
        `autoDeployAfterBuild: Auto-deploy is disabled for chat ${chatId}, skipping`,
      );
      return;
    }

    // Update deployed_version to the newly built version
    const { error: updateError } = await supabase
      .from("chats")
      .update({
        deployed_version: version,
        deployed_at: new Date().toISOString(),
      })
      .eq("id", chatId);

    if (updateError) {
      console.error(
        `autoDeployAfterBuild: Failed to update deployed version for chat ${chatId}:`,
        updateError,
      );
      return;
    }

    console.log(
      `autoDeployAfterBuild: Successfully auto-deployed version ${version} for chat ${chatId}`,
    );
  } catch (error) {
    console.error(
      `autoDeployAfterBuild: Unexpected error for chat ${chatId}:`,
      error,
    );
  }
};

export const addCustomDomain = async (chatId: string, domain: string) => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) throw new Error("User not authenticated");

  await requireSubscriptionIfBillingEnabled();

  const { data: chat } = await supabase
    .from("chats")
    .select("user_id, is_deployed")
    .eq("id", chatId)
    .single();

  if (!chat || chat.user_id !== user.id) {
    throw new Error("Unauthorized");
  }

  if (!chat.is_deployed) {
    throw new Error(
      "Application must be deployed before adding a custom domain",
    );
  }

  const normalizedDomain = domain.toLowerCase().trim();

  const { data: existingDomain } = await supabase
    .from("custom_domains")
    .select("id")
    .eq("domain", normalizedDomain)
    .maybeSingle();

  if (existingDomain) {
    throw new Error("This domain is already in use");
  }

  const { data: existingChatDomain } = await supabase
    .from("custom_domains")
    .select("id")
    .eq("chat_id", chatId)
    .maybeSingle();

  if (existingChatDomain) {
    throw new Error(
      "This project already has a custom domain. Please remove it first.",
    );
  }

  const verificationToken = `coderocket-verify-${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

  const { data: newDomain, error } = await supabase
    .from("custom_domains")
    .insert({
      chat_id: chatId,
      user_id: user.id,
      domain: normalizedDomain,
      verification_token: verificationToken,
      verification_method: "dns",
      is_verified: false,
      ssl_status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding custom domain:", error);
    throw new Error(error.message || "Failed to add custom domain");
  }

  return {
    success: true,
    domain: normalizedDomain,
    verificationToken,
    id: newDomain.id,
  };
};

export const verifyCustomDomain = async (domainId: string) => {
  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    const { data: domain } = await supabase
      .from("custom_domains")
      .select("*")
      .eq("id", domainId)
      .eq("user_id", user.id)
      .single();

    if (!domain) {
      return { success: false, error: "Domain not found or unauthorized" };
    }

    const verificationResult = await verifyDomainOwnership(
      domain.domain,
      domain.verification_token,
    );

    if (!verificationResult.verified) {
      return {
        success: false,
        error:
          verificationResult.error ||
          "Domain verification failed. Please check your DNS records.",
      };
    }

    let sslStatus = domainApiEnabled ? "pending" : "active";
    let sslError = null;

    if (domainApiEnabled) {
      try {
        await addDomainToVercel(domain.domain);
        sslStatus = "active";
      } catch (error) {
        console.error("Error adding domain to Vercel:", error);
        sslStatus = "failed";
        sslError =
          error instanceof Error ? error.message : "Failed to configure SSL";
      }
    }

    const { error } = await supabase
      .from("custom_domains")
      .update({
        is_verified: true,
        verified_at: new Date().toISOString(),
        ssl_status: sslStatus,
        ssl_issued_at: sslStatus === "active" ? new Date().toISOString() : null,
      })
      .eq("id", domainId);

    if (error) {
      console.error("Error updating domain verification:", error);
      return {
        success: false,
        error: "Failed to update domain verification status",
      };
    }

    if (sslError) {
      return {
        success: true,
        verified: true,
        warning: `Domain verified but SSL setup failed: ${sslError}`,
      };
    }

    if (!domainApiEnabled) {
      return {
        success: true,
        verified: true,
        warning:
          "Domain verified. DNS routing and HTTPS are managed by your self-hosted environment.",
      };
    }

    return { success: true, verified: true };
  } catch (error) {
    console.error("Unexpected error in verifyCustomDomain:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
};

export const deleteCustomDomain = async (domainId: string) => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) throw new Error("User not authenticated");

  const { data: domain } = await supabase
    .from("custom_domains")
    .select("user_id, domain, is_verified")
    .eq("id", domainId)
    .single();

  if (!domain || domain.user_id !== user.id) {
    throw new Error("Unauthorized");
  }

  if (domain.is_verified && domainApiEnabled) {
    try {
      await removeDomainFromVercel(domain.domain);
    } catch (error) {
      console.error("Error removing domain from Vercel:", error);
    }
  }

  const { error } = await supabase
    .from("custom_domains")
    .delete()
    .eq("id", domainId);

  if (error) {
    console.error("Error deleting custom domain:", error);
    throw new Error("Failed to delete custom domain");
  }

  return { success: true };
};

export const getCustomDomain = async (chatId: string) => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) throw new Error("User not authenticated");

  const { data: domain, error } = await supabase
    .from("custom_domains")
    .select("*")
    .eq("chat_id", chatId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching custom domain:", error);
    return null;
  }

  return domain;
};

export const checkCustomDomainAvailability = async (domain: string) => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) throw new Error("User not authenticated");

  const normalizedDomain = domain.toLowerCase().trim();

  const availabilityCheck = await checkDomainAvailability(normalizedDomain);

  if (!availabilityCheck.available) {
    return { available: false, reason: availabilityCheck.reason };
  }

  const { data: existingDomain } = await supabase
    .from("custom_domains")
    .select("id")
    .eq("domain", normalizedDomain)
    .maybeSingle();

  if (existingDomain) {
    return { available: false, reason: "Domain is already in use" };
  }

  return { available: true };
};

export const refreshSSLStatus = async (domainId: string) => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) throw new Error("User not authenticated");

  const { data: domain } = await supabase
    .from("custom_domains")
    .select("*")
    .eq("id", domainId)
    .eq("user_id", user.id)
    .single();

  if (!domain) {
    throw new Error("Domain not found or unauthorized");
  }

  if (!domain.is_verified) {
    return { ssl_status: "pending", message: "Domain must be verified first" };
  }

  if (!domainApiEnabled) {
    if (domain.ssl_status !== "active") {
      const { error } = await supabase
        .from("custom_domains")
        .update({
          ssl_status: "active",
          ssl_issued_at: domain.ssl_issued_at ?? new Date().toISOString(),
        })
        .eq("id", domainId);

      if (error) {
        throw new Error("Failed to update SSL status");
      }
    }

    return {
      ssl_status: "active",
      verified: true,
      message: "SSL is managed by your self-hosted reverse proxy.",
    };
  }

  try {
    const vercelStatus = await checkVercelDomainStatus(domain.domain);

    const sslStatus = vercelStatus.verified ? "active" : "pending";

    if (sslStatus === "active" && domain.ssl_status !== "active") {
      const { error } = await supabase
        .from("custom_domains")
        .update({
          ssl_status: "active",
          ssl_issued_at: new Date().toISOString(),
        })
        .eq("id", domainId);

      if (error) {
        throw new Error("Failed to update SSL status");
      }
    }

    return { ssl_status: sslStatus, verified: vercelStatus.verified };
  } catch (error) {
    console.error("Error checking SSL status:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to check SSL status",
    );
  }
};

export const deleteChatByChatId = async (chatId: string) => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) throw new Error("User not authenticated");

  // 1. Verify the user owns this chat
  const { data: chat, error: chatError } = await supabase
    .from("chats")
    .select("id, user_id")
    .eq("id", chatId)
    .single();

  if (chatError || !chat) {
    throw new Error("Chat not found");
  }

  if (chat.user_id !== user.id) {
    throw new Error("Unauthorized - you do not own this chat");
  }

  // 2. Delete related data in correct order (foreign key constraints)
  // Note: We do NOT delete token_usage_tracking and version_usage_tracking
  // as they track usage for billing purposes

  // Delete chat_integrations
  const { error: integrationsError } = await supabase
    .from("chat_integrations")
    .delete()
    .eq("chat_id", chatId);

  if (integrationsError) {
    console.error("Error deleting chat_integrations:", integrationsError);
  }

  // Delete chat_likes
  const { error: likesError } = await supabase
    .from("chat_likes")
    .delete()
    .eq("chat_id", chatId);

  if (likesError) {
    console.error("Error deleting chat_likes:", likesError);
  }

  // Delete custom_domains (and remove from Vercel if verified)
  const { data: customDomain } = await supabase
    .from("custom_domains")
    .select("domain, is_verified")
    .eq("chat_id", chatId)
    .maybeSingle();

  if (customDomain?.is_verified && domainApiEnabled) {
    try {
      await removeDomainFromVercel(customDomain.domain);
    } catch (error) {
      console.error("Error removing domain from Vercel:", error);
    }
  }

  const { error: domainsError } = await supabase
    .from("custom_domains")
    .delete()
    .eq("chat_id", chatId);

  if (domainsError) {
    console.error("Error deleting custom_domains:", domainsError);
  }

  // Delete generation_locks
  const { error: locksError } = await supabase
    .from("generation_locks")
    .delete()
    .eq("chat_id", chatId);

  if (locksError) {
    console.error("Error deleting generation_locks:", locksError);
  }

  // Delete messages
  const { error: messagesError } = await supabase
    .from("messages")
    .delete()
    .eq("chat_id", chatId);

  if (messagesError) {
    console.error("Error deleting messages:", messagesError);
    throw new Error("Failed to delete messages");
  }

  // Delete the chat itself
  const { error: deleteError } = await supabase
    .from("chats")
    .delete()
    .eq("id", chatId);

  if (deleteError) {
    console.error("Error deleting chat:", deleteError);
    throw new Error("Failed to delete chat");
  }

  // 3. Delete stored builds in background (after responding)
  // Using after() to run this in the background
  after(async () => {
    try {
      const response = await fetch(`${builderApiUrl}/builds/${chatId}`, {
        method: "DELETE",
        headers: buildBuilderHeaders(),
      });

      if (!response.ok) {
        console.error(
          `Failed to delete builds from storage: ${response.status}`,
        );
      } else {
        console.log(`Successfully deleted builds for chat ${chatId}`);
      }
    } catch (error) {
      console.error("Error deleting builds from storage:", error);
    }
  });

  return { success: true };
};
