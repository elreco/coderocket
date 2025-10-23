const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const OUTPUT_FILE = path.join(process.cwd(), "utils/default-artifact-code.ts");

console.log("🔍 Checking if templates are up to date...\n");

const contentBefore = fs.existsSync(OUTPUT_FILE)
  ? fs.readFileSync(OUTPUT_FILE, "utf-8")
  : "";

try {
  execSync("node scripts/build-templates.js", { stdio: "pipe" });
} catch (error) {
  console.error("❌ Failed to build templates:", error.message);
  process.exit(1);
}

const contentAfter = fs.readFileSync(OUTPUT_FILE, "utf-8");

if (contentBefore !== contentAfter) {
  console.error("❌ Templates are out of sync!\n");
  console.error("The generated default-artifact-code.ts doesn't match the templates.");
  console.error("\n💡 To fix this, run:");
  console.error("   npm run build:templates");
  console.error("   git add utils/default-artifact-code.ts");
  console.error("\n");

  fs.writeFileSync(OUTPUT_FILE, contentBefore, "utf-8");

  process.exit(1);
}

console.log("✅ Templates are up to date!\n");

