import { getFileType } from "./file-helper";
import { createClient } from "./supabase/server";

export interface UploadedFileInfo {
  path: string;
  type: "image" | "pdf";
  mimeType: string;
}

export async function uploadFiles(
  files: File[],
  userId: string,
): Promise<UploadedFileInfo[]> {
  const supabase = await createClient();
  const uploadedFiles: UploadedFileInfo[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileType = getFileType(file);
    const timestamp = Date.now();
    const fileName = `${timestamp}-${userId}-${i}`;

    if (fileType === "pdf") {
      const { data: pdfData, error: pdfError } = await supabase.storage
        .from("images")
        .upload(fileName, file, {
          contentType: file.type,
        });

      if (pdfError) {
        throw new Error(`Failed to upload PDF ${i + 1}: ${pdfError.message}`);
      }

      if (pdfData?.path) {
        uploadedFiles.push({
          path: pdfData.path,
          type: "pdf",
          mimeType: file.type,
        });
      }
    } else if (fileType === "image") {
      const { data: imageData, error: imageError } = await supabase.storage
        .from("images")
        .upload(fileName, file);

      if (imageError) {
        throw new Error(
          `Failed to upload image ${i + 1}: ${imageError.message}`,
        );
      }

      if (imageData?.path) {
        uploadedFiles.push({
          path: imageData.path,
          type: "image",
          mimeType: file.type,
        });
      }
    }
  }

  return uploadedFiles;
}
