"use server";

import { Tables } from "@/types_db";
import {
  extractFilesFromArtifact,
  ChatFile,
  extractFilesFromCompletion,
} from "@/utils/completion-parser";
import { createClient } from "@/utils/supabase/server";

interface GitHubRepoResponse {
  name: string;
  full_name: string;
  html_url: string;
  clone_url: string;
}

interface GitHubContentItem {
  name: string;
  type: "file" | "dir";
  download_url: string;
  size: number;
}

export async function getGithubConnectionForUser(): Promise<Tables<"github_connections"> | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return null;
  }

  const { data, error } = await supabase
    .from("github_connections")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) {
    return null;
  }

  return data;
}

export async function createGithubRepo(
  chatId: string,
  repoName: string,
): Promise<{ success: boolean; error?: string; repoUrl?: string }> {
  const supabase = await createClient();

  // Vérifier que l'utilisateur est connecté
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  // Récupérer la connexion GitHub
  const githubConnection = await getGithubConnectionForUser();
  if (!githubConnection) {
    return { success: false, error: "GitHub not connected" };
  }

  // Récupérer les informations du chat
  const { data: chat, error: chatError } = await supabase
    .from("chats")
    .select("*")
    .eq("id", chatId)
    .eq("user_id", user.id)
    .single();

  if (chatError || !chat) {
    return { success: false, error: "Chat not found or access denied" };
  }

  try {
    // Créer le repository sur GitHub
    const createRepoResponse = await fetch(
      "https://api.github.com/user/repos",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${githubConnection.access_token}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: repoName,
          description: `CodeRocket component: ${chat.title || "Untitled Component"}`,
          private: false, // On peut rendre configurable plus tard
          auto_init: true,
          gitignore_template: "Node",
        }),
      },
    );

    if (!createRepoResponse.ok) {
      const errorData = await createRepoResponse.json();
      if (
        createRepoResponse.status === 422 &&
        errorData.errors?.[0]?.message?.includes("already exists")
      ) {
        return { success: false, error: "Repository already exists" };
      }
      throw new Error(errorData.message || "Failed to create repository");
    }

    const repoData: GitHubRepoResponse = await createRepoResponse.json();

    // Mettre à jour le chat avec les informations du repo
    const { error: updateError } = await supabase
      .from("chats")
      .update({
        github_repo_url: repoData.html_url,
        github_repo_name: repoData.full_name,
        github_sync_enabled: true,
      })
      .eq("id", chatId);

    if (updateError) {
      throw new Error("Failed to update chat with GitHub info");
    }

    return {
      success: true,
      repoUrl: repoData.html_url,
    };
  } catch (error) {
    console.error("GitHub repo creation error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create repository",
    };
  }
}

export async function syncComponentToGithub(
  chatId: string,
  version?: number,
  forceSync: boolean = false,
): Promise<{ success: boolean; error?: string; message?: string }> {
  const supabase = await createClient();

  // Vérifier que l'utilisateur est connecté
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  // Récupérer la connexion GitHub
  const githubConnection = await getGithubConnectionForUser();
  if (!githubConnection) {
    return { success: false, error: "GitHub not connected" };
  }

  // Récupérer le chat et vérifier qu'il a un repo GitHub
  const { data: chat, error: chatError } = await supabase
    .from("chats")
    .select("*")
    .eq("id", chatId)
    .eq("user_id", user.id)
    .single();

  if (chatError || !chat) {
    return { success: false, error: "Chat not found or access denied" };
  }

  if (!chat.github_repo_name || !chat.github_sync_enabled) {
    console.error("❌ GitHub sync issue:", {
      github_repo_name: chat.github_repo_name,
      github_sync_enabled: chat.github_sync_enabled,
    });
    return {
      success: false,
      error: "GitHub sync not enabled for this component",
    };
  }

  console.log("🔍 DEBUG - Repository info:", {
    github_repo_name: chat.github_repo_name,
    github_repo_url: chat.github_repo_url,
    github_sync_enabled: chat.github_sync_enabled,
  });

  // Récupérer le message assistant pour la version spécifiée
  let messageQuery = supabase
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .eq("role", "assistant");

  if (version !== undefined) {
    messageQuery = messageQuery.eq("version", version);
  } else {
    // Si pas de version spécifiée, prendre la dernière version
    messageQuery = messageQuery.order("version", { ascending: false }).limit(1);
  }

  const { data: message, error: messageError } = await messageQuery.single();

  if (messageError || !message) {
    console.error("❌ Message query error:", messageError);
    return {
      success: false,
      error: `Message version ${version || "latest"} not found`,
    };
  }

  console.log(`🔍 DEBUG - Found message for version ${message.version}`);

  if (!message.artifact_code && !message.content) {
    return { success: false, error: "No code found for this version" };
  }

  try {
    // Debug: Vérifier le contenu de l'artifact
    console.log(
      "🔍 DEBUG - artifact_code:",
      message.artifact_code ? "Present" : "Empty",
    );
    console.log("🔍 DEBUG - chat framework:", chat.framework);

    // Créer/mettre à jour les fichiers dans le repo GitHub
    let chatFiles = message.artifact_code
      ? extractFilesFromArtifact(message.artifact_code)
      : [];
    console.log(
      "🔍 DEBUG - extractFilesFromArtifact result:",
      chatFiles.length,
      "files",
    );

    // Si pas de fichiers extraits de l'artifact, essayer avec le contenu du message
    if (chatFiles.length === 0 && message.content) {
      console.log(
        "🔍 DEBUG - Trying extractFilesFromCompletion on message content",
      );
      chatFiles = extractFilesFromCompletion(message.content);
      console.log(
        "🔍 DEBUG - extractFilesFromCompletion result:",
        chatFiles.length,
        "files",
      );
    }

    // Si toujours pas de fichiers, créer un fichier par défaut avec le contenu de l'artifact
    if (chatFiles.length === 0 && message.artifact_code) {
      console.log("🔍 DEBUG - Creating default file from artifact_code");
      const fileName = chat.framework === "html" ? "index.html" : "src/App.jsx";
      chatFiles = [
        {
          name: fileName,
          content: message.artifact_code,
          isDelete: false,
          isActive: true,
          isIncomplete: false,
          isContinue: false,
        },
      ];
    }

    console.log(
      "🔍 DEBUG - Final chatFiles:",
      chatFiles.map((f) => ({
        name: f.name,
        contentLength: f.content?.length || 0,
      })),
    );

    const githubFiles = convertChatFilesToGithubFiles(
      chatFiles,
      chat.framework,
    );
    console.log("🔍 DEBUG - GitHub files to sync:", githubFiles.length);
    console.log(
      "🔍 DEBUG - Files details:",
      githubFiles.map((f) => ({
        path: f.path,
        contentLength: f.content.length,
      })),
    );

    if (githubFiles.length === 0) {
      return { success: false, error: "No files found to sync" };
    }

    const commitResults = [];
    const skippedFiles = [];
    const webLastModified = new Date(message.created_at);

    console.log(
      `🔍 DEBUG - Web version last modified: ${webLastModified.toISOString()}`,
    );

    for (const file of githubFiles) {
      console.log(`🔍 DEBUG - Checking sync eligibility for: ${file.path}`);

      // Vérifier si on doit synchroniser ce fichier (stratégie "Last Write Wins")
      const syncDecision = await shouldSyncFile(
        githubConnection.access_token,
        chat.github_repo_name,
        file.path,
        webLastModified,
        forceSync,
      );

      console.log(
        `🔍 DEBUG - Sync decision for ${file.path}: ${syncDecision.shouldSync ? "SYNC" : "SKIP"} - ${syncDecision.reason}`,
      );

      if (!syncDecision.shouldSync) {
        skippedFiles.push({
          path: file.path,
          reason: syncDecision.reason,
        });
        continue;
      }

      console.log(
        `🔍 DEBUG - Syncing file: ${file.path} (${file.content.length} chars)`,
      );
      const result = await createOrUpdateGithubFile(
        githubConnection.access_token,
        chat.github_repo_name,
        file.path,
        file.content,
        `Update ${file.path} - Version ${version || message.version}`,
        githubConnection.github_username || "coderocket-user",
      );
      console.log(`🔍 DEBUG - Sync result for ${file.path}:`, result);
      commitResults.push(result);
    }

    // Log des fichiers ignorés
    if (skippedFiles.length > 0) {
      console.log(
        "📋 Files skipped due to Last Write Wins strategy:",
        skippedFiles,
      );
    }

    // Vérifier que tous les commits ont réussi
    const failedCommits = commitResults.filter((r) => !r.success);
    if (failedCommits.length > 0) {
      console.error("❌ Failed commits:", failedCommits);
      throw new Error(
        `Failed to update ${failedCommits.length} files: ${failedCommits.map((f) => f.error).join(", ")}`,
      );
    }

    const syncedCount = commitResults.length;
    const skippedCount = skippedFiles.length;

    console.log(
      `✅ Sync completed: ${syncedCount} files synced, ${skippedCount} files skipped`,
    );

    // Mettre à jour la date de dernière sync seulement si au moins un fichier a été synchronisé
    if (syncedCount > 0) {
      await supabase
        .from("chats")
        .update({
          last_github_sync: new Date().toISOString(),
        })
        .eq("id", chatId);
    }

    return {
      success: true,
      message: `Sync completed: ${syncedCount} files synced, ${skippedCount} files skipped due to newer GitHub versions`,
    };
  } catch (error) {
    console.error("GitHub sync error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to sync to GitHub",
    };
  }
}

function convertChatFilesToGithubFiles(
  chatFiles: ChatFile[],
  framework: string | null,
): Array<{ path: string; content: string }> {
  const githubFiles: Array<{ path: string; content: string }> = [];

  // Si pas de fichiers dans l'artifact, on ne peut pas sync
  if (!chatFiles || chatFiles.length === 0) {
    return githubFiles;
  }

  // Convertir chaque ChatFile vers le format GitHub
  for (const chatFile of chatFiles) {
    if (!chatFile.name || !chatFile.content) continue;

    githubFiles.push({
      path: chatFile.name,
      content: chatFile.content,
    });
  }

  // Ajouter des fichiers supplémentaires selon le framework
  if (framework !== "html") {
    // Pour React/Next.js, ajouter package.json si pas déjà présent
    const hasPackageJson = githubFiles.some((f) => f.path === "package.json");
    if (!hasPackageJson) {
      githubFiles.push({
        path: "package.json",
        content: JSON.stringify(
          {
            name: "coderocket-component",
            version: "1.0.0",
            private: true,
            dependencies: {
              react: "^18.0.0",
              "react-dom": "^18.0.0",
            },
            scripts: {
              start: "react-scripts start",
              build: "react-scripts build",
            },
          },
          null,
          2,
        ),
      });
    }
  }

  // Ajouter un README
  const hasReadme = githubFiles.some((f) =>
    f.path.toLowerCase().includes("readme"),
  );
  if (!hasReadme) {
    githubFiles.push({
      path: "README.md",
      content: `# CodeRocket Component

This component was generated with [CodeRocket](https://www.coderocket.app).

## Getting Started

1. Clone this repository
2. Install dependencies: \`npm install\`
3. Start development server: \`npm start\`

## About CodeRocket

CodeRocket is an AI-powered tool for generating beautiful UI components. Visit [coderocket.app](https://www.coderocket.app) to create your own components!
`,
    });
  }

  return githubFiles;
}

async function createOrUpdateGithubFile(
  accessToken: string,
  repoFullName: string,
  filePath: string,
  content: string,
  commitMessage: string,
  username: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(
      `🔍 DEBUG - Creating/updating file: ${filePath} in ${repoFullName}`,
    );
    console.log(`🔍 DEBUG - Content length: ${content.length} chars`);
    console.log(`🔍 DEBUG - Content preview: ${content.substring(0, 100)}...`);

    // D'abord, essayer de récupérer le fichier existant pour obtenir le SHA
    let sha: string | undefined;
    const getFileUrl = `https://api.github.com/repos/${repoFullName}/contents/${filePath}`;
    console.log(`🔍 DEBUG - GET request to: ${getFileUrl}`);

    const getFileResponse = await fetch(getFileUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    console.log(`🔍 DEBUG - GET response status: ${getFileResponse.status}`);

    if (getFileResponse.ok) {
      const fileData = await getFileResponse.json();
      sha = fileData.sha;
      console.log(`🔍 DEBUG - Found existing file with SHA: ${sha}`);
    } else {
      console.log(`🔍 DEBUG - File does not exist, will create new file`);
    }

    // Créer ou mettre à jour le fichier
    const base64Content = Buffer.from(content).toString("base64");
    console.log(`🔍 DEBUG - Base64 content length: ${base64Content.length}`);

    const payload = {
      message: commitMessage,
      content: base64Content,
      sha: sha, // Inclure le SHA si le fichier existe déjà
      committer: {
        name: username,
        email: `${username}@users.noreply.github.com`,
      },
    };

    console.log(`🔍 DEBUG - PUT payload:`, {
      message: payload.message,
      contentLength: payload.content.length,
      hasSha: !!payload.sha,
      committer: payload.committer,
    });

    const updateResponse = await fetch(getFileUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    console.log(`🔍 DEBUG - PUT response status: ${updateResponse.status}`);

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      console.error(`❌ GitHub API error for ${filePath}:`, errorData);
      throw new Error(
        errorData.message || `Failed to update file: ${updateResponse.status}`,
      );
    }

    const responseData = await updateResponse.json();
    console.log(
      `✅ Successfully updated ${filePath}, commit SHA: ${responseData.commit?.sha}`,
    );

    return { success: true };
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function toggleGithubSync(
  chatId: string,
  enabled: boolean,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("chats")
    .update({ github_sync_enabled: enabled })
    .eq("id", chatId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

async function getGithubFileLastModified(
  accessToken: string,
  repoFullName: string,
  filePath: string,
): Promise<{ lastModified: Date | null; error?: string }> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${repoFullName}/commits?path=${encodeURIComponent(filePath)}&per_page=1`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    if (!response.ok) {
      if (response.status === 404) {
        // Fichier n'existe pas sur GitHub
        return { lastModified: null };
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const commits = await response.json();
    if (commits.length === 0) {
      return { lastModified: null };
    }

    const lastCommitDate = new Date(commits[0].commit.committer.date);
    return { lastModified: lastCommitDate };
  } catch (error) {
    return {
      lastModified: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function shouldSyncFile(
  accessToken: string,
  repoFullName: string,
  filePath: string,
  webLastModified: Date,
  forceSync: boolean = false,
): Promise<{ shouldSync: boolean; reason: string }> {
  if (forceSync) {
    return { shouldSync: true, reason: "Force sync enabled" };
  }

  const githubFileInfo = await getGithubFileLastModified(
    accessToken,
    repoFullName,
    filePath,
  );

  if (githubFileInfo.error) {
    console.warn(
      `⚠️ Could not check GitHub file modification date for ${filePath}:`,
      githubFileInfo.error,
    );
    // En cas d'erreur, on assume qu'on peut synchroniser
    return {
      shouldSync: true,
      reason: "Could not check GitHub file, proceeding with sync",
    };
  }

  if (!githubFileInfo.lastModified) {
    // Fichier n'existe pas sur GitHub, on peut synchroniser
    return { shouldSync: true, reason: "File does not exist on GitHub" };
  }

  // Comparer les dates (stratégie "Last Write Wins")
  if (webLastModified > githubFileInfo.lastModified) {
    return {
      shouldSync: true,
      reason: `Web version newer (${webLastModified.toISOString()} > ${githubFileInfo.lastModified.toISOString()})`,
    };
  } else {
    return {
      shouldSync: false,
      reason: `GitHub version newer (${githubFileInfo.lastModified.toISOString()} >= ${webLastModified.toISOString()})`,
    };
  }
}

async function getGithubRepositoryFiles(
  accessToken: string,
  repoFullName: string,
): Promise<{ success: boolean; files?: ChatFile[]; error?: string }> {
  try {
    console.log(`🔍 DEBUG - Fetching repository contents for: ${repoFullName}`);

    const files: ChatFile[] = [];

    // Fonction récursive pour explorer tous les dossiers
    const fetchFilesRecursively = async (path: string = ""): Promise<void> => {
      const url = path
        ? `https://api.github.com/repos/${repoFullName}/contents/${path}`
        : `https://api.github.com/repos/${repoFullName}/contents`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const contents: GitHubContentItem[] = await response.json();
      console.log("🔍 DEBUG - Contents:", contents);
      for (const item of contents) {
        if (item.type === "dir") {
          // Récursivement explorer les dossiers (sauf node_modules, .git, etc.)
          if (!shouldSkipDirectory(item.name)) {
            const dirPath = path ? `${path}/${item.name}` : item.name;
            await fetchFilesRecursively(dirPath);
          }
        } else if (item.type === "file") {
          // Récupérer tous les fichiers intéressants
          if (shouldIncludeFile(item.name)) {
            try {
              const fileResponse = await fetch(item.download_url, {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              });

              if (fileResponse.ok) {
                const content = await fileResponse.text();
                const filePath = path ? `${path}/${item.name}` : item.name;

                console.log(
                  `🔍 DEBUG - Fetched ${filePath}: ${content.length} chars`,
                );

                files.push({
                  name: filePath,
                  content: content,
                  isDelete: false,
                  isActive: false,
                  isIncomplete: false,
                  isContinue: false,
                });
              } else {
                console.warn(
                  `⚠️ Could not fetch ${item.name}: ${fileResponse.status}`,
                );
              }
            } catch (error) {
              console.warn(`⚠️ Error fetching ${item.name}:`, error);
            }
          }
        }
      }
    };

    // Fonction pour déterminer si on doit ignorer un dossier
    const shouldSkipDirectory = (dirName: string): boolean => {
      const skipDirs = [
        "node_modules",
        ".git",
        ".next",
        "dist",
        "build",
        ".vercel",
        ".netlify",
        "coverage",
        ".nyc_output",
        "tmp",
        "temp",
      ];
      return skipDirs.includes(dirName) || dirName.startsWith(".");
    };

    // Fonction pour déterminer si on doit inclure un fichier
    const shouldIncludeFile = (fileName: string): boolean => {
      // Extensions de fichiers de code et de configuration
      const includeExtensions = [
        ".html",
        ".htm",
        ".js",
        ".jsx",
        ".ts",
        ".tsx",
        ".css",
        ".scss",
        ".sass",
        ".less",
        ".vue",
        ".svelte",
        ".json",
        ".md",
        ".txt",
        ".py",
        ".php",
        ".rb",
        ".go",
        ".yml",
        ".yaml",
        ".toml",
        ".env",
      ];

      // Fichiers spéciaux à inclure
      const includeFiles = [
        "package.json",
        "package-lock.json",
        "yarn.lock",
        "pnpm-lock.yaml",
        "Dockerfile",
        "README.md",
        "LICENSE",
        "tsconfig.json",
        "tailwind.config.js",
        "vite.config.js",
        "next.config.js",
        "webpack.config.js",
      ];

      // Vérifier si c'est un fichier spécial à inclure
      if (includeFiles.includes(fileName)) {
        return true;
      }

      // Vérifier l'extension
      const hasValidExtension = includeExtensions.some((ext) =>
        fileName.toLowerCase().endsWith(ext),
      );

      // Ignorer les fichiers cachés et les fichiers de build
      const isHiddenOrBuild =
        fileName.startsWith(".") ||
        fileName.includes(".min.") ||
        fileName.includes(".map");

      return hasValidExtension && !isHiddenOrBuild;
    };

    // Commencer la récupération récursive
    await fetchFilesRecursively();

    // Marquer le premier fichier comme actif
    if (files.length > 0) {
      files[0].isActive = true;
    }

    console.log(`✅ Successfully fetched ${files.length} files from GitHub`);
    return { success: true, files };
  } catch (error) {
    console.error("❌ Error fetching GitHub repository files:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch files from GitHub",
    };
  }
}

function convertGithubFilesToArtifact(
  files: ChatFile[],
  title?: string,
): string {
  const artifactTitle = title || "GitHub Files";

  let artifactContent = `<coderocketArtifact title="${artifactTitle}">\n`;

  for (const file of files) {
    artifactContent += `<coderocketFile name="${file.name}">\n${file.content}\n</coderocketFile>\n`;
  }

  artifactContent += "</coderocketArtifact>";

  return artifactContent;
}

export async function pullFromGithub(
  chatId: string,
): Promise<{ success: boolean; error?: string; message?: string }> {
  const supabase = await createClient();

  // Vérifier que l'utilisateur est connecté
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  // Récupérer la connexion GitHub
  const githubConnection = await getGithubConnectionForUser();
  if (!githubConnection) {
    return { success: false, error: "GitHub not connected" };
  }

  // Récupérer le chat et vérifier qu'il a un repo GitHub
  const { data: chat, error: chatError } = await supabase
    .from("chats")
    .select("*")
    .eq("id", chatId)
    .eq("user_id", user.id)
    .single();

  if (chatError || !chat) {
    return { success: false, error: "Chat not found or access denied" };
  }

  if (!chat.github_repo_name || !chat.github_sync_enabled) {
    return {
      success: false,
      error: "GitHub sync not enabled for this component",
    };
  }

  console.log(
    "🔍 DEBUG - Pulling from GitHub repository:",
    chat.github_repo_name,
  );

  try {
    // Récupérer les fichiers depuis GitHub
    const githubFilesResult = await getGithubRepositoryFiles(
      githubConnection.access_token,
      chat.github_repo_name,
    );
    console.log("🔍 DEBUG - Github files result:", githubFilesResult);
    if (!githubFilesResult.success || !githubFilesResult.files) {
      throw new Error(
        githubFilesResult.error || "Failed to fetch files from GitHub",
      );
    }

    if (githubFilesResult.files.length === 0) {
      return {
        success: false,
        error: "No code files found in GitHub repository",
      };
    }

    // Convertir les fichiers en format artifact
    const newArtifactCode = convertGithubFilesToArtifact(
      githubFilesResult.files,
      chat.title || "Pulled from GitHub",
    );

    console.log(
      "🔍 DEBUG - Generated artifact code length:",
      newArtifactCode.length,
    );

    // Récupérer la dernière version du message assistant
    const { data: lastMessage, error: messageError } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .eq("role", "assistant")
      .order("version", { ascending: false })
      .limit(1)
      .single();

    if (messageError || !lastMessage) {
      return {
        success: false,
        error: "Could not find existing message to update",
      };
    }

    // Mettre à jour le message existant au lieu de créer une nouvelle version
    const { error: updateError } = await supabase
      .from("messages")
      .update({
        content: `Updated with changes from GitHub repository.\n\n${newArtifactCode}`,
        artifact_code: newArtifactCode,
      })
      .eq("id", lastMessage.id);

    if (updateError) {
      throw new Error(`Failed to update message: ${updateError.message}`);
    }

    // Mettre à jour le chat avec le nouvel artifact code
    const { error: updateChatError } = await supabase
      .from("chats")
      .update({
        artifact_code: newArtifactCode,
        last_github_sync: new Date().toISOString(),
      })
      .eq("id", chatId);

    if (updateChatError) {
      console.warn("⚠️ Could not update chat artifact_code:", updateChatError);
    }

    console.log(
      `✅ Successfully pulled ${githubFilesResult.files.length} files from GitHub`,
    );

    return {
      success: true,
      message: `Successfully pulled ${githubFilesResult.files.length} files from GitHub repository. Updated current version.`,
    };
  } catch (error) {
    console.error("❌ GitHub pull error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to pull from GitHub",
    };
  }
}

export async function autoSyncToGithubAfterGeneration(
  chatId: string,
  version: number,
): Promise<void> {
  try {
    const supabase = await createClient();

    // Vérifier que l'utilisateur est connecté
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log("🔍 Auto-sync skipped: User not authenticated");
      return;
    }

    // Vérifier si le chat a GitHub activé
    const { data: chat, error: chatError } = await supabase
      .from("chats")
      .select("github_repo_name, github_sync_enabled, title")
      .eq("id", chatId)
      .eq("user_id", user.id)
      .single();

    if (chatError || !chat) {
      console.log("🔍 Auto-sync skipped: Chat not found");
      return;
    }

    if (!chat.github_repo_name || !chat.github_sync_enabled) {
      console.log(
        "🔍 Auto-sync skipped: GitHub sync not enabled for this component",
      );
      return;
    }

    // Vérifier la connexion GitHub
    const githubConnection = await getGithubConnectionForUser();
    if (!githubConnection) {
      console.log("🔍 Auto-sync skipped: GitHub not connected");
      return;
    }

    console.log(
      `🚀 Auto-syncing version ${version} to GitHub for chat ${chatId}`,
    );

    // Utiliser Force Sync pour s'assurer que les nouvelles générations sont toujours poussées
    const result = await syncComponentToGithub(chatId, version, true);

    if (result.success) {
      console.log(
        `✅ Auto-sync successful for version ${version}:`,
        result.message,
      );
    } else {
      console.error(
        `❌ Auto-sync failed for version ${version}:`,
        result.error,
      );
    }
  } catch (error) {
    console.error("❌ Auto-sync error:", error);
  }
}
