import Fastify from "fastify";
import { exec } from "child_process";
import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";

import { builderHost, builderPort, npmCacheDir, tempDir } from "./config.js";
import { registerScraperRoutes } from "./routes/scraper.js";
import {
  buildExists,
  deleteBuildPrefix,
  deleteBuildsByChat,
  ensureStorageRoot,
  getStoredBuildUrl,
  uploadBuildDirectory,
} from "./storage.js";

// ================== CONFIGURATION ==================
// Paramètres de logging pour éviter les erreurs "Broken pipe"
const LOG_THROTTLE_INTERVAL = 500; // ms
let lastLogTime = Date.now();
let logBuffer = [];
const MAX_LOG_BUFFER = 50;

// Fonction de logging throttlée pour éviter les erreurs "Broken pipe"
function safeLog(message, isError = false) {
  const now = Date.now();

  // Ajouter au buffer avec horodatage
  logBuffer.push({
    timestamp: new Date().toISOString(),
    message,
    isError
  });

  // Limiter la taille du buffer
  if (logBuffer.length > MAX_LOG_BUFFER) {
    logBuffer.shift();
  }

  // Vérifier s'il faut throttler
  if (now - lastLogTime < LOG_THROTTLE_INTERVAL) {
    return;
  }

  // Afficher les logs accumulés
  try {
    while (logBuffer.length > 0) {
      const log = logBuffer.shift();
      // Utiliser un bloc try-catch pour chaque opération de log individuelle
      try {
        if (log.isError) {
          console.error(`[${log.timestamp}] ${log.message}`);
        } else {
          console.log(`[${log.timestamp}] ${log.message}`);
        }
      } catch (logErr) {
        // Ignorer les erreurs individuelles et continuer avec les autres logs
        break; // Sortir de la boucle si une erreur se produit pour éviter plus d'erreurs
      }
    }
    lastLogTime = now;
  } catch (err) {
    // Si une erreur se produit pendant le logging, on attend et on réessaie plus tard
    // avec un délai plus long pour donner au système le temps de récupérer
    setTimeout(() => {
      lastLogTime = Date.now() - LOG_THROTTLE_INTERVAL - 100;
    }, 5000); // Attendre 5 secondes avant de réessayer
  }
}

const INSTALL_CMD = "npm install --include=dev";
const BUILD_CMD = "npm run build";
const BUILD_TIMEOUT_MS = 1500000;
const INSTALL_TIMEOUT_MS = 900000;
const BASE_TEMP_DIR = tempDir;
const NPM_CACHE_DIR = npmCacheDir;

function getDepsHash(content) {
  if (!content) return null;
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const chr = content.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return `deps-${Math.abs(hash)}`;
}

// Configuration d'un nettoyage automatique périodique
const AUTO_CLEANUP_INTERVAL = 86400000; // 24 heures en millisecondes

// ================== CRÉATION DU SERVEUR FASTIFY ==================
const app = Fastify({
  requestTimeout: 300000,
  logger: false,
});

app.setErrorHandler(async (error, request, reply) => {
  safeLog(`❌ Fastify error handler: ${error.message}`, true);

  reply.status(error.statusCode || 500).send({
    event: "error",
    details: error.message || "Internal server error",
    errors: [error.message || "Unknown error"]
  });
});

// ================== POINT DE SANTÉ ==================
app.get("/health", async (req, res) => {
  return { status: "ok" };
});

// ================== ROUTE DE VÉRIFICATION DE BUILD ==================
app.get("/check-build/:chatId/:version", async (req, res) => {
  const { chatId, version } = req.params;
  const storagePath = `${chatId}-${version}`;

  try {
    const buildUrl = await checkExistingBuild(storagePath);
    if (buildUrl) {
      return res.send({
        exists: true,
        url: buildUrl
      });
    }
    return res.send({
      exists: false,
      url: null
    });
  } catch (err) {
    return res.status(500).send({
      error: "Failed to check build status",
      message: err.message
    });
  }
});

// ================== ROUTE DE BUILD ==================
app.post("/build", async (req, res) => {
  const { chatId, version, files, forceBuild, envVars } = req.body;
  const tempDir = `${BASE_TEMP_DIR}/${chatId}-${version}`;

  try {
    const storagePath = `${chatId}-${version}`;

    if (forceBuild) {
      await deleteBuildPrefix(storagePath, safeLog);
    } else {
      const existingUrl = await checkExistingBuild(storagePath);
      if (existingUrl) {
        return res.send({
          event: "already-deployed",
          details: "Build already exists.",
          url: existingUrl,
        });
      }
    }

    await fs.mkdir(tempDir, { recursive: true, mode: 0o777 });
    const writeTasks = [];
    for (const file of files) {
      const filePath = `${tempDir}/${file.name}`;
      writeTasks.push(
        (async () => {
          await fs.mkdir(path.dirname(filePath), { recursive: true, mode: 0o777 });
          await fs.writeFile(filePath, file.content, "utf-8");
          await fs.chmod(filePath, 0o666);
        })()
      );
    }
    await Promise.all(writeTasks);

    if (envVars && Object.keys(envVars).length > 0) {
      const envContent = Object.entries(envVars)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
      await fs.writeFile(`${tempDir}/.env.local`, envContent, "utf-8");
      await fs.chmod(`${tempDir}/.env.local`, 0o666);
      safeLog(`📝 Fichier .env.local créé avec ${Object.keys(envVars).length} variables`);
    }

    const { output, errors, exitCode } = await runBuild(tempDir);

    if (errors.length > 0 || exitCode !== 0) {
      res.status(400).send({
        event: "error",
        details: "Build failed.",
        errors,
        exitCode,
      });

      cleanupDirectory(tempDir).catch((cleanupError) => {
        safeLog(`⚠️ Impossible de nettoyer le dossier après échec: ${cleanupError.message}`, true);
      });

      return;
    }

    // 4. Vérifier qu'un dossier dist existe avant l'upload
    let distPath = `${tempDir}/dist`;
    try {
      await fs.access(distPath);

      // Pour Angular, vérifier si les fichiers sont dans dist/browser/
      try {
        await fs.access(`${distPath}/browser/index.html`);
        distPath = `${distPath}/browser`;
        safeLog(`📁 Angular détecté, utilisation du dossier dist/browser/`);
      } catch {
        // Pas Angular ou structure différente
      }
    } catch (err) {
      res.status(400).send({
        event: "error",
        details: "Build directory 'dist' not found.",
        errors: ["Build directory 'dist' not found."],
      });

      cleanupDirectory(tempDir).catch((cleanupError) => {
        safeLog(`⚠️ Impossible de nettoyer le dossier après échec: ${cleanupError.message}`, true);
      });

      return;
    }

    await uploadBuildDirectory(storagePath, distPath, safeLog);

    res.send({ event: "success", details: "Build completed!", output });

    cleanupDirectory(tempDir).catch((cleanupError) => {
      safeLog(`⚠️ Cleanup error (background): ${cleanupError.message}`, true);
      setTimeout(() => {
        cleanupDirectory(tempDir).catch((finalCleanupError) => {
          safeLog(`⚠️ Final cleanup attempt failed: ${finalCleanupError.message}`, true);
        });
      }, 1000);
    });
  } catch (err) {
    safeLog(`❌ Build error: ${err.message}`, true);

    res.status(500).send({
      event: "error",
      details: err.message || "Unknown build error",
      errors: [err.message || "Unknown error"]
    });

    cleanupDirectory(tempDir).catch((cleanupError) => {
      safeLog(`⚠️ Cleanup error after build error: ${cleanupError.message}`, true);
    });
  }
});

// ================== ROUTE POUR SUPPRIMER UN BUILD SPÉCIFIQUE ==================
app.delete("/build/:chatId/:version", async (req, res) => {
  const { chatId, version } = req.params;
  const tempDir = `${BASE_TEMP_DIR}/${chatId}-${version}`;
  const storagePath = `${chatId}-${version}`;

  try {
    safeLog(`🗑️ Début de la suppression du build: ${storagePath}`);

    let localDeleted = false;
    let cloudDeleted = false;

    // 1. Supprimer le répertoire temporaire local s'il existe
    try {
      if (existsSync(tempDir)) {
        await cleanupDirectory(tempDir);
        localDeleted = true;
        safeLog(`✅ Répertoire local supprimé: ${tempDir}`);
      } else {
        safeLog(`📁 Aucun répertoire local trouvé: ${tempDir}`);
      }
    } catch (localErr) {
      safeLog(`❌ Erreur lors de la suppression locale: ${localErr.message}`, true);
    }

    // 2. Supprimer le build sur Vercel Blob
    try {
      await deleteBuildPrefix(storagePath, safeLog);
      cloudDeleted = true;
      safeLog(`✅ Build cloud supprimé: ${storagePath}`);
    } catch (cloudErr) {
      safeLog(`❌ Erreur lors de la suppression cloud: ${cloudErr.message}`, true);
    }

    // 3. Retourner le résultat
    if (localDeleted || cloudDeleted) {
      return res.send({
        event: "success",
        details: `Build ${chatId}-${version} deleted successfully.`,
        localDeleted,
        cloudDeleted
      });
    } else {
      return res.status(404).send({
        event: "not_found",
        details: `Build ${chatId}-${version} not found.`,
        localDeleted: false,
        cloudDeleted: false
      });
    }
  } catch (err) {
    safeLog(`❌ Erreur générale lors de la suppression du build ${storagePath}: ${err.message}`, true);
    return res.status(500).send({
      event: "error",
      details: `Failed to delete build: ${err.message}`,
      localDeleted: false,
      cloudDeleted: false
    });
  }
});

// ================== ROUTE POUR SUPPRIMER TOUS LES BUILDS D'UN CHAT ==================
app.delete("/builds/:chatId", async (req, res) => {
  const { chatId } = req.params;

  try {
    safeLog(`🗑️ Début de la suppression de tous les builds pour le chat: ${chatId}`);

    await deleteBuildsByChat(chatId, safeLog);

    // 2. Nettoyer les répertoires locaux temporaires (si existants)
    try {
      const tempFiles = await fs.readdir(BASE_TEMP_DIR, { withFileTypes: true });
      for (const file of tempFiles) {
        if (file.name.startsWith(`${chatId}-`)) {
          const fullPath = path.join(BASE_TEMP_DIR, file.name);
          await cleanupDirectory(fullPath);
          safeLog(`✅ Répertoire local supprimé: ${fullPath}`);
        }
      }
    } catch (localErr) {
      safeLog(`⚠️ Erreur lors du nettoyage des répertoires locaux: ${localErr.message}`, true);
    }

    safeLog(`✅ Suppression terminée pour le chat ${chatId}`);

    return res.send({
      event: "success",
      details: `All builds for chat ${chatId} deleted successfully.`,
      deletedCount: null,
      errorCount: null
    });
  } catch (err) {
    safeLog(`❌ Erreur générale lors de la suppression des builds pour ${chatId}: ${err.message}`, true);
    return res.status(500).send({
      event: "error",
      details: `Failed to delete builds: ${err.message}`
    });
  }
});

// ================== ROUTE POUR SUPPRIMER TOUS LES FICHIERS TEMP ==================
app.get("/delete-temp", async (req, res) => {
  try {
    await deleteAllTempFiles();
    return res.send({ event: "success", details: "All temporary files deleted." });
  } catch (err) {
    console.error("Error deleting temporary files:", err);
    return res.status(500).send({ event: "error", details: err.message });
  }
});

// ================== ROUTE POUR VÉRIFIER L'ESPACE DISQUE ==================
app.get("/disk-space", async (req, res) => {
  try {
    const diskInfo = await checkDiskSpace();
    return res.send({
      event: "success",
      details: diskInfo
    });
  } catch (err) {
    // Utiliser try/catch pour éviter les erreurs de socket lors de la journalisation
    try {
      console.error("Error checking disk space:", err.message);
    } catch (logErr) {
      // Ignorer les erreurs de journalisation
    }

    return res.status(500).send({
      event: "error",
      details: typeof err === 'string' ? err : err.message || 'Unknown error'
    });
  }
});

registerScraperRoutes(app, safeLog);

async function cleanupDirectory(dirPath) {
  if (!existsSync(dirPath)) return;

  safeLog(`🧹 Cleaning up directory: ${dirPath}`);

  return new Promise((resolve, reject) => {
    exec(`rm -rf "${dirPath}"`, (error) => {
      if (error) {
        safeLog(`⚠️ rm -rf failed for ${dirPath}: ${error.message}`, true);
        reject(error);
      } else {
        safeLog(`✅ Directory deleted: ${dirPath}`);
        resolve(true);
      }
    });
  });
}

// ================== FONCTION POUR SUPPRIMER TOUS LES FICHIERS TEMP ==================
async function deleteAllTempFiles() {
  safeLog(`🧹 Début du nettoyage des fichiers temporaires dans ${BASE_TEMP_DIR}`);

  // Vérifier que le répertoire existe
  try {
    await fs.access(BASE_TEMP_DIR);
  } catch (err) {
    safeLog(`📁 Le répertoire ${BASE_TEMP_DIR} n'existe pas, création...`);
    await fs.mkdir(BASE_TEMP_DIR, { recursive: true });
    return; // Pas de fichiers à supprimer
  }

  try {
    const tempFiles = await fs.readdir(BASE_TEMP_DIR, { withFileTypes: true });

    if (tempFiles.length === 0) {
      safeLog(`✅ Aucun fichier temporaire à supprimer dans ${BASE_TEMP_DIR}`);
      return;
    }

    safeLog(`🗑️ ${tempFiles.length} fichiers/dossiers temporaires trouvés à supprimer`);

    let successCount = 0;
    let failCount = 0;

    for (const file of tempFiles) {
      if (file.name === 'npm-cache') continue;
      const fullPath = path.join(BASE_TEMP_DIR, file.name);
      try {
        await cleanupDirectory(fullPath);
        successCount++;
      } catch (fileErr) {
        safeLog(`❌ Échec de la suppression pour ${fullPath}: ${fileErr.message}`, true);
        failCount++;
      }
    }

    safeLog(`🧹 Nettoyage terminé: ${successCount} répertoires supprimés, ${failCount} échecs`);

    // Vérification finale
    try {
      const remainingFiles = await fs.readdir(BASE_TEMP_DIR);
      if (remainingFiles.length > 0) {
        safeLog(`⚠️ Il reste encore ${remainingFiles.length} fichiers/dossiers dans ${BASE_TEMP_DIR}`, true);
      } else {
        safeLog(`✅ Tous les fichiers temporaires ont été supprimés avec succès!`);
      }
    } catch (err) {
      safeLog(`❌ Erreur lors de la vérification finale: ${err.message}`, true);
    }
  } catch (err) {
    safeLog(`❌ Erreur lors de la suppression des fichiers temporaires: ${err.message}`, true);
    throw err;
  }
}

async function cleanupOldCacheFiles(maxAgeMs = 24 * 60 * 60 * 1000) {
  try {
    await fs.access(NPM_CACHE_DIR);
  } catch {
    return;
  }

  const now = Date.now();
  const entries = await fs.readdir(NPM_CACHE_DIR);

  for (const entry of entries) {
    if (!entry.endsWith('.tar')) continue;
    const fullPath = path.join(NPM_CACHE_DIR, entry);
    try {
      const stats = await fs.stat(fullPath);
      if (now - stats.mtimeMs > maxAgeMs) {
        await fs.unlink(fullPath);
        safeLog(`🧹 Deleted old cache: ${entry}`);
      }
    } catch {}
  }
}

// ================== CHECK SI BUILD EXISTANT SUR VERCEL BLOB ==================
async function checkExistingBuild(storagePath) {
  const exists = await buildExists(storagePath);
  if (!exists) {
    return null;
  }

  return getStoredBuildUrl(storagePath);
}


// ================== RUN BUILD (INSTALL + BUILD) ==================
async function runBuild(tempDir) {
  try {
    let depsHash = null;
    let cacheFile = null;

    try {
      const packageJsonRaw = await fs.readFile(path.join(tempDir, "package.json"), "utf-8");
      const pkg = JSON.parse(packageJsonRaw);
      const depsSignature = JSON.stringify({
        dependencies: pkg.dependencies || {},
        devDependencies: pkg.devDependencies || {},
      });
      depsHash = getDepsHash(depsSignature);
      if (depsHash) {
        await fs.mkdir(NPM_CACHE_DIR, { recursive: true });
        cacheFile = path.join(NPM_CACHE_DIR, `${depsHash}.tar`);
      }
    } catch {}

    let usedCache = false;
    if (cacheFile && existsSync(cacheFile) && !existsSync(path.join(tempDir, "node_modules"))) {
      safeLog(`📦 Extracting node_modules from cache...`);
      try {
        await new Promise((resolve, reject) => {
          exec(`tar -xf "${cacheFile}" -C "${tempDir}"`, { timeout: 60000 }, (error) => {
            if (error) reject(error);
            else resolve(true);
          });
        });
        usedCache = true;
        safeLog(`✅ Cache extracted successfully`);
      } catch (cacheErr) {
        safeLog(`⚠️ Cache extraction failed: ${cacheErr.message}`, true);
        try {
          await fs.unlink(cacheFile);
          safeLog(`🧹 Deleted corrupted cache file: ${cacheFile}`);
        } catch {}
      }
    }

    const installResult = await executeBuildCommand(tempDir, INSTALL_CMD, INSTALL_TIMEOUT_MS);
    if (installResult.exitCode !== 0) {
      return installResult;
    }

    if (cacheFile && !usedCache && existsSync(path.join(tempDir, "node_modules"))) {
      safeLog(`💾 Saving node_modules to cache in background...`);
      const tmpCacheFile = `${cacheFile}.tmp`;
      exec(`tar -cf "${tmpCacheFile}" -C "${tempDir}" node_modules`, { timeout: 120000 }, async (error) => {
        if (error) {
          safeLog(`⚠️ Cache save failed: ${error.message}`, true);
          try {
            await fs.unlink(tmpCacheFile);
          } catch {}
        } else {
          try {
            await fs.rename(tmpCacheFile, cacheFile);
            safeLog(`✅ Cache saved`);
          } catch (renameErr) {
            safeLog(`⚠️ Cache rename failed: ${renameErr.message}`, true);
            try {
              await fs.unlink(tmpCacheFile);
            } catch {}
          }
        }
      });
    }

    const buildResult = await executeBuildCommand(tempDir, BUILD_CMD, BUILD_TIMEOUT_MS);
    return buildResult;
  } catch (err) {
    console.error("Error in runBuild:", err);
    return {
      output: [],
      errors: [err.message],
      exitCode: 1,
    };
  }
}

async function executeBuildCommand(cwd, command, timeoutMs) {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";

    const child = exec(command, { cwd, maxBuffer: 1024 * 1024 * 10, timeout: timeoutMs || 0 });

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
      console.log(data.toString());
    });

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
      console.error(data.toString());
    });

    child.on("error", (err) => {
      resolve({
        output: [],
        errors: [err.message],
        exitCode: 1,
      });
    });

    child.on("close", (code) => {
      let errors = [];

      if (code !== 0) {
        const MAX_ERROR_LENGTH = 30000;
        const MAX_ERRORS_TO_SHOW = 50;
        let combinedOutput = "";

        if (stderr && stderr.trim()) {
          combinedOutput += stderr;
        }
        if (stdout && stdout.trim()) {
          combinedOutput += "\n" + stdout;
        }

        if (combinedOutput) {
          const lines = combinedOutput.split("\n");

          const errorLines = [];
          const seenErrors = new Set();

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lower = line.toLowerCase();

            const isErrorLine = (
              lower.includes("error") ||
              lower.includes("failed") ||
              lower.includes("exception") ||
              lower.includes("cannot find") ||
              lower.includes("not found") ||
              lower.includes("missing") ||
              line.includes("TS") ||
              (line.includes("src/") && (lower.includes(":") || lower.includes("error")))
            );

            if (isErrorLine) {
              const errorKey = line.trim().substring(0, 100);
              if (!seenErrors.has(errorKey)) {
                seenErrors.add(errorKey);

                const contextLines = [line];
                for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
                  if (lines[j].trim() && !lines[j].includes(">")) {
                    contextLines.push(lines[j]);
                  } else {
                    break;
                  }
                }

                errorLines.push(contextLines.join("\n"));

                if (errorLines.length >= MAX_ERRORS_TO_SHOW) {
                  break;
                }
              }
            }
          }

          let errorSummary = errorLines.join("\n\n");

          if (errorSummary.length > MAX_ERROR_LENGTH) {
            errorSummary = errorSummary.substring(0, MAX_ERROR_LENGTH) + "\n\n... (additional errors truncated - showing first " + errorLines.length + " errors)";
          } else if (errorLines.length >= MAX_ERRORS_TO_SHOW) {
            errorSummary += "\n\n... (showing first " + MAX_ERRORS_TO_SHOW + " errors - additional errors hidden)";
          }

          if (!errorSummary.trim()) {
            const relevantOutput = lines.slice(-100).join("\n");
            errorSummary = relevantOutput.substring(0, MAX_ERROR_LENGTH);
          }

          errors.push(errorSummary);
        }

        if (errors.length === 0) {
          errors.push(`Build command exited with code ${code}`);
        }
      }

      resolve({
        output: stdout.split("\n").filter((l) => l.trim()),
        errors,
        exitCode: code,
      });
    });
  });
}

// ================== PLANIFICATION DU NETTOYAGE AUTOMATIQUE ==================
// Fonction pour démarrer le nettoyage périodique
function scheduleAutoCleanup() {
  safeLog(`⏰ Configuration du nettoyage automatique toutes les ${AUTO_CLEANUP_INTERVAL/60000} minutes`);

  setTimeout(async () => {
    safeLog("⏰ Initial cleanup");
    try {
      await deleteAllTempFiles();
      await cleanupOldCacheFiles();
    } catch (err) {
      safeLog(`❌ Initial cleanup error: ${err.message}`, true);
    }

    setInterval(async () => {
      safeLog("⏰ Periodic cleanup");
      try {
        await deleteAllTempFiles();
        await cleanupOldCacheFiles();
      } catch (err) {
        safeLog(`❌ Periodic cleanup error: ${err.message}`, true);
      }
    }, AUTO_CLEANUP_INTERVAL);
  }, 30000);
}

// ================== FONCTION POUR VÉRIFIER L'ESPACE DISQUE ==================
async function checkDiskSpace() {
  return new Promise((resolve, reject) => {
    // Définir un timeout pour éviter que la commande ne reste bloquée
    const timeout = setTimeout(() => {
      reject(new Error("Timeout lors de la vérification de l'espace disque"));
    }, 10000); // 10 secondes de timeout

    exec(`df -h ${BASE_TEMP_DIR}`, { timeout: 8000 }, (error, stdout, stderr) => {
      clearTimeout(timeout); // Annuler le timeout

      if (error) {
        reject(new Error(`Erreur lors de la vérification de l'espace disque: ${error.message}`));
        return;
      }
      if (stderr) {
        reject(new Error(`Erreur lors de la vérification de l'espace disque: ${stderr}`));
        return;
      }

      // Analyser la sortie de df
      try {
        const lines = stdout.trim().split('\n');
        if (lines.length < 2) {
          reject(new Error('Format de sortie de df inattendu'));
          return;
        }

        const headers = lines[0].split(/\s+/).filter(Boolean);
        const values = lines[1].split(/\s+/).filter(Boolean);

        const result = {};
        headers.forEach((header, index) => {
          if (index < values.length) {
            result[header] = values[index];
          }
        });

        // Formater les données pour une meilleure lisibilité
        const formattedResult = {
          filesystem: result['Filesystem'] || result['Mounted'] || 'Unknown',
          size: result['Size'] || '?',
          used: result['Used'] || '?',
          available: result['Avail'] || result['Available'] || '?',
          usePercentage: result['Use%'] || result['Capacity'] || '?',
          mountedOn: result['Mounted'] || result['on'] || BASE_TEMP_DIR
        };

        resolve(formattedResult);
      } catch (parseError) {
        reject(new Error(`Erreur lors de l'analyse de la sortie df: ${parseError.message}`));
      }
    });
  });
}

// ================== DÉMARRAGE DU SERVEUR ==================
await ensureStorageRoot();

app.listen({ port: builderPort, host: builderHost }, (err, address) => {
  if (err) {
    safeLog(`❌ Erreur lors du démarrage du serveur: ${err.message}`, true);
    process.exit(1);
  }
  safeLog(`🚀 Serveur en écoute sur ${address}`);
  safeLog(`📁 Utilisation du répertoire temporaire: ${BASE_TEMP_DIR}`);

  // Démarrer le nettoyage automatique
  scheduleAutoCleanup();
});

// Gérer l'arrêt gracieux du serveur
process.on('SIGTERM', async () => {
  safeLog('🛑 Signal SIGTERM reçu. Nettoyage en cours...');
  try {
    // Arrêter d'accepter de nouvelles connexions
    await app.close();

    // Nettoyer tous les fichiers temporaires avant de s'arrêter
    safeLog('🧹 Nettoyage des fichiers temporaires...');
    await deleteAllTempFiles();

    safeLog('✅ Nettoyage terminé. Arrêt du serveur.');
    process.exit(0);
  } catch (err) {
    safeLog(`❌ Erreur lors du nettoyage: ${err.message}`, true);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  safeLog('🛑 Signal SIGINT reçu. Nettoyage en cours...');
  try {
    await app.close();
    safeLog('🧹 Nettoyage des fichiers temporaires...');
    await deleteAllTempFiles();
    safeLog('✅ Nettoyage terminé. Arrêt du serveur.');
    process.exit(0);
  } catch (err) {
    safeLog(`❌ Erreur lors du nettoyage: ${err.message}`, true);
    process.exit(1);
  }
});

// Gestionnaire d'erreurs non capturées
process.on('uncaughtException', (err) => {
  // Utiliser une variable pour stocker le message d'erreur à afficher
  // mais ne pas tenter de l'afficher immédiatement pour éviter une boucle d'erreurs
  const errorMessage = `❌ ERREUR NON CAPTURÉE: ${err.message}`;
  const stackTrace = `Stack: ${err.stack}`;

  // Détection des erreurs liées à la communication socket/pipe
  const isSocketError = err && err.message && (
    err.message.includes('EPIPE') ||
    err.message.includes('Broken pipe') ||
    err.message.includes('Socket not connected') ||
    err.message.includes('os error 107') ||
    err.message.includes('vsock')
  );

  // Pour les erreurs de socket, on les ignore et on continue simplement
  if (isSocketError) {
    // On tente d'écrire dans le journal, mais avec un délai pour éviter les boucles
    setTimeout(() => {
      try {
        console.warn(`⚠️ Erreur de socket/pipe détectée et ignorée: ${err.message}`);
      } catch (logErr) {
        // Ignorer toute erreur de journalisation
      }
    }, 5000);
    return; // Continuer l'exécution sans autre action
  }

  // Pour les autres erreurs critiques
  setTimeout(async () => {
    try {
      // Tenter d'afficher l'erreur après un délai
      try {
        console.error(errorMessage);
        console.error(stackTrace);
      } catch (logErr) {
        // Si l'affichage échoue, ignorer
      }

      // Arrêter le serveur avec grâce
      await app.close();
      console.log('🧹 Fermeture du serveur après erreur non capturée');
      process.exit(1);
    } catch (closeErr) {
      // En cas d'échec de la fermeture, forcer la sortie
      process.exit(1);
    }
  }, 1000);
});

// Gestionnaire pour les rejets de promesses non capturés
process.on('unhandledRejection', (reason, promise) => {
  safeLog(`❌ PROMESSE REJETÉE NON GÉRÉE: ${reason}`, true);
  // Continuer l'exécution, mais consigner l'erreur
});
