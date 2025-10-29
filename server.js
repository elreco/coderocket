import Fastify from "fastify";
import { exec } from "child_process";
import fs from "fs/promises";
import { existsSync } from "fs";
import { put, head, list, del } from "@vercel/blob";
import mime from "mime-types";
import path from "path";

// ================== CONFIGURATION ==================
// Local vs production environment
const IS_LOCAL = process.env.NODE_ENV === "localhost";
const BASE_TEMP_DIR = IS_LOCAL ? "./mnt" : `/mnt`;

// Token d'accès Vercel Blob
const VERCEL_BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

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

// Commands
// const INSTALL_CMD = "npm install";
// const BUILD_CMD = "npm run build";
const INSTALL_CMD = "npm install";
const BUILD_CMD = "npm run build";

// Configuration d'un nettoyage automatique périodique
const AUTO_CLEANUP_INTERVAL = 86400000; // 24 heures en millisecondes

// ================== CRÉATION DU SERVEUR FASTIFY ==================
const app = Fastify({
  requestTimeout: 300000, // 5 minutes en millisecondes
  logger: false,
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

    // If forceBuild => delete existing build on Vercel Blob
    if (forceBuild) {
      await deleteExistingBuild(storagePath);
    } else {
      // 1. Vérifier si le build existe déjà sur Vercel Blob
      const existingUrl = await checkExistingBuild(storagePath);
      if (existingUrl) {
        return res.send({
          event: "already-deployed",
          details: "Build already exists.",
          url: existingUrl,
        });
      }
    }

    // 2. Créer le répertoire temporaire et y sauvegarder les fichiers sources
    await fs.mkdir(tempDir, { recursive: true, mode: 0o777 });
    for (const file of files) {
      const filePath = `${tempDir}/${file.name}`;
      await fs.mkdir(path.dirname(filePath), { recursive: true, mode: 0o777 });
      await fs.writeFile(filePath, file.content, "utf-8");
      // Définir les permissions pour permettre la suppression
      await fs.chmod(filePath, 0o666);
    }

    // 2.5. Créer le fichier .env.local avec les variables d'environnement si fournies
    if (envVars && Object.keys(envVars).length > 0) {
      const envContent = Object.entries(envVars)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
      await fs.writeFile(`${tempDir}/.env.local`, envContent, "utf-8");
      await fs.chmod(`${tempDir}/.env.local`, 0o666);
      safeLog(`📝 Fichier .env.local créé avec ${Object.keys(envVars).length} variables`);
    }

    // 3. Installer + Compiler
    const { output, errors, exitCode } = await runBuild(tempDir);

    // Gérer les éventuelles erreurs
    if (errors.length > 0 || exitCode !== 0) {
      // Nettoyer le dossier temporaire en cas d'échec du build
      try {
        await cleanupDirectory(tempDir);
        safeLog(`🧹 Nettoyage du dossier temporaire après échec du build: ${tempDir}`);
      } catch (cleanupError) {
        safeLog(`⚠️ Impossible de nettoyer le dossier après échec: ${cleanupError.message}`, true);
      }

      return res.status(400).send({
        event: "error",
        details: "Build failed.",
        errors,
        exitCode,
      });
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
      // Nettoyer le dossier temporaire si dist n'existe pas
      try {
        await cleanupDirectory(tempDir);
        safeLog(`🧹 Nettoyage du dossier temporaire car dist n'existe pas: ${tempDir}`);
      } catch (cleanupError) {
        safeLog(`⚠️ Impossible de nettoyer le dossier après échec: ${cleanupError.message}`, true);
      }

      return res.status(400).send({
        event: "error",
        details: "Build directory 'dist' not found.",
        errors: ["Build directory 'dist' not found."],
      });
    }

    // 5. Uploader le résultat du build
    await uploadBuild(tempDir, storagePath, distPath);

    // 6. Nettoyer les fichiers temporaires avec une méthode plus robuste
    try {
      await cleanupDirectory(tempDir);
    } catch (cleanupError) {
      console.error("Cleanup error:", cleanupError);
      // Attendre un peu et réessayer une dernière fois
      await new Promise(resolve => setTimeout(resolve, 1000));
      try {
        await cleanupDirectory(tempDir);
      } catch (finalCleanupError) {
        console.error("Final cleanup attempt failed:", finalCleanupError);
      }
    }

    return res.send({ event: "success", details: "Build completed!", output });
  } catch (err) {
    // Nettoyer en cas d'erreur aussi avec la méthode améliorée
    try {
      await cleanupDirectory(tempDir);
    } catch (cleanupError) {
      console.error("Cleanup error after error:", cleanupError);
    }
    console.error("Build error:", err);
    return res.status(500).send({ event: "error", details: err.message });
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
      await deleteExistingBuild(storagePath);
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

// ================== FONCTION AMÉLIORÉE POUR SUPPRIMER UN RÉPERTOIRE ==================
async function cleanupDirectory(dirPath) {
  if (!existsSync(dirPath)) return;

  try {
    safeLog(`🧹 Tentative de nettoyage du répertoire: ${dirPath}`);

    // Tuer tous les processus qui pourraient bloquer le répertoire - approche plus agressive
    await new Promise((resolve) => {
      exec(`lsof +D "${dirPath}" | grep -v COMMAND | awk '{print $2}' | xargs -r kill -9`, () => {
        // Ignorer les erreurs car la commande peut échouer si aucun processus n'est trouvé
        resolve(true);
      });
    });

    // Attendre plus longtemps pour s'assurer que les processus sont terminés
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Récursion pour définir les permissions sur tous les fichiers et dossiers
    const setPermissionsRecursive = async (dir) => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          try {
            if (entry.isDirectory()) {
              await setPermissionsRecursive(fullPath);
              await fs.chmod(fullPath, 0o777);
            } else {
              await fs.chmod(fullPath, 0o666);
            }
          } catch (permError) {
            safeLog(`⚠️ Avertissement: Impossible de définir les permissions pour ${fullPath}: ${permError.message}`, true);
          }
        }
      } catch (error) {
        safeLog(`⚠️ Avertissement: Impossible de traiter le répertoire ${dir}: ${error.message}`, true);
      }
    };

    // Définir les permissions récursivement
    await setPermissionsRecursive(dirPath);

    // Supprimer le répertoire avec plus de tentatives et un délai plus long entre elles
    for (let i = 0; i < 5; i++) {
      try {
        await fs.rm(dirPath, { recursive: true, force: true });
        safeLog(`✅ Répertoire supprimé avec succès: ${dirPath}`);
        return;
      } catch (err) {
        safeLog(`⚠️ Tentative ${i+1}/5 échouée pour ${dirPath}: ${err.message}`, true);

        if (i === 4) {
          safeLog(`❌ Échec de la suppression après 5 tentatives pour ${dirPath}`, true);
          // Dernière tentative avec rm -rf
          return new Promise((resolve, reject) => {
            safeLog(`🔥 Dernier recours: utilisation de rm -rf pour ${dirPath}`);
            exec(`rm -rf "${dirPath}"`, (error) => {
              if (error) {
                safeLog(`❌ Échec final avec rm -rf pour ${dirPath}: ${error.message}`, true);
                reject(error);
              } else {
                safeLog(`✅ Répertoire supprimé avec succès via rm -rf: ${dirPath}`);
                resolve(true);
              }
            });
          });
        }
        // Attendre plus longtemps entre les tentatives en augmentant progressivement le délai
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  } catch (err) {
    safeLog(`❌ Erreur lors de la suppression du répertoire ${dirPath}: ${err.message}`, true);
    throw err;
  }
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

// ================== CHECK SI BUILD EXISTANT SUR VERCEL BLOB ==================
async function checkExistingBuild(storagePath) {
  try {
    const buildComplete = await head(`${storagePath}/build-complete.txt`, {
      token: VERCEL_BLOB_TOKEN,
    });
    if (!buildComplete?.url) {
      console.log("No build-complete.txt => Build incomplete or missing");
      return null;
    }
    const indexFile = await head(`${storagePath}/index.html`, {
      token: VERCEL_BLOB_TOKEN,
    });
    return indexFile?.url || null;
  } catch {
    return null;
  }
}

// ================== RUN BUILD (INSTALL + BUILD) ==================
async function runBuild(tempDir) {
  try {
    const installResult = await executeBuildCommand(tempDir, INSTALL_CMD);
    if (installResult.exitCode !== 0) {
      return installResult;
    }

    const buildResult = await executeBuildCommand(tempDir, BUILD_CMD);
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

async function executeBuildCommand(cwd, command) {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";

    const child = exec(command, { cwd });

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
      const errors = code !== 0 && stderr ? [stderr] : [];

      resolve({
        output: stdout.split("\n").filter((l) => l.trim()),
        errors,
        exitCode: code,
      });
    });
  });
}

// ================== UPLOAD SUR VERCEL BLOB ==================
async function uploadBuild(tempDir, storagePath, distPath) {
  const actualDistPath = distPath || `${tempDir}/dist`;

  async function uploadDirectory(dirPath) {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dirPath, file.name);
      const relativePath = path.relative(actualDistPath, fullPath);

      if (file.isDirectory()) {
        await uploadDirectory(fullPath);
      } else {
        const fileContent = await fs.readFile(fullPath);
        safeLog(`📤 Uploading ${storagePath}/${relativePath}`);
        await put(`${storagePath}/${relativePath}`, fileContent, {
          access: "public",
          contentType: mime.lookup(file.name) || "application/octet-stream",
          addRandomSuffix: false,
          token: VERCEL_BLOB_TOKEN,
          cacheControlMaxAge: 0,
        });
      }
    }
  }

  // 1. On upload tout le contenu du dossier de build
  safeLog(`📦 Upload du build depuis: ${actualDistPath}`);
  await uploadDirectory(actualDistPath);

  // 2. Ajouter un fichier build-complete.txt pour signifier que tout est OK
  const buildCompleteContent = new Date().toISOString();
  await put(`${storagePath}/build-complete.txt`, buildCompleteContent, {
    access: "public",
    contentType: "text/plain",
    addRandomSuffix: false,
    token: VERCEL_BLOB_TOKEN,
    cacheControlMaxAge: 0,
  });
}

// ================== SUPPRESSION D'UN BUILD EXISTANT SUR VERCEL BLOB ==================
async function deleteExistingBuild(storagePath) {
  try {
    console.log(`Checking for existing build at: ${storagePath}`);
    // 1. Lister les fichiers du répertoire storagePath sur Vercel Blob
    const files = await list({ prefix: storagePath, token: VERCEL_BLOB_TOKEN });

    if (!files.blobs || files.blobs.length === 0) {
      console.log("No existing build found.");
      return;
    }

    console.log(`Found ${files.blobs.length} files to delete.`);

    // 2. Supprimer chaque fichier trouvé
    for (const file of files.blobs) {
      try {
        await del(file.url, {
          token: VERCEL_BLOB_TOKEN,
        });
        console.log(`Deleted: ${file.url}`);
      } catch (err) {
        console.error(`Failed to delete ${file.url}:`, err);
      }
    }

    console.log("✅ Build deletion complete.");
  } catch (err) {
    console.error("Error deleting existing build:", err);
  }
}

// ================== PLANIFICATION DU NETTOYAGE AUTOMATIQUE ==================
// Fonction pour démarrer le nettoyage périodique
function scheduleAutoCleanup() {
  safeLog(`⏰ Configuration du nettoyage automatique toutes les ${AUTO_CLEANUP_INTERVAL/60000} minutes`);

  // Premier nettoyage au démarrage
  setTimeout(async () => {
    safeLog("⏰ Exécution du nettoyage automatique initial");
    try {
      await deleteAllTempFiles();
    } catch (err) {
      safeLog(`❌ Erreur lors du nettoyage automatique initial: ${err.message}`, true);
    }

    // Planification des nettoyages périodiques
    setInterval(async () => {
      safeLog("⏰ Exécution du nettoyage automatique périodique");
      try {
        await deleteAllTempFiles();
      } catch (err) {
        safeLog(`❌ Erreur lors du nettoyage automatique périodique: ${err.message}`, true);
      }
    }, AUTO_CLEANUP_INTERVAL);
  }, 30000); // 30 secondes après le démarrage
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
app.listen({ port: 3000, host: "0.0.0.0" }, (err, address) => {
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