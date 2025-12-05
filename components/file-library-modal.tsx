"use client";

import {
  FolderOpen,
  FileImage,
  FileText,
  Trash2,
  Upload,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState, useCallback, useRef } from "react";

import { toast } from "@/hooks/use-toast";
import { Tables } from "@/types_db";
import { getMaxFilesLimit } from "@/utils/config";
import { validateFile, getFileType } from "@/utils/file-helper";
import { createClient } from "@/utils/supabase/client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Skeleton } from "./ui/skeleton";

interface FileLibraryItem {
  path: string;
  publicUrl: string;
  type: "image" | "pdf" | "text";
  mimeType: string;
  uploadDate: string;
  size: number;
}

interface FileLibraryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription:
    | (Tables<"subscriptions"> & {
        prices: Partial<Tables<"prices">> | null;
      })
    | null;
  isLoggedIn: boolean;
  onFileSelect: (file: FileLibraryItem) => void;
  currentFilesCount: number;
  fileInputRef?: React.RefObject<HTMLInputElement>;
  onFileDeleted?: (path: string) => void;
}

export function FileLibraryModal({
  open,
  onOpenChange,
  subscription,
  isLoggedIn,
  onFileSelect,
  currentFilesCount,
  fileInputRef,
  onFileDeleted,
}: FileLibraryModalProps) {
  const [files, setFiles] = useState<FileLibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileLibraryItem | null>(
    null,
  );
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectedFilesData, setSelectedFilesData] = useState<
    Map<string, FileLibraryItem>
  >(new Map());
  const [isDragOver, setIsDragOver] = useState(false);
  const isFetchingRef = useRef(false);

  const isPremium = !!subscription;
  const maxFilesLimit = getMaxFilesLimit(
    subscription as
      | (Tables<"subscriptions"> & {
          prices:
            | (Partial<Tables<"prices">> & {
                products: Partial<Tables<"products">> | null;
              })
            | null;
        })
      | null,
  );

  const fetchFiles = useCallback(
    async (pageNum: number) => {
      if (!isPremium || !isLoggedIn) return;
      if (isFetchingRef.current) return;

      isFetchingRef.current = true;
      setLoading(true);
      try {
        const response = await fetch(`/api/files?page=${pageNum}&limit=20`);
        if (!response.ok) {
          if (response.status === 403) {
            toast({
              variant: "destructive",
              title: "Premium required",
              description: "This feature is only available for premium users.",
            });
            onOpenChange(false);
            return;
          }
          throw new Error("Failed to fetch files");
        }

        const data = await response.json();
        console.log("Files fetched:", data.files?.length || 0, "files");
        const fileTypes = data.files?.reduce(
          (acc: Record<string, number>, file: FileLibraryItem) => {
            acc[file.type] = (acc[file.type] || 0) + 1;
            return acc;
          },
          {},
        );
        console.log("File types breakdown:", fileTypes);
        console.log(
          "Sample files:",
          data.files?.slice(0, 5).map((f: FileLibraryItem) => ({
            path: f.path,
            type: f.type,
            mimeType: f.mimeType,
          })),
        );
        const fetchedFiles = data.files || [];
        setFiles(fetchedFiles);
        setTotalPages(data.pagination?.totalPages || 1);
      } catch (error) {
        console.error("Error fetching files:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to load files. Please try again.";
        toast({
          variant: "destructive",
          title: "Error",
          description: errorMessage,
        });
      } finally {
        setLoading(false);
        isFetchingRef.current = false;
      }
    },
    [isPremium, isLoggedIn, onOpenChange],
  );

  useEffect(() => {
    if (open && isPremium && isLoggedIn && !isFetchingRef.current) {
      fetchFiles(page);
    }
  }, [open, page, isPremium, isLoggedIn, fetchFiles]);

  useEffect(() => {
    if (open && isPremium && isLoggedIn) {
      setSelectedFiles(new Set());
      setSelectedFilesData(new Map());
    }
  }, [open, isPremium, isLoggedIn]);

  const handleDelete = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (!fileToDelete) return;

    setDeletingPath(fileToDelete.path);
    try {
      const response = await fetch(
        `/api/files?path=${encodeURIComponent(fileToDelete.path)}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete file");
      }

      toast({
        title: "File deleted",
        description: "The file has been successfully deleted.",
      });

      if (onFileDeleted) {
        onFileDeleted(fileToDelete.path);
      }

      if (files.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        fetchFiles(page);
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete file. Please try again.",
      });
    } finally {
      setDeletingPath(null);
      setShowDeleteDialog(false);
      setFileToDelete(null);
    }
  };

  const handleFileToggle = (file: FileLibraryItem, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const isSelected = selectedFiles.has(file.path);
    const newSelectedCount = isSelected
      ? selectedFiles.size - 1
      : selectedFiles.size + 1;

    if (!isSelected && currentFilesCount + newSelectedCount > maxFilesLimit) {
      toast({
        variant: "destructive",
        title: "Too many files",
        description: `Maximum ${maxFilesLimit === Infinity ? "unlimited" : maxFilesLimit} files allowed. You can select ${maxFilesLimit === Infinity ? "unlimited" : maxFilesLimit - currentFilesCount - selectedFiles.size} more file(s).`,
        duration: 4000,
      });
      return;
    }

    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (isSelected) {
        next.delete(file.path);
      } else {
        next.add(file.path);
      }
      return next;
    });

    setSelectedFilesData((prev) => {
      const next = new Map(prev);
      if (isSelected) {
        next.delete(file.path);
      } else {
        next.set(file.path, file);
      }
      return next;
    });
  };

  const handleConfirmSelection = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const filesToSelect = Array.from(selectedFilesData.values());

    if (filesToSelect.length === 0) {
      toast({
        variant: "destructive",
        title: "No files selected",
        description: "Please select at least one file.",
        duration: 4000,
      });
      return;
    }

    if (
      maxFilesLimit !== Infinity &&
      currentFilesCount + filesToSelect.length > maxFilesLimit
    ) {
      toast({
        variant: "destructive",
        title: "Too many files",
        description: `Maximum ${maxFilesLimit === Infinity ? "unlimited" : maxFilesLimit} files allowed. You can select ${maxFilesLimit === Infinity ? "unlimited" : maxFilesLimit - currentFilesCount} more file(s).`,
        duration: 4000,
      });
      return;
    }

    filesToSelect.forEach((file) => {
      onFileSelect(file);
    });

    setSelectedFiles(new Set());
    setSelectedFilesData(new Map());
    toast({
      title: "Files selected",
      description: `${filesToSelect.length} file(s) have been added to your selection.`,
    });

    onOpenChange(false);
  };

  const processFiles = useCallback(
    async (fileList: File[]) => {
      const validFiles: File[] = [];

      for (const file of fileList) {
        if (
          maxFilesLimit !== Infinity &&
          currentFilesCount + validFiles.length >= maxFilesLimit
        ) {
          toast({
            variant: "destructive",
            title: "Too many files",
            description: `Maximum ${maxFilesLimit} files allowed`,
            duration: 4000,
          });
          break;
        }

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

        validFiles.push(file);
      }

      if (validFiles.length > 0) {
        setUploading(true);
        try {
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (!user?.id) {
            toast({
              variant: "destructive",
              title: "Error",
              description: "You must be logged in to upload files",
              duration: 4000,
            });
            setUploading(false);
            return;
          }

          for (let i = 0; i < validFiles.length; i++) {
            const file = validFiles[i];
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
                if (
                  ext &&
                  ["png", "jpg", "jpeg", "gif", "webp"].includes(ext)
                ) {
                  return `.${ext}`;
                }
                return ".png";
              }
              return "";
            };

            const extension = getFileExtension(fileType, file.name);
            const fileName = `${timestamp}-${user.id}-${i}${extension}`;

            const uploadOptions: { contentType?: string } =
              fileType === "pdf" || fileType === "text"
                ? { contentType: file.type }
                : {};

            const { data: storageData, error: storageError } =
              await supabase.storage
                .from("images")
                .upload(fileName, file, uploadOptions);

            if (storageError) {
              throw new Error(
                `Failed to upload file ${i + 1}: ${storageError.message}`,
              );
            }

            if (storageData?.path) {
              const { data: publicUrlData } = supabase.storage
                .from("images")
                .getPublicUrl(storageData.path);

              const { error: dbError } = await supabase
                .from("user_files")
                .insert({
                  user_id: user.id,
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
            }
          }

          const pathsToSelect: string[] = [];
          for (let i = 0; i < validFiles.length; i++) {
            const file = validFiles[i];
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
                if (
                  ext &&
                  ["png", "jpg", "jpeg", "gif", "webp"].includes(ext)
                ) {
                  return `.${ext}`;
                }
                return ".png";
              }
              return "";
            };

            const extension = getFileExtension(fileType, file.name);
            const fileName = `${timestamp}-${user.id}-${i}${extension}`;
            pathsToSelect.push(fileName);
          }

          toast({
            title: "Files uploaded",
            description: `Successfully uploaded ${validFiles.length} file(s). They are now selected in the library.`,
            duration: 3000,
          });

          if (page !== 1) {
            setPage(1);
          } else {
            await fetchFiles(1);
          }

          setTimeout(async () => {
            try {
              const response = await fetch(`/api/files?page=1&limit=20`);
              if (response.ok) {
                const data = await response.json();
                const uploadedFiles = (data.files || []).filter(
                  (f: FileLibraryItem) => pathsToSelect.includes(f.path),
                );

                if (uploadedFiles.length > 0) {
                  setSelectedFiles((prev) => {
                    const newSet = new Set(prev);
                    uploadedFiles.forEach((file: FileLibraryItem) => {
                      newSet.add(file.path);
                    });
                    return newSet;
                  });

                  setSelectedFilesData((prev) => {
                    const newMap = new Map(prev);
                    uploadedFiles.forEach((file: FileLibraryItem) => {
                      newMap.set(file.path, file);
                    });
                    return newMap;
                  });
                }
              }
            } catch (error) {
              console.error("Error selecting uploaded files:", error);
            }
          }, 500);
        } catch (error) {
          console.error("Error uploading files:", error);
          toast({
            variant: "destructive",
            title: "Upload failed",
            description:
              error instanceof Error
                ? error.message
                : "An error occurred while uploading files",
            duration: 4000,
          });
        } finally {
          setUploading(false);
        }
      }
    },
    [currentFilesCount, fetchFiles, page, maxFilesLimit],
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const newFiles = Array.from(e.target.files);
    processFiles(newFiles);

    if (e.target) {
      e.target.value = "";
    }
  };

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!uploading && isPremium && isLoggedIn) {
        setIsDragOver(true);
      }
    },
    [uploading, isPremium, isLoggedIn],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (
      e.currentTarget === e.target ||
      !e.currentTarget.contains(e.relatedTarget as Node)
    ) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (uploading || !isPremium || !isLoggedIn) return;

      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length === 0) return;

      processFiles(droppedFiles);
    },
    [uploading, isPremium, isLoggedIn, processFiles],
  );

  const getFileIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <FileText className="size-8 text-red-500" />;
      case "text":
        return <FileText className="size-8 text-blue-500" />;
      default:
        return <FileImage className="size-8 text-green-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isPremium || !isLoggedIn) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Premium Feature</DialogTitle>
            <DialogDescription>
              File library is only available for premium users. Upgrade to
              access your file library and manage your uploaded files.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button asChild>
              <a href="/pricing">Upgrade to Premium</a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(newOpen) => {
          if (!showDeleteDialog) {
            onOpenChange(newOpen);
          }
        }}
      >
        <DialogContent
          className="z-[9999] max-w-[98vw]! w-[98vw]! max-h-[95vh]! h-[95vh]! sm:max-w-[98vw]! flex flex-col p-8"
          onPointerDownOutside={(e) => {
            const target = e.target as HTMLElement;
            if (
              showDeleteDialog ||
              target.closest('[data-slot="toast"]') ||
              target.closest("[toast-close]")
            ) {
              e.preventDefault();
            }
          }}
          onInteractOutside={(e) => {
            const target = e.target as HTMLElement;
            if (
              showDeleteDialog ||
              target.closest('[data-slot="toast"]') ||
              target.closest("[toast-close]")
            ) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader className="pb-6">
            <DialogTitle className="text-2xl">Files</DialogTitle>
            <DialogDescription className="text-base">
              Manage and select from your previously uploaded files
            </DialogDescription>
          </DialogHeader>

          <div
            className="flex-1 overflow-y-auto min-h-0 relative"
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {isDragOver && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-lg">
                <div className="text-center">
                  <Upload className="size-12 mx-auto mb-4 text-primary" />
                  <p className="text-lg font-semibold text-primary">
                    Drop files here to upload
                  </p>
                </div>
              </div>
            )}
            {loading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-5">
                {[...Array(20)].map((_, i) => (
                  <div key={i} className="space-y-4">
                    <Skeleton className="w-full aspect-square rounded-xl" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-9 w-full rounded-md" />
                  </div>
                ))}
              </div>
            ) : files.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <FolderOpen className="size-20 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-lg">
                  No files found. Upload your first file to get started.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-5">
                {files.map((file) => {
                  const isSelected = selectedFiles.has(file.path);
                  if (file.type !== "image") {
                    console.log(
                      `Non-image file: ${file.path}, type: ${file.type}, mimeType: ${file.mimeType}`,
                    );
                  }
                  return (
                    <div
                      key={file.path}
                      className={`group relative border-2 rounded-xl p-5 hover:border-primary hover:shadow-xl transition-all bg-background cursor-pointer ${
                        isSelected ? "border-primary bg-primary/5" : ""
                      }`}
                      onClick={(e) => handleFileToggle(file, e)}
                    >
                      <div className="flex flex-col gap-4">
                        <div className="relative">
                          {file.type === "image" ? (
                            <div className="w-full aspect-square overflow-hidden rounded-xl bg-muted border-2 border-border shadow-sm relative">
                              <Image
                                src={file.publicUrl}
                                alt={file.path}
                                fill
                                sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 14vw"
                                className="object-cover group-hover:scale-110 transition-transform duration-300"
                                loading="lazy"
                                quality={75}
                                unoptimized={false}
                              />
                            </div>
                          ) : (
                            <div className="w-full aspect-square flex flex-col items-center justify-center gap-2 bg-muted rounded-xl border-2 border-border shadow-sm p-4">
                              {getFileIcon(file.type)}
                              <span className="text-xs text-muted-foreground font-medium capitalize">
                                {file.type}
                              </span>
                            </div>
                          )}
                          {isSelected && (
                            <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1.5 shadow-lg">
                              <svg
                                className="size-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <p
                            className="text-sm font-semibold truncate text-foreground"
                            title={file.path}
                          >
                            {file.path.split("/").pop() || file.path}
                          </p>
                          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                            <span>{formatDate(file.uploadDate)}</span>
                            <span className="font-medium">
                              {formatFileSize(file.size)}
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-9 w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setFileToDelete(file);
                            setShowDeleteDialog(true);
                          }}
                          disabled={deletingPath === file.path}
                        >
                          {deletingPath === file.path ? (
                            <>
                              <Loader2 className="size-4 mr-2 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 className="size-4 mr-2" />
                              Delete
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t pt-6 mt-4">
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".png,.jpeg,.jpg,.gif,.webp,.pdf"
                multiple
                onChange={handleFileUpload}
              />
              <Button
                variant="outline"
                size="default"
                className="h-10 px-4"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef?.current?.click();
                }}
                disabled={
                  uploading ||
                  (maxFilesLimit !== Infinity &&
                    currentFilesCount >= maxFilesLimit)
                }
              >
                {uploading ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="size-4 mr-2" />
                    Upload New
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-center gap-3 flex-1 justify-center">
              <Button
                variant="outline"
                size="default"
                className="h-10 w-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setPage((p) => Math.max(1, p - 1));
                }}
                disabled={page === 1 || loading}
              >
                <ChevronLeft className="size-5" />
              </Button>
              <span className="text-base font-medium text-foreground min-w-[100px] text-center">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="default"
                className="h-10 w-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setPage((p) => Math.min(totalPages, p + 1));
                }}
                disabled={page >= totalPages || loading}
              >
                <ChevronRight className="size-5" />
              </Button>
            </div>

            {selectedFiles.size > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {selectedFiles.size} file(s) selected
                </span>
                <Button
                  variant="default"
                  size="default"
                  className="h-10 px-6 font-semibold"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleConfirmSelection(e);
                  }}
                  disabled={
                    maxFilesLimit !== Infinity &&
                    currentFilesCount + selectedFiles.size > maxFilesLimit
                  }
                >
                  Select {selectedFiles.size} file(s)
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={showDeleteDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowDeleteDialog(false);
            setFileToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this file? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                setShowDeleteDialog(false);
                setFileToDelete(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                handleDelete(e);
              }}
              disabled={deletingPath !== null}
            >
              {deletingPath ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
