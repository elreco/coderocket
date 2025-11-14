import { getFileType } from "./file-helper";
import { createClient } from "./supabase/server";

export interface UploadedFileInfo {
  path: string;
  publicUrl: string;
  type: "image" | "pdf" | "text";
  mimeType: string;
  source?: string;
}

export async function uploadFiles(
  files: File[],
  userId: string,
): Promise<{
  success: boolean;
  uploadedFiles: UploadedFileInfo[];
  error?: string;
}> {
  const supabase = await createClient();
  const uploadedFiles: UploadedFileInfo[] = [];

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileType = getFileType(file);
      const timestamp = Date.now();

      const getFileExtension = (
        type: typeof fileType,
        originalName: string,
      ) => {
        if (type === "pdf") return ".pdf";
        if (type === "text") return ".txt";
        if (type === "image") {
          const ext = originalName.split(".").pop()?.toLowerCase();
          if (ext && ["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) {
            return `.${ext}`;
          }
          return ".png";
        }
        return "";
      };

      const extension = getFileExtension(fileType, file.name);
      const fileName = `${timestamp}-${userId}-${i}${extension}`;

      if (fileType === "pdf") {
        const { data: pdfData, error: pdfError } = await supabase.storage
          .from("images")
          .upload(fileName, file, {
            contentType: file.type,
          });

        if (pdfError) {
          return {
            success: false,
            uploadedFiles: [],
            error: `Failed to upload PDF ${i + 1}: ${pdfError.message}`,
          };
        }

        if (pdfData?.path) {
          const { data: publicUrlData } = supabase.storage
            .from("images")
            .getPublicUrl(pdfData.path);

          uploadedFiles.push({
            path: pdfData.path,
            publicUrl: publicUrlData.publicUrl,
            type: "pdf",
            mimeType: file.type,
          });
        }
      } else if (fileType === "text") {
        const { data: textData, error: textError } = await supabase.storage
          .from("images")
          .upload(fileName, file, {
            contentType: file.type,
          });

        if (textError) {
          return {
            success: false,
            uploadedFiles: [],
            error: `Failed to upload text file ${i + 1}: ${textError.message}`,
          };
        }

        if (textData?.path) {
          const { data: publicUrlData } = supabase.storage
            .from("images")
            .getPublicUrl(textData.path);

          uploadedFiles.push({
            path: textData.path,
            publicUrl: publicUrlData.publicUrl,
            type: "text",
            mimeType: file.type,
          });
        }
      } else if (fileType === "image") {
        const { data: imageData, error: imageError } = await supabase.storage
          .from("images")
          .upload(fileName, file);

        if (imageError) {
          return {
            success: false,
            uploadedFiles: [],
            error: `Failed to upload image ${i + 1}: ${imageError.message}`,
          };
        }

        if (imageData?.path) {
          const { data: publicUrlData } = supabase.storage
            .from("images")
            .getPublicUrl(imageData.path);

          uploadedFiles.push({
            path: imageData.path,
            publicUrl: publicUrlData.publicUrl,
            type: "image",
            mimeType: file.type,
          });
        }
      }
    }

    return {
      success: true,
      uploadedFiles,
    };
  } catch (error) {
    return {
      success: false,
      uploadedFiles: [],
      error: error instanceof Error ? error.message : "Failed to upload files",
    };
  }
}
