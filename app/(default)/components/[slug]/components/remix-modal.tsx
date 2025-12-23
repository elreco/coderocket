import { GitFork, Info, Loader } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tables } from "@/types_db";

interface RemixModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedVersion: number | undefined;
  isRemixing: boolean;
  hasAlreadyRemixed: boolean;
  remixOriginalChat: Tables<"chats"> | null;
  onRemixClick: () => void;
}

export function RemixModal({
  isOpen,
  onOpenChange,
  selectedVersion,
  isRemixing,
  hasAlreadyRemixed,
  remixOriginalChat,
  onRemixClick,
}: RemixModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-2xl">
        <div className="mb-6 flex flex-col items-center justify-center text-center">
          <GitFork className="text-primary mb-2 size-12" />
          <DialogTitle className="text-xl font-semibold">
            Remix This Component
          </DialogTitle>
          <p className="text-muted-foreground">
            Create your own version of this component! 🚀
          </p>
        </div>
        <DialogDescription>
          <>
            <p className="mb-4">
              Remixing will create a copy of this component that you can modify
              and customize. This feature is available for subscribers only.
            </p>
            {hasAlreadyRemixed && remixOriginalChat && (
              <Alert className="mb-4">
                <AlertTitle className="mb-2 flex items-center gap-2">
                  <Info className="size-4" />
                  <p>This is a remix</p>
                </AlertTitle>
                <AlertDescription>
                  This component is a remix of{" "}
                  <a
                    href={`/components/${remixOriginalChat.slug}`}
                    className="text-primary font-medium hover:underline"
                  >
                    {remixOriginalChat.title ||
                      `Component ${remixOriginalChat.slug}`}
                  </a>
                  . You can remix it again to create your own version.
                </AlertDescription>
              </Alert>
            )}
            <Alert className="mb-4">
              <AlertTitle className="mb-2 flex items-center gap-2">
                <Info className="size-4" />{" "}
                <p>Remixing from selected version</p>
              </AlertTitle>
              <AlertDescription>
                You selected{" "}
                <Badge variant="outline">version #{selectedVersion}</Badge> as
                the base of your remix. You can change this by selecting a
                different version in the sidebar.
              </AlertDescription>
            </Alert>
          </>
          <div className="flex justify-center">
            <Button
              onClick={onRemixClick}
              disabled={isRemixing}
              className="flex w-full max-w-xs items-center justify-center"
            >
              {isRemixing ? (
                <>
                  <Loader className="size-4 animate-spin" />
                  Creating Remix...
                </>
              ) : (
                <>
                  <GitFork className="size-4" />
                  Remix Component
                </>
              )}
            </Button>
          </div>
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
}
