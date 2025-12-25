import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useComponentContext } from "@/context/component-context";
import { toast } from "@/hooks/use-toast";

import {
  changeVisibilityByChatId,
  deleteChatByChatId,
  updateTitleByChatId,
} from "../actions";

export default function SettingsContent() {
  const {
    isVisible,
    setVisible,
    chatId,
    subscription,
    fetchedChat,
    refreshChatData,
  } = useComponentContext();
  const router = useRouter();
  const [isVisibilityLoading, setIsVisibilityLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [isTitleLoading, setIsTitleLoading] = useState(false);
  const [hasTitleChanged, setHasTitleChanged] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isPremium = !!subscription;
  const isCheckingPremium = false;

  useEffect(() => {
    if (fetchedChat?.title) {
      setTitle(fetchedChat.title);
      setHasTitleChanged(false);
    }
  }, [fetchedChat?.title]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setHasTitleChanged(value.trim() !== (fetchedChat?.title || ""));
  };

  const handleTitleSave = async () => {
    if (!hasTitleChanged || isTitleLoading) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast({
        variant: "destructive",
        title: "Title cannot be empty",
        description: "Please enter a valid title.",
      });
      return;
    }

    if (trimmedTitle.length > 255) {
      toast({
        variant: "destructive",
        title: "Title too long",
        description: "Title must be 255 characters or less.",
      });
      return;
    }

    try {
      setIsTitleLoading(true);
      await updateTitleByChatId(chatId, trimmedTitle);
      setHasTitleChanged(false);
      if (refreshChatData) {
        await refreshChatData();
      }
      toast({
        title: "Title updated",
        description: "The component title has been updated successfully.",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      toast({
        variant: "destructive",
        title: "Failed to update title",
        description: errorMessage,
      });
    } finally {
      setIsTitleLoading(false);
    }
  };

  const handleVisibility = async () => {
    if (isVisibilityLoading || !isPremium) return;
    try {
      setIsVisibilityLoading(true);
      await changeVisibilityByChatId(chatId, !isVisible);
      setVisible(!isVisible);
      setIsVisibilityLoading(false);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      let title = "Error";
      let description = "Something went wrong. Please try again.";

      if (errorMessage === "payment-required") {
        title = "Premium account required";
        description =
          "You are not premium, the visibility cannot be changed. Please upgrade to premium and try again.";
      }

      toast({
        variant: "destructive",
        title,
        description,
        duration: 5000,
      });
      setIsVisibilityLoading(false);
    }
  };

  const handleDeleteChat = async () => {
    if (isDeleting) return;

    try {
      setIsDeleting(true);
      await deleteChatByChatId(chatId);
      toast({
        title: "Chat deleted",
        description: "Your component has been permanently deleted.",
      });
      router.push("/");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      toast({
        variant: "destructive",
        title: "Failed to delete chat",
        description: errorMessage,
      });
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  return (
    <div className="space-y-6 p-3">
      <div>
        <h4 className="mb-4 text-base font-semibold">Component title</h4>
        <div className="space-y-4">
          <div className="bg-background mb-5 flex flex-col gap-3 rounded-lg p-4">
            <div className="space-y-2">
              <Input
                id="component-title"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Enter component title..."
                maxLength={255}
                disabled={isTitleLoading}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleTitleSave();
                  }
                }}
              />
              <p className="text-muted-foreground text-xs">
                This title will be used in the generated code and component
                metadata.
              </p>
            </div>
            <Button
              onClick={handleTitleSave}
              disabled={isTitleLoading || !hasTitleChanged}
              className="w-full"
            >
              {isTitleLoading ? "Saving..." : "Save title"}
            </Button>
          </div>
        </div>
      </div>
      <div>
        <h4 className="mb-4 text-base font-semibold">Change visibility</h4>
        <div className="space-y-4">
          <div className="bg-background mb-5 flex flex-row items-center justify-between rounded-lg p-4">
            <div className="space-y-0.5">
              <Label>Private mode</Label>
              <p className="text-muted-foreground text-sm">
                When private, the component will not be visible to the public.
              </p>
              {!isPremium && (
                <p className="text-sm text-amber-600">
                  ⚠️ Premium subscription required to change component
                  visibility.
                </p>
              )}
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Switch
                      checked={!isVisible}
                      onCheckedChange={handleVisibility}
                      disabled={
                        isVisibilityLoading || isCheckingPremium || !isPremium
                      }
                    />
                  </div>
                </TooltipTrigger>
                {!isPremium && (
                  <TooltipContent>
                    <p>
                      Premium subscription required to change component
                      visibility.
                      <br />
                      Upgrade to premium to make your components private.
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      <div>
        <h4 className="mb-4 text-base font-semibold text-red-600">
          Danger zone
        </h4>
        <div className="space-y-4">
          <div className="mb-5 flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
            <div className="space-y-0.5">
              <Label className="text-red-700 dark:text-red-400">
                Delete this component
              </Label>
              <p className="text-sm text-red-600 dark:text-red-400">
                Once deleted, this component and all its versions will be
                permanently removed. This action cannot be undone.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setIsDeleteModalOpen(true)}
              className="w-full"
            >
              <Trash2 className="mr-2 size-4" />
              Delete component
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              component, all its versions, messages, and associated builds.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteChat}
              disabled={isDeleting}
              variant="destructive"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete permanently"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
