import { getSubscription } from "@/app/supabase-server";
import { UploadedFileInfo } from "@/types/api";

import { getMaxFilesLimit } from "./config";
import { getFileType } from "./file-helper";
import { createClient } from "./supabase/server";

export type { UploadedFileInfo } from "@/types/api";

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
    const subscription = await getSubscription(userId);
    if (!subscription) {
      return {
        success: false,
        uploadedFiles: [],
        error: "Premium subscription required",
      };
    }

    const maxFilesLimit = getMaxFilesLimit(subscription);

    const { count, error: countError } = await supabase
      .from("user_files")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (countError) {
      return {
        success: false,
        uploadedFiles: [],
        error: "Failed to check file limit",
      };
    }

    const currentFileCount = count || 0;

    if (maxFilesLimit !== Infinity && currentFileCount >= maxFilesLimit) {
      return {
        success: false,
        uploadedFiles: [],
        error: `File limit reached. Your plan allows ${maxFilesLimit} files maximum. Please delete some files or upgrade your plan.`,
      };
    }

    if (
      maxFilesLimit !== Infinity &&
      currentFileCount + files.length > maxFilesLimit
    ) {
      const remainingSlots = maxFilesLimit - currentFileCount;
      return {
        success: false,
        uploadedFiles: [],
        error: `Cannot upload ${files.length} file(s). Your plan allows ${maxFilesLimit} files maximum. You can upload ${remainingSlots} more file(s).`,
      };
    }
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

      let storageData;
      let storageError;

      if (fileType === "pdf") {
        const result = await supabase.storage
          .from("images")
          .upload(fileName, file, {
            contentType: file.type,
          });
        storageData = result.data;
        storageError = result.error;
      } else if (fileType === "text") {
        const result = await supabase.storage
          .from("images")
          .upload(fileName, file, {
            contentType: file.type,
          });
        storageData = result.data;
        storageError = result.error;
      } else if (fileType === "image") {
        const result = await supabase.storage
          .from("images")
          .upload(fileName, file);
        storageData = result.data;
        storageError = result.error;
      } else {
        continue;
      }

      if (storageError) {
        return {
          success: false,
          uploadedFiles: [],
          error: `Failed to upload file ${i + 1}: ${storageError.message}`,
        };
      }

      if (storageData?.path) {
        const { data: publicUrlData } = supabase.storage
          .from("images")
          .getPublicUrl(storageData.path);

        const fileInfo = {
          path: storageData.path,
          publicUrl: publicUrlData.publicUrl,
          type: fileType as "image" | "pdf" | "text",
          mimeType: file.type,
        };

        const { error: dbError } = await supabase.from("user_files").insert({
          user_id: userId,
          storage_path: storageData.path,
          public_url: publicUrlData.publicUrl,
          file_type: fileType,
          mime_type: file.type,
          file_size: file.size,
          original_name: file.name,
        });

        if (dbError) {
          console.error("Failed to insert file record:", dbError);
        }

        uploadedFiles.push(fileInfo);
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
