import {
  supportedImageTypes,
  supportedDocumentTypes,
  maxImageSize,
  maxPdfSize,
} from "./config";

export type FileType = "image" | "pdf" | "unknown";

export const getFileType = (file: File): FileType => {
  if (supportedImageTypes.includes(file.type)) {
    return "image";
  }
  if (supportedDocumentTypes.includes(file.type)) {
    return "pdf";
  }
  return "unknown";
};

export const getMaxFileSize = (fileType: FileType): number => {
  switch (fileType) {
    case "image":
      return maxImageSize;
    case "pdf":
      return maxPdfSize;
    default:
      return maxImageSize;
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const isFileTypeSupported = (file: File): boolean => {
  return getFileType(file) !== "unknown";
};

export const validateFile = (
  file: File,
): { valid: boolean; error?: string } => {
  const fileType = getFileType(file);

  if (fileType === "unknown") {
    return {
      valid: false,
      error:
        "File type not supported. Please upload images (PNG, JPEG, GIF, WebP) or PDF documents.",
    };
  }

  const maxSize = getMaxFileSize(fileType);
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `${file.name} is too large. Maximum size for ${fileType === "pdf" ? "PDF" : "image"} is ${formatFileSize(maxSize)}.`,
    };
  }

  return { valid: true };
};
