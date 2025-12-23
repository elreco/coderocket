export interface UploadedFileInfo {
  path: string;
  publicUrl?: string;
  type: "image" | "pdf" | "text";
  mimeType: string;
  source?: string;
}

export interface CloneResult {
  enhancedPrompt: string;
  userDisplayPrompt: string;
  cloneScreenshot: string | null;
}

export type FileType = "image" | "pdf" | "text";

export interface FileTypeInfo {
  type: FileType;
  mimeType: string;
}
