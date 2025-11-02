import { NextRequest, NextResponse } from "next/server";

import { decryptIntegrationConfig } from "@/utils/integrations/encryption";
import { createClient } from "@/utils/supabase/server";

interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  backgroundColor?: { r: number; g: number; b: number; a: number };
  fills?: Array<{
    type: string;
    color?: { r: number; g: number; b: number; a: number };
  }>;
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  style?: {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number;
  };
  characters?: string;
}

function rgbaToHex(color: {
  r: number;
  g: number;
  b: number;
  a: number;
}): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function convertFigmaNodeToHTML(
  node: FigmaNode,
  framework: string = "html",
): string {
  if (!node) return "";

  const styles: string[] = [];
  let content = "";
  let tag = "div";

  if (node.absoluteBoundingBox) {
    styles.push(`width: ${Math.round(node.absoluteBoundingBox.width)}px`);
    styles.push(`height: ${Math.round(node.absoluteBoundingBox.height)}px`);
  }

  if (node.fills && node.fills.length > 0) {
    const fill = node.fills[0];
    if (fill.color) {
      styles.push(`background-color: ${rgbaToHex(fill.color)}`);
    }
  }

  if (node.type === "TEXT" && node.characters) {
    tag = "p";
    content = node.characters;
    if (node.style?.fontFamily) {
      styles.push(`font-family: ${node.style.fontFamily}`);
    }
    if (node.style?.fontSize) {
      styles.push(`font-size: ${node.style.fontSize}px`);
    }
    if (node.style?.fontWeight) {
      styles.push(`font-weight: ${node.style.fontWeight}`);
    }
  }

  if (node.children) {
    content = node.children
      .map((child) => convertFigmaNodeToHTML(child, framework))
      .join("\n");
  }

  const styleAttr = styles.length > 0 ? ` style="${styles.join("; ")}"` : "";
  const className = ` class="${node.name.toLowerCase().replace(/\s+/g, "-")}"`;

  if (framework === "react") {
    return `<${tag}${className.replace("class=", "className=")}${styleAttr.replace(/"/g, '{"').replace(/;/g, '",').replace(/:/g, ':"')}>\n  ${content}\n</${tag}>`;
  }

  return `<${tag}${className}${styleAttr}>\n  ${content}\n</${tag}>`;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { integrationId, fileKey, nodeIds, framework = "html" } = body;

    if (!integrationId || !fileKey) {
      return NextResponse.json(
        { error: "Missing integrationId or fileKey" },
        { status: 400 },
      );
    }

    const { data: integration, error: integrationError } = await supabase
      .from("user_integrations")
      .select("config")
      .eq("id", integrationId)
      .eq("user_id", user.id)
      .eq("integration_type", "figma")
      .single();

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 },
      );
    }

    const decryptedConfig = decryptIntegrationConfig(
      integration.config as unknown as string,
    );
    const config = decryptedConfig as { accessToken: string };
    const accessToken = config.accessToken;

    const isOAuthToken = accessToken.startsWith("figu_");
    const headers: Record<string, string> = isOAuthToken
      ? { Authorization: `Bearer ${accessToken}` }
      : { "X-Figma-Token": accessToken };

    const fileResponse = await fetch(
      `https://api.figma.com/v1/files/${fileKey}`,
      {
        headers,
      },
    );

    if (!fileResponse.ok) {
      const errorText = await fileResponse.text();

      if (fileResponse.status === 403) {
        return NextResponse.json(
          {
            error:
              "Invalid or expired Figma token. Please reconnect your Figma account in the integrations page.",
          },
          { status: 403 },
        );
      }

      return NextResponse.json(
        { error: `Failed to fetch Figma file: ${errorText}` },
        { status: fileResponse.status },
      );
    }

    const fileData = await fileResponse.json();
    const document = fileData.document;

    let nodesToConvert: FigmaNode[] = [];

    if (nodeIds && nodeIds.length > 0) {
      const findNodes = (node: FigmaNode): FigmaNode[] => {
        const found: FigmaNode[] = [];
        if (nodeIds.includes(node.id)) {
          found.push(node);
        }
        if (node.children) {
          for (const child of node.children) {
            found.push(...findNodes(child));
          }
        }
        return found;
      };
      nodesToConvert = findNodes(document);
    } else {
      nodesToConvert = document.children || [document];
    }

    const htmlCode = nodesToConvert
      .map((node) => convertFigmaNodeToHTML(node, framework))
      .join("\n\n");

    const cssCode = `
/* Generated from Figma */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}
`;

    let fullCode = "";
    if (framework === "react") {
      fullCode = `
export default function FigmaComponent() {
  return (
    <div className="figma-component">
      ${htmlCode}
    </div>
  );
}
`;
    } else if (framework === "vue") {
      fullCode = `
<template>
  <div class="figma-component">
    ${htmlCode}
  </div>
</template>

<script>
export default {
  name: 'FigmaComponent'
}
</script>

<style scoped>
${cssCode}
</style>
`;
    } else {
      fullCode = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Figma Design</title>
  <style>
    ${cssCode}
  </style>
</head>
<body>
  ${htmlCode}
</body>
</html>
`;
    }

    return NextResponse.json({
      success: true,
      code: fullCode,
      html: htmlCode,
      css: cssCode,
    });
  } catch (error) {
    console.error("Error converting Figma to code:", error);
    return NextResponse.json(
      { error: "Failed to convert Figma design" },
      { status: 500 },
    );
  }
}
