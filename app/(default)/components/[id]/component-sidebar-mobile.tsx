import clsx from "clsx";
import { XCircle, Layers } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerClose,
} from "@/components/ui/drawer";
import { Tables } from "@/types_db";

interface Props {
  selectedVersion: number | null;
  assistantMessages: Tables<"messages">[];
  handleVersionSelect: (id: number) => void;
  handleDeleteVersion: (messageId: number) => void;
  isLoading: boolean;
  authorized: boolean;
}

export default function ComponentSidebarMobile({
  selectedVersion,
  assistantMessages,
  handleVersionSelect,
  handleDeleteVersion,
  isLoading,
  authorized,
}: Props) {
  return (
    <div className="block xl:hidden">
      <Drawer>
        <DrawerTrigger asChild>
          <Button disabled={isLoading} variant="secondary" className="mr-1">
            <Layers className="w-5" />
          </Button>
        </DrawerTrigger>
        <DrawerContent className="h-[90%] px-8">
          <div className="relative mb-3 flex size-full flex-col items-center gap-y-3 overflow-auto will-change-auto">
            {assistantMessages.map((m) => (
              <div key={m.id} className="relative">
                <img
                  alt=""
                  src={m?.screenshot || undefined}
                  className={clsx(
                    "aspect-video w-full rounded-md border object-cover",
                    selectedVersion === m.version
                      ? "border-gray-900"
                      : "border-gray-200",
                  )}
                />
                <DrawerClose
                  className={clsx(
                    "absolute inset-0 z-10 size-full cursor-pointer select-none items-center justify-center rounded-md transition-all duration-300",
                    selectedVersion === m.version
                      ? "bg-transparent"
                      : "bg-black/40 hover:bg-transparent",
                  )}
                  onClick={() => {
                    if (!isLoading) {
                      handleVersionSelect(m.version);
                    }
                  }}
                >
                  <Badge
                    className="absolute bottom-0 right-0 m-2"
                    variant="secondary"
                  >
                    v{m.version}
                  </Badge>
                  {assistantMessages.length > 1 && authorized && (
                    <AlertDialog>
                      <AlertDialogTrigger className="absolute right-3 top-2 z-20 cursor-pointer">
                        <XCircle className="size-4 cursor-pointer fill-red-500 hover:fill-red-400" />
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Version</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this version?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteVersion(m.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </DrawerClose>
              </div>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
