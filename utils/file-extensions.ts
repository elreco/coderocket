import {
  SiHtml5,
  SiTypescript,
  SiJson,
  SiReact,
} from "@icons-pack/react-simple-icons";

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
    icon: SiJson,
    color: "text-[#000000]",
  },
};

export const getFileConfig = (fileName: string): FileExtensionConfig => {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  return (
    FILE_EXTENSIONS[extension] || {
      icon: SiHtml5,
      color: "text-[#E34F26]",
    }
  );
};
