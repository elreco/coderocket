import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import {
  SiHtml5,
  SiTypescript,
  SiReact,
  SiJavascript,
  SiCss3,
} from "@icons-pack/react-simple-icons";
import { Braces } from "lucide-react";

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
};

export const getFileConfig = (fileName: string): FileExtensionConfig => {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  return (
    FILE_EXTENSIONS[extension] || {
      icon: Braces,
      color: "text-[#B8860B]",
    }
  );
};

export const getLanguageExtension = (filename: string) => {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "css":
      return css();
    case "js":
    case "jsx":
      return javascript({ jsx: true });
    case "ts":
    case "tsx":
      return javascript({ typescript: true, jsx: true });
    case "json":
      return json();
    case "html":
    default:
      return html();
  }
};
