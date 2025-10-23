const fs = require("fs");
const path = require("path");

const TEMPLATES_DIR = path.join(process.cwd(), "templates");
const OUTPUT_FILE = path.join(process.cwd(), "utils/default-artifact-code.ts");

const IGNORED_PATTERNS = [
  "node_modules",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  ".git",
  ".DS_Store",
  "dist",
  ".vite",
  ".turbo",
  "build",
  ".next",
  ".cache",
  "coverage",
  ".env",
  ".env.local",
  ".gitignore",
];

function shouldIgnoreFile(fileName) {
  return IGNORED_PATTERNS.some(
    (pattern) => fileName === pattern || fileName.startsWith("."),
  );
}

function escapeForTemplate(content) {
  return content
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
}

function readFilesRecursively(dirPath, basePath = "") {
  const files = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (shouldIgnoreFile(entry.name)) {
      continue;
    }

    const fullPath = path.join(dirPath, entry.name);
    const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      files.push(...readFilesRecursively(fullPath, relativePath));
    } else {
      const content = fs.readFileSync(fullPath, "utf-8");
      files.push({
        name: relativePath,
        content: content,
      });
    }
  }

  return files;
}

function generateArtifactCode(framework) {
  const templateDir = path.join(TEMPLATES_DIR, framework);

  if (!fs.existsSync(templateDir)) {
    console.warn(
      `⚠️  Template directory not found for ${framework}: ${templateDir}`,
    );
    return "";
  }

  const files = readFilesRecursively(templateDir);

  if (files.length === 0) {
    console.warn(`⚠️  No files found in template for ${framework}`);
    return "";
  }

  let artifactCode = `<coderocketArtifact title="Blank ${framework.charAt(0).toUpperCase() + framework.slice(1)} App">\n`;

  for (const file of files) {
    artifactCode += `<coderocketFile name="${file.name}">\n`;
    artifactCode += file.content;
    artifactCode += `\n</coderocketFile>\n`;
  }

  artifactCode += `</coderocketArtifact>`;

  return artifactCode;
}

function extractDefaultArtifactExamples() {
  if (!fs.existsSync(OUTPUT_FILE)) {
    return null;
  }

  try {
    const content = fs.readFileSync(OUTPUT_FILE, "utf-8");
    const startMarker = "export const defaultArtifactExamples = {";
    const startIndex = content.indexOf(startMarker);

    if (startIndex === -1) {
      return null;
    }

    const examplesSection = content.substring(startIndex);
    return examplesSection;
  } catch (error) {
    console.warn(
      "⚠️  Could not extract existing defaultArtifactExamples:",
      error.message,
    );
  }

  return null;
}

function buildTemplates() {
  console.log("🚀 Building templates...\n");

  if (!fs.existsSync(TEMPLATES_DIR)) {
    console.error(`❌ Templates directory not found: ${TEMPLATES_DIR}`);
    console.log("\n💡 Create template directories first:");
    console.log("   mkdir -p templates/react templates/vue");
    process.exit(1);
  }

  const frameworks = fs
    .readdirSync(TEMPLATES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  if (frameworks.length === 0) {
    console.error("❌ No template directories found");
    console.log("\n💡 Add at least one template directory:");
    console.log("   mkdir templates/react");
    process.exit(1);
  }

  console.log(`📁 Found templates: ${frameworks.join(", ")}\n`);

  const artifactCodes = { html: "" };

  for (const framework of frameworks) {
    console.log(`  Processing ${framework}...`);
    const code = generateArtifactCode(framework);
    artifactCodes[framework] = code;

    const fileCount = code.split("<coderocketFile").length - 1;
    console.log(`  ✅ Generated ${fileCount} files for ${framework}`);
  }

  const existingExamplesSection = extractDefaultArtifactExamples();
  const examplesSection =
    existingExamplesSection ||
    `export const defaultArtifactExamples = {
${frameworks.map((framework) => `  ${framework}: \`\`,`).join("\n")}
};
`;

  const output = `export const defaultArtifactCode = {
  html: \`\`,
${Object.entries(artifactCodes)
  .filter(([key]) => key !== "html")
  .map(([key, value]) => `  ${key}: \`${escapeForTemplate(value)}\`,`)
  .join("\n")}
};

${examplesSection}`;

  fs.writeFileSync(OUTPUT_FILE, output, "utf-8");

  console.log(`\n✅ Successfully generated: ${OUTPUT_FILE}`);
  console.log(`📊 Total frameworks: ${frameworks.length}`);
}

if (require.main === module) {
  buildTemplates();
}

module.exports = { buildTemplates };

