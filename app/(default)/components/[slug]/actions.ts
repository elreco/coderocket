"use server";

import { after } from "next/server";

import { getSubscription } from "@/app/supabase-server";
import { takeScreenshot } from "@/utils/capture-screenshot";
import {
  extractFilesFromArtifact,
  hasArtifacts,
} from "@/utils/completion-parser";
import { builderApiUrl, Framework } from "@/utils/config";
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
  fetchLastAssistantMessageByChatId,
} from "../actions";

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
  const subscription = await getSubscription();
  if (!subscription) {
    throw new Error("payment-required");
  }

  // If trying to make the component public, check if it's listed on marketplace
  // Business rule: Components listed on marketplace must remain private to maintain
  // exclusivity for buyers who purchase access to these components
  if (isVisible) {
    const { data: marketplaceListing, error: marketplaceError } = await supabase
      .from("marketplace_listings")
      .select("id, title")
      .eq("chat_id", chatId)
      .eq("seller_id", user.id)
      .eq("is_active", true)
      .maybeSingle(); // Use maybeSingle() to avoid 406 errors

    if (marketplaceError && marketplaceError.code !== "PGRST116") {
      // PGRST116 is "no rows returned", which is fine
      console.error("Error checking marketplace listing:", marketplaceError);
    }

    if (marketplaceListing) {
      // This should not happen in normal usage as the UI prevents it,
      // but we keep this as a security measure
      throw new Error("marketplace-listed");
    }
  }

  const { error } = await supabase
    .from("chats")
    .update({ is_private: !isVisible })
    .eq("user_id", user.id)
    .eq("id", chatId);

  if (error) {
    throw new Error(`Failed to update visibility: ${error.message}`);
  }
};

export const improvePromptByChatId = async (chatId: string, prompt: string) => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) throw new Error("Could not get user");
  const subscription = await getSubscription();
  if (!subscription) {
    throw new Error("payment-required");
  }
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
  const subscription = await getSubscription();
  if (!subscription) {
    throw new Error("payment-required");
  }
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
  // Suppression des messages avec la même version
  const { error: deleteError } = await supabase
    .from("messages")
    .delete()
    .eq("version", message.version)
    .eq("chat_id", message.chat_id);
  if (deleteError) {
    throw new Error(`Failed to delete messages: ${deleteError.message}`);
  }
  // Récupération des messages ayant une version supérieure
  const { data: messagesToUpdate, error: fetchMessagesError } = await supabase
    .from("messages")
    .select("id, version")
    .gt("version", message.version)
    .eq("chat_id", message.chat_id);
  if (fetchMessagesError) {
    throw new Error(
      `Failed to fetch messages for version update: ${fetchMessagesError.message}`,
    );
  }
  // Mise à jour des messages individuellement
  for (const msg of messagesToUpdate) {
    const { error: updateError } = await supabase
      .from("messages")
      .update({ version: msg.version - 1 })
      .eq("id", msg.id);

    if (updateError) {
      throw new Error(
        `Failed to update message ID ${msg.id}: ${updateError.message}`,
      );
    }
  }
  // get new messages
  const refreshedChatMessages = await fetchLastAssistantMessageByChatId(
    message.chat_id,
  );
  if (!refreshedChatMessages) {
    throw new Error("No refreshed chat messages found");
  }

  // FIXED: Use latest artifact code from messages instead of chats table
  const latestArtifactCode = await getLatestArtifactCode(message.chat_id);
  const finalArtifactCode =
    refreshedChatMessages.artifact_code || latestArtifactCode || "";

  // Note: No need to delete builds manually - forceBuild: true will handle cleanup

  // Mark ALL remaining versions as not built since build environment may have changed
  // When we delete a version, the build chain is broken and all versions need to be rebuilt
  const { data: allRemainingMessages } = await supabase
    .from("messages")
    .select("id, version")
    .eq("chat_id", message.chat_id)
    .eq("role", "assistant");

  if (allRemainingMessages && allRemainingMessages.length > 0) {
    // Mark ALL versions as not built since the build environment is reset
    await supabase
      .from("messages")
      .update({ is_built: false })
      .eq("chat_id", message.chat_id)
      .eq("role", "assistant");

    console.log(
      `Marked ${allRemainingMessages.length} versions as not built after deletion`,
    );
  }

  // Update chats table with the artifact code from the new latest version
  await supabase
    .from("chats")
    .update({ artifact_code: finalArtifactCode })
    .eq("id", message.chat_id);

  // Find what will be the displayed version after deletion and renaming
  // After deletion and version renaming, the new highest version will need to be built
  if (refreshedChatMessages && refreshedChatMessages.version >= 0) {
    // Get the framework to know if we should build
    const { data: chat } = await supabase
      .from("chats")
      .select("framework")
      .eq("id", message.chat_id)
      .single();

    // Build the new latest version if it's a web framework
    if (chat?.framework !== Framework.HTML) {
      after(async () => {
        await buildComponent(
          message.chat_id,
          refreshedChatMessages.version,
          true,
        );
      });
    }
  }
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
  forceBuild?: boolean,
) => {
  try {
    const lastAssistantMessage = await fetchAssistantMessageByChatIdAndVersion(
      chatId,
      version,
    );
    if (!lastAssistantMessage) {
      throw new Error("No last assistant message found");
    }

    if (lastAssistantMessage.is_built && !forceBuild) {
      return;
    }

    const chat = await fetchChatById(chatId);
    if (!chat) {
      throw new Error("No chat found");
    }

    if (chat.framework === Framework.HTML) {
      return;
    }

    const newArtifactFiles = extractFilesFromArtifact(
      lastAssistantMessage.artifact_code || "",
    );

    if (!newArtifactFiles.length) {
      console.warn("No files found in completion - skipping build");
      return;
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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chatId,
        version,
        files: newArtifactFiles,
        forceBuild,
        envVars,
      }),
    });

    const responseData = await builderResponse.json();
    if (responseData.errors) {
      throw new Error(responseData.errors);
    }

    const supabase = await createClient();
    await supabase
      .from("messages")
      .update({ is_built: responseData.event === "success" })
      .eq("chat_id", chatId)
      .eq("role", "assistant")
      .eq("version", version);

    await takeScreenshot(
      chatId,
      version,
      undefined,
      chat.framework || Framework.REACT,
    );
  } catch (error) {
    console.error("API error:", error);
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
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

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

  const subscription = await getSubscription();
  if (!subscription) {
    throw new Error("payment-required");
  }

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

  const subscription = await getSubscription();
  if (!subscription) {
    throw new Error("payment-required");
  }

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

  const subscription = await getSubscription();
  if (!subscription) {
    throw new Error("payment-required");
  }

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

export const addCustomDomain = async (chatId: string, domain: string) => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) throw new Error("User not authenticated");

  const subscription = await getSubscription();
  if (!subscription) {
    throw new Error("payment-required");
  }

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

    let sslStatus = "pending";
    let sslError = null;

    try {
      await addDomainToVercel(domain.domain);
      sslStatus = "active";
    } catch (error) {
      console.error("Error adding domain to Vercel:", error);
      sslStatus = "failed";
      sslError =
        error instanceof Error ? error.message : "Failed to configure SSL";
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

  if (domain.is_verified) {
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
