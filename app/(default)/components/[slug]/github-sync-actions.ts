"use server";
import { getSubscription } from "@/app/supabase-server";
import { Tables } from "@/types_db";
import {
  extractFilesFromArtifact,
  ChatFile,
  extractFilesFromCompletion,
  getUpdatedArtifactCode,
} from "@/utils/completion-parser";
import { getLatestArtifactCode } from "@/utils/supabase/artifact-helpers";
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

  // Vérifier l'abonnement premium
  const subscription = await getSubscription();
  if (!subscription) {
    return {
      success: false,
      error: "Premium subscription required for GitHub sync",
    };
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

  // Vérifier l'abonnement premium
  const subscription = await getSubscription();
  if (!subscription) {
    return {
      success: false,
      error: "Premium subscription required for GitHub sync",
    };
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

  if (!chat.github_repo_name) {
    return {
      success: false,
      error: "GitHub sync not enabled for this component",
    };
  }

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
    return {
      success: false,
      error: `Message version ${version || "latest"} not found`,
    };
  }

  if (!message.artifact_code && !message.content) {
    return { success: false, error: "No code found for this version" };
  }

  try {
    // Créer/mettre à jour les fichiers dans le repo GitHub
    let chatFiles = message.artifact_code
      ? extractFilesFromArtifact(message.artifact_code)
      : [];

    // Si pas de fichiers extraits de l'artifact, essayer avec le contenu du message
    if (chatFiles.length === 0 && message.content) {
      chatFiles = extractFilesFromCompletion(message.content);
    }

    // Si toujours pas de fichiers, créer un fichier par défaut avec le contenu de l'artifact
    if (chatFiles.length === 0 && message.artifact_code) {
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

    const githubFiles = convertChatFilesToGithubFiles(
      chatFiles,
      chat.framework,
    );

    if (githubFiles.length === 0) {
      return { success: false, error: "No files found to sync" };
    }

    const skippedFiles: Array<{ path: string; reason: string }> = [];
    const webLastModified = new Date(message.created_at);

    // Collect all files that need to be synced
    const filesToSync: Array<{ path: string; content: string }> = [];

    for (const file of githubFiles) {
      // Check if we should sync this file (Last Write Wins strategy)
      const syncDecision = await shouldSyncFile(
        githubConnection.access_token || "",
        chat.github_repo_name,
        file.path,
        webLastModified,
        forceSync,
      );

      if (!syncDecision.shouldSync) {
        skippedFiles.push({
          path: file.path,
          reason: syncDecision.reason,
        });
        continue;
      }

      filesToSync.push(file);
    }

    if (filesToSync.length > 0) {
      // Check if files actually have changes compared to GitHub
      const filesWithChanges = await getFilesWithActualChanges(
        githubConnection.access_token || "",
        chat.github_repo_name,
        filesToSync,
      );

      if (filesWithChanges.length === 0) {
        const message = forceSync
          ? `Force sync completed: All ${filesToSync.length} files were already up-to-date on GitHub`
          : `No changes detected: All ${filesToSync.length} files are identical to GitHub versions (tip: files may have been auto-synced after AI generation)`;

        return {
          success: true,
          message,
        };
      }

      // Create a single commit with only files that have changes
      const commitResult = await createSingleCommitWithMultipleFiles(
        githubConnection.access_token || "",
        chat.github_repo_name,
        filesWithChanges,
        `Update files - Version ${version || message.version}`,
        githubConnection.github_username || "coderocket-user",
      );

      if (commitResult.success) {
        // Update sync stats for changed files only
        const syncedCount = filesWithChanges.length;
        const skippedCount =
          skippedFiles.length + (filesToSync.length - filesWithChanges.length);

        const syncType = forceSync ? "Force sync" : "Sync";
        const successMessage = `${syncType} completed: ${syncedCount} files in 1 commit, ${skippedCount} files skipped${filesToSync.length - filesWithChanges.length > 0 ? ` (${filesToSync.length - filesWithChanges.length} unchanged)` : ""}`;

        // Update last sync date
        await supabase
          .from("chats")
          .update({
            last_github_sync: new Date().toISOString(),
          })
          .eq("id", chatId);

        return {
          success: true,
          message: successMessage,
        };
      } else {
        throw new Error(`Failed to create commit: ${commitResult.error}`);
      }
    }

    // If we reach here, no files needed syncing
    return {
      success: true,
      message: `No files to sync - ${skippedFiles.length} files skipped due to newer GitHub versions`,
    };
  } catch (error) {
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

async function createSingleCommitWithMultipleFiles(
  accessToken: string,
  repoFullName: string,
  files: Array<{ path: string; content: string }>,
  commitMessage: string,
  username: string,
): Promise<{ success: boolean; error?: string; commitSha?: string }> {
  try {
    // Step 1: Get the latest commit SHA (HEAD of default branch)
    // Try main first, fallback to master for older repos
    let branchResponse = await fetch(
      `https://api.github.com/repos/${repoFullName}/git/refs/heads/main`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    let defaultBranch = "main";

    if (!branchResponse.ok && branchResponse.status === 404) {
      branchResponse = await fetch(
        `https://api.github.com/repos/${repoFullName}/git/refs/heads/master`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        },
      );
      defaultBranch = "master";
    }

    if (!branchResponse.ok) {
      throw new Error(`Failed to get branch info: ${branchResponse.status}`);
    }

    const branchData = await branchResponse.json();
    const latestCommitSha = branchData.object.sha;

    // Step 2: Get the current tree SHA from the latest commit
    const commitResponse = await fetch(
      `https://api.github.com/repos/${repoFullName}/git/commits/${latestCommitSha}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    if (!commitResponse.ok) {
      throw new Error(`Failed to get commit info: ${commitResponse.status}`);
    }

    const commitData = await commitResponse.json();
    const baseTreeSha = commitData.tree.sha;

    // Step 3: Create tree entries for all files
    const treeEntries = files.map((file) => ({
      path: file.path,
      mode: "100644", // Regular file
      type: "blob",
      content: file.content,
    }));

    // Step 4: Create a new tree
    const treeResponse = await fetch(
      `https://api.github.com/repos/${repoFullName}/git/trees`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: treeEntries,
        }),
      },
    );

    if (!treeResponse.ok) {
      const errorData = await treeResponse.json();
      throw new Error(
        `Failed to create tree: ${errorData.message || treeResponse.status}`,
      );
    }

    const treeData = await treeResponse.json();
    const newTreeSha = treeData.sha;

    // Step 5: Create a new commit
    const newCommitResponse = await fetch(
      `https://api.github.com/repos/${repoFullName}/git/commits`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: commitMessage,
          tree: newTreeSha,
          parents: [latestCommitSha],
          author: {
            name: username,
            email: `${username}@users.noreply.github.com`,
          },
          committer: {
            name: username,
            email: `${username}@users.noreply.github.com`,
          },
        }),
      },
    );

    if (!newCommitResponse.ok) {
      const errorData = await newCommitResponse.json();
      throw new Error(
        `Failed to create commit: ${errorData.message || newCommitResponse.status}`,
      );
    }

    const newCommitData = await newCommitResponse.json();
    const newCommitSha = newCommitData.sha;

    // Step 6: Update the branch reference to point to the new commit
    const updateRefResponse = await fetch(
      `https://api.github.com/repos/${repoFullName}/git/refs/heads/${defaultBranch}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sha: newCommitSha,
        }),
      },
    );

    if (!updateRefResponse.ok) {
      const errorData = await updateRefResponse.json();
      throw new Error(
        `Failed to update branch: ${errorData.message || updateRefResponse.status}`,
      );
    }

    return {
      success: true,
      commitSha: newCommitSha,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
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

async function getGithubLatestCommitSha(
  accessToken: string,
  repoFullName: string,
): Promise<{ sha: string | null; error?: string }> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${repoFullName}/commits?per_page=1`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const commits = await response.json();
    if (commits.length === 0) {
      return { sha: null };
    }

    const latestCommitSha = commits[0].sha;
    return { sha: latestCommitSha };
  } catch (error) {
    return {
      sha: null,
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

async function getFilesWithActualChanges(
  accessToken: string,
  repoFullName: string,
  files: Array<{ path: string; content: string }>,
): Promise<Array<{ path: string; content: string }>> {
  const filesWithChanges: Array<{ path: string; content: string }> = [];

  for (const file of files) {
    try {
      // Get current file content from GitHub
      const response = await fetch(
        `https://api.github.com/repos/${repoFullName}/contents/${encodeURIComponent(file.path)}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        },
      );

      if (response.ok) {
        // File exists, compare content
        const githubFileData = await response.json();
        const githubContent = Buffer.from(
          githubFileData.content,
          "base64",
        ).toString("utf-8");

        // Normalize line endings for comparison
        const normalizedLocalContent = file.content
          .replace(/\r\n/g, "\n")
          .trim();
        const normalizedGithubContent = githubContent
          .replace(/\r\n/g, "\n")
          .trim();

        if (normalizedLocalContent !== normalizedGithubContent) {
          filesWithChanges.push(file);
        }
      } else if (response.status === 404) {
        // File doesn't exist on GitHub, it's a new file
        filesWithChanges.push(file);
      } else {
        // Error getting file, assume it needs to be synced to be safe
        filesWithChanges.push(file);
      }
    } catch {
      // Error checking file, assume it needs to be synced to be safe
      filesWithChanges.push(file);
    }
  }

  return filesWithChanges;
}

async function getGithubRepositoryFiles(
  accessToken: string,
  repoFullName: string,
): Promise<{ success: boolean; files?: ChatFile[]; error?: string }> {
  try {
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

    return { success: true, files };
  } catch (error) {
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

  // Vérifier l'abonnement premium
  const subscription = await getSubscription();
  if (!subscription) {
    return {
      success: false,
      error: "Premium subscription required for GitHub sync",
    };
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

  if (!chat.github_repo_name) {
    return {
      success: false,
      error: "GitHub sync not enabled for this component",
    };
  }

  // Vérifier d'abord le dernier commit SHA pour éviter les pulls inutiles
  const latestCommitResult = await getGithubLatestCommitSha(
    githubConnection.access_token || "",
    chat.github_repo_name,
  );

  try {
    if (latestCommitResult.error) {
      // Continue avec le pull même si on ne peut pas vérifier le SHA
    } else if (latestCommitResult.sha) {
      // Comparer avec le SHA du dernier pull
      if (chat.last_github_commit_sha === latestCommitResult.sha) {
        return {
          success: false,
          error: "No new changes in GitHub repository (same commit)",
        };
      }
    }

    // Récupérer les fichiers depuis GitHub
    const githubFilesResult = await getGithubRepositoryFiles(
      githubConnection.access_token || "",
      chat.github_repo_name,
    );
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
    const githubArtifactCode = convertGithubFilesToArtifact(
      githubFilesResult.files,
      chat.title || "Pulled from GitHub",
    );

    // FIXED: Use latest artifact code from messages instead of chats table
    const latestArtifactCode = await getLatestArtifactCode(chatId);
    const combinedArtifactCode = getUpdatedArtifactCode(
      githubArtifactCode,
      latestArtifactCode || "",
    );

    // Récupérer la dernière version pour créer une nouvelle version
    const { data: lastMessages, error: messageError } = await supabase
      .from("messages")
      .select("version")
      .eq("chat_id", chatId)
      .order("version", { ascending: false })
      .limit(1);

    if (messageError) {
      return {
        success: false,
        error: "Could not retrieve latest version",
      };
    }

    const nextVersion = (lastMessages?.[0]?.version || 0) + 1;

    // Créer un nouveau message utilisateur pour la version GitHub
    const { error: userMessageError } = await supabase.from("messages").insert({
      chat_id: chatId,
      role: "user",
      content: "Pull latest changes from GitHub repository",
      version: nextVersion,
      is_github_pull: true,
    });

    if (userMessageError) {
      throw new Error(
        `Failed to create user message: ${userMessageError.message}`,
      );
    }

    // Créer le nouveau message assistant avec le code de GitHub
    const { error: assistantMessageError } = await supabase
      .from("messages")
      .insert({
        chat_id: chatId,
        role: "assistant",
        content: `Updated with changes from GitHub repository.\n\n${combinedArtifactCode}`,
        artifact_code: combinedArtifactCode,
        version: nextVersion,
        is_github_pull: true,
        is_built: false,
      });

    if (assistantMessageError) {
      throw new Error(
        `Failed to create assistant message: ${assistantMessageError.message}`,
      );
    }

    // Mettre à jour la date de sync et le SHA du commit, ne pas modifier l'artifact_code principal
    // car nous avons créé une nouvelle version avec le code de GitHub
    const updateData: {
      last_github_sync: string;
      last_github_commit_sha?: string;
    } = {
      last_github_sync: new Date().toISOString(),
    };

    // Ajouter le SHA du commit si disponible
    if (latestCommitResult.sha) {
      updateData.last_github_commit_sha = latestCommitResult.sha;
    }

    const { error: updateChatError } = await supabase
      .from("chats")
      .update(updateData)
      .eq("id", chatId);

    if (updateChatError) {
      // Could not update chat sync data
    }

    return {
      success: true,
      message: `Successfully pulled ${githubFilesResult.files.length} files from GitHub repository. Created new version ${nextVersion}.`,
    };
  } catch (error) {
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
      return;
    }

    // Vérifier si le chat a GitHub activé
    const { data: chat, error: chatError } = await supabase
      .from("chats")
      .select("github_repo_name, title")
      .eq("id", chatId)
      .eq("user_id", user.id)
      .single();

    if (chatError || !chat) {
      return;
    }

    if (!chat.github_repo_name) {
      return;
    }

    // Vérifier la connexion GitHub
    const githubConnection = await getGithubConnectionForUser();
    if (!githubConnection) {
      return;
    }

    // Utiliser un sync normal pour respecter les modifications GitHub
    // Si des modifications GitHub sont plus récentes, elles ne seront pas écrasées
    await syncComponentToGithub(chatId, version, false);
  } catch {
    // Auto-sync error
  }
}
