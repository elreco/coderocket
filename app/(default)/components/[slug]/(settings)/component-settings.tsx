import { useState } from "react";

import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useComponentContext } from "@/context/component-context";
import { toast } from "@/hooks/use-toast";

import { changeVisibilityByChatId } from "../actions";

import GitHubSync from "./github-sync";

export default function ComponentSettings({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isVisible, setVisible, chatId } = useComponentContext();
  const [isVisibilityLoading, setIsVisibilityLoading] = useState(false);
  const handleVisibility = async () => {
    if (isVisibilityLoading) return;
    try {
      setIsVisibilityLoading(true);
      await changeVisibilityByChatId(chatId, !isVisible);
      setVisible(!isVisible);
      setIsVisibilityLoading(false);
    } catch {
      toast({
        variant: "destructive",
        title: "Premium account required",
        description:
          "You are not premium, the visibility cannot be changed. Please upgrade to premium and try again.",
        duration: 4000,
      });
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="overflow-auto">
        <SheetTitle className="mb-4">Component Settings</SheetTitle>

        <div className="space-y-6">
          {/* Visibility Settings */}
          <div>
            <h3 className="mb-4 text-base font-semibold">Change visibility</h3>
            <div className="space-y-4">
              <div className="mb-5 flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Private mode</Label>
                  <p className="text-sm text-muted-foreground">
                    When private, the component will not be visible to the
                    public.
                  </p>
                </div>
                <Switch
                  checked={!isVisible}
                  onCheckedChange={handleVisibility}
                  disabled={isVisibilityLoading}
                />
              </div>
            </div>
          </div>

          {/* GitHub Sync Settings */}
          <div>
            <GitHubSync />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
