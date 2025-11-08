import { angular } from "@codemirror/lang-angular";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { sql } from "@codemirror/lang-sql";
import { vue } from "@codemirror/lang-vue";
import {
  SiHtml5,
  SiTypescript,
  SiReact,
  SiJavascript,
  SiCss3,
  SiSvelte,
  SiVuedotjs,
  SiMarkdown,
  SiAngular,
} from "@icons-pack/react-simple-icons";
import { svelte } from "@replit/codemirror-lang-svelte";
import { Braces, Database } from "lucide-react";

import { Framework } from "./config";

interface FileExtensionConfig {
  icon: typeof SiHtml5;
  color: string;
  backgroundColor?: string;
}

const FILE_EXTENSIONS: Record<string, FileExtensionConfig> = {
  html: {
    icon: SiHtml5,
    color: "text-[#E34F26]",
  },
  tsx: {
    icon: SiReact,
    color: "text-[#61DAFB]",
  },
  jsx: {
    icon: SiReact,
    color: "text-[#61DAFB]",
  },
  ts: {
    icon: SiTypescript,
    color: "text-[#3178C6]",
  },
  json: {
    icon: Braces,
    color: "text-[#B8860B]",
  },
  css: {
    icon: SiCss3,
    color: "text-[#1572B6]",
  },
  js: {
    icon: SiJavascript,
    color: "text-[#F7DF1E]",
  },
  svelte: {
    icon: SiSvelte,
    color: "text-[#FF3E00]",
  },
  vue: {
    icon: SiVuedotjs,
    color: "text-[#4FC08D]",
  },
  md: {
    icon: SiMarkdown,
    color: "text-[#000000]",
  },
  sql: {
    icon: Database,
    color: "text-[#00758F]",
  },
};

export const getFileConfig = (
  fileName: string,
  framework?: string,
): FileExtensionConfig => {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";

  if (extension === "ts" && framework) {
    switch (framework) {
      case Framework.ANGULAR:
        return {
          icon: SiAngular,
          color: "text-[#DD0031]",
        };
      case Framework.REACT:
        return {
          icon: SiReact,
          color: "text-[#61DAFB]",
        };
      default:
        return (
          FILE_EXTENSIONS[extension] || {
            icon: SiTypescript,
            color: "text-[#3178C6]",
          }
        );
    }
  }

  return (
    FILE_EXTENSIONS[extension] || {
      icon: Braces,
      color: "text-[#B8860B]",
    }
  );
};

export const getLanguageExtension = (filename: string, framework?: string) => {
  const ext = filename.split(".").pop()?.toLowerCase();

  switch (ext) {
    case "css":
      return [css()];
    case "js":
    case "jsx":
      return [javascript({ jsx: true })];
    case "ts":
      return [javascript({ typescript: true })];
    case "tsx":
      return [javascript({ typescript: true, jsx: true })];
    case "json":
      return [json()];
    case "html":
      if (framework === Framework.ANGULAR) {
        return [angular(), html()];
      }
      return [html()];
    case "vue":
      return [vue()];
    case "svelte":
      return [svelte()];
    case "md":
      return [markdown()];
    case "sql":
      return [sql()];
    default:
      return [html()];
  }
};
