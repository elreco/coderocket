const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const TEMPLATES_DIR = path.join(process.cwd(), "templates");

console.log("👀 Watching templates directory for changes...\n");

let isBuilding = false;
let debounceTimer = null;

function buildTemplates() {
  if (isBuilding) return;

  isBuilding = true;
  console.log("\n🔄 Templates changed, rebuilding...");

  try {
    execSync("node scripts/build-templates.js", { stdio: "inherit" });
    console.log("✅ Templates rebuilt successfully\n");
  } catch (error) {
    console.error("❌ Failed to rebuild templates:", error.message);
  } finally {
    isBuilding = false;
  }
}

function debouncedBuild() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(buildTemplates, 500);
}

function watchDirectory(dir) {
  try {
    fs.watch(dir, { recursive: true }, (eventType, filename) => {
      if (!filename) return;

      const shouldIgnore = [
        "node_modules",
        "package-lock.json",
        "dist",
        ".git",
      ].some((pattern) => filename.includes(pattern));

      if (shouldIgnore) return;

      console.log(`📝 Changed: ${filename}`);
      debouncedBuild();
    });

    console.log(`✅ Watching: ${dir}`);
  } catch (error) {
    console.error(`❌ Failed to watch ${dir}:`, error.message);
  }
}

if (!fs.existsSync(TEMPLATES_DIR)) {
  console.error(`❌ Templates directory not found: ${TEMPLATES_DIR}`);
  process.exit(1);
}

const frameworks = fs
  .readdirSync(TEMPLATES_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

if (frameworks.length === 0) {
  console.error("❌ No template directories found");
  process.exit(1);
}

console.log(`📁 Found templates: ${frameworks.join(", ")}\n`);

frameworks.forEach((framework) => {
  const frameworkDir = path.join(TEMPLATES_DIR, framework);
  watchDirectory(frameworkDir);
});

console.log("\n💡 Press Ctrl+C to stop watching\n");

process.on("SIGINT", () => {
  console.log("\n\n👋 Stopped watching");
  process.exit(0);
});

