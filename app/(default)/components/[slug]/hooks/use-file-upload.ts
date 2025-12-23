import { useCallback, useRef, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { maxImagesUpload } from "@/utils/config";
import { validateFile } from "@/utils/file-helper";

interface UseFileUploadProps {
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function useFileUpload({ files, setFiles, inputRef }: UseFileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleButtonClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const handleFileRemove = useCallback(
    (index: number) => {
      setFiles((prev) => prev.filter((_, i) => i !== index));
      if (files.length === 1 && fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [files.length, setFiles],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;

      const newFiles = Array.from(e.target.files);
      const validFiles: File[] = [];

      for (const file of newFiles) {
        const validation = validateFile(file);

        if (!validation.valid) {
          toast({
            variant: "destructive",
            title: "Invalid file",
            description: validation.error,
            duration: 4000,
          });
          continue;
        }

        if (files.length + validFiles.length >= maxImagesUpload) {
          toast({
            variant: "destructive",
            title: "Too many files",
            description: `Maximum ${maxImagesUpload} files allowed`,
            duration: 4000,
          });
          break;
        }

        validFiles.push(file);
      }

      if (validFiles.length > 0) {
        setFiles((prev) => [...prev, ...validFiles]);
      }

      if (e.target) {
        e.target.value = "";
      }
    },
    [files.length, setFiles],
  );

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const clipboardItems = event.clipboardData?.items;
      if (!clipboardItems) return;

      for (let i = 0; i < clipboardItems.length; i++) {
        const item = clipboardItems[i];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (!file) continue;

          const validation = validateFile(file);
          if (!validation.valid) {
            toast({
              variant: "destructive",
              title: "Invalid file",
              description: validation.error,
              duration: 4000,
            });
            break;
          }

          if (files.length >= maxImagesUpload) {
            toast({
              variant: "destructive",
              title: "Too many files",
              description: `Maximum ${maxImagesUpload} files allowed`,
              duration: 4000,
            });
            break;
          }

          setFiles((prev: File[]) => [...prev, file]);
          break;
        }
      }
    };

    const textarea = inputRef.current;
    if (textarea) {
      textarea.addEventListener("paste", handlePaste);
    }

    return () => {
      if (textarea) {
        textarea.removeEventListener("paste", handlePaste);
      }
    };
  }, [inputRef, files.length, setFiles]);

  return {
    fileInputRef,
    handleButtonClick,
    handleFileRemove,
    handleFileChange,
  };
}
