const fs = require("fs");
const path = require("path");

const TEMPLATES_DIR = path.join(process.cwd(), "templates");

function parseArtifactCode(artifactCode) {
  const files = [];
  const fileRegex = /<coderocketFile name="([^"]+)">\n?([\s\S]*?)\n?<\/coderocketFile>/g;

  let match;
  while ((match = fileRegex.exec(artifactCode)) !== null) {
    let content = match[2];

    content = content
      .replace(/\\\\/g, "\\")
      .replace(/\\`/g, "`")
      .replace(/\\\$/g, "$");

    files.push({
      name: match[1],
      content: content,
    });
  }

  return files;
}

function extractTemplate(framework, artifactCode) {
  const templateDir = path.join(TEMPLATES_DIR, framework);

  if (fs.existsSync(templateDir)) {
    console.log(
      `⚠️  Template for ${framework} already exists at: ${templateDir}`,
    );
    console.log(`   Delete it first if you want to recreate it:`);
    console.log(`   rm -rf ${templateDir}`);
    return;
  }

  fs.mkdirSync(templateDir, { recursive: true });

  const files = parseArtifactCode(artifactCode);

  console.log(
    `\n📦 Extracting ${framework} template with ${files.length} files...\n`,
  );

  for (const file of files) {
    const filePath = path.join(templateDir, file.name);
    const dir = path.dirname(filePath);

    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, file.content, "utf-8");
    console.log(`  ✅ Created: ${file.name}`);
  }

  console.log(`\n✨ Template extracted to: ${templateDir}`);
  console.log(`\n📝 Next steps:`);
  console.log(`  1. cd ${templateDir}`);
  console.log(`  2. npm install`);
  console.log(`  3. npm run dev (test it works)`);
  console.log(`  4. Make your changes`);
  console.log(
    `  5. npm run build:templates (to regenerate default-artifact-code.ts)`,
  );
}

function loadDefaultArtifactCode() {
  const filePath = path.join(process.cwd(), "utils/default-artifact-code.ts");
  const content = fs.readFileSync(filePath, "utf-8");

  const artifactCodes = {};

  const lines = content.split("\n");
  let currentFramework = null;
  let currentCode = [];
  let inCode = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const frameworkMatch = line.match(/^\s*(\w+):\s*`(<coderocketArtifact.*)/);
    if (frameworkMatch) {
      if (currentFramework && currentCode.length > 0) {
        artifactCodes[currentFramework] = currentCode.join("\n");
      }

      currentFramework = frameworkMatch[1];
      currentCode = [frameworkMatch[2]];
      inCode = true;
      continue;
    }

    if (inCode) {
      if (line.includes("</coderocketArtifact>`,") ||
          (line.includes("</coderocketArtifact>") && i + 1 < lines.length && lines[i + 1].trim() === "`,")) {
        currentCode.push(line.replace(/`,.*$/, "").replace("</coderocketArtifact>", "</coderocketArtifact>"));
        if (currentFramework && currentFramework !== "html") {
          artifactCodes[currentFramework] = currentCode.join("\n");
        }
        currentFramework = null;
        currentCode = [];
        inCode = false;
      } else if (line.trim() === "`,") {

      } else {
        currentCode.push(line);
      }
    }
  }

  return artifactCodes;
}

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: node scripts/extract-template.js <framework>");
    console.error("Example: node scripts/extract-template.js react");
    process.exit(1);
  }

  const framework = args[0];

  const defaultArtifactCode = loadDefaultArtifactCode();

  if (!defaultArtifactCode[framework]) {
    console.error(
      `❌ No default artifact code found for framework: ${framework}`,
    );
    console.error(
      `Available frameworks: ${Object.keys(defaultArtifactCode).join(", ")}`,
    );
    process.exit(1);
  }

  extractTemplate(framework, defaultArtifactCode[framework]);
}

module.exports = { extractTemplate };

